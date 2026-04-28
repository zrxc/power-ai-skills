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

function buildReleaseOrchestrationRecord({
  executionId,
  recordedAt,
  packageRoot,
  projectRoot,
  result
}) {
  return {
    executionId,
    recordedAt,
    packageName: normalizeText(result.evidence?.targetPublish?.packageName),
    version: normalizeText(result.evidence?.targetPublish?.version),
    packageRoot,
    projectRoot,
    status: result.status,
    executionMode: normalizeText(result.executionMode) || "dry-run-plan-recorded",
    stageModelVersion: result.orchestrationContract?.stageModelVersion || 1,
    blockers: result.blockers || [],
    stages: result.stages || [],
    humanGates: result.humanGates || [],
    nextAction: result.nextAction || null,
    commandResults: result.commandResults || [],
    executionSummary: result.executionSummary || null,
    evidence: result.evidence || {},
    orchestrationContract: {
      ...(result.orchestrationContract || {}),
      executionMode: normalizeText(result.executionMode) || "dry-run-plan-recorded"
    }
  };
}

function buildReleaseOrchestrationSummary(record, manifestArtifacts) {
  const commandResults = Array.isArray(record.commandResults) ? record.commandResults : [];
  const successfulCommandCount = commandResults.filter((item) => item.ok).length;
  const failedCommandCount = commandResults.filter((item) => !item.ok).length;
  return {
    executionId: record.executionId || "",
    recordedAt: record.recordedAt || "",
    status: record.status || "unknown",
    executionMode: record.executionMode || "dry-run-plan-recorded",
    stageModelVersion: record.stageModelVersion || 1,
    blockerCount: Array.isArray(record.blockers) ? record.blockers.length : 0,
    blockers: record.blockers || [],
    stageCount: Array.isArray(record.stages) ? record.stages.length : 0,
    stageStatuses: (record.stages || []).map((stage) => ({
      id: stage.id || "",
      kind: stage.kind || "",
      status: stage.status || "unknown",
      humanGate: Boolean(stage.humanGate)
    })),
    executedCommandCount: commandResults.length,
    successfulCommandCount,
    failedCommandCount,
    commandResults: commandResults.map((item) => ({
      id: item.id || "",
      stageId: item.stageId || "",
      displayCommand: item.displayCommand || item.command || "",
      exitCode: typeof item.exitCode === "number" ? item.exitCode : null,
      ok: Boolean(item.ok)
    })),
    stoppedStageId: record.executionSummary?.stoppedStageId || "",
    stoppedReason: record.executionSummary?.stoppedReason || "",
    humanGateCount: Array.isArray(record.humanGates) ? record.humanGates.length : 0,
    nextAction: record.nextAction || null,
    releasePublishPlanStatus: record.evidence?.releasePublishPlanStatus || "unknown",
    latestPublishExecutionStatus: record.evidence?.latestPublishExecutionStatus || "not-started",
    publishRecordPath: record.orchestrationContract?.publishRecordPath || "",
    versionRecordPath: record.orchestrationContract?.versionRecordPath || "",
    recordPath: manifestArtifacts.recordPath,
    recordPathRelative: manifestArtifacts.recordPathRelative,
    historicalRecordPath: manifestArtifacts.historicalRecordPath,
    historicalRecordPathRelative: manifestArtifacts.historicalRecordPathRelative
  };
}

export function persistReleaseOrchestrationArtifacts({
  releaseManifestDir,
  packageRoot,
  projectRoot,
  result
}) {
  const recordedAt = new Date().toISOString();
  const executionId = `release_orchestration_${buildExecutionStamp(recordedAt)}`;
  const recordsRoot = path.join(releaseManifestDir, "release-orchestration-records");
  const recordPath = path.join(releaseManifestDir, "release-orchestration-record.json");
  const historicalRecordPath = path.join(recordsRoot, `${executionId}.json`);
  const recordPathRelative = toManifestRelativePath(releaseManifestDir, recordPath);
  const historicalRecordPathRelative = toManifestRelativePath(releaseManifestDir, historicalRecordPath);

  ensureDir(releaseManifestDir);
  ensureDir(recordsRoot);

  const record = buildReleaseOrchestrationRecord({
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
  const snapshot = buildReleaseOrchestrationSummary(persistedRecord, manifestArtifacts);
  const versionRecordPath = path.join(releaseManifestDir, "version-record.json");

  if (result.orchestrationContract?.versionRecordPath && normalizeText(result.orchestrationContract.versionRecordPath) !== versionRecordPath) {
    // Keep the on-disk contract aligned with the actual manifest root that was used.
    persistedRecord.orchestrationContract.versionRecordPath = versionRecordPath;
    writeJson(recordPath, persistedRecord);
    writeJson(historicalRecordPath, persistedRecord);
  }

  if (path.isAbsolute(versionRecordPath)) {
    try {
      const versionRecord = readJson(versionRecordPath);
      writeJson(versionRecordPath, {
        ...versionRecord,
        artifacts: {
          ...(versionRecord.artifacts || {}),
          releaseOrchestrationRecordPath: recordPath,
          releaseOrchestrationRecordsRoot: recordsRoot
        },
        releaseOrchestrationSummary: snapshot
      });
    } catch {
      // version-record is optional for the planner persistence path; skip snapshot backfill if unreadable.
    }
  }

  return {
    executionId,
    recordedAt,
    manifestArtifacts,
    snapshot,
    persistedRecord: {
      ...persistedRecord,
      orchestrationContract: {
        ...(persistedRecord.orchestrationContract || {}),
        versionRecordPath
      }
    }
  };
}
