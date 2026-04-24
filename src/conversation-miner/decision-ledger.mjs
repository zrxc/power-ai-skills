import fs from "node:fs";
import { readJson, writeJson } from "../../scripts/shared.mjs";

const decisionStates = new Set(["detected", "review", "accepted", "rejected", "promoted", "archived"]);
const decisionTargets = new Set(["project-local-skill", "team-rule", "wrapper-proposal", "docs", "ignored", ""]);

function toUniqueSortedList(values = []) {
  return [...new Set(
    values
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function normalizeIsoDate(value = "") {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function cloneTrace(trace = {}) {
  return trace && typeof trace === "object" && !Array.isArray(trace) ? { ...trace } : {};
}

function normalizeDecision(decision = {}) {
  return {
    patternId: decision.patternId || "",
    sceneType: decision.sceneType || "",
    sourceConversationIds: toUniqueSortedList(decision.sourceConversationIds || []),
    recommendation: decision.recommendation || "",
    decision: decisionStates.has(decision.decision) ? decision.decision : "detected",
    target: decisionTargets.has(decision.target || "") ? (decision.target || "") : "",
    decisionReason: decision.decisionReason || "",
    reviewedBy: decision.reviewedBy || "",
    reviewedAt: normalizeIsoDate(decision.reviewedAt) || "",
    trace: cloneTrace(decision.trace)
  };
}

export function createEmptyConversationDecisionLedger() {
  return {
    schemaVersion: 1,
    updatedAt: "",
    decisions: []
  };
}

export function createEmptyConversationDecisionHistory() {
  return {
    schemaVersion: 1,
    entries: []
  };
}

export function loadConversationDecisionLedger(paths) {
  if (!fs.existsSync(paths.conversationDecisionsPath)) return createEmptyConversationDecisionLedger();
  const stored = readJson(paths.conversationDecisionsPath);
  return {
    schemaVersion: stored?.schemaVersion || 1,
    updatedAt: stored?.updatedAt || "",
    decisions: Array.isArray(stored?.decisions) ? stored.decisions.map((item) => normalizeDecision(item)) : []
  };
}

export function loadConversationDecisionHistory(paths) {
  if (!fs.existsSync(paths.conversationDecisionHistoryPath)) return createEmptyConversationDecisionHistory();
  const stored = readJson(paths.conversationDecisionHistoryPath);
  return {
    schemaVersion: stored?.schemaVersion || 1,
    entries: Array.isArray(stored?.entries)
      ? stored.entries.map((entry) => ({
        recordedAt: normalizeIsoDate(entry.recordedAt) || "",
        trigger: entry.trigger || "unknown",
        patternId: entry.patternId || "",
        snapshot: normalizeDecision(entry.snapshot || {})
      }))
      : []
  };
}

export function writeConversationDecisionLedger(paths, ledger) {
  writeJson(paths.conversationDecisionsPath, ledger);
}

export function writeConversationDecisionHistory(paths, history) {
  writeJson(paths.conversationDecisionHistoryPath, history);
}

export function inferConversationDecisionTarget(pattern = {}) {
  if (pattern?.candidateSkill?.name) return "project-local-skill";
  return "team-rule";
}

export function inferConversationDecisionState(pattern = {}) {
  return pattern?.recommendation === "review" ? "review" : "detected";
}

export function summarizeConversationDecisionLedger(ledger) {
  const decisions = ledger?.decisions || [];
  const summary = {
    total: decisions.length,
    detected: 0,
    review: 0,
    accepted: 0,
    rejected: 0,
    promoted: 0,
    archived: 0
  };
  for (const item of decisions) {
    if (Object.hasOwn(summary, item.decision)) summary[item.decision] += 1;
  }
  summary.pendingReview = summary.review;
  return summary;
}

export function buildConversationDecisionLedgerMarkdown({ projectName, ledger, history }) {
  const summary = summarizeConversationDecisionLedger(ledger);
  const lines = [
    "# Conversation Decisions",
    "",
    `- project: \`${projectName}\``,
    `- updatedAt: \`${ledger.updatedAt || "not-set"}\``,
    `- total: ${summary.total}`,
    `- detected: ${summary.detected}`,
    `- review: ${summary.review}`,
    `- accepted: ${summary.accepted}`,
    `- rejected: ${summary.rejected}`,
    `- promoted: ${summary.promoted}`,
    `- archived: ${summary.archived}`,
    `- history entries: ${(history?.entries || []).length}`,
    "",
    "## Active Decisions",
    ""
  ];

  if ((ledger.decisions || []).length === 0) {
    lines.push("No conversation decisions yet.");
  } else {
    for (const item of ledger.decisions) {
      lines.push(`- \`${item.patternId}\`: ${item.decision}${item.target ? ` -> ${item.target}` : ""}`);
      lines.push(`  sceneType: ${item.sceneType || "unknown"}, recommendation: ${item.recommendation || "none"}`);
      if (item.decisionReason) lines.push(`  reason: ${item.decisionReason}`);
      if (item.reviewedAt) lines.push(`  reviewedAt: ${item.reviewedAt}`);
    }
  }

  lines.push("", "## Recent History", "");
  const recentEntries = [...(history?.entries || [])].slice(-10).reverse();
  if (recentEntries.length === 0) {
    lines.push("No decision history yet.");
  } else {
    for (const entry of recentEntries) {
      lines.push(`- \`${entry.patternId}\` -> \`${entry.snapshot.decision}\` at \`${entry.recordedAt}\` via \`${entry.trigger}\``);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function upsertConversationDecision({ ledger, history, nextDecision, trigger = "unknown" }) {
  const normalized = normalizeDecision(nextDecision);
  const nextLedger = ledger && typeof ledger === "object"
    ? {
      schemaVersion: ledger.schemaVersion || 1,
      updatedAt: normalized.reviewedAt || new Date().toISOString(),
      decisions: Array.isArray(ledger.decisions) ? [...ledger.decisions] : []
    }
    : createEmptyConversationDecisionLedger();
  const nextHistory = history && typeof history === "object"
    ? {
      schemaVersion: history.schemaVersion || 1,
      entries: Array.isArray(history.entries) ? [...history.entries] : []
    }
    : createEmptyConversationDecisionHistory();
  const existingIndex = nextLedger.decisions.findIndex((item) => item.patternId === normalized.patternId);
  const existing = existingIndex >= 0 ? nextLedger.decisions[existingIndex] : null;

  if (existing && JSON.stringify(existing) === JSON.stringify(normalized)) {
    return {
      ledger: nextLedger,
      history: nextHistory,
      decision: normalized,
      changed: false
    };
  }

  if (existingIndex >= 0) nextLedger.decisions.splice(existingIndex, 1, normalized);
  else nextLedger.decisions.push(normalized);
  nextLedger.decisions.sort((left, right) => left.patternId.localeCompare(right.patternId, "zh-CN"));
  nextLedger.updatedAt = normalized.reviewedAt || new Date().toISOString();
  nextHistory.entries.push({
    recordedAt: normalized.reviewedAt || new Date().toISOString(),
    trigger,
    patternId: normalized.patternId,
    snapshot: normalized
  });

  return {
    ledger: nextLedger,
    history: nextHistory,
    decision: normalized,
    changed: true
  };
}
