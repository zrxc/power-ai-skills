/**
 * Candidate Utils 模块
 * 
 * 职责：
 * - 候选项生成的辅助工具函数
 * - 置信度计算
 * - 基于模式分析构建候选项
 * - 项目配置调整候选项生成
 * - 推荐行动构建
 * 
 * 本模块提供纯函数式的工具方法，用于候选项的生成和计算，
 * 不依赖文件系统或外部状态，便于测试和复用。
 */

import path from "node:path";
import { normalizeCandidate } from "./candidates.mjs";

/**
 * 规范化列表：去重、过滤、排序
 * @param {Array} values - 原始列表
 * @returns {Array} 规范化后的列表
 */
function normalizeList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

/**
 * 计算候选项的置信度分数
 * 
 * 基于使用频率和复用分数计算，根据策略阈值进行分级调整。
 * 
 * @param {Object} params - 参数对象
 * @param {number} params.frequency - 模式出现频率
 * @param {number} params.reuseScore - 复用分数
 * @param {Object} params.policy - 进化策略配置
 * @returns {number} 置信度分数 (0-100)
 */
export function resolveCandidateConfidence({ frequency = 0, reuseScore = 0, policy }) {
  const baseline = Math.max(0, Math.min(100, Math.round((reuseScore * 0.7) + (frequency * 6))));
  if (frequency >= policy.highConfidencePromotionThreshold) return Math.max(75, baseline);
  if (frequency >= policy.minPatternFrequencyToDraft) return Math.max(55, baseline);
  return Math.max(35, baseline);
}

/**
 * 基于模式分析构建候选项列表
 * 
 * 根据模式频率、复用分数和决策记录，生成三类候选项：
 * - project-local-skill-draft: 项目本地技能草稿
 * - wrapper-proposal-candidate: Wrapper 提案候选
 * - docs-candidate: 文档候选
 * 
 * @param {Object} params - 参数对象
 * @param {Array} params.patterns - 模式列表
 * @param {Object} params.decisionLedger - 决策账本
 * @param {Object} params.policy - 进化策略配置（需包含 paths 属性）
 * @returns {Array} 候选项列表
 */
export function buildPatternCandidates({ patterns = [], decisionLedger, policy }) {
  const decisions = Array.isArray(decisionLedger?.decisions) ? decisionLedger.decisions : [];
  const decisionMap = new Map(decisions.map((item) => [item.patternId, item]));
  const generated = [];

  for (const pattern of patterns) {
    const decision = decisionMap.get(pattern.id);
    const frequency = Number(pattern.frequency) || 0;
    const reuseScore = Number(pattern.reuseScore) || 0;
    const confidence = resolveCandidateConfidence({ frequency, reuseScore, policy });
    const sourceConversationIds = normalizeList(
      decision?.sourceConversationIds?.length ? decision.sourceConversationIds : pattern.sampleConversationIds || []
    );

    // 生成项目本地技能草稿候选项
    if (pattern.candidateSkill?.name && confidence >= 55) {
      generated.push(normalizeCandidate({
        candidateId: `project-local-skill-draft::${pattern.id}`,
        candidateType: "project-local-skill-draft",
        sourcePatternIds: [pattern.id], sourceConversationIds, confidence,
        triggeredBy: "analyze-patterns", generatedAt: new Date().toISOString(),
        status: decision?.decision === "accepted" ? "review" : "generated",
        reason: `Pattern ${pattern.id} reached draft threshold with frequency ${frequency} and reuse score ${reuseScore}.`,
        targetPath: path.join(policy.paths.skillsTarget, "project-local", "auto-generated", pattern.candidateSkill.name),
        riskLevel: "low",
        metadata: { sceneType: pattern.sceneType, recommendation: pattern.recommendation || "", candidateSkillName: pattern.candidateSkill.name, reuseScore, frequency }
      }));
    }

    // 生成 Wrapper 提案候选项
    if ((decision?.target === "wrapper-proposal" || decision?.decision === "accepted" && decision?.target === "wrapper-proposal") && confidence >= 55) {
      generated.push(normalizeCandidate({
        candidateId: `wrapper-proposal-candidate::${pattern.id}`,
        candidateType: "wrapper-proposal-candidate",
        sourcePatternIds: [pattern.id], sourceConversationIds, confidence,
        triggeredBy: "conversation-decision-ledger", generatedAt: new Date().toISOString(),
        status: "review",
        reason: `Pattern ${pattern.id} was directed toward wrapper proposal review.`,
        targetPath: path.join(policy.paths.powerAiRoot, "proposals", "wrapper-promotions"),
        riskLevel: "medium",
        metadata: { sceneType: pattern.sceneType, recommendation: pattern.recommendation || "", decision: decision?.decision || "", decisionTarget: decision?.target || "" }
      }));
    }

    // 生成文档候选项（无直接技能模板映射的模式）
    if (!pattern.candidateSkill?.name && confidence >= 55) {
      generated.push(normalizeCandidate({
        candidateId: `docs-candidate::${pattern.id}`,
        candidateType: "docs-candidate",
        sourcePatternIds: [pattern.id], sourceConversationIds, confidence,
        triggeredBy: "analyze-patterns", generatedAt: new Date().toISOString(),
        status: "generated",
        reason: `Pattern ${pattern.id} has reusable guidance signals but no direct project-local skill template mapping.`,
        targetPath: path.join(policy.paths.powerAiRoot, "shared", "conversation-derived-docs"),
        riskLevel: "low",
        metadata: { sceneType: pattern.sceneType, recommendation: pattern.recommendation || "", reuseScore, frequency }
      }));
    }
  }

  return generated;
}

/**
 * 构建项目配置调整候选项
 * 
 * 当检测到项目配置漂移时，生成调整建议候选项。
 * 
 * @param {Object} params - 参数对象
 * @param {Object} params.teamPolicyService - 团队策略服务
 * @param {Function} params.getPowerAiPaths - 获取路径的函数
 * @returns {Array} 候选项列表（可能为空）
 */
export function buildProfileAdjustmentCandidate({ teamPolicyService, getPowerAiPaths }) {
  if (!teamPolicyService?.showProjectProfileDecision) return [];
  const profile = teamPolicyService.showProjectProfileDecision();
  if (profile?.decision?.driftStatus !== "drift") return [];
  return [normalizeCandidate({
    candidateId: `profile-adjustment-candidate::${profile.decision.recommendedProjectProfile || "unknown"}`,
    candidateType: "profile-adjustment-candidate",
    sourcePatternIds: [], sourceConversationIds: [],
    confidence: 70, triggeredBy: "team-policy-recommendation",
    generatedAt: new Date().toISOString(),
    status: profile.decision.decision === "deferred" ? "review" : "generated",
    reason: profile.decision.remediation || "Current selected project profile does not match the latest recommendation.",
    targetPath: getPowerAiPaths().projectProfileDecisionTarget,
    riskLevel: "medium",
    metadata: {
      selectedProjectProfile: profile.decision.selectedProjectProfile || "",
      recommendedProjectProfile: profile.decision.recommendedProjectProfile || "",
      driftStatus: profile.decision.driftStatus || "",
      decision: profile.decision.decision || ""
    }
  })];
}

/**
 * 根据候选项汇总构建推荐行动列表
 * 
 * @param {Object} summary - 候选项汇总对象
 * @returns {Array<string>} 推荐行动列表
 */
export function buildEvolutionRecommendedActions(summary) {
  const actions = [];
  if (summary.projectLocalSkillDrafts > 0) actions.push("Review project-local draft candidates before enabling low-risk auto materialization.");
  if (summary.wrapperProposalCandidates > 0) actions.push("Review wrapper proposal candidates and decide whether they should become formal wrapper promotion proposals.");
  if (summary.profileAdjustmentCandidates > 0) actions.push("Review profile adjustment candidates and record a project profile decision if drift remains unresolved.");
  if (summary.highRisk > 0) actions.push("Keep high-risk candidates in review until explicit governance approval is in place.");
  return actions;
}
