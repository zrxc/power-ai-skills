import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyDir } from "../src/shared/fs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wrapperScriptPath = path.join(root, "scripts", "run-release-unattended-hosted.mjs");

function runWrapper(args = [], env = {}) {
  return spawnSync(process.execPath, [wrapperScriptPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env
    }
  });
}

function createTempManifestSnapshot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-hosted-wrapper-"));
  const manifestRoot = path.join(tempRoot, "manifest");
  copyDir(path.join(root, "manifest"), manifestRoot);

  const versionRecordPath = path.join(manifestRoot, "version-record.json");
  if (fs.existsSync(versionRecordPath)) {
    const versionRecord = JSON.parse(fs.readFileSync(versionRecordPath, "utf8"));
    const authorizationPath = versionRecord.artifacts?.releaseUnattendedAuthorizationPath || path.join(manifestRoot, "release-unattended-authorization.json");
    if (authorizationPath && fs.existsSync(authorizationPath)) {
      fs.rmSync(authorizationPath, { force: true });
    }
    delete versionRecord.releaseUnattendedAuthorizationSummary;
    delete versionRecord.artifacts?.releaseUnattendedAuthorizationPath;
    fs.writeFileSync(versionRecordPath, `${JSON.stringify(versionRecord, null, 2)}\n`, "utf8");
  }

  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return manifestRoot;
}

function forceLatestPublishFailureLock(manifestRoot) {
  const versionRecordPath = path.join(manifestRoot, "version-record.json");
  const versionRecord = JSON.parse(fs.readFileSync(versionRecordPath, "utf8"));
  versionRecord.artifacts = {
    ...(versionRecord.artifacts || {}),
    releasePublishRecordPath: path.join(manifestRoot, "release-publish-record.json"),
    releasePublishFailureSummaryPath: path.join(manifestRoot, "release-publish-failure-summary.md")
  };
  versionRecord.publishExecutionSummary = {
    executionId: "release_publish_20260507123000000",
    recordedAt: "2026-05-07T12:30:00.000Z",
    status: "publish-failed",
    executionMode: "manifest-recorded-publish",
    realPublishEnabled: true,
    publishAttempted: true,
    publishSucceeded: false,
    failureSummaryPresent: true,
    recordPath: path.join(manifestRoot, "release-publish-record.json"),
    nextAction: {
      kind: "review-publish-failure",
      command: "",
      reason: "mock publish failure"
    }
  };
  fs.writeFileSync(versionRecordPath, `${JSON.stringify(versionRecord, null, 2)}\n`, "utf8");
}

test("run-release-unattended-hosted surfaces missing runtime source as wrapper failure", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper([], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: ""
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "hosted-runtime-contract-failed");
  assert.equal(payload.wrapper.runtimeSourceResolution, "unresolved");
  assert.equal(payload.hostedExecution.status, "hosted-runtime-source-required");
});

test("run-release-unattended-hosted infers ci runtime and keeps governance blockers non-fatal by default", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper(["--require-manual-trigger"], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true",
    CI_COMMIT_TAG: "v1.4.7",
    CI_JOB_MANUAL: "true",
    GITHUB_RUN_ID: "wrapper-ci-123",
    GITHUB_WORKFLOW: "hosted-wrapper-test"
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.wrapper.runtimeSource, "ci");
  assert.equal(payload.wrapper.runtimeSourceResolution, "env:CI");
  assert.equal(payload.wrapper.scheduleContract.contractType, "ci");
  assert.equal(payload.wrapper.scheduleContract.allowed, true);
  assert.equal(payload.wrapper.scheduleContract.status, "ci-release-contract-allowed");
  assert.equal(payload.wrapper.ciReleaseContract.allowed, true);
  assert.equal(payload.wrapper.finalStatusPolicy.status, "not-authorized");
  assert.equal(payload.wrapper.finalStatusPolicy.classification, "record-only");
  assert.equal(payload.wrapper.finalStatusPolicy.shouldFailByDefault, false);
  assert.equal(payload.wrapper.ciReleaseContract.manualTriggerRequired, true);
  assert.equal(payload.wrapper.ciReleaseContract.manualTriggerEvidence.present, true);
  assert.equal(payload.hostedExecution.runtimeSource, "ci");
  assert.equal(payload.hostedExecution.trigger.triggerId, "wrapper-ci-123");
  assert.equal(payload.hostedExecution.publishExecuted, false);
});

test("run-release-unattended-hosted supports expect-status for hosted release jobs", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper(["--expect-status", "published"], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true",
    CI_COMMIT_TAG: "v1.4.7"
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "unexpected-final-status");
  assert.equal(payload.wrapper.scheduleContract.contractType, "ci");
  assert.equal(payload.wrapper.finalStatusPolicy.classification, "expected-status-override");
  assert.notEqual(payload.hostedExecution.status, "published");
});

test("run-release-unattended-hosted strict mode auto-requires manual trigger for ci", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper(["--strict"], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true",
    CI_COMMIT_TAG: "v1.4.7",
    CI_JOB_MANUAL: ""
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "hosted-schedule-contract-failed");
  assert.equal(payload.wrapper.policy.mode, "strict");
  assert.equal(payload.wrapper.policy.strictMode, true);
  assert.equal(payload.wrapper.policy.requireManualTrigger, true);
  assert.equal(payload.wrapper.policy.requireManualTriggerSource, "strict-default");
  assert.deepEqual(payload.wrapper.policy.expectedStatuses, ["published"]);
  assert.equal(payload.wrapper.policy.expectedStatusesSource, "strict-default");
  assert.equal(payload.wrapper.scheduleContract.contractType, "ci");
  assert.equal(payload.wrapper.scheduleContract.allowed, false);
  assert.equal(payload.wrapper.ciReleaseContract.manualTriggerRequired, true);
  assert.equal(payload.wrapper.ciReleaseContract.blockers.some((item) => item.code === "hosted-release-manual-trigger-required"), true);
});

test("run-release-unattended-hosted fails by default when governance is execution-locked", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  forceLatestPublishFailureLock(manifestRoot);
  const result = runWrapper([], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true",
    CI_COMMIT_TAG: "v1.4.7"
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "default-final-status-failed");
  assert.equal(payload.wrapper.scheduleContract.contractType, "ci");
  assert.equal(payload.wrapper.finalStatusPolicy.status, "execution-locked");
  assert.equal(payload.wrapper.finalStatusPolicy.classification, "failure-lock");
  assert.equal(payload.wrapper.finalStatusPolicy.shouldFailByDefault, true);
  assert.equal(payload.hostedExecution.status, "execution-locked");
});

test("run-release-unattended-hosted strict mode auto-expects published for cron", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper(["--strict"], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "1",
    POWER_AI_RELEASE_TRIGGER_LABEL: "nightly-release-window",
    CI: ""
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "unexpected-final-status");
  assert.equal(payload.wrapper.policy.mode, "strict");
  assert.equal(payload.wrapper.policy.strictMode, true);
  assert.equal(payload.wrapper.policy.requireManualTrigger, false);
  assert.equal(payload.wrapper.policy.requireManualTriggerSource, "default");
  assert.deepEqual(payload.wrapper.policy.expectedStatuses, ["published"]);
  assert.equal(payload.wrapper.policy.expectedStatusesSource, "strict-default");
  assert.equal(payload.wrapper.scheduleContract.contractType, "cron");
  assert.equal(payload.wrapper.scheduleContract.allowed, true);
  assert.equal(payload.hostedExecution.status, "not-authorized");
});

test("run-release-unattended-hosted infers cron runtime and requires explicit trigger labeling", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper([], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "1",
    POWER_AI_RELEASE_TRIGGER_LABEL: "nightly-release-window",
    CI: ""
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.wrapper.runtimeSource, "cron");
  assert.equal(payload.wrapper.runtimeSourceResolution, "env:POWER_AI_RELEASE_CRON");
  assert.equal(payload.wrapper.scheduleContract.contractType, "cron");
  assert.equal(payload.wrapper.scheduleContract.allowed, true);
  assert.equal(payload.wrapper.scheduleContract.status, "cron-release-contract-allowed");
  assert.equal(payload.wrapper.cronReleaseContract.allowed, true);
  assert.equal(payload.wrapper.cronReleaseContract.explicitTriggerLabelEvidence.present, true);
  assert.equal(payload.wrapper.cronReleaseContract.explicitTriggerLabelEvidence.source, "env:POWER_AI_RELEASE_TRIGGER_LABEL");
  assert.equal(payload.hostedExecution.runtimeSource, "cron");
  assert.equal(payload.hostedExecution.trigger.triggerLabel, "nightly-release-window");
  assert.equal(payload.hostedExecution.publishExecuted, false);
});

test("run-release-unattended-hosted blocks ci release without explicit enable flag", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper([], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true",
    CI_COMMIT_TAG: "v1.4.7",
    POWER_AI_ENABLE_HOSTED_RELEASE: ""
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "hosted-schedule-contract-failed");
  assert.equal(payload.wrapper.scheduleContract.contractType, "ci");
  assert.equal(payload.wrapper.scheduleContract.allowed, false);
  assert.equal(payload.wrapper.ciReleaseContract.allowed, false);
  assert.equal(payload.wrapper.ciReleaseContract.blockers.some((item) => item.code === "hosted-release-not-enabled"), true);
  assert.equal(typeof payload.hostedExecution, "undefined");
});

test("run-release-unattended-hosted blocks ci release without tag evidence", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper([], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true",
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    CI_COMMIT_TAG: ""
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "hosted-schedule-contract-failed");
  assert.equal(payload.wrapper.scheduleContract.contractType, "ci");
  assert.equal(payload.wrapper.scheduleContract.allowed, false);
  assert.equal(payload.wrapper.ciReleaseContract.allowed, false);
  assert.equal(payload.wrapper.ciReleaseContract.blockers.some((item) => item.code === "hosted-release-tag-required"), true);
});

test("run-release-unattended-hosted blocks ci release when manual trigger is required but missing", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper(["--require-manual-trigger"], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true",
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    CI_COMMIT_TAG: "v1.4.7",
    CI_JOB_MANUAL: ""
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "hosted-schedule-contract-failed");
  assert.equal(payload.wrapper.scheduleContract.contractType, "ci");
  assert.equal(payload.wrapper.scheduleContract.allowed, false);
  assert.equal(payload.wrapper.ciReleaseContract.allowed, false);
  assert.equal(payload.wrapper.ciReleaseContract.blockers.some((item) => item.code === "hosted-release-manual-trigger-required"), true);
});

test("run-release-unattended-hosted blocks cron release without explicit enable flag", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper([], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "1",
    POWER_AI_RELEASE_TRIGGER_LABEL: "nightly-release-window",
    POWER_AI_ENABLE_HOSTED_RELEASE: ""
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "hosted-schedule-contract-failed");
  assert.equal(payload.wrapper.scheduleContract.contractType, "cron");
  assert.equal(payload.wrapper.scheduleContract.allowed, false);
  assert.equal(payload.wrapper.cronReleaseContract.allowed, false);
  assert.equal(payload.wrapper.cronReleaseContract.blockers.some((item) => item.code === "hosted-release-not-enabled"), true);
  assert.equal(typeof payload.hostedExecution, "undefined");
});

test("run-release-unattended-hosted blocks cron release without explicit trigger label", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper([], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "1",
    POWER_AI_ENABLE_HOSTED_RELEASE: "1",
    POWER_AI_RELEASE_TRIGGER_LABEL: ""
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "hosted-schedule-contract-failed");
  assert.equal(payload.wrapper.scheduleContract.contractType, "cron");
  assert.equal(payload.wrapper.scheduleContract.allowed, false);
  assert.equal(payload.wrapper.cronReleaseContract.allowed, false);
  assert.equal(payload.wrapper.cronReleaseContract.blockers.some((item) => item.code === "hosted-release-cron-trigger-label-required"), true);
});
