/**
 * Evolution Proposal Manager 模块
 * 
 * 职责：
 * - 提案的生成（从候选项转换）
 * - 提案的评审（接受、拒绝、归档、重新评审）
 * - 提案的应用（执行已接受的提案）
 * - 提案列表查询和过滤
 * 
 * 本模块负责管理进化提案的完整生命周期，
 * 从候选项升级生成提案、进行人工或自动评审，
 * 到最终应用已接受的提案，并提供完整的查询和历史记录功能。
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../../scripts/shared.mjs";
import { buildWrapperPromotionReadme } from "../conversation-miner/wrapper-promotion-support.mjs";
import {
  buildEvolutionDraftId,
  collectEvolutionDraftEntries,
  evolutionDraftArtifactTypes,
  normalizeEvolutionDraftEntry,
  summarizeAppliedEvolutionArtifacts,
  summarizeEvolutionDraftEntries,
  normalizeEvolutionProposal
} from "./proposals.mjs";
import {
  loadEvolutionProposals,
  persistEvolutionProposals,
  selectTargetProposals
} from "./evolution-proposal-storage.mjs";

/**
 * 创建进化提案管理器
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.context - 上下文对象（包含 packageJson 信息）
 * @param {string} options.projectRoot - 项目根目录
 * @param {Object} options.paths - 路径对象
 * @param {Object} options.teamPolicyService - 团队策略服务
 * @param {Function} options.loadEvolutionCandidates - 加载候选项的函数
 * @param {Function} options.stableStringify - 稳定字符串化函数（用于比较对象）
 * @returns {Object} 提案管理器对象
 */
export function createEvolutionProposalManager({
  context,
  projectRoot,
  paths,
  teamPolicyService,
  loadEvolutionCandidates,
  stableStringify
}) {
  function toPosixPath(filePath = "") {
    return String(filePath || "").replace(/\\/g, "/");
  }

  function toProjectRelativePath(filePath = "") {
    return toPosixPath(path.relative(projectRoot, filePath));
  }

  function normalizeTextList(values = []) {
    const normalized = [];
    for (const value of (Array.isArray(values) ? values : [values])) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed || normalized.includes(trimmed)) continue;
      normalized.push(trimmed);
    }
    return normalized;
  }

  function buildDraftHandoffRecord({
    status = "",
    ownerHint = "",
    nextReviewAt = "",
    nextAction = "",
    checklistPath = "",
    boundary = []
  } = {}) {
    const normalizedChecklistPath = checklistPath
      ? (path.isAbsolute(checklistPath) ? toProjectRelativePath(checklistPath) : toPosixPath(checklistPath))
      : "";

    return {
      status: String(status || "").trim(),
      ownerHint: String(ownerHint || "").trim(),
      nextReviewAt: String(nextReviewAt || "").trim(),
      nextAction: String(nextAction || "").trim(),
      checklistPath: normalizedChecklistPath,
      boundary: normalizeTextList(boundary)
    };
  }

  function slugify(value = "") {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[:/\\]+/g, "-")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return normalized || "draft";
  }

  function toDisplayName(value = "") {
    return String(value || "")
      .trim()
      .split(/[-_.\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getProposalEvidenceDetails(proposal) {
    return proposal?.evidence?.details && typeof proposal.evidence.details === "object" && !Array.isArray(proposal.evidence.details)
      ? proposal.evidence.details
      : {};
  }

  function resolveSharedSkillDraftName(proposal) {
    const details = getProposalEvidenceDetails(proposal);
    return slugify(
      details.recommendedSkillName
      || details.skillName
      || details.candidateSkillName
      || proposal.evidence?.sourcePatternIds?.[0]
      || proposal.proposalId
    );
  }

  function resolveWrapperDraftToolName(proposal) {
    const details = getProposalEvidenceDetails(proposal);
    return slugify(
      details.recommendedToolName
      || details.toolName
      || details.wrapperToolName
      || details.commandName
      || proposal.evidence?.sourcePatternIds?.[0]
      || proposal.proposalId
    );
  }

  function resolveReleaseImpactDraftName(proposal) {
    const details = getProposalEvidenceDetails(proposal);
    return slugify(
      details.releaseScope
      || details.releaseTarget
      || details.impactArea
      || proposal.evidence?.sourcePatternIds?.[0]
      || proposal.proposalId
    );
  }

  function buildDraftArtifactRecord({
    artifactType,
    draftRoot,
    files,
    nextActions = [],
    metadata = {},
    handoff = {},
    reusedExistingDraft = false
  }) {
    const normalizedNextActions = normalizeTextList(nextActions);
    const normalizedHandoff = buildDraftHandoffRecord({
      ...handoff,
      nextAction: handoff.nextAction || normalizedNextActions[0] || ""
    });

    return {
      artifactType,
      draftRoot: toProjectRelativePath(draftRoot),
      files: files.map((filePath) => toProjectRelativePath(filePath)),
      nextActions: normalizedNextActions,
      reusedExistingDraft,
      handoff: normalizedHandoff,
      ...metadata
    };
  }

  function materializeWrapperRolloutDraft({ proposal, generatedAt, note }) {
    const details = getProposalEvidenceDetails(proposal);
    const toolName = resolveWrapperDraftToolName(proposal);
    const displayName = String(details.displayName || details.recommendedDisplayName || toDisplayName(toolName)).trim() || toDisplayName(toolName);
    const integrationStyle = details.integrationStyle === "gui" ? "gui" : "terminal";
    const wrapperPromotionsRoot = path.join(paths.powerAiRoot, "proposals", "wrapper-promotions");
    const promotionRoot = path.join(wrapperPromotionsRoot, toolName);
    const promotionProposalPath = path.join(promotionRoot, "wrapper-promotion.json");
    const promotionReadmePath = path.join(promotionRoot, "README.md");
    const promotionExists = fs.existsSync(promotionProposalPath);

    if (!promotionExists) {
      ensureDir(promotionRoot);
      const wrapperDraft = {
        toolName,
        displayName,
        integrationStyle,
        sourcePatternId: proposal.evidence?.sourcePatternIds?.[0] || "",
        sourceEvolutionProposalId: proposal.proposalId,
        generatedAt,
        status: "accepted",
        reviewedAt: generatedAt,
        reviewNote: note || `Accepted via evolution proposal ${proposal.proposalId}.`,
        reviewHistory: [
          {
            status: "accepted",
            note: note || `Accepted via evolution proposal ${proposal.proposalId}.`,
            reviewedAt: generatedAt
          }
        ],
        materializationStatus: "not-generated",
        materializedAt: "",
        applicationStatus: "not-applied",
        appliedAt: "",
        appliedFiles: [],
        followUpStatus: "not-started",
        testsScaffoldedAt: "",
        testScaffoldFiles: [],
        docsGeneratedAt: "",
        docScaffoldFiles: [],
        finalizedAt: "",
        finalizationNote: "",
        registrationStatus: "not-registered",
        registeredAt: "",
        registrationNote: "",
        archiveStatus: "active",
        archivedAt: "",
        archiveNote: "",
        restoredAt: "",
        restorationNote: "",
        postApplyChecklistPath: "",
        pendingFollowUps: [
          `Run npx power-ai-skills materialize-wrapper-promotion --tool ${toolName} to generate registration artifacts.`,
          `Review the generated wrapper draft before apply/register steps.`,
          "Keep final wrapper registration manual; do not auto-register from evolution apply."
        ],
        currentEntry: integrationStyle === "gui"
          ? {
              mode: "host-first",
              command: `.power-ai/adapters/custom-tool-capture.example.ps1 -ToolName ${toolName} -ResponseText $response -QueueResponse -ConsumeNow`
            }
          : {
              mode: "terminal-first",
              command: `.power-ai/adapters/custom-tool-capture.example.ps1 -ToolName ${toolName} -ResponseText $response -Auto`
            },
        targetFiles: [
          "src/conversation-miner/wrappers.mjs",
          "src/commands/project-commands.mjs",
          "src/commands/index.mjs",
          "src/selection/cli.mjs",
          "tests/conversation-miner.test.mjs",
          "tests/selection.test.mjs",
          "README.md",
          "docs/tool-adapters.md",
          "docs/command-manual.md"
        ]
      };
      writeJson(promotionProposalPath, wrapperDraft);
      fs.writeFileSync(promotionReadmePath, buildWrapperPromotionReadme(wrapperDraft), "utf8");
    }

    return {
      toolName,
      displayName,
      integrationStyle,
      promotionRoot,
      applicationArtifacts: buildDraftArtifactRecord({
        artifactType: "wrapper-promotion-draft",
        draftRoot: promotionRoot,
        files: [promotionProposalPath, promotionReadmePath],
        nextActions: [
          `npx power-ai-skills materialize-wrapper-promotion --tool ${toolName}`,
          `npx power-ai-skills apply-wrapper-promotion --tool ${toolName} --dry-run`
        ],
        metadata: {
          toolName,
          displayName,
          integrationStyle
        },
        reusedExistingDraft: promotionExists
      })
    };
  }

  function materializeSharedSkillPromotionDraft({ proposal, generatedAt, note }) {
    const details = getProposalEvidenceDetails(proposal);
    const skillName = resolveSharedSkillDraftName(proposal);
    const displayName = String(details.displayName || details.recommendedDisplayName || toDisplayName(skillName)).trim() || toDisplayName(skillName);
    const draftRoot = path.join(paths.powerAiRoot, "shared", "evolution-drafts", "shared-skills", skillName);
    const referencesRoot = path.join(draftRoot, "references");
    const readmePath = path.join(draftRoot, "README.md");
    const skillPath = path.join(draftRoot, "SKILL.md");
    const metaPath = path.join(draftRoot, "skill.meta.json");
    const checklistPath = path.join(draftRoot, "manual-checklist.md");
    const templatesPath = path.join(referencesRoot, "templates.md");
    const artifactType = "shared-skill-draft";
    const draftId = buildEvolutionDraftId({
      proposalId: proposal.proposalId,
      artifactType
    });
    const generatedFiles = [
      readmePath,
      skillPath,
      metaPath,
      checklistPath,
      templatesPath
    ].map((filePath) => toProjectRelativePath(filePath));
    const handoff = buildDraftHandoffRecord({
      status: "pending-human-follow-up",
      ownerHint: "shared-skill-maintainers",
      nextReviewAt: "",
      nextAction: `Review ${toProjectRelativePath(skillPath)}`,
      checklistPath,
      boundary: [
        "Do not auto-promote this draft into the shared-skill catalog from evolution apply.",
        "Keep release and publication decisions manual."
      ]
    });

    ensureDir(referencesRoot);
    writeJson(metaPath, {
      name: skillName,
      displayName,
      status: "draft",
      source: "evolution-proposal-apply",
      sourceEvolutionProposalId: proposal.proposalId,
      generatedAt,
      proposalType: proposal.proposalType,
      riskLevel: proposal.riskLevel,
      sourcePatternIds: proposal.evidence?.sourcePatternIds || [],
      sourceConversationIds: proposal.evidence?.sourceConversationIds || [],
      recommendedAction: proposal.recommendedAction || "",
      note: note || "",
      artifactType,
      draftId,
      draftRoot: toProjectRelativePath(draftRoot),
      generatedFiles,
      handoff
    });
    fs.writeFileSync(skillPath, `# ${displayName}

- skillName: \`${skillName}\`
- status: \`draft\`
- sourceEvolutionProposalId: \`${proposal.proposalId}\`
- generatedAt: \`${generatedAt}\`
- riskLevel: \`${proposal.riskLevel}\`

## Handoff

- status: \`${handoff.status}\`
- ownerHint: \`${handoff.ownerHint}\`
- checklist: \`${toProjectRelativePath(checklistPath)}\`
- next action: ${handoff.nextAction}
- next review: \`none\`

## Intent

${proposal.recommendedAction || "Review this shared-skill draft and refine it before promotion."}

## Evidence

\`\`\`json
${JSON.stringify({
  sourcePatternIds: proposal.evidence?.sourcePatternIds || [],
  sourceConversationIds: proposal.evidence?.sourceConversationIds || [],
  details
}, null, 2)}
\`\`\`
`, "utf8");
    fs.writeFileSync(templatesPath, `# Shared Skill Draft Notes

- proposalId: \`${proposal.proposalId}\`
- generatedAt: \`${generatedAt}\`
- next step: refine this draft into a maintainable shared skill package.
- checklist: \`${toProjectRelativePath(checklistPath)}\`
`, "utf8");
    fs.writeFileSync(checklistPath, `# Shared Skill Draft Handoff Checklist

- owner hint: \`${handoff.ownerHint}\`
- handoff status: \`${handoff.status}\`
- next review: \`none\`

- [ ] Review the generated skill instructions and remove project-local assumptions that should not ship into a shared skill.
- [ ] Validate the evidence bundle and confirm the draft still reflects the intended reusable workflow.
- [ ] Decide whether this draft is ready to enter the shared-skill workflow manually.
- [ ] Keep release or publication decisions outside evolution apply.
`, "utf8");
    fs.writeFileSync(readmePath, `# Shared Skill Evolution Draft

- skillName: \`${skillName}\`
- displayName: \`${displayName}\`
- sourceEvolutionProposalId: \`${proposal.proposalId}\`
- generatedAt: \`${generatedAt}\`
- note: ${note ? `\`${note}\`` : "`none`"}

## Generated Files

- \`SKILL.md\`
- \`skill.meta.json\`
- \`manual-checklist.md\`
- \`references/templates.md\`

## Handoff

- status: \`${handoff.status}\`
- owner hint: \`${handoff.ownerHint}\`
- checklist: \`${toProjectRelativePath(checklistPath)}\`
- next action: ${handoff.nextAction}
- next review: \`none\`

## Boundary

- Do not auto-promote this draft into the shared-skill catalog from evolution apply.
- Keep release/publication decisions outside evolution apply.

## Next Steps

1. Review the generated draft and refine the skill instructions.
2. Promote the draft into the central shared-skill workflow manually when the rules are stable.
3. Keep release/publication decisions outside evolution apply.
`, "utf8");

    return {
      skillName,
      displayName,
      draftRoot,
      applicationArtifacts: buildDraftArtifactRecord({
        artifactType,
        draftRoot,
        files: [readmePath, skillPath, metaPath, checklistPath, templatesPath],
        nextActions: [
          handoff.nextAction,
          "Promote this draft into the shared-skill workflow manually after validation."
        ],
        metadata: {
          skillName,
          displayName
        },
        handoff
      })
    };
  }

  function materializeReleaseImpactDraft({ proposal, generatedAt, note }) {
    const details = getProposalEvidenceDetails(proposal);
    const draftName = resolveReleaseImpactDraftName(proposal);
    const draftRoot = path.join(paths.powerAiRoot, "shared", "evolution-drafts", "release-impacts", draftName);
    const draftJsonPath = path.join(draftRoot, "release-impact-draft.json");
    const readmePath = path.join(draftRoot, "README.md");
    const checklistPath = path.join(draftRoot, "manual-checklist.md");
    const artifactType = "release-impact-draft";
    const draftId = buildEvolutionDraftId({
      proposalId: proposal.proposalId,
      artifactType
    });
    const generatedFiles = [
      draftJsonPath,
      readmePath,
      checklistPath
    ].map((filePath) => toProjectRelativePath(filePath));
    const handoff = buildDraftHandoffRecord({
      status: "pending-human-follow-up",
      ownerHint: "package-maintenance / release-governance",
      nextReviewAt: "",
      nextAction: `Review ${toProjectRelativePath(draftJsonPath)}`,
      checklistPath,
      boundary: [
        "Do not auto-register wrappers.",
        "Do not auto-publish packages.",
        "Do not auto-generate release outputs."
      ]
    });

    ensureDir(draftRoot);
    writeJson(draftJsonPath, {
      proposalId: proposal.proposalId,
      proposalType: proposal.proposalType,
      generatedAt,
      note: note || "",
      riskLevel: proposal.riskLevel,
      recommendedAction: proposal.recommendedAction || "",
      sourceCandidateIds: proposal.sourceCandidateIds || [],
      sourcePatternIds: proposal.evidence?.sourcePatternIds || [],
      sourceConversationIds: proposal.evidence?.sourceConversationIds || [],
      details,
      artifactType,
      draftId,
      draftRoot: toProjectRelativePath(draftRoot),
      generatedFiles,
      handoff
    });
    fs.writeFileSync(readmePath, `# Release Impact Evolution Draft

- proposalId: \`${proposal.proposalId}\`
- generatedAt: \`${generatedAt}\`
- riskLevel: \`${proposal.riskLevel}\`
- note: ${note ? `\`${note}\`` : "`none`"}

## Intent

${proposal.recommendedAction || "Escalate this accepted proposal through release governance manually."}

## Draft Bundle

- \`release-impact-draft.json\`
- \`manual-checklist.md\`

## Handoff

- status: \`${handoff.status}\`
- owner hint: \`${handoff.ownerHint}\`
- checklist: \`${toProjectRelativePath(checklistPath)}\`
- next action: ${handoff.nextAction}
- next review: \`none\`

## Boundary

- This draft does not auto-register wrappers.
- This draft does not auto-publish packages.
- This draft does not auto-generate release outputs.
`, "utf8");
    fs.writeFileSync(checklistPath, `# Manual Release Escalation Checklist

- owner hint: \`${handoff.ownerHint}\`
- handoff status: \`${handoff.status}\`
- next review: \`none\`

- [ ] Review the accepted evolution proposal and confirm the escalation scope.
- [ ] Decide whether the issue belongs in upgrade advice, release gates, notification payload, or another maintainer workflow.
- [ ] Prepare maintainer-facing follow-up work using the draft JSON as evidence.
- [ ] Keep final release automation manual and governance-approved.
`, "utf8");

    return {
      draftName,
      draftRoot,
      applicationArtifacts: buildDraftArtifactRecord({
        artifactType,
        draftRoot,
        files: [draftJsonPath, readmePath, checklistPath],
        nextActions: [
          handoff.nextAction,
          "Escalate the draft to package-maintenance or release-governance owners manually."
        ],
        metadata: {
          draftName
        },
        handoff
      })
    };
  }

  function applyAcceptedProposalToDraft({ proposal, generatedAt, note }) {
    if (proposal.proposalType === "project-profile-adjustment-proposal") {
      const recommendedProjectProfile = proposal.evidence?.details?.recommendedProjectProfile || "";
      if (!recommendedProjectProfile) {
        throw new Error(`Evolution proposal ${proposal.proposalId} is missing recommendedProjectProfile.`);
      }
      const profileResult = teamPolicyService.reviewProjectProfile({
        acceptedProjectProfile: recommendedProjectProfile,
        applySelection: true,
        reason: note || `Applied via evolution proposal ${proposal.proposalId}.`
      });
      return {
        ...profileResult,
        applicationArtifacts: {
          artifactType: "project-profile-selection",
          selectedProjectProfile: profileResult.selectedProjectProfile || "",
          recommendedProjectProfile: profileResult.recommendedProjectProfile || ""
        }
      };
    }

    if (proposal.proposalType === "wrapper-rollout-adjustment-proposal") {
      return materializeWrapperRolloutDraft({ proposal, generatedAt, note });
    }

    if (proposal.proposalType === "shared-skill-promotion-proposal") {
      return materializeSharedSkillPromotionDraft({ proposal, generatedAt, note });
    }

    if (proposal.proposalType === "release-impact-escalation-proposal") {
      return materializeReleaseImpactDraft({ proposal, generatedAt, note });
    }

    throw new Error(`unsupported proposal type ${proposal.proposalType}`);
  }

  function loadProposalState() {
    return loadEvolutionProposals(paths);
  }

  /**
   * 从候选项构建提案
   * 
   * 根据不同候选项类型生成对应类型的提案：
   * - profile-adjustment-candidate → project-profile-adjustment-proposal
   * - wrapper-proposal-candidate → wrapper-rollout-adjustment-proposal
   * - shared-skill-candidate → shared-skill-promotion-proposal
   * - 高风险候选项 → release-impact-escalation-proposal
   * 
   * @param {Object} candidate - 候选项对象
   * @returns {Object|null} 提案对象或 null（如果不适用）
   */
  function buildProposalFromCandidate(candidate) {
    // 项目配置调整提案
    if (candidate.candidateType === "profile-adjustment-candidate") {
      return normalizeEvolutionProposal({
        proposalId: `project-profile-adjustment::${candidate.candidateId}`,
        proposalType: "project-profile-adjustment-proposal",
        sourceCandidateIds: [candidate.candidateId],
        evidence: { sourcePatternIds: candidate.sourcePatternIds, sourceConversationIds: candidate.sourceConversationIds, details: { ...candidate.metadata, candidateType: candidate.candidateType } },
        riskLevel: "medium", generatedAt: new Date().toISOString(), status: "draft",
        recommendedAction: "Review the recommended profile change and decide whether to accept, defer, or reject it.",
        proposalRoot: path.join(paths.evolutionProposalsRoot, `project-profile-adjustment-${candidate.metadata?.recommendedProjectProfile || "unknown"}`)
      });
    }

    // Wrapper 提案
    if (candidate.candidateType === "wrapper-proposal-candidate") {
      return normalizeEvolutionProposal({
        proposalId: `wrapper-rollout-adjustment::${candidate.candidateId}`,
        proposalType: "wrapper-rollout-adjustment-proposal",
        sourceCandidateIds: [candidate.candidateId],
        evidence: { sourcePatternIds: candidate.sourcePatternIds, sourceConversationIds: candidate.sourceConversationIds, details: { ...candidate.metadata, candidateType: candidate.candidateType } },
        riskLevel: "high", generatedAt: new Date().toISOString(), status: "review",
        recommendedAction: "Review whether this wrapper proposal should become a formal wrapper promotion or remain a candidate.",
        proposalRoot: path.join(paths.evolutionProposalsRoot, `wrapper-rollout-${candidate.sourcePatternIds[0] || "candidate"}`)
      });
    }

    // 共享技能提升提案
    if (candidate.candidateType === "shared-skill-candidate") {
      return normalizeEvolutionProposal({
        proposalId: `shared-skill-promotion::${candidate.candidateId}`,
        proposalType: "shared-skill-promotion-proposal",
        sourceCandidateIds: [candidate.candidateId],
        evidence: { sourcePatternIds: candidate.sourcePatternIds, sourceConversationIds: candidate.sourceConversationIds, details: { ...candidate.metadata, candidateType: candidate.candidateType } },
        riskLevel: "high", generatedAt: new Date().toISOString(), status: "review",
        recommendedAction: "Review whether this project-local learning is stable enough to promote into a shared skill.",
        proposalRoot: path.join(paths.evolutionProposalsRoot, `shared-skill-${candidate.sourcePatternIds[0] || "candidate"}`)
      });
    }

    // 高风险候选项的升级提案
    if (candidate.riskLevel === "high") {
      return normalizeEvolutionProposal({
        proposalId: `release-impact-escalation::${candidate.candidateId}`,
        proposalType: "release-impact-escalation-proposal",
        sourceCandidateIds: [candidate.candidateId],
        evidence: { sourcePatternIds: candidate.sourcePatternIds, sourceConversationIds: candidate.sourceConversationIds, details: { ...candidate.metadata, candidateType: candidate.candidateType } },
        riskLevel: "high", generatedAt: new Date().toISOString(), status: "review",
        recommendedAction: "Escalate this candidate through release governance before enabling any automatic rollout.",
        proposalRoot: path.join(paths.evolutionProposalsRoot, `release-impact-${candidate.sourcePatternIds[0] || "candidate"}`)
      });
    }

    return null;
  }

  /**
   * 生成进化提案
   * 
   * 从当前候选项中生成提案，合并现有提案并处理过期提案的归档。
   * 
   * @param {Object} options - 配置选项
   * @param {string} options.trigger - 触发源
   * @returns {Object} 生成结果对象
   */
  function generateEvolutionProposals({ trigger = "manual" } = {}) {
    const { candidates: candidatePayload } = loadEvolutionCandidates();
    const { proposals: existingProposalPayload, history: existingHistory } = loadProposalState();
    const generatedAt = new Date().toISOString();
    const nextHistory = {
      schemaVersion: existingHistory.schemaVersion || 1,
      entries: Array.isArray(existingHistory.entries) ? [...existingHistory.entries] : []
    };
    const existingMap = new Map((existingProposalPayload.proposals || []).map((item) => [item.proposalId, item]));
    const nextProposals = [];

    // 从候选项生成提案
    const proposalCandidates = (candidatePayload.candidates || []).map((candidate) => buildProposalFromCandidate(candidate)).filter(Boolean);

    // 合并新提案和现有提案
    for (const proposal of proposalCandidates) {
      const existing = existingMap.get(proposal.proposalId);
      const merged = existing
        ? normalizeEvolutionProposal({ ...existing, ...proposal, status: ["accepted", "rejected", "applied", "archived"].includes(existing.status) ? existing.status : proposal.status })
        : proposal;
      nextProposals.push(merged);
      // 记录变更到历史
      if (!existing || stableStringify(existing) !== stableStringify(merged)) {
        nextHistory.entries.push({ recordedAt: generatedAt, trigger, proposalId: merged.proposalId, snapshot: merged });
      }
    }

    // 处理不再存在的提案（归档）
    for (const existing of existingProposalPayload.proposals || []) {
      if (proposalCandidates.some((item) => item.proposalId === existing.proposalId)) continue;
      if (existing.status === "applied" || existing.status === "archived") {
        nextProposals.push(existing);
        continue;
      }
      const archived = normalizeEvolutionProposal({ ...existing, status: "archived", generatedAt });
      nextProposals.push(archived);
      if (stableStringify(existing) !== stableStringify(archived)) {
        nextHistory.entries.push({ recordedAt: generatedAt, trigger: `${trigger}:archived`, proposalId: archived.proposalId, snapshot: archived });
      }
    }

    return persistEvolutionProposals({ context, projectRoot, paths, generatedAt, proposals: nextProposals, history: nextHistory });
  }

  /**
   * 列出进化提案（支持过滤）
   * 
   * @param {Object} options - 配置选项
   * @param {string} options.proposalType - 提案类型过滤（可选）
   * @param {string} options.status - 状态过滤（可选）
   * @param {boolean} options.includeArchived - 是否包含已归档的提案
   * @returns {Object} 查询结果对象
   */
  function listEvolutionProposals({ proposalType = "", status = "", includeArchived = false, limit = 0 } = {}) {
    const { proposals, history } = loadProposalState();
    const filteredProposals = selectTargetProposals({
      proposals: proposals.proposals,
      fromStatus: status,
      proposalType,
      includeArchived,
      limit
    });
    const filteredPayload = { schemaVersion: 1, updatedAt: proposals.updatedAt, proposals: filteredProposals };

    return {
      generatedAt: new Date().toISOString(), packageName: context.packageJson.name,
      version: context.packageJson.version, projectRoot,
      summary: {
        requestedType: proposalType || "", requestedStatus: status || "", includeArchived, limit: Number(limit) > 0 ? Number(limit) : 0,
        total: proposals.proposals.length, returned: filteredProposals.length,
        historyEntries: history.entries.length, ...summarizeEvolutionProposals(filteredPayload)
      },
      proposals: filteredProposals,
      reportPath: paths.evolutionProposalReportPath, jsonPath: paths.evolutionProposalReportJsonPath,
      proposalsPath: paths.evolutionProposalsTarget, historyPath: paths.evolutionProposalHistoryTarget
    };
  }

  function listEvolutionDrafts({ artifactType = "", proposalId = "", limit = 0 } = {}) {
    const { proposals } = loadProposalState();
    const allDrafts = collectEvolutionDraftEntries({
      proposals: proposals.proposals
    });
    const drafts = collectEvolutionDraftEntries({
      proposals: proposals.proposals,
      artifactType,
      proposalId,
      limit
    });

    return {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      summary: {
        requestedType: artifactType || "",
        requestedProposalId: proposalId || "",
        limit: Number(limit) > 0 ? Number(limit) : 0,
        total: allDrafts.length,
        returned: drafts.length,
        ...summarizeEvolutionDraftEntries(drafts)
      },
      drafts,
      proposalsPath: paths.evolutionProposalsTarget,
      reportPath: paths.evolutionProposalReportPath,
      jsonPath: paths.evolutionProposalReportJsonPath
    };
  }

  function showEvolutionDraft({ draftId = "", proposalId = "" } = {}) {
    if (!draftId && !proposalId) {
      throw new Error("show-evolution-draft requires --draft <draft-id> or --proposal <proposal-id>.");
    }

    const { proposals } = loadProposalState();
    const drafts = collectEvolutionDraftEntries({
      proposals: proposals.proposals
    });
    const draft = drafts.find((item) => (
      (draftId && item.draftId === draftId)
      || (proposalId && item.proposalId === proposalId)
      || (!proposalId && item.proposalId === draftId)
    ));

    if (!draft) {
      throw new Error(`Evolution draft not found for target: ${draftId || proposalId}`);
    }

    return {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      draftId: draft.draftId,
      proposalId: draft.proposalId,
      draft,
      proposalsPath: paths.evolutionProposalsTarget,
      reportPath: paths.evolutionProposalReportPath,
      jsonPath: paths.evolutionProposalReportJsonPath
    };
  }

  /**
   * 评审进化提案
   * 
   * 支持四种评审决策：接受、拒绝、归档、重新评审。
   * 
   * @param {Object} options - 配置选项
   * @param {string} options.proposalId - 提案 ID（必填）
   * @param {boolean} options.accept - 是否接受
   * @param {boolean} options.reject - 是否拒绝
   * @param {boolean} options.archive - 是否归档
   * @param {boolean} options.review - 是否重新评审
   * @param {string} options.note - 评审备注
   * @returns {Object} 评审结果对象
   * @throws {Error} 当参数不正确或提案不存在时
   */
  function reviewEvolutionProposal({
    proposalId = "",
    fromStatus = "",
    proposalType = "",
    includeArchived = false,
    limit = 0,
    accept = false,
    reject = false,
    archive = false,
    review = false,
    note = ""
  } = {}) {
    if (!proposalId && !fromStatus) {
      throw new Error("review-evolution-proposal requires --proposal <proposal-id> or --from-status <status>.");
    }
    const decisionCount = [accept, reject, archive, review].filter(Boolean).length;
    if (decisionCount !== 1) throw new Error("Choose exactly one decision: --accept, --reject, --archive, or --review.");

    const generatedAt = new Date().toISOString();
    const { proposals, history } = loadProposalState();
    const nextStatus = accept ? "accepted" : reject ? "rejected" : archive ? "archived" : "review";
    const targetProposals = selectTargetProposals({
      proposals: proposals.proposals,
      proposalId,
      fromStatus,
      proposalType,
      includeArchived,
      limit
    });
    if (targetProposals.length === 0) {
      const targetDescription = proposalId
        ? proposalId
        : `${fromStatus}${proposalType ? `/${proposalType}` : ""}`;
      throw new Error(`Evolution proposal not found for target: ${targetDescription}`);
    }

    const targetIds = new Set(targetProposals.map((item) => item.proposalId));
    const skipped = [];
    const updatedById = new Map();
    for (const currentProposal of targetProposals) {
      if (currentProposal.status === "applied" && nextStatus !== "archived") {
        skipped.push({
          proposalId: currentProposal.proposalId,
          reason: `already applied and cannot move to ${nextStatus}`
        });
        continue;
      }
      const updatedProposal = normalizeEvolutionProposal({
        ...currentProposal,
        status: nextStatus,
        statusUpdatedAt: generatedAt,
        statusUpdatedBy: "manual-review",
        note: note || currentProposal.note || ""
      });
      updatedById.set(currentProposal.proposalId, updatedProposal);
    }

    if (updatedById.size === 0) {
      throw new Error("No evolution proposals could be updated for the requested review operation.");
    }

    const nextProposals = proposals.proposals.map((item) => updatedById.get(item.proposalId) || item);
    const nextHistory = {
      schemaVersion: history.schemaVersion || 1,
      entries: [
        ...(history.entries || []),
        ...[...updatedById.values()].map((updatedProposal) => ({
          recordedAt: generatedAt,
          trigger: `review-evolution-proposal:${nextStatus}`,
          proposalId: updatedProposal.proposalId,
          snapshot: updatedProposal
        }))
      ]
    };
    const report = persistEvolutionProposals({ context, projectRoot, paths, generatedAt, proposals: nextProposals, history: nextHistory });
    const processedProposals = report.proposals.filter((item) => targetIds.has(item.proposalId) && updatedById.has(item.proposalId));
    const isBatch = !proposalId || targetProposals.length > 1;

    return {
      generatedAt,
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      mode: isBatch ? "batch" : "single",
      proposalId: proposalId || processedProposals[0]?.proposalId || "",
      sourceStatus: fromStatus || "",
      proposalType: proposalType || "",
      includeArchived,
      limit: Number(limit) > 0 ? Number(limit) : 0,
      decision: nextStatus,
      note: note || processedProposals[0]?.note || "",
      proposal: isBatch ? null : (processedProposals[0] || null),
      processedCount: processedProposals.length,
      skippedCount: skipped.length,
      skipped,
      proposals: processedProposals,
      summary: report.summary,
      reportPath: report.reportPath, jsonPath: report.jsonPath,
      proposalsPath: report.proposalsPath, historyPath: report.historyPath
    };
  }

  /**
   * 应用进化提案
   * 
   * 仅支持应用已接受状态的提案。根据提案类型执行相应的应用逻辑。
   * 
   * @param {Object} options - 配置选项
   * @param {string} options.proposalId - 提案 ID（必填）
   * @param {string} options.note - 应用备注
   * @returns {Object} 应用结果对象
   * @throws {Error} 当提案不存在、未接受或不支持该类型时
   */
  function applyEvolutionProposal({
    proposalId = "",
    fromStatus = "",
    proposalType = "",
    includeArchived = false,
    limit = 0,
    note = ""
  } = {}) {
    if (!proposalId && !fromStatus) {
      throw new Error("apply-evolution-proposal requires --proposal <proposal-id> or --from-status <status>.");
    }

    const generatedAt = new Date().toISOString();
    const { proposals, history } = loadProposalState();
    const targetProposals = selectTargetProposals({
      proposals: proposals.proposals,
      proposalId,
      fromStatus,
      proposalType,
      includeArchived,
      limit
    });
    if (targetProposals.length === 0) {
      const targetDescription = proposalId
        ? proposalId
        : `${fromStatus}${proposalType ? `/${proposalType}` : ""}`;
      throw new Error(`Evolution proposal not found for target: ${targetDescription}`);
    }

    const targetIds = new Set(targetProposals.map((item) => item.proposalId));
    const skipped = [];
    const appliedById = new Map();
    const applicationResults = [];

    for (const currentProposal of targetProposals) {
      if (currentProposal.status !== "accepted") {
        skipped.push({
          proposalId: currentProposal.proposalId,
          reason: `status ${currentProposal.status} is not accepted`
        });
        continue;
      }

      let applicationResult = null;
      try {
        applicationResult = applyAcceptedProposalToDraft({
          proposal: currentProposal,
          generatedAt,
          note
        });
      } catch (error) {
        skipped.push({
          proposalId: currentProposal.proposalId,
          reason: error instanceof Error ? error.message : `failed to apply proposal ${currentProposal.proposalId}`
        });
        continue;
      }

      const updatedProposal = normalizeEvolutionProposal({
        ...currentProposal,
        status: "applied",
        statusUpdatedAt: generatedAt,
        statusUpdatedBy: "apply-evolution-proposal",
        note: note || currentProposal.note || "",
        applicationArtifacts: applicationResult?.applicationArtifacts || currentProposal.applicationArtifacts || {}
      });
      appliedById.set(currentProposal.proposalId, updatedProposal);
      applicationResults.push({
        proposalId: currentProposal.proposalId,
        proposalType: currentProposal.proposalType,
        result: applicationResult
      });
    }

    if (appliedById.size === 0) {
      throw new Error("No evolution proposals could be applied for the requested operation.");
    }

    const nextHistory = {
      schemaVersion: history.schemaVersion || 1,
      entries: [
        ...(history.entries || []),
        ...[...appliedById.values()].map((updatedProposal) => ({
          recordedAt: generatedAt,
          trigger: "apply-evolution-proposal",
          proposalId: updatedProposal.proposalId,
          snapshot: updatedProposal
        }))
      ]
    };
    const report = persistEvolutionProposals({
      context,
      projectRoot,
      paths,
      generatedAt,
      proposals: proposals.proposals.map((item) => appliedById.get(item.proposalId) || item),
      history: nextHistory
    });
    const processedProposals = report.proposals.filter((item) => targetIds.has(item.proposalId) && appliedById.has(item.proposalId));
    const isBatch = !proposalId || targetProposals.length > 1;

    return {
      generatedAt,
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      mode: isBatch ? "batch" : "single",
      proposalId: proposalId || processedProposals[0]?.proposalId || "",
      sourceStatus: fromStatus || "",
      proposalType: proposalType || "",
      includeArchived,
      limit: Number(limit) > 0 ? Number(limit) : 0,
      decision: "applied",
      note: note || processedProposals[0]?.note || "",
      proposal: isBatch ? null : (processedProposals[0] || null),
      applicationResult: isBatch ? null : (applicationResults[0]?.result || null),
      applicationResults,
      processedCount: processedProposals.length,
      skippedCount: skipped.length,
      skipped,
      proposals: processedProposals,
      summary: report.summary,
      reportPath: report.reportPath, jsonPath: report.jsonPath,
      proposalsPath: report.proposalsPath, historyPath: report.historyPath
    };
  }

  return {
    loadEvolutionProposals: loadProposalState,
    persistEvolutionProposals,
    generateEvolutionProposals,
    listEvolutionProposals,
    listEvolutionDrafts,
    showEvolutionDraft,
    reviewEvolutionProposal,
    applyEvolutionProposal,
    // 导出内部函数供外部测试或扩展使用
    buildProposalFromCandidate
  };
}
