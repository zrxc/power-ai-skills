import fs from "node:fs";
import { readJson } from "../shared/fs.mjs";

function readCount(summary, key) {
  return Number(summary?.[key] || 0);
}

export function normalizeConsumerReleaseGovernance(summary = {}) {
  return {
    unresolvedProjectProfileDecisions: readCount(summary, "unresolvedProjectProfileDecisions"),
    deferredProjectProfileDecisions: readCount(summary, "deferredProjectProfileDecisions"),
    rejectedProjectProfileDecisions: readCount(summary, "rejectedProjectProfileDecisions"),
    pendingConversationReviews: readCount(summary, "pendingConversationReviews"),
    scenariosWithPendingConversationReviews: readCount(summary, "scenariosWithPendingConversationReviews"),
    warningLevelConversationRecords: readCount(summary, "warningLevelConversationRecords"),
    scenariosWithWarningLevelConversationRecords: readCount(summary, "scenariosWithWarningLevelConversationRecords"),
    reviewLevelConversationRecords: readCount(summary, "reviewLevelConversationRecords"),
    captureLevelConversationRecords: readCount(summary, "captureLevelConversationRecords"),
    recordsWithAdmissionMetadata: readCount(summary, "recordsWithAdmissionMetadata"),
    recordsWithGovernanceMetadata: readCount(summary, "recordsWithGovernanceMetadata"),
    scenariosWithReviewLevelConversationRecords: readCount(summary, "scenariosWithReviewLevelConversationRecords"),
    pendingWrapperProposals: readCount(summary, "pendingWrapperProposals"),
    scenariosWithPendingWrapperProposals: readCount(summary, "scenariosWithPendingWrapperProposals"),
    overdueGovernanceReviews: readCount(summary, "overdueGovernanceReviews"),
    dueTodayGovernanceReviews: readCount(summary, "dueTodayGovernanceReviews"),
    scenariosWithOverdueGovernanceReviews: readCount(summary, "scenariosWithOverdueGovernanceReviews"),
    pendingEvolutionProposalReviews: readCount(summary, "pendingEvolutionProposalReviews"),
    scenariosWithPendingEvolutionProposalReviews: readCount(summary, "scenariosWithPendingEvolutionProposalReviews"),
    acceptedEvolutionProposals: readCount(summary, "acceptedEvolutionProposals"),
    scenariosWithAcceptedEvolutionProposals: readCount(summary, "scenariosWithAcceptedEvolutionProposals"),
    highRiskEvolutionProposals: readCount(summary, "highRiskEvolutionProposals"),
    staleEvolutionProposalReviews: readCount(summary, "staleEvolutionProposalReviews"),
    scenariosWithStaleEvolutionProposalReviews: readCount(summary, "scenariosWithStaleEvolutionProposalReviews"),
    staleAcceptedEvolutionProposals: readCount(summary, "staleAcceptedEvolutionProposals"),
    scenariosWithStaleAcceptedEvolutionProposals: readCount(summary, "scenariosWithStaleAcceptedEvolutionProposals"),
    appliedEvolutionProposalFollowUps: readCount(summary, "appliedEvolutionProposalFollowUps"),
    scenariosWithAppliedEvolutionProposalFollowUps: readCount(summary, "scenariosWithAppliedEvolutionProposalFollowUps"),
    appliedEvolutionProposalFollowUpActionCount: readCount(summary, "appliedEvolutionProposalFollowUpActionCount"),
    appliedWrapperPromotionDrafts: readCount(summary, "appliedWrapperPromotionDrafts"),
    appliedSharedSkillDrafts: readCount(summary, "appliedSharedSkillDrafts"),
    appliedReleaseImpactDrafts: readCount(summary, "appliedReleaseImpactDrafts"),
    autoCaptureWarningScenarios: readCount(summary, "autoCaptureWarningScenarios"),
    autoCaptureAttentionScenarios: readCount(summary, "autoCaptureAttentionScenarios"),
    autoCaptureCaptureBacklog: readCount(summary, "autoCaptureCaptureBacklog"),
    autoCaptureResponseBacklog: readCount(summary, "autoCaptureResponseBacklog"),
    autoCaptureFailedRequests: readCount(summary, "autoCaptureFailedRequests"),
    scenariosWithAutoCaptureBacklog: readCount(summary, "scenariosWithAutoCaptureBacklog"),
    scenariosWithAutoCaptureFailures: readCount(summary, "scenariosWithAutoCaptureFailures")
  };
}

export function createConsumerReleaseInputs({
  matrix = null,
  matrixPath = "",
  requireConsumerMatrix = false
} = {}) {
  const summary = matrix?.summary || {};
  const available = Boolean(matrix?.summary);

  return {
    required: requireConsumerMatrix,
    available,
    sourcePath: matrixPath,
    matrix,
    compatibility: {
      required: requireConsumerMatrix,
      available,
      scenarioCount: readCount(summary, "totalScenarios"),
      passedScenarioCount: readCount(summary, "passedScenarios"),
      failedScenarioCount: readCount(summary, "failedScenarios")
    },
    governance: normalizeConsumerReleaseGovernance(summary)
  };
}

export function loadConsumerReleaseInputs({
  matrixPath = "",
  requireConsumerMatrix = false
} = {}) {
  const matrix = matrixPath && fs.existsSync(matrixPath) ? readJson(matrixPath) : null;
  return createConsumerReleaseInputs({
    matrix,
    matrixPath,
    requireConsumerMatrix
  });
}
