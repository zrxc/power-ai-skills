/**
 * 对话挖掘和包装器晋升命令主入口
 * 职责：协调各子模块命令，提供辅助函数和统一导出
 *
 * 模块拆分说明：
 *   - capture-commands.mjs  - 会话捕获和自动捕获相关命令
 *   - pattern-commands.mjs  - 模式分析和管理相关命令
 *   - wrapper-commands.mjs  - 包装器晋升相关命令
 *
 * 本文件仅保留：
 *   - 共享辅助函数（getSingleOption、getPatternId、getWrapperPromotionToolName 等）
 *   - 命令协调（导入并重新导出所有子模块的命令）
 */

import { createCaptureCommands } from "./capture-commands.mjs";
import { createPatternCommands } from "./pattern-commands.mjs";
import { createWrapperCommands } from "./wrapper-commands.mjs";

/**
 * 创建完整的对话挖掘和包装器晋升命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {string} params.projectRoot - 项目根目录
 * @returns {Object} 完整的命令对象
 */
export function createConversationCommands({
  cliArgs,
  selectionService,
  conversationMinerService,
  governanceContextService,
  projectRoot
}) {
  // 创建各子模块命令
  const captureCommands = createCaptureCommands({
    cliArgs,
    selectionService,
    conversationMinerService,
    projectRoot
  });

  const patternCommands = createPatternCommands({
    selectionService,
    conversationMinerService,
    governanceContextService,
    projectRoot
  });

  const wrapperCommands = createWrapperCommands({
    cliArgs,
    selectionService,
    conversationMinerService,
    governanceContextService,
    projectRoot
  });

  /**
   * 获取单个选项值（共享辅助函数）
   * @param {string} optionName - 选项名称
   * @param {string} fallback - 默认值
   * @returns {string} 选项值
   */
  function getSingleOption(optionName, fallback = "") {
    return (selectionService.getOptionValues(optionName) || [])[0] || fallback;
  }

  /**
   * 获取模式ID（共享辅助函数）
   * @param {string} [fallback] - 默认值
   * @returns {string} 模式ID
   */
  function getPatternId(fallback = "") {
    return getSingleOption("--pattern", fallback);
  }

  /**
   * 获取包装器工具名称（共享辅助函数）
   * @param {string} [fallback] - 默认值
   * @returns {string} 工具名称
   */
  function getWrapperPromotionToolName(fallback = "") {
    return getSingleOption("--tool", cliArgs.positionals[0] || fallback);
  }

  /**
   * 提示用户确认（共享辅助函数）
   * @param {string} message - 确认消息
   * @returns {Promise<boolean>} 用户是否确认
   */
  async function promptConfirmation(message) {
    // 委托给 capture 模块的实现
    return captureCommands.promptConfirmation(message);
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
   * 读取标准输入文本（共享辅助函数）
   * @returns {Promise<string>}
   */
  function readStdinText() {
    return captureCommands.readStdinText();
  }

  /**
   * 解析会话捕获参数（共享辅助函数）
   * @returns {Promise<Object>} 捕获参数对象
   */
  async function resolveSessionCaptureArgs() {
    return captureCommands.resolveSessionCaptureArgs();
  }

  /**
   * 刷新治理上下文（共享辅助函数）
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

  // 合并所有命令并导出
  return {
    // 捕获命令（来自 capture-commands.mjs）
    captureSessionCommand: captureCommands.captureSessionCommand,
    submitAutoCaptureCommand: captureCommands.submitAutoCaptureCommand,
    queueAutoCaptureResponseCommand: captureCommands.queueAutoCaptureResponseCommand,
    evaluateSessionCaptureCommand: captureCommands.evaluateSessionCaptureCommand,
    prepareSessionCaptureCommand: captureCommands.prepareSessionCaptureCommand,
    confirmSessionCaptureCommand: captureCommands.confirmSessionCaptureCommand,
    consumeAutoCaptureInboxCommand: captureCommands.consumeAutoCaptureInboxCommand,
    consumeAutoCaptureResponseInboxCommand: captureCommands.consumeAutoCaptureResponseInboxCommand,
    watchAutoCaptureInboxCommand: captureCommands.watchAutoCaptureInboxCommand,
    codexCaptureSessionCommand: captureCommands.codexCaptureSessionCommand,
    traeCaptureSessionCommand: captureCommands.traeCaptureSessionCommand,
    cursorCaptureSessionCommand: captureCommands.cursorCaptureSessionCommand,
    claudeCodeCaptureSessionCommand: captureCommands.claudeCodeCaptureSessionCommand,
    windsurfCaptureSessionCommand: captureCommands.windsurfCaptureSessionCommand,
    geminiCliCaptureSessionCommand: captureCommands.geminiCliCaptureSessionCommand,
    githubCopilotCaptureSessionCommand: captureCommands.githubCopilotCaptureSessionCommand,
    clineCaptureSessionCommand: captureCommands.clineCaptureSessionCommand,
    aiderCaptureSessionCommand: captureCommands.aiderCaptureSessionCommand,
    toolCaptureSessionCommand: captureCommands.toolCaptureSessionCommand,

    // 模式命令（来自 pattern-commands.mjs）
    analyzePatternsCommand: patternCommands.analyzePatternsCommand,
    mergeConversationPatternCommand: patternCommands.mergeConversationPatternCommand,
    reviewConversationPatternCommand: patternCommands.reviewConversationPatternCommand,
    archiveConversationPatternCommand: patternCommands.archiveConversationPatternCommand,
    restoreConversationPatternCommand: patternCommands.restoreConversationPatternCommand,
    generateProjectSkillCommand: patternCommands.generateProjectSkillCommand,

    // 包装器晋升命令（来自 wrapper-commands.mjs）
    scaffoldWrapperPromotionCommand: wrapperCommands.scaffoldWrapperPromotionCommand,
    listWrapperPromotionsCommand: wrapperCommands.listWrapperPromotionsCommand,
    showWrapperPromotionTimelineCommand: wrapperCommands.showWrapperPromotionTimelineCommand,
    generateWrapperPromotionAuditCommand: wrapperCommands.generateWrapperPromotionAuditCommand,
    generateWrapperRegistryGovernanceCommand: wrapperCommands.generateWrapperRegistryGovernanceCommand,
    planWrapperRegistrationsCommand: wrapperCommands.planWrapperRegistrationsCommand,
    reviewWrapperPromotionCommand: wrapperCommands.reviewWrapperPromotionCommand,
    materializeWrapperPromotionCommand: wrapperCommands.materializeWrapperPromotionCommand,
    applyWrapperPromotionCommand: wrapperCommands.applyWrapperPromotionCommand,
    finalizeWrapperPromotionCommand: wrapperCommands.finalizeWrapperPromotionCommand,
    registerWrapperPromotionCommand: wrapperCommands.registerWrapperPromotionCommand,
    archiveWrapperPromotionCommand: wrapperCommands.archiveWrapperPromotionCommand,
    restoreWrapperPromotionCommand: wrapperCommands.restoreWrapperPromotionCommand,

    // 共享辅助函数
    getSingleOption,
    getPatternId,
    getWrapperPromotionToolName,
    promptConfirmation,
    printJsonAndExit,
    readStdinText,
    resolveSessionCaptureArgs,
    refreshGovernanceContext
  };
}
