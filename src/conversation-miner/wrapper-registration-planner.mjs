import fs from "node:fs";
import path from "node:path";
import { buildWrapperRegistrationArtifacts } from "./wrapper-promotion-support.mjs";
import { supportedCaptureWrappers } from "./wrappers.mjs";

export const DEFAULT_WRAPPER_REGISTRATION_CRITERIA = Object.freeze({
  requiredProposalStatus: "accepted",
  requiredMaterializationStatus: "generated",
  requiredApplicationStatus: "applied",
  requiredFollowUpStatus: "finalized",
  blockedRegistrationStatuses: ["registered"],
  requireRegistrationArtifacts: true,
  requireTestsScaffolded: true,
  requireDocsScaffolded: true,
  allowExistingWrapperOverwrite: false
});

const WRAPPER_REGISTRY_RELATIVE_PATH = normalizePosixPath(path.join("src", "conversation-miner", "wrappers.mjs"));
const REGISTER_WRAPPER_PROMOTION_COMMAND_TEMPLATE = "npx power-ai-skills register-wrapper-promotion --tool <tool-name>";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLowerText(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeTextList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .map((item) => normalizeLowerText(item))
      .filter(Boolean)
  )];
}

function buildCriteria(criteria = {}) {
  return {
    requiredProposalStatus: normalizeLowerText(criteria.requiredProposalStatus || DEFAULT_WRAPPER_REGISTRATION_CRITERIA.requiredProposalStatus),
    requiredMaterializationStatus: normalizeLowerText(criteria.requiredMaterializationStatus || DEFAULT_WRAPPER_REGISTRATION_CRITERIA.requiredMaterializationStatus),
    requiredApplicationStatus: normalizeLowerText(criteria.requiredApplicationStatus || DEFAULT_WRAPPER_REGISTRATION_CRITERIA.requiredApplicationStatus),
    requiredFollowUpStatus: normalizeLowerText(criteria.requiredFollowUpStatus || DEFAULT_WRAPPER_REGISTRATION_CRITERIA.requiredFollowUpStatus),
    blockedRegistrationStatuses: normalizeTextList(criteria.blockedRegistrationStatuses).length > 0
      ? normalizeTextList(criteria.blockedRegistrationStatuses)
      : DEFAULT_WRAPPER_REGISTRATION_CRITERIA.blockedRegistrationStatuses,
    requireRegistrationArtifacts: typeof criteria.requireRegistrationArtifacts === "boolean"
      ? criteria.requireRegistrationArtifacts
      : DEFAULT_WRAPPER_REGISTRATION_CRITERIA.requireRegistrationArtifacts,
    requireTestsScaffolded: typeof criteria.requireTestsScaffolded === "boolean"
      ? criteria.requireTestsScaffolded
      : DEFAULT_WRAPPER_REGISTRATION_CRITERIA.requireTestsScaffolded,
    requireDocsScaffolded: typeof criteria.requireDocsScaffolded === "boolean"
      ? criteria.requireDocsScaffolded
      : DEFAULT_WRAPPER_REGISTRATION_CRITERIA.requireDocsScaffolded,
    allowExistingWrapperOverwrite: typeof criteria.allowExistingWrapperOverwrite === "boolean"
      ? criteria.allowExistingWrapperOverwrite
      : DEFAULT_WRAPPER_REGISTRATION_CRITERIA.allowExistingWrapperOverwrite
  };
}

function buildBlocker(code, message) {
  return { code, message };
}

function normalizePosixPath(filePath = "") {
  return String(filePath || "").replace(/\\/g, "/");
}

function existingWrapperByToolName(toolName) {
  return supportedCaptureWrappers.find((item) => item.toolName === toolName) || null;
}

function resolveRegistrationArtifactPaths(promotionRoot) {
  const artifactsRoot = path.join(promotionRoot, "registration-artifacts");
  return {
    artifactsRoot,
    bundlePath: path.join(artifactsRoot, "wrapper-registration.bundle.json"),
    patchPath: path.join(artifactsRoot, "wrapper-registration.patch.md")
  };
}

function readRegistrationBundle(bundlePath) {
  if (!fs.existsSync(bundlePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(bundlePath, "utf8"));
  } catch {
    return null;
  }
}

function resolveTargetRegistryPlan({ proposal, existingWrapper, allowOverwrite, registrationBundle }) {
  const derivedArtifacts = buildWrapperRegistrationArtifacts({
    toolName: normalizeText(proposal.toolName),
    displayName: normalizeText(proposal.displayName),
    integrationStyle: normalizeText(proposal.integrationStyle) || "terminal"
  });
  const materializedArtifacts = registrationBundle?.artifacts || null;
  const effectiveCommandName = materializedArtifacts?.commandName || derivedArtifacts.commandName;
  const effectiveWrapperEntry = materializedArtifacts?.wrapperEntry || derivedArtifacts.wrapperEntry;

  return {
    relativePath: WRAPPER_REGISTRY_RELATIVE_PATH,
    action: existingWrapper
      ? (allowOverwrite ? "overwrite-existing-wrapper-entry" : "conflict-existing-wrapper-entry")
      : "append-new-wrapper-entry",
    overwriteAllowed: allowOverwrite,
    entry: {
      toolName: normalizeText(proposal.toolName),
      displayName: normalizeText(proposal.displayName),
      commandName: effectiveCommandName,
      integrationStyle: normalizeText(proposal.integrationStyle)
    },
    entrySnippet: effectiveWrapperEntry,
    mappingSources: {
      toolName: "proposal.toolName",
      displayName: "proposal.displayName",
      integrationStyle: "proposal.integrationStyle",
      commandName: materializedArtifacts?.commandName
        ? "registration-artifacts.bundle.artifacts.commandName"
        : "buildWrapperRegistrationArtifacts(proposal).commandName"
    },
    existingWrapper: existingWrapper
      ? {
          toolName: existingWrapper.toolName,
          displayName: existingWrapper.displayName,
          commandName: existingWrapper.commandName,
          integrationStyle: existingWrapper.integrationStyle
        }
      : null
  };
}

function buildManualConfirmation({ toolName, targetRegistry }) {
  return {
    mode: "project-maintainer-manual",
    command: `npx power-ai-skills register-wrapper-promotion --tool ${toolName}`,
    commandTemplate: REGISTER_WRAPPER_PROMOTION_COMMAND_TEMPLATE,
    notes: [
      `Planned wrapper registry target: ${targetRegistry.relativePath} (${targetRegistry.action}).`,
      "Review the proposal timeline and registration artifacts before registering.",
      "Keep wrapper registry writes manual; this planner does not modify the registry."
    ]
  };
}

function buildCandidatePlan({ proposal, criteria }) {
  const blockers = [];
  const toolName = normalizeText(proposal.toolName);
  const proposalStatus = normalizeLowerText(proposal.status);
  const materializationStatus = normalizeLowerText(proposal.materializationStatus);
  const applicationStatus = normalizeLowerText(proposal.applicationStatus);
  const followUpStatus = normalizeLowerText(proposal.followUpStatus);
  const registrationStatus = normalizeLowerText(proposal.registrationStatus || "not-registered");
  const existingWrapper = existingWrapperByToolName(toolName);
  const artifactPaths = resolveRegistrationArtifactPaths(proposal.promotionRoot);
  const allowOverwrite = Boolean(criteria.allowExistingWrapperOverwrite || proposal.allowExistingWrapperOverwrite);
  const registrationBundle = readRegistrationBundle(artifactPaths.bundlePath);
  const targetRegistry = resolveTargetRegistryPlan({
    proposal,
    existingWrapper,
    allowOverwrite,
    registrationBundle
  });

  if (!toolName) {
    blockers.push(buildBlocker(
      "tool-name-missing",
      "Wrapper proposal is missing toolName."
    ));
  }

  if (proposalStatus !== criteria.requiredProposalStatus) {
    blockers.push(buildBlocker(
      "proposal-status-not-accepted",
      `proposal status must be ${criteria.requiredProposalStatus}, received ${proposal.status || "empty"}.`
    ));
  }

  if (materializationStatus !== criteria.requiredMaterializationStatus) {
    blockers.push(buildBlocker(
      "materialization-not-generated",
      `materializationStatus must be ${criteria.requiredMaterializationStatus}, received ${proposal.materializationStatus || "empty"}.`
    ));
  }

  if (applicationStatus !== criteria.requiredApplicationStatus) {
    blockers.push(buildBlocker(
      "application-not-applied",
      `applicationStatus must be ${criteria.requiredApplicationStatus}, received ${proposal.applicationStatus || "empty"}.`
    ));
  }

  if (followUpStatus !== criteria.requiredFollowUpStatus) {
    blockers.push(buildBlocker(
      "follow-up-not-finalized",
      `followUpStatus must be ${criteria.requiredFollowUpStatus}, received ${proposal.followUpStatus || "empty"}.`
    ));
  }

  if (criteria.blockedRegistrationStatuses.includes(registrationStatus)) {
    blockers.push(buildBlocker(
      "already-registered",
      `registrationStatus ${proposal.registrationStatus || "registered"} is already registered.`
    ));
  }

  if (Array.isArray(proposal.pendingFollowUps) && proposal.pendingFollowUps.length > 0) {
    blockers.push(buildBlocker(
      "pending-follow-ups-remain",
      `Wrapper proposal still has pending follow-ups: ${proposal.pendingFollowUps.join("; ")}.`
    ));
  }

  if (criteria.requireRegistrationArtifacts) {
    if (!fs.existsSync(artifactPaths.bundlePath) || !fs.existsSync(artifactPaths.patchPath)) {
      blockers.push(buildBlocker(
        "registration-artifacts-missing",
        "Wrapper registration artifacts are missing; materialize the proposal before planning registration."
      ));
    }
  }

  if (criteria.requireTestsScaffolded && (!Array.isArray(proposal.testScaffoldFiles) || proposal.testScaffoldFiles.length === 0)) {
    blockers.push(buildBlocker(
      "test-scaffolds-missing",
      "Wrapper proposal is missing generated test scaffold files."
    ));
  }

  if (criteria.requireDocsScaffolded && (!Array.isArray(proposal.docScaffoldFiles) || proposal.docScaffoldFiles.length === 0)) {
    blockers.push(buildBlocker(
      "doc-scaffolds-missing",
      "Wrapper proposal is missing generated documentation scaffold files."
    ));
  }

  if (existingWrapper && !allowOverwrite) {
    blockers.push(buildBlocker(
      "wrapper-already-exists-in-registry",
      `Wrapper ${toolName} already exists in the built-in registry; explicit overwrite approval is required.`
    ));
  }

  return {
    toolName,
    displayName: proposal.displayName || "",
    status: blockers.length > 0 ? "blocked" : "eligible",
    promotionRoot: proposal.promotionRoot,
    blockers,
    targetRegistry,
    evidence: {
      proposalStatus: proposal.status || "",
      materializationStatus: proposal.materializationStatus || "",
      applicationStatus: proposal.applicationStatus || "",
      followUpStatus: proposal.followUpStatus || "",
      registrationStatus: proposal.registrationStatus || "",
      archiveStatus: proposal.archiveStatus || "",
      generatedAt: proposal.generatedAt || "",
      reviewedAt: proposal.reviewedAt || "",
      materializedAt: proposal.materializedAt || "",
      appliedAt: proposal.appliedAt || "",
      finalizedAt: proposal.finalizedAt || "",
      registeredAt: proposal.registeredAt || "",
      pendingFollowUps: Array.isArray(proposal.pendingFollowUps) ? [...proposal.pendingFollowUps] : [],
      registrationArtifacts: {
        bundlePath: normalizePosixPath(path.relative(path.dirname(proposal.promotionRoot), artifactPaths.bundlePath)),
        patchPath: normalizePosixPath(path.relative(path.dirname(proposal.promotionRoot), artifactPaths.patchPath)),
        exists: fs.existsSync(artifactPaths.bundlePath) && fs.existsSync(artifactPaths.patchPath),
        bundleContainsArtifacts: Boolean(registrationBundle?.artifacts),
        bundleGeneratedAt: registrationBundle?.generatedAt || "",
        commandName: registrationBundle?.artifacts?.commandName || targetRegistry.entry.commandName
      },
      existingRegistryWrapper: existingWrapper
        ? {
            toolName: existingWrapper.toolName,
            displayName: existingWrapper.displayName,
            commandName: existingWrapper.commandName,
            integrationStyle: existingWrapper.integrationStyle
          }
        : null,
      allowExistingWrapperOverwrite: allowOverwrite,
      testScaffoldFiles: Array.isArray(proposal.testScaffoldFiles) ? [...proposal.testScaffoldFiles] : [],
      docScaffoldFiles: Array.isArray(proposal.docScaffoldFiles) ? [...proposal.docScaffoldFiles] : []
    },
    manualConfirmation: buildManualConfirmation({ toolName, targetRegistry })
  };
}

export function planWrapperRegistrations({
  proposals,
  toolName = "",
  criteria = {}
}) {
  const normalizedCriteria = buildCriteria(criteria);
  const requestedToolName = normalizeText(toolName);
  const selectedProposals = requestedToolName
    ? (proposals || []).filter((item) => item.toolName === requestedToolName)
    : [...(proposals || [])];

  if (requestedToolName && selectedProposals.length === 0) {
    throw new Error(`Wrapper promotion proposal not found: ${requestedToolName}.`);
  }

  const candidates = selectedProposals
    .filter((item) => !item.archived)
    .sort((left, right) => String(left.toolName || "").localeCompare(String(right.toolName || ""), "zh-CN"))
    .map((proposal) => buildCandidatePlan({ proposal, criteria: normalizedCriteria }));

  const eligibleCount = candidates.filter((item) => item.status === "eligible").length;
  const blockedCount = candidates.length - eligibleCount;

  return {
    requestedToolName,
    criteria: normalizedCriteria,
    summary: {
      proposalCount: proposals?.filter((item) => !item.archived).length || 0,
      evaluatedProposalCount: candidates.length,
      eligibleCount,
      blockedCount,
      targetRegistryPath: WRAPPER_REGISTRY_RELATIVE_PATH,
      overwriteCandidateCount: candidates.filter((item) => item.targetRegistry.action === "overwrite-existing-wrapper-entry").length
    },
    manualConfirmation: {
      mode: "project-maintainer-manual",
      description: "Review each eligible wrapper proposal and register it with the existing manual command boundary.",
      commandTemplate: REGISTER_WRAPPER_PROMOTION_COMMAND_TEMPLATE
    },
    candidates
  };
}
