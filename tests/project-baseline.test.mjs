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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-baseline-"));
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

test("check-project-baseline reports ok for team default initialized project", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--preset", "enterprise-standard", "--no-project-scan"]).status, 0);

  const result = runCli(projectRoot, "check-project-baseline", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "ok");
  assert.equal(payload.summary.failed, 0);
  assert.equal(payload.currentSelection.selectedPresets.includes("enterprise-standard"), true);
  assert.deepEqual(payload.teamDefaultSelection.expandedTools, ["agents-md", "claude-code", "codex", "cursor", "trae"]);
  assert.equal(payload.reportPath, path.join(projectRoot, ".power-ai", "reports", "project-baseline.md"));
  assert.equal(payload.jsonPath, path.join(projectRoot, ".power-ai", "reports", "project-baseline.json"));
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  const savedJson = JSON.parse(fs.readFileSync(payload.jsonPath, "utf8"));
  assert.equal(markdown.includes("## preset"), true);
  assert.equal(markdown.includes("## knowledge"), true);
  assert.equal(markdown.includes("## adapters"), true);
  assert.equal(savedJson.status, "ok");
});

test("check-project-baseline surfaces preset drift for partial explicit tools", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  const result = runCli(projectRoot, "check-project-baseline", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "attention");
  assert.equal(payload.summary.failed >= 1, true);
  assert.equal(payload.checks.some((check) => check.code === "PAI-BASELINE-PRESET-002" && !check.ok), true);
  const presetCoverageCheck = payload.checks.find((check) => check.code === "PAI-BASELINE-PRESET-002");
  assert.deepEqual(presetCoverageCheck.detail.missingDefaultTools, ["claude-code", "cursor", "trae"]);
  assert.equal(payload.recommendedActions.some((action) => action.includes("add-tool")), true);
});

test("check-project-baseline warns when recommended project profile drifts from selection", (t) => {
  const projectRoot = createTempConsumerProject(t);
  fs.writeFileSync(
    path.join(projectRoot, "package.json"),
    `${JSON.stringify({
      name: "consumer-basic",
      private: true,
      dependencies: {
        vue: "^3.4.0",
        pinia: "^2.1.0",
        "@power/runtime-vue3": "^6.5.0"
      }
    }, null, 2)}\n`,
    "utf8"
  );
  fs.mkdirSync(path.join(projectRoot, "src", "views"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "src", "views", "index.vue"), "<template><pc-layout-page-common /></template>\n", "utf8");
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  const result = runCli(projectRoot, "check-project-baseline", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  const projectProfileCheck = payload.checks.find((check) => check.code === "PAI-BASELINE-PRESET-007");
  assert.equal(projectProfileCheck.severity, "warning");
  assert.equal(projectProfileCheck.ok, false);
  assert.equal(projectProfileCheck.detail.recommendedProjectProfile, "enterprise-vue");
  assert.equal(projectProfileCheck.detail.projectProfileDecision, "auto-recommended");
  assert.equal(payload.currentSelection.recommendedProjectProfile, "enterprise-vue");
});

test("check-project-baseline exposes deferred profile decision metadata", (t) => {
  const projectRoot = createTempConsumerProject(t);
  fs.writeFileSync(
    path.join(projectRoot, "package.json"),
    `${JSON.stringify({
      name: "consumer-basic",
      private: true,
      dependencies: {
        vue: "^3.4.0",
        pinia: "^2.1.0",
        "@power/runtime-vue3": "^6.5.0"
      }
    }, null, 2)}\n`,
    "utf8"
  );
  fs.mkdirSync(path.join(projectRoot, "src", "views"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "src", "views", "index.vue"), "<template><pc-layout-page-common /></template>\n", "utf8");
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);
  assert.equal(runCli(projectRoot, "review-project-profile", [
    "--defer",
    "--reason", "wait for next release train",
    "--next-review-at", "2026-05-15"
  ]).status, 0);

  const result = runCli(projectRoot, "check-project-baseline", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.currentSelection.projectProfileDecision, "deferred");
  assert.equal(payload.currentSelection.projectProfileDecisionReason, "wait for next release train");
  assert.equal(payload.currentSelection.projectProfileDecisionReviewAt, "2026-05-15");
  const profileCheck = payload.checks.find((check) => check.code === "PAI-BASELINE-PRESET-007");
  assert.equal(profileCheck.detail.projectProfileDecision, "deferred");
});

test("check-project-baseline warns when governance review deadline is overdue", (t) => {
  const projectRoot = createTempConsumerProject(t);
  fs.writeFileSync(
    path.join(projectRoot, "package.json"),
    `${JSON.stringify({
      name: "consumer-basic",
      private: true,
      dependencies: {
        vue: "^3.4.0",
        pinia: "^2.1.0",
        "@power/runtime-vue3": "^6.5.0"
      }
    }, null, 2)}\n`,
    "utf8"
  );
  fs.mkdirSync(path.join(projectRoot, "src", "views"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "src", "views", "index.vue"), "<template><pc-layout-page-common /></template>\n", "utf8");
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);
  assert.equal(runCli(projectRoot, "review-project-profile", [
    "--defer",
    "--reason", "wait for next release train",
    "--next-review-at", "2024-01-01"
  ]).status, 0);

  const result = runCli(projectRoot, "check-project-baseline", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  const reviewCheck = payload.checks.find((check) => check.code === "PAI-BASELINE-PRESET-008");
  assert.equal(reviewCheck.severity, "warning");
  assert.equal(reviewCheck.ok, false);
  assert.equal(reviewCheck.detail.reviewStatus, "overdue");
  assert.equal(payload.currentSelection.projectProfileDecisionReviewStatus, "overdue");
});
