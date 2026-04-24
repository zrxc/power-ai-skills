/**
 * 自进化相关命令模块
 * 职责：处理系统自进化相关的命令，包括进化候选、提案、审查和应用
 * 涉及功能：
 *   - 进化策略展示和验证
 *   - 生成进化候选
 *   - 应用进化动作
 *   - 生成、列出、审查、应用进化提案
 *   - 运行进化周期
 */

import {
  formatShowEvolutionPolicyMessage,
  formatValidateEvolutionPolicyMessage,
  formatGenerateEvolutionCandidatesMessage,
  formatApplyEvolutionActionsMessage,
  formatGenerateEvolutionProposalsMessage,
  formatListEvolutionProposalsMessage,
  formatListEvolutionDraftsMessage,
  formatShowEvolutionDraftMessage,
  formatReviewEvolutionProposalMessage,
  formatApplyEvolutionProposalMessage,
  formatRunEvolutionCycleMessage
} from "./project-output.mjs";

/**
 * 创建自进化命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.evolutionService - 进化服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {Object} params.governanceSummaryService - 治理摘要服务
 * @returns {Object} 自进化命令对象
 */
export function createEvolutionCommands({
  cliArgs,
  selectionService,
  evolutionService,
  governanceContextService,
  governanceSummaryService
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
   * 显示进化策略命令
   */
  function showEvolutionPolicyCommand() {
    const result = evolutionService.showEvolutionPolicy();
    if (printJsonAndExit(result)) return;
    console.log(formatShowEvolutionPolicyMessage(result));
  }

  /**
   * 验证进化策略命令
   */
  function validateEvolutionPolicyCommand() {
    const result = evolutionService.validateEvolutionPolicy();
    if (printJsonAndExit(result)) return;
    console.log(formatValidateEvolutionPolicyMessage(result));
  }

  /**
   * 生成进化候选命令 - 识别可进化的候选项
   */
  function generateEvolutionCandidatesCommand() {
    const result = evolutionService.generateEvolutionCandidates({
      trigger: "generate-evolution-candidates"
    });
    refreshGovernanceContext("generate-evolution-candidates");
    if (printJsonAndExit(result)) return;
    console.log(formatGenerateEvolutionCandidatesMessage(result));
  }

  /**
   * 应用进化动作命令 - 执行进化动作
   */
  function applyEvolutionActionsCommand() {
    const result = evolutionService.applyEvolutionActions({
      trigger: "apply-evolution-actions",
      dryRun: selectionService.hasFlag("--dry-run")
    });
    refreshGovernanceContext("apply-evolution-actions");
    if (printJsonAndExit(result)) return;
    console.log(formatApplyEvolutionActionsMessage(result));
  }

  /**
   * 生成进化提案命令 - 基于候选生成进化提案
   */
  function generateEvolutionProposalsCommand() {
    const result = evolutionService.generateEvolutionProposals({
      trigger: "generate-evolution-proposals"
    });
    refreshGovernanceContext("generate-evolution-proposals");
    if (printJsonAndExit(result)) return;
    console.log(formatGenerateEvolutionProposalsMessage(result));
  }

  /**
   * 列出进化提案命令 - 支持按类型和状态过滤
   */
  function listEvolutionProposalsCommand() {
    const result = evolutionService.listEvolutionProposals({
      proposalType: getSingleOption("--type"),
      status: getSingleOption("--status"),
      limit: getNumericOption("--limit"),
      includeArchived: selectionService.hasFlag("--archived")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatListEvolutionProposalsMessage(result));
  }

  function listEvolutionDraftsCommand() {
    const result = evolutionService.listEvolutionDrafts({
      artifactType: getSingleOption("--type"),
      proposalId: getSingleOption("--proposal"),
      limit: getNumericOption("--limit")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatListEvolutionDraftsMessage(result));
  }

  function showEvolutionDraftCommand() {
    const result = evolutionService.showEvolutionDraft({
      draftId: getSingleOptionOrPositional("--draft"),
      proposalId: getSingleOption("--proposal")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatShowEvolutionDraftMessage(result));
  }

  /**
   * 审查进化提案命令
   * 支持 accept/reject/archive/review 操作
   */
  function reviewEvolutionProposalCommand() {
    const result = evolutionService.reviewEvolutionProposal({
      proposalId: getSingleOptionOrPositional("--proposal"),
      fromStatus: getSingleOption("--from-status"),
      proposalType: getSingleOption("--type"),
      includeArchived: selectionService.hasFlag("--archived"),
      limit: getNumericOption("--limit"),
      accept: selectionService.hasFlag("--accept"),
      reject: selectionService.hasFlag("--reject"),
      archive: selectionService.hasFlag("--archive"),
      review: selectionService.hasFlag("--review"),
      note: getSingleOption("--note") || getSingleOption("--reason")
    });
    refreshGovernanceContext("review-evolution-proposal");
    if (governanceSummaryService?.generateGovernanceSummary) {
      governanceSummaryService.generateGovernanceSummary();
    }
    if (printJsonAndExit(result)) return;
    console.log(formatReviewEvolutionProposalMessage(result));
  }

  /**
   * 应用进化提案命令 - 执行已审查的进化提案
   */
  function applyEvolutionProposalCommand() {
    const result = evolutionService.applyEvolutionProposal({
      proposalId: getSingleOptionOrPositional("--proposal"),
      fromStatus: getSingleOption("--from-status"),
      proposalType: getSingleOption("--type"),
      includeArchived: selectionService.hasFlag("--archived"),
      limit: getNumericOption("--limit"),
      note: getSingleOption("--note") || getSingleOption("--reason")
    });
    refreshGovernanceContext("apply-evolution-proposal");
    if (governanceSummaryService?.generateGovernanceSummary) {
      governanceSummaryService.generateGovernanceSummary();
    }
    if (printJsonAndExit(result)) return;
    console.log(formatApplyEvolutionProposalMessage(result));
  }

  /**
   * 运行进化周期命令 - 完整执行进化周期流程
   * 支持 force、dry-run 和最小新对话数限制
   */
  function runEvolutionCycleCommand() {
    const result = evolutionService.runEvolutionCycle({
      force: selectionService.hasFlag("--force"),
      dryRun: selectionService.hasFlag("--dry-run"),
      minNewConversations: getNumericOption("--min-new-conversations")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatRunEvolutionCycleMessage(result));
  }

  return {
    showEvolutionPolicyCommand,
    validateEvolutionPolicyCommand,
    generateEvolutionCandidatesCommand,
    applyEvolutionActionsCommand,
    generateEvolutionProposalsCommand,
    listEvolutionProposalsCommand,
    listEvolutionDraftsCommand,
    showEvolutionDraftCommand,
    reviewEvolutionProposalCommand,
    applyEvolutionProposalCommand,
    runEvolutionCycleCommand
  };
}
