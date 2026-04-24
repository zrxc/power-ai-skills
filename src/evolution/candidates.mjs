/**
 * Evolution Candidates 模块
 * 
 * 负责：
 * - 候选项创建、规范化、汇总
 * - 候选项历史追踪
 * - Markdown 报告生成
 */

const candidateTypes = new Set([
  "project-local-skill-draft",
  "shared-skill-candidate",
  "wrapper-proposal-candidate",
  "docs-candidate",
  "profile-adjustment-candidate"
]);

const candidateStatuses = new Set([
  "generated",
  "review",
  "accepted",
  "rejected",
  "materialized",
  "archived"
]);

const candidateRiskLevels = new Set(["low", "medium", "high"]);

function normalizeList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function createEmptyEvolutionCandidates() {
  return {
    schemaVersion: 1,
    updatedAt: "",
    candidates: []
  };
}

export function createEmptyEvolutionCandidateHistory() {
  return {
    schemaVersion: 1,
    entries: []
  };
}

export function normalizeCandidate(candidate = {}) {
  return {
    candidateId: candidate.candidateId || "",
    candidateType: candidateTypes.has(candidate.candidateType) ? candidate.candidateType : "docs-candidate",
    sourcePatternIds: normalizeList(candidate.sourcePatternIds || []),
    sourceConversationIds: normalizeList(candidate.sourceConversationIds || []),
    confidence: typeof candidate.confidence === "number" ? Math.max(0, Math.min(100, Math.round(candidate.confidence))) : 0,
    triggeredBy: candidate.triggeredBy || "",
    generatedAt: candidate.generatedAt || "",
    status: candidateStatuses.has(candidate.status) ? candidate.status : "generated",
    reason: candidate.reason || "",
    targetPath: candidate.targetPath || "",
    riskLevel: candidateRiskLevels.has(candidate.riskLevel) ? candidate.riskLevel : "low",
    metadata: candidate.metadata && typeof candidate.metadata === "object" && !Array.isArray(candidate.metadata)
      ? { ...candidate.metadata }
      : {}
  };
}

export function summarizeEvolutionCandidates(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const summary = {
    total: candidates.length,
    generated: 0,
    review: 0,
    accepted: 0,
    rejected: 0,
    materialized: 0,
    archived: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    projectLocalSkillDrafts: 0,
    sharedSkillCandidates: 0,
    wrapperProposalCandidates: 0,
    docsCandidates: 0,
    profileAdjustmentCandidates: 0
  };

  for (const item of candidates) {
    if (Object.hasOwn(summary, item.status)) summary[item.status] += 1;
    if (item.riskLevel === "high") summary.highRisk += 1;
    if (item.riskLevel === "medium") summary.mediumRisk += 1;
    if (item.riskLevel === "low") summary.lowRisk += 1;
    if (item.candidateType === "project-local-skill-draft") summary.projectLocalSkillDrafts += 1;
    if (item.candidateType === "shared-skill-candidate") summary.sharedSkillCandidates += 1;
    if (item.candidateType === "wrapper-proposal-candidate") summary.wrapperProposalCandidates += 1;
    if (item.candidateType === "docs-candidate") summary.docsCandidates += 1;
    if (item.candidateType === "profile-adjustment-candidate") summary.profileAdjustmentCandidates += 1;
  }

  return summary;
}

export function buildEvolutionSummaryMarkdown(payload) {
  const lines = [
    "# Evolution Summary",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- projectRoot: \`${payload.projectRoot}\``,
    `- generatedAt: \`${payload.generatedAt}\``,
    `- candidate file: \`${payload.candidatesPath}\``,
    `- candidate history file: \`${payload.historyPath}\``,
    `- trigger: \`${payload.trigger}\``,
    "",
    "## Summary",
    "",
    `- total candidates: ${payload.summary.total}`,
    `- generated: ${payload.summary.generated}`,
    `- review: ${payload.summary.review}`,
    `- accepted: ${payload.summary.accepted}`,
    `- materialized: ${payload.summary.materialized}`,
    `- archived: ${payload.summary.archived}`,
    `- low risk: ${payload.summary.lowRisk}`,
    `- medium risk: ${payload.summary.mediumRisk}`,
    `- high risk: ${payload.summary.highRisk}`,
    "",
    "## Candidate Types",
    "",
    `- project-local-skill-draft: ${payload.summary.projectLocalSkillDrafts}`,
    `- shared-skill-candidate: ${payload.summary.sharedSkillCandidates}`,
    `- wrapper-proposal-candidate: ${payload.summary.wrapperProposalCandidates}`,
    `- docs-candidate: ${payload.summary.docsCandidates}`,
    `- profile-adjustment-candidate: ${payload.summary.profileAdjustmentCandidates}`,
    "",
    "## Candidates",
    ""
  ];

  if ((payload.candidates || []).length === 0) {
    lines.push("- none");
  } else {
    for (const candidate of payload.candidates) {
      lines.push(`- \`${candidate.candidateId}\``);
      lines.push(`  type: ${candidate.candidateType}, status: ${candidate.status}, risk: ${candidate.riskLevel}, confidence: ${candidate.confidence}`);
      if (candidate.targetPath) lines.push(`  target: ${candidate.targetPath}`);
      if (candidate.reason) lines.push(`  reason: ${candidate.reason}`);
      if ((candidate.sourcePatternIds || []).length > 0) lines.push(`  patterns: ${candidate.sourcePatternIds.join(", ")}`);
    }
  }

  lines.push("", "## Recommended Actions", "");
  if ((payload.recommendedActions || []).length === 0) {
    lines.push("- none");
  } else {
    for (const action of payload.recommendedActions) {
      lines.push(`- ${action}`);
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}
