/**
 * Evolution Actions 模块
 * 
 * 负责：
 * - 行动记录创建、规范化、汇总
 */

const actionTypes = new Set([
  "refresh-project-local-skill-draft",
  "archive-low-value-pattern",
  "refresh-governance-context",
  "refresh-governance-summary",
  "mark-pattern-for-review"
]);

const actionStatuses = new Set(["executed", "skipped", "failed"]);

function normalizeList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function createEmptyEvolutionActions() {
  return {
    schemaVersion: 1,
    updatedAt: "",
    actions: []
  };
}

export function normalizeEvolutionAction(action = {}) {
  return {
    actionId: action.actionId || "",
    actionType: actionTypes.has(action.actionType) ? action.actionType : "refresh-governance-context",
    status: actionStatuses.has(action.status) ? action.status : "executed",
    executedAt: action.executedAt || "",
    target: action.target || "",
    sourceCandidateId: action.sourceCandidateId || "",
    sourcePatternIds: normalizeList(action.sourcePatternIds || []),
    result: action.result && typeof action.result === "object" && !Array.isArray(action.result)
      ? { ...action.result }
      : {}
  };
}

export function summarizeEvolutionActions(payload) {
  const actions = Array.isArray(payload?.actions) ? payload.actions : [];
  const summary = {
    total: actions.length,
    executed: 0,
    skipped: 0,
    failed: 0,
    projectLocalSkillRefreshes: 0,
    governanceContextRefreshes: 0,
    governanceSummaryRefreshes: 0
  };
  for (const action of actions) {
    if (Object.hasOwn(summary, action.status)) summary[action.status] += 1;
    if (action.actionType === "refresh-project-local-skill-draft") summary.projectLocalSkillRefreshes += 1;
    if (action.actionType === "refresh-governance-context") summary.governanceContextRefreshes += 1;
    if (action.actionType === "refresh-governance-summary") summary.governanceSummaryRefreshes += 1;
  }
  return summary;
}
