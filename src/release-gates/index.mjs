import fs from "node:fs";
import path from "node:path";
import { readJson } from "../shared/fs.mjs";
import { buildWrapperRegistryGovernancePayload } from "../conversation-miner/wrapper-registry-governance.mjs";
import { supportedCaptureWrappers } from "../conversation-miner/wrappers.mjs";
import { createConsumerReleaseInputs } from "./consumer-release-inputs.mjs";

function isValidDate(value) {
  return Number.isFinite(Date.parse(value || ""));
}

function getLatestProposalEvent(proposal) {
  const candidates = [
    { type: "generated", at: proposal.generatedAt || "" },
    { type: "reviewed", at: proposal.reviewedAt || "" },
    { type: "materialized", at: proposal.materializedAt || "" },
    { type: "applied", at: proposal.appliedAt || "" },
    { type: "finalized", at: proposal.finalizedAt || "" },
    { type: "registered", at: proposal.registeredAt || "" },
    { type: "archived", at: proposal.archivedAt || "" },
    { type: "restored", at: proposal.restoredAt || "" }
  ].filter((item) => isValidDate(item.at));

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) => Date.parse(left.at) - Date.parse(right.at))[candidates.length - 1];
}

function collectWrapperPromotionEntries(rootDir, archived) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  return fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const promotionRoot = path.join(rootDir, entry.name);
      const proposalPath = path.join(promotionRoot, "wrapper-promotion.json");
      if (!fs.existsSync(proposalPath)) {
        return null;
      }

      const proposal = readJson(proposalPath);
      return {
        toolName: proposal.toolName,
        displayName: proposal.displayName,
        integrationStyle: proposal.integrationStyle,
        generatedAt: proposal.generatedAt || "",
        status: proposal.status || "draft",
        materializationStatus: proposal.materializationStatus || "not-generated",
        applicationStatus: proposal.applicationStatus || "not-applied",
        followUpStatus: proposal.followUpStatus || "not-started",
        registrationStatus: proposal.registrationStatus || "not-registered",
        archiveStatus: proposal.archiveStatus || (archived ? "archived" : "active"),
        pendingFollowUps: proposal.pendingFollowUps || [],
        archived,
        promotionRoot,
        lastEvent: getLatestProposalEvent(proposal)
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.toolName.localeCompare(right.toolName, "zh-CN"));
}

export function collectWrapperRegistryGovernance({ projectRoot, staleDays = 14 }) {
  const proposalsRoot = path.join(projectRoot, ".power-ai", "proposals");
  const wrapperPromotionsRoot = path.join(proposalsRoot, "wrapper-promotions");
  const wrapperPromotionsArchiveRoot = path.join(proposalsRoot, "wrapper-promotions-archive");
  const proposals = [
    ...collectWrapperPromotionEntries(wrapperPromotionsRoot, false),
    ...collectWrapperPromotionEntries(wrapperPromotionsArchiveRoot, true)
  ];

  return buildWrapperRegistryGovernancePayload({
    generatedAt: new Date().toISOString(),
    staleDays,
    registeredWrappers: supportedCaptureWrappers,
    proposals
  });
}

function createGate({ id, title, ok, blocking, details, remediation }) {
  return {
    id,
    title,
    status: ok ? "pass" : (blocking ? "fail" : "warn"),
    ok,
    blocking,
    details,
    remediation
  };
}

export function buildReleaseGateReport({
  packageName,
  version,
  generatedAt,
  consistency,
  wrapperGovernance,
  compatibilityMatrix,
  consumerReleaseInputs = null,
  teamPolicyValidation = null,
  teamPolicyReleasePolicies = null,
  requireConsumerMatrix = false
}) {
  const wrapperBlockers = {
    readyForRegistration: wrapperGovernance?.summary?.readyForRegistration || 0,
    pendingFollowUps: wrapperGovernance?.summary?.pendingFollowUps || 0,
    stalledProposalCount: wrapperGovernance?.summary?.stalledProposalCount || 0
  };
  const wrapperGateOk = Object.values(wrapperBlockers).every((count) => count === 0);
  const effectiveRequireConsumerMatrix = teamPolicyReleasePolicies?.enforceConsumerMatrix ?? requireConsumerMatrix;
  const resolvedConsumerReleaseInputs = consumerReleaseInputs || createConsumerReleaseInputs({
    matrix: compatibilityMatrix,
    requireConsumerMatrix: effectiveRequireConsumerMatrix
  });
  const matrixAvailable = resolvedConsumerReleaseInputs.available;
  const consumerFailedScenarios = resolvedConsumerReleaseInputs.compatibility.failedScenarioCount;
  const {
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
  } = resolvedConsumerReleaseInputs.governance;
  const effectiveConsumerGateOk = effectiveRequireConsumerMatrix
    ? matrixAvailable && consumerFailedScenarios === 0
    : (!matrixAvailable || consumerFailedScenarios === 0);
  const teamPolicyGateOk = teamPolicyValidation ? teamPolicyValidation.ok : true;

  const gates = [
    createGate({
      id: "release-artifact-consistency",
      title: "release artifacts consistent",
      ok: consistency.ok,
      blocking: true,
      details: {
        stdout: consistency.stdout || "",
        stderr: consistency.stderr || ""
      },
      remediation: "Run `pnpm refresh:release-artifacts` and `pnpm check:release-consistency` before re-running release gates."
    }),
    createGate({
      id: "wrapper-promotion-governance",
      title: "wrapper promotion governance clean",
      ok: wrapperGateOk,
      blocking: true,
      details: {
        readyForRegistration: wrapperBlockers.readyForRegistration,
        pendingFollowUps: wrapperBlockers.pendingFollowUps,
        stalledProposalCount: wrapperBlockers.stalledProposalCount
      },
      remediation: "Finalize, register, or clean up active wrapper promotion proposals before release."
    }),
    createGate({
      id: "team-policy-governance",
      title: "team policy governance valid",
      ok: teamPolicyGateOk,
      blocking: true,
      details: {
        available: Boolean(teamPolicyValidation),
        errorCount: teamPolicyValidation?.summary?.errorCount || 0,
        warningCount: teamPolicyValidation?.summary?.warningCount || 0,
        enforceConsumerMatrix: teamPolicyReleasePolicies?.enforceConsumerMatrix ?? null,
        enforceReleaseGates: teamPolicyReleasePolicies?.enforceReleaseGates ?? null
      },
      remediation: "Run `npx power-ai-skills validate-team-policy --json` and fix `config/team-policy.json` before release."
    }),
    createGate({
      id: "consumer-compatibility",
      title: effectiveRequireConsumerMatrix ? "consumer compatibility matrix green" : "consumer compatibility matrix has no failures",
      ok: effectiveConsumerGateOk,
      blocking: true,
      details: {
        required: effectiveRequireConsumerMatrix,
        available: matrixAvailable,
        scenarioCount: resolvedConsumerReleaseInputs.compatibility.scenarioCount,
        passedScenarios: resolvedConsumerReleaseInputs.compatibility.passedScenarioCount,
        failedScenarios: consumerFailedScenarios
      },
      remediation: effectiveRequireConsumerMatrix
        ? "Generate the consumer compatibility matrix and fix failed scenarios before release."
        : "Fix failed consumer compatibility scenarios before release."
    }),
    createGate({
      id: "project-profile-decision-governance",
      title: "project profile recommendations are reviewed",
      ok: unresolvedProjectProfileDecisions === 0,
      blocking: false,
      details: {
        available: matrixAvailable,
        unresolvedProjectProfileDecisions,
        deferredProjectProfileDecisions,
        rejectedProjectProfileDecisions
      },
      remediation: "Review unresolved project profile recommendations in consumer workspaces and persist accepted, rejected, or deferred decisions before broad rollout."
    }),
    createGate({
      id: "conversation-review-governance",
      title: "conversation review backlog is acknowledged",
      ok: pendingConversationReviews === 0,
      blocking: false,
      details: {
        available: matrixAvailable,
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
        scenariosWithPendingWrapperProposals
      },
      remediation: "Review pending conversation-pattern decisions and wrapper follow-ups so conversation-derived changes are intentionally promoted or archived."
    }),
    createGate({
      id: "conversation-capture-warning-governance",
      title: "warning-level conversation captures are acknowledged",
      ok: warningLevelConversationRecords === 0,
      blocking: false,
      details: {
        available: matrixAvailable,
        warningLevelConversationRecords,
        scenariosWithWarningLevelConversationRecords,
        reviewLevelConversationRecords,
        captureLevelConversationRecords,
        recordsWithAdmissionMetadata,
        recordsWithGovernanceMetadata
      },
      remediation: "Acknowledge consumer conversation records marked with `captureSafetyGovernanceLevel=warning` before low-signal captures are treated as strong self-evolution evidence."
    }),
    createGate({
      id: "conversation-capture-admission-governance",
      title: "review-level conversation captures are triaged",
      ok: reviewLevelConversationRecords === 0,
      blocking: false,
      details: {
        available: matrixAvailable,
        warningLevelConversationRecords,
        scenariosWithWarningLevelConversationRecords,
        reviewLevelConversationRecords,
        captureLevelConversationRecords,
        recordsWithAdmissionMetadata,
        recordsWithGovernanceMetadata,
        scenariosWithReviewLevelConversationRecords
      },
      remediation: "Review consumer conversation records marked with `captureAdmissionLevel=review` before trusting them as self-evolution evidence."
    }),
    createGate({
      id: "evolution-proposal-governance",
      title: "evolution proposal backlog is governed",
      ok: pendingEvolutionProposalReviews === 0
        && acceptedEvolutionProposals === 0
        && appliedEvolutionProposalFollowUps === 0,
      blocking: false,
      details: {
        available: matrixAvailable,
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
        appliedReleaseImpactDrafts
      },
      remediation: "Review, apply, or continue the follow-up actions of evolution proposals so high-risk self-evolution changes and their downstream draft artifacts do not stay in limbo."
    }),
    createGate({
      id: "auto-capture-runtime-governance",
      title: "auto-capture runtime backlog is healthy",
      ok: autoCaptureFailedRequests === 0 && autoCaptureAttentionScenarios === 0 && autoCaptureCaptureBacklog === 0 && autoCaptureResponseBacklog === 0,
      blocking: false,
      details: {
        available: matrixAvailable,
        autoCaptureWarningScenarios,
        autoCaptureAttentionScenarios,
        autoCaptureCaptureBacklog,
        autoCaptureResponseBacklog,
        autoCaptureFailedRequests,
        scenariosWithAutoCaptureBacklog,
        scenariosWithAutoCaptureFailures
      },
      remediation: "Run `npx power-ai-skills check-auto-capture-runtime --json` in affected consumer workspaces and clear failed queues or backlog before relying on self-evolution intake."
    })
  ];

  const blockingFailures = gates.filter((gate) => gate.status === "fail");
  const warningGates = gates.filter((gate) => gate.status === "warn");
  const recommendedActions = [
    ...blockingFailures.map((gate) => gate.remediation),
    ...warningGates.map((gate) => gate.remediation),
    ...(wrapperGovernance?.recommendedActions || []),
    ...(consumerFailedScenarios > 0
      ? ["Investigate failed consumer compatibility matrix scenarios before promoting the current release."]
      : []),
    ...(unresolvedProjectProfileDecisions > 0
      ? ["Run `npx power-ai-skills show-project-profile-decision --json` and record an accepted, rejected, or deferred project profile decision for drifting consumer projects."]
      : []),
    ...(pendingConversationReviews > 0
      ? ["Clear or intentionally defer conversation-pattern review backlog before rolling the release out broadly."]
      : []),
    ...(warningLevelConversationRecords > 0
      ? ["Acknowledge warning-level capture safety records before low-signal captures are treated as durable self-evolution evidence."]
      : []),
    ...(reviewLevelConversationRecords > 0
      ? ["Triage review-level conversation captures before promoting explanation-style intake into self-evolution candidates."]
      : []),
    ...((pendingEvolutionProposalReviews > 0 || acceptedEvolutionProposals > 0 || appliedEvolutionProposalFollowUps > 0)
      ? ["Run `npx power-ai-skills list-evolution-proposals --json`, then continue follow-up actions for applied proposal drafts before broad rollout."]
      : []),
    ...((autoCaptureFailedRequests > 0 || autoCaptureAttentionScenarios > 0 || autoCaptureCaptureBacklog > 0 || autoCaptureResponseBacklog > 0)
      ? ["Check consumer auto-capture runtime health and drain failed/backlogged queues so release governance is not working with stale intake."]
      : []),
    ...(!matrixAvailable && effectiveRequireConsumerMatrix
      ? ["Run `pnpm release:consumer-inputs` before release gating."]
      : [])
  ];

  return {
    packageName,
    version,
    generatedAt,
    overallStatus: blockingFailures.length > 0 ? "fail" : (warningGates.length > 0 ? "warn" : "pass"),
    summary: {
      totalGates: gates.length,
      passedGates: gates.filter((gate) => gate.status === "pass").length,
      warningGates: warningGates.length,
      failedGates: blockingFailures.length,
      blockingIssues: blockingFailures.length,
      teamPolicyErrorCount: teamPolicyValidation?.summary?.errorCount || 0,
      readyForRegistration: wrapperBlockers.readyForRegistration,
      pendingFollowUps: wrapperBlockers.pendingFollowUps,
      stalledProposalCount: wrapperBlockers.stalledProposalCount,
      failedCompatibilityScenarios: consumerFailedScenarios,
      unresolvedProjectProfileDecisions,
      deferredProjectProfileDecisions,
      rejectedProjectProfileDecisions,
      overdueGovernanceReviews,
      dueTodayGovernanceReviews,
      scenariosWithOverdueGovernanceReviews,
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
    gates,
    consistency,
    wrapperGovernance: {
      summary: wrapperGovernance?.summary || {},
      recommendedActions: wrapperGovernance?.recommendedActions || [],
      readyForRegistration: wrapperGovernance?.readyForRegistration || [],
      pendingFollowUps: wrapperGovernance?.pendingFollowUps || [],
      stalledProposals: wrapperGovernance?.stalledProposals || []
    },
    compatibilityMatrix: matrixAvailable
      ? {
          required: effectiveRequireConsumerMatrix,
          available: true,
          scenarioCount: resolvedConsumerReleaseInputs.compatibility.scenarioCount,
          passedScenarioCount: resolvedConsumerReleaseInputs.compatibility.passedScenarioCount,
          failedScenarioCount: consumerFailedScenarios
        }
      : {
          required: effectiveRequireConsumerMatrix,
          available: false,
          scenarioCount: 0,
          passedScenarioCount: 0,
          failedScenarioCount: 0
        },
    governance: {
      matrixAvailable,
      unresolvedProjectProfileDecisions,
      deferredProjectProfileDecisions,
      rejectedProjectProfileDecisions,
      overdueGovernanceReviews,
      dueTodayGovernanceReviews,
      scenariosWithOverdueGovernanceReviews,
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
    teamPolicy: teamPolicyValidation
      ? {
          ok: teamPolicyValidation.ok,
          errorCount: teamPolicyValidation.summary.errorCount,
          warningCount: teamPolicyValidation.summary.warningCount,
          releasePolicies: teamPolicyReleasePolicies || null
        }
      : {
          ok: true,
          errorCount: 0,
          warningCount: 0,
          releasePolicies: teamPolicyReleasePolicies || null
        },
    recommendedActions: [...new Set(recommendedActions)]
  };
}

export function buildReleaseGateMarkdown(report) {
  const lines = [
    "# Release Gate Report",
    "",
    `- package: \`${report.packageName}@${report.version}\``,
    `- generatedAt: \`${report.generatedAt}\``,
    `- overall status: \`${report.overallStatus}\``,
    `- passed gates: ${report.summary.passedGates}`,
    `- warning gates: ${report.summary.warningGates || 0}`,
    `- failed gates: ${report.summary.failedGates}`,
    "",
    "## Gates",
    ""
  ];

  for (const gate of report.gates || []) {
    lines.push(`- \`${gate.id}\`: ${gate.status}`);
  }

  lines.push("", "## Wrapper Governance", "");
  lines.push(`- ready for registration: ${report.summary.readyForRegistration}`);
  lines.push(`- pending follow-ups: ${report.summary.pendingFollowUps}`);
  lines.push(`- stalled proposals: ${report.summary.stalledProposalCount}`);

  lines.push("", "## Consumer Compatibility", "");
  lines.push(`- required: ${report.compatibilityMatrix.required}`);
  lines.push(`- available: ${report.compatibilityMatrix.available}`);
  lines.push(`- scenarios: ${report.compatibilityMatrix.scenarioCount}`);
  lines.push(`- failed scenarios: ${report.compatibilityMatrix.failedScenarioCount}`);

  lines.push("", "## Governance", "");
  lines.push(`- unresolved project profile decisions: ${report.governance?.unresolvedProjectProfileDecisions || 0}`);
  lines.push(`- deferred project profile decisions: ${report.governance?.deferredProjectProfileDecisions || 0}`);
  lines.push(`- rejected project profile decisions: ${report.governance?.rejectedProjectProfileDecisions || 0}`);
  lines.push(`- overdue governance reviews: ${report.governance?.overdueGovernanceReviews || 0}`);
  lines.push(`- due today governance reviews: ${report.governance?.dueTodayGovernanceReviews || 0}`);
  lines.push(`- scenarios with overdue governance reviews: ${report.governance?.scenariosWithOverdueGovernanceReviews || 0}`);
  lines.push(`- pending conversation reviews: ${report.governance?.pendingConversationReviews || 0}`);
  lines.push(`- scenarios with pending conversation reviews: ${report.governance?.scenariosWithPendingConversationReviews || 0}`);
  lines.push(`- warning-level conversation records: ${report.governance?.warningLevelConversationRecords || 0}`);
  lines.push(`- scenarios with warning-level conversation records: ${report.governance?.scenariosWithWarningLevelConversationRecords || 0}`);
  lines.push(`- review-level conversation records: ${report.governance?.reviewLevelConversationRecords || 0}`);
  lines.push(`- capture-level conversation records: ${report.governance?.captureLevelConversationRecords || 0}`);
  lines.push(`- records with admission metadata: ${report.governance?.recordsWithAdmissionMetadata || 0}`);
  lines.push(`- records with governance metadata: ${report.governance?.recordsWithGovernanceMetadata || 0}`);
  lines.push(`- scenarios with review-level conversation records: ${report.governance?.scenariosWithReviewLevelConversationRecords || 0}`);
  lines.push(`- pending wrapper proposals: ${report.governance?.pendingWrapperProposals || 0}`);
  lines.push(`- scenarios with pending wrapper proposals: ${report.governance?.scenariosWithPendingWrapperProposals || 0}`);
  lines.push(`- pending evolution proposal reviews: ${report.governance?.pendingEvolutionProposalReviews || 0}`);
  lines.push(`- scenarios with pending evolution proposal reviews: ${report.governance?.scenariosWithPendingEvolutionProposalReviews || 0}`);
  lines.push(`- accepted evolution proposals: ${report.governance?.acceptedEvolutionProposals || 0}`);
  lines.push(`- scenarios with accepted evolution proposals: ${report.governance?.scenariosWithAcceptedEvolutionProposals || 0}`);
  lines.push(`- high-risk evolution proposals: ${report.governance?.highRiskEvolutionProposals || 0}`);
  lines.push(`- stale evolution proposal reviews: ${report.governance?.staleEvolutionProposalReviews || 0}`);
  lines.push(`- scenarios with stale evolution proposal reviews: ${report.governance?.scenariosWithStaleEvolutionProposalReviews || 0}`);
  lines.push(`- stale accepted evolution proposals: ${report.governance?.staleAcceptedEvolutionProposals || 0}`);
  lines.push(`- scenarios with stale accepted evolution proposals: ${report.governance?.scenariosWithStaleAcceptedEvolutionProposals || 0}`);
  lines.push(`- applied evolution proposal follow-ups: ${report.governance?.appliedEvolutionProposalFollowUps || 0}`);
  lines.push(`- scenarios with applied evolution proposal follow-ups: ${report.governance?.scenariosWithAppliedEvolutionProposalFollowUps || 0}`);
  lines.push(`- applied evolution proposal next actions: ${report.governance?.appliedEvolutionProposalFollowUpActionCount || 0}`);
  lines.push(`- applied wrapper drafts: ${report.governance?.appliedWrapperPromotionDrafts || 0}`);
  lines.push(`- applied shared-skill drafts: ${report.governance?.appliedSharedSkillDrafts || 0}`);
  lines.push(`- applied release-impact drafts: ${report.governance?.appliedReleaseImpactDrafts || 0}`);
  lines.push(`- auto-capture warning scenarios: ${report.governance?.autoCaptureWarningScenarios || 0}`);
  lines.push(`- auto-capture attention scenarios: ${report.governance?.autoCaptureAttentionScenarios || 0}`);
  lines.push(`- auto-capture capture backlog: ${report.governance?.autoCaptureCaptureBacklog || 0}`);
  lines.push(`- auto-capture response backlog: ${report.governance?.autoCaptureResponseBacklog || 0}`);
  lines.push(`- auto-capture failed requests: ${report.governance?.autoCaptureFailedRequests || 0}`);
  lines.push(`- scenarios with auto-capture backlog: ${report.governance?.scenariosWithAutoCaptureBacklog || 0}`);
  lines.push(`- scenarios with auto-capture failures: ${report.governance?.scenariosWithAutoCaptureFailures || 0}`);

  lines.push("", "## Team Policy", "");
  lines.push(`- ok: ${report.teamPolicy.ok}`);
  lines.push(`- errors: ${report.teamPolicy.errorCount}`);
  lines.push(`- warnings: ${report.teamPolicy.warningCount}`);
  lines.push(`- enforce consumer matrix: ${report.teamPolicy.releasePolicies?.enforceConsumerMatrix ?? "n/a"}`);
  lines.push(`- enforce release gates: ${report.teamPolicy.releasePolicies?.enforceReleaseGates ?? "n/a"}`);

  lines.push("", "## Recommended Actions", "");
  if ((report.recommendedActions || []).length === 0) {
    lines.push("- none");
  } else {
    for (const action of report.recommendedActions) {
      lines.push(`- ${action}`);
    }
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
