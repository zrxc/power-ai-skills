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
  const result = runWrapper([], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true",
    GITHUB_RUN_ID: "wrapper-ci-123",
    GITHUB_WORKFLOW: "hosted-wrapper-test"
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.wrapper.runtimeSource, "ci");
  assert.equal(payload.wrapper.runtimeSourceResolution, "env:CI");
  assert.equal(payload.hostedExecution.runtimeSource, "ci");
  assert.equal(payload.hostedExecution.trigger.triggerId, "wrapper-ci-123");
  assert.equal(payload.hostedExecution.publishExecuted, false);
});

test("run-release-unattended-hosted supports expect-status for hosted release jobs", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const result = runWrapper(["--expect-status", "published"], {
    POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot,
    POWER_AI_RELEASE_RUNTIME_SOURCE: "",
    POWER_AI_RELEASE_CRON: "",
    CI: "true"
  });

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.wrapperStatus, "unexpected-final-status");
  assert.notEqual(payload.hostedExecution.status, "published");
});
