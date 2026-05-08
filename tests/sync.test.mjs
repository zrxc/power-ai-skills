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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-sync-"));
  const projectRoot = path.join(tempRoot, "consumer-basic");
  copyDir(fixtureRoot, projectRoot);
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return projectRoot;
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

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function seedConversationProjectPattern(projectRoot, {
  frequency = 3,
  reuseScore = 72,
  customizations = ["tree node click refreshes list", "dialog form edits member info"],
  sampleGeneratedFiles = ["src/views/org-member/index.vue"]
} = {}) {
  writeJson(path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json"), {
    projectName: "consumer-basic",
    lastAnalyzed: "2026-04-24T10:00:00.000Z",
    summary: {
      fileCount: 2,
      recordCount: frequency,
      generate: 1,
      review: 0,
      skip: 0
    },
    patterns: [
      {
        id: "pattern_tree_list_page",
        sceneType: "tree-list-page",
        frequency,
        reuseScore,
        reuseValue: "high",
        recommendation: "generate",
        commonSkills: ["tree-list-page", "dialog-skill", "api-skill"],
        mainObjects: ["成员"],
        treeObjects: ["组织"],
        operations: ["新增", "编辑", "删除"],
        customizations,
        sampleGeneratedFiles,
        sampleConversationIds: ["conv_1", "conv_2", "conv_3"],
        candidateSkill: {
          name: "tree-list-page-conversation-project",
          baseSkill: "tree-list-page"
        }
      }
    ]
  });
}

function seedMaterializedProjectLocalCandidate(projectRoot) {
  const skillRoot = path.join(
    projectRoot,
    ".power-ai",
    "skills",
    "project-local",
    "auto-generated",
    "tree-list-page-conversation-project"
  );
  writeJson(path.join(projectRoot, ".power-ai", "governance", "evolution-candidates.json"), {
    schemaVersion: 1,
    updatedAt: "2026-04-24T10:10:00.000Z",
    candidates: [
      {
        candidateId: "project-local-skill-draft::pattern_tree_list_page",
        candidateType: "project-local-skill-draft",
        sourcePatternIds: ["pattern_tree_list_page"],
        sourceConversationIds: ["conv_1", "conv_2", "conv_3"],
        confidence: 76,
        triggeredBy: "analyze-patterns",
        generatedAt: "2026-04-24T10:10:00.000Z",
        status: "materialized",
        reason: "Pattern pattern_tree_list_page reached draft threshold.",
        targetPath: skillRoot,
        riskLevel: "low",
        metadata: {
          sceneType: "tree-list-page",
          candidateSkillName: "tree-list-page-conversation-project",
          reuseScore: 72,
          frequency: 3
        }
      }
    ]
  });
}

test("sync silently triggers low-risk evolution follow-up when enough captured conversations exist", (t) => {
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

  const result = runCli(projectRoot, "sync");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("silent evolution follow-up: executed"), true);
  assert.equal(result.stdout.includes("mode run-evolution-cycle"), true);
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.json")),
    true
  );
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.md")),
    true
  );
  const followUpArtifact = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.json"), "utf8")
  );
  assert.equal(followUpArtifact.followUp.status, "executed");
  assert.equal(followUpArtifact.followUp.mode, "run-evolution-cycle");
  assert.equal(followUpArtifact.triggerSource.type, "manual-sync");
  assert.equal(followUpArtifact.recommendedCheckCommand, "npx power-ai-skills status --format summary");
  assert.equal(followUpArtifact.recommendation.level, "low-risk-follow-up-available");
  assert.equal(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.md"), "utf8").includes("## Recommendation Next Actions"),
    true
  );
  const historyArtifact = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up-history.json"), "utf8")
  );
  assert.equal(historyArtifact.entries.length, 1);
  assert.equal(historyArtifact.entries[0].triggerSource.type, "manual-sync");
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json")),
    true
  );
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "governance", "evolution-actions.json")),
    true
  );
});

test("sync allows an explicit environment opt-out for silent evolution follow-up", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  const result = runCli(projectRoot, "sync", [], {
    env: {
      POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP: "1"
    }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("silent evolution follow-up: skipped"), true);
  assert.equal(result.stdout.includes("mode gate-skip"), true);
  assert.equal(result.stdout.includes("env-disabled"), true);
  const followUpArtifact = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.json"), "utf8")
  );
  assert.equal(followUpArtifact.followUp.status, "skipped");
  assert.equal(followUpArtifact.followUp.skipReason, "env-disabled");
  assert.equal(followUpArtifact.triggerSource.type, "manual-sync");
  assert.equal(followUpArtifact.recommendation.level, "info-only");
  assert.equal(
    followUpArtifact.recommendation.nextActions.some((item) => item.includes("POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP=1")),
    true
  );
});

test("sync records recent follow-up history with source breakdown and a five-entry cap", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  for (let index = 0; index < 6; index += 1) {
    const result = runCli(projectRoot, "sync", [], {
      env: {
        POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP: "1",
        npm_lifecycle_event: index === 2 ? "prepare" : index === 4 ? "postinstall" : "",
        POWER_AI_SYNC_TRIGGER_SOURCE: index === 1 ? "manual-sync" : ""
      }
    });
    assert.equal(result.status, 0, result.stderr);
  }

  const followUpArtifact = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.json"), "utf8")
  );
  assert.equal(followUpArtifact.triggerSource.type, "manual-sync");

  const historyArtifact = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up-history.json"), "utf8")
  );
  assert.equal(historyArtifact.entries.length, 5);
  assert.equal(
    historyArtifact.entries.some((entry) => entry.triggerSource.type === "postinstall"),
    true
  );
  assert.equal(
    historyArtifact.entries.some((entry) => entry.triggerSource.type === "npm-script" && entry.triggerSource.label === "prepare"),
    true
  );
  assert.equal(
    historyArtifact.summary.sourceBreakdown.some((item) => item.type === "postinstall" && item.count >= 1),
    true
  );
  assert.equal(
    historyArtifact.summary.sourceBreakdown.some((item) => item.type === "npm-script" && item.label === "prepare" && item.count >= 1),
    true
  );
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up-history.md")),
    true
  );
});

test("sync detects postinstall trigger source from npm lifecycle env", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  const result = runCli(projectRoot, "sync", [], {
    env: {
      POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP: "1",
      npm_lifecycle_event: "postinstall"
    }
  });
  assert.equal(result.status, 0, result.stderr);

  const followUpArtifact = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "reports", "sync-evolution-follow-up.json"), "utf8")
  );
  assert.equal(followUpArtifact.triggerSource.type, "postinstall");
  assert.equal(followUpArtifact.triggerSource.detection, "npm-lifecycle");
});

test("sync falls back to action-only silent follow-up when low-risk project-local refresh is already actionable", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", [
    "--tool", "codex",
    "--project-profile", "terminal-governance",
    "--no-project-scan"
  ]).status, 0);

  seedConversationProjectPattern(projectRoot);
  writeJson(path.join(projectRoot, ".power-ai", "evolution-policy.json"), {
    $schema: "./schemas/evolution-policy.schema.json",
    schemaVersion: 1,
    autoAnalyzeEnabled: true,
    autoGenerateProjectSkills: false,
    autoArchiveLowValuePatterns: false,
    autoRefreshGovernanceContext: true,
    autoRefreshGovernanceSummary: true,
    minConversationCountToAnalyze: 5,
    minPatternFrequencyToDraft: 3,
    highConfidencePromotionThreshold: 5,
    allowAutoProjectLocalSkillRefresh: true,
    allowAutoSharedSkillPromotion: false,
    allowAutoWrapperProposal: false,
    allowAutoReleaseActions: false
  });

  const initialGenerate = runCli(projectRoot, "generate-project-skill", ["--pattern", "pattern_tree_list_page"]);
  assert.equal(initialGenerate.status, 0, initialGenerate.stderr);

  seedMaterializedProjectLocalCandidate(projectRoot);

  const result = runCli(projectRoot, "sync");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("silent evolution follow-up: skipped") || result.stdout.includes("silent evolution follow-up: executed"), true);
  assert.equal(result.stdout.includes("mode apply-evolution-actions"), true);
  assert.equal(result.stdout.includes("actionable-candidates-available"), true);
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "governance", "evolution-actions.json")),
    true
  );
});
