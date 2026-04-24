import path from "node:path";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sortObjectEntries(record) {
  return Object.entries(record).sort((left, right) => left[0].localeCompare(right[0], "en"));
}

function getInitStrategy({ profile = "", requestedTools = [] }) {
  if (requestedTools.length > 0) return "explicit-tools";
  if (profile) return "profile";
  return "team-default";
}

function getScenarioLabel(report) {
  if (report.fixtureName) return `fixture:${report.fixtureName}`;
  if (report.projectRoot) return `project:${path.basename(report.projectRoot)}`;
  return "unknown";
}

function getDoctorPayload(report) {
  const doctorCommand = (report.commands || []).find((command) => command.command === "doctor");
  return doctorCommand?.doctorPayload || null;
}

function getGovernanceContext(report, doctorPayload) {
  if (report.governanceContext?.available && report.governanceContext.payload) {
    return report.governanceContext.payload;
  }
  return doctorPayload?.governanceContext || null;
}

function summarizeScenario(report, context) {
  const doctorPayload = getDoctorPayload(report);
  const governanceContext = getGovernanceContext(report, doctorPayload);
  const artifactChecks = report.artifacts?.checks || [];
  const failedCommands = (report.commands || []).filter((command) => !command.ok).map((command) => command.command);
  const missingArtifacts = artifactChecks.filter((check) => !check.ok).map((check) => check.id);
  const selectedTools = doctorPayload?.selectedTools || [];
  const selectedPresets = doctorPayload?.selectedPresets || [];
  const expandedTools = doctorPayload?.expandedTools || [];
  const hasRecommendedProfileDrift = Boolean(
    governanceContext?.recommendedProjectProfile
    && governanceContext?.selectedProjectProfile !== governanceContext?.recommendedProjectProfile
  );
  const projectProfileDecision = governanceContext?.projectProfileDecision || "auto-recommended";

  return {
    scenarioId: report.fixtureName || report.projectRoot || getScenarioLabel(report),
    scenarioLabel: getScenarioLabel(report),
    targetType: report.fixtureName ? "fixture" : "project",
    fixtureName: report.fixtureName || "",
    projectRoot: report.projectRoot || "",
    initStrategy: getInitStrategy(context),
    commands: context.commands,
    ok: report.ok === true,
    doctorOk: doctorPayload?.ok ?? false,
    artifactOk: report.artifacts?.ok ?? false,
    selectedPresets,
    selectedTools,
    expandedTools,
    governanceContext: governanceContext
      ? {
          selectedProjectProfile: governanceContext.selectedProjectProfile || "",
          recommendedProjectProfile: governanceContext.recommendedProjectProfile || "",
          projectProfileDecision,
          projectProfileDecisionReviewStatus: governanceContext.projectProfileDecisionReviewStatus || "not-scheduled",
          overdueGovernanceReviews: governanceContext.overdueGovernanceReviews || 0,
          dueTodayGovernanceReviews: governanceContext.dueTodayGovernanceReviews || 0,
          baselineStatus: governanceContext.baselineStatus || "not-run",
          policyDriftStatus: governanceContext.policyDriftStatus || "unknown",
          pendingConversationReviews: governanceContext.pendingConversationReviews || 0,
          warningLevelConversationRecords: governanceContext.warningLevelConversationRecords || 0,
          reviewLevelConversationRecords: governanceContext.reviewLevelConversationRecords || 0,
          captureLevelConversationRecords: governanceContext.captureLevelConversationRecords || 0,
          recordsWithAdmissionMetadata: governanceContext.recordsWithAdmissionMetadata || 0,
          recordsWithGovernanceMetadata: governanceContext.recordsWithGovernanceMetadata || 0,
          pendingWrapperProposals: governanceContext.pendingWrapperProposals || 0,
          autoCaptureStatus: governanceContext.autoCaptureRuntime?.status || "unknown",
          autoCaptureActivityState: governanceContext.autoCaptureRuntime?.activityState || "unknown",
          autoCaptureEnabled: Boolean(governanceContext.autoCaptureRuntime?.enabled),
          autoCaptureCaptureBacklogCount: governanceContext.autoCaptureRuntime?.captureBacklogCount || 0,
          autoCaptureResponseBacklogCount: governanceContext.autoCaptureRuntime?.responseBacklogCount || 0,
          autoCaptureFailedRequestCount: governanceContext.autoCaptureRuntime?.failedRequestCount || 0,
          evolutionProposalReviewCount: governanceContext.evolutionProposals?.review || 0,
          acceptedEvolutionProposals: governanceContext.evolutionProposals?.accepted || 0,
          highRiskEvolutionProposals: governanceContext.evolutionProposals?.highRisk || 0,
          staleEvolutionProposalReviews: governanceContext.evolutionProposals?.staleReview || 0,
          staleAcceptedEvolutionProposals: governanceContext.evolutionProposals?.staleAcceptedPendingApply || 0,
          appliedEvolutionProposalFollowUps: governanceContext.evolutionProposals?.appliedDraftsWithFollowUps || 0,
          appliedEvolutionProposalFollowUpActionCount: governanceContext.evolutionProposals?.followUpActionCount || 0,
          appliedWrapperPromotionDrafts: governanceContext.evolutionProposals?.appliedWrapperPromotionDrafts || 0,
          appliedSharedSkillDrafts: governanceContext.evolutionProposals?.appliedSharedSkillDrafts || 0,
          appliedReleaseImpactDrafts: governanceContext.evolutionProposals?.appliedReleaseImpactDrafts || 0,
          hasRecommendedProfileDrift
        }
      : null,
    failureCodes: report.failureCodes || [],
    failedCommands,
    missingArtifacts,
    artifactCheckCount: artifactChecks.length
  };
}

export function buildConsumerCompatibilityMatrix({
  packageName,
  version,
  commands = [],
  profile = "",
  requestedTools = [],
  reports = [],
  generatedAt = new Date().toISOString()
} = {}) {
  const context = {
    commands,
    profile,
    requestedTools
  };
  const scenarios = reports.map((report) => summarizeScenario(report, context));
  const strategySummary = {};
  const fixtureSummary = {};
  const selectedToolSummary = {};
  const selectedProjectProfileSummary = {};
  const projectProfileDecisionSummary = {};
  let unresolvedProjectProfileDecisions = 0;
  let deferredProjectProfileDecisions = 0;
  let rejectedProjectProfileDecisions = 0;
  let pendingConversationReviews = 0;
  let scenariosWithPendingConversationReviews = 0;
  let warningLevelConversationRecords = 0;
  let scenariosWithWarningLevelConversationRecords = 0;
  let reviewLevelConversationRecords = 0;
  let captureLevelConversationRecords = 0;
  let recordsWithAdmissionMetadata = 0;
  let recordsWithGovernanceMetadata = 0;
  let scenariosWithReviewLevelConversationRecords = 0;
  let pendingWrapperProposals = 0;
  let scenariosWithPendingWrapperProposals = 0;
  let overdueGovernanceReviews = 0;
  let dueTodayGovernanceReviews = 0;
  let scenariosWithOverdueGovernanceReviews = 0;
  let pendingEvolutionProposalReviews = 0;
  let scenariosWithPendingEvolutionProposalReviews = 0;
  let acceptedEvolutionProposals = 0;
  let scenariosWithAcceptedEvolutionProposals = 0;
  let highRiskEvolutionProposals = 0;
  let staleEvolutionProposalReviews = 0;
  let scenariosWithStaleEvolutionProposalReviews = 0;
  let staleAcceptedEvolutionProposals = 0;
  let scenariosWithStaleAcceptedEvolutionProposals = 0;
  let appliedEvolutionProposalFollowUps = 0;
  let scenariosWithAppliedEvolutionProposalFollowUps = 0;
  let appliedEvolutionProposalFollowUpActionCount = 0;
  let appliedWrapperPromotionDrafts = 0;
  let appliedSharedSkillDrafts = 0;
  let appliedReleaseImpactDrafts = 0;
  let autoCaptureWarningScenarios = 0;
  let autoCaptureAttentionScenarios = 0;
  let autoCaptureCaptureBacklog = 0;
  let autoCaptureResponseBacklog = 0;
  let autoCaptureFailedRequests = 0;
  let scenariosWithAutoCaptureBacklog = 0;
  let scenariosWithAutoCaptureFailures = 0;

  for (const scenario of scenarios) {
    strategySummary[scenario.initStrategy] = (strategySummary[scenario.initStrategy] || 0) + 1;
    if (scenario.fixtureName) {
      fixtureSummary[scenario.fixtureName] = (fixtureSummary[scenario.fixtureName] || 0) + 1;
    }
    for (const toolName of scenario.selectedTools) {
      selectedToolSummary[toolName] = (selectedToolSummary[toolName] || 0) + 1;
    }
    if (scenario.governanceContext?.selectedProjectProfile) {
      const profileName = scenario.governanceContext.selectedProjectProfile;
      selectedProjectProfileSummary[profileName] = (selectedProjectProfileSummary[profileName] || 0) + 1;
    }
    if (scenario.governanceContext?.projectProfileDecision) {
      const decision = scenario.governanceContext.projectProfileDecision;
      projectProfileDecisionSummary[decision] = (projectProfileDecisionSummary[decision] || 0) + 1;
    }
    if (scenario.governanceContext?.hasRecommendedProfileDrift && scenario.governanceContext.projectProfileDecision === "auto-recommended") {
      unresolvedProjectProfileDecisions += 1;
    }
    if (scenario.governanceContext?.projectProfileDecision === "deferred") {
      deferredProjectProfileDecisions += 1;
    }
    if (scenario.governanceContext?.projectProfileDecision === "rejected") {
      rejectedProjectProfileDecisions += 1;
    }
    pendingConversationReviews += scenario.governanceContext?.pendingConversationReviews || 0;
    if ((scenario.governanceContext?.pendingConversationReviews || 0) > 0) {
      scenariosWithPendingConversationReviews += 1;
    }
    warningLevelConversationRecords += scenario.governanceContext?.warningLevelConversationRecords || 0;
    if ((scenario.governanceContext?.warningLevelConversationRecords || 0) > 0) {
      scenariosWithWarningLevelConversationRecords += 1;
    }
    reviewLevelConversationRecords += scenario.governanceContext?.reviewLevelConversationRecords || 0;
    captureLevelConversationRecords += scenario.governanceContext?.captureLevelConversationRecords || 0;
    recordsWithAdmissionMetadata += scenario.governanceContext?.recordsWithAdmissionMetadata || 0;
    recordsWithGovernanceMetadata += scenario.governanceContext?.recordsWithGovernanceMetadata || 0;
    if ((scenario.governanceContext?.reviewLevelConversationRecords || 0) > 0) {
      scenariosWithReviewLevelConversationRecords += 1;
    }
    pendingWrapperProposals += scenario.governanceContext?.pendingWrapperProposals || 0;
    if ((scenario.governanceContext?.pendingWrapperProposals || 0) > 0) {
      scenariosWithPendingWrapperProposals += 1;
    }
    overdueGovernanceReviews += scenario.governanceContext?.overdueGovernanceReviews || 0;
    dueTodayGovernanceReviews += scenario.governanceContext?.dueTodayGovernanceReviews || 0;
    if ((scenario.governanceContext?.overdueGovernanceReviews || 0) > 0) {
      scenariosWithOverdueGovernanceReviews += 1;
    }
    pendingEvolutionProposalReviews += scenario.governanceContext?.evolutionProposalReviewCount || 0;
    if ((scenario.governanceContext?.evolutionProposalReviewCount || 0) > 0) {
      scenariosWithPendingEvolutionProposalReviews += 1;
    }
    acceptedEvolutionProposals += scenario.governanceContext?.acceptedEvolutionProposals || 0;
    if ((scenario.governanceContext?.acceptedEvolutionProposals || 0) > 0) {
      scenariosWithAcceptedEvolutionProposals += 1;
    }
    highRiskEvolutionProposals += scenario.governanceContext?.highRiskEvolutionProposals || 0;
    staleEvolutionProposalReviews += scenario.governanceContext?.staleEvolutionProposalReviews || 0;
    if ((scenario.governanceContext?.staleEvolutionProposalReviews || 0) > 0) {
      scenariosWithStaleEvolutionProposalReviews += 1;
    }
    staleAcceptedEvolutionProposals += scenario.governanceContext?.staleAcceptedEvolutionProposals || 0;
    if ((scenario.governanceContext?.staleAcceptedEvolutionProposals || 0) > 0) {
      scenariosWithStaleAcceptedEvolutionProposals += 1;
    }
    appliedEvolutionProposalFollowUps += scenario.governanceContext?.appliedEvolutionProposalFollowUps || 0;
    if ((scenario.governanceContext?.appliedEvolutionProposalFollowUps || 0) > 0) {
      scenariosWithAppliedEvolutionProposalFollowUps += 1;
    }
    appliedEvolutionProposalFollowUpActionCount += scenario.governanceContext?.appliedEvolutionProposalFollowUpActionCount || 0;
    appliedWrapperPromotionDrafts += scenario.governanceContext?.appliedWrapperPromotionDrafts || 0;
    appliedSharedSkillDrafts += scenario.governanceContext?.appliedSharedSkillDrafts || 0;
    appliedReleaseImpactDrafts += scenario.governanceContext?.appliedReleaseImpactDrafts || 0;
    autoCaptureCaptureBacklog += scenario.governanceContext?.autoCaptureCaptureBacklogCount || 0;
    autoCaptureResponseBacklog += scenario.governanceContext?.autoCaptureResponseBacklogCount || 0;
    autoCaptureFailedRequests += scenario.governanceContext?.autoCaptureFailedRequestCount || 0;
    if ((scenario.governanceContext?.autoCaptureStatus || "") === "warning") {
      autoCaptureWarningScenarios += 1;
    }
    if ((scenario.governanceContext?.autoCaptureStatus || "") === "attention") {
      autoCaptureAttentionScenarios += 1;
    }
    if ((scenario.governanceContext?.autoCaptureCaptureBacklogCount || 0) > 0 || (scenario.governanceContext?.autoCaptureResponseBacklogCount || 0) > 0) {
      scenariosWithAutoCaptureBacklog += 1;
    }
    if ((scenario.governanceContext?.autoCaptureFailedRequestCount || 0) > 0) {
      scenariosWithAutoCaptureFailures += 1;
    }
  }

  return {
    generatedAt,
    packageName,
    version,
    commands,
    profile,
    requestedTools,
    summary: {
      totalScenarios: scenarios.length,
      passedScenarios: scenarios.filter((scenario) => scenario.ok).length,
      failedScenarios: scenarios.filter((scenario) => !scenario.ok).length,
      fixtureScenarioCount: scenarios.filter((scenario) => scenario.targetType === "fixture").length,
      projectScenarioCount: scenarios.filter((scenario) => scenario.targetType === "project").length,
      strategies: sortObjectEntries(strategySummary).map(([strategy, count]) => ({ strategy, count })),
      fixtures: sortObjectEntries(fixtureSummary).map(([fixtureName, count]) => ({ fixtureName, count })),
      selectedTools: sortObjectEntries(selectedToolSummary).map(([toolName, count]) => ({ toolName, count })),
      selectedProjectProfiles: sortObjectEntries(selectedProjectProfileSummary).map(([projectProfile, count]) => ({ projectProfile, count })),
      projectProfileDecisions: sortObjectEntries(projectProfileDecisionSummary).map(([decision, count]) => ({ decision, count })),
      unresolvedProjectProfileDecisions,
      deferredProjectProfileDecisions,
      rejectedProjectProfileDecisions,
      pendingConversationReviews,
      scenariosWithPendingConversationReviews,
      warningLevelConversationRecords,
      scenariosWithWarningLevelConversationRecords,
      reviewLevelConversationRecords,
      captureLevelConversationRecords,
      recordsWithAdmissionMetadata,
      recordsWithGovernanceMetadata,
      scenariosWithReviewLevelConversationRecords,
      pendingWrapperProposals,
      scenariosWithPendingWrapperProposals,
      overdueGovernanceReviews,
      dueTodayGovernanceReviews,
      scenariosWithOverdueGovernanceReviews,
      pendingEvolutionProposalReviews,
      scenariosWithPendingEvolutionProposalReviews,
      acceptedEvolutionProposals,
      scenariosWithAcceptedEvolutionProposals,
      highRiskEvolutionProposals,
      staleEvolutionProposalReviews,
      scenariosWithStaleEvolutionProposalReviews,
      staleAcceptedEvolutionProposals,
      scenariosWithStaleAcceptedEvolutionProposals,
      appliedEvolutionProposalFollowUps,
      scenariosWithAppliedEvolutionProposalFollowUps,
      appliedEvolutionProposalFollowUpActionCount,
      appliedWrapperPromotionDrafts,
      appliedSharedSkillDrafts,
      appliedReleaseImpactDrafts,
      autoCaptureWarningScenarios,
      autoCaptureAttentionScenarios,
      autoCaptureCaptureBacklog,
      autoCaptureResponseBacklog,
      autoCaptureFailedRequests,
      scenariosWithAutoCaptureBacklog,
      scenariosWithAutoCaptureFailures
    },
    dimensions: {
      commandSet: commands,
      initStrategy: getInitStrategy(context),
      profiles: unique([profile]),
      requestedTools: requestedTools,
      selectedTools: unique(scenarios.flatMap((scenario) => scenario.selectedTools)),
      selectedProjectProfiles: unique(scenarios.map((scenario) => scenario.governanceContext?.selectedProjectProfile || "")),
      projectProfileDecisions: unique(scenarios.map((scenario) => scenario.governanceContext?.projectProfileDecision || "")),
      fixtures: unique(scenarios.map((scenario) => scenario.fixtureName))
    },
    scenarios
  };
}

export function buildConsumerCompatibilityMarkdown(matrix) {
  const lines = [
    "# Consumer Compatibility Matrix",
    "",
    `- package: \`${matrix.packageName}@${matrix.version}\``,
    `- generatedAt: \`${matrix.generatedAt}\``,
    `- total scenarios: ${matrix.summary.totalScenarios}`,
    `- passed scenarios: ${matrix.summary.passedScenarios}`,
    `- failed scenarios: ${matrix.summary.failedScenarios}`,
    `- init strategy: \`${matrix.dimensions.initStrategy || "unknown"}\``,
    `- command set: ${matrix.dimensions.commandSet.length > 0 ? matrix.dimensions.commandSet.map((item) => `\`${item}\``).join(", ") : "none"}`,
    ""
  ];

  lines.push("## Strategy Summary", "");
  if (matrix.summary.strategies.length === 0) {
    lines.push("- none");
  } else {
    for (const item of matrix.summary.strategies) {
      lines.push(`- ${item.strategy}: ${item.count}`);
    }
  }
  lines.push("");

  lines.push("## Governance Summary", "");
  lines.push(`- unresolved project profile decisions: ${matrix.summary.unresolvedProjectProfileDecisions || 0}`);
  lines.push(`- deferred project profile decisions: ${matrix.summary.deferredProjectProfileDecisions || 0}`);
  lines.push(`- rejected project profile decisions: ${matrix.summary.rejectedProjectProfileDecisions || 0}`);
  lines.push(`- pending conversation reviews: ${matrix.summary.pendingConversationReviews || 0}`);
  lines.push(`- scenarios with pending conversation reviews: ${matrix.summary.scenariosWithPendingConversationReviews || 0}`);
  lines.push(`- warning-level conversation records: ${matrix.summary.warningLevelConversationRecords || 0}`);
  lines.push(`- scenarios with warning-level conversation records: ${matrix.summary.scenariosWithWarningLevelConversationRecords || 0}`);
  lines.push(`- review-level conversation records: ${matrix.summary.reviewLevelConversationRecords || 0}`);
  lines.push(`- capture-level conversation records: ${matrix.summary.captureLevelConversationRecords || 0}`);
  lines.push(`- records with admission metadata: ${matrix.summary.recordsWithAdmissionMetadata || 0}`);
  lines.push(`- records with governance metadata: ${matrix.summary.recordsWithGovernanceMetadata || 0}`);
  lines.push(`- scenarios with review-level conversation records: ${matrix.summary.scenariosWithReviewLevelConversationRecords || 0}`);
  lines.push(`- pending wrapper proposals: ${matrix.summary.pendingWrapperProposals || 0}`);
  lines.push(`- scenarios with pending wrapper proposals: ${matrix.summary.scenariosWithPendingWrapperProposals || 0}`);
  lines.push(`- overdue governance reviews: ${matrix.summary.overdueGovernanceReviews || 0}`);
  lines.push(`- due today governance reviews: ${matrix.summary.dueTodayGovernanceReviews || 0}`);
  lines.push(`- scenarios with overdue governance reviews: ${matrix.summary.scenariosWithOverdueGovernanceReviews || 0}`);
  lines.push(`- pending evolution proposal reviews: ${matrix.summary.pendingEvolutionProposalReviews || 0}`);
  lines.push(`- scenarios with pending evolution proposal reviews: ${matrix.summary.scenariosWithPendingEvolutionProposalReviews || 0}`);
  lines.push(`- accepted evolution proposals: ${matrix.summary.acceptedEvolutionProposals || 0}`);
  lines.push(`- scenarios with accepted evolution proposals: ${matrix.summary.scenariosWithAcceptedEvolutionProposals || 0}`);
  lines.push(`- high-risk evolution proposals: ${matrix.summary.highRiskEvolutionProposals || 0}`);
  lines.push(`- stale evolution proposal reviews: ${matrix.summary.staleEvolutionProposalReviews || 0}`);
  lines.push(`- scenarios with stale evolution proposal reviews: ${matrix.summary.scenariosWithStaleEvolutionProposalReviews || 0}`);
  lines.push(`- stale accepted evolution proposals: ${matrix.summary.staleAcceptedEvolutionProposals || 0}`);
  lines.push(`- scenarios with stale accepted evolution proposals: ${matrix.summary.scenariosWithStaleAcceptedEvolutionProposals || 0}`);
  lines.push(`- applied evolution proposal follow-ups: ${matrix.summary.appliedEvolutionProposalFollowUps || 0}`);
  lines.push(`- scenarios with applied evolution proposal follow-ups: ${matrix.summary.scenariosWithAppliedEvolutionProposalFollowUps || 0}`);
  lines.push(`- applied evolution proposal next actions: ${matrix.summary.appliedEvolutionProposalFollowUpActionCount || 0}`);
  lines.push(`- applied wrapper drafts: ${matrix.summary.appliedWrapperPromotionDrafts || 0}`);
  lines.push(`- applied shared-skill drafts: ${matrix.summary.appliedSharedSkillDrafts || 0}`);
  lines.push(`- applied release-impact drafts: ${matrix.summary.appliedReleaseImpactDrafts || 0}`);
  lines.push(`- auto-capture warning scenarios: ${matrix.summary.autoCaptureWarningScenarios || 0}`);
  lines.push(`- auto-capture attention scenarios: ${matrix.summary.autoCaptureAttentionScenarios || 0}`);
  lines.push(`- auto-capture capture backlog: ${matrix.summary.autoCaptureCaptureBacklog || 0}`);
  lines.push(`- auto-capture response backlog: ${matrix.summary.autoCaptureResponseBacklog || 0}`);
  lines.push(`- auto-capture failed requests: ${matrix.summary.autoCaptureFailedRequests || 0}`);
  lines.push(`- scenarios with auto-capture backlog: ${matrix.summary.scenariosWithAutoCaptureBacklog || 0}`);
  lines.push(`- scenarios with auto-capture failures: ${matrix.summary.scenariosWithAutoCaptureFailures || 0}`);
  lines.push("");

  lines.push("## Scenario Results", "");
  if (matrix.scenarios.length === 0) {
    lines.push("- none");
  } else {
    for (const scenario of matrix.scenarios) {
      lines.push(`### ${scenario.scenarioLabel}`);
      lines.push(`- target type: \`${scenario.targetType}\``);
      lines.push(`- init strategy: \`${scenario.initStrategy}\``);
      lines.push(`- status: \`${scenario.ok ? "ok" : "failed"}\``);
      lines.push(`- doctor: \`${scenario.doctorOk ? "ok" : "failed"}\``);
      lines.push(`- artifacts: \`${scenario.artifactOk ? "ok" : "failed"}\``);
      lines.push(`- selected presets: ${scenario.selectedPresets.length > 0 ? scenario.selectedPresets.map((item) => `\`${item}\``).join(", ") : "none"}`);
      lines.push(`- selected tools: ${scenario.selectedTools.length > 0 ? scenario.selectedTools.map((item) => `\`${item}\``).join(", ") : "none"}`);
      lines.push(`- project profile decision: ${scenario.governanceContext?.projectProfileDecision ? `\`${scenario.governanceContext.projectProfileDecision}\`` : "none"}`);
      lines.push(`- project profile review status: ${scenario.governanceContext?.projectProfileDecisionReviewStatus ? `\`${scenario.governanceContext.projectProfileDecisionReviewStatus}\`` : "none"}`);
      lines.push(`- selected project profile: ${scenario.governanceContext?.selectedProjectProfile ? `\`${scenario.governanceContext.selectedProjectProfile}\`` : "none"}`);
      lines.push(`- recommended project profile: ${scenario.governanceContext?.recommendedProjectProfile ? `\`${scenario.governanceContext.recommendedProjectProfile}\`` : "none"}`);
      lines.push(`- overdue governance reviews: ${scenario.governanceContext?.overdueGovernanceReviews || 0}`);
      lines.push(`- due today governance reviews: ${scenario.governanceContext?.dueTodayGovernanceReviews || 0}`);
      lines.push(`- pending conversation reviews: ${scenario.governanceContext?.pendingConversationReviews || 0}`);
      lines.push(`- warning-level conversation records: ${scenario.governanceContext?.warningLevelConversationRecords || 0}`);
      lines.push(`- review-level conversation records: ${scenario.governanceContext?.reviewLevelConversationRecords || 0}`);
      lines.push(`- capture-level conversation records: ${scenario.governanceContext?.captureLevelConversationRecords || 0}`);
      lines.push(`- records with admission metadata: ${scenario.governanceContext?.recordsWithAdmissionMetadata || 0}`);
      lines.push(`- records with governance metadata: ${scenario.governanceContext?.recordsWithGovernanceMetadata || 0}`);
      lines.push(`- pending wrapper proposals: ${scenario.governanceContext?.pendingWrapperProposals || 0}`);
      lines.push(`- auto-capture status: ${scenario.governanceContext?.autoCaptureStatus ? `\`${scenario.governanceContext.autoCaptureStatus}\`` : "none"}`);
      lines.push(`- auto-capture activity: ${scenario.governanceContext?.autoCaptureActivityState ? `\`${scenario.governanceContext.autoCaptureActivityState}\`` : "none"}`);
      lines.push(`- auto-capture capture backlog: ${scenario.governanceContext?.autoCaptureCaptureBacklogCount || 0}`);
      lines.push(`- auto-capture response backlog: ${scenario.governanceContext?.autoCaptureResponseBacklogCount || 0}`);
      lines.push(`- auto-capture failed requests: ${scenario.governanceContext?.autoCaptureFailedRequestCount || 0}`);
      lines.push(`- evolution proposal reviews: ${scenario.governanceContext?.evolutionProposalReviewCount || 0}`);
      lines.push(`- accepted evolution proposals: ${scenario.governanceContext?.acceptedEvolutionProposals || 0}`);
      lines.push(`- high-risk evolution proposals: ${scenario.governanceContext?.highRiskEvolutionProposals || 0}`);
      lines.push(`- stale evolution proposal reviews: ${scenario.governanceContext?.staleEvolutionProposalReviews || 0}`);
      lines.push(`- stale accepted evolution proposals: ${scenario.governanceContext?.staleAcceptedEvolutionProposals || 0}`);
      lines.push(`- applied evolution proposal follow-ups: ${scenario.governanceContext?.appliedEvolutionProposalFollowUps || 0}`);
      lines.push(`- applied evolution proposal next actions: ${scenario.governanceContext?.appliedEvolutionProposalFollowUpActionCount || 0}`);
      lines.push(`- applied wrapper drafts: ${scenario.governanceContext?.appliedWrapperPromotionDrafts || 0}`);
      lines.push(`- applied shared-skill drafts: ${scenario.governanceContext?.appliedSharedSkillDrafts || 0}`);
      lines.push(`- applied release-impact drafts: ${scenario.governanceContext?.appliedReleaseImpactDrafts || 0}`);
      lines.push(`- failed commands: ${scenario.failedCommands.length > 0 ? scenario.failedCommands.map((item) => `\`${item}\``).join(", ") : "none"}`);
      lines.push(`- missing artifacts: ${scenario.missingArtifacts.length > 0 ? scenario.missingArtifacts.map((item) => `\`${item}\``).join(", ") : "none"}`);
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}
