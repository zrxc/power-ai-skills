import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../shared/fs.mjs";

const supportedHistoryTypes = new Set(["profile-decision", "conversation-decision", "promotion"]);

function normalizeLimit(limit = 20) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.trunc(parsed);
}

function normalizeType(type = "") {
  const normalized = String(type || "").trim().toLowerCase();
  if (!normalized) return "";
  if (!supportedHistoryTypes.has(normalized)) {
    throw new Error(`Unsupported governance history type: ${type}. Supported: ${[...supportedHistoryTypes].join(", ")}.`);
  }
  return normalized;
}

function formatPathLabel(filePath = "") {
  return filePath ? `\`${filePath}\`` : "none";
}

function collectProfileDecisionEntries(teamPolicyService) {
  const current = teamPolicyService.showProjectProfileDecision();
  const history = teamPolicyService.loadProjectProfileDecisionHistory();
  const entries = (history.entries || []).map((entry) => ({
    governanceType: "profile-decision",
    recordedAt: entry.recordedAt || "",
    trigger: entry.trigger || "unknown",
    entityId: entry.snapshot?.recommendedProjectProfile || entry.snapshot?.selectedProjectProfile || "project-profile",
    status: entry.snapshot?.decision || "auto-recommended",
    title: `Project profile decision: ${entry.snapshot?.selectedProjectProfile || "none"} -> ${entry.snapshot?.recommendedProjectProfile || "none"}`,
    detail: {
      selectedProjectProfile: entry.snapshot?.selectedProjectProfile || "",
      recommendedProjectProfile: entry.snapshot?.recommendedProjectProfile || "",
      decision: entry.snapshot?.decision || "auto-recommended",
      decisionReason: entry.snapshot?.decisionReason || "",
      decisionSource: entry.snapshot?.decisionSource || "",
      decidedBy: entry.snapshot?.decidedBy || "",
      nextReviewAt: entry.snapshot?.nextReviewAt || "",
      sourceSignals: entry.snapshot?.sourceSignals || []
    },
    sourcePath: current.historyPath
  }));

  return {
    available: true,
    currentDecisionPath: current.decision.decisionPath,
    historyPath: current.historyPath,
    totalEntries: entries.length,
    entries
  };
}

function collectConversationDecisionEntries(conversationMinerService) {
  const ledger = conversationMinerService.loadConversationDecisions();
  const entries = (ledger.history?.entries || []).map((entry) => ({
    governanceType: "conversation-decision",
    recordedAt: entry.recordedAt || "",
    trigger: entry.trigger || "unknown",
    entityId: entry.patternId || "",
    status: entry.snapshot?.decision || "detected",
    title: `Conversation decision: ${entry.patternId || "unknown-pattern"}`,
    detail: {
      patternId: entry.patternId || "",
      sceneType: entry.snapshot?.sceneType || "",
      decision: entry.snapshot?.decision || "detected",
      target: entry.snapshot?.target || "",
      decisionReason: entry.snapshot?.decisionReason || "",
      reviewedBy: entry.snapshot?.reviewedBy || "",
      sourceConversationIds: entry.snapshot?.sourceConversationIds || []
    },
    sourcePath: ledger.historyPath
  }));

  return {
    available: true,
    decisionsPath: ledger.decisionsPath,
    historyPath: ledger.historyPath,
    totalEntries: entries.length,
    entries
  };
}

function collectPromotionEntries(promotionTraceService) {
  const trace = promotionTraceService.showPromotionTrace();
  const entries = (trace.matches || [])
    .map((relation) => ({
      governanceType: "promotion",
      recordedAt: relation.lastRecordedAt || relation.firstRecordedAt || "",
      trigger: relation.relationType || "promotion",
      entityId: relation.target?.id || relation.source?.id || relation.traceKey || "",
      status: relation.metadata?.decision || relation.metadata?.registrationStatus || relation.relationType || "promotion",
      title: `Promotion relation: ${relation.source?.id || "unknown"} -> ${relation.target?.id || "unknown"}`,
      detail: {
        relationType: relation.relationType || "",
        source: relation.source || {},
        target: relation.target || {},
        metadata: relation.metadata || {}
      },
      sourcePath: trace.tracePath
    }))
    .filter((entry) => entry.recordedAt)
    .sort((left, right) => String(right.recordedAt).localeCompare(String(left.recordedAt), "en"));

  return {
    available: true,
    tracePath: trace.tracePath,
    reportPath: trace.reportPath,
    totalEntries: entries.length,
    entries
  };
}

function sortEntries(entries = []) {
  return [...entries].sort((left, right) => {
    const dateCompare = String(right.recordedAt || "").localeCompare(String(left.recordedAt || ""), "en");
    if (dateCompare !== 0) return dateCompare;
    const typeCompare = String(left.governanceType || "").localeCompare(String(right.governanceType || ""), "zh-CN");
    if (typeCompare !== 0) return typeCompare;
    return String(left.entityId || "").localeCompare(String(right.entityId || ""), "zh-CN");
  });
}

function buildHistorySummary(entries = [], requestedType = "", limit = 20) {
  const byTypeMap = new Map();
  for (const entry of entries) {
    byTypeMap.set(entry.governanceType, (byTypeMap.get(entry.governanceType) || 0) + 1);
  }
  return {
    requestedType: requestedType || "all",
    totalEntries: entries.length,
    returnedEntries: Math.min(entries.length, limit),
    byType: [...byTypeMap.entries()].map(([type, count]) => ({ type, count }))
      .sort((left, right) => left.type.localeCompare(right.type, "zh-CN"))
  };
}

function buildGovernanceHistoryMarkdown(payload) {
  const lines = [
    "# Governance History",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- root: \`${payload.projectRoot}\``,
    `- requestedType: \`${payload.summary.requestedType}\``,
    `- total entries: ${payload.summary.totalEntries}`,
    `- returned entries: ${payload.summary.returnedEntries}`,
    `- limit: ${payload.limit}`,
    `- generatedAt: \`${payload.generatedAt}\``,
    "",
    "## Sources",
    "",
    `- profile decision history: ${formatPathLabel(payload.sources.profileDecisionHistoryPath)}`,
    `- conversation decision history: ${formatPathLabel(payload.sources.conversationDecisionHistoryPath)}`,
    `- promotion trace: ${formatPathLabel(payload.sources.promotionTracePath)}`,
    "",
    "## Entries",
    ""
  ];

  if (payload.entries.length === 0) {
    lines.push("No governance history entries found.");
  } else {
    for (const entry of payload.entries) {
      lines.push(`- [${entry.governanceType}] \`${entry.status}\` ${entry.title}`);
      lines.push(`  recordedAt: ${entry.recordedAt || "unknown"}, trigger: ${entry.trigger || "unknown"}, source: ${entry.sourcePath || "none"}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function createGovernanceHistoryService({
  context,
  projectRoot,
  workspaceService,
  teamPolicyService,
  conversationMinerService,
  promotionTraceService
}) {
  function showGovernanceHistory({ type = "", limit = 20 } = {}) {
    const requestedType = normalizeType(type);
    const normalizedLimit = normalizeLimit(limit);
    const profileDecisions = requestedType && requestedType !== "profile-decision"
      ? { available: false, entries: [], historyPath: "" }
      : collectProfileDecisionEntries(teamPolicyService);
    const conversationDecisions = requestedType && requestedType !== "conversation-decision"
      ? { available: false, entries: [], historyPath: "" }
      : collectConversationDecisionEntries(conversationMinerService);
    const promotions = requestedType && requestedType !== "promotion"
      ? { available: false, entries: [], tracePath: "" }
      : collectPromotionEntries(promotionTraceService);

    const allEntries = sortEntries([
      ...(profileDecisions.entries || []),
      ...(conversationDecisions.entries || []),
      ...(promotions.entries || [])
    ]);
    const entries = allEntries.slice(0, normalizedLimit);
    const summary = buildHistorySummary(allEntries, requestedType, normalizedLimit);
    const reportsRoot = workspaceService.getReportsRoot();
    const reportPath = path.join(reportsRoot, "governance-history.md");
    const jsonPath = path.join(reportsRoot, "governance-history.json");
    const payload = {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      limit: normalizedLimit,
      summary,
      sources: {
        profileDecisionHistoryPath: profileDecisions.historyPath || "",
        conversationDecisionHistoryPath: conversationDecisions.historyPath || "",
        promotionTracePath: promotions.tracePath || ""
      },
      entries
    };

    ensureDir(reportsRoot);
    writeJson(jsonPath, payload);
    fs.writeFileSync(reportPath, buildGovernanceHistoryMarkdown(payload), "utf8");

    return {
      ...payload,
      reportPath,
      jsonPath
    };
  }

  return {
    showGovernanceHistory
  };
}
