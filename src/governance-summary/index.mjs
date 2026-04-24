/**
 * Governance Summary Service 模块
 * 
 * 负责：
 * - 收集各个治理相关模块的信息
 * - 生成治理汇总报告和 Markdown 文档
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../../scripts/shared.mjs";
import {
  collectProjectProfileSection,
  collectReviewDeadlineSection,
  collectPolicyDriftSection,
  collectBaselineSection,
  collectGovernanceContextSection,
  collectConversationSection,
  collectPromotionTraceSection,
  collectWrapperSection
} from "./collectors.mjs";
import { buildGovernanceSummaryMarkdown, buildRecommendedActions } from "./markdown.mjs";

/**
 * 创建治理汇总服务
 */
export function createGovernanceSummaryService({
  context,
  projectRoot,
  workspaceService,
  teamPolicyService,
  governanceContextService,
  conversationMinerService,
  promotionTraceService
}) {
  
  /**
   * 生成治理汇总报告
   */
  function generateGovernanceSummary() {
    // 收集各个治理模块的信息
    const projectProfile = collectProjectProfileSection(teamPolicyService);
    const reviewDeadlines = collectReviewDeadlineSection(teamPolicyService);
    const policyDrift = collectPolicyDriftSection(teamPolicyService);
    const governanceContext = collectGovernanceContextSection(governanceContextService);
    const baseline = collectBaselineSection(projectRoot, workspaceService, governanceContextService);
    const conversation = collectConversationSection(conversationMinerService);
    const wrapperPromotions = collectWrapperSection(conversationMinerService);
    const promotionTrace = collectPromotionTraceSection(promotionTraceService);
    
    // 构建推荐行动
    const recommendedActions = buildRecommendedActions({
      projectProfile,
      reviewDeadlines,
      policyDrift,
      baseline,
      governanceContext,
      conversation,
      wrapperPromotions
    });

    // 判断是否有需要关注的状态
    const hasAttention = (
      (reviewDeadlines.summary?.overdueReviews || 0) > 0
      || (conversation.summary?.pendingReview || 0) > 0
      || (wrapperPromotions.summary?.pendingFollowUps || 0) > 0
      || (wrapperPromotions.summary?.readyForRegistration || 0) > 0
      || (governanceContext.captureRetention?.archiveCandidateCount || 0) > 0
      || (governanceContext.captureRetention?.pruneCandidateCount || 0) > 0
      || (governanceContext.warningLevelConversationRecords || 0) > 0
      || (governanceContext.reviewLevelConversationRecords || 0) > 0
      || (governanceContext.evolutionProposals?.appliedDraftsWithFollowUps || 0) > 0
      || (governanceContext.evolutionProposals?.staleReview || 0) > 0
      || (governanceContext.evolutionProposals?.staleAcceptedPendingApply || 0) > 0
      || baseline.status === "attention"
      || policyDrift.status === "attention"
      || projectProfile.driftStatus === "drift"
    );

    // 生成报告
    const reportsRoot = workspaceService.getReportsRoot();
    const reportPath = path.join(reportsRoot, "governance-summary.md");
    const jsonPath = path.join(reportsRoot, "governance-summary.json");
    
    const payload = {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      status: hasAttention ? "attention" : "ok",
      summary: {
        overdueGovernanceReviews: reviewDeadlines.summary?.overdueReviews || 0,
        dueTodayGovernanceReviews: reviewDeadlines.summary?.dueTodayReviews || 0,
        pendingConversationReviews: conversation.summary?.pendingReview || 0,
        warningLevelConversationRecords: governanceContext.warningLevelConversationRecords || 0,
        reviewLevelConversationRecords: governanceContext.reviewLevelConversationRecords || 0,
        captureLevelConversationRecords: governanceContext.captureLevelConversationRecords || 0,
        pendingWrapperProposals: governanceContext.pendingWrapperProposals || 0,
        autoCaptureStatus: governanceContext.autoCaptureRuntime?.status || "unknown",
        autoCaptureCaptureBacklog: governanceContext.autoCaptureRuntime?.captureBacklogCount || 0,
        autoCaptureResponseBacklog: governanceContext.autoCaptureRuntime?.responseBacklogCount || 0,
        autoCaptureFailedRequests: governanceContext.autoCaptureRuntime?.failedRequestCount || 0,
        captureRetentionArchiveCandidates: governanceContext.captureRetention?.archiveCandidateCount || 0,
        captureRetentionPruneCandidates: governanceContext.captureRetention?.pruneCandidateCount || 0,
        readyForRegistration: wrapperPromotions.summary?.readyForRegistration || 0,
        pendingWrapperFollowUps: wrapperPromotions.summary?.pendingFollowUps || 0,
        promotionRelations: promotionTrace.summary?.total || 0,
        evolutionCandidates: governanceContext.evolutionCandidates?.total || 0,
        highRiskEvolutionCandidates: governanceContext.evolutionCandidates?.highRisk || 0,
        evolutionProposals: governanceContext.evolutionProposals?.total || 0,
        reviewEvolutionProposals: governanceContext.evolutionProposals?.review || 0,
        appliedEvolutionProposals: governanceContext.evolutionProposals?.applied || 0,
        appliedProjectProfileSelections: governanceContext.evolutionProposals?.appliedProjectProfileSelections || 0,
        appliedWrapperPromotionDrafts: governanceContext.evolutionProposals?.appliedWrapperPromotionDrafts || 0,
        appliedSharedSkillDrafts: governanceContext.evolutionProposals?.appliedSharedSkillDrafts || 0,
        appliedReleaseImpactDrafts: governanceContext.evolutionProposals?.appliedReleaseImpactDrafts || 0,
        appliedProposalFollowUps: governanceContext.evolutionProposals?.appliedDraftsWithFollowUps || 0,
        staleEvolutionProposalReviews: governanceContext.evolutionProposals?.staleReview || 0,
        staleAcceptedEvolutionProposals: governanceContext.evolutionProposals?.staleAcceptedPendingApply || 0,
        baselineStatus: baseline.status || "not-run",
        policyDriftStatus: policyDrift.status || "unknown",
        nextGovernanceReviewAt: governanceContext.nextGovernanceReviewAt || reviewDeadlines.summary?.nextReviewAt || ""
      },
      projectProfile,
      reviewDeadlines,
      policyDrift,
      baseline,
      governanceContext,
      conversation,
      wrapperPromotions,
      promotionTrace,
      recommendedActions
    };

    ensureDir(reportsRoot);
    writeJson(jsonPath, payload);
    fs.writeFileSync(reportPath, buildGovernanceSummaryMarkdown(payload), "utf8");

    return {
      ...payload,
      reportPath,
      jsonPath
    };
  }

  return {
    generateGovernanceSummary
  };
}
