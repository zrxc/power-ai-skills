function pushUnique(target, value) {
  if (value && !target.includes(value)) {
    target.push(value);
  }
}

function createCommand(command, reason, audience = "consumer") {
  return { command, reason, audience };
}

function createCheck(title, detail, audience = "consumer", blocking = false) {
  return { title, detail, audience, blocking };
}

function getCompatibilityFailures(compatibilityMatrix) {
  return compatibilityMatrix?.summary?.failedScenarios || 0;
}

export function buildUpgradeAdvicePackage({
  packageName,
  version,
  generatedAt,
  automationReport,
  impactReport,
  riskReport,
  releaseGateReport,
  compatibilityMatrix,
  teamPolicy = null,
  impactTaskPath = ""
}) {
  const consumerCommands = [];
  const maintainerCommands = [];
  const manualChecks = [];
  const notices = [];
  const audiences = [];
  const overallRiskLevel = riskReport?.overallRiskLevel || automationReport?.summary?.overallRiskLevel || "unknown";
  const releaseLevel = automationReport?.summary?.recommendedReleaseLevel || impactReport?.recommendedReleaseLevel || "unknown";
  const compatibilityFailures = getCompatibilityFailures(compatibilityMatrix);
  const releaseGateFailures = releaseGateReport?.summary?.failedGates || 0;
  const releaseGateWarnings = releaseGateReport?.summary?.warningGates || 0;
  const blocked = releaseGateReport?.overallStatus === "fail";
  const policyGate = releaseGateReport?.gates?.find((gate) => gate.id === "team-policy-governance") || null;
  const governanceSummary = compatibilityMatrix?.summary || releaseGateReport?.governance || {};
  const unresolvedProjectProfileDecisions = governanceSummary.unresolvedProjectProfileDecisions || 0;
  const deferredProjectProfileDecisions = governanceSummary.deferredProjectProfileDecisions || 0;
  const rejectedProjectProfileDecisions = governanceSummary.rejectedProjectProfileDecisions || 0;
  const pendingConversationReviews = governanceSummary.pendingConversationReviews || 0;
  const warningLevelConversationRecords = governanceSummary.warningLevelConversationRecords || 0;
  const reviewLevelConversationRecords = governanceSummary.reviewLevelConversationRecords || 0;
  const captureLevelConversationRecords = governanceSummary.captureLevelConversationRecords || 0;
  const scenariosWithWarningLevelConversationRecords = governanceSummary.scenariosWithWarningLevelConversationRecords || 0;
  const scenariosWithReviewLevelConversationRecords = governanceSummary.scenariosWithReviewLevelConversationRecords || 0;
  const pendingWrapperProposals = governanceSummary.pendingWrapperProposals || 0;
  const overdueGovernanceReviews = governanceSummary.overdueGovernanceReviews || 0;
  const dueTodayGovernanceReviews = governanceSummary.dueTodayGovernanceReviews || 0;
  const staleEvolutionProposalReviews = governanceSummary.staleEvolutionProposalReviews || 0;
  const staleAcceptedEvolutionProposals = governanceSummary.staleAcceptedEvolutionProposals || 0;
  const autoCaptureWarningScenarios = governanceSummary.autoCaptureWarningScenarios || 0;
  const autoCaptureAttentionScenarios = governanceSummary.autoCaptureAttentionScenarios || 0;
  const autoCaptureCaptureBacklog = governanceSummary.autoCaptureCaptureBacklog || 0;
  const autoCaptureResponseBacklog = governanceSummary.autoCaptureResponseBacklog || 0;
  const autoCaptureFailedRequests = governanceSummary.autoCaptureFailedRequests || 0;
  const scenariosWithAutoCaptureBacklog = governanceSummary.scenariosWithAutoCaptureBacklog || 0;
  const scenariosWithAutoCaptureFailures = governanceSummary.scenariosWithAutoCaptureFailures || 0;
  const captureRetentionArchiveCandidates = governanceSummary.captureRetentionArchiveCandidates || 0;
  const captureRetentionPruneCandidates = governanceSummary.captureRetentionPruneCandidates || 0;

  pushUnique(audiences, "consumer");
  consumerCommands.push(
    createCommand("pnpm exec power-ai-skills sync", "Sync the latest skills, shared files, adapters, registry, and team policy snapshot."),
    createCommand("pnpm exec power-ai-skills doctor", "Validate the current consumer project's .power-ai workspace, entrypoints, and knowledge artifacts."),
    createCommand("pnpm exec power-ai-skills show-defaults --format summary", "Preview the current default selection and the recommended team project profile for this workspace."),
    createCommand("pnpm exec power-ai-skills check-team-policy-drift --json", "Confirm the project still matches the team policy baseline after upgrade."),
    createCommand("pnpm exec power-ai-skills show-project-profile-decision --json", "Inspect the current project profile decision record before accepting, rejecting, or deferring any new recommendation."),
    createCommand("pnpm exec power-ai-skills check-governance-review-deadlines --json", "Check whether any governance review deadlines are due today or already overdue after upgrade."),
    createCommand("pnpm exec power-ai-skills check-auto-capture-runtime --json", "Confirm the consumer project's auto-capture queues, failures, and bridge scaffolding are healthy after upgrade."),
    createCommand("pnpm exec power-ai-skills check-capture-retention --json", "Confirm conversation retention backlog is still within project policy before trusting self-evolution data."),
    createCommand("pnpm exec power-ai-skills show-project-governance-context --json", "Inspect the unified governance snapshot after upgrade, including profile decisions, pending conversation reviews, and baseline status.")
  );

  if (compatibilityFailures > 0) {
    consumerCommands.push(
      createCommand("pnpm exec power-ai-skills doctor", "When the compatibility matrix has failures, re-check whether the current project matches one of the failing scenarios.")
    );
    manualChecks.push(
      createCheck(
        "Review compatibility matrix failures",
        `The current release compatibility matrix has ${compatibilityFailures} failing scenarios. Confirm whether this project uses the same initialization strategy or tool combination before upgrading.`,
        "consumer",
        true
      )
    );
  }

  if (overallRiskLevel === "high") {
    consumerCommands.push(
      createCommand("pnpm exec power-ai-skills doctor", "This upgrade is marked high risk. Run doctor again after upgrading to verify entrypoints, knowledge artifacts, and capture scaffolding.")
    );
    manualChecks.push(
      createCheck(
        "Read the upgrade risk report",
        "This release is marked as high risk. Review the release notes and upgrade risk report before broad rollout.",
        "consumer",
        true
      )
    );
  }

  if ((impactReport?.followUps || []).length > 0) {
    for (const followUp of impactReport.followUps) {
      manualChecks.push(createCheck("Handle impact follow-up", followUp, "consumer", false));
    }
  }

  if ((teamPolicy?.projectProfiles || []).length > 0) {
    manualChecks.push(
      createCheck(
        "Confirm recommended project profile drift",
        "After upgrading, run `power-ai-skills show-defaults --format summary`, `check-team-policy-drift --json`, and `show-project-profile-decision --json` to confirm whether the recommended team project profile still matches the project's bound profile and whether a manual decision should be refreshed.",
        "consumer",
        false
      )
    );
  }

  if (unresolvedProjectProfileDecisions > 0) {
    manualChecks.push(
      createCheck(
        "Resolve unresolved project profile recommendations",
        `The compatibility matrix still shows ${unresolvedProjectProfileDecisions} consumer scenario(s) with recommended profile drift that remain in \`auto-recommended\` state. Accept, reject, or defer those recommendations before broad rollout.`,
        "consumer",
        false
      )
    );
  }

  if (deferredProjectProfileDecisions > 0 || rejectedProjectProfileDecisions > 0) {
    const deferredSummary = deferredProjectProfileDecisions > 0 ? `${deferredProjectProfileDecisions} deferred` : null;
    const rejectedSummary = rejectedProjectProfileDecisions > 0 ? `${rejectedProjectProfileDecisions} rejected` : null;
    manualChecks.push(
      createCheck(
        "Recheck historical project profile decisions",
        `The compatibility matrix includes ${[deferredSummary, rejectedSummary].filter(Boolean).join(" and ")} project profile decision(s). Reconfirm those historical decisions after upgrade, but migration is not required unless the recommendation or project constraints changed.`,
        "consumer",
        false
      )
    );
  }

  if (overdueGovernanceReviews > 0 || dueTodayGovernanceReviews > 0) {
    const overdueSummary = overdueGovernanceReviews > 0 ? `${overdueGovernanceReviews} overdue` : null;
    const dueTodaySummary = dueTodayGovernanceReviews > 0 ? `${dueTodayGovernanceReviews} due today` : null;
    manualChecks.push(
      createCheck(
        "Review governance deadlines",
        `The current governance summary includes ${[overdueSummary, dueTodaySummary].filter(Boolean).join(" and ")} review item(s). Re-run \`check-governance-review-deadlines --json\` and refresh those decisions before broad rollout if they are still relevant.`,
        "consumer",
        false
      )
    );
  }

  if (pendingConversationReviews > 0) {
    manualChecks.push(
      createCheck(
        "Review conversation backlog before rollout",
        `The compatibility matrix still reports ${pendingConversationReviews} pending conversation review item(s). Confirm whether those patterns should be promoted, rejected, or archived before broad consumer rollout.`,
        "maintainer",
        false
      )
    );
  }

  if (warningLevelConversationRecords > 0) {
    manualChecks.push(
      createCheck(
        "Acknowledge warning-level conversation captures",
        `Consumer scenarios include ${warningLevelConversationRecords} conversation record(s) marked with \`captureSafetyGovernanceLevel=warning\` across ${scenariosWithWarningLevelConversationRecords} scenario(s). Acknowledge these low-signal captures before using them as strong self-evolution evidence.`,
        "consumer",
        false
      )
    );
  }

  if (reviewLevelConversationRecords > 0) {
    manualChecks.push(
      createCheck(
        "Review admission-level conversation captures",
        `Consumer scenarios include ${reviewLevelConversationRecords} conversation record(s) marked with \`captureAdmissionLevel=review\` across ${scenariosWithReviewLevelConversationRecords} scenario(s). Triage these explanation-style captures before using them as self-evolution evidence.`,
        "consumer",
        false
      )
    );
  }

  if (pendingWrapperProposals > 0) {
    manualChecks.push(
      createCheck(
        "Review pending wrapper proposals in consumer workspaces",
        `The compatibility matrix still reports ${pendingWrapperProposals} pending wrapper proposal item(s) across consumer scenarios. Confirm whether they are expected experimental drift or should be cleaned up before release communication.`,
        "maintainer",
        false
      )
    );
  }

  if (staleEvolutionProposalReviews > 0 || staleAcceptedEvolutionProposals > 0) {
    const staleReviewSummary = staleEvolutionProposalReviews > 0 ? `${staleEvolutionProposalReviews} stale review` : null;
    const staleAcceptedSummary = staleAcceptedEvolutionProposals > 0 ? `${staleAcceptedEvolutionProposals} stale accepted/apply` : null;
    manualChecks.push(
      createCheck(
        "Clear stale evolution proposal backlog",
        `The governance summary includes ${[staleReviewSummary, staleAcceptedSummary].filter(Boolean).join(" and ")} proposal item(s). Re-run \`list-evolution-proposals --json\` and prioritize those items before broad rollout.`,
        "maintainer",
        false
      )
    );
  }

  if (autoCaptureFailedRequests > 0 || autoCaptureAttentionScenarios > 0) {
    manualChecks.push(
      createCheck(
        "Resolve auto-capture runtime failures",
        `Consumer scenarios still report ${autoCaptureFailedRequests} failed auto-capture request(s) across ${scenariosWithAutoCaptureFailures} scenario(s), with ${autoCaptureAttentionScenarios} scenario(s) already in attention state. Re-run \`check-auto-capture-runtime --json\` in affected projects and clear failed queues before depending on self-evolution signals.`,
        "consumer",
        false
      )
    );
  }

  if (autoCaptureCaptureBacklog > 0 || autoCaptureResponseBacklog > 0) {
    manualChecks.push(
      createCheck(
        "Drain auto-capture backlog",
        `Consumer scenarios still carry capture backlog ${autoCaptureCaptureBacklog} and response backlog ${autoCaptureResponseBacklog} across ${scenariosWithAutoCaptureBacklog} scenario(s). Start \`watch-auto-capture-inbox\` or consume queues manually before broad rollout.`,
        "consumer",
        false
      )
    );
  }

  if (captureRetentionArchiveCandidates > 0 || captureRetentionPruneCandidates > 0) {
    manualChecks.push(
      createCheck(
        "Apply capture retention backlog",
        `The current governance summary still reports retention archive candidates ${captureRetentionArchiveCandidates} and prune candidates ${captureRetentionPruneCandidates}. Re-run \`check-capture-retention --json\` and apply retention before depending on long-lived conversation history for self-evolution.`,
        "consumer",
        false
      )
    );
  }

  pushUnique(audiences, "maintainer");
  maintainerCommands.push(
    createCommand("pnpm refresh:release-artifacts", "Refresh release notes, impact, risk, payload, and other release artifacts.", "maintainer"),
    createCommand("pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-risk-report --require-automation-report --require-notification-payload", "Validate that the core release artifacts are internally consistent.", "maintainer"),
    createCommand("pnpm check:release-gates -- --require-consumer-matrix", "Run final release gates, including wrapper governance, team policy, and consumer compatibility checks.", "maintainer"),
    createCommand("pnpm exec power-ai-skills validate-team-policy --json", "Validate config/team-policy.json again before publishing.", "maintainer")
  );

  if (releaseGateFailures > 0) {
    manualChecks.push(
      createCheck(
        "Resolve release gate blockers",
        `There are still ${releaseGateFailures} failing release gates. Clear these blockers before publishing.`,
        "maintainer",
        true
      )
    );
  }

  if (releaseGateWarnings > 0) {
    manualChecks.push(
      createCheck(
        "Review release gate governance warnings",
        `The current release gate report still has ${releaseGateWarnings} warning gate(s). Review the governance section before broad publication so historical decisions and conversation backlog are intentionally acknowledged.`,
        "maintainer",
        false
      )
    );
  }

  if (teamPolicy?.releasePolicies?.enforceConsumerMatrix) {
    manualChecks.push(
      createCheck(
        "Team policy requires consumer matrix",
        "The current team policy requires a green consumer compatibility matrix before release.",
        "maintainer",
        true
      )
    );
  }

  if (policyGate && !policyGate.ok) {
    manualChecks.push(
      createCheck(
        "Resolve team policy gate",
        "The release gates detected a failing team policy validation. Fix config/team-policy.json before publishing.",
        "maintainer",
        true
      )
    );
  }

  for (const action of riskReport?.recommendedActions || []) {
    manualChecks.push(createCheck("Handle risk recommendation", action, "maintainer", false));
  }

  for (const action of releaseGateReport?.recommendedActions || []) {
    manualChecks.push(createCheck("Handle release gate recommendation", action, "maintainer", false));
  }

  if (impactTaskPath) {
    notices.push(`Impact task generated for maintainer follow-up: ${impactTaskPath}`);
  }
  notices.push(`Recommended release level: ${releaseLevel}; overall risk level: ${overallRiskLevel}.`);
  if (teamPolicy) {
    notices.push(`Current team policy default tool baseline: ${(teamPolicy.defaultTools || []).join(", ") || "none"}.`);
    notices.push(`Current team policy project profile count: ${(teamPolicy.projectProfiles || []).length}.`);
  }
  if (unresolvedProjectProfileDecisions > 0 || deferredProjectProfileDecisions > 0 || rejectedProjectProfileDecisions > 0) {
    notices.push(`Governance summary: unresolved profile decisions ${unresolvedProjectProfileDecisions}, deferred ${deferredProjectProfileDecisions}, rejected ${rejectedProjectProfileDecisions}.`);
  }
  if (pendingConversationReviews > 0 || pendingWrapperProposals > 0) {
    notices.push(`Governance backlog: pending conversation reviews ${pendingConversationReviews}, pending wrapper proposals ${pendingWrapperProposals}.`);
  }
  if (reviewLevelConversationRecords > 0) {
    notices.push(`Conversation capture admissions: warning-level records ${warningLevelConversationRecords}, review-level records ${reviewLevelConversationRecords}, capture-level records ${captureLevelConversationRecords}.`);
  }
  if (overdueGovernanceReviews > 0 || dueTodayGovernanceReviews > 0) {
    notices.push(`Governance review deadlines: overdue ${overdueGovernanceReviews}, due today ${dueTodayGovernanceReviews}.`);
  }
  if (staleEvolutionProposalReviews > 0 || staleAcceptedEvolutionProposals > 0) {
    notices.push(`Evolution proposal aging: stale reviews ${staleEvolutionProposalReviews}, stale accepted/apply ${staleAcceptedEvolutionProposals}.`);
  }
  if (autoCaptureFailedRequests > 0 || autoCaptureCaptureBacklog > 0 || autoCaptureResponseBacklog > 0) {
    notices.push(`Auto-capture runtime health: warning scenarios ${autoCaptureWarningScenarios}, attention scenarios ${autoCaptureAttentionScenarios}, capture backlog ${autoCaptureCaptureBacklog}, response backlog ${autoCaptureResponseBacklog}, failed requests ${autoCaptureFailedRequests}.`);
  }
  if (blocked) {
    notices.push("Release gates are still blocking publication. Do not promote this version broadly yet.");
  } else if (releaseGateWarnings > 0) {
    notices.push("Release gates are not blocking publication, but governance warnings still need explicit acknowledgement.");
  }

  const uniqueConsumerCommands = [];
  const seenConsumerCommands = new Set();
  for (const item of consumerCommands) {
    const key = `${item.command}::${item.reason}::${item.audience}`;
    if (seenConsumerCommands.has(key)) continue;
    seenConsumerCommands.add(key);
    uniqueConsumerCommands.push(item);
  }

  const uniqueMaintainerCommands = [];
  const seenMaintainerCommands = new Set();
  for (const item of maintainerCommands) {
    const key = `${item.command}::${item.reason}::${item.audience}`;
    if (seenMaintainerCommands.has(key)) continue;
    seenMaintainerCommands.add(key);
    uniqueMaintainerCommands.push(item);
  }

  const uniqueChecks = [];
  const seenChecks = new Set();
  for (const item of manualChecks) {
    const key = `${item.title}::${item.detail}::${item.audience}::${item.blocking}`;
    if (seenChecks.has(key)) continue;
    seenChecks.add(key);
    uniqueChecks.push(item);
  }

  return {
    packageName,
    version,
    generatedAt,
    releaseLevel,
    overallRiskLevel,
    blocked,
    audiences,
    summary: {
      consumerCommandCount: uniqueConsumerCommands.length,
      maintainerCommandCount: uniqueMaintainerCommands.length,
      manualCheckCount: uniqueChecks.length,
      blockingCheckCount: uniqueChecks.filter((item) => item.blocking).length,
      compatibilityFailures,
      releaseGateFailures,
      releaseGateWarnings,
      unresolvedProjectProfileDecisions,
      deferredProjectProfileDecisions,
      rejectedProjectProfileDecisions,
      pendingConversationReviews,
      warningLevelConversationRecords,
      reviewLevelConversationRecords,
      captureLevelConversationRecords,
      scenariosWithWarningLevelConversationRecords,
      scenariosWithReviewLevelConversationRecords,
      pendingWrapperProposals,
      overdueGovernanceReviews,
      dueTodayGovernanceReviews,
      staleEvolutionProposalReviews,
      staleAcceptedEvolutionProposals,
      autoCaptureWarningScenarios,
      autoCaptureAttentionScenarios,
      autoCaptureCaptureBacklog,
      autoCaptureResponseBacklog,
      autoCaptureFailedRequests,
      scenariosWithAutoCaptureBacklog,
      scenariosWithAutoCaptureFailures,
      teamPolicyDefaultToolCount: teamPolicy?.defaultTools?.length || 0,
      teamProjectProfileCount: teamPolicy?.projectProfiles?.length || 0
    },
    consumerCommands: uniqueConsumerCommands,
    maintainerCommands: uniqueMaintainerCommands,
    manualChecks: uniqueChecks,
    notices
  };
}

export function buildUpgradeAdviceMarkdown(payload) {
  const lines = [
    "# Upgrade Advice Package",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- generatedAt: \`${payload.generatedAt}\``,
    `- release level: \`${payload.releaseLevel}\``,
    `- risk level: \`${payload.overallRiskLevel}\``,
    `- blocked: ${payload.blocked}`,
    "",
    "## Consumer Commands",
    ""
  ];

  if (payload.consumerCommands.length === 0) {
    lines.push("- none");
  } else {
    for (const item of payload.consumerCommands) {
      lines.push(`- \`${item.command}\`: ${item.reason}`);
    }
  }

  lines.push("", "## Maintainer Commands", "");
  if (payload.maintainerCommands.length === 0) {
    lines.push("- none");
  } else {
    for (const item of payload.maintainerCommands) {
      lines.push(`- \`${item.command}\`: ${item.reason}`);
    }
  }

  lines.push("", "## Manual Checks", "");
  if (payload.manualChecks.length === 0) {
    lines.push("- none");
  } else {
    for (const item of payload.manualChecks) {
      lines.push(`- ${item.title}: ${item.detail}${item.blocking ? " [blocking]" : ""}`);
    }
  }

  lines.push("", "## Notes", "");
  if (payload.notices.length === 0) {
    lines.push("- none");
  } else {
    for (const item of payload.notices) {
      lines.push(`- ${item}`);
    }
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
