/**
 * Evolution Candidate Manager 模块
 * 
 * 职责：
 * - 候选项的加载、持久化和状态更新
 * - 候选项的生成（协调候选项工具函数完成）
 * - 进化行动的执行和应用
 * 
 * 本模块负责管理候选项的生命周期，包括：
 * 从文件系统加载和保存候选项、调用工具函数生成候选项、
 * 执行进化行动（如技能刷新、治理上下文更新等）。
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../shared/fs.mjs";
import {
  createEmptyEvolutionCandidates,
  createEmptyEvolutionCandidateHistory,
  normalizeCandidate,
  summarizeEvolutionCandidates,
  buildEvolutionSummaryMarkdown
} from "./candidates.mjs";
import {
  createEmptyEvolutionActions,
  normalizeEvolutionAction,
  summarizeEvolutionActions
} from "./actions.mjs";
import {
  buildPatternCandidates,
  buildProfileAdjustmentCandidate,
  buildEvolutionRecommendedActions
} from "./candidate-utils.mjs";

/**
 * 创建进化候选项管理器
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.context - 上下文对象（包含 packageJson 信息）
 * @param {string} options.projectRoot - 项目根目录
 * @param {Object} options.paths - 路径对象
 * @param {Object} options.policyService - 策略服务对象
 * @param {Object} options.conversationMinerService - 对话挖掘服务
 * @param {Object} options.governanceContextService - 治理上下文服务
 * @param {Object} options.governanceSummaryService - 治理摘要服务
 * @param {Object} options.teamPolicyService - 团队策略服务
 * @param {Function} options.loadEvolutionPolicy - 加载策略的函数
 * @param {Function} options.stableStringify - 稳定字符串化函数（用于比较对象）
 * @returns {Object} 候选项管理器对象
 */
export function createEvolutionCandidateManager({
  context,
  projectRoot,
  paths,
  conversationMinerService,
  governanceContextService,
  governanceSummaryService,
  teamPolicyService,
  loadEvolutionPolicy,
  stableStringify
}) {

  /**
   * 加载进化候选项和历史记录
   * @returns {Object} 候选项和历史记录对象
   */
  function loadEvolutionCandidates() {
    const candidates = fs.existsSync(paths.evolutionCandidatesTarget)
      ? JSON.parse(fs.readFileSync(paths.evolutionCandidatesTarget, "utf8"))
      : createEmptyEvolutionCandidates();
    const history = fs.existsSync(paths.evolutionCandidateHistoryTarget)
      ? JSON.parse(fs.readFileSync(paths.evolutionCandidateHistoryTarget, "utf8"))
      : createEmptyEvolutionCandidateHistory();
    return {
      candidates: {
        schemaVersion: candidates?.schemaVersion || 1,
        updatedAt: candidates?.updatedAt || "",
        candidates: Array.isArray(candidates?.candidates) ? candidates.candidates.map((item) => normalizeCandidate(item)) : []
      },
      history: {
        schemaVersion: history?.schemaVersion || 1,
        entries: Array.isArray(history?.entries) ? history.entries : []
      }
    };
  }

  /**
   * 加载进化行动列表
   * @returns {Object} 行动列表对象
   */
  function loadEvolutionActions() {
    const payload = fs.existsSync(paths.evolutionActionsTarget)
      ? JSON.parse(fs.readFileSync(paths.evolutionActionsTarget, "utf8"))
      : createEmptyEvolutionActions();
    return {
      payload: {
        schemaVersion: payload?.schemaVersion || 1,
        updatedAt: payload?.updatedAt || "",
        actions: Array.isArray(payload?.actions) ? payload.actions.map((item) => normalizeEvolutionAction(item)) : []
      }
    };
  }

  /**
   * 持久化候选项数据到文件系统
   * 
   * @param {Object} params - 参数对象
   * @param {Object} params.candidatesPayload - 候选项数据
   * @param {Object} params.historyPayload - 历史记录数据
   * @param {Object} params.summaryPayload - 汇总数据
   */
  function persistEvolutionCandidates({ candidatesPayload, historyPayload, summaryPayload }) {
    ensureDir(path.dirname(paths.evolutionCandidatesTarget));
    ensureDir(path.dirname(paths.evolutionSummaryPath));
    writeJson(paths.evolutionCandidatesTarget, candidatesPayload);
    writeJson(paths.evolutionCandidateHistoryTarget, historyPayload);
    writeJson(paths.evolutionSummaryJsonPath, summaryPayload);
    fs.writeFileSync(paths.evolutionSummaryPath, buildEvolutionSummaryMarkdown(summaryPayload), "utf8");
  }

  /**
   * 更新候选项状态
   * 
   * @param {Object} params - 参数对象
   * @param {string} params.candidateId - 候选项 ID
   * @param {string} params.nextStatus - 新状态
   * @param {string} params.reasonSuffix - 原因后缀（追加到现有原因）
   * @param {string} params.trigger - 触发源
   * @returns {Object} 更新后的数据对象
   */
  function updateEvolutionCandidateStatus({ candidateId, nextStatus, reasonSuffix = "", trigger = "apply-evolution-actions" } = {}) {
    const { candidates: existingCandidates, history: existingHistory } = loadEvolutionCandidates();
    const nextHistory = {
      schemaVersion: existingHistory.schemaVersion || 1,
      entries: Array.isArray(existingHistory.entries) ? [...existingHistory.entries] : []
    };
    const nextCandidates = {
      schemaVersion: existingCandidates.schemaVersion || 1,
      updatedAt: new Date().toISOString(),
      candidates: (existingCandidates.candidates || []).map((item) => {
        if (item.candidateId !== candidateId) return item;
        const updated = normalizeCandidate({
          ...item, status: nextStatus, generatedAt: new Date().toISOString(),
          reason: `${item.reason || ""}${reasonSuffix}`.trim()
        });
        nextHistory.entries.push({ recordedAt: new Date().toISOString(), trigger, candidateId, snapshot: updated });
        return updated;
      })
    };
    const summary = summarizeEvolutionCandidates(nextCandidates);
    const summaryPayload = {
      generatedAt: nextCandidates.updatedAt, packageName: context.packageJson.name,
      version: context.packageJson.version, projectRoot, trigger, summary,
      candidates: nextCandidates.candidates,
      recommendedActions: buildEvolutionRecommendedActions(summary),
      candidatesPath: paths.evolutionCandidatesTarget, historyPath: paths.evolutionCandidateHistoryTarget
    };
    persistEvolutionCandidates({ candidatesPayload: nextCandidates, historyPayload: nextHistory, summaryPayload });
    return { candidatesPayload: nextCandidates, historyPayload: nextHistory, summaryPayload };
  }

  /**
   * 生成进化候选项
   * 
   * 从对话模式、决策账本和团队策略中分析并生成候选项，
   * 合并现有候选项并更新状态，最后持久化到文件系统。
   * 
   * @param {Object} options - 配置选项
   * @param {string} options.trigger - 触发源
   * @param {Object|null} options.patternsPayload - 模式数据（可选，为空时自动加载）
   * @returns {Object} 生成结果对象
   */
  function generateEvolutionCandidates({ trigger = "manual", patternsPayload = null } = {}) {
    const policyState = loadEvolutionPolicy({ ensureExists: true });
    const { candidates: existingCandidates, history: existingHistory } = loadEvolutionCandidates();
    let patternsState = patternsPayload;
    if (!patternsState) {
      try {
        patternsState = conversationMinerService.loadProjectPatterns().payload;
      } catch {
        patternsState = { patterns: [], summary: { recordCount: 0 } };
      }
    }
    let decisionsState;
    try {
      decisionsState = conversationMinerService.loadConversationDecisions();
    } catch {
      decisionsState = { ledger: { decisions: [] }, summary: { total: 0, review: 0, accepted: 0, rejected: 0, promoted: 0, archived: 0 } };
    }
    const generatedAt = new Date().toISOString();
    
    // 构建策略相关的路径对象，供 buildPatternCandidates 使用
    const policyPaths = {
      skillsTarget: paths.skillsTarget || path.join(paths.powerAiRoot, "skills"),
      powerAiRoot: paths.powerAiRoot
    };
    
    // 调用工具函数生成候选项
    const nextCandidates = [
      ...buildPatternCandidates({ patterns: patternsState.patterns || [], decisionLedger: decisionsState.ledger, policy: { ...policyState.normalizedPolicy, paths: policyPaths } }),
      ...buildProfileAdjustmentCandidate({ teamPolicyService, getPowerAiPaths: () => paths })
    ];

    // 合并现有候选项和新生成的候选项
    const existingMap = new Map((existingCandidates.candidates || []).map((item) => [item.candidateId, item]));
    const nextMap = new Map(nextCandidates.map((item) => [item.candidateId, item]));
    const merged = [];
    const nextHistory = {
      schemaVersion: existingHistory.schemaVersion || 1,
      entries: Array.isArray(existingHistory.entries) ? [...existingHistory.entries] : []
    };

    // 处理新生成的候选项（与现有候选项合并）
    for (const candidate of nextCandidates) {
      const existing = existingMap.get(candidate.candidateId);
      const mergedCandidate = existing
        ? normalizeCandidate({ ...existing, ...candidate, status: ["accepted", "rejected", "materialized", "archived"].includes(existing.status) ? existing.status : candidate.status })
        : candidate;
      merged.push(mergedCandidate);

      // 如果候选项有变化，记录到历史
      if (!existing || stableStringify(existing) !== stableStringify(mergedCandidate)) {
        nextHistory.entries.push({ recordedAt: generatedAt, trigger, candidateId: mergedCandidate.candidateId, snapshot: mergedCandidate });
      }
    }

    // 处理不再存在的候选项（归档）
    for (const existing of existingCandidates.candidates || []) {
      if (nextMap.has(existing.candidateId)) continue;
      if (existing.status === "materialized" || existing.status === "archived") {
        merged.push(existing);
        continue;
      }
      const archived = normalizeCandidate({
        ...existing, status: "archived", generatedAt,
        reason: `${existing.reason || "Candidate no longer qualifies."} Auto-archived because it no longer matched the current evolution inputs.`
      });
      merged.push(archived);
      if (stableStringify(existing) !== stableStringify(archived)) {
        nextHistory.entries.push({ recordedAt: generatedAt, trigger: `${trigger}:archived`, candidateId: archived.candidateId, snapshot: archived });
      }
    }

    // 排序并持久化
    merged.sort((left, right) => left.candidateId.localeCompare(right.candidateId, "zh-CN"));
    const payload = { schemaVersion: 1, updatedAt: generatedAt, candidates: merged };
    const summary = summarizeEvolutionCandidates(payload);
    const summaryPayload = {
      generatedAt, packageName: context.packageJson.name, version: context.packageJson.version,
      projectRoot, trigger, summary, candidates: merged,
      recommendedActions: buildEvolutionRecommendedActions(summary),
      candidatesPath: paths.evolutionCandidatesTarget, historyPath: paths.evolutionCandidateHistoryTarget
    };

    persistEvolutionCandidates({ candidatesPayload: payload, historyPayload: nextHistory, summaryPayload });

    return { ...summaryPayload, jsonPath: paths.evolutionSummaryJsonPath, reportPath: paths.evolutionSummaryPath };
  }

  /**
   * 执行进化行动
   * 
   * 根据策略配置，自动执行可执行的候选项对应的行动，
   * 包括：刷新项目本地技能、更新治理上下文、生成治理摘要等。
   * 
   * @param {Object} options - 配置选项
   * @param {string} options.trigger - 触发源
   * @param {boolean} options.dryRun - 是否仅模拟执行
   * @returns {Object} 执行结果对象
   */
  function applyEvolutionActions({ trigger = "manual", dryRun = false } = {}) {
    const policyState = loadEvolutionPolicy({ ensureExists: true });
    const { candidates: candidatePayload } = loadEvolutionCandidates();
    const { payload: existingActions } = loadEvolutionActions();
    const executedAt = new Date().toISOString();
    const nextActions = {
      schemaVersion: existingActions.schemaVersion || 1, updatedAt: executedAt,
      actions: Array.isArray(existingActions.actions) ? [...existingActions.actions] : []
    };
    const runSummary = [];
    let governanceContextResult = null;
    let governanceSummaryResult = null;

    // 筛选可执行的候选项（仅处理项目本地技能草稿）
    const actionableCandidates = (candidatePayload.candidates || [])
      .filter((item) => item.candidateType === "project-local-skill-draft")
      .filter((item) => item.status === "generated" || item.status === "review" || item.status === "materialized");

    // 执行候选项对应的行动
    for (const candidate of actionableCandidates) {
      const patternId = candidate.sourcePatternIds[0] || "";
      const actionRecord = {
        actionId: `refresh-project-local-skill-draft::${candidate.candidateId}::${executedAt}`,
        actionType: "refresh-project-local-skill-draft", status: "skipped", executedAt,
        target: candidate.targetPath, sourceCandidateId: candidate.candidateId,
        sourcePatternIds: candidate.sourcePatternIds, result: {}
      };

      // 检查是否允许自动刷新
      if (!policyState.normalizedPolicy.allowAutoProjectLocalSkillRefresh) {
        actionRecord.result = { reason: "allowAutoProjectLocalSkillRefresh is disabled." };
        nextActions.actions.push(actionRecord);
        runSummary.push(actionRecord);
        continue;
      }

      // 模拟执行模式
      if (dryRun) {
        actionRecord.status = "skipped";
        actionRecord.result = { reason: "dry-run", wouldGeneratePatternId: patternId };
        nextActions.actions.push(actionRecord);
        runSummary.push(actionRecord);
        continue;
      }

      // 实际执行
      try {
        const generated = conversationMinerService.generateProjectSkill({ patternId, force: true });
        if (generated.skipped) {
          actionRecord.status = "skipped";
          actionRecord.result = {
            reason: generated.reason || "project-local draft already up to date",
            skillName: generated.skillName,
            skillRoot: generated.skillRoot,
            writeMode: generated.writeMode || "unchanged"
          };
        } else {
          actionRecord.status = "executed";
          actionRecord.result = {
            skillName: generated.skillName,
            skillRoot: generated.skillRoot,
            writeMode: generated.writeMode || "updated"
          };
        }
        if (candidate.status !== "materialized") {
          updateEvolutionCandidateStatus({ candidateId: candidate.candidateId, nextStatus: "materialized", reasonSuffix: " Auto-materialized into project-local draft.", trigger });
        }
      } catch (error) {
        actionRecord.status = "failed";
        actionRecord.result = { error: error.message };
      }

      nextActions.actions.push(actionRecord);
      runSummary.push(actionRecord);
    }

    // 添加治理上下文刷新行动
    if (policyState.normalizedPolicy.autoRefreshGovernanceContext) {
      const actionRecord = {
        actionId: `refresh-governance-context::${executedAt}`,
        actionType: "refresh-governance-context", status: dryRun ? "skipped" : "executed",
        executedAt, target: governanceContextService.getContextPaths().projectGovernanceContextTarget,
        sourceCandidateId: "", sourcePatternIds: [], result: dryRun ? { reason: "dry-run" } : {}
      };
      nextActions.actions.push(actionRecord);
      runSummary.push(actionRecord);
    }

    // 添加治理摘要刷新行动
    if (policyState.normalizedPolicy.autoRefreshGovernanceSummary) {
      const actionRecord = {
        actionId: `refresh-governance-summary::${executedAt}`,
        actionType: "refresh-governance-summary", status: dryRun ? "skipped" : "executed",
        executedAt, target: path.join(paths.reportsRoot, "governance-summary.md"),
        sourceCandidateId: "", sourcePatternIds: [], result: dryRun ? { reason: "dry-run" } : {}
      };
      nextActions.actions.push(actionRecord);
      runSummary.push(actionRecord);
    }

    // 持久化行动列表
    ensureDir(path.dirname(paths.evolutionActionsTarget));
    writeJson(paths.evolutionActionsTarget, nextActions);

    // 执行治理上下文刷新（如果非模拟模式且策略允许）
    if (!dryRun && policyState.normalizedPolicy.autoRefreshGovernanceContext) {
      governanceContextResult = governanceContextService.refreshProjectGovernanceContext({ trigger: "apply-evolution-actions" });
      const contextAction = runSummary.find((item) => item.actionType === "refresh-governance-context");
      if (contextAction) contextAction.result = { contextPath: governanceContextResult.contextPath };
    }

    // 执行治理摘要生成（如果非模拟模式且策略允许）
    if (!dryRun && policyState.normalizedPolicy.autoRefreshGovernanceSummary) {
      governanceSummaryResult = governanceSummaryService.generateGovernanceSummary();
      const summaryAction = runSummary.find((item) => item.actionType === "refresh-governance-summary");
      if (summaryAction) summaryAction.result = { reportPath: governanceSummaryResult.reportPath };
    }

    // 规范化并更新行动列表
    writeJson(paths.evolutionActionsTarget, { ...nextActions, actions: nextActions.actions.map((item) => normalizeEvolutionAction(item)) });

    return {
      generatedAt: executedAt, packageName: context.packageJson.name,
      version: context.packageJson.version, projectRoot, dryRun,
      summary: summarizeEvolutionActions(nextActions),
      actions: runSummary, actionsPath: paths.evolutionActionsTarget,
      governanceContext: governanceContextResult, governanceSummary: governanceSummaryResult
    };
  }

  return {
    loadEvolutionCandidates,
    loadEvolutionActions,
    persistEvolutionCandidates,
    updateEvolutionCandidateStatus,
    generateEvolutionCandidates,
    applyEvolutionActions
  };
}
