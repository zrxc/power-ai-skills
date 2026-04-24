/**
 * 模式分析和管理命令模块
 * 职责：处理对话模式分析、合并、审查、归档、恢复，以及项目技能生成
 * 包含：
 *   - 模式分析（analyzePatternsCommand）
 *   - 模式合并（mergeConversationPatternCommand）
 *   - 模式审查（reviewConversationPatternCommand）
 *   - 模式归档（archiveConversationPatternCommand）
 *   - 模式恢复（restoreConversationPatternCommand）
 *   - 项目技能生成（generateProjectSkillCommand）
 */

import {
  formatAnalyzePatternsMessage,
  formatArchiveConversationPatternMessage,
  formatGenerateProjectSkillMessage,
  formatMergeConversationPatternMessage,
  formatRestoreConversationPatternMessage,
  formatReviewConversationPatternMessage
} from "./project-output.mjs";

/**
 * 创建模式分析和管理命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {string} params.projectRoot - 项目根目录
 * @returns {Object} 模式分析和管理命令对象
 */
export function createPatternCommands({
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
    return getSingleOption(optionName, fallback);
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
  function printJsonAndExit(payload) {
    if (!selectionService.hasFlag("--json")) return false;
    console.log(JSON.stringify(payload, null, 2));
    return true;
  }

  /**
   * 获取模式ID
   * @returns {string}
   */
  function getPatternId() {
    return getSingleOptionOrPositional("--pattern");
  }

  /**
   * 获取对话模式源ID
   * @returns {string}
   */
  function getConversationPatternSourceId() {
    return getSingleOption("--source");
  }

  /**
   * 获取对话模式目标ID
   * @returns {string}
   */
  function getConversationPatternTargetId() {
    return getSingleOption("--target");
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
   * 分析模式命令 - 分析对话模式
   */
  function analyzePatternsCommand() {
    const from = getSingleOption("--from");
    const to = getSingleOption("--to");
    const result = conversationMinerService.analyzePatterns({ from, to });
    refreshGovernanceContext("analyze-patterns");
    if (printJsonAndExit(result)) return;
    console.log(formatAnalyzePatternsMessage({ projectRoot, result }));
  }

  /**
   * 合并对话模式命令
   */
  function mergeConversationPatternCommand() {
    const result = conversationMinerService.mergeConversationPattern({
      sourcePatternId: getConversationPatternSourceId(),
      targetPatternId: getConversationPatternTargetId(),
      note: getSingleOption("--note")
    });
    refreshGovernanceContext("merge-conversation-pattern");
    if (printJsonAndExit(result)) return;
    console.log(formatMergeConversationPatternMessage(result));
  }

  /**
   * 审查对话模式命令 - 支持单模式和批量模式审查
   */
  function reviewConversationPatternCommand() {
    const fromState = selectionService.hasFlag("--from-review")
      ? "review"
      : getSingleOption("--from-state");
    const result = fromState
      ? conversationMinerService.reviewConversationPatternsBatch({
          fromState,
          accept: selectionService.hasFlag("--accept"),
          reject: selectionService.hasFlag("--reject"),
          archive: selectionService.hasFlag("--archive"),
          target: getSingleOption("--target"),
          reason: getSingleOption("--reason") || getSingleOption("--note"),
          limit: getNumericOption("--limit")
        })
      : conversationMinerService.reviewConversationPattern({
          patternId: getPatternId(),
          accept: selectionService.hasFlag("--accept"),
          reject: selectionService.hasFlag("--reject"),
          archive: selectionService.hasFlag("--archive"),
          target: getSingleOption("--target"),
          reason: getSingleOption("--reason") || getSingleOption("--note")
        });
    refreshGovernanceContext("review-conversation-pattern");
    if (printJsonAndExit(result)) return;
    console.log(formatReviewConversationPatternMessage(result));
  }

  /**
   * 归档对话模式命令
   */
  function archiveConversationPatternCommand() {
    const result = conversationMinerService.archiveConversationPattern({
      patternId: getPatternId(),
      note: getSingleOption("--note")
    });
    refreshGovernanceContext("archive-conversation-pattern");
    if (printJsonAndExit(result)) return;
    console.log(formatArchiveConversationPatternMessage(result));
  }

  /**
   * 恢复对话模式命令
   */
  function restoreConversationPatternCommand() {
    const result = conversationMinerService.restoreConversationPattern({
      patternId: getPatternId(),
      note: getSingleOption("--note")
    });
    refreshGovernanceContext("restore-conversation-pattern");
    if (printJsonAndExit(result)) return;
    console.log(formatRestoreConversationPatternMessage(result));
  }

  /**
   * 生成项目技能命令 - 从对话模式生成项目技能
   */
  function generateProjectSkillCommand() {
    const result = conversationMinerService.generateProjectSkill({
      patternId: getPatternId(),
      force: selectionService.hasFlag("--force")
    });
    refreshGovernanceContext("generate-project-skill");
    console.log(formatGenerateProjectSkillMessage(result));
  }

  return {
    analyzePatternsCommand,
    mergeConversationPatternCommand,
    reviewConversationPatternCommand,
    archiveConversationPatternCommand,
    restoreConversationPatternCommand,
    generateProjectSkillCommand,
    // 导出内部辅助函数供主入口使用
    getPatternId
  };
}
