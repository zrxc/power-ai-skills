import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createReleaseUnattendedHostedExecutorService } from "../src/release-unattended-hosted-executor.mjs";
import { writeJson } from "../src/shared/fs.mjs";

function createTempManifestRoot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-release-unattended-hosted-executor-"));
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

function createVersionRecord(manifestDir, context) {
  writeJson(path.join(manifestDir, "version-record.json"), {
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    recordedAt: "2026-04-29T12:00:00.000Z",
    artifacts: {}
  });
}

test("executeReleaseUnattendedHosted blocks when runtime source is missing", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createVersionRecord(manifestDir, context);

  let delegatedCallCount = 0;
  const service = createReleaseUnattendedHostedExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseUnattendedGovernanceExecutorService: {
      executeReleaseUnattendedGovernance() {
        delegatedCallCount += 1;
        return {};
      }
    },
    envProvider: () => ({})
  });

  const result = service.executeReleaseUnattendedHosted();

  assert.equal(result.status, "hosted-runtime-source-required");
  assert.equal(result.publishExecuted, false);
  assert.equal(result.hostedBoundary.allowed, false);
  assert.equal(result.blockers.some((item) => item.code === "hosted-runtime-source-required"), true);
  assert.equal(delegatedCallCount, 0);
});

test("executeReleaseUnattendedHosted blocks CI mode when runtime evidence is missing", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createVersionRecord(manifestDir, context);

  let delegatedCallCount = 0;
  const service = createReleaseUnattendedHostedExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseUnattendedGovernanceExecutorService: {
      executeReleaseUnattendedGovernance() {
        delegatedCallCount += 1;
        return {};
      }
    },
    envProvider: () => ({ CI: "" })
  });

  const result = service.executeReleaseUnattendedHosted({
    runtimeSource: "ci"
  });

  assert.equal(result.status, "hosted-runtime-evidence-missing");
  assert.equal(result.blockers.some((item) => item.code === "hosted-runtime-evidence-missing"), true);
  assert.equal(delegatedCallCount, 0);
});

test("executeReleaseUnattendedHosted delegates through unattended governance when CI runtime evidence is present", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createVersionRecord(manifestDir, context);

  let delegatedCallCount = 0;
  const service = createReleaseUnattendedHostedExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseUnattendedGovernanceExecutorService: {
      executeReleaseUnattendedGovernance() {
        delegatedCallCount += 1;
        return {
          status: "published",
          governanceStatus: "authorized-ready",
          governancePlan: {
            packageName: context.packageJson.name,
            version: context.packageJson.version,
            authorization: {
              authorizationId: "release_unattended_auth_20260429120000000"
            },
            governanceContract: {
              governanceRecordPath: path.join(manifestDir, "release-unattended-governance-record.json")
            }
          },
          publishExecuted: true,
          authorizationConsumed: true,
          blockers: [],
          nextAction: {
            kind: "publish-complete",
            command: "",
            reason: "mock hosted publish complete"
          },
          publishExecution: {
            targetPublish: {
              packageName: context.packageJson.name,
              version: context.packageJson.version
            },
            publishExecutionSnapshot: {
              status: "published",
              recordPath: path.join(manifestDir, "release-publish-record.json")
            }
          }
        };
      }
    },
    envProvider: () => ({
      CI: "true",
      GITHUB_RUN_ID: "123456",
      GITHUB_WORKFLOW: "release-pipeline"
    })
  });

  const result = service.executeReleaseUnattendedHosted({
    runtimeSource: "ci"
  });
  const hostedRecord = JSON.parse(fs.readFileSync(path.join(manifestDir, "release-unattended-hosted-record.json"), "utf8"));
  const versionRecord = JSON.parse(fs.readFileSync(path.join(manifestDir, "version-record.json"), "utf8"));

  assert.equal(delegatedCallCount, 1);
  assert.equal(result.status, "published");
  assert.equal(result.runtimeSource, "ci");
  assert.equal(result.trigger.triggerId, "123456");
  assert.equal(result.trigger.triggerLabel, "release-pipeline");
  assert.equal(result.publishExecuted, true);
  assert.equal(result.authorizationConsumed, true);
  assert.equal(hostedRecord.runtimeSource, "ci");
  assert.equal(hostedRecord.trigger.triggerId, "123456");
  assert.equal(versionRecord.releaseUnattendedHostedExecutionSummary.status, "published");
  assert.equal(versionRecord.releaseUnattendedHostedExecutionSummary.runtimeSource, "ci");
});

test("executeReleaseUnattendedHosted accepts cron runtime when explicit cron signal is present", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const tempRoot = createTempManifestRoot(t);
  const manifestDir = path.join(tempRoot, "manifest");
  withReleaseManifestEnv(t, manifestDir);
  createVersionRecord(manifestDir, context);

  const service = createReleaseUnattendedHostedExecutorService({
    context,
    projectRoot: context.packageRoot,
    releaseUnattendedGovernanceExecutorService: {
      executeReleaseUnattendedGovernance() {
        return {
          status: "not-authorized",
          governanceStatus: "not-authorized",
          governancePlan: {
            packageName: context.packageJson.name,
            version: context.packageJson.version,
            authorization: {
              authorizationId: ""
            },
            governanceContract: {
              governanceRecordPath: path.join(manifestDir, "release-unattended-governance-record.json")
            }
          },
          publishExecuted: false,
          authorizationConsumed: false,
          blockers: [
            {
              code: "authorization-missing",
              message: "missing authorization"
            }
          ],
          nextAction: {
            kind: "grant-unattended-authorization",
            command: "",
            reason: "missing authorization"
          },
          publishExecution: null
        };
      }
    },
    envProvider: () => ({
      POWER_AI_RELEASE_CRON: "1",
      POWER_AI_RELEASE_TRIGGER_ID: "nightly-001",
      POWER_AI_RELEASE_TRIGGER_LABEL: "nightly-cron"
    })
  });

  const result = service.executeReleaseUnattendedHosted({
    runtimeSource: "cron"
  });

  assert.equal(result.runtimeSource, "cron");
  assert.equal(result.status, "not-authorized");
  assert.equal(result.trigger.triggerId, "nightly-001");
  assert.equal(result.trigger.triggerLabel, "nightly-cron");
  assert.equal(result.hostedBoundary.allowed, true);
});
