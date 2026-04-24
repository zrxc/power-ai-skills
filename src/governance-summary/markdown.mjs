/**
 * Governance Summary Markdown Builder 模块
 * 
 * 负责：
 * - 将治理汇总数据生成为 Markdown 格式报告
 */

/**
 * 构建推荐行动列表
 */
function buildRecommendedActions({
  projectProfile,
  reviewDeadlines,
  policyDrift,
  baseline,
  governanceContext,
  conversation,
  wrapperPromotions
}) {
  const actions = [];

  if (projectProfile.available && projectProfile.driftStatus === "drift") {
    const targetProfile = projectProfile.recommendedProjectProfile || "<profile>";
    actions.push(
      projectProfile.remediation
      || `Run \`npx power-ai-skills review-project-profile --accept ${targetProfile}\`, \`--reject --reason "..."\`, or \`--defer --reason "..." --next-review-at YYYY-MM-DD\` to record how the current profile drift should be handled.`
    );
  }

  if (reviewDeadlines.available && (reviewDeadlines.summary?.overdueReviews || 0) > 0) {
    actions.push("Run `npx power-ai-skills check-governance-review-deadlines --json` and refresh overdue review decisions.");
  }

  if (conversation.available && (conversation.summary?.pendingReview || 0) > 0) {
    actions.push("Run `npx power-ai-skills review-conversation-pattern --pattern <id> --accept|--reject|--archive` for patterns still in `review`.");
  }

  if ((governanceContext.reviewLevelConversationRecords || 0) > 0) {
    actions.push("Review recently captured `admissionLevel=review` conversations before treating them as stable self-evolution signals or promoting their derived patterns.");
  }

  if ((governanceContext.warningLevelConversationRecords || 0) > 0) {
    actions.push("Acknowledge recently captured `captureSafetyGovernanceLevel=warning` conversations before treating low-signal captures as strong self-evolution evidence.");
  }

  if ((governanceContext.autoCaptureRuntime?.failedRequestCount || 0) > 0) {
    actions.push("Run `npx power-ai-skills check-auto-capture-runtime --json` and clear failed auto-capture payloads before relying on self-evolution signals.");
  }

  if ((governanceContext.autoCaptureRuntime?.captureBacklogCount || 0) > 0 || (governanceContext.autoCaptureRuntime?.responseBacklogCount || 0) > 0) {
    actions.push("Drain queued auto-capture backlog or start `npx power-ai-skills watch-auto-capture-inbox` so conversation data keeps flowing into governance.");
  }

  if (governanceContext.captureSafetyPolicy?.exists === false || governanceContext.captureSafetyPolicy?.ok === false) {
    actions.push("Run `npx power-ai-skills validate-capture-safety-policy --json` and tighten the project capture safety policy before enabling broader automatic intake.");
  }

  if ((governanceContext.captureRetention?.archiveCandidateCount || 0) > 0 || (governanceContext.captureRetention?.pruneCandidateCount || 0) > 0) {
    actions.push("Run `npx power-ai-skills apply-capture-retention --json` to archive or prune conversation files that already exceeded project retention policy.");
  }

  if (wrapperPromotions.available && (wrapperPromotions.summary?.pendingFollowUps || 0) > 0) {
    actions.push("Finish pending wrapper promotion follow-ups before treating active proposals as governed.");
  }

  if (wrapperPromotions.available && (wrapperPromotions.summary?.readyForRegistration || 0) > 0) {
    actions.push("Register finalized wrapper promotions so the governance backlog no longer carries ready-for-registration items.");
  }

  if ((governanceContext.evolutionCandidates?.review || 0) > 0) {
    actions.push("Run `npx power-ai-skills generate-evolution-candidates --json` and review pending evolution candidates before enabling deeper automation.");
  }

  if ((governanceContext.evolutionProposals?.total || 0) > 0) {
    actions.push("Run `npx power-ai-skills list-evolution-proposals --json` to inspect high-risk evolution proposals and move them through the governance flow.");
  }

  if ((governanceContext.evolutionProposals?.review || 0) > 0) {
    actions.push("Run `npx power-ai-skills review-evolution-proposal --proposal <id> --accept|--reject|--archive` for proposals still waiting on manual governance review.");
  }

  if ((governanceContext.evolutionProposals?.staleReview || 0) > 0) {
    actions.push("Prioritize overdue evolution proposal reviews before the self-evolution backlog keeps aging further.");
  }

  if ((governanceContext.evolutionProposals?.staleAcceptedPendingApply || 0) > 0) {
    actions.push("Apply or re-triage accepted evolution proposals that have exceeded the proposal apply SLA.");
  }

  if ((governanceContext.evolutionProposals?.appliedDraftsWithFollowUps || 0) > 0) {
    actions.push("Review follow-up actions for applied evolution proposal drafts so shared-skill, wrapper, and release-impact artifacts do not stall after apply.");
  }

  if (baseline.status === "attention") {
    actions.push("Run `npx power-ai-skills check-project-baseline --json` and close failing baseline checks before broad project rollout.");
  }

  if (policyDrift.available && policyDrift.status === "attention") {
    actions.push("Run `npx power-ai-skills check-team-policy-drift --json` to refresh team policy drift details and resolve remaining policy mismatches.");
  }

  if (governanceContext.available && governanceContext.contextPath) {
    actions.push("Run `npx power-ai-skills show-project-governance-context --json` after major governance changes to refresh the shared project snapshot.");
  }

  return [...new Set(actions.filter(Boolean))];
}

/**
 * 构建治理汇总 Markdown 报告
 */
export function buildGovernanceSummaryMarkdown(payload) {
  const lines = [
    "# Governance Summary",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- root: \`${payload.projectRoot}\``,
    `- status: \`${payload.status}\``,
    `- generatedAt: \`${payload.generatedAt}\``,
    "",
    "## Overview",
    "",
    `- overdue governance reviews: ${payload.summary.overdueGovernanceReviews}`,
    `- due today governance reviews: ${payload.summary.dueTodayGovernanceReviews}`,
    `- pending conversation reviews: ${payload.summary.pendingConversationReviews}`,
    `- warning-level conversation records: ${payload.summary.warningLevelConversationRecords || 0}`,
    `- review-level conversation records: ${payload.summary.reviewLevelConversationRecords || 0}`,
    `- capture-level conversation records: ${payload.summary.captureLevelConversationRecords || 0}`,
    `- pending wrapper proposals: ${payload.summary.pendingWrapperProposals}`,
    `- auto-capture status: \`${payload.summary.autoCaptureStatus}\``,
    `- auto-capture capture backlog: ${payload.summary.autoCaptureCaptureBacklog}`,
    `- auto-capture response backlog: ${payload.summary.autoCaptureResponseBacklog}`,
    `- auto-capture failed requests: ${payload.summary.autoCaptureFailedRequests}`,
    `- ready for registration: ${payload.summary.readyForRegistration}`,
    `- pending wrapper follow-ups: ${payload.summary.pendingWrapperFollowUps}`,
    `- promotion relations: ${payload.summary.promotionRelations}`,
    `- evolution candidates: ${payload.summary.evolutionCandidates}`,
    `- high-risk evolution candidates: ${payload.summary.highRiskEvolutionCandidates}`,
    `- evolution proposals: ${payload.summary.evolutionProposals}`,
    `- proposals in review: ${payload.summary.reviewEvolutionProposals}`,
    `- applied evolution proposals: ${payload.summary.appliedEvolutionProposals || 0}`,
    `- applied wrapper drafts: ${payload.summary.appliedWrapperPromotionDrafts || 0}`,
    `- applied shared-skill drafts: ${payload.summary.appliedSharedSkillDrafts || 0}`,
    `- applied release-impact drafts: ${payload.summary.appliedReleaseImpactDrafts || 0}`,
    `- applied proposal follow-ups: ${payload.summary.appliedProposalFollowUps || 0}`,
    `- stale proposal reviews: ${payload.summary.staleEvolutionProposalReviews}`,
    `- stale accepted proposals: ${payload.summary.staleAcceptedEvolutionProposals}`,
    `- baseline status: \`${payload.summary.baselineStatus}\``,
    `- policy drift status: \`${payload.summary.policyDriftStatus}\``,
    "",
    "## Project Profile",
    ""
  ];

  if (!payload.projectProfile.available) {
    lines.push(`- unavailable: ${payload.projectProfile.reason}`, "");
  } else {
    lines.push(`- selected: ${payload.projectProfile.selectedProjectProfile ? `\`${payload.projectProfile.selectedProjectProfile}\`` : "none"}`);
    lines.push(`- recommended: ${payload.projectProfile.recommendedProjectProfile ? `\`${payload.projectProfile.recommendedProjectProfile}\`` : "none"}`);
    lines.push(`- drift status: \`${payload.projectProfile.driftStatus}\``);
    lines.push(`- decision: \`${payload.projectProfile.decision}\``);
    lines.push(`- review status: \`${payload.projectProfile.reviewStatus}\``);
    lines.push(`- next review: ${payload.projectProfile.nextReviewAt ? `\`${payload.projectProfile.nextReviewAt}\`` : "none"}`);
    lines.push(`- history entries: ${payload.projectProfile.historyCount}`);
    lines.push(`- decision file: \`${payload.projectProfile.decisionPath}\``);
    lines.push("");
  }

  lines.push("## Review Deadlines", "");
  if (!payload.reviewDeadlines.available) {
    lines.push(`- unavailable: ${payload.reviewDeadlines.reason}`, "");
  } else {
    lines.push(`- status: \`${payload.reviewDeadlines.status}\``);
    lines.push(`- scheduled: ${payload.reviewDeadlines.summary.scheduledReviews}`);
    lines.push(`- due today: ${payload.reviewDeadlines.summary.dueTodayReviews}`);
    lines.push(`- overdue: ${payload.reviewDeadlines.summary.overdueReviews}`);
    lines.push(`- next review: ${payload.reviewDeadlines.summary.nextReviewAt ? `\`${payload.reviewDeadlines.summary.nextReviewAt}\`` : "none"}`);
    lines.push("");
  }

  lines.push("## Conversation Decisions", "");
  if (!payload.conversation.available) {
    lines.push(`- unavailable: ${payload.conversation.reason}`, "");
  } else {
    lines.push(`- total: ${payload.conversation.summary.total}`);
    lines.push(`- review: ${payload.conversation.summary.review}`);
    lines.push(`- accepted: ${payload.conversation.summary.accepted}`);
    lines.push(`- promoted: ${payload.conversation.summary.promoted}`);
    lines.push(`- archived: ${payload.conversation.summary.archived}`);
    lines.push(`- decision ledger: \`${payload.conversation.decisionsPath}\``);
    lines.push("");
  }

  lines.push("## Wrapper Promotions", "");
  if (!payload.wrapperPromotions.available) {
    lines.push(`- unavailable: ${payload.wrapperPromotions.reason}`, "");
  } else {
    lines.push(`- total: ${payload.wrapperPromotions.summary.total}`);
    lines.push(`- active: ${payload.wrapperPromotions.summary.active}`);
    lines.push(`- ready for registration: ${payload.wrapperPromotions.summary.readyForRegistration}`);
    lines.push(`- pending follow-ups: ${payload.wrapperPromotions.summary.pendingFollowUps}`);
    lines.push(`- report: \`${payload.wrapperPromotions.reportPath}\``);
    lines.push("");
  }

  lines.push("## Promotion Trace", "");
  if (!payload.promotionTrace.available) {
    lines.push(`- unavailable: ${payload.promotionTrace.reason}`, "");
  } else {
    lines.push(`- total relations: ${payload.promotionTrace.summary.total}`);
    lines.push(`- pattern -> project skill: ${payload.promotionTrace.summary.patternToProjectSkill}`);
    lines.push(`- project skill -> manual project skill: ${payload.promotionTrace.summary.projectSkillToManualProjectSkill}`);
    lines.push(`- pattern -> wrapper proposal: ${payload.promotionTrace.summary.patternToWrapperProposal}`);
    lines.push(`- trace: \`${payload.promotionTrace.tracePath}\``);
    lines.push("");
  }

  lines.push("## Context", "");
  if (!payload.governanceContext.available) {
    lines.push(`- unavailable: ${payload.governanceContext.reason}`, "");
  } else {
    lines.push(`- context path: \`${payload.governanceContext.contextPath}\``);
    lines.push(`- strategy type: ${payload.governanceContext.conversationMinerStrategy.projectType ? `\`${payload.governanceContext.conversationMinerStrategy.projectType}\`` : "none"}`);
    lines.push(`- conversation capture records: ${payload.governanceContext.conversationCaptureAdmissions?.totalConversationRecords || 0}`);
    lines.push(`- conversation records with admission metadata: ${payload.governanceContext.recordsWithAdmissionMetadata || 0}`);
    lines.push(`- conversation records with governance metadata: ${payload.governanceContext.recordsWithGovernanceMetadata || 0}`);
    lines.push(`- warning-level conversation records: ${payload.governanceContext.warningLevelConversationRecords || 0}`);
    lines.push(`- review-level conversation records: ${payload.governanceContext.reviewLevelConversationRecords || 0}`);
    lines.push(`- capture-level conversation records: ${payload.governanceContext.captureLevelConversationRecords || 0}`);
    lines.push(`- blocking-level conversation records: ${payload.governanceContext.blockingLevelConversationRecords || 0}`);
    lines.push(`- auto-capture status: \`${payload.governanceContext.autoCaptureRuntime?.status || "unknown"}\``);
    lines.push(`- auto-capture activity: \`${payload.governanceContext.autoCaptureRuntime?.activityState || "unknown"}\``);
    lines.push(`- auto-capture enabled: ${Boolean(payload.governanceContext.autoCaptureRuntime?.enabled)}`);
    lines.push(`- auto-capture capture backlog: ${payload.governanceContext.autoCaptureRuntime?.captureBacklogCount || 0}`);
    lines.push(`- auto-capture response backlog: ${payload.governanceContext.autoCaptureRuntime?.responseBacklogCount || 0}`);
    lines.push(`- auto-capture failed requests: ${payload.governanceContext.autoCaptureRuntime?.failedRequestCount || 0}`);
    lines.push(`- auto-capture bridge contract ready: ${Boolean(payload.governanceContext.autoCaptureRuntime?.bridgeContractReady)}`);
    lines.push(`- auto-capture bridge contract: ${payload.governanceContext.autoCaptureRuntime?.bridgeContractJsonPath ? `\`${payload.governanceContext.autoCaptureRuntime.bridgeContractJsonPath}\`` : "none"}`);
    lines.push(`- auto-capture report: ${payload.governanceContext.autoCaptureRuntime?.reportPath ? `\`${payload.governanceContext.autoCaptureRuntime.reportPath}\`` : "none"}`);
    lines.push(`- capture safety policy: ${payload.governanceContext.captureSafetyPolicy?.policyPath ? `\`${payload.governanceContext.captureSafetyPolicy.policyPath}\`` : "none"}`);
    lines.push(`- capture safety enabled: ${Boolean(payload.governanceContext.captureSafetyPolicy?.enabled)}`);
    lines.push(`- capture safety valid: ${Boolean(payload.governanceContext.captureSafetyPolicy?.ok)}`);
    lines.push(`- allowed scene types: ${payload.governanceContext.captureSafetyPolicy?.allowedSceneTypeCount || 0}`);
    lines.push(`- blocked scene types: ${payload.governanceContext.captureSafetyPolicy?.blockedSceneTypeCount || 0}`);
    lines.push(`- review scene types: ${payload.governanceContext.captureSafetyPolicy?.reviewSceneTypeCount || 0}`);
    lines.push(`- blocked keywords: ${payload.governanceContext.captureSafetyPolicy?.blockedKeywordCount || 0}`);
    lines.push(`- review keywords: ${payload.governanceContext.captureSafetyPolicy?.reviewKeywordCount || 0}`);
    lines.push(`- blocked file patterns: ${payload.governanceContext.captureSafetyPolicy?.blockedFilePatternCount || 0}`);
    lines.push(`- review file patterns: ${payload.governanceContext.captureSafetyPolicy?.reviewFilePatternCount || 0}`);
    lines.push(`- capture retention status: \`${payload.governanceContext.captureRetention?.status || "unknown"}\``);
    lines.push(`- capture retention policy: ${payload.governanceContext.captureRetention?.policyPath ? `\`${payload.governanceContext.captureRetention.policyPath}\`` : "none"}`);
    lines.push(`- retention archive/prune days: ${payload.governanceContext.captureRetention?.autoArchiveDays || 0}/${payload.governanceContext.captureRetention?.autoPruneDays || 0}`);
    lines.push(`- retention archive candidates: ${payload.governanceContext.captureRetention?.archiveCandidateCount || 0}`);
    lines.push(`- retention prune candidates: ${payload.governanceContext.captureRetention?.pruneCandidateCount || 0}`);
    lines.push(`- retention report: ${payload.governanceContext.captureRetention?.reportPath ? `\`${payload.governanceContext.captureRetention.reportPath}\`` : "none"}`);
    lines.push(`- evolution policy: ${payload.governanceContext.evolutionPolicy.exists ? `\`${payload.governanceContext.evolutionPolicy.policyPath}\`` : "default"}`);
    lines.push(`- evolution candidates: ${payload.governanceContext.evolutionCandidates.total}`);
    lines.push(`- evolution proposals: ${payload.governanceContext.evolutionProposals.total}`);
    lines.push(`- applied evolution proposals: ${payload.governanceContext.evolutionProposals.applied || 0}`);
    lines.push(`- applied wrapper drafts: ${payload.governanceContext.evolutionProposals.appliedWrapperPromotionDrafts || 0}`);
    lines.push(`- applied shared-skill drafts: ${payload.governanceContext.evolutionProposals.appliedSharedSkillDrafts || 0}`);
    lines.push(`- applied release-impact drafts: ${payload.governanceContext.evolutionProposals.appliedReleaseImpactDrafts || 0}`);
    lines.push(`- applied proposal follow-ups: ${payload.governanceContext.evolutionProposals.appliedDraftsWithFollowUps || 0}`);
    lines.push(`- stale proposal reviews: ${payload.governanceContext.evolutionProposals.staleReview}`);
    lines.push(`- stale accepted proposals: ${payload.governanceContext.evolutionProposals.staleAcceptedPendingApply}`);
    if ((payload.governanceContext.evolutionProposals.nextActionPreview || []).length > 0) {
      lines.push(`- next proposal actions: ${(payload.governanceContext.evolutionProposals.nextActionPreview || []).map((item) => `\`${item}\``).join(", ")}`);
    }
    if ((payload.governanceContext.evolutionProposals.followUpDraftPreview || []).length > 0) {
      lines.push(`- draft handoff preview: ${(payload.governanceContext.evolutionProposals.followUpDraftPreview || []).map((item) => (
        `\`${item.proposalId}\` -> owner ${item.ownerHint ? `\`${item.ownerHint}\`` : "`unknown`"}, status ${item.handoffStatus ? `\`${item.handoffStatus}\`` : "`unknown`"}, next ${item.nextAction ? `\`${item.nextAction}\`` : "`none`"}`
      )).join("; ")}`);
    }
    lines.push(`- baseline status: \`${payload.governanceContext.baselineStatus}\``);
    lines.push(`- policy drift status: \`${payload.governanceContext.policyDriftStatus}\``);
    lines.push("");
  }

  lines.push("## Recommended Actions", "");
  if (payload.recommendedActions.length === 0) {
    lines.push("- none");
  } else {
    for (const action of payload.recommendedActions) lines.push(`- ${action}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

/**
 * 构建推荐行动（导出给主服务使用）
 */
export { buildRecommendedActions };
