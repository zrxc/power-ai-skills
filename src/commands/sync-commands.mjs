/**
 * 同步和扫描相关命令模块
 * 职责：处理项目同步、扫描、本地技能管理、工具管理等命令
 * 涉及功能：
 *   - 项目同步（sync）
 *   - 项目扫描（scan、diff-scan）
 *   - 本地技能生成、列表、提升
 *   - 项目模式审查
 *   - 添加工具/移除工具
 *   - 清理报告
 */

import {
  formatAddToolMessage,
  formatDiffProjectScanMessage,
  formatGenerateProjectLocalSkillsMessage,
  formatListProjectLocalSkillsMessage,
  formatPlanProjectLocalPromotionsMessage,
  formatPromoteProjectLocalSkillMessage,
  formatRemoveToolMessage,
  formatReviewProjectPatternMessage,
  formatScanProjectMessage,
  formatSyncedProjectMessage,
  formatCleanReportsMessage
} from "./project-output.mjs";
import {
  createAddToolSelection,
  createRemoveToolSelection,
  ensureRequestedTools,
  resolveRequestedToolSelection,
  syncToolEntrypointSelection
} from "./project-tool-selection.mjs";

/**
 * 创建同步和扫描命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.workspaceService - 工作空间服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @param {Object} params.evolutionService - 进化服务
 * @param {Object} params.projectScanService - 项目扫描服务
 * @param {Object} params.teamPolicyService - 团队策略服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {string} params.projectRoot - 项目根目录
 * @returns {Object} 同步和扫描命令对象
 */
export function createSyncCommands({
  cliArgs,
  selectionService,
  workspaceService,
  conversationMinerService,
  evolutionService,
  projectScanService,
  teamPolicyService,
  governanceContextService,
  projectRoot
}) {
  /**
   * 获取单个选项值
   * @param {string} optionName - 选项名称
   * @param {string} fallback - 默认值
   * @returns {string} 选项值
   */
  function getSingleOption(optionName, fallback = "") {
    return (selectionService.getOptionValues(optionName) || [])[0] || fallback;
  }

  /**
   * 获取单个选项值（支持位置参数）
   * @param {string} optionName - 选项名称
   * @param {string} fallback - 默认值
   * @returns {string} 选项值
   */
  function getSingleOptionOrPositional(optionName, fallback = "") {
    return getSingleOption(optionName, cliArgs.positionals[0] || fallback);
  }

  /**
   * 获取数值型选项
   * @param {string} optionName - 选项名称
   * @returns {number} 数值
   */
  function getNumericOption(optionName) {
    return Number(getSingleOption(optionName, 0));
  }

  /**
   * 判断是否应重新生成本地技能
   * @returns {boolean}
   */
  function shouldRegenerateProjectLocal() {
    return selectionService.hasFlag("--regenerate-project-local");
  }

  /**
   * 获取要提升的技能名称
   * @returns {string}
   */
  function getPromoteSkillName() {
    return getSingleOptionOrPositional("--skill");
  }

  /**
   * 获取模式ID
   * @returns {string}
   */
  function getPatternId() {
    return getSingleOptionOrPositional("--pattern");
  }

  /**
   * 刷新治理上下文
   * @param {string} trigger - 触发器
   * @param {Object} [options] - 选项
   * @param {string} [options.baselineStatus] - 基线状态
   */
  function refreshGovernanceContext(trigger, { baselineStatus = "" } = {}) {
    return governanceContextService?.refreshProjectGovernanceContext({
      trigger,
      baselineStatus
    });
  }

  /**
   * JSON 输出辅助函数
   */
  function printJson(payload) {
    console.log(JSON.stringify(payload, null, 2));
  }

  function printJsonAndExit(payload) {
    if (!selectionService.hasFlag("--json")) return false;
    printJson(payload);
    return true;
  }

  /**
   * 同步命令 - 同步项目结构和配置
   * 保持项目结构与当前选择一致
   */
  function syncCommand() {
    const selection = selectionService.resolveSelection();
    workspaceService.syncProjectStructure(selection, { syncSkills: true });
    conversationMinerService.ensureConversationRoots();
    evolutionService.syncEvolutionPolicy({ trigger: "sync" });
    teamPolicyService.syncProjectProfileDecision({
      selection,
      trigger: "sync"
    });
    refreshGovernanceContext("sync");
    console.log(formatSyncedProjectMessage({
      projectRoot,
      selectionSummary: selectionService.getSelectionSummary(selection)
    }));
  }

  /**
   * 扫描项目命令 - 执行项目分析并写入结果
   */
  function scanProjectCommand() {
    const result = projectScanService.writeProjectAnalysis();
    console.log(formatScanProjectMessage({ projectRoot, result }));
  }

  /**
   * 差异扫描命令 - 加载并显示分析制品的差异
   */
  function diffProjectScanCommand() {
    const result = projectScanService.loadAnalysisArtifacts();
    console.log(formatDiffProjectScanMessage({ projectRoot, result }));
  }

  /**
   * 生成本地技能命令 - 基于项目扫描结果生成项目本地技能
   */
  function generateProjectLocalSkillsCommand() {
    const result = projectScanService.generateProjectLocalSkills({
      regenerate: shouldRegenerateProjectLocal()
    });
    console.log(formatGenerateProjectLocalSkillsMessage({ projectRoot, result }));
  }

  /**
   * 列出本地技能命令 - 显示项目本地技能列表
   */
  function listProjectLocalSkillsCommand() {
    const result = projectScanService.listProjectLocalSkills();
    console.log(formatListProjectLocalSkillsMessage({ projectRoot, result }));
  }

  /**
   * 提升本地技能命令 - 将项目本地技能提升为全局技能
   * 需要指定技能名称，支持 --force 强制提升
   */
  function planProjectLocalPromotionsCommand() {
    const result = projectScanService.planProjectLocalPromotions({
      skillName: getPromoteSkillName()
    });
    if (printJsonAndExit(result)) return;
    console.log(formatPlanProjectLocalPromotionsMessage({ projectRoot, result }));
  }

  function promoteProjectLocalSkillCommand() {
    const skillName = getPromoteSkillName();
    const result = projectScanService.promoteProjectLocalSkill({
      skillName,
      force: selectionService.hasFlag("--force")
    });
    console.log(formatPromoteProjectLocalSkillMessage(result));
  }

  /**
   * 审查项目模式命令 - 审查项目中的模式
   * 支持决策（accept/reject）、注释和清除操作
   */
  function reviewProjectPatternCommand() {
    const result = projectScanService.reviewProjectPattern({
      patternId: getPatternId(),
      decision: getSingleOption("--decision"),
      note: getSingleOption("--note"),
      clear: selectionService.hasFlag("--clear")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatReviewProjectPatternMessage(result));
  }

  /**
   * 添加工具命令
   * 将新工具添加到项目配置中
   */
  function addToolCommand() {
    const requestedSelection = resolveRequestedToolSelection(selectionService);
    ensureRequestedTools(requestedSelection, "add-tool");
    const selection = createAddToolSelection({ selectionService, requestedSelection });

    const requestedPolicyEvaluation = teamPolicyService.assertSelectionAllowed({
      toolNames: selection.selectedTools,
      projectProfileName: selection.selectedProjectProfile,
      commandName: "add-tool"
    });
    for (const warning of requestedPolicyEvaluation.warnings) {
      console.log(`[power-ai-skills] ${warning}`);
    }

    syncToolEntrypointSelection({ workspaceService, conversationMinerService, selection });
    teamPolicyService.syncProjectProfileDecision({
      selection,
      trigger: "add-tool"
    });
    refreshGovernanceContext("add-tool");
    console.log(formatAddToolMessage({
      requestedSelection,
      selectionSummary: selectionService.getSelectionSummary(selection)
    }));
  }

  /**
   * 移除工具命令
   * 从项目配置中移除指定的工具
   */
  function removeToolCommand() {
    const requestedSelection = resolveRequestedToolSelection(selectionService);
    ensureRequestedTools(requestedSelection, "remove-tool");
    const selection = createRemoveToolSelection({ selectionService, requestedSelection });

    syncToolEntrypointSelection({ workspaceService, conversationMinerService, selection });
    workspaceService.removeEntrypointsForTools(requestedSelection.selectedTools);
    teamPolicyService.syncProjectProfileDecision({
      selection,
      trigger: "remove-tool"
    });
    refreshGovernanceContext("remove-tool");
    console.log(formatRemoveToolMessage({
      requestedSelection,
      selectionSummary: selectionService.getSelectionSummary(selection)
    }));
  }

  /**
   * 清理报告命令 - 清理项目中的报告文件
   */
  function cleanReportsCommand() {
    const result = workspaceService.cleanReports();
    console.log(formatCleanReportsMessage(result));
  }

  return {
    syncCommand,
    scanProjectCommand,
    diffProjectScanCommand,
    generateProjectLocalSkillsCommand,
    listProjectLocalSkillsCommand,
    planProjectLocalPromotionsCommand,
    promoteProjectLocalSkillCommand,
    reviewProjectPatternCommand,
    addToolCommand,
    removeToolCommand,
    cleanReportsCommand
  };
}
