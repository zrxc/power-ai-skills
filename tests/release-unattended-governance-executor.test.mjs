import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createReleasePublishPlannerService } from "../src/release-publish-planner.mjs";
import { createReleaseOrchestrationPlannerService } from "../src/release-orchestration-planner.mjs";
import { createReleaseUnattendedGovernancePlannerService } from "../src/release-unattended-governance-planner.mjs";
import { createReleaseUnattendedGovernanceExecutorService } from "../src/release-unattended-governance-executor.mjs";
import { writeJson } from "../src/shared/fs.mjs";

function createTempManifestRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-release-unattended-governance-executor-"));
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

function createAuthorizationRecord({
  manifestDir,
  packageName,
  version,
  targetPublish,
  orchestrationExecutionId
}) {
  const historicalRecordPath = path.join(
    manifestDir,
    "release-unattended-authorizations",
    "release_unattended_auth_20260428121000000.json"
  );
  const payload = {
    authorizationId: "release_unattended_auth_20260428121000000",
    authorizedAt: "2026-04-28T12:10:00.000Z",
    status: "active",
    packageName,
    version,
    targetPublish,
    constraints: {
      expiresAt: "2026-05-29T12:00:00.000Z",
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
    historicalRecordPath,
    audit: {
      historicalRecordPath
    }
  };
  writeJson(path.join(manifestDir, "release-unattended-authorization.json"), payload);
  writeJson(historicalRecordPath, payload);
}

function createServices(context) {
  const releasePublishPlannerService = createReleasePublishPlannerService({
    context,
    projectRoot: context.packageRoot
  });
  const releaseOrchestrationPlannerService = createReleaseOrchestrationPlannerService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService
  });
  const releaseUnattendedGovernancePlannerService = createReleaseUnattendedGovernancePlannerService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService,
    releaseOrchestrationPlannerService
  });

  return {
    releasePublishPlannerService,
    releaseOrchestrationPlannerService,
    releaseUnattendedGovernancePlannerService
  };
}

test("executeReleaseUnattendedGovernance delegates to publish executor when authorization is ready and consumes authorization after success", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });
  const services = createServices(context);
  const publishPlan = services.releasePublishPlannerService.planReleasePublish();
  const orchestrationPlan = services.releaseOrchestrationPlannerService.planReleaseOrchestration();
  createAuthorizationRecord({
    manifestDir,
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    targetPublish: publishPlan.targetPublish,
    orchestrationExecutionId: orchestrationPlan.releaseOrchestrationSummary.executionId
  });

  let publishCallCount = 0;
  const service = createReleaseUnattendedGovernanceExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseUnattendedGovernancePlannerService: services.releaseUnattendedGovernancePlannerService,
    releasePublishExecutorService: {
      executeReleasePublish() {
        publishCallCount += 1;
        return {
          status: "published",
          nextAction: {
            kind: "publish-complete",
            command: "",
            reason: "mock publish complete"
          },
          blockers: [],
          publishExecutionSnapshot: {
            executionId: "release_publish_20260428153000000",
            recordPath: path.join(manifestDir, "release-publish-record.json")
          }
        };
      }
    }
  });

  const result = service.executeReleaseUnattendedGovernance();
  const authorizationRecord = JSON.parse(fs.readFileSync(path.join(manifestDir, "release-unattended-authorization.json"), "utf8"));
  const versionRecord = JSON.parse(fs.readFileSync(path.join(manifestDir, "version-record.json"), "utf8"));

  assert.equal(publishCallCount, 1);
  assert.equal(result.status, "published");
  assert.equal(result.publishExecuted, true);
  assert.equal(result.authorizationConsumed, true);
  assert.equal(authorizationRecord.status, "consumed");
  assert.equal(authorizationRecord.consumption.consumed, true);
  assert.equal(authorizationRecord.consumption.publishExecutionId, "release_publish_20260428153000000");
  assert.equal(versionRecord.releaseUnattendedAuthorizationSummary.status, "consumed");
});

test("executeReleaseUnattendedGovernance does not call publish executor when authorization is missing", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });
  const services = createServices(context);

  let publishCallCount = 0;
  const service = createReleaseUnattendedGovernanceExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseUnattendedGovernancePlannerService: services.releaseUnattendedGovernancePlannerService,
    releasePublishExecutorService: {
      executeReleasePublish() {
        publishCallCount += 1;
        return {};
      }
    }
  });

  const result = service.executeReleaseUnattendedGovernance();

  assert.equal(result.status, "not-authorized");
  assert.equal(result.publishExecuted, false);
  assert.equal(publishCallCount, 0);
});

test("executeReleaseUnattendedGovernance does not call publish executor when governance is execution-locked", (t) => {
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
      recordPath: path.join(manifestDir, "release-publish-record.json"),
      nextAction: {
        kind: "review-publish-failure",
        command: "",
        reason: "mock publish failure"
      }
    }
  });
  const services = createServices(context);

  let publishCallCount = 0;
  const service = createReleaseUnattendedGovernanceExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseUnattendedGovernancePlannerService: services.releaseUnattendedGovernancePlannerService,
    releasePublishExecutorService: {
      executeReleasePublish() {
        publishCallCount += 1;
        return {};
      }
    }
  });

  const result = service.executeReleaseUnattendedGovernance();

  assert.equal(result.status, "execution-locked");
  assert.equal(result.publishExecuted, false);
  assert.equal(publishCallCount, 0);
});

test("executeReleaseUnattendedGovernance preserves authorization when delegated publish fails", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });
  const services = createServices(context);
  const publishPlan = services.releasePublishPlannerService.planReleasePublish();
  const orchestrationPlan = services.releaseOrchestrationPlannerService.planReleaseOrchestration();
  createAuthorizationRecord({
    manifestDir,
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    targetPublish: publishPlan.targetPublish,
    orchestrationExecutionId: orchestrationPlan.releaseOrchestrationSummary.executionId
  });

  const service = createReleaseUnattendedGovernanceExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseUnattendedGovernancePlannerService: services.releaseUnattendedGovernancePlannerService,
    releasePublishExecutorService: {
      executeReleasePublish() {
        return {
          status: "publish-failed",
          nextAction: {
            kind: "review-publish-failure",
            command: "",
            reason: "mock publish failed"
          },
          blockers: [
            {
              code: "publish-command-failed",
              message: "mock publish failed"
            }
          ],
          publishExecutionSnapshot: {
            executionId: "release_publish_20260428153100000",
            recordPath: path.join(manifestDir, "release-publish-record.json")
          }
        };
      }
    }
  });

  const result = service.executeReleaseUnattendedGovernance();
  const authorizationRecord = JSON.parse(fs.readFileSync(path.join(manifestDir, "release-unattended-authorization.json"), "utf8"));

  assert.equal(result.status, "publish-failed");
  assert.equal(result.publishExecuted, true);
  assert.equal(result.authorizationConsumed, false);
  assert.equal(authorizationRecord.status, "active");
  assert.equal(authorizationRecord.consumption.consumed, false);
});
