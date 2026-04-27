import {
  loadAnalysisArtifacts as loadProjectScanArtifacts
} from "./analysis-artifact-store.mjs";
import { getProjectScanPaths } from "./analysis-paths.mjs";
import {
  isSupportedPatternReviewDecision,
  listSupportedPatternReviewDecisions,
  loadPatternFeedback,
  writePatternFeedback
} from "./pattern-feedback.mjs";
import { buildProjectAnalysisOutputs } from "./analysis-pipeline.mjs";
import { loadProjectPackageJson as readProjectPackageJson, scanProjectArtifacts } from "./scan-engine.mjs";
import { ensureProjectScanOverlayRoot } from "./project-local-overlay.mjs";
import { createProjectLocalSkillService } from "./project-local-service.mjs";

export function createProjectScanService({ context, projectRoot, workspaceService, promotionTraceService }) {
  const projectLocalSkillService = createProjectLocalSkillService({
    projectRoot,
    getAnalysisPaths,
    loadAnalysisArtifacts,
    ensureOverlayRoot,
    loadProjectPackageJson,
    promotionTraceService
  });

  function getAnalysisPaths() {
    return getProjectScanPaths({ workspaceService });
  }

  function loadProjectPackageJson() {
    return readProjectPackageJson(projectRoot);
  }

  function scanProject() {
    return scanProjectArtifacts({ context, projectRoot });
  }

  function loadPersistedPatternFeedback(paths = getAnalysisPaths()) {
    return loadPatternFeedback(paths.patternFeedbackPath);
  }

  function buildAnalysisOutputs({ paths, result, patternFeedback }) {
    return buildProjectAnalysisOutputs({ paths, result, patternFeedback });
  }

  function writeProjectAnalysis() {
    const paths = getAnalysisPaths();
    const result = scanProject();
    const patternFeedback = loadPersistedPatternFeedback(paths);
    const {
      patternReview,
      patternDiff,
      patternHistory,
      outputs
    } = buildAnalysisOutputs({ paths, result, patternFeedback });

    return {
      ...result,
      patternFeedback,
      patternReview,
      patternDiff,
      patternHistory,
      outputs
    };
  }

  function loadAnalysisArtifacts() {
    return loadProjectScanArtifacts(getAnalysisPaths());
  }

  function ensureOverlayRoot(paths) {
    return ensureProjectScanOverlayRoot(paths);
  }

  function resolveReviewedPattern(patternIdOrType, patterns) {
    return patterns.find((pattern) => pattern.id === patternIdOrType || pattern.type === patternIdOrType);
  }

  function reviewProjectPattern({ patternId, decision, note = "", clear = false } = {}) {
    if (!patternId) throw new Error("review-project-pattern requires a pattern id or pattern type.");
    if (clear && decision) throw new Error("review-project-pattern cannot use --clear together with --decision.");
    if (!clear && !decision) throw new Error("review-project-pattern requires --decision unless --clear is used.");
    if (decision && !isSupportedPatternReviewDecision(decision)) {
      throw new Error(`Unsupported pattern review decision: ${decision}. Supported: ${listSupportedPatternReviewDecisions().join(", ")}.`);
    }

    const paths = getAnalysisPaths();
    const currentScan = scanProject();
    const reviewedPattern = resolveReviewedPattern(patternId, currentScan.patterns.patterns);
    if (!reviewedPattern) throw new Error(`Pattern not found in current project scan: ${patternId}`);

    const existingFeedback = loadPersistedPatternFeedback(paths);
    const now = new Date().toISOString();
    const existingOverride = (existingFeedback.overrides || []).find((item) => item.patternId === reviewedPattern.id);
    const remainingOverrides = (existingFeedback.overrides || []).filter((item) => item.patternId !== reviewedPattern.id);

    const nextFeedback = clear
      ? {
        ...existingFeedback,
        overrides: remainingOverrides
      }
      : {
        ...existingFeedback,
        overrides: [
          ...remainingOverrides,
          {
            patternId: reviewedPattern.id,
            patternType: reviewedPattern.type,
            decision,
            note,
            createdAt: existingOverride?.createdAt || now,
            updatedAt: now
          }
        ]
      };

    const patternFeedback = writePatternFeedback(paths.patternFeedbackPath, nextFeedback);
    const result = scanProject();
    const analysisOutputs = buildAnalysisOutputs({ paths, result, patternFeedback });

    return {
      patternId: reviewedPattern.id,
      patternType: reviewedPattern.type,
      cleared: clear,
      decision: clear ? "" : decision,
      note: clear ? "" : note,
      patternFeedback,
      patternFeedbackPath: paths.patternFeedbackPath,
      feedbackReportPath: paths.feedbackReportPath,
      currentReview: analysisOutputs.patternReview.patterns.find((item) => item.id === reviewedPattern.id) || null,
      outputs: analysisOutputs.outputs
    };
  }

  function runProjectScanPipeline({ regenerate = false } = {}) {
    const scanResult = writeProjectAnalysis();
    const generationResult = projectLocalSkillService.generateProjectLocalSkills({ regenerate });
    return { scanResult, generationResult };
  }

  return {
    getAnalysisPaths,
    scanProject,
    writeProjectAnalysis,
    loadAnalysisArtifacts,
    ...projectLocalSkillService,
    reviewProjectPattern,
    runProjectScanPipeline
  };
}
