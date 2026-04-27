import {
  isSupportedPatternReviewDecision,
  listSupportedPatternReviewDecisions,
  loadPatternFeedback,
  writePatternFeedback
} from "./pattern-feedback.mjs";

function resolveReviewedPattern(patternIdOrType, patterns) {
  return patterns.find((pattern) => pattern.id === patternIdOrType || pattern.type === patternIdOrType);
}

export function createProjectScanReviewService({
  getAnalysisPaths,
  scanProject,
  buildAnalysisOutputs
}) {
  function loadPersistedPatternFeedback(paths = getAnalysisPaths()) {
    return loadPatternFeedback(paths.patternFeedbackPath);
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

  return {
    loadPersistedPatternFeedback,
    reviewProjectPattern
  };
}
