import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createSelectionService, parseCliArgs, resolveProjectRoot } from "../src/selection/index.mjs";

function createTempProject(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-selection-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return tempRoot;
}

function writeJsonFile(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function createSelectionTestContext(t, argv) {
  const context = createRuntimeContext(import.meta.url);
  const projectRoot = createTempProject(t);
  const cliArgs = parseCliArgs(argv);
  const selectionService = createSelectionService({ context, cliArgs, projectRoot });
  return { context, projectRoot, cliArgs, selectionService };
}

function assertResolveProjectRootUsesCwd(t, argv) {
  const context = createRuntimeContext(import.meta.url);
  const cwd = createTempProject(t);
  const cliArgs = parseCliArgs(argv);
  const projectRoot = resolveProjectRoot({ context, cliArgs, cwd });
  assert.equal(projectRoot, cwd);
}

test("expandToolSelection adds tool dependencies", (t) => {
  const { selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "sync"]);
  assert.deepEqual(selectionService.expandToolSelection(["cursor"]), ["agents-md", "cursor"]);
});

test("resolveSelectionConfig expands enterprise preset into registered tools", (t) => {
  const { selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "sync"]);
  const selection = selectionService.resolveSelectionConfig({ presetNames: ["enterprise-standard"] });
  assert.deepEqual(selection.selectedPresets, ["enterprise-standard"]);
  assert.deepEqual(selection.selectedProfiles, ["openai"]);
  assert.deepEqual(selection.selectedTools, ["claude-code", "codex", "cursor", "trae"]);
});

test("resolveSelection prefers explicit CLI tools over defaults", (t) => {
  const { selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "init", "--tool", "cursor"]);
  const selection = selectionService.resolveSelection({ allowLegacyInference: false });
  assert.equal(selection.mode, "explicit");
  assert.deepEqual(selection.selectedTools, ["cursor"]);
  assert.deepEqual(selection.expandedTools, ["agents-md", "cursor"]);
});

test("resolveTeamDefaultSelection uses team project profile preset and required skills", (t) => {
  const { selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "show-defaults", "--project-profile", "terminal-governance"]);
  const selection = selectionService.resolveTeamDefaultSelection({ projectProfileName: "terminal-governance" });
  assert.equal(selection.selectedProjectProfile, "terminal-governance");
  assert.deepEqual(selection.selectedPresets, ["terminal-evaluation"]);
  assert.deepEqual(selection.selectedTools, ["aider", "claude-code", "codex", "gemini-cli"]);
  assert.deepEqual(selection.requiredSkills, [
    "orchestration/entry-skill",
    "workflow/approval-workflow-skill"
  ]);
});

test("resolveSelection carries requested team project profile into explicit selections", (t) => {
  const { selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "init", "--project-profile", "enterprise-vue", "--tool", "codex"]);
  const selection = selectionService.resolveSelection({ allowLegacyInference: false });
  assert.equal(selection.mode, "explicit");
  assert.equal(selection.selectedProjectProfile, "enterprise-vue");
  assert.deepEqual(selection.requiredSkills, [
    "foundation/power-component-library",
    "orchestration/entry-skill",
    "workflow/approval-workflow-skill"
  ]);
});

test("resolveTeamDefaultSelection auto-detects enterprise-vue from workspace signals", (t) => {
  const { projectRoot, selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "init"]);
  writeJsonFile(path.join(projectRoot, "package.json"), {
    name: "enterprise-vue-consumer",
    private: true,
    dependencies: {
      vue: "^3.4.0",
      pinia: "^2.1.0",
      "@power/runtime-vue3": "^6.5.0"
    }
  });
  fs.mkdirSync(path.join(projectRoot, "src", "views"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "src", "views", "index.vue"), "<template><pc-layout-page-common /></template>\n", "utf8");

  const selection = selectionService.resolveTeamDefaultSelection();
  assert.equal(selection.selectedProjectProfile, "enterprise-vue");
  assert.equal(selection.sourceDescription, "auto-team-project-profile:enterprise-vue");
  assert.equal(selection.recommendedProjectProfile, "enterprise-vue");
});

test("detectProjectProfileRecommendation stays empty for minimal package-only projects", (t) => {
  const { projectRoot, selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "show-defaults"]);
  writeJsonFile(path.join(projectRoot, "package.json"), {
    name: "minimal-consumer",
    private: true
  });

  const recommendation = selectionService.detectProjectProfileRecommendation();
  assert.equal(recommendation.recommendedProjectProfile, "");
});

test("detectProjectProfileRecommendation can identify terminal-governance from terminal workspace signals", (t) => {
  const { projectRoot, selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "show-defaults"]);
  writeJsonFile(path.join(projectRoot, "package.json"), {
    name: "terminal-governance-consumer",
    private: true,
    scripts: {
      test: "node --test"
    }
  });
  fs.mkdirSync(path.join(projectRoot, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "scripts", "build.mjs"), "console.log('build');\n", "utf8");

  const recommendation = selectionService.detectProjectProfileRecommendation();
  assert.equal(recommendation.recommendedProjectProfile, "terminal-governance");
});

test("parsePositionalSelection recognizes tool profile and preset tokens", (t) => {
  const { selectionService } = createSelectionTestContext(t, ["node", "power-ai-skills", "init"]);
  const parsed = selectionService.parsePositionalSelection(["tool:cursor,profile:anthropic", "enterprise-standard"]);
  assert.equal(parsed.matched, true);
  assert.deepEqual(parsed.selectedTools, ["cursor"]);
  assert.deepEqual(parsed.selectedProfiles, ["anthropic"]);
  assert.deepEqual(parsed.selectedPresets, ["enterprise-standard"]);
});

const resolveProjectRootCwdCases = [
  {
    title: "resolveProjectRoot keeps cwd for promote-project-local-skill positional skill name",
    argv: ["node", "power-ai-skills", "promote-project-local-skill", "basic-list-page-project"]
  },
  {
    title: "resolveProjectRoot keeps cwd for review-project-pattern positional pattern id",
    argv: ["node", "power-ai-skills", "review-project-pattern", "pattern_tree_list_page", "--decision", "skip"]
  },
  {
    title: "resolveProjectRoot keeps cwd for generate-project-skill positional pattern id",
    argv: ["node", "power-ai-skills", "generate-project-skill", "pattern_tree_list_page"]
  },
  {
    title: "resolveProjectRoot keeps cwd for evaluate-session-capture",
    argv: ["node", "power-ai-skills", "evaluate-session-capture", "--input", "session-summary.json"]
  },
  {
    title: "resolveProjectRoot keeps cwd for submit-auto-capture",
    argv: ["node", "power-ai-skills", "submit-auto-capture", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for queue-auto-capture-response",
    argv: ["node", "power-ai-skills", "queue-auto-capture-response", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for prepare-session-capture",
    argv: ["node", "power-ai-skills", "prepare-session-capture", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for confirm-session-capture",
    argv: ["node", "power-ai-skills", "confirm-session-capture", "--request", "capture_001"]
  },
  {
    title: "resolveProjectRoot keeps cwd for consume-auto-capture-inbox",
    argv: ["node", "power-ai-skills", "consume-auto-capture-inbox", "--max-items", "1"]
  },
  {
    title: "resolveProjectRoot keeps cwd for consume-auto-capture-response-inbox",
    argv: ["node", "power-ai-skills", "consume-auto-capture-response-inbox", "--max-items", "1"]
  },
  {
    title: "resolveProjectRoot keeps cwd for watch-auto-capture-inbox",
    argv: ["node", "power-ai-skills", "watch-auto-capture-inbox", "--once"]
  },
  {
    title: "resolveProjectRoot keeps cwd for check-auto-capture-runtime",
    argv: ["node", "power-ai-skills", "check-auto-capture-runtime", "--json"]
  },
  {
    title: "resolveProjectRoot keeps cwd for codex-capture-session",
    argv: ["node", "power-ai-skills", "codex-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for trae-capture-session",
    argv: ["node", "power-ai-skills", "trae-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for cursor-capture-session",
    argv: ["node", "power-ai-skills", "cursor-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for claude-code-capture-session",
    argv: ["node", "power-ai-skills", "claude-code-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for windsurf-capture-session",
    argv: ["node", "power-ai-skills", "windsurf-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for gemini-cli-capture-session",
    argv: ["node", "power-ai-skills", "gemini-cli-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for github-copilot-capture-session",
    argv: ["node", "power-ai-skills", "github-copilot-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for cline-capture-session",
    argv: ["node", "power-ai-skills", "cline-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for aider-capture-session",
    argv: ["node", "power-ai-skills", "aider-capture-session", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for tool-capture-session",
    argv: ["node", "power-ai-skills", "tool-capture-session", "--tool", "cursor", "--from-file", "assistant-response.txt"]
  },
  {
    title: "resolveProjectRoot keeps cwd for scaffold-wrapper-promotion positional tool name",
    argv: ["node", "power-ai-skills", "scaffold-wrapper-promotion", "my-new-tool"]
  },
  {
    title: "resolveProjectRoot keeps cwd for review-wrapper-promotion positional tool name",
    argv: ["node", "power-ai-skills", "review-wrapper-promotion", "my-new-tool", "--status", "accepted"]
  },
  {
    title: "resolveProjectRoot keeps cwd for list-wrapper-promotions",
    argv: ["node", "power-ai-skills", "list-wrapper-promotions"]
  },
  {
    title: "resolveProjectRoot keeps cwd for show-wrapper-promotion-timeline positional tool name",
    argv: ["node", "power-ai-skills", "show-wrapper-promotion-timeline", "my-new-tool"]
  },
  {
    title: "resolveProjectRoot keeps cwd for generate-wrapper-promotion-audit",
    argv: ["node", "power-ai-skills", "generate-wrapper-promotion-audit"]
  },
  {
    title: "resolveProjectRoot keeps cwd for generate-wrapper-registry-governance",
    argv: ["node", "power-ai-skills", "generate-wrapper-registry-governance"]
  },
  {
    title: "resolveProjectRoot keeps cwd for plan-wrapper-registrations",
    argv: ["node", "power-ai-skills", "plan-wrapper-registrations", "--tool", "my-new-tool"]
  },
  {
    title: "resolveProjectRoot keeps cwd for generate-upgrade-summary",
    argv: ["node", "power-ai-skills", "generate-upgrade-summary"]
  },
  {
    title: "resolveProjectRoot keeps cwd for plan-release-publish",
    argv: ["node", "power-ai-skills", "plan-release-publish", "--json"]
  },
  {
    title: "resolveProjectRoot keeps cwd for execute-release-publish",
    argv: ["node", "power-ai-skills", "execute-release-publish", "--confirm", "--json"]
  },
  {
    title: "resolveProjectRoot keeps cwd for generate-governance-summary",
    argv: ["node", "power-ai-skills", "generate-governance-summary"]
  },
  {
    title: "resolveProjectRoot keeps cwd for list-evolution-drafts",
    argv: ["node", "power-ai-skills", "list-evolution-drafts", "--type", "shared-skill-draft"]
  },
  {
    title: "resolveProjectRoot keeps cwd for show-evolution-draft positional draft id",
    argv: ["node", "power-ai-skills", "show-evolution-draft", "shared-skill-draft::shared-skill-promotion::manual-seeded"]
  },
  {
    title: "resolveProjectRoot keeps cwd for plan-shared-skill-promotions",
    argv: ["node", "power-ai-skills", "plan-shared-skill-promotions", "--skill", "dialog-form-shared"]
  },
  {
    title: "resolveProjectRoot keeps cwd for show-governance-history",
    argv: ["node", "power-ai-skills", "show-governance-history", "--type", "promotion"]
  },
  {
    title: "resolveProjectRoot keeps cwd for generate-conversation-miner-strategy",
    argv: ["node", "power-ai-skills", "generate-conversation-miner-strategy", "--type", "enterprise-vue"]
  },
  {
    title: "resolveProjectRoot keeps cwd for check-project-baseline",
    argv: ["node", "power-ai-skills", "check-project-baseline"]
  },
  {
    title: "resolveProjectRoot keeps cwd for show-team-policy",
    argv: ["node", "power-ai-skills", "show-team-policy"]
  },
  {
    title: "resolveProjectRoot keeps cwd for validate-team-policy",
    argv: ["node", "power-ai-skills", "validate-team-policy"]
  },
  {
    title: "resolveProjectRoot keeps cwd for check-team-policy-drift",
    argv: ["node", "power-ai-skills", "check-team-policy-drift"]
  },
  {
    title: "resolveProjectRoot keeps cwd for show-project-profile-decision",
    argv: ["node", "power-ai-skills", "show-project-profile-decision"]
  },
  {
    title: "resolveProjectRoot keeps cwd for review-project-profile",
    argv: ["node", "power-ai-skills", "review-project-profile", "--defer"]
  },
  {
    title: "resolveProjectRoot keeps cwd for check-governance-review-deadlines",
    argv: ["node", "power-ai-skills", "check-governance-review-deadlines"]
  },
  {
    title: "resolveProjectRoot keeps cwd for show-promotion-trace",
    argv: ["node", "power-ai-skills", "show-promotion-trace", "--skill", "detail-page-project"]
  },
  {
    title: "resolveProjectRoot keeps cwd for merge-conversation-pattern",
    argv: ["node", "power-ai-skills", "merge-conversation-pattern", "--source", "pattern_a", "--target", "pattern_b"]
  },
  {
    title: "resolveProjectRoot keeps cwd for archive-conversation-pattern",
    argv: ["node", "power-ai-skills", "archive-conversation-pattern", "--pattern", "pattern_a"]
  },
  {
    title: "resolveProjectRoot keeps cwd for restore-conversation-pattern",
    argv: ["node", "power-ai-skills", "restore-conversation-pattern", "--pattern", "pattern_a"]
  },
  {
    title: "resolveProjectRoot keeps cwd for review-conversation-pattern",
    argv: ["node", "power-ai-skills", "review-conversation-pattern", "--pattern", "pattern_a", "--accept"]
  },
  {
    title: "resolveProjectRoot keeps cwd for materialize-wrapper-promotion positional tool name",
    argv: ["node", "power-ai-skills", "materialize-wrapper-promotion", "my-new-tool"]
  },
  {
    title: "resolveProjectRoot keeps cwd for apply-wrapper-promotion positional tool name",
    argv: ["node", "power-ai-skills", "apply-wrapper-promotion", "my-new-tool"]
  },
  {
    title: "resolveProjectRoot keeps cwd for finalize-wrapper-promotion positional tool name",
    argv: ["node", "power-ai-skills", "finalize-wrapper-promotion", "my-new-tool"]
  },
  {
    title: "resolveProjectRoot keeps cwd for register-wrapper-promotion positional tool name",
    argv: ["node", "power-ai-skills", "register-wrapper-promotion", "my-new-tool"]
  },
  {
    title: "resolveProjectRoot keeps cwd for archive-wrapper-promotion positional tool name",
    argv: ["node", "power-ai-skills", "archive-wrapper-promotion", "my-new-tool"]
  },
  {
    title: "resolveProjectRoot keeps cwd for restore-wrapper-promotion positional tool name",
    argv: ["node", "power-ai-skills", "restore-wrapper-promotion", "my-new-tool"]
  }
];

for (const testCase of resolveProjectRootCwdCases) {
  test(testCase.title, (t) => {
    assertResolveProjectRootUsesCwd(t, testCase.argv);
  });
}
