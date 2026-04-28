/**
 * Upgrade Summary Markdown Builder 模块
 * 
 * 负责：
 * - 构建推荐行动列表
 * - 将升级汇总数据生成为 Markdown 格式报告
 */

/**
 * 构建推荐行动列表
 */
export function buildRecommendedActions({ doctorReport, projectScan, conversation, promotionTrace, governanceContext, wrapperPromotions, release }) {
  const actions = [...(doctorReport.remediationTips || [])];

  if (projectScan.available && (projectScan.reviewSummary?.review || 0) > 0) {
    actions.push("Review project-scan patterns still marked as `review`, and write stable overrides with `npx power-ai-skills review-project-pattern <pattern-id> --decision ...` when needed.");
  }

  if (conversation.available && (conversation.decisionSummary?.pendingReview || 0) > 0) {
    actions.push("Review conversation-miner patterns still marked as `review` in `.power-ai/governance/conversation-decisions.json`, and decide whether they should become project-local skills, governance rules, or archived items.");
  }

  if (promotionTrace.available && (promotionTrace.summary?.total || 0) === 0 && conversation.available && (conversation.patternCount || 0) > 0) {
    actions.push("If conversation-derived assets are being promoted, verify that promotion trace entries are being created so downstream governance can trace pattern-to-skill and pattern-to-wrapper transitions.");
  }

  if (governanceContext.available && governanceContext.recommendedProjectProfile && governanceContext.selectedProjectProfile !== governanceContext.recommendedProjectProfile) {
    actions.push("Review project profile drift in `.power-ai/context/project-governance-context.json`, then decide whether to accept, reject, or defer the current recommended project profile.");
  }

  if (governanceContext.available && (governanceContext.pendingConversationReviews || 0) > 0) {
    actions.push("Clear pending conversation review items so the governance context snapshot no longer carries unresolved conversation-derived decisions.");
  }

  if (governanceContext.available && (governanceContext.reviewLevelConversationRecords || 0) > 0) {
    actions.push("Review conversation records marked with `captureAdmissionLevel=review` before promoting them into project-local skills or self-evolution candidates.");
  }

  if (governanceContext.available && (governanceContext.warningLevelConversationRecords || 0) > 0) {
    actions.push("Acknowledge conversation records marked with `captureSafetyGovernanceLevel=warning` before low-signal captures are treated as durable self-evolution evidence.");
  }

  if (governanceContext.available && (governanceContext.autoCaptureRuntime?.failedRequestCount || 0) > 0) {
    actions.push("Inspect failed auto-capture payloads before trusting conversation-driven evolution signals in this upgrade.");
  }

  if (governanceContext.available && ((governanceContext.autoCaptureRuntime?.captureBacklogCount || 0) > 0 || (governanceContext.autoCaptureRuntime?.responseBacklogCount || 0) > 0)) {
    actions.push("Drain auto-capture backlog so the consumer project is not upgrading with stale conversation intake queues.");
  }

  if (governanceContext.available && (governanceContext.captureSafetyPolicy?.exists === false || governanceContext.captureSafetyPolicy?.ok === false)) {
    actions.push("Validate and tighten `.power-ai/capture-safety-policy.json` before trusting newly collected automatic conversations.");
  }

  if (governanceContext.available && ((governanceContext.captureRetention?.archiveCandidateCount || 0) > 0 || (governanceContext.captureRetention?.pruneCandidateCount || 0) > 0)) {
    actions.push("Run `npx power-ai-skills apply-capture-retention --json` so old conversation files do not keep inflating self-evolution signals during upgrade.");
  }

  if (governanceContext.available && (governanceContext.evolutionProposals?.appliedDraftsWithFollowUps || 0) > 0) {
    actions.push("Review follow-up actions for applied evolution proposal drafts before treating shared-skill, wrapper, or release-impact artifacts as fully governed.");
  }

  if (governanceContext.available && (governanceContext.pendingWrapperProposals || 0) > 0) {
    actions.push("Review active wrapper promotion proposals so the governance context snapshot reflects whether wrappers are still pending registration or follow-up work.");
  }

  if ((wrapperPromotions.summary?.pendingFollowUps || 0) > 0) {
    actions.push("Finish pending wrapper promotion follow-ups before treating applied wrappers as fully governed.");
  }

  if ((wrapperPromotions.summary?.readyForRegistration || 0) > 0) {
    actions.push("Register finalized wrapper promotions so doctor no longer reports them as ready-for-registration.");
  }

  if (release.available) {
    for (const followUp of release.followUps || []) actions.push(followUp);
    for (const action of release.risk?.recommendedActions || []) actions.push(action);
    for (const action of release.releaseGates?.recommendedActions || []) actions.push(action);
    if (release.orchestration?.status === "blocked") {
      actions.push("Resolve the latest release orchestration blockers recorded in `manifest/release-orchestration-record.json` before advancing the controlled publish flow.");
    }
    if (release.orchestration?.status === "published-awaiting-follow-up") {
      actions.push("Latest release orchestration snapshot shows publish completed; refresh follow-up summaries before broad rollout.");
    }
    if (release.upgradeAdvice?.blocked) {
      actions.push("Review blocking upgrade advice checks before asking consumers to broadly adopt the current release.");
    }
    if ((release.compatibilityMatrix?.failedScenarioCount || 0) > 0) {
      actions.push("Investigate failed consumer compatibility matrix scenarios before promoting the current release as broadly compatible.");
    }
    if (release.publishExecution?.status === "blocked") {
      actions.push("Resolve the latest controlled release publish blockers recorded in `manifest/release-publish-record.json` before treating the release as execution-ready.");
    }
    if (release.publishExecution?.status === "confirmation-required") {
      actions.push("After reviewing the latest planner evidence, re-run `npx power-ai-skills execute-release-publish --confirm --json` to advance the controlled publish gate.");
    }
    if (release.publishExecution?.status === "acknowledgement-required") {
      actions.push("If the warn-level release snapshot is acceptable, re-run `npx power-ai-skills execute-release-publish --confirm --acknowledge-warnings --json` after manual review.");
    }
    if (release.publishExecution?.status === "publish-failed") {
      actions.push("Review the latest controlled publish failure recorded in `manifest/release-publish-record.json` before retrying the same version publish.");
    }
  }

  return [...new Set(actions)];
}

/**
 * 构建升级汇总 Markdown 报告
 */
export function buildUpgradeSummaryMarkdown(payload) {
  const lines = [
    "# Upgrade Summary",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- root: \`${payload.projectRoot}\``,
    `- mode: \`${payload.mode}\``,
    `- status: \`${payload.status}\``,
    `- generatedAt: \`${payload.generatedAt}\``,
    "",
    "## Doctor",
    "",
    `- ok: ${payload.doctor.ok}`,
    `- report: \`${payload.doctor.reportPath}\``,
    `- failure codes: ${(payload.doctor.failureCodes || []).length > 0 ? payload.doctor.failureCodes.map((code) => `\`${code}\``).join(", ") : "none"}`,
    `- warnings: ${(payload.doctor.warnings || []).length}`,
    ""
  ];

  if (payload.projectScan.available) {
    lines.push("## Project Scan", "");
    lines.push(`- patterns: ${payload.projectScan.patternCount}`);
    lines.push(`- decisions: generate ${payload.projectScan.reviewSummary.generate}, review ${payload.projectScan.reviewSummary.review}, skip ${payload.projectScan.reviewSummary.skip}`);
    lines.push(`- feedback overrides: ${payload.projectScan.feedbackSummary.overrides}`);
    lines.push(`- auto-generated skills: ${payload.projectScan.autoGeneratedSkillCount}`);
    lines.push(`- manual project-local skills: ${payload.projectScan.manualSkillCount}`);
    lines.push("");
  } else {
    lines.push("## Project Scan", "", `- unavailable: ${payload.projectScan.reason}`, "");
  }

  if (payload.conversation.available) {
    lines.push("## Conversation Miner", "");
    lines.push(`- records: ${payload.conversation.summary.recordCount}`);
    lines.push(`- patterns: ${payload.conversation.patternCount}`);
    lines.push(`- recommendations: generate ${payload.conversation.summary.generate}, review ${payload.conversation.summary.review}, skip ${payload.conversation.summary.skip}`);
    lines.push(`- governance: merges ${payload.conversation.summary.activeMerges}, archives ${payload.conversation.summary.archivedPatterns}`);
    lines.push(`- decisions: review ${payload.conversation.decisionSummary?.review || 0}, accepted ${payload.conversation.decisionSummary?.accepted || 0}, promoted ${payload.conversation.decisionSummary?.promoted || 0}, archived ${payload.conversation.decisionSummary?.archived || 0}`);
    lines.push(`- decision ledger: \`${payload.conversation.artifacts.conversationDecisionsPath}\``);
    lines.push("");
  } else {
    lines.push("## Conversation Miner", "", `- unavailable: ${payload.conversation.reason}`, "");
  }

  if (payload.promotionTrace.available) {
    lines.push("## Promotion Trace", "");
    lines.push(`- total relations: ${payload.promotionTrace.summary.total}`);
    lines.push(`- pattern -> project skill: ${payload.promotionTrace.summary.patternToProjectSkill}`);
    lines.push(`- project skill -> manual project skill: ${payload.promotionTrace.summary.projectSkillToManualProjectSkill}`);
    lines.push(`- pattern -> wrapper proposal: ${payload.promotionTrace.summary.patternToWrapperProposal}`);
    lines.push(`- trace: \`${payload.promotionTrace.tracePath}\``);
    lines.push("");
  } else {
    lines.push("## Promotion Trace", "", `- unavailable: ${payload.promotionTrace.reason}`, "");
  }

  if (payload.governanceContext.available) {
    lines.push("## Governance Context", "");
    lines.push(`- selected project profile: ${payload.governanceContext.selectedProjectProfile ? `\`${payload.governanceContext.selectedProjectProfile}\`` : "none"}`);
    lines.push(`- recommended project profile: ${payload.governanceContext.recommendedProjectProfile ? `\`${payload.governanceContext.recommendedProjectProfile}\`` : "none"}`);
    lines.push(`- project profile decision: \`${payload.governanceContext.projectProfileDecision}\``);
    lines.push(`- project profile review status: \`${payload.governanceContext.projectProfileDecisionReviewStatus || "not-scheduled"}\``);
    lines.push(`- baseline status: \`${payload.governanceContext.baselineStatus}\``);
    lines.push(`- policy drift status: \`${payload.governanceContext.policyDriftStatus}\``);
    lines.push(`- overdue governance reviews: ${payload.governanceContext.overdueGovernanceReviews || 0}`);
    lines.push(`- due today governance reviews: ${payload.governanceContext.dueTodayGovernanceReviews || 0}`);
    lines.push(`- pending conversation reviews: ${payload.governanceContext.pendingConversationReviews}`);
    lines.push(`- conversation records with admission metadata: ${payload.governanceContext.recordsWithAdmissionMetadata || 0}`);
    lines.push(`- conversation records with governance metadata: ${payload.governanceContext.recordsWithGovernanceMetadata || 0}`);
    lines.push(`- warning-level conversation records: ${payload.governanceContext.warningLevelConversationRecords || 0}`);
    lines.push(`- review-level conversation records: ${payload.governanceContext.reviewLevelConversationRecords || 0}`);
    lines.push(`- capture-level conversation records: ${payload.governanceContext.captureLevelConversationRecords || 0}`);
    lines.push(`- blocking-level conversation records: ${payload.governanceContext.blockingLevelConversationRecords || 0}`);
    lines.push(`- pending wrapper proposals: ${payload.governanceContext.pendingWrapperProposals}`);
    lines.push(`- auto-capture status: \`${payload.governanceContext.autoCaptureRuntime?.status || "unknown"}\``);
    lines.push(`- auto-capture activity: \`${payload.governanceContext.autoCaptureRuntime?.activityState || "unknown"}\``);
    lines.push(`- auto-capture capture backlog: ${payload.governanceContext.autoCaptureRuntime?.captureBacklogCount || 0}`);
    lines.push(`- auto-capture response backlog: ${payload.governanceContext.autoCaptureRuntime?.responseBacklogCount || 0}`);
    lines.push(`- auto-capture failed requests: ${payload.governanceContext.autoCaptureRuntime?.failedRequestCount || 0}`);
    lines.push(`- auto-capture bridge contract ready: ${Boolean(payload.governanceContext.autoCaptureRuntime?.bridgeContractReady)}`);
    lines.push(`- auto-capture bridge contract: ${payload.governanceContext.autoCaptureRuntime?.bridgeContractJsonPath ? `\`${payload.governanceContext.autoCaptureRuntime.bridgeContractJsonPath}\`` : "none"}`);
    lines.push(`- capture safety policy: ${payload.governanceContext.captureSafetyPolicy?.policyPath ? `\`${payload.governanceContext.captureSafetyPolicy.policyPath}\`` : "none"}`);
    lines.push(`- capture safety enabled: ${Boolean(payload.governanceContext.captureSafetyPolicy?.enabled)}`);
    lines.push(`- capture safety valid: ${Boolean(payload.governanceContext.captureSafetyPolicy?.ok)}`);
    lines.push(`- capture allowed scene types: ${payload.governanceContext.captureSafetyPolicy?.allowedSceneTypeCount || 0}`);
    lines.push(`- capture review scene types: ${payload.governanceContext.captureSafetyPolicy?.reviewSceneTypeCount || 0}`);
    lines.push(`- capture blocked keywords: ${payload.governanceContext.captureSafetyPolicy?.blockedKeywordCount || 0}`);
    lines.push(`- capture review keywords: ${payload.governanceContext.captureSafetyPolicy?.reviewKeywordCount || 0}`);
    lines.push(`- capture blocked file patterns: ${payload.governanceContext.captureSafetyPolicy?.blockedFilePatternCount || 0}`);
    lines.push(`- capture review file patterns: ${payload.governanceContext.captureSafetyPolicy?.reviewFilePatternCount || 0}`);
    lines.push(`- capture retention status: \`${payload.governanceContext.captureRetention?.status || "unknown"}\``);
    lines.push(`- capture retention archive/prune days: ${payload.governanceContext.captureRetention?.autoArchiveDays || 0}/${payload.governanceContext.captureRetention?.autoPruneDays || 0}`);
    lines.push(`- capture retention archive candidates: ${payload.governanceContext.captureRetention?.archiveCandidateCount || 0}`);
    lines.push(`- capture retention prune candidates: ${payload.governanceContext.captureRetention?.pruneCandidateCount || 0}`);
    lines.push(`- evolution proposals: ${payload.governanceContext.evolutionProposals?.total || 0}`);
    lines.push(`- applied evolution proposals: ${payload.governanceContext.evolutionProposals?.applied || 0}`);
    lines.push(`- applied wrapper drafts: ${payload.governanceContext.evolutionProposals?.appliedWrapperPromotionDrafts || 0}`);
    lines.push(`- applied shared-skill drafts: ${payload.governanceContext.evolutionProposals?.appliedSharedSkillDrafts || 0}`);
    lines.push(`- applied release-impact drafts: ${payload.governanceContext.evolutionProposals?.appliedReleaseImpactDrafts || 0}`);
    lines.push(`- applied proposal follow-ups: ${payload.governanceContext.evolutionProposals?.appliedDraftsWithFollowUps || 0}`);
    if ((payload.governanceContext.evolutionProposals?.nextActionPreview || []).length > 0) {
      lines.push(`- next proposal actions: ${(payload.governanceContext.evolutionProposals.nextActionPreview || []).map((item) => `\`${item}\``).join(", ")}`);
    }
    if ((payload.governanceContext.evolutionProposals?.followUpDraftPreview || []).length > 0) {
      lines.push(`- draft handoff preview: ${(payload.governanceContext.evolutionProposals.followUpDraftPreview || []).map((item) => (
        `\`${item.proposalId}\` -> owner ${item.ownerHint ? `\`${item.ownerHint}\`` : "`unknown`"}, status ${item.handoffStatus ? `\`${item.handoffStatus}\`` : "`unknown`"}, next ${item.nextAction ? `\`${item.nextAction}\`` : "`none`"}`
      )).join("; ")}`);
    }
    lines.push(`- governance context: \`${payload.governanceContext.contextPath}\``);
    lines.push("");
  } else {
    lines.push("## Governance Context", "", `- unavailable: ${payload.governanceContext.reason}`, "");
  }

  lines.push("## Wrapper Promotions", "");
  lines.push(`- total: ${payload.wrapperPromotions.summary.total}`);
  lines.push(`- active: ${payload.wrapperPromotions.summary.active}`);
  lines.push(`- archived: ${payload.wrapperPromotions.summary.archived}`);
  lines.push(`- ready for registration: ${payload.wrapperPromotions.summary.readyForRegistration}`);
  lines.push(`- pending follow-ups: ${payload.wrapperPromotions.summary.pendingFollowUps}`);
  if (payload.wrapperPromotions.reportPath) {
    lines.push(`- report: \`${payload.wrapperPromotions.reportPath}\``);
  } else {
    lines.push(`- report: unavailable (${payload.wrapperPromotions.reason || "not generated"})`);
  }
  lines.push("");

  if (payload.release.available) {
    lines.push("## Release Governance", "");
    lines.push(`- ok: ${payload.release.ok}`);
    lines.push(`- recommended release level: \`${payload.release.recommendedReleaseLevel || "unknown"}\``);
    lines.push(`- overall risk level: \`${payload.release.overallRiskLevel || "unknown"}\``);
    lines.push(`- risk release hint: \`${payload.release.overallReleaseHint || "unknown"}\``);
    lines.push(`- changed files: ${payload.release.changedFileCount}`);
    lines.push(`- affected domains: ${payload.release.affectedDomainCount}`);
    lines.push(`- affected skills: ${payload.release.affectedSkillCount}`);
    if (payload.release.risk) {
      lines.push(`- risk categories: ${payload.release.risk.categoryCount}`);
      lines.push(`- risk report: \`${payload.release.risk.jsonPath}\``);
    }
    if (payload.release.promotionTrace) {
      lines.push(`- promotion trace matched relations: ${payload.release.promotionTrace.matchedRelations}`);
      lines.push(`- promotion trace report: \`${payload.release.promotionTrace.jsonPath}\``);
    }
    if (payload.release.compatibilityMatrix) {
      lines.push(`- compatibility scenarios: ${payload.release.compatibilityMatrix.scenarioCount}`);
      lines.push(`- compatibility passed: ${payload.release.compatibilityMatrix.passedScenarioCount}`);
      lines.push(`- compatibility failed: ${payload.release.compatibilityMatrix.failedScenarioCount}`);
      lines.push(`- compatibility matrix: \`${payload.release.compatibilityMatrix.jsonPath}\``);
    }
    if (payload.release.releaseGates) {
      lines.push(`- release gates: \`${payload.release.releaseGates.overallStatus}\``);
      lines.push(`- release gate failures: ${payload.release.releaseGates.failedGates}`);
      lines.push(`- release gate report: \`${payload.release.releaseGates.jsonPath}\``);
    }
    if (payload.release.upgradeAdvice) {
      lines.push(`- upgrade advice blocked: ${payload.release.upgradeAdvice.blocked}`);
      lines.push(`- upgrade advice consumer commands: ${payload.release.upgradeAdvice.consumerCommandCount}`);
      lines.push(`- upgrade advice manual checks: ${payload.release.upgradeAdvice.manualCheckCount}`);
      lines.push(`- upgrade advice package: \`${payload.release.upgradeAdvice.jsonPath}\``);
    }
    if (payload.release.publishExecution) {
      lines.push(`- publish execution status: \`${payload.release.publishExecution.status}\``);
      lines.push(`- publish execution planner status: \`${payload.release.publishExecution.plannerStatus}\``);
      lines.push(`- real publish enabled: ${payload.release.publishExecution.realPublishEnabled}`);
      lines.push(`- publish execution attempted: ${payload.release.publishExecution.publishAttempted}`);
      lines.push(`- publish execution requires acknowledgement: ${payload.release.publishExecution.requiresExplicitAcknowledgement}`);
      lines.push(`- publish execution record: \`${payload.release.publishExecution.recordPath}\``);
      if (payload.release.publishExecution.failureSummaryPresent) {
        lines.push(`- publish execution failure summary: \`${payload.release.publishExecution.failureSummaryPath}\``);
        lines.push(`- publish execution reason: ${payload.release.publishExecution.failurePrimaryReason || "unknown"}`);
      }
    }
    if (payload.release.orchestration) {
      lines.push(`- release orchestration status: \`${payload.release.orchestration.status}\``);
      lines.push(`- release orchestration stages: ${payload.release.orchestration.stageCount}`);
      lines.push(`- release orchestration blockers: ${payload.release.orchestration.blockerCount}`);
      lines.push(`- release orchestration human gates: ${payload.release.orchestration.humanGateCount}`);
      lines.push(`- release orchestration record: \`${payload.release.orchestration.recordPath}\``);
    }
    if (payload.release.consumerVerification?.skipped) {
      lines.push(`- consumer verification: skipped (${payload.release.consumerVerification.reason || "no reason"})`);
    } else {
      lines.push(`- consumer verification: ${payload.release.consumerVerification.ok ? "ok" : "failed"}`);
    }
    if (payload.release.notification) {
      lines.push(`- notification level: \`${payload.release.notification.level}\``);
      lines.push(`- notification json: \`${payload.release.notification.jsonPath}\``);
    }
    lines.push("");
  }

  lines.push("## Recommended Actions", "");
  if ((payload.recommendedActions || []).length === 0) {
    lines.push("- none");
  } else {
    for (const action of payload.recommendedActions) lines.push(`- ${action}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
