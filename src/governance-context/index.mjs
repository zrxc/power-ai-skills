import fs from "node:fs";
import path from "node:path";
import { ensureDir, readJson, writeJson } from "../shared/fs.mjs";
import {
  buildEvolutionProposalAgingSummary,
  getDefaultEvolutionPolicy,
  normalizeEvolutionPolicy,
  summarizeAppliedEvolutionArtifacts,
  validateEvolutionPolicyConfig
} from "../evolution/index.mjs";

function readJsonIfExists(filePath) {
  return filePath && fs.existsSync(filePath) ? readJson(filePath) : null;
}

function collectConversationCaptureAdmissionSummary(conversationsRoot) {
  if (!fs.existsSync(conversationsRoot)) {
    return {
      totalConversationRecords: 0,
      reviewLevelConversationRecords: 0,
      captureLevelConversationRecords: 0,
      recordsWithAdmissionMetadata: 0,
      warningLevelConversationRecords: 0,
      blockingLevelConversationRecords: 0,
      recordsWithGovernanceMetadata: 0
    };
  }

  const summary = {
    totalConversationRecords: 0,
    reviewLevelConversationRecords: 0,
    captureLevelConversationRecords: 0,
    recordsWithAdmissionMetadata: 0,
    warningLevelConversationRecords: 0,
    blockingLevelConversationRecords: 0,
    recordsWithGovernanceMetadata: 0
  };

  const files = fs.readdirSync(conversationsRoot)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));

  for (const fileName of files) {
    const payload = readJson(path.join(conversationsRoot, fileName));
    const records = Array.isArray(payload?.records) ? payload.records : [];
    summary.totalConversationRecords += records.length;
    for (const record of records) {
      const admissionLevel = String(record?.captureAdmissionLevel || "").trim().toLowerCase();
      const governanceLevel = String(record?.captureSafetyGovernanceLevel || "").trim().toLowerCase();
      if (!admissionLevel) continue;
      summary.recordsWithAdmissionMetadata += 1;
      if (admissionLevel === "review") summary.reviewLevelConversationRecords += 1;
      if (admissionLevel === "capture") summary.captureLevelConversationRecords += 1;
      if (governanceLevel) summary.recordsWithGovernanceMetadata += 1;
      if (governanceLevel === "warning") summary.warningLevelConversationRecords += 1;
      if (governanceLevel === "blocking") summary.blockingLevelConversationRecords += 1;
    }
  }

  return summary;
}

function listActiveWrapperProposals(proposalsRoot) {
  if (!fs.existsSync(proposalsRoot)) return [];
  return fs.readdirSync(proposalsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const promotionRoot = path.join(proposalsRoot, entry.name);
      const proposalPath = path.join(promotionRoot, "wrapper-promotion.json");
      if (!fs.existsSync(proposalPath)) return null;
      const proposal = readJson(proposalPath);
      return {
        toolName: proposal.toolName || entry.name,
        status: proposal.status || "draft",
        followUpStatus: proposal.followUpStatus || "not-started",
        registrationStatus: proposal.registrationStatus || "not-registered",
        archiveStatus: proposal.archiveStatus || "active",
        promotionRoot,
        proposalPath
      };
    })
    .filter(Boolean);
}

function resolveConversationMinerStrategy(config) {
  if (!config || typeof config !== "object") {
    return {
      projectType: "",
      displayName: "",
      captureMode: "",
      autoCaptureEnabled: false
    };
  }

  return {
    projectType: config.strategy?.projectType || "",
    displayName: config.strategy?.displayName || "",
    captureMode: config.capture?.mode || "",
    autoCaptureEnabled: Boolean(config.autoCapture?.enabled)
  };
}

export function createGovernanceContextService({
  context,
  projectRoot,
  workspaceService,
  selectionService,
  teamPolicyService,
  conversationMinerService
}) {
  function resolveCurrentSelection() {
    try {
      return selectionService.resolveSelection({
        allowLegacyInference: true,
        ignoreExplicit: true
      });
    } catch {
      return {
        mode: "unresolved",
        selectedProjectProfile: "",
        selectedTools: [],
        expandedTools: [],
        requiredSkills: context.teamPolicy.requiredSkills || []
      };
    }
  }

  function getContextPaths() {
    const { powerAiRoot, contextRoot, projectGovernanceContextTarget } = workspaceService.getPowerAiPaths();
    const reportsRoot = workspaceService.getReportsRoot();
    return {
      powerAiRoot,
      contextRoot,
      projectGovernanceContextTarget,
      reportsRoot,
      conversationMinerConfigPath: path.join(powerAiRoot, "conversation-miner-config.json"),
      conversationsRoot: path.join(powerAiRoot, "conversations"),
      conversationDecisionsPath: path.join(powerAiRoot, "governance", "conversation-decisions.json"),
      evolutionCandidatesPath: path.join(powerAiRoot, "governance", "evolution-candidates.json"),
      evolutionActionsPath: path.join(powerAiRoot, "governance", "evolution-actions.json"),
      evolutionProposalsPath: path.join(powerAiRoot, "governance", "evolution-proposals.json"),
      wrapperPromotionsRoot: path.join(powerAiRoot, "proposals", "wrapper-promotions"),
      projectBaselineJsonPath: path.join(reportsRoot, "project-baseline.json"),
      teamPolicyDriftJsonPath: path.join(reportsRoot, "team-policy-drift.json")
      ,
      evolutionPolicyPath: path.join(powerAiRoot, "evolution-policy.json")
    };
  }

  function loadProjectGovernanceContext({ refreshIfMissing = false } = {}) {
    const { projectGovernanceContextTarget } = getContextPaths();
    if (fs.existsSync(projectGovernanceContextTarget)) {
      return readJson(projectGovernanceContextTarget);
    }
    if (!refreshIfMissing) return null;
    return refreshProjectGovernanceContext({ trigger: "load-missing" });
  }

  function buildProjectGovernanceContext({ baselineStatus = "", trigger = "manual" } = {}) {
    const paths = getContextPaths();
    const currentSelection = resolveCurrentSelection();
    const recommendation = selectionService.detectProjectProfileRecommendation
      ? selectionService.detectProjectProfileRecommendation()
      : {
        recommendedProjectProfile: "",
        source: "none",
        reason: "",
        signals: {}
      };
    const projectProfileDecision = teamPolicyService?.buildProjectProfileDecisionState
      ? teamPolicyService.buildProjectProfileDecisionState({
        selection: currentSelection,
        recommendation
      })
      : {
        decision: "auto-recommended",
        decisionReason: "",
        nextReviewAt: ""
      };
    const teamPolicyDrift = teamPolicyService?.buildTeamPolicyDriftReport
      ? teamPolicyService.buildTeamPolicyDriftReport()
      : null;
    const baselineReport = readJsonIfExists(paths.projectBaselineJsonPath);
    const conversationDecisions = readJsonIfExists(paths.conversationDecisionsPath);
    const reviewItems = Array.isArray(conversationDecisions?.decisions)
      ? conversationDecisions.decisions.filter((item) => item.decision === "review")
      : [];
    const wrapperProposals = listActiveWrapperProposals(paths.wrapperPromotionsRoot);
    const pendingWrapperProposals = wrapperProposals.filter((proposal) => (
      (proposal.archiveStatus || "active") !== "archived"
      && (proposal.registrationStatus || "not-registered") !== "registered"
    ));
    const conversationMinerConfig = readJsonIfExists(paths.conversationMinerConfigPath);
    const conversationCaptureAdmissions = collectConversationCaptureAdmissionSummary(paths.conversationsRoot);
    const strategy = resolveConversationMinerStrategy(conversationMinerConfig);
    const autoCaptureRuntime = conversationMinerService?.collectAutoCaptureRuntimeStatus
      ? conversationMinerService.collectAutoCaptureRuntimeStatus({})
      : null;
    const captureSafetyPolicy = conversationMinerService?.collectCaptureSafetyPolicyStatus
      ? conversationMinerService.collectCaptureSafetyPolicyStatus()
      : null;
    const captureRetention = conversationMinerService?.collectCaptureRetentionStatus
      ? conversationMinerService.collectCaptureRetentionStatus()
      : null;
    const evolutionPolicyRaw = readJsonIfExists(paths.evolutionPolicyPath);
    const evolutionPolicy = evolutionPolicyRaw
      ? normalizeEvolutionPolicy(evolutionPolicyRaw)
      : getDefaultEvolutionPolicy();
    const evolutionPolicyValidation = validateEvolutionPolicyConfig(evolutionPolicyRaw || evolutionPolicy);
    const evolutionCandidates = readJsonIfExists(paths.evolutionCandidatesPath);
    const evolutionActions = readJsonIfExists(paths.evolutionActionsPath);
    const evolutionProposals = readJsonIfExists(paths.evolutionProposalsPath);
    const evolutionCandidateSummary = Array.isArray(evolutionCandidates?.candidates)
      ? evolutionCandidates.candidates.reduce((summary, item) => {
          summary.total += 1;
          if (item.status === "review") summary.review += 1;
          if (item.riskLevel === "high") summary.highRisk += 1;
          if (item.candidateType === "project-local-skill-draft") summary.projectLocalSkillDrafts += 1;
          if (item.candidateType === "wrapper-proposal-candidate") summary.wrapperProposalCandidates += 1;
          if (item.candidateType === "profile-adjustment-candidate") summary.profileAdjustmentCandidates += 1;
          return summary;
        }, {
          total: 0,
          review: 0,
          highRisk: 0,
          projectLocalSkillDrafts: 0,
          wrapperProposalCandidates: 0,
          profileAdjustmentCandidates: 0
        })
      : {
          total: 0,
          review: 0,
          highRisk: 0,
          projectLocalSkillDrafts: 0,
          wrapperProposalCandidates: 0,
          profileAdjustmentCandidates: 0
        };
    const evolutionActionSummary = Array.isArray(evolutionActions?.actions)
      ? evolutionActions.actions.reduce((summary, item) => {
          summary.total += 1;
          if (item.status === "executed") summary.executed += 1;
          if (item.status === "failed") summary.failed += 1;
          if (item.actionType === "refresh-project-local-skill-draft") summary.projectLocalSkillRefreshes += 1;
          return summary;
        }, {
          total: 0,
          executed: 0,
          failed: 0,
          projectLocalSkillRefreshes: 0
        })
      : {
          total: 0,
          executed: 0,
          failed: 0,
        projectLocalSkillRefreshes: 0
      };
    const evolutionProposalAging = Array.isArray(evolutionProposals?.proposals)
      ? buildEvolutionProposalAgingSummary(evolutionProposals.proposals)
      : buildEvolutionProposalAgingSummary([]);
    const appliedEvolutionArtifacts = summarizeAppliedEvolutionArtifacts(
      Array.isArray(evolutionProposals?.proposals) ? evolutionProposals.proposals : []
    );
    const evolutionProposalSummary = Array.isArray(evolutionProposals?.proposals)
      ? evolutionProposals.proposals.reduce((summary, item) => {
          summary.total += 1;
          if (item.status === "review") summary.review += 1;
          if (item.status === "accepted") summary.accepted += 1;
          if (item.status === "rejected") summary.rejected += 1;
          if (item.status === "applied") summary.applied += 1;
          if (item.status === "archived") summary.archived += 1;
          if (item.riskLevel === "high") summary.highRisk += 1;
          if (item.proposalType === "project-profile-adjustment-proposal") summary.profileAdjustments += 1;
          if (item.proposalType === "wrapper-rollout-adjustment-proposal") summary.wrapperAdjustments += 1;
          if (item.proposalType === "shared-skill-promotion-proposal") summary.sharedSkillPromotions += 1;
          if (item.proposalType === "release-impact-escalation-proposal") summary.releaseEscalations += 1;
          return summary;
        }, {
          total: 0,
          review: 0,
          accepted: 0,
          rejected: 0,
          applied: 0,
          archived: 0,
          highRisk: 0,
          profileAdjustments: 0,
          wrapperAdjustments: 0,
          sharedSkillPromotions: 0,
          releaseEscalations: 0,
          appliedProjectProfileSelections: 0,
          appliedWrapperPromotionDrafts: 0,
          appliedSharedSkillDrafts: 0,
          appliedReleaseImpactDrafts: 0,
          appliedDraftsWithFollowUps: 0,
          followUpActionCount: 0,
          nextActionPreview: [],
          followUpDraftPreview: [],
          staleReview: evolutionProposalAging.staleReview,
          staleAcceptedPendingApply: evolutionProposalAging.staleAcceptedPendingApply,
          oldestReviewAgeDays: evolutionProposalAging.oldestReviewAgeDays,
          oldestAcceptedAgeDays: evolutionProposalAging.oldestAcceptedAgeDays,
          reviewSlaDays: evolutionProposalAging.reviewSlaDays,
          acceptedApplySlaDays: evolutionProposalAging.acceptedApplySlaDays
        })
      : {
          total: 0,
          review: 0,
          accepted: 0,
          rejected: 0,
          applied: 0,
          archived: 0,
          highRisk: 0,
          profileAdjustments: 0,
          wrapperAdjustments: 0,
          sharedSkillPromotions: 0,
          releaseEscalations: 0,
          appliedProjectProfileSelections: 0,
          appliedWrapperPromotionDrafts: 0,
          appliedSharedSkillDrafts: 0,
          appliedReleaseImpactDrafts: 0,
          appliedDraftsWithFollowUps: 0,
          followUpActionCount: 0,
          nextActionPreview: [],
          followUpDraftPreview: [],
          staleReview: evolutionProposalAging.staleReview,
          staleAcceptedPendingApply: evolutionProposalAging.staleAcceptedPendingApply,
          oldestReviewAgeDays: evolutionProposalAging.oldestReviewAgeDays,
          oldestAcceptedAgeDays: evolutionProposalAging.oldestAcceptedAgeDays,
          reviewSlaDays: evolutionProposalAging.reviewSlaDays,
          acceptedApplySlaDays: evolutionProposalAging.acceptedApplySlaDays
        };
    evolutionProposalSummary.appliedProjectProfileSelections = appliedEvolutionArtifacts.appliedProjectProfileSelections;
    evolutionProposalSummary.appliedWrapperPromotionDrafts = appliedEvolutionArtifacts.appliedWrapperPromotionDrafts;
    evolutionProposalSummary.appliedSharedSkillDrafts = appliedEvolutionArtifacts.appliedSharedSkillDrafts;
    evolutionProposalSummary.appliedReleaseImpactDrafts = appliedEvolutionArtifacts.appliedReleaseImpactDrafts;
    evolutionProposalSummary.appliedDraftsWithFollowUps = appliedEvolutionArtifacts.appliedDraftsWithFollowUps;
    evolutionProposalSummary.followUpActionCount = appliedEvolutionArtifacts.followUpActionCount;
    evolutionProposalSummary.nextActionPreview = appliedEvolutionArtifacts.nextActionPreview;
    evolutionProposalSummary.followUpDraftPreview = appliedEvolutionArtifacts.followUpDraftPreview;

    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      trigger,
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      selectionMode: currentSelection.mode || "unknown",
      selectedProjectProfile: currentSelection.selectedProjectProfile || "",
      recommendedProjectProfile: recommendation.recommendedProjectProfile || "",
      projectProfileDecision: projectProfileDecision.decision || "auto-recommended",
      projectProfileDecisionReason: projectProfileDecision.decisionReason || "",
      projectProfileDecisionReviewAt: projectProfileDecision.nextReviewAt || "",
      projectProfileDecisionReviewStatus: projectProfileDecision.reviewStatus || "not-scheduled",
      projectProfileDecisionReviewOverdue: Boolean(projectProfileDecision.reviewOverdue),
      teamPolicyVersion: context.packageJson.version,
      allowedTools: context.teamPolicy.allowedTools || [],
      requiredSkills: currentSelection.requiredSkills || context.teamPolicy.requiredSkills || [],
      selectedTools: currentSelection.selectedTools || [],
      expandedTools: currentSelection.expandedTools || [],
      conversationMinerStrategy: {
        ...strategy,
        configPath: paths.conversationMinerConfigPath,
        exists: Boolean(conversationMinerConfig)
      },
      conversationCaptureAdmissions,
      autoCaptureRuntime: autoCaptureRuntime
        ? {
            status: autoCaptureRuntime.status,
            activityState: autoCaptureRuntime.summary.activityState,
            enabled: autoCaptureRuntime.summary.autoCaptureEnabled,
            captureBacklogCount: autoCaptureRuntime.summary.captureBacklogCount,
            responseBacklogCount: autoCaptureRuntime.summary.responseBacklogCount,
            failedRequestCount: autoCaptureRuntime.summary.failedRequestCount,
            staleQueuedCaptureCount: autoCaptureRuntime.summary.staleQueuedCaptureCount,
            staleQueuedResponseCount: autoCaptureRuntime.summary.staleQueuedResponseCount,
            lastActivityAt: autoCaptureRuntime.summary.lastActivityAt,
            configPath: autoCaptureRuntime.configuration.configPath,
            bridgeContractReady: autoCaptureRuntime.bridgeCoverage?.summary?.bridgeContractReady || false,
            bridgeContractJsonPath: autoCaptureRuntime.bridgeCoverage?.bridgeContract?.jsonPath || "",
            bridgeContractMarkdownPath: autoCaptureRuntime.bridgeCoverage?.bridgeContract?.markdownPath || "",
            reportPath: path.join(paths.reportsRoot, "auto-capture-runtime.md"),
            jsonPath: path.join(paths.reportsRoot, "auto-capture-runtime.json")
          }
        : null,
      captureSafetyPolicy: captureSafetyPolicy
        ? {
            ...captureSafetyPolicy
          }
        : null,
      captureRetention: captureRetention
        ? {
            status: captureRetention.status,
            policyEnabled: captureRetention.policyEnabled,
            policyPath: captureRetention.policyPath,
            autoArchiveDays: captureRetention.summary.autoArchiveDays,
            autoPruneDays: captureRetention.summary.autoPruneDays,
            activeFileCount: captureRetention.summary.activeFileCount,
            archivedFileCount: captureRetention.summary.archivedFileCount,
            archiveCandidateCount: captureRetention.summary.archiveCandidateCount,
            pruneCandidateCount: captureRetention.summary.pruneCandidateCount,
            reportPath: captureRetention.reportPath,
            jsonPath: captureRetention.jsonPath
          }
        : null,
      evolutionPolicy: {
        ...evolutionPolicy,
        exists: Boolean(evolutionPolicyRaw),
        source: evolutionPolicyRaw ? "project" : "default",
        policyPath: paths.evolutionPolicyPath,
        validationOk: evolutionPolicyValidation.ok,
        warningCount: evolutionPolicyValidation.summary.warningCount
      },
      evolutionCandidates: {
        ...evolutionCandidateSummary,
        updatedAt: evolutionCandidates?.updatedAt || "",
        candidatesPath: paths.evolutionCandidatesPath,
        exists: Boolean(evolutionCandidates)
      },
      evolutionActions: {
        ...evolutionActionSummary,
        updatedAt: evolutionActions?.updatedAt || "",
        actionsPath: paths.evolutionActionsPath,
        exists: Boolean(evolutionActions)
      },
      evolutionProposals: {
        ...evolutionProposalSummary,
        updatedAt: evolutionProposals?.updatedAt || "",
        proposalsPath: paths.evolutionProposalsPath,
        exists: Boolean(evolutionProposals)
      },
      baselineStatus: baselineStatus || baselineReport?.status || "not-run",
      baselineReportPath: paths.projectBaselineJsonPath,
      policyDriftStatus: teamPolicyDrift?.status || "unknown",
      policyDriftReportPath: paths.teamPolicyDriftJsonPath,
      overdueGovernanceReviews: projectProfileDecision.reviewOverdue ? 1 : 0,
      dueTodayGovernanceReviews: projectProfileDecision.reviewDue ? 1 : 0,
      nextGovernanceReviewAt: projectProfileDecision.nextReviewAt || "",
      governanceReviewReportPath: path.join(paths.reportsRoot, "governance-review-deadlines.json"),
      pendingConversationReviews: reviewItems.length,
      reviewLevelConversationRecords: conversationCaptureAdmissions.reviewLevelConversationRecords || 0,
      captureLevelConversationRecords: conversationCaptureAdmissions.captureLevelConversationRecords || 0,
      recordsWithAdmissionMetadata: conversationCaptureAdmissions.recordsWithAdmissionMetadata || 0,
      warningLevelConversationRecords: conversationCaptureAdmissions.warningLevelConversationRecords || 0,
      blockingLevelConversationRecords: conversationCaptureAdmissions.blockingLevelConversationRecords || 0,
      recordsWithGovernanceMetadata: conversationCaptureAdmissions.recordsWithGovernanceMetadata || 0,
      pendingConversationPatternIds: reviewItems.map((item) => item.patternId),
      pendingWrapperProposals: pendingWrapperProposals.length,
      pendingWrapperTools: pendingWrapperProposals.map((proposal) => proposal.toolName),
      contextPath: paths.projectGovernanceContextTarget
    };
  }

  function writeProjectGovernanceContext(payload) {
    const { contextRoot, projectGovernanceContextTarget } = getContextPaths();
    ensureDir(contextRoot);
    writeJson(projectGovernanceContextTarget, payload);
    return {
      ...payload,
      contextPath: projectGovernanceContextTarget
    };
  }

  function refreshProjectGovernanceContext(options = {}) {
    return writeProjectGovernanceContext(buildProjectGovernanceContext(options));
  }

  function showProjectGovernanceContext() {
    return refreshProjectGovernanceContext({ trigger: "show-project-governance-context" });
  }

  return {
    getContextPaths,
    loadProjectGovernanceContext,
    buildProjectGovernanceContext,
    writeProjectGovernanceContext,
    refreshProjectGovernanceContext,
    showProjectGovernanceContext
  };
}
