import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createReleasePublishPlannerService } from "../src/release-publish-planner.mjs";
import { createReleaseOrchestrationPlannerService } from "../src/release-orchestration-planner.mjs";
import { createReleaseOrchestrationExecutorService } from "../src/release-orchestration-executor.mjs";
import { formatExecuteReleaseOrchestrationMessage } from "../src/commands/project-output.mjs";
import { writeJson } from "../src/shared/fs.mjs";

function createTempManifestRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-release-orchestration-executor-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return tempRoot;
}

function withReleaseManifestEnv(t, manifestDir) {
  const previousValue = process.env.POWER_AI_RELEASE_MANIFEST_DIR;
  process.env.POWER_AI_RELEASE_MANIFEST_DIR = manifestDir;
  t.after(() => {
    if (previousValue === undefined) {
      delete process.env.POWER_AI_RELEASE_MANIFEST_DIR;
      return;
    }
    process.env.POWER_AI_RELEASE_MANIFEST_DIR = previousValue;
  });
}

function createReleaseSnapshot(manifestDir, { packageName, version }) {
  const notificationsDir = path.join(manifestDir, "notifications");
  const notificationJsonPath = path.join(notificationsDir, "upgrade-payload-20260428-120000.json");

  writeJson(path.join(manifestDir, "automation-report.json"), {
    packageName,
    version,
    generatedAt: "2026-04-28T12:00:00.000Z"
  });
  writeJson(path.join(manifestDir, "version-record.json"), {
    packageName,
    version,
    recordedAt: "2026-04-28T12:00:00.000Z",
    artifacts: {
      notificationJsonPath
    }
  });
  writeJson(path.join(manifestDir, "release-gate-report.json"), {
    packageName,
    version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    overallStatus: "pass",
    summary: {
      warningGates: 0,
      blockingIssues: 0
    }
  });
  writeJson(path.join(manifestDir, "governance-operations-report.json"), {
    packageName,
    version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    summary: {
      releaseGateStatus: "pass",
      releaseGateWarnings: 0,
      blockingIssues: 0
    },
    releaseReadiness: {
      releaseGateStatus: "pass",
      warningGates: 0,
      blockingIssues: 0,
      canPublish: true,
      broadRolloutReady: true,
      requiresExplicitAcknowledgement: false
    }
  });
  writeJson(path.join(manifestDir, "upgrade-advice-package.json"), {
    packageName,
    version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    blocked: false,
    summary: {
      releaseGateWarnings: 0,
      blockingCheckCount: 0
    }
  });
  writeJson(notificationJsonPath, {
    packageName,
    version,
    generatedAt: "2026-04-28T12:00:00.000Z"
  });
}

function createExecutor(context, stepRunner) {
  const releasePublishPlannerService = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  const releaseOrchestrationPlannerService = createReleaseOrchestrationPlannerService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService
  });
  return createReleaseOrchestrationExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseOrchestrationPlannerService,
    stepRunner
  });
}

test("executeReleaseOrchestration runs prepare-stage commands and stops at the controlled publish human gate", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  const calls = [];
  const executor = createExecutor(context, ({ step }) => {
    calls.push(step.displayCommand);
    return {
      id: step.id,
      stageId: step.stageId,
      displayCommand: step.displayCommand,
      command: "mock",
      args: [],
      exitCode: 0,
      signal: "",
      stdout: "ok",
      stderr: "",
      errorMessage: "",
      ok: true
    };
  });
  const result = executor.executeReleaseOrchestration();

  assert.equal(result.status, "ready-for-controlled-publish");
  assert.equal(result.executionMode, "prepare-through-human-gate");
  assert.deepEqual(calls, [
    "pnpm refresh:release-artifacts",
    "pnpm release:validate",
    "pnpm release:check",
    "pnpm release:generate"
  ]);
  assert.equal(result.commandResults.length, 4);
  assert.equal(result.executionSummary.stoppedStageId, "execute-controlled-publish");
  assert.equal(result.nextAction.command, "npx power-ai-skills execute-release-publish --confirm --json");
  assert.equal(result.orchestrationContract.executionMode, "prepare-through-human-gate");
  assert.equal(fs.existsSync(path.join(manifestDir, "release-orchestration-record.json")), true);

  const versionRecord = JSON.parse(fs.readFileSync(path.join(manifestDir, "version-record.json"), "utf8"));
  assert.equal(versionRecord.releaseOrchestrationSummary.executionMode, "prepare-through-human-gate");
  assert.equal(versionRecord.releaseOrchestrationSummary.executedCommandCount, 4);
  assert.match(formatExecuteReleaseOrchestrationMessage(result), /commands executed: 4/);
});

test("executeReleaseOrchestration records a failed prepare-stage command and stops before the publish gate", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  const executor = createExecutor(context, ({ step }) => {
    if (step.id === "release-check") {
      return {
        id: step.id,
        stageId: step.stageId,
        displayCommand: step.displayCommand,
        command: "mock",
        args: [],
        exitCode: 1,
        signal: "",
        stdout: "",
        stderr: "mock release check failed",
        errorMessage: "",
        ok: false
      };
    }
    return {
      id: step.id,
      stageId: step.stageId,
      displayCommand: step.displayCommand,
      command: "mock",
      args: [],
      exitCode: 0,
      signal: "",
      stdout: "ok",
      stderr: "",
      errorMessage: "",
      ok: true
    };
  });
  const result = executor.executeReleaseOrchestration();

  assert.equal(result.status, "prepare-failed");
  assert.equal(result.blockers[0].code, "orchestration-command-failed");
  assert.equal(result.executionSummary.stoppedStageId, "prepare-release-artifacts");
  assert.match(result.nextAction.reason, /pnpm release:check/);
  assert.equal(result.commandResults.length, 3);
  assert.equal(result.releaseOrchestrationSummary.failedCommandCount, 1);

  const record = JSON.parse(fs.readFileSync(path.join(manifestDir, "release-orchestration-record.json"), "utf8"));
  assert.equal(record.status, "prepare-failed");
  assert.equal(record.commandResults.length, 3);
  assert.equal(record.executionSummary.stoppedReason, "command-failed:release-check");
});

test("executeReleaseOrchestration does not rerun prepare steps when publish is already awaiting follow-up", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  writeJson(path.join(manifestDir, "version-record.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    recordedAt: "2026-04-28T12:00:00.000Z",
    artifacts: {
      notificationJsonPath: path.join(manifestDir, "notifications", "upgrade-payload-20260428-120000.json"),
      releasePublishRecordPath: path.join(manifestDir, "release-publish-record.json")
    },
    publishExecutionSummary: {
      executionId: "release_publish_20260428153000000",
      recordedAt: "2026-04-28T15:30:00.000Z",
      status: "published",
      executionMode: "manifest-recorded-publish",
      realPublishEnabled: true,
      publishAttempted: true,
      publishSucceeded: true,
      failureSummaryPresent: false,
      recordPath: path.join(manifestDir, "release-publish-record.json"),
      recordPathRelative: "manifest/release-publish-record.json",
      nextAction: {
        kind: "publish-complete",
        command: "",
        reason: "The controlled execution gate is satisfied and the real npm publish command completed successfully for this run."
      }
    }
  });

  let called = false;
  const executor = createExecutor(context, () => {
    called = true;
    return {
      id: "unexpected",
      stageId: "prepare-release-artifacts",
      displayCommand: "unexpected",
      command: "mock",
      args: [],
      exitCode: 0,
      signal: "",
      stdout: "ok",
      stderr: "",
      errorMessage: "",
      ok: true
    };
  });
  const result = executor.executeReleaseOrchestration();

  assert.equal(result.status, "published-awaiting-follow-up");
  assert.equal(called, false);
  assert.equal(result.commandResults.length, 0);
  assert.equal(result.executionSummary.stoppedStageId, "post-publish-follow-up");
});
