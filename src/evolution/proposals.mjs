/**
 * Evolution Proposals 模块
 * 
 * 负责：
 * - 提案创建、规范化、汇总
 * - 提案 SLA 老化计算
 * - Markdown README 生成
 */

const candidateRiskLevels = new Set(["low", "medium", "high"]);
export const defaultEvolutionProposalReviewSlaDays = 7;
export const defaultEvolutionProposalAcceptedApplySlaDays = 3;

const proposalTypes = new Set([
  "shared-skill-promotion-proposal",
  "project-profile-adjustment-proposal",
  "wrapper-rollout-adjustment-proposal",
  "release-impact-escalation-proposal"
]);

const proposalStatuses = new Set(["draft", "review", "accepted", "rejected", "applied", "archived"]);
export const evolutionDraftArtifactTypes = new Set([
  "shared-skill-draft",
  "wrapper-promotion-draft",
  "release-impact-draft"
]);

function normalizeList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function normalizeOrderedList(values = []) {
  const normalized = [];
  for (const value of (Array.isArray(values) ? values : [values])) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || normalized.includes(trimmed)) continue;
    normalized.push(trimmed);
  }
  return normalized;
}

function toPosixPath(filePath = "") {
  return String(filePath || "").replace(/\\/g, "/");
}

function extractDraftHandoff(applicationArtifacts = {}) {
  const handoff = applicationArtifacts.handoff && typeof applicationArtifacts.handoff === "object" && !Array.isArray(applicationArtifacts.handoff)
    ? applicationArtifacts.handoff
    : {};

  const checklistPath = typeof handoff.checklistPath === "string" && handoff.checklistPath.trim()
    ? handoff.checklistPath.trim()
    : (Array.isArray(applicationArtifacts.files)
      ? (applicationArtifacts.files.find((item) => /\/manual-checklist\.md$/i.test(String(item || "").replace(/\\/g, "/"))) || "")
      : "");
  const nextActions = normalizeOrderedList(applicationArtifacts.nextActions || []);
  const boundary = normalizeOrderedList(handoff.boundary || []);

  return {
    status: typeof handoff.status === "string" ? handoff.status.trim() : "",
    ownerHint: typeof handoff.ownerHint === "string" ? handoff.ownerHint.trim() : "",
    nextReviewAt: typeof handoff.nextReviewAt === "string" ? handoff.nextReviewAt.trim() : "",
    nextAction: typeof handoff.nextAction === "string" && handoff.nextAction.trim()
      ? handoff.nextAction.trim()
      : (nextActions[0] || ""),
    checklistPath: toPosixPath(checklistPath),
    boundary
  };
}

function extractDraftMetadata(applicationArtifacts = {}) {
  const metadata = { ...applicationArtifacts };
  delete metadata.artifactType;
  delete metadata.draftRoot;
  delete metadata.files;
  delete metadata.nextActions;
  delete metadata.reusedExistingDraft;
  delete metadata.handoff;
  return metadata;
}

export function createEmptyEvolutionProposals() {
  return {
    schemaVersion: 1,
    updatedAt: "",
    proposals: []
  };
}

export function normalizeEvolutionProposal(proposal = {}) {
  return {
    proposalId: proposal.proposalId || "",
    proposalType: proposalTypes.has(proposal.proposalType) ? proposal.proposalType : "release-impact-escalation-proposal",
    sourceCandidateIds: normalizeList(proposal.sourceCandidateIds || []),
    evidence: proposal.evidence && typeof proposal.evidence === "object" && !Array.isArray(proposal.evidence)
      ? {
          sourcePatternIds: normalizeList(proposal.evidence.sourcePatternIds || []),
          sourceConversationIds: normalizeList(proposal.evidence.sourceConversationIds || []),
          details: proposal.evidence.details && typeof proposal.evidence.details === "object" && !Array.isArray(proposal.evidence.details)
            ? { ...proposal.evidence.details }
            : {}
        }
      : {
          sourcePatternIds: [],
          sourceConversationIds: [],
          details: {}
        },
    riskLevel: candidateRiskLevels.has(proposal.riskLevel) ? proposal.riskLevel : "medium",
    generatedAt: proposal.generatedAt || "",
    status: proposalStatuses.has(proposal.status) ? proposal.status : "draft",
    recommendedAction: proposal.recommendedAction || "",
    proposalRoot: proposal.proposalRoot || "",
    statusUpdatedAt: proposal.statusUpdatedAt || proposal.generatedAt || "",
    statusUpdatedBy: proposal.statusUpdatedBy || "",
    note: proposal.note || "",
    applicationArtifacts: proposal.applicationArtifacts && typeof proposal.applicationArtifacts === "object" && !Array.isArray(proposal.applicationArtifacts)
      ? { ...proposal.applicationArtifacts }
      : {}
  };
}

export function summarizeEvolutionProposals(payload) {
  const proposals = Array.isArray(payload?.proposals) ? payload.proposals : [];
  const aging = buildEvolutionProposalAgingSummary(proposals);
  const summary = {
    total: proposals.length,
    draft: 0,
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
    reviewSlaDays: aging.reviewSlaDays,
    acceptedApplySlaDays: aging.acceptedApplySlaDays,
    staleReview: aging.staleReview,
    staleAcceptedPendingApply: aging.staleAcceptedPendingApply,
    oldestReviewAgeDays: aging.oldestReviewAgeDays,
    oldestAcceptedAgeDays: aging.oldestAcceptedAgeDays,
    staleReviewProposalIds: aging.staleReviewProposalIds,
    staleAcceptedProposalIds: aging.staleAcceptedProposalIds
  };
  for (const proposal of proposals) {
    if (Object.hasOwn(summary, proposal.status)) summary[proposal.status] += 1;
    if (proposal.riskLevel === "high") summary.highRisk += 1;
    if (proposal.proposalType === "project-profile-adjustment-proposal") summary.profileAdjustments += 1;
    if (proposal.proposalType === "wrapper-rollout-adjustment-proposal") summary.wrapperAdjustments += 1;
    if (proposal.proposalType === "shared-skill-promotion-proposal") summary.sharedSkillPromotions += 1;
    if (proposal.proposalType === "release-impact-escalation-proposal") summary.releaseEscalations += 1;
  }
  return summary;
}

export function buildEvolutionDraftId({ proposalId = "", artifactType = "" } = {}) {
  return `${artifactType}::${proposalId}`;
}

export function normalizeEvolutionDraftEntry(proposal = {}) {
  const applicationArtifacts = proposal.applicationArtifacts && typeof proposal.applicationArtifacts === "object" && !Array.isArray(proposal.applicationArtifacts)
    ? proposal.applicationArtifacts
    : {};
  if (!evolutionDraftArtifactTypes.has(applicationArtifacts.artifactType || "")) {
    return null;
  }
  const handoff = extractDraftHandoff(applicationArtifacts);

  return {
    draftId: buildEvolutionDraftId({
      proposalId: proposal.proposalId,
      artifactType: applicationArtifacts.artifactType
    }),
    artifactType: applicationArtifacts.artifactType,
    proposalId: proposal.proposalId || "",
    proposalType: proposal.proposalType || "",
    proposalStatus: proposal.status || "",
    riskLevel: proposal.riskLevel || "",
    generatedAt: proposal.statusUpdatedAt || proposal.generatedAt || "",
    proposalRoot: toPosixPath(proposal.proposalRoot || ""),
    draftRoot: applicationArtifacts.draftRoot || "",
    generatedFiles: Array.isArray(applicationArtifacts.files) ? [...applicationArtifacts.files] : [],
    nextActions: Array.isArray(applicationArtifacts.nextActions) ? [...applicationArtifacts.nextActions] : [],
    followUpActionCount: Array.isArray(applicationArtifacts.nextActions) ? applicationArtifacts.nextActions.length : 0,
    reusedExistingDraft: Boolean(applicationArtifacts.reusedExistingDraft),
    handoff,
    handoffStatus: handoff.status,
    ownerHint: handoff.ownerHint,
    nextReviewAt: handoff.nextReviewAt,
    nextAction: handoff.nextAction,
    checklistPath: handoff.checklistPath,
    handoffBoundary: handoff.boundary,
    metadata: extractDraftMetadata(applicationArtifacts),
    sourceCandidateIds: Array.isArray(proposal.sourceCandidateIds) ? [...proposal.sourceCandidateIds] : [],
    sourcePatternIds: Array.isArray(proposal.evidence?.sourcePatternIds) ? [...proposal.evidence.sourcePatternIds] : [],
    sourceConversationIds: Array.isArray(proposal.evidence?.sourceConversationIds) ? [...proposal.evidence.sourceConversationIds] : [],
    recommendedAction: proposal.recommendedAction || "",
    note: proposal.note || ""
  };
}

export function collectEvolutionDraftEntries({ proposals = [], artifactType = "", proposalId = "", limit = 0 } = {}) {
  const normalizedLimit = Number(limit) > 0 ? Number(limit) : 0;
  const entries = proposals
    .map((proposal) => normalizeEvolutionDraftEntry(proposal))
    .filter(Boolean)
    .filter((item) => !artifactType || item.artifactType === artifactType)
    .filter((item) => !proposalId || item.proposalId === proposalId || item.draftId === proposalId)
    .sort((left, right) => Date.parse(right.generatedAt || "") - Date.parse(left.generatedAt || ""));

  return normalizedLimit > 0 ? entries.slice(0, normalizedLimit) : entries;
}

export function summarizeEvolutionDraftEntries(entries = []) {
  const summary = {
    total: entries.length,
    pendingFollowUps: 0,
    sharedSkillDrafts: 0,
    wrapperPromotionDrafts: 0,
    releaseImpactDrafts: 0
  };

  for (const entry of entries) {
    if ((entry.followUpActionCount || 0) > 0) {
      summary.pendingFollowUps += 1;
    }
    if (entry.artifactType === "shared-skill-draft") summary.sharedSkillDrafts += 1;
    if (entry.artifactType === "wrapper-promotion-draft") summary.wrapperPromotionDrafts += 1;
    if (entry.artifactType === "release-impact-draft") summary.releaseImpactDrafts += 1;
  }

  return summary;
}

export function buildEvolutionDraftHandoffPreview(draftEntry = {}) {
  return {
    draftId: draftEntry.draftId || "",
    artifactType: draftEntry.artifactType || "",
    proposalId: draftEntry.proposalId || "",
    proposalType: draftEntry.proposalType || "",
    draftRoot: draftEntry.draftRoot || "",
    handoffStatus: draftEntry.handoffStatus || "",
    ownerHint: draftEntry.ownerHint || "",
    nextReviewAt: draftEntry.nextReviewAt || "",
    nextAction: draftEntry.nextAction || "",
    checklistPath: draftEntry.checklistPath || "",
    followUpActionCount: draftEntry.followUpActionCount || 0
  };
}

export function summarizeAppliedEvolutionArtifacts(proposals = []) {
  const summary = {
    appliedProjectProfileSelections: 0,
    appliedWrapperPromotionDrafts: 0,
    appliedSharedSkillDrafts: 0,
    appliedReleaseImpactDrafts: 0,
    appliedDraftsWithFollowUps: 0,
    followUpActionCount: 0,
    nextActionPreview: [],
    followUpDraftPreview: [],
    followUpDrafts: []
  };

  const appliedProposals = (Array.isArray(proposals) ? proposals : []).filter((item) => item?.status === "applied");
  const draftEntries = collectEvolutionDraftEntries({
    proposals: appliedProposals
  });

  for (const proposal of appliedProposals) {
    const artifactType = String(proposal.applicationArtifacts?.artifactType || "").trim().toLowerCase();
    if (artifactType === "project-profile-selection") summary.appliedProjectProfileSelections += 1;
    if (artifactType === "wrapper-promotion-draft") summary.appliedWrapperPromotionDrafts += 1;
    if (artifactType === "shared-skill-draft") summary.appliedSharedSkillDrafts += 1;
    if (artifactType === "release-impact-draft") summary.appliedReleaseImpactDrafts += 1;
  }

  for (const draftEntry of draftEntries) {
    if ((draftEntry.followUpActionCount || 0) === 0) continue;
    summary.appliedDraftsWithFollowUps += 1;
    summary.followUpActionCount += draftEntry.followUpActionCount || 0;
    summary.followUpDrafts.push(draftEntry);
    if (summary.followUpDraftPreview.length < 5) {
      summary.followUpDraftPreview.push(buildEvolutionDraftHandoffPreview(draftEntry));
    }
    for (const action of draftEntry.nextActions || []) {
      if (!summary.nextActionPreview.includes(action) && summary.nextActionPreview.length < 10) {
        summary.nextActionPreview.push(action);
      }
    }
  }

  return summary;
}

export function buildEvolutionProposalReadme(proposal) {
  const lines = [
    `# ${proposal.proposalType}`,
    "",
    `- proposalId: \`${proposal.proposalId}\``,
    `- status: \`${proposal.status}\``,
    `- riskLevel: \`${proposal.riskLevel}\``,
    `- generatedAt: \`${proposal.generatedAt}\``,
    `- statusUpdatedAt: \`${proposal.statusUpdatedAt || proposal.generatedAt}\``,
    `- sourceCandidateIds: ${proposal.sourceCandidateIds.length ? proposal.sourceCandidateIds.map((item) => `\`${item}\``).join(", ") : "none"}`,
    `- recommendedAction: ${proposal.recommendedAction || "none"}`,
    ""
  ];
  if (proposal.statusUpdatedBy) {
    lines.push(`- statusUpdatedBy: \`${proposal.statusUpdatedBy}\``);
  }
  if (proposal.note) {
    lines.push(`- note: ${proposal.note}`);
  }
  if (proposal.applicationArtifacts && Object.keys(proposal.applicationArtifacts).length > 0) {
    lines.push(`- applicationArtifacts: \`${JSON.stringify(proposal.applicationArtifacts)}\``);
  }
  if (proposal.statusUpdatedBy || proposal.note || (proposal.applicationArtifacts && Object.keys(proposal.applicationArtifacts).length > 0)) {
    lines.push("");
  }
  if (proposal.evidence.sourcePatternIds.length) {
    lines.push(`- sourcePatternIds: ${proposal.evidence.sourcePatternIds.map((item) => `\`${item}\``).join(", ")}`);
  }
  if (proposal.evidence.sourceConversationIds.length) {
    lines.push(`- sourceConversationIds: ${proposal.evidence.sourceConversationIds.map((item) => `\`${item}\``).join(", ")}`);
  }
  lines.push("", "## Details", "", "```json", JSON.stringify(proposal.evidence.details || {}, null, 2), "```", "");
  return `${lines.join("\n")}\n`;
}

function calculateAgeInDays(from = "", to = new Date().toISOString()) {
  const fromTimestamp = Date.parse(from || "");
  const toTimestamp = Date.parse(to || "");
  if (!Number.isFinite(fromTimestamp) || !Number.isFinite(toTimestamp)) return null;
  return Math.max(0, Math.floor((toTimestamp - fromTimestamp) / 86400000));
}

export function buildEvolutionProposalAgingSummary(
  proposals = [],
  {
    now = new Date().toISOString(),
    reviewSlaDays = defaultEvolutionProposalReviewSlaDays,
    acceptedApplySlaDays = defaultEvolutionProposalAcceptedApplySlaDays
  } = {}
) {
  const summary = {
    reviewSlaDays,
    acceptedApplySlaDays,
    staleReview: 0,
    staleAcceptedPendingApply: 0,
    oldestReviewAgeDays: null,
    oldestAcceptedAgeDays: null,
    staleReviewProposalIds: [],
    staleAcceptedProposalIds: []
  };

  for (const proposal of proposals) {
    const ageDays = calculateAgeInDays(proposal.statusUpdatedAt || proposal.generatedAt || "", now);
    if (ageDays === null) continue;

    if (proposal.status === "review") {
      summary.oldestReviewAgeDays = summary.oldestReviewAgeDays === null
        ? ageDays
        : Math.max(summary.oldestReviewAgeDays, ageDays);
      if (ageDays >= reviewSlaDays) {
        summary.staleReview += 1;
        summary.staleReviewProposalIds.push(proposal.proposalId);
      }
    }

    if (proposal.status === "accepted") {
      summary.oldestAcceptedAgeDays = summary.oldestAcceptedAgeDays === null
        ? ageDays
        : Math.max(summary.oldestAcceptedAgeDays, ageDays);
      if (ageDays >= acceptedApplySlaDays) {
        summary.staleAcceptedPendingApply += 1;
        summary.staleAcceptedProposalIds.push(proposal.proposalId);
      }
    }
  }

  return summary;
}
