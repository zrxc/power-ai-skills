import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createReleasePublishPlannerService } from "../src/release-publish-planner.mjs";
import { createReleasePublishExecutorService } from "../src/release-publish-executor.mjs";
import { readJson, writeJson } from "../src/shared/fs.mjs";

function createTempManifestRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-release-publish-executor-"));
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
    version
  });
  writeJson(path.join(manifestDir, "version-record.json"), {
    packageName,
    version,
    artifacts: {
      notificationJsonPath
    }
  });
  writeJson(path.join(manifestDir, "release-gate-report.json"), {
    packageName,
    version,
    overallStatus: "pass",
    summary: {
      warningGates: 0,
      blockingIssues: 0
    }
  });
  writeJson(path.join(manifestDir, "governance-operations-report.json"), {
    packageName,
    version,
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
    blocked: false
  });
  writeJson(notificationJsonPath, {
    packageName,
    version
  });
}

function createExecutor(context) {
  const releasePublishPlannerService = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });

  return createReleasePublishExecutorService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService
  });
}

test("executeReleasePublish requires explicit confirmation before any publish attempt", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  const executor = createExecutor(context);
  const result = executor.executeReleasePublish();

  assert.equal(result.status, "confirmation-required");
  assert.equal(result.publishAttempted, false);
  assert.equal(result.commandFlags.confirm, false);
  assert.equal(result.planner.status, "eligible");
  assert.equal(result.executionRecordPathRelative, "manifest/release-publish-record.json");
  assert.equal(result.failureSummaryPathRelative, "manifest/release-publish-failure-summary.md");
  assert.equal(fs.existsSync(result.executionRecordPath), true);
  assert.equal(fs.existsSync(result.executionRecordHistoryPath), true);
  assert.equal(fs.existsSync(result.failureSummaryPath), true);

  const record = readJson(result.executionRecordPath);
  assert.equal(record.status, "confirmation-required");
  assert.equal(record.failureSummary.present, true);
  assert.match(fs.readFileSync(result.failureSummaryPath, "utf8"), /--confirm/i);
  const versionRecord = readJson(path.join(manifestDir, "version-record.json"));
  assert.equal(versionRecord.artifacts.releasePublishRecordPath, result.executionRecordPath);
  assert.equal(versionRecord.artifacts.releasePublishFailureSummaryPath, result.failureSummaryPath);
  assert.equal(versionRecord.publishExecutionSummary.status, "confirmation-required");
  assert.equal(versionRecord.publishExecutionSummary.failureSummaryPresent, true);
});

test("executeReleasePublish performs a fresh planner re-check before confirmation", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  const releasePublishPlannerService = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  const initialPlan = releasePublishPlannerService.planReleasePublish();
  assert.equal(initialPlan.status, "eligible");

  writeJson(path.join(manifestDir, "release-gate-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    overallStatus: "fail",
    summary: {
      warningGates: 0,
      blockingIssues: 1
    }
  });
  writeJson(path.join(manifestDir, "governance-operations-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    summary: {
      releaseGateStatus: "fail",
      releaseGateWarnings: 0,
      blockingIssues: 1
    },
    releaseReadiness: {
      releaseGateStatus: "fail",
      warningGates: 0,
      blockingIssues: 1,
      canPublish: false,
      broadRolloutReady: false,
      requiresExplicitAcknowledgement: false
    }
  });

  const executor = createReleasePublishExecutorService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService
  });
  const result = executor.executeReleasePublish({
    confirm: true
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.planner.status, "blocked");
  assert.equal(result.blockers.some((item) => item.code === "release-gate-status-not-allowed"), true);
  assert.equal(fs.existsSync(result.executionRecordPath), true);
  assert.equal(fs.existsSync(result.failureSummaryPath), true);

  const record = readJson(result.executionRecordPath);
  assert.equal(record.status, "blocked");
  assert.equal(record.failureSummary.present, true);
  assert.equal(record.plannerSummary.status, "blocked");
  const versionRecord = readJson(path.join(manifestDir, "version-record.json"));
  assert.equal(versionRecord.publishExecutionSummary.status, "blocked");
  assert.equal(versionRecord.publishExecutionSummary.plannerStatus, "blocked");
});

test("executeReleasePublish requires explicit warning acknowledgement for warn-level releases", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  writeJson(path.join(manifestDir, "release-gate-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    overallStatus: "warn",
    summary: {
      warningGates: 1,
      blockingIssues: 0
    }
  });
  writeJson(path.join(manifestDir, "governance-operations-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    summary: {
      releaseGateStatus: "warn",
      releaseGateWarnings: 1,
      blockingIssues: 0
    },
    releaseReadiness: {
      releaseGateStatus: "warn",
      warningGates: 1,
      blockingIssues: 0,
      canPublish: true,
      broadRolloutReady: false,
      requiresExplicitAcknowledgement: true
    }
  });

  const executor = createExecutor(context);
  const result = executor.executeReleasePublish({
    confirm: true
  });

  assert.equal(result.status, "acknowledgement-required");
  assert.equal(result.commandFlags.confirm, true);
  assert.equal(result.commandFlags.acknowledgeWarnings, false);
  assert.equal(result.blockers[0].code, "warning-acknowledgement-required");
  assert.equal(fs.existsSync(result.executionRecordPath), true);
  assert.equal(fs.existsSync(result.failureSummaryPath), true);

  const record = readJson(result.executionRecordPath);
  assert.equal(record.status, "acknowledgement-required");
  assert.equal(record.failureSummary.present, true);
  assert.match(fs.readFileSync(result.failureSummaryPath, "utf8"), /acknowledge/i);
  const versionRecord = readJson(path.join(manifestDir, "version-record.json"));
  assert.equal(versionRecord.publishExecutionSummary.status, "acknowledgement-required");
  assert.equal(versionRecord.publishExecutionSummary.requiresExplicitAcknowledgement, true);
});

test("executeReleasePublish reaches ready-to-execute skeleton after confirmation and warning acknowledgement", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  writeJson(path.join(manifestDir, "release-gate-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    overallStatus: "warn",
    summary: {
      warningGates: 1,
      blockingIssues: 0
    }
  });
  writeJson(path.join(manifestDir, "governance-operations-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    summary: {
      releaseGateStatus: "warn",
      releaseGateWarnings: 1,
      blockingIssues: 0
    },
    releaseReadiness: {
      releaseGateStatus: "warn",
      warningGates: 1,
      blockingIssues: 0,
      canPublish: true,
      broadRolloutReady: false,
      requiresExplicitAcknowledgement: true
    }
  });
  writeJson(path.join(manifestDir, "release-publish-record.json"), {
    status: "blocked"
  });
  fs.writeFileSync(path.join(manifestDir, "release-publish-failure-summary.md"), "stale failure summary", "utf8");

  const executor = createExecutor(context);
  const result = executor.executeReleasePublish({
    confirm: true,
    acknowledgeWarnings: true
  });

  assert.equal(result.status, "ready-to-execute");
  assert.equal(result.publishAttempted, false);
  assert.equal(result.commandFlags.acknowledgeWarnings, true);
  assert.match(result.notes[1], /not enabled/i);
  assert.equal(fs.existsSync(result.executionRecordPath), true);
  assert.equal(fs.existsSync(result.executionRecordHistoryPath), true);
  assert.equal(result.failureSummaryPathRelative, "");
  assert.equal(fs.existsSync(path.join(manifestDir, "release-publish-failure-summary.md")), false);

  const record = readJson(result.executionRecordPath);
  assert.equal(record.status, "ready-to-execute");
  assert.equal(record.failureSummary.present, false);
  assert.equal(record.failureSummaryPath, "");
  const versionRecord = readJson(path.join(manifestDir, "version-record.json"));
  assert.equal(versionRecord.publishExecutionSummary.status, "ready-to-execute");
  assert.equal(versionRecord.publishExecutionSummary.failureSummaryPresent, false);
  assert.equal(versionRecord.artifacts.releasePublishFailureSummaryPath, "");
});
