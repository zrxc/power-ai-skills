/**
 * Governance Summary Collectors 模块
 * 
 * 负责：
 * - 收集项目配置决策信息
 * - 收集审查截止日期信息
 * - 收集策略漂移信息
 * - 收集基线检查信息
 * - 收集治理上下文信息
 * - 收集对话决策信息
 * - 收集包装提升信息
 * - 收集提升追踪信息
 */

import fs from "node:fs";
import path from "node:path";
import { readJson } from "../../scripts/shared.mjs";

/**
 * 读取 JSON 文件（如果存在）
 */
function readJsonIfExists(filePath) {
  return filePath && fs.existsSync(filePath) ? readJson(filePath) : null;
}

/**
 * 收集项目配置决策部分
 */
export function collectProjectProfileSection(teamPolicyService) {
  try {
    const result = teamPolicyService.showProjectProfileDecision();
    return {
      available: true,
      generatedAt: result.generatedAt,
      selectedProjectProfile: result.decision.selectedProjectProfile || "",
      recommendedProjectProfile: result.decision.recommendedProjectProfile || "",
      driftStatus: result.decision.driftStatus || "no-recommendation",
      decision: result.decision.decision || "auto-recommended",
      decisionReason: result.decision.decisionReason || "",
      nextReviewAt: result.decision.nextReviewAt || "",
      reviewStatus: result.reviewDeadline?.reviewStatus || result.decision.reviewStatus || "not-scheduled",
      reviewDue: Boolean(result.reviewDeadline?.reviewDue),
      reviewOverdue: Boolean(result.reviewDeadline?.reviewOverdue),
      daysUntilReview: result.reviewDeadline?.daysUntilReview ?? result.decision.daysUntilReview ?? null,
      daysOverdue: result.reviewDeadline?.daysOverdue ?? result.decision.daysOverdue ?? 0,
      sourceSignals: result.decision.sourceSignals || [],
      decisionPath: result.decision.decisionPath,
      historyPath: result.historyPath,
      historyCount: result.historyCount || 0,
      remediation: result.decision.reviewRemediation || result.decision.remediation || ""
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message
    };
  }
}

/**
 * 收集审查截止日期部分
 */
export function collectReviewDeadlineSection(teamPolicyService) {
  try {
    const result = teamPolicyService.buildGovernanceReviewDeadlineReport();
    return {
      available: true,
      generatedAt: result.generatedAt,
      status: result.status,
      today: result.today,
      summary: result.summary,
      items: result.items || [],
      recommendedActions: result.recommendedActions || []
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message
    };
  }
}

/**
 * 收集策略漂移部分
 */
export function collectPolicyDriftSection(teamPolicyService) {
  try {
    const result = teamPolicyService.buildTeamPolicyDriftReport();
    return {
      available: true,
      generatedAt: result.generatedAt,
      status: result.status,
      summary: result.summary,
      warnings: result.warnings || [],
      recommendedActions: result.recommendedActions || [],
      reportPath: path.join(result.projectRoot, ".power-ai", "reports", "team-policy-drift.md"),
      jsonPath: path.join(result.projectRoot, ".power-ai", "reports", "team-policy-drift.json")
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message
    };
  }
}

/**
 * 收集基线检查部分
 */
export function collectBaselineSection(projectRoot, workspaceService, governanceContextService) {
  const reportsRoot = workspaceService.getReportsRoot();
  const jsonPath = path.join(reportsRoot, "project-baseline.json");
  const payload = readJsonIfExists(jsonPath);
  const governanceContext = governanceContextService?.loadProjectGovernanceContext({ refreshIfMissing: true }) || null;
  
  if (!payload) {
    return {
      available: false,
      status: governanceContext?.baselineStatus || "not-run",
      reason: "project baseline report has not been generated yet",
      reportPath: path.join(reportsRoot, "project-baseline.md"),
      jsonPath
    };
  }

  return {
    available: true,
    generatedAt: payload.generatedAt,
    status: payload.status || governanceContext?.baselineStatus || "unknown",
    summary: payload.summary || {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    },
    reportPath: path.join(reportsRoot, "project-baseline.md"),
    jsonPath
  };
}

/**
 * 收集治理上下文部分
 */
export function collectGovernanceContextSection(governanceContextService) {
  try {
    const payload = governanceContextService.showProjectGovernanceContext();
    return {
      available: true,
      generatedAt: payload.generatedAt,
      selectedProjectProfile: payload.selectedProjectProfile || "",
      recommendedProjectProfile: payload.recommendedProjectProfile || "",
      projectProfileDecision: payload.projectProfileDecision || "auto-recommended",
      projectProfileDecisionReviewAt: payload.projectProfileDecisionReviewAt || "",
      projectProfileDecisionReviewStatus: payload.projectProfileDecisionReviewStatus || "not-scheduled",
      baselineStatus: payload.baselineStatus || "not-run",
      policyDriftStatus: payload.policyDriftStatus || "unknown",
      overdueGovernanceReviews: payload.overdueGovernanceReviews || 0,
      dueTodayGovernanceReviews: payload.dueTodayGovernanceReviews || 0,
      nextGovernanceReviewAt: payload.nextGovernanceReviewAt || "",
      pendingConversationReviews: payload.pendingConversationReviews || 0,
      reviewLevelConversationRecords: payload.reviewLevelConversationRecords || 0,
      captureLevelConversationRecords: payload.captureLevelConversationRecords || 0,
      recordsWithAdmissionMetadata: payload.recordsWithAdmissionMetadata || 0,
      warningLevelConversationRecords: payload.warningLevelConversationRecords || 0,
      blockingLevelConversationRecords: payload.blockingLevelConversationRecords || 0,
      recordsWithGovernanceMetadata: payload.recordsWithGovernanceMetadata || 0,
      pendingConversationPatternIds: payload.pendingConversationPatternIds || [],
      pendingWrapperProposals: payload.pendingWrapperProposals || 0,
      pendingWrapperTools: payload.pendingWrapperTools || [],
      conversationMinerStrategy: payload.conversationMinerStrategy || {
        projectType: "",
        displayName: "",
        captureMode: "",
        autoCaptureEnabled: false,
        configPath: "",
        exists: false
      },
      autoCaptureRuntime: payload.autoCaptureRuntime || {
        status: "unknown",
        activityState: "unknown",
        enabled: false,
        captureBacklogCount: 0,
        responseBacklogCount: 0,
        failedRequestCount: 0,
        staleQueuedCaptureCount: 0,
        staleQueuedResponseCount: 0,
        lastActivityAt: "",
        reportPath: "",
        jsonPath: ""
      },
      captureSafetyPolicy: payload.captureSafetyPolicy || {
        exists: false,
        policyPath: "",
        ok: false,
        warningCount: 0,
        allowedSceneTypeCount: 0,
        blockedSceneTypeCount: 0,
        reviewSceneTypeCount: 0,
        blockedKeywordCount: 0,
        reviewKeywordCount: 0,
        blockedFilePatternCount: 0,
        reviewFilePatternCount: 0,
        enabled: false
      },
      captureRetention: payload.captureRetention || {
        status: "unknown",
        policyEnabled: false,
        policyPath: "",
        autoArchiveDays: 0,
        autoPruneDays: 0,
        activeFileCount: 0,
        archivedFileCount: 0,
        archiveCandidateCount: 0,
        pruneCandidateCount: 0,
        reportPath: "",
        jsonPath: ""
      },
      evolutionPolicy: payload.evolutionPolicy || {
        autoAnalyzeEnabled: false,
        minConversationCountToAnalyze: 0,
        policyPath: "",
        exists: false
      },
      evolutionCandidates: payload.evolutionCandidates || {
        total: 0,
        review: 0,
        highRisk: 0,
        projectLocalSkillDrafts: 0,
        wrapperProposalCandidates: 0,
        profileAdjustmentCandidates: 0,
        candidatesPath: "",
        exists: false
      },
      evolutionProposals: payload.evolutionProposals || {
        total: 0,
        review: 0,
        applied: 0,
        accepted: 0,
        highRisk: 0,
        staleReview: 0,
        staleAcceptedPendingApply: 0,
        oldestReviewAgeDays: null,
        oldestAcceptedAgeDays: null,
        reviewSlaDays: 7,
        acceptedApplySlaDays: 3,
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
        proposalsPath: "",
        exists: false
      },
      contextPath: payload.contextPath || ""
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message
    };
  }
}

/**
 * 收集对话决策部分
 */
export function collectConversationSection(conversationMinerService) {
  try {
    const result = conversationMinerService.loadConversationDecisions();
    const decisions = result.ledger?.decisions || [];
    const reviewItems = decisions.filter((item) => item.decision === "review");
    const acceptedItems = decisions.filter((item) => item.decision === "accepted");
    const promotedItems = decisions.filter((item) => item.decision === "promoted");
    return {
      available: true,
      generatedAt: result.generatedAt,
      summary: result.summary,
      pendingReviewPatternIds: reviewItems.map((item) => item.patternId),
      acceptedPatternIds: acceptedItems.map((item) => item.patternId),
      promotedPatternIds: promotedItems.map((item) => item.patternId),
      decisionsPath: result.decisionsPath,
      historyPath: result.historyPath,
      reportPath: result.reportPath
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message
    };
  }
}

/**
 * 收集包装提升追踪部分
 */
export function collectPromotionTraceSection(promotionTraceService) {
  try {
    const result = promotionTraceService.showPromotionTrace();
    return {
      available: true,
      generatedAt: result.generatedAt,
      summary: result.summary,
      matchCount: result.matchCount,
      tracePath: result.tracePath,
      reportPath: result.reportPath
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message
    };
  }
}

/**
 * 收集包装提升部分
 */
export function collectWrapperSection(conversationMinerService) {
  try {
    const result = conversationMinerService.generateWrapperPromotionAuditReport({});
    return {
      available: true,
      generatedAt: result.generatedAt,
      summary: result.summary,
      reportPath: result.reportPath,
      jsonPath: result.jsonPath
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message
    };
  }
}
