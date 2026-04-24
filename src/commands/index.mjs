import { createInfoCommands } from "./info-commands.mjs";
import { createOutputHelpers } from "./output.mjs";
import { createProjectCommands } from "./project-commands.mjs";

export function createCommandRunner({
  context,
  cliArgs,
  projectRoot,
  selectionService,
  workspaceService,
  doctorService,
  projectBaselineService,
  teamPolicyService,
  governanceContextService,
  projectScanService,
  conversationMinerService,
  upgradeSummaryService,
  governanceSummaryService,
  governanceHistoryService,
  promotionTraceService,
  evolutionService
}) {
  const outputHelpers = createOutputHelpers({ projectRoot, selectionService });

  const infoCommands = createInfoCommands({
    context,
    selectionService,
    doctorService,
    governanceContextService,
    outputHelpers
  });

  const projectCommands = createProjectCommands({
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
    governanceSummaryService,
    governanceHistoryService,
    promotionTraceService,
    evolutionService
  });

  const commandHandlers = {
    "list-tools": () => infoCommands.listToolsCommand(),
    sync: () => projectCommands.syncCommand(),
    init: () => projectCommands.initCommand(),
    "scan-project": () => projectCommands.scanProjectCommand(),
    "diff-project-scan": () => projectCommands.diffProjectScanCommand(),
    "generate-project-local-skills": () => projectCommands.generateProjectLocalSkillsCommand(),
    "list-project-local-skills": () => projectCommands.listProjectLocalSkillsCommand(),
    "promote-project-local-skill": () => projectCommands.promoteProjectLocalSkillCommand(),
    "review-project-pattern": () => projectCommands.reviewProjectPatternCommand(),
    "queue-auto-capture-response": () => projectCommands.queueAutoCaptureResponseCommand(),
    "submit-auto-capture": () => projectCommands.submitAutoCaptureCommand(),
    "evaluate-session-capture": () => projectCommands.evaluateSessionCaptureCommand(),
    "prepare-session-capture": () => projectCommands.prepareSessionCaptureCommand(),
    "confirm-session-capture": () => projectCommands.confirmSessionCaptureCommand(),
    "consume-auto-capture-response-inbox": () => projectCommands.consumeAutoCaptureResponseInboxCommand(),
    "consume-auto-capture-inbox": () => projectCommands.consumeAutoCaptureInboxCommand(),
    "watch-auto-capture-inbox": () => projectCommands.watchAutoCaptureInboxCommand(),
    "codex-capture-session": () => projectCommands.codexCaptureSessionCommand(),
    "trae-capture-session": () => projectCommands.traeCaptureSessionCommand(),
    "cursor-capture-session": () => projectCommands.cursorCaptureSessionCommand(),
    "claude-code-capture-session": () => projectCommands.claudeCodeCaptureSessionCommand(),
    "windsurf-capture-session": () => projectCommands.windsurfCaptureSessionCommand(),
    "gemini-cli-capture-session": () => projectCommands.geminiCliCaptureSessionCommand(),
    "github-copilot-capture-session": () => projectCommands.githubCopilotCaptureSessionCommand(),
    "cline-capture-session": () => projectCommands.clineCaptureSessionCommand(),
    "aider-capture-session": () => projectCommands.aiderCaptureSessionCommand(),
    "tool-capture-session": () => projectCommands.toolCaptureSessionCommand(),
    "capture-session": () => projectCommands.captureSessionCommand(),
    "analyze-patterns": () => projectCommands.analyzePatternsCommand(),
    "review-conversation-pattern": () => projectCommands.reviewConversationPatternCommand(),
    "merge-conversation-pattern": () => projectCommands.mergeConversationPatternCommand(),
    "archive-conversation-pattern": () => projectCommands.archiveConversationPatternCommand(),
    "restore-conversation-pattern": () => projectCommands.restoreConversationPatternCommand(),
    "generate-project-skill": () => projectCommands.generateProjectSkillCommand(),
    "scaffold-wrapper-promotion": () => projectCommands.scaffoldWrapperPromotionCommand(),
    "list-wrapper-promotions": () => projectCommands.listWrapperPromotionsCommand(),
    "show-wrapper-promotion-timeline": () => projectCommands.showWrapperPromotionTimelineCommand(),
    "generate-wrapper-promotion-audit": () => projectCommands.generateWrapperPromotionAuditCommand(),
    "generate-wrapper-registry-governance": () => projectCommands.generateWrapperRegistryGovernanceCommand(),
    "generate-upgrade-summary": () => projectCommands.generateUpgradeSummaryCommand(),
    "generate-governance-summary": () => projectCommands.generateGovernanceSummaryCommand(),
    "show-evolution-policy": () => projectCommands.showEvolutionPolicyCommand(),
    "validate-evolution-policy": () => projectCommands.validateEvolutionPolicyCommand(),
    "generate-evolution-candidates": () => projectCommands.generateEvolutionCandidatesCommand(),
    "apply-evolution-actions": () => projectCommands.applyEvolutionActionsCommand(),
    "generate-evolution-proposals": () => projectCommands.generateEvolutionProposalsCommand(),
    "list-evolution-proposals": () => projectCommands.listEvolutionProposalsCommand(),
    "list-evolution-drafts": () => projectCommands.listEvolutionDraftsCommand(),
    "show-evolution-draft": () => projectCommands.showEvolutionDraftCommand(),
    "review-evolution-proposal": () => projectCommands.reviewEvolutionProposalCommand(),
    "apply-evolution-proposal": () => projectCommands.applyEvolutionProposalCommand(),
    "run-evolution-cycle": () => projectCommands.runEvolutionCycleCommand(),
    "show-governance-history": () => projectCommands.showGovernanceHistoryCommand(),
    "generate-conversation-miner-strategy": () => projectCommands.generateConversationMinerStrategyCommand(),
    "check-auto-capture-runtime": () => projectCommands.checkAutoCaptureRuntimeCommand(),
    "show-auto-capture-bridge-contract": () => projectCommands.showAutoCaptureBridgeContractCommand(),
    "show-capture-safety-policy": () => projectCommands.showCaptureSafetyPolicyCommand(),
    "validate-capture-safety-policy": () => projectCommands.validateCaptureSafetyPolicyCommand(),
    "check-capture-retention": () => projectCommands.checkCaptureRetentionCommand(),
    "apply-capture-retention": () => projectCommands.applyCaptureRetentionCommand(),
    "check-project-baseline": () => projectCommands.checkProjectBaselineCommand(),
    "show-team-policy": () => projectCommands.showTeamPolicyCommand(),
    "validate-team-policy": () => projectCommands.validateTeamPolicyCommand(),
    "check-team-policy-drift": () => projectCommands.checkTeamPolicyDriftCommand(),
    "check-governance-review-deadlines": () => projectCommands.checkGovernanceReviewDeadlinesCommand(),
    "show-project-profile-decision": () => projectCommands.showProjectProfileDecisionCommand(),
    "review-project-profile": () => projectCommands.reviewProjectProfileCommand(),
    "show-project-governance-context": () => projectCommands.showProjectGovernanceContextCommand(),
    "show-promotion-trace": () => projectCommands.showPromotionTraceCommand(),
    "review-wrapper-promotion": () => projectCommands.reviewWrapperPromotionCommand(),
    "materialize-wrapper-promotion": () => projectCommands.materializeWrapperPromotionCommand(),
    "apply-wrapper-promotion": () => projectCommands.applyWrapperPromotionCommand(),
    "finalize-wrapper-promotion": () => projectCommands.finalizeWrapperPromotionCommand(),
    "register-wrapper-promotion": () => projectCommands.registerWrapperPromotionCommand(),
    "archive-wrapper-promotion": () => projectCommands.archiveWrapperPromotionCommand(),
    "restore-wrapper-promotion": () => projectCommands.restoreWrapperPromotionCommand(),
    "add-tool": () => projectCommands.addToolCommand(),
    "remove-tool": () => projectCommands.removeToolCommand(),
    version: () => infoCommands.versionCommand(),
    "show-defaults": () => infoCommands.showDefaultsCommand(),
    doctor: () => infoCommands.doctorCommand(),
    "clean-reports": () => projectCommands.cleanReportsCommand()
  };

  async function execute() {
    const handler = commandHandlers[cliArgs.command];
    if (!handler) {
      console.error(`Unsupported command: ${cliArgs.command}`);
      process.exit(1);
    }

    await handler();
  }

  return { execute };
}
