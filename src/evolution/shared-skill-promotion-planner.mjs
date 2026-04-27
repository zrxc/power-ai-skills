import fs from "node:fs";
import path from "node:path";
import { readJson } from "../shared/fs.mjs";

export const DEFAULT_SHARED_SKILL_PROMOTION_CRITERIA = Object.freeze({
  allowedProposalStatuses: ["applied"],
  allowedHandoffStatuses: ["pending-human-follow-up", "ready-for-shared-skill-promotion"],
  requiredOwnerHint: "shared-skill-maintainers",
  requireChecklist: true,
  requireNextAction: true,
  allowExistingSkillOverwrite: false
});

function normalizePosixPath(filePath = "") {
  return String(filePath || "").replace(/\\/g, "/");
}

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeTextList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .map((item) => normalizeText(item).toLowerCase())
      .filter(Boolean)
  )];
}

function readJsonIfExists(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : {};
}

function buildCriteria(criteria = {}) {
  const allowedProposalStatuses = normalizeTextList(criteria.allowedProposalStatuses);
  const allowedHandoffStatuses = normalizeTextList(criteria.allowedHandoffStatuses);

  return {
    allowedProposalStatuses: allowedProposalStatuses.length > 0
      ? allowedProposalStatuses
      : DEFAULT_SHARED_SKILL_PROMOTION_CRITERIA.allowedProposalStatuses,
    allowedHandoffStatuses: allowedHandoffStatuses.length > 0
      ? allowedHandoffStatuses
      : DEFAULT_SHARED_SKILL_PROMOTION_CRITERIA.allowedHandoffStatuses,
    requiredOwnerHint: normalizeText(criteria.requiredOwnerHint || DEFAULT_SHARED_SKILL_PROMOTION_CRITERIA.requiredOwnerHint),
    requireChecklist: typeof criteria.requireChecklist === "boolean"
      ? criteria.requireChecklist
      : DEFAULT_SHARED_SKILL_PROMOTION_CRITERIA.requireChecklist,
    requireNextAction: typeof criteria.requireNextAction === "boolean"
      ? criteria.requireNextAction
      : DEFAULT_SHARED_SKILL_PROMOTION_CRITERIA.requireNextAction,
    allowExistingSkillOverwrite: typeof criteria.allowExistingSkillOverwrite === "boolean"
      ? criteria.allowExistingSkillOverwrite
      : DEFAULT_SHARED_SKILL_PROMOTION_CRITERIA.allowExistingSkillOverwrite
  };
}

function buildBlocker(code, message) {
  return { code, message };
}

function listCatalogSkills(skillsRoot) {
  const bySkillName = new Map();
  const byTargetKey = new Map();

  if (!skillsRoot || !fs.existsSync(skillsRoot)) {
    return { bySkillName, byTargetKey };
  }

  for (const groupEntry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!groupEntry.isDirectory()) continue;
    const groupName = groupEntry.name;
    const groupRoot = path.join(skillsRoot, groupName);

    for (const skillEntry of fs.readdirSync(groupRoot, { withFileTypes: true })) {
      if (!skillEntry.isDirectory()) continue;
      const skillName = skillEntry.name;
      const skillRoot = path.join(groupRoot, skillName);
      if (!fs.existsSync(path.join(skillRoot, "SKILL.md"))) continue;

      const record = {
        groupName,
        skillName,
        targetCatalogPath: normalizePosixPath(path.join("skills", groupName, skillName)),
        absolutePath: skillRoot
      };
      const key = `${groupName}/${skillName}`;
      byTargetKey.set(key, record);
      const existing = bySkillName.get(skillName) || [];
      existing.push(record);
      bySkillName.set(skillName, existing);
    }
  }

  return { bySkillName, byTargetKey };
}

function resolveAbsolutePath(rootDir, relativePath = "") {
  if (!relativePath) return "";
  return path.isAbsolute(relativePath) ? relativePath : path.join(rootDir, relativePath);
}

function extractDraftSkillName({ draftEntry, draftMeta, proposal }) {
  return normalizeText(
    draftMeta.name
    || draftEntry.metadata?.skillName
    || proposal.evidence?.details?.recommendedSkillName
    || proposal.evidence?.details?.skillName
    || proposal.evidence?.details?.candidateSkillName
    || path.basename(normalizeText(draftEntry.draftRoot || ""))
  );
}

function extractExplicitGroup({ draftEntry, draftMeta, proposal }) {
  for (const value of [
    draftMeta.targetGroup,
    draftMeta.recommendedGroup,
    draftMeta.group,
    draftEntry.metadata?.targetGroup,
    draftEntry.metadata?.recommendedGroup,
    draftEntry.metadata?.group,
    proposal.evidence?.details?.targetGroup,
    proposal.evidence?.details?.recommendedGroup,
    proposal.evidence?.details?.group
  ]) {
    const normalized = normalizeText(value);
    if (normalized) {
      return {
        groupName: normalized,
        source: "explicit-metadata"
      };
    }
  }

  return {
    groupName: "",
    source: ""
  };
}

function inferGroupFromSignals({ skillName, proposal }) {
  const joinedSignals = [
    skillName,
    proposal.evidence?.details?.sceneType,
    ...(proposal.evidence?.sourcePatternIds || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!joinedSignals) {
    return {
      groupName: "",
      source: ""
    };
  }

  const tokenRules = [
    {
      groupName: "workflow",
      source: "signal-inference",
      test: /(workflow|approval|approv|process|flow|bpmn)/
    },
    {
      groupName: "engineering",
      source: "signal-inference",
      test: /(api|sdk|request|http|service|backend|integration)/
    },
    {
      groupName: "foundation",
      source: "signal-inference",
      test: /(foundation|runtime|store|theme|route|plugin|component|structure|utils?)/
    },
    {
      groupName: "orchestration",
      source: "signal-inference",
      test: /(entry|orchestration|router|dispatch|handoff)/
    },
    {
      groupName: "ui",
      source: "signal-inference",
      test: /(dialog|form|page|list|table|tree|dashboard|detail|preview|message|search|chart|drawer|tabs?)/
    }
  ];

  const matched = tokenRules.find((rule) => rule.test.test(joinedSignals));
  return matched
    ? { groupName: matched.groupName, source: matched.source }
    : { groupName: "", source: "" };
}

function resolveTargetGroup({ skillName, draftEntry, draftMeta, proposal, catalogIndex }) {
  const explicit = extractExplicitGroup({ draftEntry, draftMeta, proposal });
  if (explicit.groupName) return explicit;

  const sameNameMatches = catalogIndex.bySkillName.get(skillName) || [];
  if (sameNameMatches.length === 1) {
    return {
      groupName: sameNameMatches[0].groupName,
      source: "existing-catalog-skill"
    };
  }

  const inferred = inferGroupFromSignals({ skillName, proposal });
  if (inferred.groupName) return inferred;

  return {
    groupName: "",
    source: ""
  };
}

function buildManualConfirmation({
  packageRoot,
  groupName,
  skillName,
  targetCatalogPath,
  targetExists
}) {
  const commands = [];

  if (!targetExists && groupName && skillName) {
    commands.push(`node ./scripts/scaffold-skill.mjs ${skillName} ${groupName}`);
  }
  commands.push("pnpm ci:check");

  return {
    mode: "package-maintainer-manual",
    packageRoot,
    targetCatalogPath,
    scaffoldCommand: !targetExists && groupName && skillName
      ? `node ./scripts/scaffold-skill.mjs ${skillName} ${groupName}`
      : "",
    validationCommand: "pnpm ci:check",
    commands,
    notes: [
      "Review the draft before copying it into the shared catalog.",
      "Keep shared-skill catalog writes manual; this planner does not modify skills/."
    ]
  };
}

function buildCandidatePlan({
  packageRoot,
  projectRoot,
  draftEntry,
  proposal,
  skillsRoot,
  catalogIndex,
  criteria
}) {
  const draftRoot = resolveAbsolutePath(projectRoot, draftEntry.draftRoot);
  const skillMdPath = path.join(draftRoot, "SKILL.md");
  const metaPath = path.join(draftRoot, "skill.meta.json");
  const draftMeta = readJsonIfExists(metaPath);
  const skillName = extractDraftSkillName({ draftEntry, draftMeta, proposal });
  const resolvedGroup = resolveTargetGroup({
    skillName,
    draftEntry,
    draftMeta,
    proposal,
    catalogIndex
  });
  const sameNameMatches = skillName ? (catalogIndex.bySkillName.get(skillName) || []) : [];
  const targetKey = resolvedGroup.groupName && skillName
    ? `${resolvedGroup.groupName}/${skillName}`
    : "";
  const existingTargetSkill = targetKey ? (catalogIndex.byTargetKey.get(targetKey) || null) : null;
  const targetRoot = resolvedGroup.groupName && skillName
    ? path.join(skillsRoot, resolvedGroup.groupName, skillName)
    : "";
  const targetCatalogPath = targetRoot
    ? normalizePosixPath(path.relative(packageRoot, targetRoot))
    : "";
  const checklistAbsolutePath = resolveAbsolutePath(projectRoot, draftEntry.checklistPath);
  const ownerHint = normalizeText(draftEntry.ownerHint || draftMeta.handoff?.ownerHint);
  const handoffStatus = normalizeText(draftEntry.handoffStatus || draftMeta.handoff?.status).toLowerCase();
  const nextAction = normalizeText(draftEntry.nextAction || draftMeta.handoff?.nextAction);
  const allowOverwrite = Boolean(
    criteria.allowExistingSkillOverwrite
    || draftMeta.allowExistingSkillOverwrite
    || draftEntry.metadata?.allowExistingSkillOverwrite
    || proposal.evidence?.details?.allowExistingSkillOverwrite
  );
  const blockers = [];

  if (normalizeText(draftEntry.artifactType) !== "shared-skill-draft") {
    blockers.push(buildBlocker(
      "artifact-type-mismatch",
      `Expected shared-skill-draft, received ${draftEntry.artifactType || "empty"}.`
    ));
  }

  if (!criteria.allowedProposalStatuses.includes(normalizeText(draftEntry.proposalStatus).toLowerCase())) {
    blockers.push(buildBlocker(
      "proposal-status-not-allowed",
      `proposal status must be one of ${criteria.allowedProposalStatuses.join(", ")}, received ${draftEntry.proposalStatus || "empty"}.`
    ));
  }

  if (normalizeText(draftMeta.artifactType) && normalizeText(draftMeta.artifactType) !== "shared-skill-draft") {
    blockers.push(buildBlocker(
      "draft-meta-artifact-mismatch",
      `skill.meta.json artifactType must be shared-skill-draft, received ${draftMeta.artifactType}.`
    ));
  }

  if (!fs.existsSync(skillMdPath)) {
    blockers.push(buildBlocker(
      "draft-skill-missing",
      `Draft SKILL.md is missing at ${normalizePosixPath(path.relative(projectRoot, skillMdPath))}.`
    ));
  }

  if (!fs.existsSync(metaPath)) {
    blockers.push(buildBlocker(
      "draft-meta-missing",
      `Draft skill.meta.json is missing at ${normalizePosixPath(path.relative(projectRoot, metaPath))}.`
    ));
  }

  if (!skillName) {
    blockers.push(buildBlocker(
      "skill-name-missing",
      "Could not resolve the target shared skill name from draft metadata or proposal evidence."
    ));
  }

  if (criteria.requiredOwnerHint && ownerHint !== criteria.requiredOwnerHint) {
    blockers.push(buildBlocker(
      "handoff-owner-mismatch",
      `handoff owner must be ${criteria.requiredOwnerHint}, received ${ownerHint || "empty"}.`
    ));
  }

  if (!criteria.allowedHandoffStatuses.includes(handoffStatus)) {
    blockers.push(buildBlocker(
      "handoff-status-not-allowed",
      `handoff status must be one of ${criteria.allowedHandoffStatuses.join(", ")}, received ${handoffStatus || "empty"}.`
    ));
  }

  if (criteria.requireChecklist && (!draftEntry.checklistPath || !fs.existsSync(checklistAbsolutePath))) {
    blockers.push(buildBlocker(
      "checklist-missing",
      `manual checklist must exist at ${draftEntry.checklistPath || "unknown path"}.`
    ));
  }

  if (criteria.requireNextAction && !nextAction) {
    blockers.push(buildBlocker(
      "next-action-missing",
      "handoff next action is required before planning a shared-skill catalog promotion."
    ));
  }

  if (!resolvedGroup.groupName) {
    blockers.push(buildBlocker(
      "target-group-undetermined",
      "Could not determine which skills/<group>/ directory should host this shared skill."
    ));
  }

  if (sameNameMatches.length > 1 && !extractExplicitGroup({ draftEntry, draftMeta, proposal }).groupName) {
    blockers.push(buildBlocker(
      "skill-name-ambiguous-across-groups",
      `Skill name ${skillName} already exists in multiple groups: ${sameNameMatches.map((item) => item.targetCatalogPath).join(", ")}.`
    ));
  }

  if (sameNameMatches.length > 0 && resolvedGroup.groupName && !existingTargetSkill) {
    blockers.push(buildBlocker(
      "skill-name-used-in-other-group",
      `Skill name ${skillName} already exists in another shared group: ${sameNameMatches.map((item) => item.targetCatalogPath).join(", ")}.`
    ));
  }

  if (existingTargetSkill && !allowOverwrite) {
    blockers.push(buildBlocker(
      "shared-skill-already-exists",
      `Shared skill already exists at ${existingTargetSkill.targetCatalogPath}; explicit overwrite approval is required.`
    ));
  }

  return {
    draftId: draftEntry.draftId,
    proposalId: draftEntry.proposalId,
    skillName,
    displayName: normalizeText(draftMeta.displayName || draftEntry.metadata?.displayName || proposal.evidence?.details?.displayName),
    status: blockers.length > 0 ? "blocked" : "eligible",
    sourceDraftRoot: normalizePosixPath(draftEntry.draftRoot),
    targetGroup: resolvedGroup.groupName,
    targetGroupSource: resolvedGroup.source,
    targetCatalogPath,
    targetExists: Boolean(existingTargetSkill),
    blockers,
    evidence: {
      proposalStatus: draftEntry.proposalStatus || "",
      artifactType: draftEntry.artifactType || "",
      draftMetaStatus: normalizeText(draftMeta.status),
      handoffStatus: draftEntry.handoffStatus || "",
      ownerHint,
      nextAction,
      checklistPath: normalizePosixPath(draftEntry.checklistPath || ""),
      skillNameSource: normalizeText(draftMeta.name)
        ? "draft-meta.name"
        : (proposal.evidence?.details?.recommendedSkillName ? "proposal-evidence.recommendedSkillName" : "draft-root-name"),
      existingCatalogMatches: sameNameMatches.map((item) => ({
        groupName: item.groupName,
        skillName: item.skillName,
        targetCatalogPath: item.targetCatalogPath
      })),
      overwriteAllowed: allowOverwrite,
      boundary: Array.isArray(draftEntry.handoff?.boundary) ? [...draftEntry.handoff.boundary] : []
    },
    manualConfirmation: buildManualConfirmation({
      packageRoot,
      groupName: resolvedGroup.groupName,
      skillName,
      targetCatalogPath,
      targetExists: Boolean(existingTargetSkill)
    })
  };
}

export function planSharedSkillPromotions({
  packageRoot,
  projectRoot,
  skillsRoot,
  draftEntries,
  proposalsById,
  draftId = "",
  proposalId = "",
  skillName = "",
  criteria = {}
}) {
  const normalizedCriteria = buildCriteria(criteria);
  const requestedDraftId = normalizeText(draftId);
  const requestedProposalId = normalizeText(proposalId);
  const requestedSkillName = normalizeText(skillName);
  const catalogIndex = listCatalogSkills(skillsRoot);
  const sharedDrafts = (draftEntries || []).filter((item) => item?.artifactType === "shared-skill-draft");
  const selectedDrafts = sharedDrafts.filter((item) => {
    if (requestedDraftId && item.draftId !== requestedDraftId) return false;
    if (requestedProposalId && item.proposalId !== requestedProposalId) return false;
    if (requestedSkillName) {
      const metaSkillName = normalizeText(item.metadata?.skillName || item.metadata?.name);
      const inferredSkillName = normalizeText(
        metaSkillName
        || proposalsById.get(item.proposalId)?.evidence?.details?.recommendedSkillName
        || path.basename(normalizeText(item.draftRoot || ""))
      );
      if (inferredSkillName !== requestedSkillName) return false;
    }
    return true;
  });

  if ((requestedDraftId || requestedProposalId || requestedSkillName) && selectedDrafts.length === 0) {
    throw new Error(`Shared skill draft not found for target: ${requestedDraftId || requestedProposalId || requestedSkillName}`);
  }

  const candidates = selectedDrafts.map((draftEntry) => buildCandidatePlan({
    packageRoot,
    projectRoot,
    draftEntry,
    proposal: proposalsById.get(draftEntry.proposalId) || {},
    skillsRoot,
    catalogIndex,
    criteria: normalizedCriteria
  }));

  const eligibleCount = candidates.filter((item) => item.status === "eligible").length;
  const blockedCount = candidates.length - eligibleCount;

  return {
    packageRoot,
    projectRoot,
    requestedDraftId,
    requestedProposalId,
    requestedSkillName,
    criteria: normalizedCriteria,
    summary: {
      sharedDraftCount: sharedDrafts.length,
      evaluatedDraftCount: candidates.length,
      eligibleCount,
      blockedCount
    },
    manualConfirmation: {
      mode: "package-maintainer-manual",
      description: "Review each eligible shared-skill draft and copy it into the package skills/ catalog manually.",
      commandTemplate: "node ./scripts/scaffold-skill.mjs <skill-name> <group>",
      validationCommand: "pnpm ci:check"
    },
    candidates
  };
}
