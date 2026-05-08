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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-status-"));
  const projectRoot = path.join(tempRoot, "consumer-basic");
  copyDir(fixtureRoot, projectRoot);
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return projectRoot;
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function runCli(projectRoot, command, extraArgs = [], options = {}) {
  return spawnSync(
    process.execPath,
    [cliPath, command, "--project", projectRoot, ...extraArgs],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        ...(options.env || {})
      }
    }
  );
}

test("status summarizes uninitialized consumer projects", (t) => {
  const projectRoot = createTempConsumerProject(t);

  const result = runCli(projectRoot, "status", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "attention");
  assert.equal(payload.quickstart.status, "not-initialized");
  assert.equal(payload.workspace.doctorOk, false);
  assert.equal(payload.habitCapture.status, "not-initialized");
  assert.equal(payload.habitCapture.automationBoundary.summaryStatus, "manual-only");
  assert.equal(
    payload.habitCapture.automationBoundary.manualReviewBoundaries.some((item) => item.includes("Manual skills")),
    true
  );
  assert.equal(payload.quickstart.recommendedPath[0].command, "npx power-ai-skills init");
});

test("status summarizes initialized but unscanned consumer projects", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  const result = runCli(projectRoot, "status", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "attention");
  assert.equal(payload.quickstart.status, "initialized-no-scan");
  assert.equal(payload.workspace.doctorOk, true);
  assert.equal(payload.habitCapture.status, "collecting");
  assert.equal(payload.habitCapture.autoCapture.enabled, true);
  assert.equal(payload.selection.summary.includes("tools: agents-md, codex"), true);
  assert.equal(
    payload.quickstart.recommendedPath.some((step) => step.command === "npx power-ai-skills scan-project"),
    true
  );
  assert.equal(
    payload.workspace.nextSteps.some((step) => step.includes("npx power-ai-skills scan-project")),
    true
  );
});

test("status summary includes doctor next steps and recommended path for scanned projects", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex"]).status, 0);

  const result = runCli(projectRoot, "status", ["--format", "summary"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("Status: attention"), true);
  assert.equal(result.stdout.includes("Current selection: tools: agents-md, codex"), true);
  assert.equal(result.stdout.includes("Habit capture:"), true);
  assert.equal(result.stdout.includes("Habit Capture Next Steps:"), true);
  assert.equal(result.stdout.includes("Silent Automation Actions:"), true);
  assert.equal(result.stdout.includes("Manual Review Boundaries:"), true);
  assert.equal(result.stdout.includes("Recommended Path:"), true);
  assert.equal(result.stdout.includes("Doctor Next Steps:"), true);
  assert.equal(result.stdout.includes("npx power-ai-skills list-project-local-skills"), true);
});

test("status shows the latest silent sync follow-up artifact after sync runs", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);
  assert.equal(runCli(projectRoot, "sync", [], {
    env: {
      POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP: "1"
    }
  }).status, 0);

  const result = runCli(projectRoot, "status", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.habitCapture.latestSyncFollowUp.available, true);
  assert.equal(payload.habitCapture.latestSyncFollowUp.status, "skipped");
  assert.equal(payload.habitCapture.latestSyncFollowUp.mode, "gate-skip");
  assert.equal(payload.habitCapture.latestSyncFollowUp.skipReason, "env-disabled");
  assert.equal(payload.habitCapture.latestSyncFollowUp.recommendation.level, "info-only");
  assert.equal(payload.habitCapture.latestSyncFollowUp.recommendation.primaryAction, null);
  assert.equal(payload.habitCapture.latestSyncFollowUp.recommendation.resolutionSignal.level, "can-ignore");
  assert.equal(payload.habitCapture.latestSyncFollowUp.recommendation.finalStatus.code, "ignore");
  assert.equal(payload.habitCapture.latestSyncFollowUp.recommendation.headline.label, "No action needed");
  assert.equal(payload.habitCapture.latestSyncFollowUp.triggerSource.type, "manual-sync");
  assert.equal(payload.habitCapture.latestSyncFollowUp.history.available, true);
  assert.equal(payload.habitCapture.latestSyncFollowUp.history.entries.length, 1);
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.reportPath.endsWith(path.join(".power-ai", "reports", "sync-evolution-follow-up.md")),
    true
  );
});

test("status summarizes recent silent sync follow-up history and trigger sources", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);
  assert.equal(runCli(projectRoot, "sync", [], {
    env: {
      POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP: "1",
      npm_lifecycle_event: "postinstall"
    }
  }).status, 0);
  assert.equal(runCli(projectRoot, "sync", [], {
    env: {
      POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP: "1",
      npm_lifecycle_event: "prepare"
    }
  }).status, 0);

  const result = runCli(projectRoot, "status", ["--format", "summary"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("Recent silent follow-ups: 2"), true);
  assert.equal(result.stdout.includes("Silent follow-up recommendation: info-only"), true);
  assert.equal(result.stdout.includes("Silent follow-up primary action: none"), true);
  assert.equal(result.stdout.includes("Silent follow-up resolution: can-ignore"), true);
  assert.equal(result.stdout.includes("Silent follow-up final status: ignore"), true);
  assert.equal(result.stdout.includes("Silent follow-up headline: No action needed"), true);
  assert.equal(result.stdout.includes("Recent Silent Follow-Up Sources:"), true);
  assert.equal(result.stdout.includes("Recent Silent Follow-Ups:"), true);
  assert.equal(result.stdout.includes("postinstall"), true);
  assert.equal(result.stdout.includes("npm-script (prepare)"), true);
  assert.equal(result.stdout.includes("history report:"), true);
});

test("status json exposes recent silent follow-up source breakdown", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);
  assert.equal(runCli(projectRoot, "sync", [], {
    env: {
      POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP: "1",
      npm_lifecycle_event: "postinstall"
    }
  }).status, 0);
  assert.equal(runCli(projectRoot, "sync", [], {
    env: {
      POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP: "1"
    }
  }).status, 0);

  const result = runCli(projectRoot, "status", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.habitCapture.latestSyncFollowUp.history.available, true);
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.history.summary.sourceBreakdown.some((item) => item.type === "postinstall" && item.count >= 1),
    true
  );
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.history.summary.sourceBreakdown.some((item) => item.type === "manual-sync" && item.count >= 1),
    true
  );
});

test("status surfaces review-needed recommendation when the latest silent follow-up failed", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  writeJson(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.json"), {
    schemaVersion: 1,
    generatedAt: "2026-05-08T10:00:00.000Z",
    projectRoot,
    trigger: "sync",
    triggerSource: {
      type: "postinstall",
      label: "postinstall",
      detection: "npm-lifecycle"
    },
    recommendedCheckCommand: "npx power-ai-skills status --format summary",
    optOutEnvVar: "POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP=1",
    summary: "Silent evolution follow-up failed during error: simulated failure.",
    followUp: {
      status: "failed",
      mode: "error",
      triggered: false,
      triggerReason: "",
      skipReason: "",
      error: "simulated failure",
      newConversationCount: 0,
      minNewConversations: 3,
      actionableCandidateCount: 0,
      executedActionCount: 0,
      skippedActionCount: 0,
      failedActionCount: 1
    },
    artifactPaths: {
      jsonPath: path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.json"),
      reportPath: path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.md"),
      historyJsonPath: path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up-history.json"),
      historyReportPath: path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up-history.md")
    }
  });

  const result = runCli(projectRoot, "status", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "attention");
  assert.equal(payload.habitCapture.latestSyncFollowUp.recommendation.level, "review-needed");
  assert.equal(payload.habitCapture.latestSyncFollowUp.recommendation.requiresAttention, true);
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.recommendation.primaryAction.summary,
    "Review the latest silent follow-up result before continuing with normal usage."
  );
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.recommendation.primaryAction.command,
    "npx power-ai-skills status --format summary"
  );
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.recommendation.resolutionSignal.level,
    "still-needs-action"
  );
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.recommendation.finalStatus.code,
    "handle-now"
  );
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.recommendation.headline.label,
    "Needs action now"
  );
  assert.equal(
    payload.habitCapture.latestSyncFollowUp.recommendation.nextActions.some((item) => item.includes("npx power-ai-skills doctor")),
    true
  );
});

test("status recommends run-evolution-cycle when enough captured habits exist but patterns are not analyzed yet", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  const summaryPath = path.join(projectRoot, "conversation-records.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        records: [
          {
            timestamp: "2026-03-13T09:00:00+08:00",
            toolUsed: "codex",
            sceneType: "tree-list-page",
            userIntent: "维护部门用户树列表页面",
            skillsUsed: ["tree-list-page", "dialog-skill"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["查询", "新增", "编辑"]
            },
            generatedFiles: ["src/views/department-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-13T14:00:00+08:00",
            toolUsed: "codex",
            sceneType: "tree-list-page",
            userIntent: "继续补部门用户树列表交互",
            skillsUsed: ["tree-list-page"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["查询", "编辑"]
            },
            generatedFiles: ["src/views/department-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-14T10:00:00+08:00",
            toolUsed: "codex",
            sceneType: "tree-list-page",
            userIntent: "第三次调整部门用户树列表",
            skillsUsed: ["tree-list-page"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["查询", "新增"]
            },
            generatedFiles: ["src/views/department-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  assert.equal(runCli(projectRoot, "capture-session", ["--input", summaryPath]).status, 0);

  const result = runCli(projectRoot, "status", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.habitCapture.status, "ready-for-evolution-cycle");
  assert.equal(payload.habitCapture.records.recordCount, 3);
  assert.equal(payload.habitCapture.patterns.available, false);
  assert.equal(payload.habitCapture.evolution.policy.autoAnalyzeEnabled, true);
  assert.equal(
    payload.habitCapture.automationBoundary.allowedAutomaticActions.some((item) => item.includes("run-evolution-cycle")),
    true
  );
  assert.equal(
    payload.habitCapture.automationBoundary.manualReviewBoundaries.some((item) => item.includes("Shared-skill promotion remains manual")),
    true
  );
  assert.equal(
    payload.habitCapture.nextSteps.some((step) => step.includes("run-evolution-cycle --json")),
    true
  );
});

test("status summarizes habit capture progress after pattern analysis and project skill generation", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex"]).status, 0);

  const summaryPath = path.join(projectRoot, "conversation-pattern-batch.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        records: [
          {
            timestamp: "2026-03-13T09:00:00+08:00",
            toolUsed: "codex",
            sceneType: "tree-list-page",
            userIntent: "维护部门用户树列表页面",
            skillsUsed: ["tree-list-page", "dialog-skill"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["查询", "新增", "编辑"]
            },
            generatedFiles: ["src/views/department-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-13T14:00:00+08:00",
            toolUsed: "codex",
            sceneType: "tree-list-page",
            userIntent: "继续补部门用户树列表交互",
            skillsUsed: ["tree-list-page"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["查询", "编辑"]
            },
            generatedFiles: ["src/views/department-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-14T10:00:00+08:00",
            toolUsed: "codex",
            sceneType: "tree-list-page",
            userIntent: "第三次调整部门用户树列表",
            skillsUsed: ["tree-list-page"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["查询", "新增"]
            },
            generatedFiles: ["src/views/department-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  assert.equal(runCli(projectRoot, "capture-session", ["--input", summaryPath]).status, 0);
  assert.equal(runCli(projectRoot, "analyze-patterns").status, 0);
  assert.equal(runCli(projectRoot, "generate-project-skill", ["--pattern", "pattern_tree_list_page"]).status, 0);

  const result = runCli(projectRoot, "status", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.habitCapture.status, "drafts-ready");
  assert.equal(payload.habitCapture.patterns.available, true);
  assert.equal(payload.habitCapture.patterns.patternCount, 1);
  assert.equal(payload.habitCapture.patterns.generateCount, 1);
  assert.equal(payload.habitCapture.decisions.promoted, 1);
  assert.equal(payload.habitCapture.drafts.projectLocalDraftCount, 1);
  assert.equal(
    payload.habitCapture.nextSteps.some((step) => step.includes("list-project-local-skills")),
    true
  );
});
