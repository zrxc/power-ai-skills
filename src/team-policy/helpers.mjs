/**
 * Team Policy 工具函数模块
 *
 * 提供：
 * - 日期处理与规范化
 * - 审查截止日状态计算
 * - 项目配置决策快照构建
 * - 历史条目管理
 * - 漂移状态判定与修复建议
 */

const projectProfileDecisionStates = new Set(["auto-recommended", "accepted", "rejected", "deferred"]);

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function uniqueSorted(items) {
  return [...new Set(items)].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function normalizeStringArray(values = []) {
  return uniqueSorted(
    values
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function normalizeIsoDate(value = "") {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function normalizeReviewDate(value = "") {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function formatLocalDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function parseReviewDateToUtc(value = "") {
  const normalized = normalizeReviewDate(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-").map((item) => Number(item));
  return Date.UTC(year, month - 1, day);
}

export function resolveReviewDeadlineState(nextReviewAt = "", today = formatLocalDate()) {
  const normalizedReviewAt = normalizeReviewDate(nextReviewAt);
  const normalizedToday = normalizeReviewDate(today) || formatLocalDate();
  if (!normalizedReviewAt) {
    return {
      today: normalizedToday,
      hasReviewDate: false,
      reviewStatus: "not-scheduled",
      reviewDue: false,
      reviewOverdue: false,
      daysUntilReview: null,
      daysOverdue: 0
    };
  }

  const reviewUtc = parseReviewDateToUtc(normalizedReviewAt);
  const todayUtc = parseReviewDateToUtc(normalizedToday);
  const dayDelta = Math.round((reviewUtc - todayUtc) / 86400000);
  if (dayDelta < 0) {
    return {
      today: normalizedToday,
      hasReviewDate: true,
      reviewStatus: "overdue",
      reviewDue: false,
      reviewOverdue: true,
      daysUntilReview: dayDelta,
      daysOverdue: Math.abs(dayDelta)
    };
  }

  if (dayDelta === 0) {
    return {
      today: normalizedToday,
      hasReviewDate: true,
      reviewStatus: "due-today",
      reviewDue: true,
      reviewOverdue: false,
      daysUntilReview: 0,
      daysOverdue: 0
    };
  }

  return {
    today: normalizedToday,
    hasReviewDate: true,
    reviewStatus: "scheduled",
    reviewDue: false,
    reviewOverdue: false,
    daysUntilReview: dayDelta,
    daysOverdue: 0
  };
}

export function flattenRecommendationSignals(recommendation = {}) {
  const frameworkSignals = recommendation?.signals?.frameworkSignals || {};
  const workspaceSignals = recommendation?.signals?.workspaceSignals || {};
  return normalizeStringArray([
    ...Object.entries(frameworkSignals)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => `framework:${key}`),
    ...Object.entries(workspaceSignals)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => `workspace:${key}`)
  ]);
}

export function buildProjectProfileDecisionSnapshot(decision = {}) {
  return {
    selectedProjectProfile: decision.selectedProjectProfile || "",
    recommendedProjectProfile: decision.recommendedProjectProfile || "",
    decision: decision.decision || "auto-recommended",
    decisionReason: decision.decisionReason || "",
    decisionSource: decision.decisionSource || "",
    decidedBy: decision.decidedBy || "",
    decidedAt: decision.decidedAt || "",
    sourceSignals: normalizeStringArray(decision.sourceSignals || []),
    nextReviewAt: normalizeReviewDate(decision.nextReviewAt || ""),
    recommendationSource: decision.recommendationSource || "none",
    recommendationReason: decision.recommendationReason || ""
  };
}

export function createProjectProfileDecisionHistory() {
  return {
    schemaVersion: 1,
    entries: []
  };
}

export function appendProjectProfileDecisionHistory(history, entry) {
  const nextHistory = history && typeof history === "object"
    ? {
      schemaVersion: history.schemaVersion || 1,
      entries: Array.isArray(history.entries) ? [...history.entries] : []
    }
    : createProjectProfileDecisionHistory();
  const normalizedEntry = {
    recordedAt: normalizeIsoDate(entry.recordedAt) || new Date().toISOString(),
    trigger: entry.trigger || "unknown",
    snapshot: buildProjectProfileDecisionSnapshot(entry.snapshot || {})
  };
  const lastEntry = nextHistory.entries.at(-1);
  if (
    lastEntry
    && stableStringify(lastEntry.snapshot) === stableStringify(normalizedEntry.snapshot)
    && lastEntry.trigger === normalizedEntry.trigger
  ) {
    return nextHistory;
  }
  nextHistory.entries.push(normalizedEntry);
  return nextHistory;
}

export function resolveProjectProfileDriftStatus({ selectedProjectProfile = "", recommendedProjectProfile = "" } = {}) {
  if (!recommendedProjectProfile) return "no-recommendation";
  return selectedProjectProfile === recommendedProjectProfile ? "matched" : "drift";
}

export function buildProjectProfileDecisionRemediation(decisionState = {}) {
  const {
    driftStatus,
    decision,
    selectedProjectProfile,
    recommendedProjectProfile,
    decisionReason,
    nextReviewAt
  } = decisionState;

  if (driftStatus === "no-recommendation") {
    return "No recommended project profile is currently detected for this project.";
  }

  if (driftStatus === "matched") {
    return "The selected project profile already matches the current recommendation. Re-run `npx power-ai-skills review-project-profile --accept <profile>` only if you want to record a fresh manual decision.";
  }

  if (decision === "auto-recommended") {
    return `Your project is configured for \`${selectedProjectProfile}\` but the workspace signals now recommend \`${recommendedProjectProfile}\`. Run \`npx power-ai-skills review-project-profile --accept-recommended\` to align, or \`--defer --next-review-at YYYY-MM-DD\` to postpone review.`;
  }

  if (decision === "accepted" && driftStatus === "drift") {
    return `A previous manual acceptance for \`${selectedProjectProfile}\` is now outdated. Review the recommendation again: \`npx power-ai-skills review-project-profile --accept-recommended\`.`;
  }

  if (decision === "rejected") {
    return `You rejected the project profile recommendation. Reason: ${decisionReason || "none"}. Re-evaluate the workspace with \`npx power-ai-skills show-project-profile-decision --json\`.`;
  }

  if (decision === "deferred") {
    const reviewAt = nextReviewAt || "none";
    return `Review is deferred until ${reviewAt}. Re-evaluate the workspace with \`npx power-ai-skills show-project-profile-decision --json\` when the review date approaches.`;
  }

  return "Run `npx power-ai-skills show-project-profile-decision --json` for detailed project profile decision state.";
}

export function buildProjectProfileDecisionReviewRemediation(decisionState = {}) {
  const {
    reviewStatus,
    reviewOverdue,
    daysOverdue,
    daysUntilReview,
    nextReviewAt,
    decision,
    remediation
  } = decisionState;

  if (!reviewStatus || reviewStatus === "not-scheduled") {
    return remediation || "No governance review is currently scheduled.";
  }

  if (reviewOverdue) {
    return `Project profile review is ${daysOverdue} day(s) overdue (was due ${nextReviewAt}). Run \`npx power-ai-skills review-project-profile\` with --accept-recommended, --reject, or --defer to resolve the overdue review.`;
  }

  if (reviewStatus === "due-today") {
    return `Project profile review is due today. Run \`npx power-ai-skills review-project-profile\` to complete the scheduled governance review.`;
  }

  if (daysUntilReview !== null && daysUntilReview <= 7) {
    return `Project profile review is due in ${daysUntilReview} day(s) (${nextReviewAt}). Consider preparing the review decision before the deadline.`;
  }

  return `Project profile review is scheduled for ${nextReviewAt} (${daysUntilReview} days away). No immediate action is required.`;
}
