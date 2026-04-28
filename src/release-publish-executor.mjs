import fs from "node:fs";
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

function getReleaseManifestDir(packageRoot) {
  return path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(packageRoot, "manifest"));
}

function buildFailureSummaryMarkdown(record) {
  const primaryReason = record.blockers[0]?.message
    || record.notes[0]
    || "Release publish execution did not reach ready-to-execute.";
  const lines = [
    "# Release Publish Failure Summary",
    "",
    `- recordedAt: \`${record.recordedAt}\``,
    `- executionId: \`${record.executionId}\``,
    `- status: \`${record.status}\``,
    `- package: \`${record.packageName}@${record.version}\``,
    `- registry: \`${record.targetPublish.registryUrl || "missing"}\``,
    `- planner status: \`${record.plannerSummary.status}\``,
    `- publishAttempted: \`${record.publishAttempted}\``,
    `- primaryReason: ${primaryReason}`,
    ""
  ];

  if (record.blockers.length > 0) {
    lines.push("## Blockers", "");
    for (const blocker of record.blockers) {
      lines.push(`- \`${blocker.code}\`: ${blocker.message}`);
    }
    lines.push("");
  }

  if (record.notes.length > 0) {
    lines.push("## Notes", "");
    for (const note of record.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  lines.push("## Next Step", "");
  lines.push(`- Review \`${record.recordPathRelative}\`, resolve the current gate condition, then re-run \`execute-release-publish\` with the required confirmation flags before any manual \`${record.manualConfirmation.publishCommand}\`.`);
  lines.push("");

  return lines.join("\n");
}

function buildExecutionRecord({
  recordedAt,
  executionId,
  packageRoot,
  result
}) {
  return {
    executionId,
    recordedAt,
    packageName: normalizeText(result.targetPublish.packageName),
    version: normalizeText(result.targetPublish.version),
    packageRoot,
    projectRoot: result.projectRoot,
    status: result.status,
    executionMode: result.executionMode,
    publishAttempted: result.publishAttempted,
    publishSucceeded: false,
    wouldExecuteCommand: result.wouldExecuteCommand,
    commandFlags: result.commandFlags,
    targetPublish: result.targetPublish,
    plannerSummary: {
      status: result.planner.status,
      blockerCount: result.planner.blockers.length,
      blockers: result.planner.blockers,
      publishReadiness: result.planner.evidence?.publishReadiness || {},
      artifacts: result.planner.evidence?.artifacts || {}
    },
    blockers: result.blockers,
    notes: result.notes,
    manualConfirmation: {
      mode: result.manualConfirmation.mode,
      commands: result.manualConfirmation.commands,
      publishCommand: result.manualConfirmation.publishCommand
    },
    failureSummary: ""
  };
}

function buildPublishExecutionSnapshot(record, manifestArtifacts) {
  return {
    executionId: record.executionId || "",
    recordedAt: record.recordedAt || "",
    status: record.status || "unknown",
    executionMode: record.executionMode || "",
    publishAttempted: Boolean(record.publishAttempted),
    publishSucceeded: Boolean(record.publishSucceeded),
    wouldExecuteCommand: record.wouldExecuteCommand || "",
    commandFlags: {
      confirm: Boolean(record.commandFlags?.confirm),
      acknowledgeWarnings: Boolean(record.commandFlags?.acknowledgeWarnings)
    },
    plannerStatus: record.plannerSummary?.status || "unknown",
    plannerBlockerCount: record.plannerSummary?.blockerCount || 0,
    plannerBlockers: record.plannerSummary?.blockers || [],
    releaseGateStatus: record.plannerSummary?.publishReadiness?.releaseGateStatus || "",
    requiresExplicitAcknowledgement: Boolean(record.plannerSummary?.publishReadiness?.requiresExplicitAcknowledgement),
    failureSummaryPresent: Boolean(record.failureSummary?.present),
    failurePrimaryReason: record.failureSummary?.primaryReason || "",
    recordPath: manifestArtifacts.recordPath,
    recordPathRelative: manifestArtifacts.recordPathRelative,
    historicalRecordPath: manifestArtifacts.historicalRecordPath,
    historicalRecordPathRelative: manifestArtifacts.historicalRecordPathRelative,
    failureSummaryPath: record.failureSummary?.summaryPath || "",
    failureSummaryPathRelative: record.failureSummary?.summaryPathRelative || ""
  };
}

function updateVersionRecordPublishExecutionSnapshot({
  releaseManifestDir,
  snapshot,
  manifestArtifacts
}) {
  const versionRecordPath = path.join(releaseManifestDir, "version-record.json");
  if (!fs.existsSync(versionRecordPath)) return;

  const versionRecord = readJson(versionRecordPath);
  writeJson(versionRecordPath, {
    ...versionRecord,
    artifacts: {
      ...(versionRecord.artifacts || {}),
      releasePublishRecordPath: manifestArtifacts.recordPath,
      releasePublishFailureSummaryPath: manifestArtifacts.failureSummaryPath || ""
    },
    publishExecutionSummary: snapshot
  });
}

function persistExecutionArtifacts({
  releaseManifestDir,
  record,
  failureSummaryMarkdown
}) {
  const recordsRoot = path.join(releaseManifestDir, "release-publish-records");
  const recordPath = path.join(releaseManifestDir, "release-publish-record.json");
  const historicalRecordPath = path.join(recordsRoot, `${record.executionId}.json`);
  const failureSummaryPath = path.join(releaseManifestDir, "release-publish-failure-summary.md");

  ensureDir(releaseManifestDir);
  ensureDir(recordsRoot);

  const recordPathRelative = toManifestRelativePath(releaseManifestDir, recordPath);
  const historicalRecordPathRelative = toManifestRelativePath(releaseManifestDir, historicalRecordPath);
  const failureSummaryPathRelative = toManifestRelativePath(releaseManifestDir, failureSummaryPath);
  const persistedRecord = {
    ...record,
    recordPath: recordPath,
    recordPathRelative,
    historicalRecordPath,
    historicalRecordPathRelative,
    failureSummaryPath: failureSummaryMarkdown ? failureSummaryPath : "",
    failureSummaryPathRelative: failureSummaryMarkdown ? failureSummaryPathRelative : "",
    failureSummary: failureSummaryMarkdown
      ? {
        present: true,
        primaryReason: record.blockers[0]?.message || record.notes[0] || "",
        summaryPath: failureSummaryPath,
        summaryPathRelative: failureSummaryPathRelative
      }
      : {
        present: false,
        primaryReason: "",
        summaryPath: "",
        summaryPathRelative: ""
      }
  };

  writeJson(recordPath, persistedRecord);
  writeJson(historicalRecordPath, persistedRecord);

  if (failureSummaryMarkdown) {
    fs.writeFileSync(failureSummaryPath, failureSummaryMarkdown, "utf8");
  } else if (fs.existsSync(failureSummaryPath)) {
    fs.rmSync(failureSummaryPath, { force: true });
  }

  return {
    recordPath,
    recordPathRelative,
    historicalRecordPath,
    historicalRecordPathRelative,
    failureSummaryPath: failureSummaryMarkdown ? failureSummaryPath : "",
    failureSummaryPathRelative: failureSummaryMarkdown ? failureSummaryPathRelative : ""
  };
}

export function createReleasePublishExecutorService({
  context,
  projectRoot,
  releasePublishPlannerService
}) {
  const packageRoot = context.packageRoot;
  const releaseManifestDir = getReleaseManifestDir(packageRoot);

  function executeReleasePublish({
    confirm = false,
    acknowledgeWarnings = false
  } = {}) {
    const plannerResult = releasePublishPlannerService.planReleasePublish();
    const publishReadiness = plannerResult.evidence?.publishReadiness || {};
    const commandFlags = {
      confirm,
      acknowledgeWarnings
    };
    const baseResult = {
      packageRoot,
      projectRoot,
      commandFlags,
      planner: plannerResult,
      targetPublish: plannerResult.targetPublish,
      manualConfirmation: plannerResult.manualConfirmation,
      executionMode: "manifest-recorded-skeleton",
      publishAttempted: false,
      wouldExecuteCommand: plannerResult.targetPublish.publishCommand
    };

    let status = "ready-to-execute";
    let blockers = [];
    let notes = [
      "Secondary eligibility check passed and confirmation gates are satisfied.",
      "Real npm publish is intentionally not enabled in this skeleton yet."
    ];

    if (plannerResult.status === "blocked") {
      status = "blocked";
      blockers = plannerResult.blockers;
      notes = [
        "Release publish execution is blocked by the latest planner result.",
        "Resolve planner blockers before retrying execute-release-publish."
      ];
    } else if (!confirm) {
      status = "confirmation-required";
      notes = [
        "Planner re-check passed, but real publish remains disabled until explicit confirmation is provided.",
        "Re-run with --confirm after reviewing the latest planner evidence."
      ];
    } else if (publishReadiness.requiresExplicitAcknowledgement && !acknowledgeWarnings) {
      status = "acknowledgement-required";
      blockers = [
        {
          code: "warning-acknowledgement-required",
          message: "Current release snapshot still carries governance warnings; re-run with --acknowledge-warnings after manual review."
        }
      ];
      notes = [
        "Planner re-check passed with warning-level release readiness.",
        "This execution skeleton will not advance until warnings are explicitly acknowledged."
      ];
    }

    const recordedAt = new Date().toISOString();
    const executionId = `release_publish_${buildExecutionStamp(recordedAt)}`;
    const result = {
      ...baseResult,
      recordedAt,
      status,
      blockers,
      notes
    };
    const record = buildExecutionRecord({
      recordedAt,
      executionId,
      packageRoot,
      result
    });
    const failureSummaryMarkdown = status === "ready-to-execute"
      ? ""
      : buildFailureSummaryMarkdown({
        ...record,
        recordPathRelative: "manifest/release-publish-record.json"
      });
    const manifestArtifacts = persistExecutionArtifacts({
      releaseManifestDir,
      record,
      failureSummaryMarkdown
    });
    const persistedRecord = readJson(manifestArtifacts.recordPath);
    const publishExecutionSnapshot = buildPublishExecutionSnapshot(persistedRecord, manifestArtifacts);
    updateVersionRecordPublishExecutionSnapshot({
      releaseManifestDir,
      snapshot: publishExecutionSnapshot,
      manifestArtifacts
    });

    return {
      ...result,
      executionId,
      manifestArtifacts,
      publishExecutionSnapshot,
      executionRecordPath: manifestArtifacts.recordPath,
      executionRecordPathRelative: manifestArtifacts.recordPathRelative,
      executionRecordHistoryPath: manifestArtifacts.historicalRecordPath,
      executionRecordHistoryPathRelative: manifestArtifacts.historicalRecordPathRelative,
      failureSummaryPath: manifestArtifacts.failureSummaryPath,
      failureSummaryPathRelative: manifestArtifacts.failureSummaryPathRelative
    };
  }

  return {
    executeReleasePublish
  };
}
