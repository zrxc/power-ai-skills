import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createReleasePublishPlannerService } from "../src/release-publish-planner.mjs";
import { createReleaseOrchestrationPlannerService } from "../src/release-orchestration-planner.mjs";
import { createReleaseUnattendedGovernancePlannerService } from "../src/release-unattended-governance-planner.mjs";
import { writeJson } from "../src/shared/fs.mjs";

function createTempManifestRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-release-unattended-governance-"));
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

function createReleaseSnapshot(manifestDir, { packageName, version, warnLevel = false } = {}) {
  const notificationsDir = path.join(manifestDir, "notifications");
  const notificationJsonPath = path.join(notificationsDir, "upgrade-payload-20260428-120000.json");
  const releaseGateStatus = warnLevel ? "warn" : "pass";
  const warningGates = warnLevel ? 1 : 0;

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
    overallStatus: releaseGateStatus,
    summary: {
      warningGates,
      blockingIssues: 0
    }
  });
  writeJson(path.join(manifestDir, "governance-operations-report.json"), {
    packageName,
    version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    summary: {
      releaseGateStatus,
      releaseGateWarnings: warningGates,
      blockingIssues: 0
    },
    releaseReadiness: {
      releaseGateStatus,
      warningGates,
      blockingIssues: 0,
      canPublish: true,
      broadRolloutReady: !warnLevel,
      requiresExplicitAcknowledgement: warnLevel
    }
  });
  writeJson(path.join(manifestDir, "upgrade-advice-package.json"), {
    packageName,
    version,
    generatedAt: "2026-04-28T12:00:00.000Z",
    blocked: false,
    summary: {
      releaseGateWarnings: warningGates,
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

function createAuthorizationRecord({
  manifestDir,
  packageName,
  version,
  targetPublish,
  orchestrationExecutionId = "release_orchestration_20260428120000000",
  expiresAt = "2026-05-29T12:00:00.000Z",
  status = "active"
}) {
  const recordPath = path.join(manifestDir, "release-unattended-authorization.json");
  writeJson(recordPath, {
    authorizationId: "release_unattended_auth_20260428121000000",
    authorizedAt: "2026-04-28T12:10:00.000Z",
    status,
    packageName,
    version,
    packageRoot: "package-root",
    projectRoot: "project-root",
    targetPublish,
    authorizedBy: {
      actorType: "maintainer",
      actorId: "alice",
      displayName: "Alice"
    },
    constraints: {
      expiresAt,
      maxExecutionCount: 1,
      allowWarnGate: false,
      requireNoPendingFollowUp: true,
      requirePlannerEligible: true,
      requireOrchestrationReady: true
    },
    evidenceSnapshot: {
      releaseOrchestrationExecutionId: orchestrationExecutionId
    },
    consumption: {
      consumed: false
    },
    recordPath
  });
  return recordPath;
}

function createService(context) {
  const releasePublishPlannerService = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  const releaseOrchestrationPlannerService = createReleaseOrchestrationPlannerService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService
  });

  return createReleaseUnattendedGovernancePlannerService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService,
    releaseOrchestrationPlannerService
  });
}

test("planReleaseUnattendedGovernance returns not-authorized when release is ready but no authorization exists", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });
  const service = createService(context);

  const result = service.planReleaseUnattendedGovernance();

  assert.equal(result.status, "not-authorized");
  assert.equal(result.authorization.present, false);
  assert.equal(result.blockers.some((item) => item.code === "authorization-missing"), true);
  assert.equal(result.releaseUnattendedGovernanceSummary.status, "not-authorized");
});

test("planReleaseUnattendedGovernance returns authorized-ready for a valid authorization and eligible release", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });
  const service = createService(context);
  const firstPlan = service.planReleaseUnattendedGovernance();
  createAuthorizationRecord({
    manifestDir,
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    targetPublish: firstPlan.evidence.publishExecutionSummary ? {} : {
      ...createReleasePublishPlannerService({
        context,
        projectRoot: context.packageRoot
      }).planReleasePublish().targetPublish
    },
    orchestrationExecutionId: firstPlan.evidence.releaseOrchestrationSummary.executionId
  });

  const result = service.planReleaseUnattendedGovernance();

  assert.equal(result.status, "authorized-ready");
  assert.equal(result.authorization.present, true);
  assert.equal(result.authorization.status, "active");
  assert.equal(result.governanceDecision.canRunUnattended, true);
  assert.equal(result.releaseUnattendedGovernanceSummary.authorizationPresent, true);
});

test("planReleaseUnattendedGovernance blocks warn-level releases from unattended execution even with authorization", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    warnLevel: true
  });
  const service = createService(context);
  const publishPlan = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  }).planReleasePublish();
  const orchestrationPlan = createReleaseOrchestrationPlannerService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService: createReleasePublishPlannerService({
      context,
      projectRoot: context.packageRoot
    })
  }).planReleaseOrchestration();
  createAuthorizationRecord({
    manifestDir,
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    targetPublish: publishPlan.targetPublish,
    orchestrationExecutionId: orchestrationPlan.releaseOrchestrationSummary.executionId
  });

  const result = service.planReleaseUnattendedGovernance();

  assert.equal(result.status, "blocked");
  assert.equal(result.blockers.some((item) => item.code === "warning-acknowledgement-required"), true);
  assert.equal(result.governanceDecision.canRunUnattended, false);
});

test("planReleaseUnattendedGovernance locks unattended execution after a failed real publish", (t) => {
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

  const result = service.planReleaseUnattendedGovernance();

  assert.equal(result.status, "execution-locked");
  assert.equal(result.blockers.some((item) => item.code === "publish-failed-lock"), true);
  assert.equal(result.governanceDecision.lockState, "execution-locked");
  assert.equal(result.nextAction.kind, "review-publish-failure");
});

test("planReleaseUnattendedGovernance blocks unattended execution while post-publish follow-up remains pending", (t) => {
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

  const result = service.planReleaseUnattendedGovernance();

  assert.equal(result.status, "follow-up-blocked");
  assert.equal(result.blockers.some((item) => item.code === "follow-up-pending"), true);
  assert.equal(result.governanceDecision.lockState, "follow-up-blocked");
  assert.equal(result.nextAction.kind, "review-post-publish-follow-up");
});

test("planReleaseUnattendedGovernance expires authorizations when the release version changes", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });
  const publishPlan = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  }).planReleasePublish();
  const orchestrationPlan = createReleaseOrchestrationPlannerService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService: createReleasePublishPlannerService({
      context,
      projectRoot: context.packageRoot
    })
  }).planReleaseOrchestration();
  createAuthorizationRecord({
    manifestDir,
    packageName: context.packageJson.name,
    version: "0.0.0",
    targetPublish: publishPlan.targetPublish,
    orchestrationExecutionId: orchestrationPlan.releaseOrchestrationSummary.executionId
  });
  const service = createService(context);

  const result = service.planReleaseUnattendedGovernance();

  assert.equal(result.status, "authorization-expired");
  assert.equal(result.blockers.some((item) => item.code === "authorization-invalidated"), true);
});
