import {
  loadAnalysisArtifacts as loadProjectScanArtifacts
} from "./analysis-artifact-store.mjs";
import { getProjectScanPaths } from "./analysis-paths.mjs";
import { buildProjectAnalysisOutputs } from "./analysis-pipeline.mjs";
import { loadProjectPackageJson as readProjectPackageJson, scanProjectArtifacts } from "./scan-engine.mjs";
import { ensureProjectScanOverlayRoot } from "./project-local-overlay.mjs";
import { createProjectScanPipelineService } from "./project-scan-pipeline-service.mjs";
import { createProjectScanReviewService } from "./project-scan-review-service.mjs";
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

  function buildAnalysisOutputs({ paths, result, patternFeedback }) {
    return buildProjectAnalysisOutputs({ paths, result, patternFeedback });
  }

  const reviewService = createProjectScanReviewService({
    getAnalysisPaths,
    scanProject,
    buildAnalysisOutputs
  });

  function writeProjectAnalysis() {
    const paths = getAnalysisPaths();
    const result = scanProject();
    const patternFeedback = reviewService.loadPersistedPatternFeedback(paths);
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

  const pipelineService = createProjectScanPipelineService({
    writeProjectAnalysis,
    projectLocalSkillService
  });

  return {
    getAnalysisPaths,
    scanProject,
    writeProjectAnalysis,
    loadAnalysisArtifacts,
    ...projectLocalSkillService,
    ...reviewService,
    ...pipelineService
  };
}
