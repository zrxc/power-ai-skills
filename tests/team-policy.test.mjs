import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRuntimeContext } from "../src/context.mjs";
import { createTeamPolicyService } from "../src/team-policy/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "bin", "power-ai-skills.mjs");
const fixtureRoot = path.join(root, "tests", "fixtures", "consumer-basic");

function createTempConsumerProject(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-team-policy-"));
  const projectRoot = path.join(tempRoot, "consumer-basic");
  fs.cpSync(fixtureRoot, projectRoot, { recursive: true });
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

test("show-team-policy and validate-team-policy expose package policy details", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]).status, 0);

  const showResult = runCli(projectRoot, "show-team-policy", ["--json"]);
  assert.equal(showResult.status, 0, showResult.stderr);
  const showPayload = JSON.parse(showResult.stdout);
  assert.equal(showPayload.validation.ok, true);
  assert.equal(showPayload.teamPolicy.allowedTools.includes("codex"), true);
  assert.equal(showPayload.teamPolicy.defaultTools.includes("cursor"), true);
  assert.equal(showPayload.projectTeamPolicySnapshot.schemaVersion, 1);

  const validateResult = runCli(projectRoot, "validate-team-policy", ["--json"]);
  assert.equal(validateResult.status, 0, validateResult.stderr);
  const validatePayload = JSON.parse(validateResult.stdout);
  assert.equal(validatePayload.ok, true);
  assert.equal(validatePayload.summary.errorCount, 0);
  assert.equal(validatePayload.summary.projectProfileCount >= 2, true);
});

test("check-team-policy-drift writes reports and records warning-only drift for trimmed defaults", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]).status, 0);

  const result = runCli(projectRoot, "check-team-policy-drift", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "ok");
  assert.equal(payload.summary.failed, 0);
  assert.equal(payload.summary.warnings >= 1, true);
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
  assert.equal(
    payload.checks.some((check) => check.code === "PAI-POLICY-005" && check.severity === "warning" && check.ok === false),
    true
  );

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  const savedJson = readJson(payload.jsonPath);
  assert.equal(markdown.includes("## selection"), true);
  assert.equal(savedJson.summary.warnings >= 1, true);
});

test("check-team-policy-drift warns for compatible-only wrapper rollout stages", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "github-copilot"]).status, 0);

  const result = runCli(projectRoot, "check-team-policy-drift", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  const rolloutCheck = payload.checks.find((check) => check.code === "PAI-POLICY-006");
  assert.equal(payload.status, "ok");
  assert.equal(rolloutCheck.severity, "warning");
  assert.equal(rolloutCheck.ok, false);
  assert.equal(
    rolloutCheck.detail.nonGeneralRollouts.some((item) => item.toolName === "github-copilot" && item.stage === "compatible-only"),
    true
  );
});

test("check-team-policy-drift warns when project capture safety policy drifts from the team baseline", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]).status, 0);

  const captureSafetyPath = path.join(projectRoot, ".power-ai", "capture-safety-policy.json");
  const captureSafetyPolicy = readJson(captureSafetyPath);
  captureSafetyPolicy.retention.autoArchiveDays = 30;
  fs.writeFileSync(captureSafetyPath, `${JSON.stringify(captureSafetyPolicy, null, 2)}\n`, "utf8");

  const result = runCli(projectRoot, "check-team-policy-drift", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  const captureSafetyCheck = payload.checks.find((check) => check.code === "PAI-POLICY-012");
  assert.equal(payload.status, "ok");
  assert.ok(captureSafetyCheck);
  assert.equal(captureSafetyCheck.severity, "warning");
  assert.equal(captureSafetyCheck.ok, false);
  assert.equal(captureSafetyCheck.detail.relativePath, ".power-ai\\capture-safety-policy.json");
  assert.equal(captureSafetyCheck.detail.differencePaths.includes("retention.autoArchiveDays"), true);
});

test("init and add-tool print rollout warnings for non-general wrappers", (t) => {
  const projectRoot = createTempConsumerProject(t);

  const initResult = runCli(projectRoot, "init", ["--tool", "github-copilot"]);
  assert.equal(initResult.status, 0, initResult.stderr);
  assert.equal(initResult.stdout.includes("rollout stage `compatible-only`"), true);

  const addToolResult = runCli(projectRoot, "add-tool", ["--tool", "vscode-agent"]);
  assert.equal(addToolResult.status, 0, addToolResult.stderr);
  assert.equal(addToolResult.stdout.includes("rollout stage `pilot`"), true);
});

test("init persists selected project profile metadata and show-defaults reflects profile defaults", (t) => {
  const projectRoot = createTempConsumerProject(t);

  const initResult = runCli(projectRoot, "init", ["--project-profile", "terminal-governance", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);
  assert.equal(initResult.stdout.includes("project profile: terminal-governance"), true);

  const selectedTools = readJson(path.join(projectRoot, ".power-ai", "selected-tools.json"));
  assert.equal(selectedTools.selectedProjectProfile, "terminal-governance");
  assert.deepEqual(selectedTools.selectedTools, ["aider", "claude-code", "codex", "gemini-cli"]);
  assert.deepEqual(selectedTools.requiredSkills, [
    "orchestration/entry-skill",
    "workflow/approval-workflow-skill"
  ]);

  const defaultsResult = runCli(projectRoot, "show-defaults", ["--project-profile", "terminal-governance", "--format", "summary"]);
  assert.equal(defaultsResult.status, 0, defaultsResult.stderr);
  assert.equal(defaultsResult.stdout.includes("Requested project profile: terminal-governance"), true);
  assert.equal(defaultsResult.stdout.includes("Profile preset: terminal-evaluation"), true);
});

test("init scaffolds project profile decision and history records", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--project-profile", "terminal-governance", "--no-project-scan"]).status, 0);

  const decisionPath = path.join(projectRoot, ".power-ai", "governance", "project-profile-decision.json");
  const historyPath = path.join(projectRoot, ".power-ai", "governance", "project-profile-decision-history.json");
  assert.equal(fs.existsSync(decisionPath), true);
  assert.equal(fs.existsSync(historyPath), true);

  const decision = readJson(decisionPath);
  const history = readJson(historyPath);
  assert.equal(decision.selectedProjectProfile, "terminal-governance");
  assert.equal(decision.decision, "auto-recommended");
  assert.equal(Array.isArray(decision.sourceSignals), true);
  assert.equal(Array.isArray(history.entries), true);
  assert.equal(history.entries.length >= 1, true);

  const showResult = runCli(projectRoot, "show-project-profile-decision", ["--json"]);
  assert.equal(showResult.status, 0, showResult.stderr);
  const showPayload = JSON.parse(showResult.stdout);
  assert.equal(showPayload.decision.decisionPath, decisionPath);
  assert.equal(showPayload.historyPath, historyPath);
});

test("review-project-profile persists deferred and rejected project profile decisions", (t) => {
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

  const deferResult = runCli(projectRoot, "review-project-profile", [
    "--defer",
    "--reason", "wait for next template refresh",
    "--next-review-at", "2026-05-01",
    "--json"
  ]);
  assert.equal(deferResult.status, 0, deferResult.stderr);
  const deferPayload = JSON.parse(deferResult.stdout);
  assert.equal(deferPayload.decision, "deferred");
  assert.equal(deferPayload.nextReviewAt, "2026-05-01");

  const rejectResult = runCli(projectRoot, "review-project-profile", [
    "--reject",
    "--reason", "workspace is intentionally CLI-first",
    "--json"
  ]);
  assert.equal(rejectResult.status, 0, rejectResult.stderr);
  const rejectPayload = JSON.parse(rejectResult.stdout);
  assert.equal(rejectPayload.decision, "rejected");
  assert.equal(rejectPayload.decisionReason, "workspace is intentionally CLI-first");

  const decision = readJson(path.join(projectRoot, ".power-ai", "governance", "project-profile-decision.json"));
  const history = readJson(path.join(projectRoot, ".power-ai", "governance", "project-profile-decision-history.json"));
  assert.equal(decision.decision, "rejected");
  assert.equal(decision.nextReviewAt, "");
  assert.equal(history.entries.length >= 3, true);

  const driftResult = runCli(projectRoot, "check-team-policy-drift", ["--json"]);
  assert.equal(driftResult.status, 0, driftResult.stderr);
  const driftPayload = JSON.parse(driftResult.stdout);
  const profileCheck = driftPayload.checks.find((check) => check.code === "PAI-POLICY-007");
  assert.equal(profileCheck.detail.projectProfileDecision, "rejected");
  assert.equal(profileCheck.detail.projectProfileDecisionReason, "workspace is intentionally CLI-first");
});

test("check-governance-review-deadlines reports overdue project profile reviews", (t) => {
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
    "--reason", "wait for next migration window",
    "--next-review-at", "2024-01-01"
  ]).status, 0);

  const result = runCli(projectRoot, "check-governance-review-deadlines", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "attention");
  assert.equal(payload.summary.overdueReviews, 1);
  assert.equal(payload.items[0].reviewType, "project-profile-decision");
  assert.equal(payload.items[0].reviewStatus, "overdue");
  assert.equal(payload.items[0].nextReviewAt, "2024-01-01");
  assert.equal(payload.recommendedActions.some((item) => item.includes("review-project-profile")), true);
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
});

test("review-project-profile accepts the current recommendation and refreshes governance context", (t) => {
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

  const reviewResult = runCli(projectRoot, "review-project-profile", ["--accept-recommended", "--json"]);
  assert.equal(reviewResult.status, 0, reviewResult.stderr);
  const reviewPayload = JSON.parse(reviewResult.stdout);
  assert.equal(reviewPayload.acceptRecommended, true);
  assert.equal(reviewPayload.decision, "accepted");
  assert.equal(reviewPayload.acceptedProjectProfile, "enterprise-vue");

  const contextResult = runCli(projectRoot, "show-project-governance-context", ["--json"]);
  assert.equal(contextResult.status, 0, contextResult.stderr);
  const contextPayload = JSON.parse(contextResult.stdout);
  assert.equal(contextPayload.recommendedProjectProfile, "enterprise-vue");
  assert.equal(contextPayload.projectProfileDecision, "accepted");
  assert.equal(contextPayload.projectProfileDecisionReviewStatus, "not-scheduled");
  assert.equal(fs.existsSync(contextPayload.contextPath), true);
  assert.deepEqual(contextPayload.selectedTools, ["codex"]);
});

test("project profile blocks tools outside the selected project scope", (t) => {
  const projectRoot = createTempConsumerProject(t);

  const initResult = runCli(projectRoot, "init", ["--project-profile", "terminal-governance", "--tool", "cursor", "--no-project-scan"]);
  assert.equal(initResult.status, 1);
  assert.equal(initResult.stderr.includes("outside team project profile `terminal-governance`"), true);

  assert.equal(runCli(projectRoot, "init", ["--project-profile", "terminal-governance", "--no-project-scan"]).status, 0);
  const addToolResult = runCli(projectRoot, "add-tool", ["--tool", "cursor"]);
  assert.equal(addToolResult.status, 1);
  assert.equal(addToolResult.stderr.includes("outside team project profile `terminal-governance`"), true);
});

test("team policy service blocks tools disabled by rollout policy", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const projectRoot = createTempConsumerProject(t);
  const service = createTeamPolicyService({
    context: {
      ...context,
      teamPolicy: {
        ...context.teamPolicy,
        wrapperPolicies: {
          ...context.teamPolicy.wrapperPolicies,
          rolloutStages: {
            ...context.teamPolicy.wrapperPolicies.rolloutStages,
            codex: "disabled"
          }
        }
      }
    },
    projectRoot,
    workspaceService: {
      getPowerAiPaths() {
        return {
          teamPolicyTarget: path.join(projectRoot, ".power-ai", "team-policy.json"),
          skillsTarget: path.join(projectRoot, ".power-ai", "skills")
        };
      },
      getReportsRoot() {
        return path.join(projectRoot, ".power-ai", "reports");
      }
    },
    selectionService: {
      loadSelectedToolsConfig() {
        return null;
      },
      resolveSelection() {
        return {
          mode: "explicit",
          selectedPresets: [],
          selectedProfiles: [],
          selectedTools: ["codex"],
          expandedTools: ["agents-md", "codex"]
        };
      }
    }
  });

  assert.throws(
    () => service.assertToolSelectionAllowed(["codex"], "init"),
    /disabled by rollout policy: codex/
  );
});
