const PROJECT_ROOT_STRATEGIES = {
  CWD: "cwd",
  FIRST_POSITIONAL_OR_CWD: "first-positional-or-cwd",
  INIT_TARGET_OR_CWD: "init-target-or-cwd"
};

const commandDefinitions = [
  { name: "list-tools", scope: "info", method: "listToolsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "version", scope: "info", method: "versionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "show-defaults", scope: "info", method: "showDefaultsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "doctor", scope: "info", method: "doctorCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "sync", scope: "project", method: "syncCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "init", scope: "project", method: "initCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.INIT_TARGET_OR_CWD },
  { name: "scan-project", scope: "project", method: "scanProjectCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "diff-project-scan", scope: "project", method: "diffProjectScanCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "generate-project-local-skills", scope: "project", method: "generateProjectLocalSkillsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "list-project-local-skills", scope: "project", method: "listProjectLocalSkillsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "plan-project-local-promotions", scope: "project", method: "planProjectLocalPromotionsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD },
  { name: "promote-project-local-skill", scope: "project", method: "promoteProjectLocalSkillCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "review-project-pattern", scope: "project", method: "reviewProjectPatternCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "queue-auto-capture-response", scope: "project", method: "queueAutoCaptureResponseCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "submit-auto-capture", scope: "project", method: "submitAutoCaptureCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "evaluate-session-capture", scope: "project", method: "evaluateSessionCaptureCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "prepare-session-capture", scope: "project", method: "prepareSessionCaptureCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "confirm-session-capture", scope: "project", method: "confirmSessionCaptureCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "consume-auto-capture-response-inbox", scope: "project", method: "consumeAutoCaptureResponseInboxCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "consume-auto-capture-inbox", scope: "project", method: "consumeAutoCaptureInboxCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "watch-auto-capture-inbox", scope: "project", method: "watchAutoCaptureInboxCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "codex-capture-session", scope: "project", method: "codexCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "trae-capture-session", scope: "project", method: "traeCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "cursor-capture-session", scope: "project", method: "cursorCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "claude-code-capture-session", scope: "project", method: "claudeCodeCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "windsurf-capture-session", scope: "project", method: "windsurfCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "gemini-cli-capture-session", scope: "project", method: "geminiCliCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "github-copilot-capture-session", scope: "project", method: "githubCopilotCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "cline-capture-session", scope: "project", method: "clineCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "aider-capture-session", scope: "project", method: "aiderCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "tool-capture-session", scope: "project", method: "toolCaptureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "capture-session", scope: "project", method: "captureSessionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "analyze-patterns", scope: "project", method: "analyzePatternsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "review-conversation-pattern", scope: "project", method: "reviewConversationPatternCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "merge-conversation-pattern", scope: "project", method: "mergeConversationPatternCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "archive-conversation-pattern", scope: "project", method: "archiveConversationPatternCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "restore-conversation-pattern", scope: "project", method: "restoreConversationPatternCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "generate-project-skill", scope: "project", method: "generateProjectSkillCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "scaffold-wrapper-promotion", scope: "project", method: "scaffoldWrapperPromotionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "list-wrapper-promotions", scope: "project", method: "listWrapperPromotionsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-wrapper-promotion-timeline", scope: "project", method: "showWrapperPromotionTimelineCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "generate-wrapper-promotion-audit", scope: "project", method: "generateWrapperPromotionAuditCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "generate-wrapper-registry-governance", scope: "project", method: "generateWrapperRegistryGovernanceCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "plan-wrapper-registrations", scope: "project", method: "planWrapperRegistrationsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "generate-upgrade-summary", scope: "project", method: "generateUpgradeSummaryCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "plan-release-publish", scope: "project", method: "planReleasePublishCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "execute-release-publish", scope: "project", method: "executeReleasePublishCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "generate-governance-summary", scope: "project", method: "generateGovernanceSummaryCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-evolution-policy", scope: "project", method: "showEvolutionPolicyCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "validate-evolution-policy", scope: "project", method: "validateEvolutionPolicyCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "generate-evolution-candidates", scope: "project", method: "generateEvolutionCandidatesCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "apply-evolution-actions", scope: "project", method: "applyEvolutionActionsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "generate-evolution-proposals", scope: "project", method: "generateEvolutionProposalsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "list-evolution-proposals", scope: "project", method: "listEvolutionProposalsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "list-evolution-drafts", scope: "project", method: "listEvolutionDraftsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-evolution-draft", scope: "project", method: "showEvolutionDraftCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "plan-shared-skill-promotions", scope: "project", method: "planSharedSkillPromotionsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "review-evolution-proposal", scope: "project", method: "reviewEvolutionProposalCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "apply-evolution-proposal", scope: "project", method: "applyEvolutionProposalCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "run-evolution-cycle", scope: "project", method: "runEvolutionCycleCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-governance-history", scope: "project", method: "showGovernanceHistoryCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "generate-conversation-miner-strategy", scope: "project", method: "generateConversationMinerStrategyCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "check-auto-capture-runtime", scope: "project", method: "checkAutoCaptureRuntimeCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-auto-capture-bridge-contract", scope: "project", method: "showAutoCaptureBridgeContractCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-capture-safety-policy", scope: "project", method: "showCaptureSafetyPolicyCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "validate-capture-safety-policy", scope: "project", method: "validateCaptureSafetyPolicyCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "check-capture-retention", scope: "project", method: "checkCaptureRetentionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "apply-capture-retention", scope: "project", method: "applyCaptureRetentionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "check-project-baseline", scope: "project", method: "checkProjectBaselineCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-team-policy", scope: "project", method: "showTeamPolicyCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "validate-team-policy", scope: "project", method: "validateTeamPolicyCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "check-team-policy-drift", scope: "project", method: "checkTeamPolicyDriftCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "check-governance-review-deadlines", scope: "project", method: "checkGovernanceReviewDeadlinesCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-project-profile-decision", scope: "project", method: "showProjectProfileDecisionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "review-project-profile", scope: "project", method: "reviewProjectProfileCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-project-governance-context", scope: "project", method: "showProjectGovernanceContextCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "show-promotion-trace", scope: "project", method: "showPromotionTraceCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "review-wrapper-promotion", scope: "project", method: "reviewWrapperPromotionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "materialize-wrapper-promotion", scope: "project", method: "materializeWrapperPromotionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "apply-wrapper-promotion", scope: "project", method: "applyWrapperPromotionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "finalize-wrapper-promotion", scope: "project", method: "finalizeWrapperPromotionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "register-wrapper-promotion", scope: "project", method: "registerWrapperPromotionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "archive-wrapper-promotion", scope: "project", method: "archiveWrapperPromotionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "restore-wrapper-promotion", scope: "project", method: "restoreWrapperPromotionCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.CWD },
  { name: "add-tool", scope: "project", method: "addToolCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.INIT_TARGET_OR_CWD },
  { name: "remove-tool", scope: "project", method: "removeToolCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.INIT_TARGET_OR_CWD },
  { name: "clean-reports", scope: "project", method: "cleanReportsCommand", projectRootStrategy: PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD }
];

const commandDefinitionMap = new Map(commandDefinitions.map((definition) => [definition.name, definition]));

export function listCommandDefinitions() {
  return [...commandDefinitions];
}

export function getCommandDefinition(commandName) {
  return commandDefinitionMap.get(commandName) || null;
}

export function getCommandProjectRootStrategy(commandName) {
  return getCommandDefinition(commandName)?.projectRootStrategy || PROJECT_ROOT_STRATEGIES.FIRST_POSITIONAL_OR_CWD;
}

export function isKnownCommand(commandName) {
  return commandDefinitionMap.has(commandName);
}

export function createCommandHandlers({ infoCommands, projectCommands }) {
  const commandSources = {
    info: infoCommands,
    project: projectCommands
  };

  return Object.fromEntries(commandDefinitions.map((definition) => {
    return [
      definition.name,
      () => commandSources[definition.scope][definition.method]()
    ];
  }));
}

export { PROJECT_ROOT_STRATEGIES };
