const blockingReasons = new Set([
  "scene-not-in-allowed-list",
  "blocked-scene-type",
  "blocked-intent-keyword",
  "blocked-generated-file-pattern"
]);

const reviewReasons = new Set([
  "review-scene-type",
  "review-intent-keyword",
  "review-generated-file-pattern"
]);

const warningReasons = new Set([
  "low-signal-capture"
]);

export const captureSafetyGovernanceSemantics = {
  warning: {
    level: "warning",
    effect: "capture-allowed-with-warning",
    requiresManualReview: false,
    blocksCapture: false,
    triggerReasons: [...warningReasons],
    description: "The record can be captured, but governance should treat it as weak or low-confidence evidence until it is acknowledged."
  },
  review: {
    level: "review",
    effect: "capture-needs-review",
    requiresManualReview: true,
    blocksCapture: false,
    triggerReasons: [...reviewReasons],
    description: "The record can be captured, but it should stay behind an explicit review boundary before it is trusted as stable governance evidence."
  },
  blocking: {
    level: "blocking",
    effect: "capture-denied",
    requiresManualReview: false,
    blocksCapture: true,
    triggerReasons: [...blockingReasons],
    description: "The record must not enter the capture pipeline because it violates the configured capture safety boundary."
  }
};

function normalizeReason(reason) {
  return String(reason || "").trim().toLowerCase();
}

export function listCaptureSafetyGovernanceSemantics() {
  return {
    warning: { ...captureSafetyGovernanceSemantics.warning },
    review: { ...captureSafetyGovernanceSemantics.review },
    blocking: { ...captureSafetyGovernanceSemantics.blocking }
  };
}

export function resolveCaptureSafetyGovernance({ decision = "", admissionLevel = "", reasons = [] } = {}) {
  const normalizedDecision = String(decision || "").trim().toLowerCase();
  const normalizedAdmissionLevel = String(admissionLevel || "").trim().toLowerCase();
  const normalizedReasons = [...new Set((reasons || []).map(normalizeReason).filter(Boolean))];
  const matchedBlockingReasons = normalizedReasons.filter((reason) => blockingReasons.has(reason));
  const matchedReviewReasons = normalizedReasons.filter((reason) => reviewReasons.has(reason));
  const matchedWarningReasons = normalizedReasons.filter((reason) => warningReasons.has(reason));

  if (
    normalizedDecision === "skip_sensitive"
    || normalizedDecision === "skip_policy_filtered"
    || matchedBlockingReasons.length > 0
    || normalizedAdmissionLevel === "blocked"
  ) {
    return {
      level: "blocking",
      matchedReasons: matchedBlockingReasons,
      semantics: { ...captureSafetyGovernanceSemantics.blocking }
    };
  }

  if (normalizedAdmissionLevel === "review" || matchedReviewReasons.length > 0) {
    return {
      level: "review",
      matchedReasons: matchedReviewReasons,
      semantics: { ...captureSafetyGovernanceSemantics.review }
    };
  }

  if (matchedWarningReasons.length > 0) {
    return {
      level: "warning",
      matchedReasons: matchedWarningReasons,
      semantics: { ...captureSafetyGovernanceSemantics.warning }
    };
  }

  return {
    level: "none",
    matchedReasons: [],
    semantics: null
  };
}

export function summarizeCaptureSafetyGovernanceLevels(items = []) {
  const summary = {
    warning: 0,
    review: 0,
    blocking: 0
  };

  for (const item of items || []) {
    const level = normalizeReason(item?.captureSafetyGovernanceLevel || item?.level);
    if (level === "warning") summary.warning += 1;
    if (level === "review") summary.review += 1;
    if (level === "blocking") summary.blocking += 1;
  }

  return summary;
}
