import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson, ensureDir } from "./shared/fs.mjs";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizePosixPath(filePath = "") {
  return String(filePath || "").replace(/\\/g, "/");
}

function toManifestRelativePath(releaseManifestDir, filePath) {
  if (!filePath) return "";
  const relativeFromManifest = path.relative(releaseManifestDir, filePath);
  if (!relativeFromManifest || relativeFromManifest === "") {
    return "manifest";
  }
  return normalizePosixPath(path.posix.join("manifest", normalizePosixPath(relativeFromManifest)));
}

function buildExecutionStamp(recordedAt = new Date().toISOString()) {
  return recordedAt.replace(/[-:.TZ]/g, "").slice(0, 17);
}

function buildActorSummary({ actorId, actorName }) {
  const normalizedActorId = normalizeText(actorId)
    || normalizeText(process.env.POWER_AI_RELEASE_AUTHORIZED_BY)
    || normalizeText(process.env.USERNAME)
    || normalizeText(process.env.USER)
    || "maintainer";
  const normalizedActorName = normalizeText(actorName) || normalizedActorId;
  return {
    actorType: "maintainer",
    actorId: normalizedActorId,
    displayName: normalizedActorName
  };
}

function asIsoDate(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function readJsonIfExists(filePath = "") {
  return filePath && fs.existsSync(filePath) ? readJson(filePath) : null;
}

function updateVersionRecordAuthorizationSummary({
  releaseManifestDir,
  authorizationRecord,
  authorizationRecordPath,
  historicalRecordPath
}) {
  const versionRecordPath = path.join(releaseManifestDir, "version-record.json");
  if (!fs.existsSync(versionRecordPath)) return;

  const versionRecord = readJson(versionRecordPath);
  writeJson(versionRecordPath, {
    ...versionRecord,
    artifacts: {
      ...(versionRecord.artifacts || {}),
      releaseUnattendedAuthorizationPath: authorizationRecordPath,
      releaseUnattendedAuthorizationsRoot: path.join(releaseManifestDir, "release-unattended-authorizations")
    },
    releaseUnattendedAuthorizationSummary: {
      authorizationId: authorizationRecord.authorizationId || "",
      recordedAt: authorizationRecord.authorizedAt || "",
      status: authorizationRecord.status || "",
      packageName: authorizationRecord.packageName || "",
      version: authorizationRecord.version || "",
      targetPublish: authorizationRecord.targetPublish || {},
      authorizedBy: authorizationRecord.authorizedBy || null,
      expiresAt: authorizationRecord.constraints?.expiresAt || authorizationRecord.expiresAt || "",
      consumed: Boolean(authorizationRecord.consumption?.consumed),
      consumedAt: authorizationRecord.consumption?.consumedAt || "",
      releaseOrchestrationStatus: authorizationRecord.evidenceSnapshot?.releaseOrchestrationStatus || "",
      publishPlannerStatus: authorizationRecord.evidenceSnapshot?.publishPlannerStatus || "",
      latestPublishExecutionStatus: authorizationRecord.evidenceSnapshot?.latestPublishExecutionStatus || "",
      recordPath: authorizationRecordPath,
      recordPathRelative: "manifest/release-unattended-authorization.json",
      historicalRecordPath,
      historicalRecordPathRelative: historicalRecordPath
        ? `manifest/release-unattended-authorizations/${path.basename(historicalRecordPath)}`
        : ""
    }
  });
}

function supersedeExistingAuthorization({
  existingAuthorization,
  currentRecordPath,
  currentHistoricalPath,
  authorizationId,
  actor,
  recordedAt
}) {
  if (!existingAuthorization || !normalizeText(existingAuthorization.authorizationId)) {
    return null;
  }
  const existingStatus = normalizeText(existingAuthorization.status || "active");
  const alreadyConsumed = Boolean(existingAuthorization.consumption?.consumed);
  if (existingStatus !== "active" || alreadyConsumed) {
    return null;
  }

  const updatedAuthorization = {
    ...existingAuthorization,
    status: "superseded",
    supersededAt: recordedAt,
    audit: {
      ...(existingAuthorization.audit || {}),
      supersededByAuthorizationId: authorizationId,
      supersededAt: recordedAt,
      revokedBy: actor,
      revokedAt: recordedAt
    }
  };

  writeJson(currentRecordPath, updatedAuthorization);
  if (currentHistoricalPath) {
    writeJson(currentHistoricalPath, updatedAuthorization);
  }

  return {
    authorizationId: existingAuthorization.authorizationId || "",
    recordPath: currentRecordPath,
    historicalRecordPath: currentHistoricalPath || ""
  };
}

export function createReleaseUnattendedAuthorizationService({
  context,
  projectRoot,
  releasePublishPlannerService,
  releaseUnattendedGovernancePlannerService,
  nowProvider = () => new Date()
}) {
  const packageRoot = context.packageRoot;
  const releaseManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(packageRoot, "manifest"));

  function authorizeReleaseUnattendedGovernance({
    actorId = "",
    actorName = "",
    reason = "",
    expiresAt = "",
    maxExecutionCount = 1
  } = {}) {
    if (path.resolve(projectRoot) !== path.resolve(packageRoot)) {
      throw new Error("authorize-release-unattended-governance is only available in package-maintenance mode from the package root.");
    }

    const governancePlan = releaseUnattendedGovernancePlannerService.planReleaseUnattendedGovernance();
    const publishPlan = releasePublishPlannerService.planReleasePublish();
    const releasableStatuses = new Set(["authorized-ready", "not-authorized", "authorization-expired"]);
    if (!releasableStatuses.has(governancePlan.status)) {
      return {
        packageRoot,
        projectRoot,
        status: "blocked",
        authorized: false,
        governanceStatus: governancePlan.status,
        blockers: governancePlan.blockers || [],
        governancePlan,
        nextAction: governancePlan.nextAction,
        authorization: null
      };
    }

    const now = nowProvider();
    const recordedAt = now.toISOString();
    const authorizationId = `release_unattended_auth_${buildExecutionStamp(recordedAt)}`;
    const authorizationRoot = path.join(releaseManifestDir, "release-unattended-authorizations");
    const recordPath = path.join(releaseManifestDir, "release-unattended-authorization.json");
    const historicalRecordPath = path.join(authorizationRoot, `${authorizationId}.json`);
    const currentAuthorization = readJsonIfExists(recordPath);
    const currentHistoricalPath = normalizeText(
      currentAuthorization?.historicalRecordPath
      || currentAuthorization?.audit?.historicalRecordPath
    );
    const actor = buildActorSummary({ actorId, actorName });
    const normalizedExpiresAt = asIsoDate(expiresAt);

    if (normalizeText(expiresAt) && !normalizedExpiresAt) {
      return {
        packageRoot,
        projectRoot,
        status: "blocked",
        authorized: false,
        governanceStatus: governancePlan.status,
        blockers: [
          {
            code: "invalid-authorization-expiry",
            message: `The provided unattended authorization expiry is not a valid date: ${expiresAt}.`
          }
        ],
        governancePlan,
        nextAction: {
          kind: "fix-authorization-expiry",
          command: "",
          reason: "Provide a valid --expires-at value before creating an unattended authorization.",
          recordPath
        },
        authorization: null
      };
    }

    ensureDir(releaseManifestDir);
    ensureDir(authorizationRoot);

    const supersededAuthorization = supersedeExistingAuthorization({
      existingAuthorization: currentAuthorization,
      currentRecordPath: recordPath,
      currentHistoricalPath,
      authorizationId,
      actor,
      recordedAt
    });

    const effectiveExpiresAt = normalizedExpiresAt
      || new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString();
    const authorizationRecord = {
      authorizationId,
      authorizedAt: recordedAt,
      status: "active",
      packageName: governancePlan.packageName || "",
      version: governancePlan.version || "",
      packageRoot,
      projectRoot,
      targetPublish: publishPlan.targetPublish || {},
      authorizedBy: actor,
      reason: normalizeText(reason) || "Authorized after unattended governance review.",
      reviewContext: {
        governanceStatus: governancePlan.status,
        blockerCount: (governancePlan.blockers || []).length
      },
      constraints: {
        expiresAt: effectiveExpiresAt,
        maxExecutionCount: Number(maxExecutionCount) > 0 ? Number(maxExecutionCount) : 1,
        allowWarnGate: false,
        requireNoPendingFollowUp: true,
        requirePlannerEligible: true,
        requireOrchestrationReady: true
      },
      evidenceSnapshot: {
        releaseOrchestrationStatus: governancePlan.eligibility?.orchestrationStatus || "",
        releaseOrchestrationExecutionId: governancePlan.evidence?.releaseOrchestrationSummary?.executionId || "",
        releaseOrchestrationRecordPath: governancePlan.evidence?.releaseOrchestrationRecordPath || "",
        publishPlannerStatus: publishPlan.status || governancePlan.eligibility?.publishPlannerStatus || "",
        releaseGateStatus: governancePlan.eligibility?.releaseGateStatus || "",
        requiresExplicitAcknowledgement: Boolean(governancePlan.eligibility?.requiresExplicitAcknowledgement),
        latestPublishExecutionStatus: governancePlan.eligibility?.latestPublishExecutionStatus || "",
        publishRecordPath: governancePlan.evidence?.releasePublishRecordPath || ""
      },
      invalidatesWhen: {
        versionChanged: true,
        targetPublishChanged: true,
        orchestrationSnapshotChanged: true,
        plannerStatusChanged: true,
        followUpBecamePending: true
      },
      consumption: {
        consumed: false,
        consumedAt: "",
        publishExecutionId: "",
        publishRecordPath: ""
      },
      audit: {
        recordPath,
        recordPathRelative: "manifest/release-unattended-authorization.json",
        historicalRecordPath,
        historicalRecordPathRelative: toManifestRelativePath(releaseManifestDir, historicalRecordPath),
        supersedesAuthorizationId: supersededAuthorization?.authorizationId || "",
        revokedBy: null,
        revokedAt: ""
      },
      recordPath,
      recordPathRelative: "manifest/release-unattended-authorization.json",
      historicalRecordPath,
      historicalRecordPathRelative: toManifestRelativePath(releaseManifestDir, historicalRecordPath)
    };

    writeJson(recordPath, authorizationRecord);
    writeJson(historicalRecordPath, authorizationRecord);
    updateVersionRecordAuthorizationSummary({
      releaseManifestDir,
      authorizationRecord,
      authorizationRecordPath: recordPath,
      historicalRecordPath
    });

    return {
      packageRoot,
      projectRoot,
      status: "authorized",
      authorized: true,
      governanceStatus: governancePlan.status,
      blockers: [],
      governancePlan,
      supersededAuthorization,
      authorization: {
        authorizationId,
        status: authorizationRecord.status,
        packageName: authorizationRecord.packageName,
        version: authorizationRecord.version,
        authorizedAt: authorizationRecord.authorizedAt,
        expiresAt: authorizationRecord.constraints.expiresAt,
        authorizedBy: authorizationRecord.authorizedBy,
        reason: authorizationRecord.reason,
        recordPath,
        recordPathRelative: authorizationRecord.recordPathRelative,
        historicalRecordPath,
        historicalRecordPathRelative: authorizationRecord.historicalRecordPathRelative
      },
      nextAction: {
        kind: "authorization-created",
        command: "npx power-ai-skills execute-release-unattended-governance --json",
        reason: "A valid unattended authorization is now recorded. The unattended governance executor can continue only while the latest governance evidence stays authorized-ready.",
        recordPath
      }
    };
  }

  return {
    authorizeReleaseUnattendedGovernance
  };
}
