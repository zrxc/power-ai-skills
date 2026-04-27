/**
 * 模式分析和识别模块
 * 
 * 职责：
 * - 加载项目对话模式
 * - 模式合并场景类型解析
 * - 模式分析和聚合统计
 * - 模式合并、归档和恢复操作
 * 
 * 依赖外部服务：decisionService, reportService
 */
import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "../shared/fs.mjs";
import { loadConversationPatternGovernance, writeConversationPatternGovernance } from "./pattern-governance.mjs";
import {
  clampScore,
  createPatternId,
  incrementCount,
  normalizeSceneType,
  topValues,
  toUniqueSortedList
} from "./records.mjs";
import { buildPatternSummaryMarkdown, formatRecommendationLabel } from "./renderers.mjs";
import { conversationThresholds, sceneDefinitions } from "./setup.mjs";

/**
 * 创建模式查找表
 * 
 * @param {Object} payload - 模式数据
 * @returns {Map} 模式ID到模式对象的映射
 */
export function createPatternLookup(payload) {
  return new Map((payload.patterns || []).map((pattern) => [pattern.id, pattern]));
}

/**
 * 解析合并后的场景类型
 * 处理模式治理中的合并映射，解决循环引用问题
 * 
 * @param {string} sceneType - 场景类型
 * @param {Map} mergeMap - 合并映射表
 * @returns {string} 最终场景类型
 */
export function resolveMergedSceneType(sceneType, mergeMap) {
  let current = sceneType;
  const visited = new Set();

  while (mergeMap.has(current)) {
    if (visited.has(current)) {
      throw new Error(`Conversation pattern governance contains a merge cycle at sceneType: ${current}.`);
    }
    visited.add(current);
    current = mergeMap.get(current);
  }

  return current;
}

/**
 * 加载项目对话模式
 * 
 * @param {Function} ensureConversationRoots - 确保目录存在的函数
 * @returns {Object} 路径和模式数据
 */
export function loadProjectPatterns(ensureConversationRoots) {
  const paths = ensureConversationRoots();
  if (!fs.existsSync(paths.projectPatternsPath)) {
    throw new Error("Missing conversation patterns. Run `npx power-ai-skills analyze-patterns` first.");
  }
  return { paths, payload: readJson(paths.projectPatternsPath) };
}

/**
 * 分析对话模式
 * 按场景类型分组记录，计算统计指标，生成模式建议
 * 
 * @param {Object} options - 分析选项
 * @param {Function} captureEvaluationService.loadConversationRecords - 加载记录的函数
 * @param {Function} ensureConversationRoots - 确保目录存在的函数
 * @param {Function} syncConversationDecisions - 同步决策的函数
 * @param {Object} services - 服务集合
 * @returns {Object} 分析结果
 */
export function analyzePatterns({ from = "", to = "" }, {
  loadConversationRecords,
  ensureConversationRoots,
  syncConversationDecisions,
  writePatternGovernanceReport,
  projectName
}) {
  const paths = ensureConversationRoots();
  const { records, fileCount } = loadConversationRecords({ from, to });
  const governance = loadConversationPatternGovernance(paths);
  const archiveMap = new Map(governance.archives.map((item) => [item.sceneType, item]));
  const mergeMap = new Map(governance.merges.map((item) => [item.sourceSceneType, item.targetSceneType]));
  const grouped = new Map();

  for (const record of records) {
    const rawSceneType = normalizeSceneType(record.sceneType);
    if (!rawSceneType) continue;
    const sceneType = resolveMergedSceneType(rawSceneType, mergeMap);
    if (archiveMap.has(sceneType)) continue;
    const current = grouped.get(sceneType) || {
      sceneType,
      records: [],
      skillCounts: new Map(),
      mainObjectCounts: new Map(),
      treeObjectCounts: new Map(),
      operationCounts: new Map(),
      customizationCounts: new Map(),
      generatedFileCounts: new Map(),
      sourceSceneTypes: new Set(),
      mergedFromSceneTypes: new Set()
    };
    current.records.push(record);
    current.sourceSceneTypes.add(rawSceneType);
    if (rawSceneType !== sceneType) current.mergedFromSceneTypes.add(rawSceneType);
    for (const skillName of record.skillsUsed || []) incrementCount(current.skillCounts, skillName);
    incrementCount(current.mainObjectCounts, record.entities?.mainObject || "");
    incrementCount(current.treeObjectCounts, record.entities?.treeObject || "");
    for (const operation of record.entities?.operations || []) incrementCount(current.operationCounts, operation);
    for (const customization of record.customizations || []) incrementCount(current.customizationCounts, customization);
    for (const generatedFile of record.generatedFiles || []) incrementCount(current.generatedFileCounts, generatedFile);
    grouped.set(sceneType, current);
  }

  const patterns = [...grouped.values()].map((group) => {
    const frequency = group.records.length;
    const definition = sceneDefinitions.get(group.sceneType);
    const commonSkills = topValues(group.skillCounts, { frequency, maxItems: 5, minRatio: 0.5, absoluteMin: 2 });
    const mainObjects = topValues(group.mainObjectCounts, { frequency, maxItems: 3, minRatio: 0.34, absoluteMin: 1 });
    const treeObjects = topValues(group.treeObjectCounts, { frequency, maxItems: 3, minRatio: 0.34, absoluteMin: 1 });
    const operations = topValues(group.operationCounts, { frequency, maxItems: 6, minRatio: 0.34, absoluteMin: 1 });
    const customizations = topValues(group.customizationCounts, { frequency, maxItems: 6, minRatio: 0.34, absoluteMin: 1 });
    const sampleGeneratedFiles = topValues(group.generatedFileCounts, { frequency, maxItems: 6, minRatio: 0.25, absoluteMin: 1 });
    const repeatedCustomizationCount = [...group.customizationCounts.values()].filter((count) => count >= 2).length;
    const repeatedOperationCount = [...group.operationCounts.values()].filter((count) => count >= 2).length;
    const reuseScore = clampScore(
      (frequency * 18)
      + (commonSkills.length * 8)
      + (repeatedCustomizationCount * 10)
      + (repeatedOperationCount * 4)
    );
    const reuseValue = reuseScore >= 70 ? "high" : reuseScore >= 45 ? "medium" : "low";
    const recommendation = definition && frequency >= conversationThresholds.minFrequencyToGenerate && reuseScore >= conversationThresholds.minReuseScoreToGenerate
      ? "generate"
      : frequency >= conversationThresholds.minFrequencyToReview && reuseScore >= conversationThresholds.minReuseScoreToReview
        ? "review"
        : "skip";

    return {
      id: createPatternId(group.sceneType),
      sceneType: group.sceneType,
      frequency,
      commonSkills,
      mainObjects,
      treeObjects,
      operations,
      customizations,
      sampleGeneratedFiles,
      reuseScore,
      reuseValue,
      recommendation,
      recommendationLabel: formatRecommendationLabel(recommendation),
      sourceSceneTypes: toUniqueSortedList([...group.sourceSceneTypes]),
      mergedFromSceneTypes: toUniqueSortedList([...group.mergedFromSceneTypes]),
      candidateSkill: definition ? {
        name: definition.skillName,
        baseSkill: definition.baseSkill,
        displayName: definition.displayName
      } : null,
      sampleConversationIds: group.records.slice(0, 5).map((record) => record.id),
      enterpriseCandidate: false,
      crossProjectHint: "reserved",
      proposalStatus: "not-enabled",
      source: "conversation-miner"
    };
  }).sort(
    (left, right) => right.frequency - left.frequency
    || right.reuseScore - left.reuseScore
    || left.sceneType.localeCompare(right.sceneType, "zh-CN")
  );

  const payload = {
    projectName: projectName || path.basename(globalThis.__projectRoot || "unknown-project"),
    lastAnalyzed: new Date().toISOString(),
    filters: { from: from || "", to: to || "" },
    summary: {
      fileCount,
      recordCount: records.length,
      generate: patterns.filter((pattern) => pattern.recommendation === "generate").length,
      review: patterns.filter((pattern) => pattern.recommendation === "review").length,
      skip: patterns.filter((pattern) => pattern.recommendation === "skip").length,
      activeMerges: governance.merges.length,
      archivedPatterns: governance.archives.length
    },
    patterns,
    governance: {
      mergeCount: governance.merges.length,
      archiveCount: governance.archives.length,
      reportPath: paths.patternGovernanceReportPath
    }
  };

  writeJson(paths.projectPatternsPath, payload);
  fs.writeFileSync(paths.patternSummaryPath, buildPatternSummaryMarkdown({ projectName: payload.projectName, payload }), "utf8");
  writePatternGovernanceReport({ paths, governance, payload });
  const conversationDecisions = syncConversationDecisions({ paths, payload, trigger: "analyze-patterns" });

  return {
    ...payload,
    conversationDecisions,
    projectPatternsPath: paths.projectPatternsPath,
    patternSummaryPath: paths.patternSummaryPath,
    patternGovernancePath: paths.patternGovernancePath,
    patternGovernanceReportPath: paths.patternGovernanceReportPath,
    conversationDecisionsPath: paths.conversationDecisionsPath,
    conversationDecisionHistoryPath: paths.conversationDecisionHistoryPath,
    conversationDecisionReportPath: paths.conversationDecisionReportPath
  };
}

/**
 * 合并对话模式
 * 将一个模式合并到另一个模式中
 * 
 * @param {Object} options - 合并选项
 * @param {Function} loadProjectPatterns - 加载模式的函数
 * @param {Function} analyzePatterns - 分析模式的函数
 * @param {Function} loadConversationDecisionArtifacts - 加载决策的函数
 * @param {Function} upsertConversationDecision - 更新/插入决策的函数
 * @param {Function} writeConversationDecisionLedgerArtifacts - 写入决策文件的函数
 * @returns {Object} 合并结果
 */
export function mergeConversationPattern({ sourcePatternId = "", targetPatternId = "", note = "" }, services) {
  if (!sourcePatternId || !targetPatternId) {
    throw new Error("merge-conversation-pattern requires --source <pattern-id> and --target <pattern-id>.");
  }
  if (sourcePatternId === targetPatternId) {
    throw new Error("merge-conversation-pattern requires different source and target pattern ids.");
  }

  const { paths, payload } = services.loadProjectPatterns();
  const patternLookup = createPatternLookup(payload);
  const sourcePattern = patternLookup.get(sourcePatternId);
  const targetPattern = patternLookup.get(targetPatternId);
  if (!sourcePattern) throw new Error(`Conversation pattern not found: ${sourcePatternId}`);
  if (!targetPattern) throw new Error(`Conversation pattern not found: ${targetPatternId}`);

  const governance = loadConversationPatternGovernance(paths);
  if (governance.merges.some((item) => item.sourcePatternId === sourcePatternId)) {
    throw new Error(`Conversation pattern is already merged: ${sourcePatternId}`);
  }
  if (governance.archives.some((item) => item.patternId === sourcePatternId)) {
    throw new Error(`Archived conversation pattern cannot be merged until restored: ${sourcePatternId}`);
  }

  const mergedAt = new Date().toISOString();
  governance.merges.push({
    sourcePatternId,
    sourceSceneType: sourcePattern.sceneType,
    targetPatternId,
    targetSceneType: targetPattern.sceneType,
    mergedAt,
    note: String(note || "").trim()
  });
  governance.updatedAt = mergedAt;
  governance.history.push({
    type: "merge",
    at: mergedAt,
    sourcePatternId,
    sourceSceneType: sourcePattern.sceneType,
    targetPatternId,
    targetSceneType: targetPattern.sceneType,
    note: String(note || "").trim()
  });
  writeConversationPatternGovernance(paths, governance);

  const { ledger, history } = services.loadConversationDecisionArtifacts(paths);
  const sourceDecision = (ledger.decisions || []).find((item) => item.patternId === sourcePatternId);
  if (sourceDecision) {
    const archivedSource = services.upsertConversationDecision({
      ledger,
      history,
      trigger: "merge-conversation-pattern",
      nextDecision: {
        ...sourceDecision,
        decision: "archived",
        target: sourceDecision.target || "ignored",
        decisionReason: note || `Merged into ${targetPatternId}.`,
        reviewedBy: "system",
        reviewedAt: mergedAt,
        trace: {
          ...(sourceDecision.trace || {}),
          mergedIntoPatternId: targetPatternId
        }
      }
    });
    services.writeConversationDecisionLedgerArtifacts({
      paths,
      projectName: payload.projectName,
      ledger: archivedSource.ledger,
      history: archivedSource.history
    });
  }

  const refreshed = services.analyzePatterns(payload.filters || {});
  return {
    sourcePatternId,
    targetPatternId,
    sourceSceneType: sourcePattern.sceneType,
    targetSceneType: targetPattern.sceneType,
    mergedAt,
    note: String(note || "").trim(),
    projectPatternsPath: refreshed.projectPatternsPath,
    patternGovernancePath: refreshed.patternGovernancePath,
    patternGovernanceReportPath: refreshed.patternGovernanceReportPath
  };
}

/**
 * 归档对话模式
 * 
 * @param {Object} options - 归档选项
 * @param {Function} loadProjectPatterns - 加载模式的函数
 * @param {Object} services - 服务集合
 * @returns {Object} 归档结果
 */
export function archiveConversationPattern({ patternId = "", note = "" }, services) {
  if (!patternId) throw new Error("archive-conversation-pattern requires --pattern <id>.");

  const { paths, payload } = services.loadProjectPatterns();
  const patternLookup = createPatternLookup(payload);
  const pattern = patternLookup.get(patternId);
  if (!pattern) throw new Error(`Conversation pattern not found: ${patternId}`);

  const governance = loadConversationPatternGovernance(paths);
  if (governance.archives.some((item) => item.patternId === patternId)) {
    throw new Error(`Conversation pattern is already archived: ${patternId}`);
  }

  const archivedAt = new Date().toISOString();
  governance.archives.push({
    patternId,
    sceneType: pattern.sceneType,
    archivedAt,
    note: String(note || "").trim()
  });
  governance.updatedAt = archivedAt;
  governance.history.push({
    type: "archive",
    at: archivedAt,
    patternId,
    sceneType: pattern.sceneType,
    note: String(note || "").trim()
  });
  writeConversationPatternGovernance(paths, governance);

  const { ledger, history } = services.loadConversationDecisionArtifacts(paths);
  const existingDecision = (ledger.decisions || []).find((item) => item.patternId === patternId);
  if (existingDecision) {
    const archivedDecision = services.upsertConversationDecision({
      ledger,
      history,
      trigger: "archive-conversation-pattern",
      nextDecision: {
        ...existingDecision,
        decision: "archived",
        target: existingDecision.target || "ignored",
        decisionReason: note || `Archived conversation pattern: ${patternId}.`,
        reviewedBy: "system",
        reviewedAt: archivedAt,
        trace: {
          ...(existingDecision.trace || {}),
          archivedFromDecision: existingDecision.decision,
          archivedFromTarget: existingDecision.target || ""
        }
      }
    });
    services.writeConversationDecisionLedgerArtifacts({
      paths,
      projectName: payload.projectName,
      ledger: archivedDecision.ledger,
      history: archivedDecision.history
    });
  }

  const refreshed = services.analyzePatterns(payload.filters || {});
  return {
    patternId,
    sceneType: pattern.sceneType,
    archivedAt,
    note: String(note || "").trim(),
    projectPatternsPath: refreshed.projectPatternsPath,
    patternGovernancePath: refreshed.patternGovernancePath,
    patternGovernanceReportPath: refreshed.patternGovernanceReportPath
  };
}

/**
 * 恢复对话模式
 * 从归档或合并状态中恢复模式
 * 
 * @param {Object} options - 恢复选项
 * @param {Function} loadProjectPatterns - 加载模式的函数
 * @param {Object} services - 服务集合
 * @returns {Object} 恢复结果
 */
export function restoreConversationPattern({ patternId = "", note = "" }, services) {
  if (!patternId) throw new Error("restore-conversation-pattern requires --pattern <id>.");

  const { paths, payload } = services.loadProjectPatterns();
  const governance = loadConversationPatternGovernance(paths);
  const activeMerge = governance.merges.find((item) => item.sourcePatternId === patternId);
  const activeArchive = governance.archives.find((item) => item.patternId === patternId);
  if (!activeMerge && !activeArchive) {
    throw new Error(`Conversation pattern is not governed by an active merge/archive rule: ${patternId}`);
  }

  governance.merges = governance.merges.filter((item) => item.sourcePatternId !== patternId);
  governance.archives = governance.archives.filter((item) => item.patternId !== patternId);
  const restoredAt = new Date().toISOString();
  const restoredTypes = [
    ...(activeMerge ? ["merge"] : []),
    ...(activeArchive ? ["archive"] : [])
  ];
  governance.updatedAt = restoredAt;
  governance.history.push({
    type: "restore",
    at: restoredAt,
    patternId,
    sceneType: activeArchive?.sceneType || activeMerge?.sourceSceneType || "",
    restoredTypes,
    note: String(note || "").trim()
  });
  writeConversationPatternGovernance(paths, governance);

  const { ledger, history } = services.loadConversationDecisionArtifacts(paths);
  const existingDecision = (ledger.decisions || []).find((item) => item.patternId === patternId);
  const restoredDecisionState = existingDecision?.trace?.archivedFromDecision
    && existingDecision.trace.archivedFromDecision !== "archived"
    ? existingDecision.trace.archivedFromDecision
    : "review";
  if (existingDecision) {
    const restoredDecision = services.upsertConversationDecision({
      ledger,
      history,
      trigger: "restore-conversation-pattern",
      nextDecision: {
        ...existingDecision,
        decision: restoredDecisionState,
        target: existingDecision.trace?.archivedFromTarget || (restoredDecisionState === "accepted" ? existingDecision.target : ""),
        decisionReason: note || `Restored conversation pattern: ${patternId}.`,
        reviewedBy: "system",
        reviewedAt: restoredAt,
        trace: {
          ...(existingDecision.trace || {}),
          restoredTypes
        }
      }
    });
    services.writeConversationDecisionLedgerArtifacts({
      paths,
      projectName: payload.projectName,
      ledger: restoredDecision.ledger,
      history: restoredDecision.history
    });
  }

  const refreshed = services.analyzePatterns(payload.filters || {});
  return {
    patternId,
    restoredAt,
    restoredTypes,
    note: String(note || "").trim(),
    projectPatternsPath: refreshed.projectPatternsPath,
    patternGovernancePath: refreshed.patternGovernancePath,
    patternGovernanceReportPath: refreshed.patternGovernanceReportPath
  };
}
