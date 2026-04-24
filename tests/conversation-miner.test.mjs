import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SESSION_SUMMARY_START_MARKER, SESSION_SUMMARY_END_MARKER } from "../src/conversation-miner/protocol.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "bin", "power-ai-skills.mjs");

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function installLocalCliShim(projectRoot) {
  const binRoot = path.join(projectRoot, "node_modules", ".bin");
  const shimPath = path.join(binRoot, "power-ai-skills.cmd");
  writeFile(
    shimPath,
    `@echo off\r\n"${process.execPath}" "${cliPath}" %*\r\n`
  );
}

function createConversationProject(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-conversation-"));
  const projectRoot = path.join(tempRoot, "conversation-project");
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  writeFile(
    path.join(projectRoot, "package.json"),
    JSON.stringify(
      {
        name: "conversation-project",
        version: "1.0.0",
        private: true
      },
      null,
      2
    )
  );

  return { tempRoot, projectRoot };
}

function installWrapperPromotionApplySourceFiles(projectRoot) {
  writeFile(
    path.join(projectRoot, "src", "conversation-miner", "wrappers.mjs"),
    `export const supportedCaptureWrappers = [
  {
    toolName: "codex",
    displayName: "Codex",
    commandName: "codex-capture-session",
    integrationStyle: "terminal"
  }
];

export function getCaptureWrapper(toolName) {
  return supportedCaptureWrappers.find((item) => item.toolName === String(toolName || "").trim().toLowerCase()) || null;
}
`
  );

  writeFile(
    path.join(projectRoot, "src", "commands", "project-commands.mjs"),
    `export function createProjectCommands({ conversationMinerService }) {
  async function toolCaptureSessionCommand() {
    await conversationMinerService.prepareSessionCapture();
  }

  return {
    toolCaptureSessionCommand
  };
}
`
  );

  writeFile(
    path.join(projectRoot, "src", "commands", "index.mjs"),
    `export function createCommandRunner({ cliArgs, projectCommands }) {
  async function execute() {
    if (cliArgs.command === "sync") await projectCommands.syncCommand();
    else if (cliArgs.command === "tool-capture-session") await projectCommands.toolCaptureSessionCommand();
  }

  return { execute };
}
`
  );

  writeFile(
    path.join(projectRoot, "src", "selection", "cli.mjs"),
    `import path from "node:path";

export function resolveProjectRoot({ cliArgs, cwd = process.cwd() }) {
  if (["tool-capture-session", "materialize-wrapper-promotion"].includes(cliArgs.command)) return path.resolve(cwd);
  return path.resolve(cwd);
}
`
  );

  writeFile(
    path.join(projectRoot, "src", "conversation-miner", "index.mjs"),
    `import fs from "node:fs";
import path from "node:path";

function writeTextIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) return;
  fs.writeFileSync(filePath, content, "utf8");
}

function buildHostBridgeExampleScript({ toolName, displayName }) {
  return toolName + ":" + displayName;
}

export function createConversationMinerService({ projectRoot }) {
  function getPaths() {
    return {
      adaptersTarget: path.join(projectRoot, ".power-ai", "adapters")
    };
  }

  function ensureConversationRoots() {
    const paths = getPaths();
    return paths;
  }

  return { ensureConversationRoots };
}
`
  );

  writeFile(
    path.join(projectRoot, "tests", "conversation-miner.test.mjs"),
    `import test from "node:test";

test("existing conversation miner test", () => {});
`
  );

  writeFile(
    path.join(projectRoot, "tests", "selection.test.mjs"),
    `import test from "node:test";

test("existing selection test", () => {});
`
  );
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

function runCliWithInput(projectRoot, command, extraArgs = [], input = "") {
  return spawnSync(
    process.execPath,
    [cliPath, command, "--project", projectRoot, ...extraArgs],
    {
      cwd: root,
      encoding: "utf8",
      input
    }
  );
}

function runPowerShellScript(projectRoot, scriptPath, extraArgs = []) {
  return spawnSync(
    "powershell",
    ["-ExecutionPolicy", "Bypass", "-File", scriptPath, ...extraArgs],
    {
      cwd: projectRoot,
      encoding: "utf8"
    }
  );
}

function buildWrapperResponse({
  timestamp,
  sceneType,
  userIntent,
  mainObject,
  treeObject = "",
  operations,
  generatedFile,
  customizations
}) {
  const entities = treeObject
    ? `{
        "mainObject": "${mainObject}",
        "treeObject": "${treeObject}",
        "operations": ${JSON.stringify(operations)}
      }`
    : `{
        "mainObject": "${mainObject}",
        "operations": ${JSON.stringify(operations)}
      }`;

  return `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "${timestamp}",
      "sceneType": "${sceneType}",
      "userIntent": "${userIntent}",
      "skillsUsed": ["dialog-skill", "form-skill", "api-skill"],
      "entities": ${entities},
      "generatedFiles": ["${generatedFile}"],
      "customizations": ${JSON.stringify(customizations)},
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`;
}

test("capture-session, analyze-patterns, and generate-project-skill work end to end", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const summaryPath = path.join(tempRoot, "session-summary.json");

  writeFile(
    summaryPath,
    JSON.stringify(
      {
        records: [
          {
            timestamp: "2026-03-13T10:30:00+08:00",
            toolUsed: "cursor",
            sceneType: "tree-list-page",
            userIntent: "部门用户管理页面，联系 alice@example.com 跟进",
            skillsUsed: ["tree-list-page", "dialog-skill", "api-skill", "message-skill"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["新增", "编辑", "删除"]
            },
            generatedFiles: [
              path.join(projectRoot, "src", "views", "department-user", "index.vue"),
              path.join(projectRoot, "src", "api", "department-user.ts")
            ],
            customizations: ["树节点点击后刷新列表", "弹窗表单维护用户信息"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-13T11:00:00+08:00",
            toolUsed: "cursor",
            sceneType: "tree-list-page",
            userIntent: "组织成员管理页面",
            skillsUsed: ["tree-list-page", "dialog-skill", "api-skill"],
            entities: {
              mainObject: "成员",
              treeObject: "组织",
              operations: ["新增", "编辑", "删除"]
            },
            generatedFiles: ["src/views/org-member/index.vue"],
            customizations: ["树节点点击后刷新列表", "弹窗表单维护用户信息"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-14T09:00:00+08:00",
            toolUsed: "codex",
            sceneType: "tree-list-page",
            userIntent: "部门用户维护",
            skillsUsed: ["tree-list-page", "dialog-skill", "message-skill"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["新增", "编辑", "删除", "查看"]
            },
            generatedFiles: ["src/views/dept-user/index.vue"],
            customizations: ["树节点点击后刷新列表", "弹窗表单维护用户信息"],
            complexity: "high"
          }
        ]
      },
      null,
      2
    )
  );

  const captureResult = runCli(projectRoot, "capture-session", ["--input", summaryPath]);
  assert.equal(captureResult.status, 0, captureResult.stderr);

  const dayOnePayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-13.json"), "utf8")
  );
  const dayTwoPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-14.json"), "utf8")
  );

  assert.equal(dayOnePayload.records.length, 2);
  assert.equal(dayTwoPayload.records.length, 1);
  assert.equal(dayOnePayload.records[0].userIntent.includes("[redacted-email]"), true);
  assert.equal(dayOnePayload.records[0].generatedFiles.includes("src/views/department-user/index.vue"), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "proposals", "README.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "notifications", "README.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "shared", "conversation-capture.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "references", "conversation-capture-contract.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "trae-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "custom-tool-capture.example.ps1")), true);

  const analyzeResult = runCli(projectRoot, "analyze-patterns");
  assert.equal(analyzeResult.status, 0, analyzeResult.stderr);

  const patternsPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json"), "utf8")
  );
  const decisionLedger = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json"), "utf8")
  );
  const summaryReport = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "reports", "conversation-patterns-summary.md"),
    "utf8"
  );
  const treeListPattern = patternsPayload.patterns.find((pattern) => pattern.sceneType === "tree-list-page");

  assert.equal(patternsPayload.summary.recordCount, 3);
  assert.equal(patternsPayload.summary.generate, 1);
  assert.equal(treeListPattern.id, "pattern_tree_list_page");
  assert.equal(treeListPattern.recommendation, "generate");
  assert.equal(treeListPattern.candidateSkill.name, "tree-list-page-conversation-project");
  assert.equal(treeListPattern.commonSkills.includes("tree-list-page"), true);
  assert.equal(treeListPattern.mainObjects.includes("用户"), true);
  assert.equal(treeListPattern.treeObjects.includes("部门"), true);
  assert.equal(treeListPattern.customizations.includes("树节点点击后刷新列表"), true);
  assert.equal(summaryReport.includes("Conversation Pattern Summary"), true);
  assert.equal(decisionLedger.decisions.length, 1);
  assert.equal(decisionLedger.decisions[0].patternId, "pattern_tree_list_page");
  assert.equal(decisionLedger.decisions[0].decision, "detected");

  const generateResult = runCli(projectRoot, "generate-project-skill", ["--pattern", "pattern_tree_list_page"]);
  assert.equal(generateResult.status, 0, generateResult.stderr);

  const skillRoot = path.join(
    projectRoot,
    ".power-ai",
    "skills",
    "project-local",
    "auto-generated",
    "tree-list-page-conversation-project"
  );
  const meta = JSON.parse(fs.readFileSync(path.join(skillRoot, "skill.meta.json"), "utf8"));
  const skillMd = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");

  assert.equal(meta.source, "conversation-miner");
  assert.equal(meta.patternId, "pattern_tree_list_page");
  assert.equal(meta.baseSkill, "tree-list-page");
  assert.equal(skillMd.includes("project-patterns.json"), true);

  const promotedLedger = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json"), "utf8")
  );
  const promotedDecision = promotedLedger.decisions.find((item) => item.patternId === "pattern_tree_list_page");
  assert.equal(promotedDecision.decision, "promoted");
  assert.equal(promotedDecision.target, "project-local-skill");

  const promotionTrace = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "promotion-trace.json"), "utf8")
  );
  const projectSkillTrace = promotionTrace.relations.find((item) => item.relationType === "pattern->project-skill");
  assert.equal(projectSkillTrace.source.id, "pattern_tree_list_page");
  assert.equal(projectSkillTrace.target.id, "tree-list-page-conversation-project");
  assert.equal(projectSkillTrace.metadata.decision, "promoted");
});

test("conversation pattern merge, archive, and restore update governance and active pattern outputs", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const summaryPath = path.join(tempRoot, "conversation-pattern-governance.json");

  writeFile(
    summaryPath,
    JSON.stringify(
      {
        records: [
          {
            timestamp: "2026-03-15T09:00:00+08:00",
            toolUsed: "cursor",
            sceneType: "tree-list-page",
            userIntent: "组织成员树列表维护",
            skillsUsed: ["tree-list-page", "dialog-skill"],
            entities: {
              mainObject: "成员",
              treeObject: "组织",
              operations: ["新增", "编辑"]
            },
            generatedFiles: ["src/views/org-member/index.vue"],
            customizations: ["切换树节点后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-15T10:00:00+08:00",
            toolUsed: "cursor",
            sceneType: "tree-list-page",
            userIntent: "部门成员树列表维护",
            skillsUsed: ["tree-list-page", "api-skill"],
            entities: {
              mainObject: "成员",
              treeObject: "部门",
              operations: ["新增", "删除"]
            },
            generatedFiles: ["src/views/dept-member/index.vue"],
            customizations: ["切换树节点后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-15T11:00:00+08:00",
            toolUsed: "codex",
            sceneType: "dialog-form",
            userIntent: "新增成员弹窗表单",
            skillsUsed: ["dialog-skill", "form-skill"],
            entities: {
              mainObject: "成员",
              operations: ["新增", "保存"]
            },
            generatedFiles: ["src/views/org-member/dialog.vue"],
            customizations: ["保存后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-15T12:00:00+08:00",
            toolUsed: "codex",
            sceneType: "dialog-form",
            userIntent: "编辑成员弹窗表单",
            skillsUsed: ["dialog-skill", "form-skill"],
            entities: {
              mainObject: "成员",
              operations: ["编辑", "保存"]
            },
            generatedFiles: ["src/views/org-member/edit-dialog.vue"],
            customizations: ["保存后刷新列表"],
            complexity: "medium"
          }
        ]
      },
      null,
      2
    )
  );

  assert.equal(runCli(projectRoot, "capture-session", ["--input", summaryPath]).status, 0);
  const analyzeResult = runCli(projectRoot, "analyze-patterns", ["--json"]);
  assert.equal(analyzeResult.status, 0, analyzeResult.stderr);
  const initialPayload = JSON.parse(analyzeResult.stdout);
  assert.equal(initialPayload.patterns.some((pattern) => pattern.id === "pattern_tree_list_page"), true);
  assert.equal(initialPayload.patterns.some((pattern) => pattern.id === "pattern_dialog_form"), true);

  const reviewResult = runCli(projectRoot, "review-conversation-pattern", [
    "--pattern",
    "pattern_dialog_form",
    "--accept",
    "--target",
    "docs",
    "--reason",
    "document this flow before promoting it to a reusable skill",
    "--json"
  ]);
  assert.equal(reviewResult.status, 0, reviewResult.stderr);
  const reviewPayload = JSON.parse(reviewResult.stdout);
  assert.equal(reviewPayload.decision, "accepted");
  assert.equal(reviewPayload.target, "docs");

  const scaffoldResult = runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "pattern-linked-tool",
    "--pattern",
    "pattern_tree_list_page",
    "--json"
  ]);
  assert.equal(scaffoldResult.status, 0, scaffoldResult.stderr);
  const scaffoldPayload = JSON.parse(scaffoldResult.stdout);
  assert.equal(scaffoldPayload.sourcePatternId, "pattern_tree_list_page");

  const promotionTrace = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "promotion-trace.json"), "utf8")
  );
  const wrapperTrace = promotionTrace.relations.find((item) => item.relationType === "pattern->wrapper-proposal");
  assert.equal(wrapperTrace.source.id, "pattern_tree_list_page");
  assert.equal(wrapperTrace.target.id, "pattern-linked-tool");

  const mergeResult = runCli(projectRoot, "merge-conversation-pattern", [
    "--source",
    "pattern_dialog_form",
    "--target",
    "pattern_tree_list_page",
    "--note",
    "treat dialog flow as part of tree list delivery",
    "--json"
  ]);
  assert.equal(mergeResult.status, 0, mergeResult.stderr);
  const mergePayload = JSON.parse(mergeResult.stdout);
  assert.equal(mergePayload.sourcePatternId, "pattern_dialog_form");
  assert.equal(mergePayload.targetPatternId, "pattern_tree_list_page");

  const mergedPatternsPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json"), "utf8")
  );
  const mergedTreeListPattern = mergedPatternsPayload.patterns.find((pattern) => pattern.id === "pattern_tree_list_page");
  const mergedDecisionLedger = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json"), "utf8")
  );
  const mergedSourceDecision = mergedDecisionLedger.decisions.find((item) => item.patternId === "pattern_dialog_form");
  assert.equal(mergedPatternsPayload.patterns.some((pattern) => pattern.id === "pattern_dialog_form"), false);
  assert.equal(mergedTreeListPattern.frequency, 4);
  assert.deepEqual(mergedTreeListPattern.mergedFromSceneTypes, ["dialog-form"]);
  assert.deepEqual(mergedTreeListPattern.sourceSceneTypes, ["dialog-form", "tree-list-page"]);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "patterns", "pattern-governance.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "conversation-pattern-governance.md")), true);
  assert.equal(mergedSourceDecision.decision, "archived");
  assert.equal(mergedSourceDecision.trace.mergedIntoPatternId, "pattern_tree_list_page");

  const archiveResult = runCli(projectRoot, "archive-conversation-pattern", [
    "--pattern",
    "pattern_tree_list_page",
    "--note",
    "temporarily hide merged tree-list aggregate",
    "--json"
  ]);
  assert.equal(archiveResult.status, 0, archiveResult.stderr);
  const archivePayload = JSON.parse(archiveResult.stdout);
  assert.equal(archivePayload.patternId, "pattern_tree_list_page");

  const archivedPatternsPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json"), "utf8")
  );
  const archivedDecisionLedger = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json"), "utf8")
  );
  assert.equal(archivedPatternsPayload.patterns.some((pattern) => pattern.id === "pattern_tree_list_page"), false);
  assert.equal(archivedPatternsPayload.summary.archivedPatterns, 1);
  assert.equal(
    archivedDecisionLedger.decisions.find((item) => item.patternId === "pattern_tree_list_page").decision,
    "archived"
  );

  const restoreTargetResult = runCli(projectRoot, "restore-conversation-pattern", [
    "--pattern",
    "pattern_tree_list_page",
    "--note",
    "re-enable merged tree-list aggregate",
    "--json"
  ]);
  assert.equal(restoreTargetResult.status, 0, restoreTargetResult.stderr);
  const restoreTargetPayload = JSON.parse(restoreTargetResult.stdout);
  assert.deepEqual(restoreTargetPayload.restoredTypes, ["archive"]);

  const restoredMergedPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json"), "utf8")
  );
  assert.equal(restoredMergedPayload.patterns.some((pattern) => pattern.id === "pattern_tree_list_page"), true);
  assert.equal(restoredMergedPayload.patterns.some((pattern) => pattern.id === "pattern_dialog_form"), false);

  const restoreSourceResult = runCli(projectRoot, "restore-conversation-pattern", [
    "--pattern",
    "pattern_dialog_form",
    "--note",
    "split dialog flow back out",
    "--json"
  ]);
  assert.equal(restoreSourceResult.status, 0, restoreSourceResult.stderr);
  const restoreSourcePayload = JSON.parse(restoreSourceResult.stdout);
  assert.deepEqual(restoreSourcePayload.restoredTypes, ["merge"]);

  const restoredPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json"), "utf8")
  );
  const treeListPattern = restoredPayload.patterns.find((pattern) => pattern.id === "pattern_tree_list_page");
  const dialogPattern = restoredPayload.patterns.find((pattern) => pattern.id === "pattern_dialog_form");
  assert.equal(treeListPattern.frequency, 2);
  assert.equal(dialogPattern.frequency, 2);

  const governance = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "patterns", "pattern-governance.json"), "utf8")
  );
  const restoredDecisionLedger = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json"), "utf8")
  );
  assert.equal(governance.merges.length, 0);
  assert.equal(governance.archives.length, 0);
  assert.equal(governance.history.some((item) => item.type === "merge"), true);
  assert.equal(governance.history.some((item) => item.type === "archive"), true);
  assert.equal(governance.history.some((item) => item.type === "restore" && item.patternId === "pattern_dialog_form"), true);
  assert.equal(
    restoredDecisionLedger.decisions.find((item) => item.patternId === "pattern_dialog_form").decision,
    "review"
  );
});

test("evaluate-session-capture filters policy-blocked duplicate and already-covered summaries before capture", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const inputPath = path.join(tempRoot, "gated-session-summary.json");

  writeFile(
    path.join(projectRoot, ".power-ai", "conversations", "2026-03-18.json"),
    JSON.stringify(
      {
        date: "2026-03-18",
        records: [
          {
            id: "conv_20260318_001",
            timestamp: "2026-03-18T10:00:00+08:00",
            toolUsed: "cursor",
            sceneType: "tree-list-page",
            userIntent: "部门用户管理页面",
            skillsUsed: ["tree-list-page", "dialog-skill", "api-skill"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["新增", "编辑", "删除"]
            },
            generatedFiles: ["src/views/department-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium",
            source: "manual-summary"
          }
        ]
      },
      null,
      2
    )
  );

  writeFile(
    path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated", "tree-list-page-conversation-project", "skill.meta.json"),
    JSON.stringify(
      {
        name: "tree-list-page-conversation-project",
        source: "conversation-miner",
        sceneType: "tree-list-page",
        operations: ["新增", "编辑", "删除"],
        customizations: ["树节点点击后刷新列表"],
        mainObjects: ["用户"],
        treeObjects: ["部门"]
      },
      null,
      2
    )
  );

  writeFile(
    inputPath,
    JSON.stringify(
      {
        records: [
          {
            timestamp: "2026-03-19T09:00:00+08:00",
            toolUsed: "cursor",
            sceneType: "general-discussion",
            userIntent: "解释一下 pnpm 和 npm 的区别",
            skillsUsed: [],
            entities: {},
            generatedFiles: [],
            customizations: [],
            complexity: "low"
          },
          {
            timestamp: "2026-03-19T10:00:00+08:00",
            toolUsed: "cursor",
            sceneType: "tree-list-page",
            userIntent: "部门用户管理页面",
            skillsUsed: ["tree-list-page", "dialog-skill", "api-skill"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["新增", "编辑", "删除"]
            },
            generatedFiles: ["src/views/department-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-19T11:00:00+08:00",
            toolUsed: "cursor",
            sceneType: "tree-list-page",
            userIntent: "继续按照项目既有树列表规则实现",
            skillsUsed: ["tree-list-page", "dialog-skill"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["新增", "编辑", "删除"]
            },
            generatedFiles: ["src/views/dept-user/index.vue"],
            customizations: ["树节点点击后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-19T12:00:00+08:00",
            toolUsed: "codex",
            sceneType: "tree-list-page",
            userIntent: "新增部门用户批量导入流程",
            skillsUsed: ["tree-list-page", "dialog-skill", "api-skill"],
            entities: {
              mainObject: "用户",
              treeObject: "部门",
              operations: ["新增", "导入"]
            },
            generatedFiles: ["src/views/dept-user/import.vue"],
            customizations: ["树节点点击后刷新列表", "支持批量导入"],
            complexity: "high"
          }
        ]
      },
      null,
      2
    )
  );

  const evaluateResult = runCli(projectRoot, "evaluate-session-capture", ["--input", inputPath]);
  assert.equal(evaluateResult.status, 0, evaluateResult.stderr);
  const evaluationPayload = JSON.parse(evaluateResult.stdout);

  assert.equal(evaluationPayload.overallDecision, "ask_capture");
  assert.equal(evaluationPayload.summary.askCapture, 1);
  assert.equal(evaluationPayload.summary.skipIrrelevant, 0);
  assert.equal(evaluationPayload.summary.skipSensitive, 1);
  assert.equal(evaluationPayload.summary.skipDuplicate, 1);
  assert.equal(evaluationPayload.summary.skipAlreadyCovered, 1);
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "session-capture-evaluation.md")),
    true
  );

  const captureResult = runCli(projectRoot, "capture-session", ["--input", inputPath]);
  assert.equal(captureResult.status, 0, captureResult.stderr);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-19.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].customizations.includes("支持批量导入"), true);
});
test("capture-session extracts marked summary blocks from AI response text files and stdin", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "assistant-response.txt");
  const extractedPath = path.join(projectRoot, ".power-ai", "tmp", "captured-summary.json");
  const responseBlock = `${SESSION_SUMMARY_START_MARKER}
\`\`\`json
{
  "records": [
    {
      "timestamp": "2026-03-20T09:30:00+08:00",
      "toolUsed": "codex",
      "sceneType": "dialog-form",
      "userIntent": "新增组织成员弹窗流程",
      "skillsUsed": ["dialog-skill", "form-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "operations": ["新增", "保存"]
      },
      "generatedFiles": ["src/views/org-member/dialog.vue"],
      "customizations": ["弹窗保存后刷新列表", "回显部门默认值"],
      "complexity": "medium"
    }
  ]
}
\`\`\`
${SESSION_SUMMARY_END_MARKER}`;

  writeFile(
    responsePath,
    [
      "任务已完成。",
      "",
      "如果你确认收集，请使用下面的摘要块：",
      "",
      responseBlock,
      "",
      "其余说明文本不应进入 conversations。"
    ].join("\n")
  );

  const evaluateFromFile = runCli(projectRoot, "evaluate-session-capture", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--save-extracted",
    extractedPath
  ]);
  assert.equal(evaluateFromFile.status, 0, evaluateFromFile.stderr);
  const evaluationPayload = JSON.parse(evaluateFromFile.stdout);
  assert.equal(evaluationPayload.summary.askCapture, 1);
  assert.equal(evaluationPayload.source.extractedMarkedBlock, true);
  assert.equal(fs.existsSync(extractedPath), true);

  const captureFromStdin = runCliWithInput(
    projectRoot,
    "capture-session",
    ["--stdin", "--extract-marked-block", "--json"],
    `前置说明\n${responseBlock}\n后置说明`
  );
  assert.equal(captureFromStdin.status, 0, captureFromStdin.stderr);
  const capturePayload = JSON.parse(captureFromStdin.stdout);
  assert.equal(capturePayload.recordsAdded, 1);
  assert.equal(capturePayload.evaluation.source.type, "stdin");

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-20.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].sceneType, "dialog-form");
  assert.equal(dayPayload.records[0].customizations.includes("弹窗保存后刷新列表"), true);
});

test("prepare-session-capture and confirm-session-capture support wrapper-style confirmation flow", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "assistant-response-confirmation.txt");
  const responseBlock = `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-21T10:00:00+08:00",
      "toolUsed": "codex",
      "sceneType": "tree-list-page",
      "userIntent": "新增组织成员树列表页面并沉淀项目经验",
      "skillsUsed": ["tree-list-page", "dialog-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "treeObject": "组织",
        "operations": ["新增", "编辑", "删除"]
      },
      "generatedFiles": ["src/views/org-member/index.vue"],
      "customizations": ["树节点切换后刷新成员列表", "弹窗保存后刷新树和列表"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`;
  writeFile(responsePath, `任务完成。\n\n${responseBlock}\n`);

  const prepareResult = runCli(projectRoot, "prepare-session-capture", [
    "--from-file",
    responsePath,
    "--extract-marked-block"
  ]);
  assert.equal(prepareResult.status, 0, prepareResult.stderr);
  const preparePayload = JSON.parse(prepareResult.stdout);

  assert.equal(preparePayload.shouldPrompt, true);
  assert.equal(preparePayload.summary.askCapture, 1);
  assert.equal(Boolean(preparePayload.requestId), true);
  assert.equal(fs.existsSync(preparePayload.pendingFilePath), true);

  const confirmResult = runCli(projectRoot, "confirm-session-capture", [
    "--request",
    preparePayload.requestId,
    "--json"
  ]);
  assert.equal(confirmResult.status, 0, confirmResult.stderr);
  const confirmPayload = JSON.parse(confirmResult.stdout);

  assert.equal(confirmPayload.status, "captured");
  assert.equal(confirmPayload.recordsAdded, 1);
  assert.equal(fs.existsSync(preparePayload.pendingFilePath), false);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-21.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].sceneType, "tree-list-page");
});

test("confirm-session-capture --reject drops pending request without writing conversations", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "assistant-response-reject.txt");
  const responseBlock = `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-22T10:00:00+08:00",
      "toolUsed": "cursor",
      "sceneType": "dialog-form",
      "userIntent": "新增成员弹窗并评估是否沉淀",
      "skillsUsed": ["dialog-skill", "form-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "operations": ["新增", "保存"]
      },
      "generatedFiles": ["src/views/member/dialog.vue"],
      "customizations": ["保存后刷新列表", "关闭前重置表单"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`;
  writeFile(responsePath, responseBlock);

  const prepareResult = runCli(projectRoot, "prepare-session-capture", [
    "--from-file",
    responsePath,
    "--extract-marked-block"
  ]);
  assert.equal(prepareResult.status, 0, prepareResult.stderr);
  const preparePayload = JSON.parse(prepareResult.stdout);

  const rejectResult = runCli(projectRoot, "confirm-session-capture", [
    "--request",
    preparePayload.requestId,
    "--reject",
    "--json"
  ]);
  assert.equal(rejectResult.status, 0, rejectResult.stderr);
  const rejectPayload = JSON.parse(rejectResult.stdout);

  assert.equal(rejectPayload.status, "rejected");
  assert.equal(fs.existsSync(preparePayload.pendingFilePath), false);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-22.json")), false);
});

test("codex-capture-session auto-confirms with --yes and captures records in one command", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "codex-response.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-23T11:00:00+08:00",
      "sceneType": "dialog-form",
      "userIntent": "新增成员编辑弹窗并沉淀经验",
      "skillsUsed": ["dialog-skill", "form-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "operations": ["新增", "编辑", "保存"]
      },
      "generatedFiles": ["src/views/member/dialog.vue"],
      "customizations": ["保存后刷新列表", "关闭时重置表单"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "codex-capture-session", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--yes",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.tool, "codex");
  assert.equal(payload.decision, "captured");
  assert.equal(payload.resolved.recordsAdded, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-23.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "codex");
});

test("codex-capture-session can reject capture without leaving pending state", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "codex-response-reject.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-24T11:00:00+08:00",
      "sceneType": "tree-list-page",
      "userIntent": "新增组织成员树页面",
      "skillsUsed": ["tree-list-page", "dialog-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "treeObject": "组织",
        "operations": ["新增", "编辑"]
      },
      "generatedFiles": ["src/views/org-member/index.vue"],
      "customizations": ["切换组织刷新列表", "保存后刷新树"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "codex-capture-session", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--reject",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.decision, "rejected");
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-24.json")), false);
  const pendingRoot = path.join(projectRoot, ".power-ai", "pending-captures");
  const pendingFiles = fs.existsSync(pendingRoot) ? fs.readdirSync(pendingRoot).filter((fileName) => fileName.endsWith(".json")) : [];
  assert.equal(pendingFiles.length, 0);
});

test("trae-capture-session auto-confirms with --yes and captures records in one command", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "trae-response.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-24T15:00:00+08:00",
      "sceneType": "tree-list-page",
      "userIntent": "新增用户管理界面并确认沉淀项目经验",
      "skillsUsed": ["tree-list-page", "dialog-skill", "api-skill"],
      "entities": {
        "mainObject": "用户",
        "treeObject": "部门",
        "operations": ["新增", "编辑", "删除"]
      },
      "generatedFiles": ["src/views/user/index.vue"],
      "customizations": ["点击部门后刷新用户列表", "保存后刷新树和列表"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "trae-capture-session", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--yes",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.tool, "trae");
  assert.equal(payload.decision, "captured");
  assert.equal(payload.resolved.recordsAdded, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-24.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "trae");
});

test("trae-capture-session can reject capture without leaving pending state", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "trae-response-reject.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-24T16:00:00+08:00",
      "sceneType": "dialog-form",
      "userIntent": "新增用户弹窗流程",
      "skillsUsed": ["dialog-skill", "form-skill", "api-skill"],
      "entities": {
        "mainObject": "用户",
        "operations": ["新增", "保存"]
      },
      "generatedFiles": ["src/views/user/dialog.vue"],
      "customizations": ["关闭前重置表单", "保存后刷新列表"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "trae-capture-session", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--reject",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.tool, "trae");
  assert.equal(payload.decision, "rejected");
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-24.json")), false);
  const pendingRoot = path.join(projectRoot, ".power-ai", "pending-captures");
  const pendingFiles = fs.existsSync(pendingRoot) ? fs.readdirSync(pendingRoot).filter((fileName) => fileName.endsWith(".json")) : [];
  assert.equal(pendingFiles.length, 0);
});

test("cursor-capture-session auto-confirms with --yes and captures records in one command", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "cursor-response.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-25T11:00:00+08:00",
      "sceneType": "tree-list-page",
      "userIntent": "新增组织成员树页面并沉淀经验",
      "skillsUsed": ["tree-list-page", "dialog-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "treeObject": "组织",
        "operations": ["新增", "编辑", "删除"]
      },
      "generatedFiles": ["src/views/org-member/index.vue"],
      "customizations": ["切换组织刷新列表", "保存后刷新树和列表"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "cursor-capture-session", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--yes",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.tool, "cursor");
  assert.equal(payload.decision, "captured");
  assert.equal(payload.resolved.recordsAdded, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-25.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "cursor");
});

test("cursor-capture-session can reject capture without leaving pending state", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "cursor-response-reject.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-26T11:00:00+08:00",
      "sceneType": "dialog-form",
      "userIntent": "新增成员弹窗流程",
      "skillsUsed": ["dialog-skill", "form-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "operations": ["新增", "保存"]
      },
      "generatedFiles": ["src/views/member/dialog.vue"],
      "customizations": ["保存后刷新列表", "关闭前重置表单"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "cursor-capture-session", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--reject",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.tool, "cursor");
  assert.equal(payload.decision, "rejected");
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-26.json")), false);
  const pendingRoot = path.join(projectRoot, ".power-ai", "pending-captures");
  const pendingFiles = fs.existsSync(pendingRoot) ? fs.readdirSync(pendingRoot).filter((fileName) => fileName.endsWith(".json")) : [];
  assert.equal(pendingFiles.length, 0);
});

test("claude-code-capture-session auto-confirms with --yes and captures records in one command", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "claude-code-response.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-27T11:00:00+08:00",
      "sceneType": "dialog-form",
      "userIntent": "新增成员审批弹窗并沉淀经验",
      "skillsUsed": ["dialog-skill", "form-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "operations": ["新增", "审批", "保存"]
      },
      "generatedFiles": ["src/views/member/approval-dialog.vue"],
      "customizations": ["审批通过后刷新列表", "关闭前重置审批意见"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "claude-code-capture-session", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--yes",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.tool, "claude-code");
  assert.equal(payload.decision, "captured");
  assert.equal(payload.resolved.recordsAdded, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-27.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "claude-code");
});

test("claude-code-capture-session can reject capture without leaving pending state", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "claude-code-response-reject.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-28T11:00:00+08:00",
      "sceneType": "tree-list-page",
      "userIntent": "新增部门成员树列表页面",
      "skillsUsed": ["tree-list-page", "dialog-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "treeObject": "部门",
        "operations": ["新增", "编辑"]
      },
      "generatedFiles": ["src/views/dept-member/index.vue"],
      "customizations": ["切换部门刷新列表", "保存后刷新树"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "claude-code-capture-session", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--reject",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.tool, "claude-code");
  assert.equal(payload.decision, "rejected");
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "conversations", "2026-03-28.json")), false);
  const pendingRoot = path.join(projectRoot, ".power-ai", "pending-captures");
  const pendingFiles = fs.existsSync(pendingRoot) ? fs.readdirSync(pendingRoot).filter((fileName) => fileName.endsWith(".json")) : [];
  assert.equal(pendingFiles.length, 0);
});

test("tool-capture-session routes to supported wrappers through a single adapter entry", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "tool-wrapper-response.txt");
  writeFile(
    responsePath,
    `${SESSION_SUMMARY_START_MARKER}
{
  "records": [
    {
      "timestamp": "2026-03-29T11:00:00+08:00",
      "sceneType": "dialog-form",
      "userIntent": "新增成员审批弹窗流程",
      "skillsUsed": ["dialog-skill", "form-skill", "api-skill"],
      "entities": {
        "mainObject": "成员",
        "operations": ["新增", "审批", "保存"]
      },
      "generatedFiles": ["src/views/member/approval-dialog.vue"],
      "customizations": ["审批通过后刷新列表", "关闭前重置审批意见"],
      "complexity": "medium"
    }
  ]
}
${SESSION_SUMMARY_END_MARKER}`
  );

  const result = runCli(projectRoot, "tool-capture-session", [
    "--tool",
    "trae",
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--yes",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.tool, "trae");
  assert.equal(payload.decision, "captured");
  assert.equal(payload.resolved.recordsAdded, 1);
});

test("tool-capture-session rejects unsupported tools", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "unsupported-tool-response.txt");
  writeFile(responsePath, "{}");

  const result = runCli(projectRoot, "tool-capture-session", [
    "--tool",
    "custom-ai",
    "--from-file",
    responsePath,
    "--json"
  ]);

  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes("tool-capture-session does not support tool"), true);
});

test("submit-auto-capture can queue and consume a confirmed summary through the inbox runtime", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "auto-capture-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-04T11:00:00+08:00",
      sceneType: "dialog-form",
      userIntent: "自动收集成员编辑弹窗经验",
      mainObject: "成员",
      operations: ["新增", "编辑", "保存"],
      generatedFile: "src/views/member/auto-dialog.vue",
      customizations: ["保存后刷新列表", "关闭前重置表单"]
    })
  );

  const submitResult = runCli(projectRoot, "submit-auto-capture", [
    "--tool",
    "trae",
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--json"
  ]);
  assert.equal(submitResult.status, 0, submitResult.stderr);
  const submitPayload = JSON.parse(submitResult.stdout);

  assert.equal(submitPayload.submitted, true);
  assert.equal(Boolean(submitPayload.requestId), true);
  assert.equal(fs.existsSync(submitPayload.queueFilePath), true);

  const consumeResult = runCli(projectRoot, "consume-auto-capture-inbox", [
    "--request",
    submitPayload.requestId,
    "--json"
  ]);
  assert.equal(consumeResult.status, 0, consumeResult.stderr);
  const consumePayload = JSON.parse(consumeResult.stdout);

  assert.equal(consumePayload.processedCount, 1);
  assert.equal(consumePayload.failedCount, 0);
  assert.equal(fs.existsSync(submitPayload.queueFilePath), false);
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "auto-capture", "processed", `${submitPayload.requestId}.json`)),
    true
  );

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-04.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "trae");
});

test("submit-auto-capture with --consume-now captures immediately and watch-auto-capture-inbox --once stays idempotent", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "auto-capture-consume-now.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-05T11:00:00+08:00",
      sceneType: "tree-list-page",
      userIntent: "自动收集组织成员树列表经验",
      mainObject: "成员",
      treeObject: "组织",
      operations: ["新增", "编辑", "删除"],
      generatedFile: "src/views/member/auto-tree.vue",
      customizations: ["切换树节点后刷新列表", "保存后刷新树和列表"]
    })
  );

  const submitResult = runCli(projectRoot, "submit-auto-capture", [
    "--tool",
    "codex",
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--consume-now",
    "--json"
  ]);
  assert.equal(submitResult.status, 0, submitResult.stderr);
  const submitPayload = JSON.parse(submitResult.stdout);

  assert.equal(submitPayload.submitted, true);
  assert.equal(submitPayload.consumed.processedCount, 1);
  assert.equal(fs.existsSync(submitPayload.queueFilePath), false);

  const watchResult = runCli(projectRoot, "watch-auto-capture-inbox", [
    "--once",
    "--json"
  ]);
  assert.equal(watchResult.status, 0, watchResult.stderr);
  const watchPayload = JSON.parse(watchResult.stdout);

  assert.equal(watchPayload.responseInbox.processedCount, 0);
  assert.equal(watchPayload.responseInbox.failedCount, 0);
  assert.equal(watchPayload.captureInbox.processedCount, 0);
  assert.equal(watchPayload.captureInbox.failedCount, 0);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-05.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "codex");
});

test("prepare-session-capture exposes review boundary and still supports explicit confirmation for review-level records", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "review-boundary-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-10T11:00:00+08:00",
      sceneType: "architecture-review",
      userIntent: "review migration plan for deploy scripts",
      mainObject: "成员",
      operations: ["edit", "review"],
      generatedFile: "scripts/release/review-check.mjs",
      customizations: ["补充发布评审说明", "补充迁移验证步骤"]
    })
  );

  const prepareResult = runCli(projectRoot, "prepare-session-capture", [
    "--from-file",
    responsePath,
    "--extract-marked-block"
  ]);
  assert.equal(prepareResult.status, 0, prepareResult.stderr);
  const preparePayload = JSON.parse(prepareResult.stdout);

  assert.equal(preparePayload.shouldPrompt, true);
  assert.equal(preparePayload.summary.askReview, 1);
  assert.equal(preparePayload.reviewBoundary.reviewRequiredCount, 1);
  assert.equal(preparePayload.reviewBoundary.requiresManualConfirmation, true);

  const confirmResult = runCli(projectRoot, "confirm-session-capture", [
    "--request",
    preparePayload.requestId,
    "--json"
  ]);
  assert.equal(confirmResult.status, 0, confirmResult.stderr);
  const confirmPayload = JSON.parse(confirmResult.stdout);

  assert.equal(confirmPayload.status, "captured");
  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-10.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].captureAdmissionLevel, "review");
});

test("submit-auto-capture stops at review boundary instead of auto-consuming review-level records", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "review-auto-capture-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-11T11:00:00+08:00",
      sceneType: "architecture-review",
      userIntent: "review migration plan for deploy scripts",
      mainObject: "成员",
      operations: ["edit", "review"],
      generatedFile: "scripts/release/review-auto-check.mjs",
      customizations: ["补充发布评审说明", "补充迁移验证步骤"]
    })
  );

  const submitResult = runCli(projectRoot, "submit-auto-capture", [
    "--tool",
    "codex",
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--consume-now",
    "--json"
  ]);
  assert.equal(submitResult.status, 0, submitResult.stderr);
  const submitPayload = JSON.parse(submitResult.stdout);

  assert.equal(submitPayload.submitted, false);
  assert.equal(submitPayload.autoCaptureDecision, "review_required");
  assert.equal(submitPayload.reviewBoundary.reviewRequiredCount, 1);
  assert.equal(submitPayload.reviewBoundary.captureReadyCount, 0);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-11.json")), false);
  assert.equal(fs.readdirSync(path.join(projectRoot, ".power-ai", "auto-capture", "inbox")).filter((fileName) => fileName.endsWith(".json")).length, 0);
});

test("queue-auto-capture-response consume-now respects review boundary and does not auto-capture review-level records", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "review-response-inbox.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-12T11:00:00+08:00",
      sceneType: "architecture-review",
      userIntent: "review migration plan for deploy scripts",
      mainObject: "成员",
      operations: ["edit", "review"],
      generatedFile: "scripts/release/review-response-check.mjs",
      customizations: ["补充发布评审说明", "补充迁移验证步骤"]
    })
  );

  const queueResult = runCli(projectRoot, "queue-auto-capture-response", [
    "--tool",
    "trae",
    "--from-file",
    responsePath,
    "--consume-now",
    "--json"
  ]);
  assert.equal(queueResult.status, 0, queueResult.stderr);
  const queuePayload = JSON.parse(queueResult.stdout);

  assert.equal(queuePayload.queued, true);
  assert.equal(queuePayload.consumed.processedCount, 1);
  assert.equal(queuePayload.consumed.failedCount, 0);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-12.json")), false);

  const processedPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "auto-capture", "response-processed", `${queuePayload.requestId}.json`), "utf8")
  );
  assert.equal(processedPayload.submitted.submitted, false);
  assert.equal(processedPayload.submitted.autoCaptureDecision, "review_required");
  assert.equal(processedPayload.submitted.reviewBoundary.reviewRequiredCount, 1);
});

test("queue-auto-capture-response stores raw response payload and consume-auto-capture-response-inbox converts it into captured conversations", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "queued-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-06T11:00:00+08:00",
      sceneType: "dialog-form",
      userIntent: "响应投递目录自动收集成员弹窗经验",
      mainObject: "成员",
      operations: ["新增", "保存"],
      generatedFile: "src/views/member/response-inbox-dialog.vue",
      customizations: ["保存后刷新列表", "关闭前重置表单"]
    })
  );

  const queueResult = runCli(projectRoot, "queue-auto-capture-response", [
    "--tool",
    "trae",
    "--from-file",
    responsePath,
    "--json"
  ]);
  assert.equal(queueResult.status, 0, queueResult.stderr);
  const queuePayload = JSON.parse(queueResult.stdout);

  assert.equal(queuePayload.queued, true);
  assert.equal(fs.existsSync(queuePayload.queueFilePath), true);

  const consumeResult = runCli(projectRoot, "consume-auto-capture-response-inbox", [
    "--request",
    queuePayload.requestId,
    "--json"
  ]);
  assert.equal(consumeResult.status, 0, consumeResult.stderr);
  const consumePayload = JSON.parse(consumeResult.stdout);

  assert.equal(consumePayload.processedCount, 1);
  assert.equal(consumePayload.failedCount, 0);
  assert.equal(fs.existsSync(queuePayload.queueFilePath), false);
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "auto-capture", "response-processed", `${queuePayload.requestId}.json`)),
    true
  );

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-06.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "trae");
});

test("queue-auto-capture-response with --consume-now bridges raw response in one command", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "queue-consume-now-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-08T11:00:00+08:00",
      sceneType: "dialog-form",
      userIntent: "单命令桥接 GUI 回复自动收集",
      mainObject: "用户",
      operations: ["新增", "保存"],
      generatedFile: "src/views/user/queue-consume-now-dialog.vue",
      customizations: ["保存后刷新列表", "关闭前重置表单"]
    })
  );

  const queueResult = runCli(projectRoot, "queue-auto-capture-response", [
    "--tool",
    "windsurf",
    "--from-file",
    responsePath,
    "--consume-now",
    "--json"
  ]);
  assert.equal(queueResult.status, 0, queueResult.stderr);
  const queuePayload = JSON.parse(queueResult.stdout);

  assert.equal(queuePayload.queued, true);
  assert.equal(queuePayload.consumed.processedCount, 1);
  assert.equal(queuePayload.consumed.failedCount, 0);
  assert.equal(fs.existsSync(queuePayload.queueFilePath), false);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-08.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "windsurf");
});

test("trae-host-bridge example script turns a confirmed response file into captured conversations", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  installLocalCliShim(projectRoot);
  const initResult = runCli(projectRoot, "init", ["--tool", "trae", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const responsePath = path.join(tempRoot, "trae-host-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-09T11:00:00+08:00",
      sceneType: "tree-list-page",
      userIntent: "Trae 宿主桥接自动收集用户树列表经验",
      mainObject: "用户",
      treeObject: "部门",
      operations: ["新增", "编辑", "删除"],
      generatedFile: "src/views/system/user/index.vue",
      customizations: ["切换部门后刷新列表", "保存后刷新树和列表"]
    })
  );

  const bridgeScriptPath = path.join(projectRoot, ".power-ai", "adapters", "trae-host-bridge.example.ps1");
  const bridgeResult = runPowerShellScript(projectRoot, bridgeScriptPath, [
    "-ResponsePath",
    responsePath
  ]);
  assert.equal(bridgeResult.status, 0, bridgeResult.stderr);

  const bridgePayload = JSON.parse(bridgeResult.stdout);
  assert.equal(bridgePayload.queued, true);
  assert.equal(bridgePayload.consumed.processedCount, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-09.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "trae");
});

test("cursor-host-bridge example script turns clipboard or response text into captured conversations", (t) => {
  const { projectRoot } = createConversationProject(t);
  installLocalCliShim(projectRoot);
  const initResult = runCli(projectRoot, "init", ["--tool", "cursor", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const bridgeScriptPath = path.join(projectRoot, ".power-ai", "adapters", "cursor-host-bridge.example.ps1");
  const responseText = buildWrapperResponse({
    timestamp: "2026-04-10T11:00:00+08:00",
    sceneType: "dialog-form",
    userIntent: "Cursor 宿主桥接自动收集审批弹窗经验",
    mainObject: "审批单",
    operations: ["新增", "提交", "保存"],
    generatedFile: "src/views/workflow/approval/edit.vue",
    customizations: ["保存后刷新列表", "关闭前重置表单"]
  });

  const bridgeResult = runPowerShellScript(projectRoot, bridgeScriptPath, [
    "-ResponseText",
    responseText
  ]);
  assert.equal(bridgeResult.status, 0, bridgeResult.stderr);

  const bridgePayload = JSON.parse(bridgeResult.stdout);
  assert.equal(bridgePayload.queued, true);
  assert.equal(bridgePayload.consumed.processedCount, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-10.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "cursor");
});

test("windsurf-host-bridge example script turns a confirmed response file into captured conversations", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  installLocalCliShim(projectRoot);
  const initResult = runCli(projectRoot, "init", ["--tool", "windsurf", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const responsePath = path.join(tempRoot, "windsurf-host-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-11T11:00:00+08:00",
      sceneType: "basic-list-page",
      userIntent: "Windsurf 宿主桥接自动收集用户列表经验",
      mainObject: "用户",
      operations: ["新增", "编辑", "删除", "分页"],
      generatedFile: "src/views/system/user/index.vue",
      customizations: ["多条件搜索", "状态开关"]
    })
  );

  const bridgeScriptPath = path.join(projectRoot, ".power-ai", "adapters", "windsurf-host-bridge.example.ps1");
  const bridgeResult = runPowerShellScript(projectRoot, bridgeScriptPath, [
    "-ResponsePath",
    responsePath
  ]);
  assert.equal(bridgeResult.status, 0, bridgeResult.stderr);

  const bridgePayload = JSON.parse(bridgeResult.stdout);
  assert.equal(bridgePayload.queued, true);
  assert.equal(bridgePayload.consumed.processedCount, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-11.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "windsurf");
});

test("cline-host-bridge example script turns response text into captured conversations", (t) => {
  const { projectRoot } = createConversationProject(t);
  installLocalCliShim(projectRoot);
  const initResult = runCli(projectRoot, "init", ["--tool", "cline", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const bridgeScriptPath = path.join(projectRoot, ".power-ai", "adapters", "cline-host-bridge.example.ps1");
  const responseText = buildWrapperResponse({
    timestamp: "2026-04-12T11:00:00+08:00",
    sceneType: "dialog-form",
    userIntent: "Cline 宿主桥接自动收集成员弹窗经验",
    mainObject: "成员",
    operations: ["新增", "保存", "关闭"],
    generatedFile: "src/views/member/dialog.vue",
    customizations: ["关闭前重置表单", "保存后刷新列表"]
  });

  const bridgeResult = runPowerShellScript(projectRoot, bridgeScriptPath, [
    "-ResponseText",
    responseText
  ]);
  assert.equal(bridgeResult.status, 0, bridgeResult.stderr);

  const bridgePayload = JSON.parse(bridgeResult.stdout);
  assert.equal(bridgePayload.queued, true);
  assert.equal(bridgePayload.consumed.processedCount, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-12.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "cline");
});

test("github-copilot-host-bridge example script turns response text into captured conversations", (t) => {
  const { projectRoot } = createConversationProject(t);
  installLocalCliShim(projectRoot);
  const initResult = runCli(projectRoot, "init", ["--tool", "github-copilot", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const bridgeScriptPath = path.join(projectRoot, ".power-ai", "adapters", "github-copilot-host-bridge.example.ps1");
  const responseText = buildWrapperResponse({
    timestamp: "2026-04-13T11:00:00+08:00",
    sceneType: "detail-page",
    userIntent: "GitHub Copilot 宿主桥接自动收集详情页经验",
    mainObject: "审批单",
    operations: ["查看", "返回"],
    generatedFile: "src/views/workflow/detail.vue",
    customizations: ["关联表格", "只读展示"]
  });

  const bridgeResult = runPowerShellScript(projectRoot, bridgeScriptPath, [
    "-ResponseText",
    responseText
  ]);
  assert.equal(bridgeResult.status, 0, bridgeResult.stderr);

  const bridgePayload = JSON.parse(bridgeResult.stdout);
  assert.equal(bridgePayload.queued, true);
  assert.equal(bridgePayload.consumed.processedCount, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-13.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "github-copilot");
});

for (const terminalWrapperCase of [
  {
    tool: "codex",
    responseDate: "2026-04-14",
    responseText: "Codex 终端直连自动收集列表页面经验",
    sceneType: "basic-list-page",
    generatedFile: "src/views/system/user/index.vue"
  },
  {
    tool: "claude-code",
    responseDate: "2026-04-15",
    responseText: "Claude Code 终端直连自动收集树列表经验",
    sceneType: "tree-list-page",
    generatedFile: "src/views/system/user/tree.vue"
  },
  {
    tool: "gemini-cli",
    responseDate: "2026-04-16",
    responseText: "Gemini CLI 终端直连自动收集弹窗表单经验",
    sceneType: "dialog-form",
    generatedFile: "src/views/workflow/dialog.vue"
  },
  {
    tool: "aider",
    responseDate: "2026-04-17",
    responseText: "Aider 终端直连自动收集详情页经验",
    sceneType: "detail-page",
    generatedFile: "src/views/workflow/detail.vue"
  }
]) {
  test(`${terminalWrapperCase.tool}-capture example script supports -ResponseText -Auto for terminal direct capture`, (t) => {
    const { projectRoot } = createConversationProject(t);
    installLocalCliShim(projectRoot);
    const initResult = runCli(projectRoot, "init", ["--tool", terminalWrapperCase.tool, "--no-project-scan"]);
    assert.equal(initResult.status, 0, initResult.stderr);

    const scriptPath = path.join(projectRoot, ".power-ai", "adapters", `${terminalWrapperCase.tool}-capture.example.ps1`);
    const responseText = buildWrapperResponse({
      timestamp: `${terminalWrapperCase.responseDate}T11:00:00+08:00`,
      sceneType: terminalWrapperCase.sceneType,
      userIntent: terminalWrapperCase.responseText,
      mainObject: "记录",
      operations: ["create", "save"],
      generatedFile: terminalWrapperCase.generatedFile,
      customizations: ["terminal direct auto capture"]
    });

    const scriptResult = runPowerShellScript(projectRoot, scriptPath, [
      "-ResponseText",
      responseText,
      "-Auto"
    ]);
    assert.equal(scriptResult.status, 0, scriptResult.stderr);

    const payload = JSON.parse(scriptResult.stdout);
    assert.equal(payload.submitted, true);
    assert.equal(payload.consumed.processedCount, 1);

    const dayPayload = JSON.parse(
      fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", `${terminalWrapperCase.responseDate}.json`), "utf8")
    );
    assert.equal(dayPayload.records.length, 1);
    assert.equal(dayPayload.records[0].toolUsed, terminalWrapperCase.tool);
  });
}

test("custom-tool-capture example script supports terminal-first -ResponseText -Auto for unregistered tools", (t) => {
  const { projectRoot } = createConversationProject(t);
  installLocalCliShim(projectRoot);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const scriptPath = path.join(projectRoot, ".power-ai", "adapters", "custom-tool-capture.example.ps1");
  const responseText = buildWrapperResponse({
    timestamp: "2026-04-18T11:00:00+08:00",
    sceneType: "basic-list-page",
    userIntent: "未注册终端工具自动收集用户列表经验",
    mainObject: "用户",
    operations: ["create", "save"],
    generatedFile: "src/views/system/custom-user/index.vue",
    customizations: ["custom terminal tool"]
  });

  const scriptResult = runPowerShellScript(projectRoot, scriptPath, [
    "-ToolName",
    "my-terminal-tool",
    "-ResponseText",
    responseText,
    "-Auto"
  ]);
  assert.equal(scriptResult.status, 0, scriptResult.stderr);

  const payload = JSON.parse(scriptResult.stdout);
  assert.equal(payload.submitted, true);
  assert.equal(payload.consumed.processedCount, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-18.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "my-terminal-tool");
});

test("custom-tool-capture example script supports host-first -ResponseText -QueueResponse -ConsumeNow for unregistered tools", (t) => {
  const { projectRoot } = createConversationProject(t);
  installLocalCliShim(projectRoot);
  const initResult = runCli(projectRoot, "init", ["--tool", "cursor", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const scriptPath = path.join(projectRoot, ".power-ai", "adapters", "custom-tool-capture.example.ps1");
  const responseText = buildWrapperResponse({
    timestamp: "2026-04-19T11:00:00+08:00",
    sceneType: "dialog-form",
    userIntent: "未注册 GUI 工具自动桥接审批弹窗经验",
    mainObject: "审批单",
    operations: ["create", "save"],
    generatedFile: "src/views/workflow/custom-approval/dialog.vue",
    customizations: ["custom gui tool"]
  });

  const scriptResult = runPowerShellScript(projectRoot, scriptPath, [
    "-ToolName",
    "my-gui-tool",
    "-ResponseText",
    responseText,
    "-QueueResponse",
    "-ConsumeNow"
  ]);
  assert.equal(scriptResult.status, 0, scriptResult.stderr);

  const payload = JSON.parse(scriptResult.stdout);
  assert.equal(payload.queued, true);
  assert.equal(payload.consumed.processedCount, 1);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-19.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "my-gui-tool");
});

test("scaffold-wrapper-promotion creates a proposal package for an unregistered tool", (t) => {
  const { projectRoot } = createConversationProject(t);
  const result = runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-new-tool",
    "--display-name",
    "My New Tool",
    "--style",
    "gui"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const proposalRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-new-tool");
  const proposal = JSON.parse(fs.readFileSync(path.join(proposalRoot, "wrapper-promotion.json"), "utf8"));
  const readme = fs.readFileSync(path.join(proposalRoot, "README.md"), "utf8");

  assert.equal(proposal.toolName, "my-new-tool");
  assert.equal(proposal.displayName, "My New Tool");
  assert.equal(proposal.integrationStyle, "gui");
  assert.equal(readme.includes("custom-tool-capture.example.ps1 -ToolName my-new-tool -ResponseText $response -QueueResponse -ConsumeNow"), true);
});

test("scaffold-wrapper-promotion rejects tools that are already registered", (t) => {
  const { projectRoot } = createConversationProject(t);
  const result = runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "cursor"
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes("already registered"), true);
});

test("review-wrapper-promotion updates proposal status and list-wrapper-promotions returns reviewed items", (t) => {
  const { projectRoot } = createConversationProject(t);
  const scaffoldResult = runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-reviewed-tool",
    "--style",
    "terminal"
  ]);
  assert.equal(scaffoldResult.status, 0, scaffoldResult.stderr);

  const reviewResult = runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-reviewed-tool",
    "--status",
    "accepted",
    "--note",
    "ready for wrapper registration",
    "--json"
  ]);
  assert.equal(reviewResult.status, 0, reviewResult.stderr);
  const reviewPayload = JSON.parse(reviewResult.stdout);
  assert.equal(reviewPayload.toolName, "my-reviewed-tool");
  assert.equal(reviewPayload.status, "accepted");

  const proposalRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-reviewed-tool");
  const proposal = JSON.parse(fs.readFileSync(path.join(proposalRoot, "wrapper-promotion.json"), "utf8"));
  const readme = fs.readFileSync(path.join(proposalRoot, "README.md"), "utf8");
  assert.equal(proposal.status, "accepted");
  assert.equal(proposal.reviewNote, "ready for wrapper registration");
  assert.equal(proposal.reviewHistory.length, 1);
  assert.equal(readme.includes("Current status: `accepted`"), true);

  const listResult = runCli(projectRoot, "list-wrapper-promotions", ["--json"]);
  assert.equal(listResult.status, 0, listResult.stderr);
  const listPayload = JSON.parse(listResult.stdout);
  const targetProposal = listPayload.proposals.find((item) => item.toolName === "my-reviewed-tool");
  assert.equal(targetProposal.status, "accepted");
});

test("materialize-wrapper-promotion generates registration artifacts for accepted proposals", (t) => {
  const { projectRoot } = createConversationProject(t);
  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-materialized-tool",
    "--display-name",
    "My Materialized Tool",
    "--style",
    "gui"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-materialized-tool",
    "--status",
    "accepted"
  ]).status, 0);

  const materializeResult = runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-materialized-tool",
    "--json"
  ]);
  assert.equal(materializeResult.status, 0, materializeResult.stderr);
  const materializePayload = JSON.parse(materializeResult.stdout);
  assert.equal(materializePayload.toolName, "my-materialized-tool");
  assert.equal(materializePayload.materializationStatus, "generated");

  const artifactsRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-materialized-tool", "registration-artifacts");
  const bundle = JSON.parse(fs.readFileSync(path.join(artifactsRoot, "wrapper-registration.bundle.json"), "utf8"));
  const patchDoc = fs.readFileSync(path.join(artifactsRoot, "wrapper-registration.patch.md"), "utf8");
  const proposal = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-materialized-tool", "wrapper-promotion.json"), "utf8")
  );

  assert.equal(bundle.toolName, "my-materialized-tool");
  assert.equal(bundle.artifacts.commandName, "my-materialized-tool-capture-session");
  assert.equal(patchDoc.includes("myMaterializedToolCaptureSessionCommand"), true);
  assert.equal(proposal.materializationStatus, "generated");
});

test("materialize-wrapper-promotion rejects non-accepted proposals", (t) => {
  const { projectRoot } = createConversationProject(t);
  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-draft-tool"
  ]).status, 0);

  const result = runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-draft-tool"
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes("must be accepted"), true);
});

test("apply-wrapper-promotion writes registration snippets into source files for accepted materialized proposals", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-applied-tool",
    "--display-name",
    "My Applied Tool",
    "--style",
    "gui"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-applied-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-applied-tool"
  ]).status, 0);

  const applyResult = runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-applied-tool",
    "--json"
  ]);
  assert.equal(applyResult.status, 0, applyResult.stderr);

  const applyPayload = JSON.parse(applyResult.stdout);
  assert.equal(applyPayload.toolName, "my-applied-tool");
  assert.equal(applyPayload.applicationStatus, "applied");
  assert.equal(applyPayload.followUpStatus, "docs-generated");
  assert.equal(applyPayload.docScaffoldFiles.length, 3);
  assert.equal(applyPayload.changedFiles.length, 7);

  const wrappersText = fs.readFileSync(path.join(projectRoot, "src", "conversation-miner", "wrappers.mjs"), "utf8");
  const projectCommandsText = fs.readFileSync(path.join(projectRoot, "src", "commands", "project-commands.mjs"), "utf8");
  const commandsIndexText = fs.readFileSync(path.join(projectRoot, "src", "commands", "index.mjs"), "utf8");
  const selectionCliText = fs.readFileSync(path.join(projectRoot, "src", "selection", "cli.mjs"), "utf8");
  const conversationMinerText = fs.readFileSync(path.join(projectRoot, "src", "conversation-miner", "index.mjs"), "utf8");
  const conversationTestText = fs.readFileSync(path.join(projectRoot, "tests", "conversation-miner.test.mjs"), "utf8");
  const selectionTestText = fs.readFileSync(path.join(projectRoot, "tests", "selection.test.mjs"), "utf8");
  const readmeSnippetText = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-applied-tool", "documentation-scaffolds", "README.snippet.md"),
    "utf8"
  );
  const toolAdaptersSnippetText = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-applied-tool", "documentation-scaffolds", "tool-adapters.snippet.md"),
    "utf8"
  );
  const commandManualSnippetText = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-applied-tool", "documentation-scaffolds", "command-manual.snippet.md"),
    "utf8"
  );
  const checklistText = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-applied-tool", "post-apply-checklist.md"),
    "utf8"
  );
  const proposal = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-applied-tool", "wrapper-promotion.json"), "utf8")
  );

  assert.equal(wrappersText.includes('toolName: "my-applied-tool"'), true);
  assert.equal(projectCommandsText.includes("async function myAppliedToolCaptureSessionCommand()"), true);
  assert.equal(commandsIndexText.includes('cliArgs.command === "my-applied-tool-capture-session"'), true);
  assert.equal(selectionCliText.includes('"my-applied-tool-capture-session"'), true);
  assert.equal(conversationMinerText.includes("my-applied-tool-host-bridge.example.ps1"), true);
  assert.equal(conversationTestText.includes("my-applied-tool-host-bridge generated wrapper sample captures records end to end"), true);
  assert.equal(conversationTestText.includes('".power-ai", "adapters", "my-applied-tool-host-bridge.example.ps1"'), true);
  assert.equal(selectionTestText.includes('resolveProjectRoot keeps cwd for my-applied-tool-capture-session'), true);
  assert.equal(readmeSnippetText.includes("My Applied Tool Wrapper Sample"), true);
  assert.equal(toolAdaptersSnippetText.includes("my-applied-tool-capture-session"), true);
  assert.equal(commandManualSnippetText.includes("npx power-ai-skills my-applied-tool-capture-session"), true);
  assert.equal(checklistText.includes("run the generated wrapper tests"), true);
  assert.equal(proposal.applicationStatus, "applied");
  assert.equal(proposal.followUpStatus, "docs-generated");
  assert.equal(proposal.testScaffoldFiles.includes("tests/conversation-miner.test.mjs"), true);
  assert.equal(proposal.docScaffoldFiles.length, 3);
  assert.equal(proposal.postApplyChecklistPath, ".power-ai/proposals/wrapper-promotions/my-applied-tool/post-apply-checklist.md");
  assert.equal(proposal.pendingFollowUps.length > 0, true);
  assert.equal(proposal.appliedFiles.includes("src/conversation-miner/wrappers.mjs"), true);

  const secondApplyResult = runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-applied-tool",
    "--json"
  ]);
  assert.equal(secondApplyResult.status, 0, secondApplyResult.stderr);
  const secondApplyPayload = JSON.parse(secondApplyResult.stdout);
  assert.deepEqual(secondApplyPayload.changedFiles, []);

  const nextConversationTestText = fs.readFileSync(path.join(projectRoot, "tests", "conversation-miner.test.mjs"), "utf8");
  const generatedTestTitle = "my-applied-tool-host-bridge generated wrapper sample captures records end to end";
  assert.equal(nextConversationTestText.split(generatedTestTitle).length - 1, 1);
});

test("apply-wrapper-promotion --dry-run previews wrapper registration changes without mutating files", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-preview-tool",
    "--display-name",
    "My Preview Tool",
    "--style",
    "gui"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-preview-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-preview-tool"
  ]).status, 0);

  const wrappersPath = path.join(projectRoot, "src", "conversation-miner", "wrappers.mjs");
  const proposalRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-preview-tool");
  const proposalPath = path.join(proposalRoot, "wrapper-promotion.json");
  const wrappersBefore = fs.readFileSync(wrappersPath, "utf8");

  const dryRunResult = runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-preview-tool",
    "--dry-run",
    "--json"
  ]);
  assert.equal(dryRunResult.status, 0, dryRunResult.stderr);

  const dryRunPayload = JSON.parse(dryRunResult.stdout);
  assert.equal(dryRunPayload.toolName, "my-preview-tool");
  assert.equal(dryRunPayload.dryRun, true);
  assert.equal(dryRunPayload.applicationStatus, "not-applied");
  assert.equal(dryRunPayload.followUpStatus, "not-started");
  assert.equal(dryRunPayload.changedFiles.length, 7);
  assert.equal(dryRunPayload.sourceChanges.length, 7);
  assert.equal(dryRunPayload.sourceChanges.every((item) => item.willWrite === true), true);
  assert.equal(dryRunPayload.docScaffoldFiles.length, 3);
  assert.equal(dryRunPayload.postApplyChecklistPath, ".power-ai/proposals/wrapper-promotions/my-preview-tool/post-apply-checklist.md");
  assert.equal(dryRunPayload.wouldWriteFiles.length, 13);
  assert.equal(dryRunPayload.wouldWriteFiles.includes("src/conversation-miner/wrappers.mjs"), true);
  assert.equal(dryRunPayload.wouldWriteFiles.includes(".power-ai/proposals/wrapper-promotions/my-preview-tool/wrapper-promotion.json"), true);
  assert.equal(dryRunPayload.wouldWriteFiles.includes(".power-ai/proposals/wrapper-promotions/my-preview-tool/README.md"), true);

  assert.equal(fs.readFileSync(wrappersPath, "utf8"), wrappersBefore);
  assert.equal(fs.existsSync(path.join(proposalRoot, "documentation-scaffolds")), false);
  assert.equal(fs.existsSync(path.join(proposalRoot, "post-apply-checklist.md")), false);

  const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));
  assert.equal(proposal.applicationStatus, "not-applied");
  assert.equal(proposal.followUpStatus, "not-started");
  assert.equal(proposal.appliedAt, "");
  assert.equal(proposal.docScaffoldFiles.length, 0);
});

test("apply-wrapper-promotion rejects proposals that are not materialized", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-not-applied-tool",
    "--style",
    "terminal"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-not-applied-tool",
    "--status",
    "accepted"
  ]).status, 0);

  const result = runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-not-applied-tool"
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes("must be materialized"), true);
});

test("finalize-wrapper-promotion closes follow-ups for applied proposals", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-finalized-tool",
    "--display-name",
    "My Finalized Tool",
    "--style",
    "terminal"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-finalized-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-finalized-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-finalized-tool"
  ]).status, 0);

  const finalizeResult = runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-finalized-tool",
    "--note",
    "ready for registration",
    "--json"
  ]);
  assert.equal(finalizeResult.status, 0, finalizeResult.stderr);
  const finalizePayload = JSON.parse(finalizeResult.stdout);
  assert.equal(finalizePayload.toolName, "my-finalized-tool");
  assert.equal(finalizePayload.followUpStatus, "finalized");
  assert.equal(finalizePayload.finalizationNote, "ready for registration");

  const proposal = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-finalized-tool", "wrapper-promotion.json"), "utf8")
  );
  assert.equal(proposal.followUpStatus, "finalized");
  assert.equal(proposal.pendingFollowUps.length, 0);
  assert.equal(typeof proposal.finalizedAt, "string");
});

test("finalize-wrapper-promotion rejects proposals that have not reached docs-generated", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-unfinalized-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-unfinalized-tool",
    "--status",
    "accepted"
  ]).status, 0);

  const result = runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-unfinalized-tool"
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes("must be materialized"), true);
});

test("register-wrapper-promotion marks finalized proposals as registered", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-registered-tool",
    "--display-name",
    "My Registered Tool",
    "--style",
    "terminal",
    "--pattern",
    "pattern_tree_list_page"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-registered-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-registered-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-registered-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-registered-tool",
    "--note",
    "ready for official registration"
  ]).status, 0);

  const registerResult = runCli(projectRoot, "register-wrapper-promotion", [
    "--tool",
    "my-registered-tool",
    "--note",
    "officially supported",
    "--json"
  ]);
  assert.equal(registerResult.status, 0, registerResult.stderr);
  const registerPayload = JSON.parse(registerResult.stdout);
  assert.equal(registerPayload.toolName, "my-registered-tool");
  assert.equal(registerPayload.registrationStatus, "registered");
  assert.equal(registerPayload.registrationNote, "officially supported");

  const proposalRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-registered-tool");
  const proposal = JSON.parse(
    fs.readFileSync(path.join(proposalRoot, "wrapper-promotion.json"), "utf8")
  );
  assert.equal(proposal.registrationStatus, "registered");
  assert.equal(proposal.registrationNote, "officially supported");
  assert.equal(typeof proposal.registeredAt, "string");

  const registrationRecord = JSON.parse(
    fs.readFileSync(path.join(proposalRoot, "registration-record.json"), "utf8")
  );
  assert.equal(registrationRecord.toolName, "my-registered-tool");
  assert.equal(registrationRecord.registrationStatus, "registered");

  const promotionTrace = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "promotion-trace.json"), "utf8")
  );
  const wrapperTrace = promotionTrace.relations.find((relation) => (
    relation.relationType === "pattern->wrapper-proposal"
    && relation.source.id === "pattern_tree_list_page"
    && relation.target.id === "my-registered-tool"
  ));
  assert.equal(Boolean(wrapperTrace), true);
  assert.equal(wrapperTrace.metadata.registrationStatus, "registered");
  assert.equal(wrapperTrace.metadata.registrationNote, "officially supported");
  assert.equal(typeof wrapperTrace.metadata.registrationRecordPath, "string");
});

test("register-wrapper-promotion rejects proposals that are not finalized", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-unregistered-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-unregistered-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-unregistered-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-unregistered-tool"
  ]).status, 0);

  const result = runCli(projectRoot, "register-wrapper-promotion", [
    "--tool",
    "my-unregistered-tool"
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes("must be finalized"), true);
});

test("archive-wrapper-promotion moves registered proposals out of active proposal root", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-archived-tool",
    "--style",
    "terminal"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-archived-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "register-wrapper-promotion", [
    "--tool",
    "my-archived-tool"
  ]).status, 0);

  const archiveResult = runCli(projectRoot, "archive-wrapper-promotion", [
    "--tool",
    "my-archived-tool",
    "--note",
    "archived after official registration",
    "--json"
  ]);
  assert.equal(archiveResult.status, 0, archiveResult.stderr);
  const archivePayload = JSON.parse(archiveResult.stdout);
  assert.equal(archivePayload.toolName, "my-archived-tool");
  assert.equal(archivePayload.archiveStatus, "archived");
  assert.equal(archivePayload.archiveNote, "archived after official registration");

  const activeRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-archived-tool");
  const archiveRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions-archive", "my-archived-tool");
  assert.equal(fs.existsSync(activeRoot), false);
  assert.equal(fs.existsSync(archiveRoot), true);

  const proposal = JSON.parse(
    fs.readFileSync(path.join(archiveRoot, "wrapper-promotion.json"), "utf8")
  );
  assert.equal(proposal.archiveStatus, "archived");
  assert.equal(proposal.archiveNote, "archived after official registration");
  assert.equal(typeof proposal.archivedAt, "string");

  const archiveRecord = JSON.parse(
    fs.readFileSync(path.join(archiveRoot, "archive-record.json"), "utf8")
  );
  assert.equal(archiveRecord.toolName, "my-archived-tool");
  assert.equal(archiveRecord.archiveStatus, "archived");

  const activeListResult = runCli(projectRoot, "list-wrapper-promotions", ["--json"]);
  assert.equal(activeListResult.status, 0, activeListResult.stderr);
  const activeListPayload = JSON.parse(activeListResult.stdout);
  assert.equal(activeListPayload.proposals.some((item) => item.toolName === "my-archived-tool"), false);

  const archivedListResult = runCli(projectRoot, "list-wrapper-promotions", ["--archived", "--json"]);
  assert.equal(archivedListResult.status, 0, archivedListResult.stderr);
  const archivedListPayload = JSON.parse(archivedListResult.stdout);
  assert.equal(archivedListPayload.proposals.some((item) => item.toolName === "my-archived-tool" && item.archived === true), true);
});

test("archive-wrapper-promotion rejects proposals that are not registered", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-unarchived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-unarchived-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-unarchived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-unarchived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-unarchived-tool"
  ]).status, 0);

  const result = runCli(projectRoot, "archive-wrapper-promotion", [
    "--tool",
    "my-unarchived-tool"
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes("must be registered"), true);
});

test("restore-wrapper-promotion moves archived proposals back into the active proposal root", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-restored-tool",
    "--style",
    "terminal"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-restored-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-restored-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-restored-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-restored-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "register-wrapper-promotion", [
    "--tool",
    "my-restored-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "archive-wrapper-promotion", [
    "--tool",
    "my-restored-tool"
  ]).status, 0);

  const restoreResult = runCli(projectRoot, "restore-wrapper-promotion", [
    "--tool",
    "my-restored-tool",
    "--note",
    "resume wrapper iteration",
    "--json"
  ]);
  assert.equal(restoreResult.status, 0, restoreResult.stderr);
  const restorePayload = JSON.parse(restoreResult.stdout);
  assert.equal(restorePayload.toolName, "my-restored-tool");
  assert.equal(restorePayload.archiveStatus, "active");
  assert.equal(restorePayload.restorationNote, "resume wrapper iteration");

  const activeRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-restored-tool");
  const archiveRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions-archive", "my-restored-tool");
  assert.equal(fs.existsSync(activeRoot), true);
  assert.equal(fs.existsSync(archiveRoot), false);

  const proposal = JSON.parse(
    fs.readFileSync(path.join(activeRoot, "wrapper-promotion.json"), "utf8")
  );
  assert.equal(proposal.archiveStatus, "active");
  assert.equal(proposal.restorationNote, "resume wrapper iteration");
  assert.equal(typeof proposal.restoredAt, "string");
  assert.equal(typeof proposal.archivedAt, "string");

  const restoreRecord = JSON.parse(
    fs.readFileSync(path.join(activeRoot, "restore-record.json"), "utf8")
  );
  assert.equal(restoreRecord.toolName, "my-restored-tool");
  assert.equal(restoreRecord.archiveStatus, "active");

  const activeListResult = runCli(projectRoot, "list-wrapper-promotions", ["--json"]);
  assert.equal(activeListResult.status, 0, activeListResult.stderr);
  const activeListPayload = JSON.parse(activeListResult.stdout);
  assert.equal(activeListPayload.proposals.some((item) => item.toolName === "my-restored-tool" && item.archived === false), true);
});

test("restore-wrapper-promotion rejects tools that are not archived", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-not-restored-tool"
  ]).status, 0);

  const result = runCli(projectRoot, "restore-wrapper-promotion", [
    "--tool",
    "my-not-restored-tool"
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.includes("Archived wrapper promotion proposal not found"), true);
});

test("show-wrapper-promotion-timeline returns ordered events for active proposals", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-timeline-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-timeline-tool",
    "--status",
    "accepted",
    "--note",
    "accepted for integration"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-timeline-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-timeline-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-timeline-tool",
    "--note",
    "ready for registration"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "register-wrapper-promotion", [
    "--tool",
    "my-timeline-tool",
    "--note",
    "officially supported"
  ]).status, 0);

  const result = runCli(projectRoot, "show-wrapper-promotion-timeline", [
    "--tool",
    "my-timeline-tool",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.toolName, "my-timeline-tool");
  assert.equal(payload.archived, false);
  assert.equal(payload.timeline.some((item) => item.type === "scaffolded"), true);
  assert.equal(payload.timeline.some((item) => item.type === "reviewed" && item.status === "accepted"), true);
  assert.equal(payload.timeline.some((item) => item.type === "materialized"), true);
  assert.equal(payload.timeline.some((item) => item.type === "applied"), true);
  assert.equal(payload.timeline.some((item) => item.type === "finalized" && item.note === "ready for registration"), true);
  assert.equal(payload.timeline.some((item) => item.type === "registered" && item.note === "officially supported"), true);
});

test("show-wrapper-promotion-timeline can resolve archived proposals automatically", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-archived-timeline-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-archived-timeline-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-archived-timeline-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-archived-timeline-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-archived-timeline-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "register-wrapper-promotion", [
    "--tool",
    "my-archived-timeline-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "archive-wrapper-promotion", [
    "--tool",
    "my-archived-timeline-tool",
    "--note",
    "moved to archive"
  ]).status, 0);

  const result = runCli(projectRoot, "show-wrapper-promotion-timeline", [
    "--tool",
    "my-archived-timeline-tool",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.toolName, "my-archived-timeline-tool");
  assert.equal(payload.archived, true);
  assert.equal(payload.timeline.some((item) => item.type === "archived" && item.note === "moved to archive"), true);
});

test("generate-wrapper-promotion-audit writes markdown and json summaries for active and archived proposals", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-audit-active-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-audit-active-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-audit-active-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-audit-active-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-audit-active-tool"
  ]).status, 0);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-audit-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-audit-archived-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-audit-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-audit-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-audit-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "register-wrapper-promotion", [
    "--tool",
    "my-audit-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "archive-wrapper-promotion", [
    "--tool",
    "my-audit-archived-tool"
  ]).status, 0);

  const result = runCli(projectRoot, "generate-wrapper-promotion-audit", ["--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.summary.total, 2);
  assert.equal(payload.summary.active, 1);
  assert.equal(payload.summary.archived, 1);
  assert.equal(payload.summary.readyForRegistration, 1);
  assert.equal(payload.proposals.some((item) => item.toolName === "my-audit-active-tool"), true);
  assert.equal(payload.proposals.some((item) => item.toolName === "my-audit-archived-tool" && item.archived === true), true);

  const markdownPath = payload.reportPath;
  const jsonPath = payload.jsonPath;
  assert.equal(fs.existsSync(markdownPath), true);
  assert.equal(fs.existsSync(jsonPath), true);

  const markdown = fs.readFileSync(markdownPath, "utf8");
  assert.equal(markdown.includes("my-audit-active-tool"), true);
  assert.equal(markdown.includes("my-audit-archived-tool"), true);
});

test("generate-wrapper-promotion-audit supports filtered views", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-filter-ready-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-filter-ready-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-filter-ready-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-filter-ready-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-filter-ready-tool"
  ]).status, 0);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-filter-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-filter-archived-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "my-filter-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "my-filter-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "my-filter-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "register-wrapper-promotion", [
    "--tool",
    "my-filter-archived-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "archive-wrapper-promotion", [
    "--tool",
    "my-filter-archived-tool"
  ]).status, 0);

  const readyResult = runCli(projectRoot, "generate-wrapper-promotion-audit", [
    "--filter",
    "ready-for-registration",
    "--json"
  ]);
  assert.equal(readyResult.status, 0, readyResult.stderr);
  const readyPayload = JSON.parse(readyResult.stdout);
  assert.equal(readyPayload.filter, "ready-for-registration");
  assert.equal(readyPayload.summary.total, 1);
  assert.equal(readyPayload.proposals[0].toolName, "my-filter-ready-tool");

  const archivedResult = runCli(projectRoot, "generate-wrapper-promotion-audit", [
    "--filter",
    "archived",
    "--json"
  ]);
  assert.equal(archivedResult.status, 0, archivedResult.stderr);
  const archivedPayload = JSON.parse(archivedResult.stdout);
  assert.equal(archivedPayload.filter, "archived");
  assert.equal(archivedPayload.summary.total, 1);
  assert.equal(archivedPayload.proposals[0].toolName, "my-filter-archived-tool");
});

test("generate-wrapper-promotion-audit supports sorted views", (t) => {
  const { projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "zzz-sort-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "aaa-sort-tool"
  ]).status, 0);

  const toolNameResult = runCli(projectRoot, "generate-wrapper-promotion-audit", [
    "--sort",
    "tool-name",
    "--json"
  ]);
  assert.equal(toolNameResult.status, 0, toolNameResult.stderr);
  const toolNamePayload = JSON.parse(toolNameResult.stdout);
  assert.equal(toolNamePayload.sort, "tool-name");
  assert.deepEqual(
    toolNamePayload.proposals.map((item) => item.toolName),
    ["aaa-sort-tool", "zzz-sort-tool"]
  );

  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "zzz-sort-tool",
    "--status",
    "accepted"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "materialize-wrapper-promotion", [
    "--tool",
    "zzz-sort-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "apply-wrapper-promotion", [
    "--tool",
    "zzz-sort-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "finalize-wrapper-promotion", [
    "--tool",
    "zzz-sort-tool"
  ]).status, 0);

  const lastEventResult = runCli(projectRoot, "generate-wrapper-promotion-audit", [
    "--sort",
    "last-event-desc",
    "--json"
  ]);
  assert.equal(lastEventResult.status, 0, lastEventResult.stderr);
  const lastEventPayload = JSON.parse(lastEventResult.stdout);
  assert.equal(lastEventPayload.sort, "last-event-desc");
  assert.equal(lastEventPayload.proposals[0].toolName, "zzz-sort-tool");
});

test("generate-wrapper-promotion-audit supports export fields, format, and output", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  installWrapperPromotionApplySourceFiles(projectRoot);

  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", [
    "--tool",
    "my-export-tool"
  ]).status, 0);
  assert.equal(runCli(projectRoot, "review-wrapper-promotion", [
    "--tool",
    "my-export-tool",
    "--status",
    "accepted"
  ]).status, 0);

  const exportPath = path.join(tempRoot, "wrapper-audit.csv");
  const result = runCli(projectRoot, "generate-wrapper-promotion-audit", [
    "--fields",
    "toolName,status",
    "--format",
    "csv",
    "--output",
    exportPath,
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.exportFormat, "csv");
  assert.equal(payload.exportPath, exportPath);
  assert.deepEqual(payload.exportFields, ["toolName", "status"]);
  assert.equal(payload.exportCount, 1);
  assert.equal(fs.existsSync(exportPath), true);

  const csv = fs.readFileSync(exportPath, "utf8");
  assert.equal(csv.includes("toolName,status"), true);
  assert.equal(csv.includes("my-export-tool,accepted"), true);
});

test("watch-auto-capture-inbox --once processes queued raw responses before draining capture inbox", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "watch-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "2026-04-07T11:00:00+08:00",
      sceneType: "tree-list-page",
      userIntent: "watcher 自动处理 response inbox",
      mainObject: "成员",
      treeObject: "组织",
      operations: ["新增", "编辑"],
      generatedFile: "src/views/member/watch-tree.vue",
      customizations: ["切换节点后刷新列表", "保存后刷新树"]
    })
  );

  const queueResult = runCli(projectRoot, "queue-auto-capture-response", [
    "--tool",
    "cursor",
    "--from-file",
    responsePath,
    "--json"
  ]);
  assert.equal(queueResult.status, 0, queueResult.stderr);
  const queuePayload = JSON.parse(queueResult.stdout);
  assert.equal(queuePayload.queued, true);

  const watchResult = runCli(projectRoot, "watch-auto-capture-inbox", [
    "--once",
    "--json"
  ]);
  assert.equal(watchResult.status, 0, watchResult.stderr);
  const watchPayload = JSON.parse(watchResult.stdout);

  assert.equal(watchPayload.responseInbox.processedCount, 1);
  assert.equal(watchPayload.responseInbox.failedCount, 0);
  assert.equal(watchPayload.captureInbox.processedCount, 0);

  const dayPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", "2026-04-07.json"), "utf8")
  );
  assert.equal(dayPayload.records.length, 1);
  assert.equal(dayPayload.records[0].toolUsed, "cursor");
});

test("review-conversation-pattern supports batch review from decision state with limits", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const summaryPath = path.join(tempRoot, "conversation-pattern-batch.json");

  writeFile(
    summaryPath,
    JSON.stringify(
      {
        records: [
          {
            timestamp: "2026-03-16T09:00:00+08:00",
            toolUsed: "cursor",
            sceneType: "tree-list-page",
            userIntent: "部门成员树列表维护",
            skillsUsed: ["tree-list-page", "dialog-skill"],
            entities: {
              mainObject: "成员",
              treeObject: "部门",
              operations: ["新增", "编辑"]
            },
            generatedFiles: ["src/views/dept-member/index.vue"],
            customizations: ["切换树节点后刷新列表"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-16T10:00:00+08:00",
            toolUsed: "codex",
            sceneType: "dialog-form",
            userIntent: "成员弹窗表单维护",
            skillsUsed: ["dialog-skill", "form-skill"],
            entities: {
              mainObject: "成员",
              operations: ["新增", "编辑"]
            },
            generatedFiles: ["src/views/dept-member/dialog.vue"],
            customizations: ["弹窗关闭后刷新列表"],
            complexity: "medium"
          }
        ]
      },
      null,
      2
    )
  );

  assert.equal(runCli(projectRoot, "capture-session", ["--input", summaryPath]).status, 0);
  assert.equal(runCli(projectRoot, "analyze-patterns").status, 0);

  const decisionsPath = path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json");
  const ledger = JSON.parse(fs.readFileSync(decisionsPath, "utf8"));
  assert.equal(ledger.decisions.length >= 2, true);
  ledger.decisions = ledger.decisions.map((item) => ({
    ...item,
    decision: "review",
    target: "",
    decisionReason: ""
  }));
  fs.writeFileSync(decisionsPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

  const acceptResult = runCli(projectRoot, "review-conversation-pattern", [
    "--from-review",
    "--accept",
    "--target", "project-local-skill",
    "--limit", "1",
    "--json"
  ]);
  assert.equal(acceptResult.status, 0, acceptResult.stderr);
  const acceptPayload = JSON.parse(acceptResult.stdout);
  assert.equal(acceptPayload.mode, "batch");
  assert.equal(acceptPayload.sourceDecision, "review");
  assert.equal(acceptPayload.appliedDecision, "accepted");
  assert.equal(acceptPayload.appliedTarget, "project-local-skill");
  assert.equal(acceptPayload.processedCount, 1);
  assert.equal(acceptPayload.skippedCount, 0);

  const acceptedLedger = JSON.parse(fs.readFileSync(decisionsPath, "utf8"));
  assert.equal(acceptedLedger.decisions.filter((item) => item.decision === "accepted").length, 1);
  assert.equal(acceptedLedger.decisions.filter((item) => item.decision === "review").length >= 1, true);

  const archiveResult = runCli(projectRoot, "review-conversation-pattern", [
    "--from-state", "review",
    "--archive",
    "--limit", "5",
    "--json"
  ]);
  assert.equal(archiveResult.status, 0, archiveResult.stderr);
  const archivePayload = JSON.parse(archiveResult.stdout);
  assert.equal(archivePayload.mode, "batch");
  assert.equal(archivePayload.appliedDecision, "archived");
  assert.equal(archivePayload.processedCount, 1);

  const archivedLedger = JSON.parse(fs.readFileSync(decisionsPath, "utf8"));
  assert.equal(archivedLedger.decisions.filter((item) => item.decision === "archived").length, 1);
  assert.equal(fs.existsSync(archivePayload.reportPath), true);
});

for (const wrapperCase of [
  {
    tool: "windsurf",
    command: "windsurf-capture-session",
    captureDate: "2026-03-30",
    fileName: "windsurf-response.txt",
    generatedFile: "src/views/member/windsurf-dialog.vue"
  },
  {
    tool: "gemini-cli",
    command: "gemini-cli-capture-session",
    captureDate: "2026-03-31",
    fileName: "gemini-response.txt",
    generatedFile: "src/views/member/gemini-dialog.vue"
  },
  {
    tool: "github-copilot",
    command: "github-copilot-capture-session",
    captureDate: "2026-04-01",
    fileName: "copilot-response.txt",
    generatedFile: "src/views/member/copilot-dialog.vue"
  },
  {
    tool: "cline",
    command: "cline-capture-session",
    captureDate: "2026-04-02",
    fileName: "cline-response.txt",
    generatedFile: "src/views/member/cline-dialog.vue"
  },
  {
    tool: "aider",
    command: "aider-capture-session",
    captureDate: "2026-04-03",
    fileName: "aider-response.txt",
    generatedFile: "src/views/member/aider-dialog.vue"
  }
]) {
  test(`${wrapperCase.command} auto-confirms with --yes and captures records in one command`, (t) => {
    const { tempRoot, projectRoot } = createConversationProject(t);
    const responsePath = path.join(tempRoot, wrapperCase.fileName);
    writeFile(
      responsePath,
      buildWrapperResponse({
        timestamp: `${wrapperCase.captureDate}T11:00:00+08:00`,
        sceneType: "dialog-form",
        userIntent: `新增${wrapperCase.tool}用户弹窗流程`,
        mainObject: "用户",
        operations: ["新增", "保存"],
        generatedFile: wrapperCase.generatedFile,
        customizations: ["保存后刷新列表", "关闭前重置表单"]
      })
    );

    const result = runCli(projectRoot, wrapperCase.command, [
      "--from-file",
      responsePath,
      "--extract-marked-block",
      "--yes",
      "--json"
    ]);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);

    assert.equal(payload.tool, wrapperCase.tool);
    assert.equal(payload.decision, "captured");
    assert.equal(payload.resolved.recordsAdded, 1);

    const dayPayload = JSON.parse(
      fs.readFileSync(path.join(projectRoot, ".power-ai", "conversations", `${wrapperCase.captureDate}.json`), "utf8")
    );
    assert.equal(dayPayload.records.length, 1);
    assert.equal(dayPayload.records[0].toolUsed, wrapperCase.tool);
  });

  test(`${wrapperCase.command} can reject capture without leaving pending state`, (t) => {
    const { tempRoot, projectRoot } = createConversationProject(t);
    const responsePath = path.join(tempRoot, `reject-${wrapperCase.fileName}`);
    writeFile(
      responsePath,
      buildWrapperResponse({
        timestamp: `${wrapperCase.captureDate}T12:00:00+08:00`,
        sceneType: "dialog-form",
        userIntent: `新增${wrapperCase.tool}用户弹窗流程`,
        mainObject: "用户",
        operations: ["新增", "保存"],
        generatedFile: wrapperCase.generatedFile,
        customizations: ["保存后刷新列表", "关闭前重置表单"]
      })
    );

    const result = runCli(projectRoot, wrapperCase.command, [
      "--from-file",
      responsePath,
      "--extract-marked-block",
      "--reject",
      "--json"
    ]);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);

    assert.equal(payload.tool, wrapperCase.tool);
    assert.equal(payload.decision, "rejected");
    assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "conversations", `${wrapperCase.captureDate}.json`)), false);
    const pendingRoot = path.join(projectRoot, ".power-ai", "pending-captures");
    const pendingFiles = fs.existsSync(pendingRoot) ? fs.readdirSync(pendingRoot).filter((fileName) => fileName.endsWith(".json")) : [];
    assert.equal(pendingFiles.length, 0);
  });
}

test("check-auto-capture-runtime reports queue failures and backlog summary", (t) => {
  const { projectRoot } = createConversationProject(t);

  const initResult = runCli(projectRoot, "init", ["--tool", "codex"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const failedPayloadPath = path.join(projectRoot, ".power-ai", "auto-capture", "failed", "capture_failed_001.json");
  writeFile(
    failedPayloadPath,
    JSON.stringify(
      {
        requestId: "capture_failed_001",
        status: "failed",
        failedAt: "2026-04-23T10:00:00+08:00",
        error: {
          message: "bridge failed"
        }
      },
      null,
      2
    )
  );

  const queuedPayloadPath = path.join(projectRoot, ".power-ai", "auto-capture", "response-inbox", "response_queued_001.json");
  writeFile(
    queuedPayloadPath,
    JSON.stringify(
      {
        requestId: "response_queued_001",
        status: "queued",
        queuedAt: "2026-04-23T09:00:00+08:00",
        responseText: "queued response"
      },
      null,
      2
    )
  );

  const runtimeResult = runCli(projectRoot, "check-auto-capture-runtime", ["--json", "--stale-minutes", "5"]);
  assert.equal(runtimeResult.status, 0, runtimeResult.stderr);

  const payload = JSON.parse(runtimeResult.stdout);
  assert.equal(payload.status, "attention");
  assert.equal(payload.summary.responseBacklogCount, 1);
  assert.equal(payload.summary.failedRequestCount, 1);
  assert.equal(payload.summary.staleQueuedResponseCount, 1);
  assert.equal(payload.summary.activityState, "failing");
  assert.equal(payload.bridgeCoverage.summary.runtimeScriptReady, true);
  assert.match(payload.reportPath, /auto-capture-runtime\.md$/);
});


test("evaluate-session-capture blocks sensitive generated file paths and marks risky outputs for review", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const inputPath = path.join(tempRoot, "generated-file-policy-summary.json");

  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  writeFile(
    path.join(projectRoot, ".power-ai", "capture-safety-policy.json"),
    JSON.stringify(
      {
        enabled: true,
        admission: {
          blockedGeneratedFilePatterns: [".env", "secrets/"],
          reviewGeneratedFilePatterns: ["rbac/", "migrations/"]
        }
      },
      null,
      2
    )
  );

  writeFile(
    inputPath,
    JSON.stringify(
      {
        records: [
          {
            timestamp: "2026-03-21T09:00:00+08:00",
            toolUsed: "codex",
            sceneType: "form",
            userIntent: "补充本地环境变量模板",
            skillsUsed: ["form-skill"],
            entities: {
              operations: ["新增"]
            },
            generatedFiles: ["config/.env.local"],
            customizations: ["补充本地配置"],
            complexity: "medium"
          },
          {
            timestamp: "2026-03-21T10:00:00+08:00",
            toolUsed: "codex",
            sceneType: "permission-page",
            userIntent: "新增角色权限映射维护",
            skillsUsed: ["form-skill", "dialog-skill"],
            entities: {
              mainObject: "角色",
              operations: ["新增", "编辑"]
            },
            generatedFiles: ["src/rbac/role-map.ts"],
            customizations: ["补充角色权限映射"],
            complexity: "high"
          }
        ]
      },
      null,
      2
    )
  );

  const evaluateResult = runCli(projectRoot, "evaluate-session-capture", ["--input", inputPath, "--json"]);
  assert.equal(evaluateResult.status, 0, evaluateResult.stderr);
  const payload = JSON.parse(evaluateResult.stdout);

  assert.equal(payload.summary.skipSensitive, 1);
  assert.equal(payload.summary.askCapture, 1);
  assert.equal(payload.summary.askReview, 1);
  assert.equal(payload.config.blockedFilePatternCount, 2);
  assert.equal(payload.config.reviewFilePatternCount, 2);
  assert.equal(payload.evaluations[0].decision, "skip_sensitive");
  assert.equal(payload.evaluations[0].reasons.includes("blocked-generated-file-pattern"), true);
  assert.equal(payload.evaluations[1].decision, "ask_capture");
  assert.equal(payload.evaluations[1].admissionLevel, "review");
  assert.equal(payload.evaluations[1].reasons.includes("review-generated-file-pattern"), true);
});
