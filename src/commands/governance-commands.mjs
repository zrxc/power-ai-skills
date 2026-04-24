/**
 * 治理相关命令模块
 * 职责：处理项目治理相关的命令，包括基线检查、团队策略、项目配置审查等
 * 涉及功能：
 *   - 项目基线检查
 *   - 团队策略展示、验证、漂移检查
 *   - 治理审查截止日期检查
 *   - 项目配置决策展示和审查
 *   - 项目治理上下文展示
 *   - 晋升追踪展示
 *   - 对话挖掘策略生成
 */

import {
  formatCheckAutoCaptureRuntimeMessage,
  formatCheckCaptureRetentionMessage,
  formatCheckProjectBaselineMessage,
  formatCheckGovernanceReviewDeadlinesMessage,
  formatApplyCaptureRetentionMessage,
  formatCheckTeamPolicyDriftMessage,
  formatShowAutoCaptureBridgeContractMessage,
  formatShowCaptureSafetyPolicyMessage,
  formatShowTeamPolicyMessage,
  formatValidateCaptureSafetyPolicyMessage,
  formatValidateTeamPolicyMessage,
  formatShowProjectProfileDecisionMessage,
  formatReviewProjectProfileMessage,
  formatShowProjectGovernanceContextMessage,
  formatShowPromotionTraceMessage,
  formatGenerateConversationMinerStrategyMessage
} from "./project-output.mjs";

/**
 * 创建治理命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.projectBaselineService - 项目基线服务
 * @param {Object} params.teamPolicyService - 团队策略服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {Object} params.promotionTraceService - 晋升追踪服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @returns {Object} 治理命令对象
 */
export function createGovernanceCommands({
  cliArgs,
  selectionService,
  projectBaselineService,
  teamPolicyService,
  governanceContextService,
  promotionTraceService,
  conversationMinerService
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
   * 检查项目基线命令
   */
  function checkProjectBaselineCommand() {
    const result = projectBaselineService.checkProjectBaseline();
    refreshGovernanceContext("check-project-baseline", { baselineStatus: result.status });
    if (printJsonAndExit(result)) return;
    console.log(formatCheckProjectBaselineMessage(result));
  }

  /**
   * 检查自动采集 runtime 健康状态
   */
  function checkAutoCaptureRuntimeCommand() {
    const result = conversationMinerService.checkAutoCaptureRuntime({
      staleMinutes: getNumericOption("--stale-minutes")
    });
    refreshGovernanceContext("check-auto-capture-runtime");
    if (printJsonAndExit(result)) return;
    console.log(formatCheckAutoCaptureRuntimeMessage(result));
  }

  function showAutoCaptureBridgeContractCommand() {
    const result = conversationMinerService.showAutoCaptureBridgeContract({});
    refreshGovernanceContext("show-auto-capture-bridge-contract");
    if (printJsonAndExit(result)) return;
    console.log(formatShowAutoCaptureBridgeContractMessage(result));
  }

  function showCaptureSafetyPolicyCommand() {
    const result = conversationMinerService.showCaptureSafetyPolicy({});
    refreshGovernanceContext("show-capture-safety-policy");
    if (printJsonAndExit(result)) return;
    console.log(formatShowCaptureSafetyPolicyMessage(result));
  }

  function validateCaptureSafetyPolicyCommand() {
    const result = conversationMinerService.validateCaptureSafetyPolicy({});
    if (printJsonAndExit(result)) return;
    console.log(formatValidateCaptureSafetyPolicyMessage(result));
  }

  function checkCaptureRetentionCommand() {
    const result = conversationMinerService.checkCaptureRetention({});
    refreshGovernanceContext("check-capture-retention");
    if (printJsonAndExit(result)) return;
    console.log(formatCheckCaptureRetentionMessage(result));
  }

  function applyCaptureRetentionCommand() {
    const result = conversationMinerService.applyCaptureRetention({
      dryRun: selectionService.hasFlag("--dry-run")
    });
    refreshGovernanceContext("apply-capture-retention");
    if (printJsonAndExit(result)) return;
    console.log(formatApplyCaptureRetentionMessage(result));
  }

  /**
   * 显示团队策略命令
   */
  function showTeamPolicyCommand() {
    const result = teamPolicyService.showTeamPolicy();
    if (printJsonAndExit(result)) return;
    console.log(formatShowTeamPolicyMessage(result));
  }

  /**
   * 验证团队策略命令
   */
  function validateTeamPolicyCommand() {
    const result = teamPolicyService.validateTeamPolicy();
    if (printJsonAndExit(result)) return;
    console.log(formatValidateTeamPolicyMessage(result));
  }

  /**
   * 检查团队策略漂移命令
   */
  function checkTeamPolicyDriftCommand() {
    const result = teamPolicyService.checkTeamPolicyDrift();
    if (printJsonAndExit(result)) return;
    console.log(formatCheckTeamPolicyDriftMessage(result));
  }

  /**
   * 检查治理审查截止日期命令
   */
  function checkGovernanceReviewDeadlinesCommand() {
    const result = teamPolicyService.checkGovernanceReviewDeadlines();
    refreshGovernanceContext("check-governance-review-deadlines");
    if (printJsonAndExit(result)) return;
    console.log(formatCheckGovernanceReviewDeadlinesMessage(result));
  }

  /**
   * 显示项目配置决策命令
   */
  function showProjectProfileDecisionCommand() {
    const result = teamPolicyService.showProjectProfileDecision();
    if (printJsonAndExit(result)) return;
    console.log(formatShowProjectProfileDecisionMessage(result));
  }

  /**
   * 审查项目配置命令
   * 支持 accept、reject、defer 等操作
   */
  function reviewProjectProfileCommand() {
    const result = teamPolicyService.reviewProjectProfile({
      acceptedProjectProfile: getSingleOption("--accept"),
      acceptRecommended: selectionService.hasFlag("--accept-recommended"),
      reject: selectionService.hasFlag("--reject"),
      defer: selectionService.hasFlag("--defer"),
      reason: getSingleOption("--reason") || getSingleOption("--note"),
      nextReviewAt: getSingleOption("--next-review-at")
    });
    refreshGovernanceContext("review-project-profile");
    if (printJsonAndExit(result)) return;
    console.log(formatReviewProjectProfileMessage(result));
  }

  /**
   * 显示项目治理上下文命令
   */
  function showProjectGovernanceContextCommand() {
    const result = governanceContextService.showProjectGovernanceContext();
    if (printJsonAndExit(result)) return;
    console.log(formatShowProjectGovernanceContextMessage(result));
  }

  /**
   * 显示晋升追踪命令
   * 支持按 pattern、skill、tool、release 过滤
   */
  function showPromotionTraceCommand() {
    const result = promotionTraceService.showPromotionTrace({
      patternId: getSingleOption("--pattern"),
      skillName: getSingleOption("--skill"),
      toolName: getSingleOption("--tool"),
      releaseVersion: getSingleOption("--release")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatShowPromotionTraceMessage(result));
  }

  /**
   * 生成对话挖掘策略命令
   * 根据项目类型生成相应的挖掘策略
   */
  function generateConversationMinerStrategyCommand() {
    const result = conversationMinerService.generateConversationMinerStrategy({
      projectType: getSingleOption("--type", "enterprise-vue"),
      dryRun: selectionService.hasFlag("--dry-run")
    });
    if (!result.dryRun) refreshGovernanceContext("generate-conversation-miner-strategy");
    if (printJsonAndExit(result)) return;
    console.log(formatGenerateConversationMinerStrategyMessage(result));
  }

  return {
    checkAutoCaptureRuntimeCommand,
    showAutoCaptureBridgeContractCommand,
    showCaptureSafetyPolicyCommand,
    validateCaptureSafetyPolicyCommand,
    checkCaptureRetentionCommand,
    applyCaptureRetentionCommand,
    checkProjectBaselineCommand,
    showTeamPolicyCommand,
    validateTeamPolicyCommand,
    checkTeamPolicyDriftCommand,
    checkGovernanceReviewDeadlinesCommand,
    showProjectProfileDecisionCommand,
    reviewProjectProfileCommand,
    showProjectGovernanceContextCommand,
    showPromotionTraceCommand,
    generateConversationMinerStrategyCommand
  };
}
