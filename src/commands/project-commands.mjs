/**
 * 项目命令主入口模块
 * 职责：协调所有子命令模块，提供统一的命令出口
 * 架构：
 *   - init-commands.mjs: 初始化相关命令
 *   - sync-commands.mjs: 同步和扫描相关命令
 *   - conversation-commands.mjs: 对话挖掘和包装器晋升命令
 *   - evolution-commands.mjs: 自进化相关命令
 *   - governance-commands.mjs: 治理相关命令
 *   - report-commands.mjs: 报告相关命令
 *
 * 本文件仅保留依赖注入和命令协调逻辑，不再包含具体命令实现。
 */

import { createInitCommands } from "./init-commands.mjs";
import { createSyncCommands } from "./sync-commands.mjs";
import { createConversationCommands } from "./conversation-commands.mjs";
import { createEvolutionCommands } from "./evolution-commands.mjs";
import { createGovernanceCommands } from "./governance-commands.mjs";
import { createReportCommands } from "./report-commands.mjs";

/**
 * 创建所有项目命令
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {string} params.projectRoot - 项目根目录
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.workspaceService - 工作空间服务
 * @param {Object} params.projectBaselineService - 项目基线服务
 * @param {Object} params.teamPolicyService - 团队策略服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {Object} params.projectScanService - 项目扫描服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @param {Object} params.upgradeSummaryService - 升级摘要服务
 * @param {Object} params.releasePublishPlannerService - 发布规划服务
 * @param {Object} params.releaseOrchestrationPlannerService - 发布编排规划服务
 * @param {Object} params.releasePublishExecutorService - 发布执行服务
 * @param {Object} params.releaseOrchestrationExecutorService - 发布编排执行服务
 * @param {Object} params.releaseUnattendedAuthorizationService - 无人值守治理授权服务
 * @param {Object} params.releaseUnattendedGovernancePlannerService - 无人值守治理规划服务
 * @param {Object} params.releaseUnattendedGovernanceExecutorService - 无人值守治理执行服务
 * @param {Object} params.governanceSummaryService - 治理摘要服务
 * @param {Object} params.governanceHistoryService - 治理历史服务
 * @param {Object} params.promotionTraceService - 晋升追踪服务
 * @param {Object} params.evolutionService - 进化服务
 * @returns {Object} 所有命令的集合对象
 */
export function createProjectCommands({
  cliArgs,
  projectRoot,
  selectionService,
  workspaceService,
  projectBaselineService,
  teamPolicyService,
  governanceContextService,
  projectScanService,
  conversationMinerService,
  upgradeSummaryService,
  releasePublishPlannerService,
  releaseOrchestrationPlannerService,
  releasePublishExecutorService,
  releaseOrchestrationExecutorService,
  releaseUnattendedAuthorizationService,
  releaseUnattendedGovernancePlannerService,
  releaseUnattendedGovernanceExecutorService,
  governanceSummaryService,
  governanceHistoryService,
  promotionTraceService,
  evolutionService
}) {
  // ========== 各子模块命令 ==========

  const initCommands = createInitCommands({
    selectionService,
    workspaceService,
    conversationMinerService,
    evolutionService,
    projectScanService,
    teamPolicyService,
    governanceContextService,
    projectRoot
  });

  const syncCommands = createSyncCommands({
    cliArgs,
    selectionService,
    workspaceService,
    conversationMinerService,
    evolutionService,
    projectScanService,
    teamPolicyService,
    governanceContextService,
    projectRoot
  });

  const conversationCommands = createConversationCommands({
    cliArgs,
    selectionService,
    conversationMinerService,
    governanceContextService,
    projectRoot
  });

  const evolutionCommands = createEvolutionCommands({
    cliArgs,
    selectionService,
    evolutionService,
    governanceContextService,
    governanceSummaryService
  });

  const governanceCommands = createGovernanceCommands({
    cliArgs,
    selectionService,
    projectBaselineService,
    teamPolicyService,
    governanceContextService,
    promotionTraceService,
    conversationMinerService
  });

  const reportCommands = createReportCommands({
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
  });

  // ========== 合并所有命令 ==========

  return {
    // 初始化命令
    initCommand: initCommands.initCommand,

    // 同步和扫描命令
    syncCommand: syncCommands.syncCommand,
    scanProjectCommand: syncCommands.scanProjectCommand,
    diffProjectScanCommand: syncCommands.diffProjectScanCommand,
    generateProjectLocalSkillsCommand: syncCommands.generateProjectLocalSkillsCommand,
    listProjectLocalSkillsCommand: syncCommands.listProjectLocalSkillsCommand,
    planProjectLocalPromotionsCommand: syncCommands.planProjectLocalPromotionsCommand,
    promoteProjectLocalSkillCommand: syncCommands.promoteProjectLocalSkillCommand,
    reviewProjectPatternCommand: syncCommands.reviewProjectPatternCommand,
    addToolCommand: syncCommands.addToolCommand,
    removeToolCommand: syncCommands.removeToolCommand,
    cleanReportsCommand: syncCommands.cleanReportsCommand,

    // 对话挖掘和包装器晋升命令
    captureSessionCommand: conversationCommands.captureSessionCommand,
    submitAutoCaptureCommand: conversationCommands.submitAutoCaptureCommand,
    queueAutoCaptureResponseCommand: conversationCommands.queueAutoCaptureResponseCommand,
    evaluateSessionCaptureCommand: conversationCommands.evaluateSessionCaptureCommand,
    prepareSessionCaptureCommand: conversationCommands.prepareSessionCaptureCommand,
    confirmSessionCaptureCommand: conversationCommands.confirmSessionCaptureCommand,
    consumeAutoCaptureInboxCommand: conversationCommands.consumeAutoCaptureInboxCommand,
    consumeAutoCaptureResponseInboxCommand: conversationCommands.consumeAutoCaptureResponseInboxCommand,
    watchAutoCaptureInboxCommand: conversationCommands.watchAutoCaptureInboxCommand,
    codexCaptureSessionCommand: conversationCommands.codexCaptureSessionCommand,
    traeCaptureSessionCommand: conversationCommands.traeCaptureSessionCommand,
    cursorCaptureSessionCommand: conversationCommands.cursorCaptureSessionCommand,
    claudeCodeCaptureSessionCommand: conversationCommands.claudeCodeCaptureSessionCommand,
    windsurfCaptureSessionCommand: conversationCommands.windsurfCaptureSessionCommand,
    geminiCliCaptureSessionCommand: conversationCommands.geminiCliCaptureSessionCommand,
    githubCopilotCaptureSessionCommand: conversationCommands.githubCopilotCaptureSessionCommand,
    clineCaptureSessionCommand: conversationCommands.clineCaptureSessionCommand,
    aiderCaptureSessionCommand: conversationCommands.aiderCaptureSessionCommand,
    toolCaptureSessionCommand: conversationCommands.toolCaptureSessionCommand,
    analyzePatternsCommand: conversationCommands.analyzePatternsCommand,
    mergeConversationPatternCommand: conversationCommands.mergeConversationPatternCommand,
    reviewConversationPatternCommand: conversationCommands.reviewConversationPatternCommand,
    archiveConversationPatternCommand: conversationCommands.archiveConversationPatternCommand,
    restoreConversationPatternCommand: conversationCommands.restoreConversationPatternCommand,
    generateProjectSkillCommand: conversationCommands.generateProjectSkillCommand,
    scaffoldWrapperPromotionCommand: conversationCommands.scaffoldWrapperPromotionCommand,
    listWrapperPromotionsCommand: conversationCommands.listWrapperPromotionsCommand,
    showWrapperPromotionTimelineCommand: conversationCommands.showWrapperPromotionTimelineCommand,
    generateWrapperPromotionAuditCommand: conversationCommands.generateWrapperPromotionAuditCommand,
    generateWrapperRegistryGovernanceCommand: conversationCommands.generateWrapperRegistryGovernanceCommand,
    planWrapperRegistrationsCommand: conversationCommands.planWrapperRegistrationsCommand,
    reviewWrapperPromotionCommand: conversationCommands.reviewWrapperPromotionCommand,
    materializeWrapperPromotionCommand: conversationCommands.materializeWrapperPromotionCommand,
    applyWrapperPromotionCommand: conversationCommands.applyWrapperPromotionCommand,
    finalizeWrapperPromotionCommand: conversationCommands.finalizeWrapperPromotionCommand,
    registerWrapperPromotionCommand: conversationCommands.registerWrapperPromotionCommand,
    archiveWrapperPromotionCommand: conversationCommands.archiveWrapperPromotionCommand,
    restoreWrapperPromotionCommand: conversationCommands.restoreWrapperPromotionCommand,

    // 自进化命令
    showEvolutionPolicyCommand: evolutionCommands.showEvolutionPolicyCommand,
    validateEvolutionPolicyCommand: evolutionCommands.validateEvolutionPolicyCommand,
    generateEvolutionCandidatesCommand: evolutionCommands.generateEvolutionCandidatesCommand,
    applyEvolutionActionsCommand: evolutionCommands.applyEvolutionActionsCommand,
    generateEvolutionProposalsCommand: evolutionCommands.generateEvolutionProposalsCommand,
    listEvolutionProposalsCommand: evolutionCommands.listEvolutionProposalsCommand,
    listEvolutionDraftsCommand: evolutionCommands.listEvolutionDraftsCommand,
    showEvolutionDraftCommand: evolutionCommands.showEvolutionDraftCommand,
    planSharedSkillPromotionsCommand: evolutionCommands.planSharedSkillPromotionsCommand,
    reviewEvolutionProposalCommand: evolutionCommands.reviewEvolutionProposalCommand,
    applyEvolutionProposalCommand: evolutionCommands.applyEvolutionProposalCommand,
    runEvolutionCycleCommand: evolutionCommands.runEvolutionCycleCommand,

    // 治理命令
    checkAutoCaptureRuntimeCommand: governanceCommands.checkAutoCaptureRuntimeCommand,
    showAutoCaptureBridgeContractCommand: governanceCommands.showAutoCaptureBridgeContractCommand,
    showCaptureSafetyPolicyCommand: governanceCommands.showCaptureSafetyPolicyCommand,
    validateCaptureSafetyPolicyCommand: governanceCommands.validateCaptureSafetyPolicyCommand,
    checkCaptureRetentionCommand: governanceCommands.checkCaptureRetentionCommand,
    applyCaptureRetentionCommand: governanceCommands.applyCaptureRetentionCommand,
    checkProjectBaselineCommand: governanceCommands.checkProjectBaselineCommand,
    showTeamPolicyCommand: governanceCommands.showTeamPolicyCommand,
    validateTeamPolicyCommand: governanceCommands.validateTeamPolicyCommand,
    checkTeamPolicyDriftCommand: governanceCommands.checkTeamPolicyDriftCommand,
    checkGovernanceReviewDeadlinesCommand: governanceCommands.checkGovernanceReviewDeadlinesCommand,
    showProjectProfileDecisionCommand: governanceCommands.showProjectProfileDecisionCommand,
    reviewProjectProfileCommand: governanceCommands.reviewProjectProfileCommand,
    showProjectGovernanceContextCommand: governanceCommands.showProjectGovernanceContextCommand,
    showPromotionTraceCommand: governanceCommands.showPromotionTraceCommand,
    generateConversationMinerStrategyCommand: governanceCommands.generateConversationMinerStrategyCommand,

    // 报告命令
    generateUpgradeSummaryCommand: reportCommands.generateUpgradeSummaryCommand,
    planReleasePublishCommand: reportCommands.planReleasePublishCommand,
    planReleaseOrchestrationCommand: reportCommands.planReleaseOrchestrationCommand,
    authorizeReleaseUnattendedGovernanceCommand: reportCommands.authorizeReleaseUnattendedGovernanceCommand,
    planReleaseUnattendedGovernanceCommand: reportCommands.planReleaseUnattendedGovernanceCommand,
    executeReleaseOrchestrationCommand: reportCommands.executeReleaseOrchestrationCommand,
    executeReleasePublishCommand: reportCommands.executeReleasePublishCommand,
    executeReleaseUnattendedGovernanceCommand: reportCommands.executeReleaseUnattendedGovernanceCommand,
    generateGovernanceSummaryCommand: reportCommands.generateGovernanceSummaryCommand,
    showGovernanceHistoryCommand: reportCommands.showGovernanceHistoryCommand
  };
}
