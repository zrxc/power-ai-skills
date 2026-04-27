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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-governance-reports-"));
  const projectRoot = path.join(tempRoot, "consumer-basic");
  copyDir(fixtureRoot, projectRoot);
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return { tempRoot, projectRoot };
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

function writeJsonFile(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function seedGovernanceProject(t) {
  const { tempRoot, projectRoot } = createTempConsumerProject(t);
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
    "--reason", "wait for migration window",
    "--next-review-at", "2024-01-01"
  ]).status, 0);

  const summaryPath = path.join(tempRoot, "governance-summary-records.json");
  writeJsonFile(summaryPath, {
    records: [
      {
        timestamp: "2026-03-20T09:00:00+08:00",
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
      }
    ]
  });

  assert.equal(runCli(projectRoot, "capture-session", ["--input", summaryPath]).status, 0);
  assert.equal(runCli(projectRoot, "analyze-patterns").status, 0);

  const decisionsPath = path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json");
  const ledger = readJson(decisionsPath);
  ledger.decisions = ledger.decisions.map((item) => ({
    ...item,
    decision: "review",
    target: "",
    decisionReason: ""
  }));
  writeJsonFile(decisionsPath, ledger);

  const promotionTracePath = path.join(projectRoot, ".power-ai", "governance", "promotion-trace.json");
  writeJsonFile(promotionTracePath, {
    schemaVersion: 1,
    updatedAt: "2026-03-20T10:00:00+08:00",
    relations: [
      {
        traceKey: "pattern->project-skill::pattern::pattern_tree_list_page::project-skill::tree-list-page-conversation-project",
        relationType: "pattern->project-skill",
        source: {
          type: "pattern",
          id: "pattern_tree_list_page",
          label: "pattern_tree_list_page",
          path: ".power-ai/patterns/project-patterns.json"
        },
        target: {
          type: "project-skill",
          id: "tree-list-page-conversation-project",
          label: "tree-list-page-conversation-project",
          path: ".power-ai/skills/project-local/auto-generated/tree-list-page-conversation-project/SKILL.md"
        },
        metadata: {
          decision: "promoted"
        },
        firstRecordedAt: "2026-03-20T10:00:00+08:00",
        lastRecordedAt: "2026-03-20T10:00:00+08:00"
      }
    ]
  });

  return { projectRoot };
}

test("generate-governance-summary aggregates overdue decisions, review backlog, and promotion trace", (t) => {
  const { projectRoot } = seedGovernanceProject(t);

  const result = runCli(projectRoot, "generate-governance-summary", ["--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.status, "attention");
  assert.equal(payload.summary.overdueGovernanceReviews, 1);
  assert.equal(payload.summary.pendingConversationReviews, 1);
  assert.equal(payload.summary.promotionRelations, 1);
  assert.equal(payload.projectProfile.decision, "deferred");
  assert.equal(payload.reviewDeadlines.summary.overdueReviews, 1);
  assert.equal(payload.conversation.summary.review, 1);
  assert.equal(payload.promotionTrace.summary.total, 1);
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  assert.equal(markdown.includes("## Project Profile"), true);
  assert.equal(markdown.includes("## Promotion Trace"), true);
  assert.equal(
    payload.recommendedActions.some((item) => item.includes("check-governance-review-deadlines")),
    true
  );
});

test("show-governance-history supports conversation and promotion history queries", (t) => {
  const { projectRoot } = seedGovernanceProject(t);

  const conversationResult = runCli(projectRoot, "show-governance-history", [
    "--type", "conversation-decision",
    "--limit", "5",
    "--json"
  ]);
  assert.equal(conversationResult.status, 0, conversationResult.stderr);
  const conversationPayload = JSON.parse(conversationResult.stdout);
  assert.equal(conversationPayload.summary.requestedType, "conversation-decision");
  assert.equal(conversationPayload.summary.returnedEntries >= 1, true);
  assert.equal(conversationPayload.entries[0].governanceType, "conversation-decision");

  const promotionResult = runCli(projectRoot, "show-governance-history", [
    "--type", "promotion",
    "--limit", "5",
    "--json"
  ]);
  assert.equal(promotionResult.status, 0, promotionResult.stderr);
  const promotionPayload = JSON.parse(promotionResult.stdout);
  assert.equal(promotionPayload.summary.requestedType, "promotion");
  assert.equal(promotionPayload.summary.returnedEntries, 1);
  assert.equal(promotionPayload.entries[0].detail.relationType, "pattern->project-skill");
  assert.equal(fs.existsSync(promotionPayload.reportPath), true);
  assert.equal(fs.existsSync(promotionPayload.jsonPath), true);
});

test("generate-governance-summary highlights stale evolution proposal backlog", (t) => {
  const { projectRoot } = seedGovernanceProject(t);

  writeJsonFile(path.join(projectRoot, ".power-ai", "governance", "evolution-proposals.json"), {
    schemaVersion: 1,
    updatedAt: "2026-04-22T10:00:00+08:00",
    proposals: [
      {
        proposalId: "project-profile-adjustment-enterprise-vue",
        proposalType: "project-profile-adjustment-proposal",
        status: "review",
        generatedAt: "2026-04-10T10:00:00+08:00",
        statusUpdatedAt: "2026-04-10T10:00:00+08:00",
        riskLevel: "high",
        sourceCandidateIds: ["profile-adjustment::enterprise-vue"],
        evidence: {
          sourcePatternIds: [],
          sourceConversationIds: [],
          details: {
            recommendedProjectProfile: "enterprise-vue"
          }
        },
        recommendedAction: "Review whether the project should migrate to enterprise-vue."
      },
      {
        proposalId: "shared-skill-promotion-dialog-form",
        proposalType: "shared-skill-promotion-proposal",
        status: "accepted",
        generatedAt: "2026-04-15T10:00:00+08:00",
        statusUpdatedAt: "2026-04-15T10:00:00+08:00",
        riskLevel: "high",
        sourceCandidateIds: ["shared-skill::dialog-form"],
        evidence: {
          sourcePatternIds: ["pattern_dialog_form"],
          sourceConversationIds: ["conv_1", "conv_2"],
          details: {}
        },
        recommendedAction: "Promote the repeated dialog-form pattern to a shared skill after manual validation."
      }
    ]
  });

  const result = runCli(projectRoot, "generate-governance-summary", ["--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.summary.evolutionProposals, 2);
  assert.equal(payload.summary.staleEvolutionProposalReviews, 1);
  assert.equal(payload.summary.staleAcceptedEvolutionProposals, 1);
  assert.equal(payload.governanceContext.evolutionProposals.staleReview, 1);
  assert.equal(payload.governanceContext.evolutionProposals.staleAcceptedPendingApply, 1);
  assert.equal(
    payload.recommendedActions.some((item) => item.includes("overdue evolution proposal reviews")),
    true
  );
  assert.equal(
    payload.recommendedActions.some((item) => item.includes("accepted evolution proposals")),
    true
  );
});

test("generate-governance-summary surfaces applied evolution draft follow-ups", (t) => {
  const { projectRoot } = seedGovernanceProject(t);

  writeJsonFile(path.join(projectRoot, ".power-ai", "governance", "evolution-proposals.json"), {
    schemaVersion: 1,
    updatedAt: "2026-04-22T10:00:00+08:00",
    proposals: [
      {
        proposalId: "shared-skill-promotion-dialog-form",
        proposalType: "shared-skill-promotion-proposal",
        status: "applied",
        generatedAt: "2026-04-15T10:00:00+08:00",
        statusUpdatedAt: "2026-04-22T10:00:00+08:00",
        statusUpdatedBy: "apply-evolution-proposal",
        riskLevel: "high",
        sourceCandidateIds: ["shared-skill::dialog-form"],
        evidence: {
          sourcePatternIds: ["pattern_dialog_form"],
          sourceConversationIds: ["conv_1"],
          details: {
            recommendedSkillName: "dialog-form-shared"
          }
        },
        recommendedAction: "Promote the repeated dialog-form pattern to a shared skill after manual validation.",
        applicationArtifacts: {
          artifactType: "shared-skill-draft",
          draftRoot: ".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared",
          files: [
            ".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/SKILL.md",
            ".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/manual-checklist.md"
          ],
          nextActions: [
            "Review .power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/SKILL.md",
            "Promote this draft into the shared-skill workflow manually after validation."
          ],
          reusedExistingDraft: false,
          handoff: {
            status: "pending-human-follow-up",
            ownerHint: "shared-skill-maintainers",
            nextReviewAt: "",
            nextAction: "Review .power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/SKILL.md",
            checklistPath: ".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/manual-checklist.md",
            boundary: [
              "Do not auto-promote this draft into the shared-skill catalog from evolution apply.",
              "Keep release and publication decisions manual."
            ]
          },
          skillName: "dialog-form-shared",
          displayName: "Dialog Form Shared"
        }
      }
    ]
  });

  const result = runCli(projectRoot, "generate-governance-summary", ["--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.summary.evolutionProposals, 1);
  assert.equal(payload.summary.appliedEvolutionProposals, 1);
  assert.equal(payload.summary.appliedSharedSkillDrafts, 1);
  assert.equal(payload.summary.appliedProposalFollowUps, 1);
  assert.equal(payload.governanceContext.evolutionProposals.applied, 1);
  assert.equal(payload.governanceContext.evolutionProposals.appliedSharedSkillDrafts, 1);
  assert.equal(payload.governanceContext.evolutionProposals.appliedDraftsWithFollowUps, 1);
  assert.equal(payload.governanceContext.evolutionProposals.followUpDraftPreview.length, 1);
  assert.equal(payload.governanceContext.evolutionProposals.followUpDraftPreview[0].ownerHint, "shared-skill-maintainers");
  assert.equal(payload.governanceContext.evolutionProposals.followUpDraftPreview[0].checklistPath, ".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/manual-checklist.md");
  assert.equal(
    payload.governanceContext.evolutionProposals.nextActionPreview.some((item) => item.includes("shared-skill workflow")),
    true
  );
  assert.equal(
    payload.recommendedActions.some((item) => item.includes("applied evolution proposal drafts")),
    true
  );

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  assert.equal(markdown.includes("applied shared-skill drafts: 1"), true);
  assert.equal(markdown.includes("next proposal actions"), true);
  assert.equal(markdown.includes("draft handoff preview"), true);
  assert.equal(markdown.includes("shared-skill-maintainers"), true);
});
