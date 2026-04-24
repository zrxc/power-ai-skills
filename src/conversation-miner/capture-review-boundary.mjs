export function collectReviewBoundarySummary(evaluations = []) {
  const reviewRequiredEvaluations = (evaluations || []).filter((item) => item?.decision === "ask_capture" && item?.admissionLevel === "review");
  const captureReadyEvaluations = (evaluations || []).filter((item) => item?.decision === "ask_capture" && item?.admissionLevel !== "review");

  return {
    reviewRequiredCount: reviewRequiredEvaluations.length,
    captureReadyCount: captureReadyEvaluations.length,
    requiresManualConfirmation: reviewRequiredEvaluations.length > 0
  };
}

export function classifyAutoCaptureBoundary(evaluations = []) {
  const summary = collectReviewBoundarySummary(evaluations);
  return {
    ...summary,
    autoCaptureDecision: summary.reviewRequiredCount > 0
      ? "review_required"
      : (summary.captureReadyCount > 0 ? "ready" : "skip")
  };
}
