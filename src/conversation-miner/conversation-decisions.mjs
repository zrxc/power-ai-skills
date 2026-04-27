/**
 * 决策管理和审查模块
 * 
 * 职责：
 * - 加载决策工件（ledger和history）
 * - 同步决策与模式的对应关系
 * - 审查意图解析
 * - 应用模式审查（单条和批量）
 * - 加载已保存的决策记录
 * 
 * 依赖外部服务：decision-ledger.mjs, renderers.mjs
 */
import {
  inferConversationDecisionState,
  inferConversationDecisionTarget,
  loadConversationDecisionHistory,
  loadConversationDecisionLedger,
  summarizeConversationDecisionLedger,
  upsertConversationDecision
} from "./decision-ledger.mjs";
import { buildConversationDecisionLedgerMarkdown } from "./decision-ledger.mjs";
import { writeJson } from "../shared/fs.mjs";
import fs from "node:fs";

export { upsertConversationDecision } from "./decision-ledger.mjs";

/**
 * 写入决策ledger相关文件
 * 
 * @param {Object} options - 写入选项
 */
export function writeConversationDecisionLedgerArtifacts({ paths, projectName, ledger, history }) {
  writeJson(paths.conversationDecisionsPath, ledger);
  writeJson(paths.conversationDecisionHistoryPath, history);
  fs.writeFileSync(
    paths.conversationDecisionReportPath,
    buildConversationDecisionLedgerMarkdown({ projectName, ledger, history }),
    "utf8"
  );
}

/**
 * 加载决策工件
 * 
 * @param {Object} paths - 路径对象
 * @returns {Object} ledger和history
 */
export function loadConversationDecisionArtifacts(paths) {
  return {
    ledger: loadConversationDecisionLedger(paths),
    history: loadConversationDecisionHistory(paths)
  };
}

/**
 * 同步对话决策
 * 根据当前分析的模式更新决策ledger，处理新增、更新和孤立的决策
 * 
 * @param {Object} options - 同步选项
 * @returns {Object} 同步结果
 */
export function syncConversationDecisions({ paths, payload, trigger = "analyze-patterns" }) {
  const { ledger: existingLedger, history: existingHistory } = loadConversationDecisionArtifacts(paths);
  let nextLedger = existingLedger;
  let nextHistory = existingHistory;
  const patternLookup = new Map((payload.patterns || []).map((pattern) => [pattern.id, pattern]));

  for (const pattern of payload.patterns || []) {
    const existingDecision = (nextLedger.decisions || []).find((item) => item.patternId === pattern.id);
    const derivedState = inferConversationDecisionState(pattern);
    const nextDecisionState = existingDecision?.decision === "archived"
      ? existingDecision.decision
      : existingDecision?.decision && existingDecision.decision !== "detected" && existingDecision.decision !== "review"
        ? existingDecision.decision
        : derivedState;
    const nextTarget = existingDecision?.target
      || (nextDecisionState === "accepted" || nextDecisionState === "promoted" ? inferConversationDecisionTarget(pattern) : "");
    const upserted = upsertConversationDecision({
      ledger: nextLedger,
      history: nextHistory,
      trigger,
      nextDecision: {
        patternId: pattern.id,
        sceneType: pattern.sceneType,
        sourceConversationIds: pattern.sampleConversationIds || [],
        recommendation: pattern.recommendation || "",
        decision: nextDecisionState,
        target: nextTarget,
        decisionReason: existingDecision?.decisionReason || "",
        reviewedBy: existingDecision?.reviewedBy || (nextDecisionState === derivedState ? "system" : ""),
        reviewedAt: existingDecision?.reviewedAt || new Date().toISOString(),
        trace: {
          ...(existingDecision?.trace || {}),
          candidateSkillName: pattern.candidateSkill?.name || ""
        }
      }
    });
    nextLedger = upserted.ledger;
    nextHistory = upserted.history;
  }

  for (const existingDecision of nextLedger.decisions || []) {
    if (patternLookup.has(existingDecision.patternId)) continue;
    if (existingDecision.decision === "promoted" || existingDecision.decision === "archived") continue;
    const upserted = upsertConversationDecision({
      ledger: nextLedger,
      history: nextHistory,
      trigger: `${trigger}:orphaned`,
      nextDecision: {
        ...existingDecision,
        decision: "archived",
        target: existingDecision.target || "ignored",
        decisionReason: existingDecision.decisionReason || "Pattern is no longer active in the current conversation analysis result.",
        reviewedBy: existingDecision.reviewedBy || "system",
        reviewedAt: new Date().toISOString(),
        trace: {
          ...(existingDecision.trace || {}),
          archivedByAnalyzer: true
        }
      }
    });
    nextLedger = upserted.ledger;
    nextHistory = upserted.history;
  }

  writeConversationDecisionLedgerArtifacts({
    paths,
    projectName: payload.projectName,
    ledger: nextLedger,
    history: nextHistory
  });

  return {
    ledger: nextLedger,
    history: nextHistory,
    summary: summarizeConversationDecisionLedger(nextLedger)
  };
}

/**
 * 加载对话决策
 * 
 * @param {Function} loadProjectPatterns - 加载模式的函数
 * @param {Function} loadConversationDecisionArtifacts - 加载决策的函数
 * @param {Object} paths - 路径对象
 * @returns {Object} 决策结果
 */
export function loadConversationDecisions(loadProjectPatterns, loadConversationDecisionArtifacts) {
  const { paths, payload } = loadProjectPatterns();
  const { ledger, history } = loadConversationDecisionArtifacts(paths);
  return {
    generatedAt: ledger.updatedAt || payload.lastAnalyzed || "",
    projectName: payload.projectName,
    summary: summarizeConversationDecisionLedger(ledger),
    ledger,
    history,
    decisionsPath: paths.conversationDecisionsPath,
    historyPath: paths.conversationDecisionHistoryPath,
    reportPath: paths.conversationDecisionReportPath
  };
}

/**
 * 解析审查意图
 * 根据accept/reject/archive标志确定审查决策
 * 
 * @param {Object} options - 审查选项
 * @returns {Object} 决策意图
 */
export function resolveConversationPatternReviewIntent({ accept = false, reject = false, archive = false, target = "", reason = "" } = {}) {
  if (accept) {
    return {
      decision: "accepted",
      target,
      decisionReason: reason
    };
  }
  if (reject) {
    return {
      decision: "rejected",
      target: "ignored",
      decisionReason: reason
    };
  }
  if (archive) {
    return {
      decision: "archived",
      target,
      decisionReason: reason
    };
  }
  throw new Error("review-conversation-pattern requires one of --accept, --reject, or --archive.");
}

/**
 * 应用模式审查
 * 更新决策ledger中的审查信息
 * 
 * @param {Object} options - 审查选项
 * @returns {Object} 审查结果
 */
export function applyConversationPatternReview({
  paths,
  payload,
  ledger,
  history,
  pattern,
  existingDecision,
  decision,
  target = "",
  reason = "",
  trigger = "review-conversation-pattern",
  reviewedBy = "manual-cli"
}) {
  const reviewedAt = new Date().toISOString();
  const resolvedTarget = decision === "accepted"
    ? (target || existingDecision?.target || inferConversationDecisionTarget(pattern))
    : decision === "archived"
      ? (target || existingDecision?.target || "ignored")
      : "ignored";
  const updated = upsertConversationDecision({
    ledger,
    history,
    trigger,
    nextDecision: {
      patternId: pattern.id,
      sceneType: pattern.sceneType,
      sourceConversationIds: pattern.sampleConversationIds || existingDecision?.sourceConversationIds || [],
      recommendation: pattern.recommendation || existingDecision?.recommendation || "",
      decision,
      target: resolvedTarget,
      decisionReason: reason || existingDecision?.decisionReason || "",
      reviewedBy,
      reviewedAt,
      trace: {
        ...(existingDecision?.trace || {}),
        candidateSkillName: pattern.candidateSkill?.name || existingDecision?.trace?.candidateSkillName || ""
      }
    }
  });

  return {
    ledger: updated.ledger,
    history: updated.history,
    reviewedAt,
    decision: updated.decision
  };
}

/**
 * 审查单个对话模式
 * 
 * @param {Object} options - 审查选项
 * @param {Function} loadProjectPatterns - 加载模式的函数
 * @param {Function} loadConversationDecisionArtifacts - 加载决策的函数
 * @returns {Object} 审查结果
 */
export function reviewConversationPattern({ patternId = "", accept = false, reject = false, archive = false, target = "", reason = "" }, services) {
  if (!patternId) throw new Error("review-conversation-pattern requires --pattern <id>.");
  const { paths, payload } = services.loadProjectPatterns();
  const patternLookup = new Map((payload.patterns || []).map((pattern) => [pattern.id, pattern]));
  const pattern = patternLookup.get(patternId);
  if (!pattern) throw new Error(`Conversation pattern not found: ${patternId}`);

  const { ledger, history } = services.loadConversationDecisionArtifacts(paths);
  const existingDecision = (ledger.decisions || []).find((item) => item.patternId === patternId);
  const intent = resolveConversationPatternReviewIntent({ accept, reject, archive, target, reason });
  const updated = applyConversationPatternReview({
    paths,
    payload,
    ledger,
    history,
    pattern,
    existingDecision,
    decision: intent.decision,
    target: intent.target,
    reason: intent.decisionReason,
    trigger: "review-conversation-pattern",
    reviewedBy: "manual-cli"
  });

  writeConversationDecisionLedgerArtifacts({
    paths,
    projectName: payload.projectName,
    ledger: updated.ledger,
    history: updated.history
  });

  return {
    patternId,
    sceneType: pattern.sceneType,
    decision: updated.decision.decision,
    target: updated.decision.target,
    decisionReason: updated.decision.decisionReason,
    reviewedAt: updated.reviewedAt,
    decisionsPath: paths.conversationDecisionsPath,
    historyPath: paths.conversationDecisionHistoryPath,
    reportPath: paths.conversationDecisionReportPath
  };
}

/**
 * 批量审查对话模式
 * 
 * @param {Object} options - 批量审查选项
 * @param {Function} loadProjectPatterns - 加载模式的函数
 * @param {Function} loadConversationDecisionArtifacts - 加载决策的函数
 * @returns {Object} 批量审查结果
 */
export function reviewConversationPatternsBatch({
  fromState = "review",
  accept = false,
  reject = false,
  archive = false,
  target = "",
  reason = "",
  limit = 0
}, services) {
  const { paths, payload } = services.loadProjectPatterns();
  const patternLookup = new Map((payload.patterns || []).map((pattern) => [pattern.id, pattern]));
  const { ledger, history } = services.loadConversationDecisionArtifacts(paths);
  const intent = resolveConversationPatternReviewIntent({ accept, reject, archive, target, reason });
  const candidateDecisions = (ledger.decisions || [])
    .filter((item) => item.decision === fromState)
    .sort((left, right) => left.patternId.localeCompare(right.patternId, "zh-CN"));

  if (candidateDecisions.length === 0) {
    throw new Error(`No conversation patterns found in decision state: ${fromState}.`);
  }

  let nextLedger = ledger;
  let nextHistory = history;
  const processed = [];
  const skipped = [];
  const limitedCandidates = limit > 0 ? candidateDecisions.slice(0, limit) : candidateDecisions;

  for (const existingDecision of limitedCandidates) {
    const pattern = patternLookup.get(existingDecision.patternId);
    if (!pattern) {
      skipped.push({
        patternId: existingDecision.patternId,
        reason: "pattern-not-found"
      });
      continue;
    }
    const updated = applyConversationPatternReview({
      paths,
      payload,
      ledger: nextLedger,
      history: nextHistory,
      pattern,
      existingDecision,
      decision: intent.decision,
      target: intent.target,
      reason: intent.decisionReason,
      trigger: "review-conversation-pattern:batch",
      reviewedBy: "manual-cli-batch"
    });
    nextLedger = updated.ledger;
    nextHistory = updated.history;
    processed.push({
      patternId: existingDecision.patternId,
      sceneType: pattern.sceneType,
      decision: updated.decision.decision,
      target: updated.decision.target,
      reviewedAt: updated.reviewedAt
    });
  }

  writeConversationDecisionLedgerArtifacts({
    paths,
    projectName: payload.projectName,
    ledger: nextLedger,
    history: nextHistory
  });

  return {
    mode: "batch",
    sourceDecision: fromState,
    appliedDecision: intent.decision,
    appliedTarget: intent.decision === "accepted" ? (intent.target || "auto") : (intent.target || "ignored"),
    limit: limit > 0 ? limit : 0,
    processedCount: processed.length,
    skippedCount: skipped.length,
    processed,
    skipped,
    decisionsPath: paths.conversationDecisionsPath,
    historyPath: paths.conversationDecisionHistoryPath,
    reportPath: paths.conversationDecisionReportPath
  };
}
