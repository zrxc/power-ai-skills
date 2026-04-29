import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createReleasePublishPlannerService } from "../src/release-publish-planner.mjs";
import { createReleaseOrchestrationPlannerService } from "../src/release-orchestration-planner.mjs";
import { createReleaseUnattendedGovernancePlannerService } from "../src/release-unattended-governance-planner.mjs";
import { createReleaseUnattendedAuthorizationService } from "../src/release-unattended-authorization-service.mjs";
import { writeJson } from "../src/shared/fs.mjs";

function createTempManifestRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-release-unattended-authorization-"));
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
}

function createExistingAuthorization({
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
  const recordPath = path.join(manifestDir, "release-unattended-authorization.json");
  const payload = {
    authorizationId: "release_unattended_auth_20260428121000000",
    authorizedAt: "2026-04-28T12:10:00.000Z",
    status: "active",
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
      expiresAt: "2026-04-29T12:00:00.000Z",
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
    audit: {
      historicalRecordPath
    },
    historicalRecordPath,
    recordPath
  };
  writeJson(recordPath, payload);
  writeJson(historicalRecordPath, payload);
}

function createServices(context, nowProvider = () => new Date("2026-04-29T12:00:00.000Z")) {
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
  const releaseUnattendedAuthorizationService = createReleaseUnattendedAuthorizationService({
    context,
    projectRoot: context.packageRoot,
    releasePublishPlannerService,
    releaseUnattendedGovernancePlannerService,
    nowProvider
  });

  return {
    releasePublishPlannerService,
    releaseOrchestrationPlannerService,
    releaseUnattendedGovernancePlannerService,
    releaseUnattendedAuthorizationService
  };
}

test("authorizeReleaseUnattendedGovernance creates a new authorization record and updates version summary", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });
  const services = createServices(context);

  const result = services.releaseUnattendedAuthorizationService.authorizeReleaseUnattendedGovernance({
    actorId: "bob",
    actorName: "Bob",
    reason: "Ready for unattended release window.",
    expiresAt: "2026-04-30T12:00:00.000Z"
  });
  const authorizationRecord = JSON.parse(fs.readFileSync(path.join(manifestDir, "release-unattended-authorization.json"), "utf8"));
  const versionRecord = JSON.parse(fs.readFileSync(path.join(manifestDir, "version-record.json"), "utf8"));

  assert.equal(result.status, "authorized");
  assert.equal(result.authorized, true);
  assert.equal(result.governanceStatus, "not-authorized");
  assert.equal(authorizationRecord.status, "active");
  assert.equal(authorizationRecord.authorizedBy.actorId, "bob");
  assert.equal(authorizationRecord.reason, "Ready for unattended release window.");
  assert.equal(authorizationRecord.targetPublish.packageName, context.packageJson.name);
  assert.equal(versionRecord.releaseUnattendedAuthorizationSummary.status, "active");
  assert.equal(versionRecord.releaseUnattendedAuthorizationSummary.authorizationId, authorizationRecord.authorizationId);
});

test("authorizeReleaseUnattendedGovernance supersedes the previous active authorization", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version
  });
  const services = createServices(context, () => new Date("2026-04-29T13:00:00.000Z"));
  const publishPlan = services.releasePublishPlannerService.planReleasePublish();
  const orchestrationPlan = services.releaseOrchestrationPlannerService.planReleaseOrchestration();
  createExistingAuthorization({
    manifestDir,
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    targetPublish: publishPlan.targetPublish,
    orchestrationExecutionId: orchestrationPlan.releaseOrchestrationSummary.executionId
  });

  const result = services.releaseUnattendedAuthorizationService.authorizeReleaseUnattendedGovernance({
    actorId: "carol"
  });
  const activeAuthorization = JSON.parse(fs.readFileSync(path.join(manifestDir, "release-unattended-authorization.json"), "utf8"));
  const supersededAuthorization = JSON.parse(fs.readFileSync(
    path.join(manifestDir, "release-unattended-authorizations", "release_unattended_auth_20260428121000000.json"),
    "utf8"
  ));

  assert.equal(result.status, "authorized");
  assert.equal(result.supersededAuthorization.authorizationId, "release_unattended_auth_20260428121000000");
  assert.equal(activeAuthorization.status, "active");
  assert.notEqual(activeAuthorization.authorizationId, "release_unattended_auth_20260428121000000");
  assert.equal(activeAuthorization.audit.supersedesAuthorizationId, "release_unattended_auth_20260428121000000");
  assert.equal(supersededAuthorization.status, "superseded");
  assert.equal(supersededAuthorization.audit.supersededByAuthorizationId, activeAuthorization.authorizationId);
});

test("authorizeReleaseUnattendedGovernance refuses to create an authorization while warn-level release readiness still needs acknowledgement", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createReleaseSnapshot(manifestDir, {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    warnLevel: true
  });
  const services = createServices(context);

  const result = services.releaseUnattendedAuthorizationService.authorizeReleaseUnattendedGovernance({
    actorId: "dave"
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.authorized, false);
  assert.equal(result.governanceStatus, "blocked");
  assert.equal(result.blockers.some((item) => item.code === "warning-acknowledgement-required"), true);
  assert.equal(fs.existsSync(path.join(manifestDir, "release-unattended-authorization.json")), false);
});
