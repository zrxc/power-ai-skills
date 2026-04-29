import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "./shared/fs.mjs";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function readJsonIfExists(filePath = "") {
  return filePath && fs.existsSync(filePath) ? readJson(filePath) : null;
}

function buildAuthorizationConsumptionSummary({
  authorizationRecord,
  authorizationRecordPath,
  publishExecutionSnapshot,
  recordedAt
}) {
  const updatedRecord = {
    ...authorizationRecord,
    status: "consumed",
    consumedAt: recordedAt,
    consumption: {
      ...(authorizationRecord.consumption || {}),
      consumed: true,
      consumedAt: recordedAt,
      publishExecutionId: publishExecutionSnapshot?.executionId || "",
      publishRecordPath: publishExecutionSnapshot?.recordPath || ""
    }
  };

  const historicalRecordPath = normalizeText(
    authorizationRecord.historicalRecordPath
    || authorizationRecord.audit?.historicalRecordPath
  );
  writeJson(authorizationRecordPath, updatedRecord);
  if (historicalRecordPath) {
    writeJson(historicalRecordPath, updatedRecord);
  }

  return {
    updatedRecord,
    authorizationRecordPath,
    historicalRecordPath
  };
}

function updateVersionRecordAuthorizationSummary({
  releaseManifestDir,
  authorizationRecord,
  authorizationRecordPath,
  historicalRecordPath = ""
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
      recordedAt: authorizationRecord.consumedAt || authorizationRecord.authorizedAt || "",
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

export function createReleaseUnattendedGovernanceExecutorService({
  context,
  projectRoot,
  releaseUnattendedGovernancePlannerService,
  releasePublishExecutorService
}) {
  const packageRoot = context.packageRoot;
  const releaseManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(packageRoot, "manifest"));

  function executeReleaseUnattendedGovernance() {
    const governancePlan = releaseUnattendedGovernancePlannerService.planReleaseUnattendedGovernance();
    const authorizationRecordPath = normalizeText(
      governancePlan.authorization?.recordPath
      || governancePlan.governanceContract?.authorizationRecordPath
      || path.join(releaseManifestDir, "release-unattended-authorization.json")
    );
    const baseResult = {
      packageRoot,
      projectRoot,
      status: governancePlan.status,
      governanceStatus: governancePlan.status,
      governancePlan,
      publishExecuted: false,
      publishExecution: null,
      authorizationConsumed: false,
      authorizationUpdate: null,
      nextAction: governancePlan.nextAction,
      blockers: governancePlan.blockers || [],
      executionMode: "authorized-governance-executor"
    };

    if (governancePlan.status !== "authorized-ready") {
      return baseResult;
    }

    const publishExecution = releasePublishExecutorService.executeReleasePublish({
      confirm: true,
      acknowledgeWarnings: false
    });
    const result = {
      ...baseResult,
      status: publishExecution.status,
      publishExecuted: true,
      publishExecution,
      nextAction: publishExecution.nextAction || governancePlan.nextAction,
      blockers: publishExecution.blockers || []
    };

    if (publishExecution.status === "published") {
      const authorizationRecord = readJsonIfExists(authorizationRecordPath);
      if (authorizationRecord) {
        const recordedAt = new Date().toISOString();
        const authorizationUpdate = buildAuthorizationConsumptionSummary({
          authorizationRecord,
          authorizationRecordPath,
          publishExecutionSnapshot: publishExecution.publishExecutionSnapshot || {},
          recordedAt
        });
        updateVersionRecordAuthorizationSummary({
          releaseManifestDir,
          authorizationRecord: authorizationUpdate.updatedRecord,
          authorizationRecordPath,
          historicalRecordPath: authorizationUpdate.historicalRecordPath
        });
        result.authorizationConsumed = true;
        result.authorizationUpdate = authorizationUpdate;
      }
    }

    return result;
  }

  return {
    executeReleaseUnattendedGovernance
  };
}
