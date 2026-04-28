import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createReleasePublishPlannerService } from "../src/release-publish-planner.mjs";
import { createReleaseOrchestrationPlannerService } from "../src/release-orchestration-planner.mjs";
import { formatPlanReleaseOrchestrationMessage } from "../src/commands/project-output.mjs";
import { writeJson } from "../src/shared/fs.mjs";

function createTempManifestRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-release-orchestration-planner-"));
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
    generatedAt: "2026-04-28T12:00:00.000Z",
    summary: {
      changedFileCount: 1
    }
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

function createService(context) {
  const releasePublishPlannerService = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });

  return createReleaseOrchestrationPlannerService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService
  });
}

test("planReleaseOrchestration returns a ready dry-run stage model for an eligible release snapshot", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  const service = createService(context);
  const result = service.planReleaseOrchestration();

  assert.equal(result.status, "ready-for-controlled-publish");
  assert.equal(result.stages.length, 4);
  assert.equal(result.stages[0].id, "prepare-release-artifacts");
  assert.equal(result.stages[0].status, "completed");
  assert.equal(result.stages[1].id, "plan-controlled-publish");
  assert.equal(result.stages[1].status, "completed");
  assert.equal(result.stages[2].id, "execute-controlled-publish");
  assert.equal(result.stages[2].status, "ready");
  assert.equal(result.stages[2].humanGate, true);
  assert.equal(result.nextAction.command, "npx power-ai-skills execute-release-publish --confirm --json");
  assert.equal(result.orchestrationContract.executionMode, "dry-run-plan-only");
  assert.match(formatPlanReleaseOrchestrationMessage(result), /ready-for-controlled-publish/);
});

test("planReleaseOrchestration blocks when required release artifacts are missing", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);

  const service = createService(context);
  const result = service.planReleaseOrchestration();

  assert.equal(result.status, "blocked");
  assert.equal(result.stages[0].status, "blocked");
  assert.equal(result.blockers.some((item) => item.code === "automation-report-missing"), true);
  assert.equal(result.nextAction.kind, "refresh-release-artifacts");
  assert.equal(result.nextAction.command, "pnpm refresh:release-artifacts");
});

test("planReleaseOrchestration treats a failed real publish as blocked follow-up work", (t) => {
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
      releasePublishRecordPath: path.join(manifestDir, "release-publish-record.json"),
      releasePublishFailureSummaryPath: path.join(manifestDir, "release-publish-failure-summary.md")
    },
    publishExecutionSummary: {
      executionId: "release_publish_20260428150000000",
      recordedAt: "2026-04-28T15:00:00.000Z",
      status: "publish-failed",
      executionMode: "manifest-recorded-publish",
      realPublishEnabled: true,
      publishAttempted: true,
      publishSucceeded: false,
      failureSummaryPresent: true,
      failurePrimaryReason: "mock registry rejected publish",
      recordPath: path.join(manifestDir, "release-publish-record.json"),
      recordPathRelative: "manifest/release-publish-record.json",
      nextAction: {
        kind: "review-publish-failure",
        command: "",
        reason: "The controlled execution reached the real npm publish step, but the publish command failed and must be reviewed before retrying."
      }
    }
  });

  const service = createService(context);
  const result = service.planReleaseOrchestration();

  assert.equal(result.status, "blocked");
  assert.equal(result.stages[2].status, "blocked");
  assert.equal(result.blockers.some((item) => item.code === "publish-command-failed"), true);
  assert.equal(result.nextAction.kind, "review-publish-failure");
  assert.match(formatPlanReleaseOrchestrationMessage(result), /review-publish-failure|blocked/);
});

test("planReleaseOrchestration reports post-publish follow-up once controlled publish succeeded", (t) => {
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

  const service = createService(context);
  const result = service.planReleaseOrchestration();

  assert.equal(result.status, "published-awaiting-follow-up");
  assert.equal(result.stages[2].status, "completed");
  assert.equal(result.stages[3].status, "ready");
  assert.equal(result.nextAction.kind, "post-publish-follow-up");
  assert.equal(result.nextAction.command, "npx power-ai-skills generate-upgrade-summary --json");
});

test("planReleaseOrchestration is limited to package-maintenance mode from the package root", () => {
  const context = createRuntimeContext(import.meta.url);
  const releasePublishPlannerService = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  const service = createReleaseOrchestrationPlannerService({
    context,
    projectRoot: path.join(context.packageRoot, "docs"),
    releasePublishPlannerService
  });

  assert.throws(
    () => service.planReleaseOrchestration(),
    /plan-release-orchestration is only available in package-maintenance mode from the package root\./
  );
});
