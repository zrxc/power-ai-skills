import path from "node:path";
import { ensureDir, readJson, writeJson } from "./shared/fs.mjs";

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

function buildReleaseUnattendedHostedRecord({
  executionId,
  recordedAt,
  packageRoot,
  projectRoot,
  result
}) {
  return {
    executionId,
    recordedAt,
    packageName: normalizeText(result.packageName),
    version: normalizeText(result.version),
    packageRoot,
    projectRoot,
    status: result.status,
    executionMode: normalizeText(result.executionMode) || "hosted-unattended-executor",
    runtimeSource: normalizeText(result.runtimeSource),
    trigger: result.trigger || {},
    hostedBoundary: result.hostedBoundary || {},
    governanceStatus: normalizeText(result.governanceStatus),
    publishExecuted: Boolean(result.publishExecuted),
    authorizationConsumed: Boolean(result.authorizationConsumed),
    blockers: result.blockers || [],
    nextAction: result.nextAction || null,
    governancePlan: result.governancePlan || null,
    publishExecutionSnapshot: result.publishExecution?.publishExecutionSnapshot || null
  };
}

function buildReleaseUnattendedHostedSummary(record, manifestArtifacts) {
  return {
    executionId: record.executionId || "",
    recordedAt: record.recordedAt || "",
    status: record.status || "unknown",
    executionMode: record.executionMode || "hosted-unattended-executor",
    runtimeSource: record.runtimeSource || "",
    triggerId: record.trigger?.triggerId || "",
    triggerLabel: record.trigger?.triggerLabel || "",
    governanceStatus: record.governanceStatus || "",
    publishExecuted: Boolean(record.publishExecuted),
    authorizationConsumed: Boolean(record.authorizationConsumed),
    blockerCount: Array.isArray(record.blockers) ? record.blockers.length : 0,
    blockers: record.blockers || [],
    nextAction: record.nextAction || null,
    authorizationId: record.governancePlan?.authorization?.authorizationId || "",
    publishExecutionStatus: record.publishExecutionSnapshot?.status || "",
    governanceRecordPath: record.governancePlan?.governanceContract?.governanceRecordPath || "",
    publishRecordPath: record.publishExecutionSnapshot?.recordPath || "",
    recordPath: manifestArtifacts.recordPath,
    recordPathRelative: manifestArtifacts.recordPathRelative,
    historicalRecordPath: manifestArtifacts.historicalRecordPath,
    historicalRecordPathRelative: manifestArtifacts.historicalRecordPathRelative
  };
}

export function persistReleaseUnattendedHostedExecutionArtifacts({
  releaseManifestDir,
  packageRoot,
  projectRoot,
  result
}) {
  const recordedAt = new Date().toISOString();
  const executionId = `release_unattended_hosted_${buildExecutionStamp(recordedAt)}`;
  const recordsRoot = path.join(releaseManifestDir, "release-unattended-hosted-records");
  const recordPath = path.join(releaseManifestDir, "release-unattended-hosted-record.json");
  const historicalRecordPath = path.join(recordsRoot, `${executionId}.json`);
  const recordPathRelative = toManifestRelativePath(releaseManifestDir, recordPath);
  const historicalRecordPathRelative = toManifestRelativePath(releaseManifestDir, historicalRecordPath);

  ensureDir(releaseManifestDir);
  ensureDir(recordsRoot);

  const record = buildReleaseUnattendedHostedRecord({
    executionId,
    recordedAt,
    packageRoot,
    projectRoot,
    result
  });
  const persistedRecord = {
    ...record,
    recordPath,
    recordPathRelative,
    historicalRecordPath,
    historicalRecordPathRelative
  };

  writeJson(recordPath, persistedRecord);
  writeJson(historicalRecordPath, persistedRecord);

  const manifestArtifacts = {
    recordPath,
    recordPathRelative,
    historicalRecordPath,
    historicalRecordPathRelative,
    recordsRoot
  };
  const snapshot = buildReleaseUnattendedHostedSummary(persistedRecord, manifestArtifacts);
  const versionRecordPath = path.join(releaseManifestDir, "version-record.json");

  try {
    const versionRecord = readJson(versionRecordPath);
    writeJson(versionRecordPath, {
      ...versionRecord,
      artifacts: {
        ...(versionRecord.artifacts || {}),
        releaseUnattendedHostedRecordPath: recordPath,
        releaseUnattendedHostedRecordsRoot: recordsRoot
      },
      releaseUnattendedHostedExecutionSummary: snapshot
    });
  } catch {
    // Hosted execution still records its own audit trail even when version-record is unavailable.
  }

  return {
    executionId,
    recordedAt,
    manifestArtifacts,
    snapshot,
    persistedRecord
  };
}
