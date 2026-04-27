/**
 * Evolution Service Core 模块
 * 
 * 职责：
 * - 路径管理：获取和维护所有进化相关的文件路径
 * - 策略加载与同步：加载、验证和同步进化策略
 * - 协调逻辑：作为候选项管理器和提案管理器的协调入口
 * 
 * 本模块是进化服务的核心入口，负责：
 * 1. 管理所有进化相关的文件路径配置
 * 2. 加载、验证和同步进化策略
 * 3. 初始化并协调候选项管理器和提案管理器
 * 4. 提供统一的 API 接口供外部调用
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../shared/fs.mjs";
import {
  getDefaultEvolutionPolicy,
  normalizeEvolutionPolicy,
  validateEvolutionPolicyConfig
} from "./policy.mjs";
import { createEvolutionCandidateManager } from "./evolution-candidate-manager.mjs";
import { createEvolutionProposalManager } from "./evolution-proposal-manager.mjs";
import {
  resolveCandidateConfidence,
  buildPatternCandidates,
  buildProfileAdjustmentCandidate,
  buildEvolutionRecommendedActions
} from "./candidate-utils.mjs";

/**
 * 稳定字符串化函数
 * 
 * 用于对象的深度比较，确保相同内容的对象无论键的顺序如何都能得到相同的字符串。
 * 这对于检测候选项和提案的变更非常关键。
 * 
 * @param {any} value - 要字符串化的值
 * @returns {string} 稳定排序的 JSON 字符串
 */
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * 创建进化服务核心实例
 * 
 * 作为整个进化服务的主入口，初始化所有子模块并提供统一的 API。
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.context - 上下文对象（包含 packageJson 信息）
 * @param {string} options.projectRoot - 项目根目录
 * @param {Object} options.workspaceService - 工作区服务对象
 * @param {Object} options.conversationMinerService - 对话挖掘服务
 * @param {Object} options.governanceContextService - 治理上下文服务
 * @param {Object} options.governanceSummaryService - 治理摘要服务
 * @param {Object} options.teamPolicyService - 团队策略服务
 * @returns {Object} 进化服务核心对象
 */
export function createEvolutionServiceCore({
  context,
  projectRoot,
  workspaceService,
  conversationMinerService,
  governanceContextService,
  governanceSummaryService,
  teamPolicyService
}) {
  // ========== 路径管理 ==========
  
  /**
   * 获取所有进化相关的文件路径
   * 
   * 从工作区服务中提取所有路径，并计算报告路径等衍生路径。
   * 
   * @returns {Object} 包含所有进化相关路径的对象
   */
  function getEvolutionPaths() {
    const {
      powerAiRoot,
      evolutionPolicyTarget,
      evolutionCandidatesTarget,
      evolutionCandidateHistoryTarget,
      evolutionActionsTarget,
      evolutionProposalsTarget,
      evolutionProposalHistoryTarget
    } = workspaceService.getPowerAiPaths();
    const reportsRoot = workspaceService.getReportsRoot();
    return {
      powerAiRoot,
      reportsRoot,
      evolutionPolicyTarget,
      evolutionCandidatesTarget,
      evolutionCandidateHistoryTarget,
      evolutionActionsTarget,
      evolutionProposalsTarget,
      evolutionProposalHistoryTarget,
      evolutionReportJsonPath: path.join(reportsRoot, "evolution-cycle-report.json"),
      evolutionReportPath: path.join(reportsRoot, "evolution-cycle-report.md"),
      evolutionSummaryJsonPath: path.join(reportsRoot, "evolution-summary.json"),
      evolutionSummaryPath: path.join(reportsRoot, "evolution-summary.md"),
      evolutionProposalReportJsonPath: path.join(reportsRoot, "evolution-proposals.json"),
      evolutionProposalReportPath: path.join(reportsRoot, "evolution-proposals.md"),
      evolutionProposalsRoot: path.join(powerAiRoot, "proposals", "evolution")
    };
  }

  // ========== 策略管理 ==========
  
  /**
   * 加载进化策略
   * 
   * 从文件系统读取策略配置，如果不存在则使用默认配置。
   * 返回原始策略、规范化后的策略和验证结果。
   * 
   * @param {Object} options - 配置选项
   * @param {boolean} options.ensureExists - 如果为 true 且策略文件不存在，则创建默认策略文件
   * @returns {Object} 包含策略信息的对象
   */
  function loadEvolutionPolicy({ ensureExists = false } = {}) {
    const { powerAiRoot, evolutionPolicyTarget } = getEvolutionPaths();
    const exists = fs.existsSync(evolutionPolicyTarget);
    if (!exists && ensureExists) {
      ensureDir(powerAiRoot);
      writeJson(evolutionPolicyTarget, getDefaultEvolutionPolicy());
    }
    const rawPolicy = fs.existsSync(evolutionPolicyTarget)
      ? JSON.parse(fs.readFileSync(evolutionPolicyTarget, "utf8"))
      : getDefaultEvolutionPolicy();
    return {
      policyPath: evolutionPolicyTarget,
      exists: fs.existsSync(evolutionPolicyTarget),
      source: fs.existsSync(evolutionPolicyTarget) ? "project" : "default",
      rawPolicy,
      normalizedPolicy: normalizeEvolutionPolicy(rawPolicy),
      validation: validateEvolutionPolicyConfig(rawPolicy)
    };
  }

  /**
   * 同步进化策略
   * 
   * 将当前策略规范化后写回文件系统，确保策略配置的一致性。
   * 
   * @param {Object} options - 配置选项
   * @param {string} options.trigger - 触发源
   * @returns {Object} 同步结果对象
   */
  function syncEvolutionPolicy({ trigger = "sync" } = {}) {
    const { powerAiRoot, evolutionPolicyTarget } = getEvolutionPaths();
    const current = loadEvolutionPolicy();
    ensureDir(powerAiRoot);
    writeJson(evolutionPolicyTarget, current.normalizedPolicy);
    return {
      generatedAt: new Date().toISOString(),
      trigger,
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      policyPath: evolutionPolicyTarget,
      existed: current.exists,
      changed: JSON.stringify(current.rawPolicy) !== JSON.stringify(current.normalizedPolicy),
      policy: current.normalizedPolicy,
      validation: validateEvolutionPolicyConfig(current.normalizedPolicy)
    };
  }

  /**
   * 显示进化策略
   * 
   * 返回当前策略的完整信息，包括默认值和验证结果。
   * 
   * @returns {Object} 策略展示对象
   */
  function showEvolutionPolicy() {
    const current = loadEvolutionPolicy({ ensureExists: true });
    return {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      policyPath: current.policyPath,
      exists: current.exists,
      source: current.source,
      policy: current.normalizedPolicy,
      defaults: getDefaultEvolutionPolicy(),
      validation: current.validation
    };
  }

  /**
   * 验证进化策略
   * 
   * 检查当前策略配置的有效性并返回验证结果。
   * 
   * @returns {Object} 验证结果对象
   */
  function validateEvolutionPolicy() {
    const current = loadEvolutionPolicy({ ensureExists: true });
    return {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      policyPath: current.policyPath,
      exists: current.exists,
      source: current.source,
      ...current.validation
    };
  }

  // ========== 子模块初始化 ==========
  
  // 获取进化路径供子模块使用
  const paths = getEvolutionPaths();

  // 创建候选项管理器
  const candidateManager = createEvolutionCandidateManager({
    context,
    projectRoot,
    paths,
    conversationMinerService,
    governanceContextService,
    governanceSummaryService,
    teamPolicyService,
    loadEvolutionPolicy,
    stableStringify
  });

  // 创建提案管理器
  const proposalManager = createEvolutionProposalManager({
    context,
    projectRoot,
    paths,
    teamPolicyService,
    loadEvolutionCandidates: candidateManager.loadEvolutionCandidates,
    stableStringify
  });

  // ========== 统一 API 导出 ==========
  
  return {
    // 路径管理
    getEvolutionPaths,
    
    // 策略管理
    loadEvolutionPolicy,
    syncEvolutionPolicy,
    showEvolutionPolicy,
    validateEvolutionPolicy,
    
    // 候选项管理（来自 candidateManager）
    loadEvolutionCandidates: candidateManager.loadEvolutionCandidates,
    loadEvolutionActions: candidateManager.loadEvolutionActions,
    generateEvolutionCandidates: candidateManager.generateEvolutionCandidates,
    applyEvolutionActions: candidateManager.applyEvolutionActions,
    updateEvolutionCandidateStatus: candidateManager.updateEvolutionCandidateStatus,
    
    // 提案管理（来自 proposalManager）
    loadEvolutionProposals: proposalManager.loadEvolutionProposals,
    generateEvolutionProposals: proposalManager.generateEvolutionProposals,
    listEvolutionProposals: proposalManager.listEvolutionProposals,
    listEvolutionDrafts: proposalManager.listEvolutionDrafts,
    showEvolutionDraft: proposalManager.showEvolutionDraft,
    reviewEvolutionProposal: proposalManager.reviewEvolutionProposal,
    applyEvolutionProposal: proposalManager.applyEvolutionProposal,
    
    // 候选项工具函数（供外部测试和扩展使用）
    resolveCandidateConfidence,
    buildPatternCandidates,
    buildProfileAdjustmentCandidate,
    buildEvolutionRecommendedActions
  };
}
