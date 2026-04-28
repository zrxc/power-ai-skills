import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ensureDir, readJson, safeTrim, writeJson } from "./shared/fs.mjs";
import { buildExecutorNextAction } from "./release-publish-guidance.mjs";

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

function truncateOutput(value = "", maxLength = 4000) {
  const text = safeTrim(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n...[truncated ${text.length - maxLength} chars]`;
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runReleasePublishCommand({ packageRoot, targetPublish }) {
  const args = Array.isArray(targetPublish.publishArgs) && targetPublish.publishArgs.length > 0
    ? targetPublish.publishArgs
    : ["publish"];
  const command = getNpmCommand();
  const result = spawnSync(command, args, {
    cwd: packageRoot,
    encoding: "utf8"
  });

  return {
    command,
    args,
    exitCode: typeof result.status === "number" ? result.status : (result.error ? 1 : 0),
    signal: normalizeText(result.signal),
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    errorMessage: result.error?.message || "",
    ok: result.status === 0 && !result.error
  };
}

function buildPublishAttemptSummary(publishAttempt = {}) {
  return {
    command: normalizeText(publishAttempt.command),
    args: Array.isArray(publishAttempt.args) ? publishAttempt.args : [],
    exitCode: typeof publishAttempt.exitCode === "number" ? publishAttempt.exitCode : null,
    signal: normalizeText(publishAttempt.signal),
    stdout: truncateOutput(publishAttempt.stdout),
    stderr: truncateOutput(publishAttempt.stderr),
    errorMessage: truncateOutput(publishAttempt.errorMessage),
    ok: Boolean(publishAttempt.ok)
  };
}

function buildPublishFailureMessage(publishAttempt = {}, targetPublish) {
  const commandLabel = normalizeText(targetPublish?.publishCommand) || "npm publish";
  const detail = truncateOutput(
    publishAttempt.errorMessage
    || publishAttempt.stderr
    || publishAttempt.stdout
    || ""
  );
  const exitCodeLabel = typeof publishAttempt.exitCode === "number"
    ? `exit code ${publishAttempt.exitCode}`
    : "unknown exit code";
  return detail
    ? `Real publish command failed for \`${commandLabel}\` with ${exitCodeLabel}: ${detail}`
    : `Real publish command failed for \`${commandLabel}\` with ${exitCodeLabel}.`;
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
    `- realPublishEnabled: \`${record.realPublishEnabled}\``,
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
  if (record.nextAction?.command) {
    lines.push(`- Review \`${record.recordPathRelative}\`, then continue with \`${record.nextAction.command}\`.`);
  } else {
    lines.push(`- Review \`${record.recordPathRelative}\`, resolve the current gate condition, then re-run \`execute-release-publish\` with the required confirmation flags before any manual \`${record.manualConfirmation.publishCommand}\`.`);
  }
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
    realPublishEnabled: result.realPublishEnabled,
    publishAttempted: result.publishAttempted,
    publishSucceeded: result.publishSucceeded,
    wouldExecuteCommand: result.wouldExecuteCommand,
    commandFlags: result.commandFlags,
    targetPublish: result.targetPublish,
    publishResult: result.publishResult || null,
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
    nextAction: result.nextAction,
    failureSummary: ""
  };
}

function buildPublishExecutionSnapshot(record, manifestArtifacts) {
  return {
    executionId: record.executionId || "",
    recordedAt: record.recordedAt || "",
    status: record.status || "unknown",
    executionMode: record.executionMode || "",
    realPublishEnabled: Boolean(record.realPublishEnabled),
    publishAttempted: Boolean(record.publishAttempted),
    publishSucceeded: Boolean(record.publishSucceeded),
    wouldExecuteCommand: record.wouldExecuteCommand || "",
    publishResult: record.publishResult || null,
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
    nextAction: record.nextAction || null,
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
  releasePublishPlannerService,
  publishRunner = runReleasePublishCommand
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
      executionMode: "manifest-recorded-publish",
      realPublishEnabled: true,
      publishAttempted: false,
      publishSucceeded: false,
      publishResult: null,
      wouldExecuteCommand: plannerResult.targetPublish.publishCommand
    };

    let status = "ready-to-execute";
    let blockers = [];
    let notes = [
      "Secondary eligibility check passed and confirmation gates are satisfied.",
      "Real npm publish has not been attempted yet for this execution."
    ];
    let publishAttempted = false;
    let publishSucceeded = false;
    let publishResult = null;

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
    } else {
      publishAttempted = true;
      const rawPublishResult = publishRunner({
        packageRoot,
        targetPublish: plannerResult.targetPublish,
        commandFlags,
        projectRoot
      });
      publishResult = buildPublishAttemptSummary(rawPublishResult);
      publishSucceeded = Boolean(publishResult.ok);

      if (publishSucceeded) {
        status = "published";
        notes = [
          "Secondary eligibility check passed and the real npm publish command completed successfully.",
          `Publish command completed: ${plannerResult.targetPublish.publishCommand}`
        ];
      } else {
        status = "publish-failed";
        blockers = [
          {
            code: "publish-command-failed",
            message: buildPublishFailureMessage(publishResult, plannerResult.targetPublish)
          }
        ];
        notes = [
          "Secondary eligibility check passed and the real npm publish command was attempted.",
          "Review the recorded publish stderr/stdout summary before retrying this version."
        ];
      }
    }

    const recordedAt = new Date().toISOString();
    const executionId = `release_publish_${buildExecutionStamp(recordedAt)}`;
    const result = {
      ...baseResult,
      recordedAt,
      status,
      blockers,
      publishAttempted,
      publishSucceeded,
      publishResult,
      notes,
      nextAction: buildExecutorNextAction({
        status,
        targetPublish: plannerResult.targetPublish
      })
    };
    const record = buildExecutionRecord({
      recordedAt,
      executionId,
      packageRoot,
      result
    });
    const failureSummaryMarkdown = status === "published"
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
