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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-capture-safety-"));
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("init scaffolds capture safety policy from the team baseline", (t) => {
  const projectRoot = createTempConsumerProject(t);

  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const policyPath = path.join(projectRoot, ".power-ai", "capture-safety-policy.json");
  const policy = readJson(policyPath);
  assert.equal(policy.enabled, true);
  assert.equal(policy.retention.autoArchiveDays, 90);
  assert.equal(policy.admission.reviewIntentKeywords.includes("migration plan"), true);
  assert.equal(policy.admission.reviewIntentKeywords.includes("rollout plan"), true);
  assert.equal(policy.admission.blockedGeneratedFilePatterns.includes(".env"), true);
  assert.equal(policy.admission.reviewGeneratedFilePatterns.includes("migrations/"), true);
});

test("show-capture-safety-policy merges team baseline with project overrides", (t) => {
  const projectRoot = createTempConsumerProject(t);

  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const policyPath = path.join(projectRoot, ".power-ai", "capture-safety-policy.json");
  fs.writeFileSync(
    policyPath,
    `${JSON.stringify({
      enabled: true,
      admission: {
        blockedSceneTypes: ["custom-sensitive-scene"]
      }
    }, null, 2)}\n`,
    "utf8"
  );

  const showResult = runCli(projectRoot, "show-capture-safety-policy", ["--json"]);
  assert.equal(showResult.status, 0, showResult.stderr);
  const payload = JSON.parse(showResult.stdout);

  assert.equal(payload.source, "project-override");
  assert.equal(payload.policy.admission.blockedSceneTypes.includes("custom-sensitive-scene"), true);
  assert.equal(payload.policy.admission.reviewIntentKeywords.includes("migration plan"), true);
  assert.equal(payload.policy.admission.blockedGeneratedFilePatterns.includes(".env"), true);
  assert.equal(payload.policy.retention.autoArchiveDays, 90);
  assert.equal(payload.validation.ok, true);
  assert.equal(payload.validation.summary.blockedFilePatternCount >= 1, true);
  assert.equal(payload.validation.summary.reviewFilePatternCount >= 1, true);
});

test("evaluate-session-capture exposes warning review and blocking governance semantics", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);
  const strategyResult = runCli(projectRoot, "generate-conversation-miner-strategy", ["--type", "exploration", "--json"]);
  assert.equal(strategyResult.status, 0, strategyResult.stderr);

  const inputPath = path.join(projectRoot, ".power-ai", "tmp", "capture-safety-governance.json");
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });
  fs.writeFileSync(
    inputPath,
    `${JSON.stringify({
      records: [
        {
          timestamp: "2026-04-01T09:00:00+08:00",
          toolUsed: "codex",
          sceneType: "basic-list-page",
          userIntent: "补充项目表单校验说明",
          customizations: ["补充表单规则"],
          complexity: "medium"
        },
        {
          timestamp: "2026-04-01T10:00:00+08:00",
          toolUsed: "codex",
          sceneType: "architecture-review",
          userIntent: "review migration plan for deploy scripts",
          skillsUsed: ["form-skill", "dialog-skill"],
          entities: {
            operations: ["edit", "review"]
          },
          generatedFiles: ["scripts/release/check.mjs"],
          customizations: ["补充发布流程检查"],
          complexity: "high"
        },
        {
          timestamp: "2026-04-01T11:00:00+08:00",
          toolUsed: "codex",
          sceneType: "form",
          userIntent: "补充环境变量模板",
          skillsUsed: ["form-skill"],
          entities: {
            operations: ["edit"]
          },
          generatedFiles: ["config/.env.local"],
          customizations: ["补充本地配置"],
          complexity: "medium"
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );

  const evaluateResult = runCli(projectRoot, "evaluate-session-capture", ["--input", inputPath, "--json"]);
  assert.equal(evaluateResult.status, 0, evaluateResult.stderr);
  const payload = JSON.parse(evaluateResult.stdout);

  assert.equal(payload.summary.askWarning, 1);
  assert.equal(payload.summary.askReview, 1);
  assert.equal(payload.summary.skipSensitive, 1);
  assert.equal(payload.captureSafetyGovernance.summary.warning, 1);
  assert.equal(payload.captureSafetyGovernance.summary.review, 1);
  assert.equal(payload.captureSafetyGovernance.summary.blocking, 1);
  assert.equal(payload.evaluations[0].captureSafetyGovernanceLevel, "warning");
  assert.equal(payload.evaluations[0].captureSafetyGovernanceReasons.includes("low-signal-capture"), true);
  assert.equal(payload.evaluations[1].captureSafetyGovernanceLevel, "review");
  assert.equal(payload.evaluations[1].captureSafetyGovernanceReasons.includes("review-scene-type"), true);
  assert.equal(payload.evaluations[2].captureSafetyGovernanceLevel, "blocking");
  assert.equal(payload.evaluations[2].captureSafetyGovernanceReasons.includes("blocked-generated-file-pattern"), true);
});

test("capture-session force still refuses blocking capture safety records", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const inputPath = path.join(projectRoot, ".power-ai", "tmp", "capture-safety-force.json");
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });
  fs.writeFileSync(
    inputPath,
    `${JSON.stringify({
      records: [
        {
          timestamp: "2026-04-02T09:00:00+08:00",
          toolUsed: "codex",
          sceneType: "form",
          userIntent: "补充环境变量模板",
          skillsUsed: ["form-skill"],
          entities: {
            operations: ["edit"]
          },
          generatedFiles: ["config/.env.local"],
          customizations: ["补充本地配置"],
          complexity: "medium"
        },
        {
          timestamp: "2026-04-02T10:00:00+08:00",
          toolUsed: "codex",
          sceneType: "permission-page",
          userIntent: "补充角色权限映射",
          skillsUsed: ["form-skill", "dialog-skill"],
          entities: {
            operations: ["create", "edit"]
          },
          generatedFiles: ["src/rbac/role-map.ts"],
          customizations: ["补充角色权限映射"],
          complexity: "high"
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );

  const captureResult = runCli(projectRoot, "capture-session", ["--input", inputPath, "--force", "--json"]);
  assert.equal(captureResult.status, 0, captureResult.stderr);
  const payload = JSON.parse(captureResult.stdout);

  assert.equal(payload.forced, true);
  assert.equal(payload.recordsAdded, 1);
  assert.equal(payload.blockedBySafety, 1);
  assert.equal(payload.records[0].captureSafetyGovernanceLevel, "none");

  const conversationPath = path.join(projectRoot, ".power-ai", "conversations", "2026-04-02.json");
  const saved = readJson(conversationPath);
  assert.equal(saved.records.length, 1);
  assert.equal(saved.records[0].generatedFiles.includes("src/rbac/role-map.ts"), true);
  assert.equal(saved.records[0].captureSafetyGovernanceLevel, "none");
});
