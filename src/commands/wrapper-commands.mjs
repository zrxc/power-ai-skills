/**
 * 包装器晋升命令模块
 * 职责：处理包装器晋升的脚手架、列表、时间线、审计、治理、审查、实现、应用、完成、注册、归档、恢复
 * 包含：
 *   - 脚手架（scaffoldWrapperPromotionCommand）
 *   - 列表（listWrapperPromotionsCommand）
 *   - 时间线（showWrapperPromotionTimelineCommand）
 *   - 审计（generateWrapperPromotionAuditCommand）
 *   - 治理（generateWrapperRegistryGovernanceCommand）
 *   - 审查（reviewWrapperPromotionCommand）
 *   - 实现（materializeWrapperPromotionCommand）
 *   - 应用（applyWrapperPromotionCommand）
 *   - 完成（finalizeWrapperPromotionCommand）
 *   - 注册（registerWrapperPromotionCommand）
 *   - 归档（archiveWrapperPromotionCommand）
 *   - 恢复（restoreWrapperPromotionCommand）
 */

import {
  formatApplyWrapperPromotionMessage,
  formatArchiveWrapperPromotionMessage,
  formatFinalizeWrapperPromotionMessage,
  formatGenerateWrapperPromotionAuditMessage,
  formatGenerateWrapperRegistryGovernanceMessage,
  formatListWrapperPromotionsMessage,
  formatMaterializeWrapperPromotionMessage,
  formatRegisterWrapperPromotionMessage,
  formatRestoreWrapperPromotionMessage,
  formatReviewWrapperPromotionMessage,
  formatScaffoldWrapperPromotionMessage,
  formatShowWrapperPromotionTimelineMessage
} from "./project-output.mjs";

/**
 * 创建包装器晋升命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {string} params.projectRoot - 项目根目录
 * @returns {Object} 包装器晋升命令对象
 */
export function createWrapperCommands({
  cliArgs,
  selectionService,
  conversationMinerService,
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
   * JSON 输出辅助函数
   */
  function printJsonAndExit(payload) {
    if (!selectionService.hasFlag("--json")) return false;
    console.log(JSON.stringify(payload, null, 2));
    return true;
  }

  /**
   * 获取包装器工具名称
   * @returns {string}
   */
  function getWrapperPromotionToolName() {
    return getSingleOptionOrPositional("--tool");
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
   * 脚手架包装器晋升命令 - 创建包装器晋升脚手架
   */
  function scaffoldWrapperPromotionCommand() {
    const result = conversationMinerService.scaffoldWrapperPromotion({
      toolName: getSingleOptionOrPositional("--tool"),
      displayName: getSingleOption("--display-name"),
      integrationStyle: getSingleOption("--style", "terminal"),
      force: selectionService.hasFlag("--force"),
      patternId: getSingleOption("--pattern")
    });
    refreshGovernanceContext("scaffold-wrapper-promotion");
    if (printJsonAndExit(result)) return;
    console.log(formatScaffoldWrapperPromotionMessage(result));
  }

  /**
   * 列出包装器晋升命令
   */
  function listWrapperPromotionsCommand() {
    const result = conversationMinerService.listWrapperPromotions({
      includeArchived: selectionService.hasFlag("--archived")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatListWrapperPromotionsMessage({ projectRoot, result }));
  }

  /**
   * 显示包装器晋升时间线命令
   */
  function showWrapperPromotionTimelineCommand() {
    const result = conversationMinerService.getWrapperPromotionTimeline({
      toolName: getWrapperPromotionToolName()
    });
    if (printJsonAndExit(result)) return;
    console.log(formatShowWrapperPromotionTimelineMessage(result));
  }

  /**
   * 生成包装器晋升审计报告命令
   */
  function generateWrapperPromotionAuditCommand() {
    const result = conversationMinerService.generateWrapperPromotionAuditReport({
      filter: getSingleOption("--filter"),
      sort: getSingleOption("--sort"),
      fields: getSingleOption("--fields"),
      format: getSingleOption("--format"),
      output: getSingleOption("--output")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatGenerateWrapperPromotionAuditMessage(result));
  }

  /**
   * 生成包装器注册治理视图命令
   */
  function generateWrapperRegistryGovernanceCommand() {
    const result = conversationMinerService.generateWrapperRegistryGovernanceView({
      staleDays: getSingleOption("--stale-days", "14")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatGenerateWrapperRegistryGovernanceMessage(result));
  }

  /**
   * 审查包装器晋升命令
   */
  function reviewWrapperPromotionCommand() {
    const result = conversationMinerService.reviewWrapperPromotion({
      toolName: getWrapperPromotionToolName(),
      status: getSingleOption("--status"),
      note: getSingleOption("--note")
    });
    refreshGovernanceContext("review-wrapper-promotion");
    if (printJsonAndExit(result)) return;
    console.log(formatReviewWrapperPromotionMessage(result));
  }

  /**
   * 实现包装器晋升命令
   */
  function materializeWrapperPromotionCommand() {
    const result = conversationMinerService.materializeWrapperPromotion({
      toolName: getWrapperPromotionToolName(),
      force: selectionService.hasFlag("--force")
    });
    refreshGovernanceContext("materialize-wrapper-promotion");
    if (printJsonAndExit(result)) return;
    console.log(formatMaterializeWrapperPromotionMessage(result));
  }

  /**
   * 应用包装器晋升命令
   */
  function applyWrapperPromotionCommand() {
    const result = conversationMinerService.applyWrapperPromotion({
      toolName: getWrapperPromotionToolName(),
      force: selectionService.hasFlag("--force"),
      dryRun: selectionService.hasFlag("--dry-run")
    });
    if (!result.dryRun) refreshGovernanceContext("apply-wrapper-promotion");
    if (printJsonAndExit(result)) return;
    console.log(formatApplyWrapperPromotionMessage(result));
  }

  /**
   * 完成包装器晋升命令
   */
  function finalizeWrapperPromotionCommand() {
    const result = conversationMinerService.finalizeWrapperPromotion({
      toolName: getWrapperPromotionToolName(),
      note: getSingleOption("--note")
    });
    refreshGovernanceContext("finalize-wrapper-promotion");
    if (printJsonAndExit(result)) return;
    console.log(formatFinalizeWrapperPromotionMessage(result));
  }

  /**
   * 注册包装器晋升命令
   */
  function registerWrapperPromotionCommand() {
    const result = conversationMinerService.registerWrapperPromotion({
      toolName: getWrapperPromotionToolName(),
      note: getSingleOption("--note")
    });
    refreshGovernanceContext("register-wrapper-promotion");
    if (printJsonAndExit(result)) return;
    console.log(formatRegisterWrapperPromotionMessage(result));
  }

  /**
   * 归档包装器晋升命令
   */
  function archiveWrapperPromotionCommand() {
    const result = conversationMinerService.archiveWrapperPromotion({
      toolName: getWrapperPromotionToolName(),
      note: getSingleOption("--note")
    });
    refreshGovernanceContext("archive-wrapper-promotion");
    if (printJsonAndExit(result)) return;
    console.log(formatArchiveWrapperPromotionMessage(result));
  }

  /**
   * 恢复包装器晋升命令
   */
  function restoreWrapperPromotionCommand() {
    const result = conversationMinerService.restoreWrapperPromotion({
      toolName: getWrapperPromotionToolName(),
      note: getSingleOption("--note")
    });
    refreshGovernanceContext("restore-wrapper-promotion");
    if (printJsonAndExit(result)) return;
    console.log(formatRestoreWrapperPromotionMessage(result));
  }

  return {
    scaffoldWrapperPromotionCommand,
    listWrapperPromotionsCommand,
    showWrapperPromotionTimelineCommand,
    generateWrapperPromotionAuditCommand,
    generateWrapperRegistryGovernanceCommand,
    reviewWrapperPromotionCommand,
    materializeWrapperPromotionCommand,
    applyWrapperPromotionCommand,
    finalizeWrapperPromotionCommand,
    registerWrapperPromotionCommand,
    archiveWrapperPromotionCommand,
    restoreWrapperPromotionCommand,
    // 导出内部辅助函数供主入口使用
    getWrapperPromotionToolName
  };
}
