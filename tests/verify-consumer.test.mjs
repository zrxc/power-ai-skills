import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyDir } from "../src/shared/fs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifyScriptPath = path.join(root, "scripts", "verify-consumer.mjs");
const releaseConsumerInputsScriptPath = path.join(root, "scripts", "release-consumer-inputs.mjs");
const fixtureRoot = path.join(root, "tests", "fixtures", "consumer-basic");

function createTempConsumerProject(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-verify-test-"));
  const projectRoot = path.join(tempRoot, "consumer-basic");
  copyDir(fixtureRoot, projectRoot);
  fs.rmSync(path.join(projectRoot, ".power-ai"), { recursive: true, force: true });
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return projectRoot;
}

test("verify-consumer succeeds with the built-in basic fixture", () => {
  const result = spawnSync(
    process.execPath,
    [verifyScriptPath, "--fixture", "basic", "--tool", "codex", "--tool", "cursor"],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overallOk, true);
  assert.deepEqual(payload.overallFailureCodes, []);
  assert.deepEqual(payload.commands, ["init", "sync", "doctor"]);
  assert.deepEqual(payload.fixtures, ["basic"]);
  assert.equal(payload.reports.length, 1);
  assert.equal(payload.reports[0].ok, true);
  assert.equal(payload.reports[0].fixtureName, "basic");
  assert.deepEqual(payload.reports[0].failureCodes, []);
  assert.equal(payload.matrix.summary.totalScenarios, 1);
  assert.equal(payload.matrix.summary.passedScenarios, 1);
  assert.equal(typeof payload.reports[0].governanceContext, "object");
  assert.equal(payload.reports[0].governanceContext.available, true);
  assert.equal(payload.matrix.summary.unresolvedProjectProfileDecisions, 0);
  assert.equal(payload.matrix.summary.pendingConversationReviews, 0);
  assert.equal(payload.matrix.scenarios[0].scenarioLabel, "fixture:basic");
  assert.equal(typeof payload.matrix.scenarios[0].governanceContext, "object");
  assert.equal(payload.matrix.scenarios[0].governanceContext.projectProfileDecision.length >= 0, true);
  assert.equal(payload.reports[0].artifacts.ok, true);
  assert.equal(payload.reports[0].artifacts.checks.length >= 10, true);
  assert.equal(
    payload.reports[0].artifacts.checks.every((check) => check.ok),
    true
  );
  assert.deepEqual(
    payload.reports[0].artifacts.checks.map((check) => check.id),
    [
      "component-registry",
      "tree-user-crud-recipe",
      "basic-list-crud-recipe",
      "pc-tree-guide",
      "pc-table-warp-guide",
      "pc-dialog-guide",
      "pc-container-guide",
      "tree-list-skill",
      "basic-list-skill",
      "entry-skill"
    ]
  );
});

test("verify-consumer writes compatibility matrix artifacts when output paths are provided", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-verify-matrix-"));
  const matrixJsonPath = path.join(tempRoot, "consumer-compatibility-matrix.json");
  const matrixMarkdownPath = path.join(tempRoot, "consumer-compatibility-matrix.md");
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const result = spawnSync(
    process.execPath,
    [
      verifyScriptPath,
      "--fixture", "basic",
      "--tool", "codex",
      "--tool", "cursor",
      "--matrix-json", matrixJsonPath,
      "--matrix-markdown", matrixMarkdownPath
    ],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.matrixJsonPath, matrixJsonPath);
  assert.equal(payload.matrixMarkdownPath, matrixMarkdownPath);
  assert.equal(fs.existsSync(matrixJsonPath), true);
  assert.equal(fs.existsSync(matrixMarkdownPath), true);

  const matrixJson = JSON.parse(fs.readFileSync(matrixJsonPath, "utf8"));
  const matrixMarkdown = fs.readFileSync(matrixMarkdownPath, "utf8");
  assert.equal(matrixJson.summary.totalScenarios, 1);
  assert.equal(matrixJson.summary.passedScenarios, 1);
  assert.equal(matrixJson.dimensions.initStrategy, "explicit-tools");
  assert.equal(matrixMarkdown.includes("# Consumer Compatibility Matrix"), true);
  assert.equal(matrixMarkdown.includes("fixture:basic"), true);
});

test("release consumer inputs uses the built-in fixture and writes matrix artifacts", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-consumer-inputs-"));
  const matrixJsonPath = path.join(tempRoot, "consumer-compatibility-matrix.json");
  const matrixMarkdownPath = path.join(tempRoot, "consumer-compatibility-matrix.md");
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const result = spawnSync(
    process.execPath,
    [
      releaseConsumerInputsScriptPath,
      "--tool", "codex",
      "--matrix-json", matrixJsonPath,
      "--matrix-markdown", matrixMarkdownPath
    ],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overallOk, true);
  assert.deepEqual(payload.fixtures, ["basic"]);
  assert.equal(payload.matrixJsonPath, matrixJsonPath);
  assert.equal(payload.matrixMarkdownPath, matrixMarkdownPath);
  assert.equal(fs.existsSync(matrixJsonPath), true);
  assert.equal(fs.existsSync(matrixMarkdownPath), true);
});

test("release consumer inputs respects POWER_AI_RELEASE_MANIFEST_DIR defaults", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-consumer-inputs-env-"));
  const manifestRoot = path.join(tempRoot, "manifest");
  const matrixJsonPath = path.join(manifestRoot, "consumer-compatibility-matrix.json");
  const matrixMarkdownPath = path.join(manifestRoot, "consumer-compatibility-matrix.md");
  copyDir(path.join(root, "manifest"), manifestRoot);
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const result = spawnSync(
    process.execPath,
    [
      releaseConsumerInputsScriptPath,
      "--tool", "codex"
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot
      }
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overallOk, true);
  assert.equal(payload.matrixJsonPath, matrixJsonPath);
  assert.equal(payload.matrixMarkdownPath, matrixMarkdownPath);
  assert.equal(fs.existsSync(matrixJsonPath), true);
  assert.equal(fs.existsSync(matrixMarkdownPath), true);
});

test("verify-consumer surfaces doctor and artifact failure codes for an unhealthy project", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const result = spawnSync(
    process.execPath,
    [verifyScriptPath, projectRoot, "--commands", "doctor"],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overallOk, false);
  assert.equal(payload.reports.length, 1);
  assert.equal(payload.reports[0].ok, false);
  assert.equal(payload.reports[0].commands[0].command, "doctor");
  assert.equal(
    payload.reports[0].failureCodes.some((code) => code.startsWith("PAI-WORKSPACE-")),
    true
  );
  assert.equal(
    payload.reports[0].failureCodes.some((code) => code.startsWith("PAI-VERIFY-ARTIFACT-")),
    true
  );
  assert.equal(
    payload.overallFailureCodes.some((code) => code.startsWith("PAI-WORKSPACE-")),
    true
  );
  assert.equal(
    payload.overallFailureCodes.some((code) => code.startsWith("PAI-VERIFY-ARTIFACT-")),
    true
  );
});
