/**
 * 报告相关命令模块
 * 职责：处理各种报告生成和展示相关的命令
 * 涉及功能：
 *   - 升级摘要报告
 *   - 治理摘要报告
 *   - 治理历史记录
 */

import {
  formatGenerateUpgradeSummaryMessage,
  formatPlanReleasePublishMessage,
  formatPlanReleaseOrchestrationMessage,
  formatAuthorizeReleaseUnattendedGovernanceMessage,
  formatPlanReleaseUnattendedGovernanceMessage,
  formatExecuteReleaseOrchestrationMessage,
  formatExecuteReleasePublishMessage,
  formatExecuteReleaseUnattendedGovernanceMessage,
  formatGenerateGovernanceSummaryMessage,
  formatShowGovernanceHistoryMessage
} from "./project-output.mjs";

/**
 * 创建报告命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.upgradeSummaryService - 升级摘要服务
 * @param {Object} params.releasePublishPlannerService - 发布规划服务
 * @param {Object} params.releaseOrchestrationPlannerService - 发布编排规划服务
 * @param {Object} params.releasePublishExecutorService - 发布执行服务
 * @param {Object} params.releaseOrchestrationExecutorService - 发布编排执行服务
 * @param {Object} params.releaseUnattendedAuthorizationService - 无人值守治理授权服务
 * @param {Object} params.releaseUnattendedGovernancePlannerService - 无人值守治理规划服务
 * @param {Object} params.governanceSummaryService - 治理摘要服务
 * @param {Object} params.governanceHistoryService - 治理历史服务
 * @returns {Object} 报告命令对象
 */
export function createReportCommands({
  cliArgs,
  selectionService,
  upgradeSummaryService,
  releasePublishPlannerService,
  releaseOrchestrationPlannerService,
  releasePublishExecutorService,
  releaseOrchestrationExecutorService,
  releaseUnattendedAuthorizationService,
  releaseUnattendedGovernancePlannerService,
  releaseUnattendedGovernanceExecutorService,
  governanceSummaryService,
  governanceHistoryService
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
   * 获取数值型选项
   * @param {string} optionName - 选项名称
   * @returns {number} 数值
   */
  function getNumericOption(optionName) {
    return Number(getSingleOption(optionName, 0));
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
   * 生成升级摘要命令 - 显示项目升级相关的变更信息
   */
  function generateUpgradeSummaryCommand() {
    const result = upgradeSummaryService.generateUpgradeSummary();
    if (printJsonAndExit(result)) return;
    console.log(formatGenerateUpgradeSummaryMessage(result));
  }

  /**
   * 发布计划命令 - 评估当前版本是否具备手动发布资格
   */
  function planReleasePublishCommand() {
    const result = releasePublishPlannerService.planReleasePublish();
    if (printJsonAndExit(result)) return;
    console.log(formatPlanReleasePublishMessage(result));
  }

  function planReleaseOrchestrationCommand() {
    const result = releaseOrchestrationPlannerService.planReleaseOrchestration();
    if (printJsonAndExit(result)) return;
    console.log(formatPlanReleaseOrchestrationMessage(result));
  }

  function authorizeReleaseUnattendedGovernanceCommand() {
    const result = releaseUnattendedAuthorizationService.authorizeReleaseUnattendedGovernance({
      actorId: getSingleOption("--authorized-by"),
      actorName: getSingleOption("--display-name"),
      reason: getSingleOption("--reason"),
      expiresAt: getSingleOption("--expires-at"),
      maxExecutionCount: getNumericOption("--max-execution-count") || 1
    });
    if (printJsonAndExit(result)) return;
    console.log(formatAuthorizeReleaseUnattendedGovernanceMessage(result));
  }

  function planReleaseUnattendedGovernanceCommand() {
    const result = releaseUnattendedGovernancePlannerService.planReleaseUnattendedGovernance();
    if (printJsonAndExit(result)) return;
    console.log(formatPlanReleaseUnattendedGovernanceMessage(result));
  }

  function executeReleaseOrchestrationCommand() {
    const result = releaseOrchestrationExecutorService.executeReleaseOrchestration();
    if (printJsonAndExit(result)) return;
    console.log(formatExecuteReleaseOrchestrationMessage(result));
  }

  /**
   * 受控执行发布命令骨架 - 执行前必须重新做资格判定和确认闸口
   */
  function executeReleasePublishCommand() {
    const result = releasePublishExecutorService.executeReleasePublish({
      confirm: selectionService.hasFlag("--confirm") || selectionService.hasFlag("--yes"),
      acknowledgeWarnings: selectionService.hasFlag("--acknowledge-warnings")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatExecuteReleasePublishMessage(result));
  }

  function executeReleaseUnattendedGovernanceCommand() {
    const result = releaseUnattendedGovernanceExecutorService.executeReleaseUnattendedGovernance();
    if (printJsonAndExit(result)) return;
    console.log(formatExecuteReleaseUnattendedGovernanceMessage(result));
  }

  /**
   * 生成治理摘要命令 - 汇总项目治理状态信息
   */
  function generateGovernanceSummaryCommand() {
    const result = governanceSummaryService.generateGovernanceSummary();
    if (printJsonAndExit(result)) return;
    console.log(formatGenerateGovernanceSummaryMessage(result));
  }

  /**
   * 显示治理历史命令 - 展示治理操作历史记录
   * 支持按类型过滤和数量限制
   */
  function showGovernanceHistoryCommand() {
    const result = governanceHistoryService.showGovernanceHistory({
      type: getSingleOption("--type"),
      limit: getNumericOption("--limit")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatShowGovernanceHistoryMessage(result));
  }

  return {
    generateUpgradeSummaryCommand,
    planReleasePublishCommand,
    planReleaseOrchestrationCommand,
    authorizeReleaseUnattendedGovernanceCommand,
    planReleaseUnattendedGovernanceCommand,
    executeReleaseOrchestrationCommand,
    executeReleasePublishCommand,
    executeReleaseUnattendedGovernanceCommand,
    generateGovernanceSummaryCommand,
    showGovernanceHistoryCommand
  };
}
