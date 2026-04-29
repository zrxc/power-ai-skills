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

function buildReleaseUnattendedGovernanceRecord({
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
    executionMode: normalizeText(result.executionMode) || "dry-run-plan-recorded",
    blockers: result.blockers || [],
    riskFlags: result.riskFlags || [],
    nextAction: result.nextAction || null,
    eligibility: result.eligibility || {},
    authorization: result.authorization || {},
    governanceDecision: result.governanceDecision || {},
    evidence: result.evidence || {},
    governanceContract: {
      ...(result.governanceContract || {}),
      executionMode: normalizeText(result.executionMode) || "dry-run-plan-recorded"
    }
  };
}

function buildReleaseUnattendedGovernanceSummary(record, manifestArtifacts) {
  return {
    executionId: record.executionId || "",
    recordedAt: record.recordedAt || "",
    status: record.status || "unknown",
    executionMode: record.executionMode || "dry-run-plan-recorded",
    blockerCount: Array.isArray(record.blockers) ? record.blockers.length : 0,
    blockers: record.blockers || [],
    riskFlags: record.riskFlags || [],
    authorizationId: record.authorization?.authorizationId || "",
    authorizationPresent: Boolean(record.authorization?.present),
    authorizationStatus: record.authorization?.status || "",
    releaseOrchestrationStatus: record.eligibility?.orchestrationStatus || "",
    publishPlannerStatus: record.eligibility?.publishPlannerStatus || "",
    latestPublishExecutionStatus: record.eligibility?.latestPublishExecutionStatus || "",
    followUpPending: Boolean(record.eligibility?.followUpPending),
    lockState: record.governanceDecision?.lockState || "unlocked",
    lockReason: record.governanceDecision?.lockReason || "",
    nextAction: record.nextAction || null,
    recordPath: manifestArtifacts.recordPath,
    recordPathRelative: manifestArtifacts.recordPathRelative,
    historicalRecordPath: manifestArtifacts.historicalRecordPath,
    historicalRecordPathRelative: manifestArtifacts.historicalRecordPathRelative
  };
}

export function persistReleaseUnattendedGovernanceArtifacts({
  releaseManifestDir,
  packageRoot,
  projectRoot,
  result
}) {
  const recordedAt = new Date().toISOString();
  const executionId = `release_unattended_governance_${buildExecutionStamp(recordedAt)}`;
  const recordsRoot = path.join(releaseManifestDir, "release-unattended-governance-records");
  const recordPath = path.join(releaseManifestDir, "release-unattended-governance-record.json");
  const historicalRecordPath = path.join(recordsRoot, `${executionId}.json`);
  const recordPathRelative = toManifestRelativePath(releaseManifestDir, recordPath);
  const historicalRecordPathRelative = toManifestRelativePath(releaseManifestDir, historicalRecordPath);

  ensureDir(releaseManifestDir);
  ensureDir(recordsRoot);

  const record = buildReleaseUnattendedGovernanceRecord({
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
  const snapshot = buildReleaseUnattendedGovernanceSummary(persistedRecord, manifestArtifacts);
  const versionRecordPath = path.join(releaseManifestDir, "version-record.json");

  if (path.isAbsolute(versionRecordPath)) {
    try {
      const versionRecord = readJson(versionRecordPath);
      writeJson(versionRecordPath, {
        ...versionRecord,
        artifacts: {
          ...(versionRecord.artifacts || {}),
          releaseUnattendedGovernanceRecordPath: recordPath,
          releaseUnattendedGovernanceRecordsRoot: recordsRoot
        },
        releaseUnattendedGovernanceSummary: snapshot
      });
    } catch {
      // Governance planning can still persist its own record even if version-record is unavailable.
    }
  }

  return {
    executionId,
    recordedAt,
    manifestArtifacts,
    snapshot,
    persistedRecord
  };
}
