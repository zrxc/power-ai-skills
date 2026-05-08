import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyDir } from "../src/shared/fs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "bin", "power-ai-skills.mjs");
const fixtureRoot = path.join(root, "tests", "fixtures", "consumer-basic");

function createTempConsumerProject(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-quickstart-"));
  const projectRoot = path.join(tempRoot, "consumer-basic");
  copyDir(fixtureRoot, projectRoot);
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return projectRoot;
}

function runCli(projectRoot, command, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [cliPath, command, "--project", projectRoot, ...extraArgs],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
}

test("quickstart guides uninitialized consumer projects toward init first", (t) => {
  const projectRoot = createTempConsumerProject(t);

  const result = runCli(projectRoot, "quickstart", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "not-initialized");
  assert.equal(payload.workspace.workspaceInitialized, false);
  assert.equal(payload.recommendedPath[0].command, "npx power-ai-skills init");
  assert.equal(
    payload.recommendedPath.some((step) => step.command === "npx power-ai-skills doctor"),
    true
  );
});

test("quickstart guides initialized projects without scan artifacts toward scan and draft generation", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  const result = runCli(projectRoot, "quickstart", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "initialized-no-scan");
  assert.equal(payload.workspace.workspaceInitialized, true);
  assert.equal(payload.workspace.hasProjectScanArtifacts, false);
  assert.equal(
    payload.recommendedPath.some((step) => step.command === "npx power-ai-skills scan-project"),
    true
  );
  assert.equal(
    payload.recommendedPath.some((step) => step.command === "npx power-ai-skills generate-project-local-skills"),
    true
  );
});

test("quickstart guides scanned projects without drafts toward draft materialization", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex"]).status, 0);

  const result = runCli(projectRoot, "quickstart", ["--format", "summary"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("Status: scanned-no-drafts"), true);
  assert.equal(result.stdout.includes("npx power-ai-skills generate-project-local-skills"), true);
  assert.equal(result.stdout.includes("npx power-ai-skills doctor"), true);
  assert.equal(result.stdout.includes("npx power-ai-skills list-project-local-skills"), true);
});
