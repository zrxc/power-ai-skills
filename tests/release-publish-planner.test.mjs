import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createReleasePublishPlannerService } from "../src/release-publish-planner.mjs";
import { writeJson } from "../src/shared/fs.mjs";

function createTempManifestRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-release-publish-planner-"));
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

  return {
    notificationJsonPath
  };
}

test("planReleasePublish returns an eligible dry-run plan for a consistent release snapshot", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  const service = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  const result = service.planReleasePublish();

  assert.equal(result.status, "eligible");
  assert.deepEqual(result.blockers, []);
  assert.equal(result.targetPublish.packageName, context.packageJson.name);
  assert.equal(result.targetPublish.version, context.packageJson.version);
  assert.equal(result.targetPublish.registryUrl, context.packageJson.publishConfig.registry);
  assert.equal(result.manualConfirmation.mode, "package-maintainer-manual");
  assert.equal(result.manualConfirmation.commands.at(-1), result.targetPublish.publishCommand);
  assert.equal(result.evidence.publishExecutionSummary, null);
  assert.equal(
    result.evidence.artifacts.notificationJsonPath.endsWith("manifest/notifications/upgrade-payload-20260428-120000.json"),
    true
  );
});

test("planReleasePublish blocks mismatched or failed release evidence", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  const service = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  const { notificationJsonPath } = createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  writeJson(path.join(manifestDir, "version-record.json"), {
    packageName: context.packageJson.name,
    version: "0.0.0",
    recordedAt: "2026-04-28T12:00:00.000Z",
    artifacts: {
      notificationJsonPath
    }
  });
  writeJson(path.join(manifestDir, "release-gate-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    overallStatus: "fail",
    summary: {
      warningGates: 0,
      blockingIssues: 2
    }
  });
  writeJson(path.join(manifestDir, "governance-operations-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    summary: {
      releaseGateStatus: "fail",
      releaseGateWarnings: 0,
      blockingIssues: 2
    },
    releaseReadiness: {
      releaseGateStatus: "fail",
      warningGates: 0,
      blockingIssues: 2,
      canPublish: false,
      broadRolloutReady: false,
      requiresExplicitAcknowledgement: false
    }
  });
  writeJson(path.join(manifestDir, "upgrade-advice-package.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    blocked: true,
    summary: {
      releaseGateWarnings: 0,
      blockingCheckCount: 1
    }
  });

  const result = service.planReleasePublish();
  const blockerCodes = result.blockers.map((item) => item.code);

  assert.equal(result.status, "blocked");
  assert.equal(blockerCodes.includes("version-record-version-mismatch"), true);
  assert.equal(blockerCodes.includes("release-gate-status-not-allowed"), true);
  assert.equal(blockerCodes.includes("release-readiness-blocked"), true);
  assert.equal(blockerCodes.includes("upgrade-advice-blocked"), true);
});

test("planReleasePublish keeps warn-level releases eligible but requires explicit acknowledgement", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  const service = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  writeJson(path.join(manifestDir, "release-gate-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    overallStatus: "warn",
    summary: {
      warningGates: 1,
      blockingIssues: 0
    }
  });
  writeJson(path.join(manifestDir, "governance-operations-report.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    generatedAt: "2026-04-28T12:00:00.000Z",
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

  const result = service.planReleasePublish();

  assert.equal(result.status, "eligible");
  assert.equal(result.evidence.publishReadiness.requiresExplicitAcknowledgement, true);
  assert.match(result.manualConfirmation.notes[0], /explicit acknowledgement/i);
});

test("planReleasePublish reuses publishExecutionSummary from version-record evidence", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  const service = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  const { notificationJsonPath } = createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });

  writeJson(path.join(manifestDir, "version-record.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    recordedAt: "2026-04-28T12:00:00.000Z",
    artifacts: {
      notificationJsonPath,
      releasePublishRecordPath: path.join(manifestDir, "release-publish-record.json"),
      releasePublishFailureSummaryPath: path.join(manifestDir, "release-publish-failure-summary.md")
    },
    publishExecutionSummary: {
      executionId: "release_publish_20260428123000000",
      recordedAt: "2026-04-28T12:30:00.000Z",
      status: "confirmation-required",
      executionMode: "manifest-recorded-skeleton",
      publishAttempted: false,
      publishSucceeded: false,
      wouldExecuteCommand: "npm publish --registry \"https://registry.npmjs.org/\"",
      commandFlags: {
        confirm: false,
        acknowledgeWarnings: false
      },
      plannerStatus: "eligible",
      plannerBlockerCount: 0,
      plannerBlockers: [],
      releaseGateStatus: "pass",
      requiresExplicitAcknowledgement: false,
      failureSummaryPresent: true,
      failurePrimaryReason: "Planner re-check passed, but real publish remains disabled until explicit confirmation is provided.",
      recordPath: path.join(manifestDir, "release-publish-record.json"),
      recordPathRelative: "manifest/release-publish-record.json",
      historicalRecordPath: path.join(manifestDir, "release-publish-records", "release_publish_20260428123000000.json"),
      historicalRecordPathRelative: "manifest/release-publish-records/release_publish_20260428123000000.json",
      failureSummaryPath: path.join(manifestDir, "release-publish-failure-summary.md"),
      failureSummaryPathRelative: "manifest/release-publish-failure-summary.md"
    }
  });

  const result = service.planReleasePublish();

  assert.equal(result.status, "eligible");
  assert.equal(result.evidence.publishExecutionSummary.status, "confirmation-required");
  assert.equal(result.evidence.publishExecutionSummary.failureSummaryPresent, true);
  assert.equal(
    result.evidence.publishExecutionSummary.recordPath,
    path.join(manifestDir, "release-publish-record.json")
  );
});

test("planReleasePublish is limited to package-maintenance mode from the package root", () => {
  const context = createRuntimeContext(import.meta.url);
  const service = createReleasePublishPlannerService({
    context,
    projectRoot: path.join(context.packageRoot, "docs")
  });

  assert.throws(
    () => service.planReleasePublish(),
    /plan-release-publish is only available in package-maintenance mode from the package root\./
  );
});
