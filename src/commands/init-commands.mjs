/**
 * 初始化相关命令模块
 * 职责：处理项目初始化相关的命令
 * 涉及功能：
 *   - 项目初始化（init）
 *   - 项目扫描（project-scan-only 模式）
 *   - 初始化工具选择和工作空间同步
 *   - 初始化进化策略同步
 */

import {
  formatInitScanSuffix,
  formatInitializedProjectMessage,
  formatProjectScanOnlyMessage
} from "./project-output.mjs";

/**
 * 创建初始化命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.workspaceService - 工作空间服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @param {Object} params.evolutionService - 进化服务
 * @param {Object} params.projectScanService - 项目扫描服务
 * @param {Object} params.teamPolicyService - 团队策略服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {string} params.projectRoot - 项目根目录
 * @returns {Object} 初始化命令对象
 */
export function createInitCommands({
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
   * 判断是否应运行项目扫描
   * @returns {boolean}
   */
  function shouldRunProjectScan() {
    return !selectionService.hasFlag("--no-project-scan");
  }

  /**
   * 判断是否应重新生成本地技能
   * @returns {boolean}
   */
  function shouldRegenerateProjectLocal() {
    return selectionService.hasFlag("--regenerate-project-local");
  }

  /**
   * 运行项目扫描管道
   * @returns {Object} 扫描和生成结果
   */
  function runProjectScanPipeline() {
    return projectScanService.runProjectScanPipeline({
      regenerate: shouldRegenerateProjectLocal()
    });
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
   * 初始化命令 - 项目初始化主入口
   * 支持两种模式：
   *   1. --project-scan-only: 仅执行扫描和生成本地技能
   *   2. 标准模式: 初始化完整项目结构
   */
  async function initCommand() {
    // 模式1：仅执行项目扫描
    if (selectionService.hasFlag("--project-scan-only")) {
      const { scanResult, generationResult } = runProjectScanPipeline();
      console.log(formatProjectScanOnlyMessage({ projectRoot, scanResult, generationResult }));
      return;
    }

    // 模式2：标准初始化流程
    const shouldPrompt =
      !selectionService.hasExplicitSelectionInput() &&
      !selectionService.hasFlag("--yes") &&
      process.stdin.isTTY &&
      process.stdout.isTTY;

    const selection = shouldPrompt
      ? await selectionService.promptInitSelection()
      : selectionService.resolveSelection();

    // 策略合规检查
    const policyEvaluation = teamPolicyService.assertSelectionAllowed({
      toolNames: selection.selectedTools,
      projectProfileName: selection.selectedProjectProfile,
      commandName: "init"
    });
    for (const warning of policyEvaluation.warnings) {
      console.log(`[power-ai-skills] ${warning}`);
    }

    // 同步项目结构和对话根目录
    workspaceService.syncProjectStructure(selection, { syncSkills: true });
    conversationMinerService.ensureConversationRoots();

    // 同步进化策略
    evolutionService.syncEvolutionPolicy({ trigger: "init" });

    // 执行项目扫描（如果启用）
    let scanSummary = "";
    if (shouldRunProjectScan()) {
      const { scanResult, generationResult } = runProjectScanPipeline();
      scanSummary = formatInitScanSuffix({ scanResult, generationResult });
    }

    // 同步项目配置决策
    teamPolicyService.syncProjectProfileDecision({
      selection,
      trigger: "init"
    });

    // 刷新治理上下文
    refreshGovernanceContext("init");

    console.log(formatInitializedProjectMessage({
      projectRoot,
      selectionSummary: selectionService.getSelectionSummary(selection),
      scanSummary
    }));
  }

  return {
    initCommand
  };
}
