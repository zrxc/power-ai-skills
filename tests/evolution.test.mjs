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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-evolution-"));
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

test("accepted project-profile evolution proposal can be applied end-to-end", (t) => {
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

  const initResult = runCli(projectRoot, "init", [
    "--tool", "codex",
    "--project-profile", "terminal-governance",
    "--no-project-scan"
  ]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const candidateResult = runCli(projectRoot, "generate-evolution-candidates", ["--json"]);
  assert.equal(candidateResult.status, 0, candidateResult.stderr);
  const candidatePayload = JSON.parse(candidateResult.stdout);
  assert.equal(candidatePayload.summary.total >= 1, true);
  assert.equal(candidatePayload.summary.profileAdjustmentCandidates >= 1, true);

  const proposalResult = runCli(projectRoot, "generate-evolution-proposals", ["--json"]);
  assert.equal(proposalResult.status, 0, proposalResult.stderr);
  const proposalPayload = JSON.parse(proposalResult.stdout);
  assert.equal(proposalPayload.summary.total >= 1, true);
  const profileProposal = proposalPayload.proposals.find((item) => item.proposalType === "project-profile-adjustment-proposal");
  assert.ok(profileProposal);
  assert.equal(profileProposal.evidence.details.recommendedProjectProfile, "enterprise-vue");

  const acceptResult = runCli(projectRoot, "review-evolution-proposal", [
    "--proposal", profileProposal.proposalId,
    "--accept",
    "--note", "accept project profile migration",
    "--json"
  ]);
  assert.equal(acceptResult.status, 0, acceptResult.stderr);
  const acceptedPayload = JSON.parse(acceptResult.stdout);
  assert.equal(acceptedPayload.decision, "accepted");

  const applyResult = runCli(projectRoot, "apply-evolution-proposal", [
    "--proposal", profileProposal.proposalId,
    "--json"
  ]);
  assert.equal(applyResult.status, 0, applyResult.stderr);
  const appliedPayload = JSON.parse(applyResult.stdout);
  assert.equal(appliedPayload.decision, "applied");
  assert.equal(appliedPayload.applicationResult.selectedProjectProfile, "enterprise-vue");
  assert.equal(appliedPayload.applicationResult.recommendedProjectProfile, "enterprise-vue");
  assert.equal(appliedPayload.summary.applied, 1);

  const selectedTools = readJson(path.join(projectRoot, ".power-ai", "selected-tools.json"));
  assert.equal(selectedTools.selectedProjectProfile, "enterprise-vue");
  assert.deepEqual(selectedTools.requiredSkills, [
    "foundation/power-component-library",
    "orchestration/entry-skill",
    "workflow/approval-workflow-skill"
  ]);

  const decisionResult = runCli(projectRoot, "show-project-profile-decision", ["--json"]);
  assert.equal(decisionResult.status, 0, decisionResult.stderr);
  const decisionPayload = JSON.parse(decisionResult.stdout);
  assert.equal(decisionPayload.decision.selectedProjectProfile, "enterprise-vue");
  assert.equal(decisionPayload.decision.decision, "accepted");

  const contextResult = runCli(projectRoot, "show-project-governance-context", ["--json"]);
  assert.equal(contextResult.status, 0, contextResult.stderr);
  const contextPayload = JSON.parse(contextResult.stdout);
  assert.equal(contextPayload.selectedProjectProfile, "enterprise-vue");
  assert.equal(contextPayload.evolutionProposals.applied, 1);
  assert.equal(contextPayload.evolutionProposals.accepted, 0);

  const proposalsLedger = readJson(path.join(projectRoot, ".power-ai", "governance", "evolution-proposals.json"));
  const appliedProposal = proposalsLedger.proposals.find((item) => item.proposalId === profileProposal.proposalId);
  assert.equal(appliedProposal.status, "applied");
});

test("evolution proposals support batch review and batch apply with safe skips", (t) => {
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

  assert.equal(runCli(projectRoot, "init", [
    "--tool", "codex",
    "--project-profile", "terminal-governance",
    "--no-project-scan"
  ]).status, 0);

  const candidateResult = runCli(projectRoot, "generate-evolution-candidates", ["--json"]);
  assert.equal(candidateResult.status, 0, candidateResult.stderr);
  const proposalResult = runCli(projectRoot, "generate-evolution-proposals", ["--json"]);
  assert.equal(proposalResult.status, 0, proposalResult.stderr);
  const proposalPayload = JSON.parse(proposalResult.stdout);
  const profileProposal = proposalPayload.proposals.find((item) => item.proposalType === "project-profile-adjustment-proposal");
  assert.ok(profileProposal);

  const batchReviewResult = runCli(projectRoot, "review-evolution-proposal", [
    "--from-status", "draft",
    "--type", "project-profile-adjustment-proposal",
    "--accept",
    "--limit", "5",
    "--json"
  ]);
  assert.equal(batchReviewResult.status, 0, batchReviewResult.stderr);
  const batchReviewPayload = JSON.parse(batchReviewResult.stdout);
  assert.equal(batchReviewPayload.mode, "batch");
  assert.equal(batchReviewPayload.decision, "accepted");
  assert.equal(batchReviewPayload.processedCount, 1);
  assert.equal(batchReviewPayload.skippedCount, 0);

  const proposalsPath = path.join(projectRoot, ".power-ai", "governance", "evolution-proposals.json");
  const seededLedger = readJson(proposalsPath);
  seededLedger.proposals.push({
    proposalId: "shared-skill-promotion::manual-seeded",
    proposalType: "shared-skill-promotion-proposal",
    sourceCandidateIds: ["shared-skill::manual-seeded"],
    evidence: {
      sourcePatternIds: ["pattern_dialog_form"],
      sourceConversationIds: ["conv_1"],
      details: {
        candidateType: "shared-skill-candidate",
        recommendedSkillName: "dialog-form-shared",
        displayName: "Dialog Form Shared"
      }
    },
    riskLevel: "high",
    generatedAt: "2026-04-20T10:00:00+08:00",
    status: "accepted",
    statusUpdatedAt: "2026-04-20T10:00:00+08:00",
    statusUpdatedBy: "test",
    recommendedAction: "Promote after manual validation.",
    proposalRoot: path.join(projectRoot, ".power-ai", "proposals", "evolution", "shared-skill-manual-seeded")
  });
  seededLedger.proposals.push({
    proposalId: "wrapper-rollout-adjustment::manual-seeded",
    proposalType: "wrapper-rollout-adjustment-proposal",
    sourceCandidateIds: ["wrapper-proposal::manual-seeded"],
    evidence: {
      sourcePatternIds: ["pattern_dialog_form"],
      sourceConversationIds: ["conv_2"],
      details: {
        candidateType: "wrapper-proposal-candidate",
        recommendedToolName: "my-batch-wrapper",
        displayName: "My Batch Wrapper",
        integrationStyle: "terminal"
      }
    },
    riskLevel: "high",
    generatedAt: "2026-04-20T10:10:00+08:00",
    status: "accepted",
    statusUpdatedAt: "2026-04-20T10:10:00+08:00",
    statusUpdatedBy: "test",
    recommendedAction: "Create a wrapper promotion draft and keep final registration manual.",
    proposalRoot: path.join(projectRoot, ".power-ai", "proposals", "evolution", "wrapper-rollout-manual-seeded")
  });
  seededLedger.proposals.push({
    proposalId: "release-impact-escalation::manual-seeded",
    proposalType: "release-impact-escalation-proposal",
    sourceCandidateIds: ["release-impact::manual-seeded"],
    evidence: {
      sourcePatternIds: ["pattern_basic_list_page"],
      sourceConversationIds: ["conv_3"],
      details: {
        candidateType: "release-impact-candidate",
        releaseScope: "notification-payload"
      }
    },
    riskLevel: "high",
    generatedAt: "2026-04-20T10:20:00+08:00",
    status: "accepted",
    statusUpdatedAt: "2026-04-20T10:20:00+08:00",
    statusUpdatedBy: "test",
    recommendedAction: "Prepare a maintainer-facing release escalation draft.",
    proposalRoot: path.join(projectRoot, ".power-ai", "proposals", "evolution", "release-impact-manual-seeded")
  });
  writeJson(proposalsPath, seededLedger);

  const batchApplyResult = runCli(projectRoot, "apply-evolution-proposal", [
    "--from-status", "accepted",
    "--limit", "10",
    "--json"
  ]);
  assert.equal(batchApplyResult.status, 0, batchApplyResult.stderr);
  const batchApplyPayload = JSON.parse(batchApplyResult.stdout);
  assert.equal(batchApplyPayload.mode, "batch");
  assert.equal(batchApplyPayload.processedCount, 4);
  assert.equal(batchApplyPayload.skippedCount, 0);

  const selectedTools = readJson(path.join(projectRoot, ".power-ai", "selected-tools.json"));
  assert.equal(selectedTools.selectedProjectProfile, "enterprise-vue");

  const updatedLedger = readJson(proposalsPath);
  assert.equal(
    updatedLedger.proposals.find((item) => item.proposalId === profileProposal.proposalId)?.status,
    "applied"
  );
  assert.equal(
    updatedLedger.proposals.find((item) => item.proposalId === "shared-skill-promotion::manual-seeded")?.status,
    "applied"
  );
  assert.equal(
    updatedLedger.proposals.find((item) => item.proposalId === "shared-skill-promotion::manual-seeded")?.applicationArtifacts?.artifactType,
    "shared-skill-draft"
  );
  assert.equal(
    updatedLedger.proposals.find((item) => item.proposalId === "wrapper-rollout-adjustment::manual-seeded")?.status,
    "applied"
  );
  assert.equal(
    updatedLedger.proposals.find((item) => item.proposalId === "wrapper-rollout-adjustment::manual-seeded")?.applicationArtifacts?.artifactType,
    "wrapper-promotion-draft"
  );
  assert.equal(
    updatedLedger.proposals.find((item) => item.proposalId === "release-impact-escalation::manual-seeded")?.status,
    "applied"
  );
  assert.equal(
    updatedLedger.proposals.find((item) => item.proposalId === "release-impact-escalation::manual-seeded")?.applicationArtifacts?.artifactType,
    "release-impact-draft"
  );

  const sharedSkillDraftRoot = path.join(
    projectRoot,
    ".power-ai",
    "shared",
    "evolution-drafts",
    "shared-skills",
    "dialog-form-shared"
  );
  assert.equal(fs.existsSync(path.join(sharedSkillDraftRoot, "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(sharedSkillDraftRoot, "skill.meta.json")), true);
  assert.equal(fs.existsSync(path.join(sharedSkillDraftRoot, "manual-checklist.md")), true);
  const sharedSkillMeta = readJson(path.join(sharedSkillDraftRoot, "skill.meta.json"));
  assert.equal(sharedSkillMeta.artifactType, "shared-skill-draft");
  assert.equal(sharedSkillMeta.draftId, "shared-skill-draft::shared-skill-promotion::manual-seeded");
  assert.equal(sharedSkillMeta.generatedFiles.includes(".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/manual-checklist.md"), true);
  assert.equal(sharedSkillMeta.handoff.status, "pending-human-follow-up");
  assert.equal(sharedSkillMeta.handoff.ownerHint, "shared-skill-maintainers");
  assert.equal(sharedSkillMeta.handoff.checklistPath, ".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/manual-checklist.md");

  const wrapperDraftRoot = path.join(
    projectRoot,
    ".power-ai",
    "proposals",
    "wrapper-promotions",
    "my-batch-wrapper"
  );
  assert.equal(fs.existsSync(path.join(wrapperDraftRoot, "wrapper-promotion.json")), true);
  const wrapperDraft = readJson(path.join(wrapperDraftRoot, "wrapper-promotion.json"));
  assert.equal(wrapperDraft.status, "accepted");

  const releaseDraftRoot = path.join(
    projectRoot,
    ".power-ai",
    "shared",
    "evolution-drafts",
    "release-impacts",
    "notification-payload"
  );
  assert.equal(fs.existsSync(path.join(releaseDraftRoot, "release-impact-draft.json")), true);
  assert.equal(fs.existsSync(path.join(releaseDraftRoot, "manual-checklist.md")), true);
  const releaseDraft = readJson(path.join(releaseDraftRoot, "release-impact-draft.json"));
  assert.equal(releaseDraft.artifactType, "release-impact-draft");
  assert.equal(releaseDraft.draftId, "release-impact-draft::release-impact-escalation::manual-seeded");
  assert.equal(releaseDraft.generatedFiles.includes(".power-ai/shared/evolution-drafts/release-impacts/notification-payload/manual-checklist.md"), true);
  assert.equal(releaseDraft.handoff.status, "pending-human-follow-up");
  assert.equal(releaseDraft.handoff.ownerHint, "package-maintenance / release-governance");
  assert.equal(releaseDraft.handoff.checklistPath, ".power-ai/shared/evolution-drafts/release-impacts/notification-payload/manual-checklist.md");

  const listDraftsResult = runCli(projectRoot, "list-evolution-drafts", ["--json"]);
  assert.equal(listDraftsResult.status, 0, listDraftsResult.stderr);
  const listDraftsPayload = JSON.parse(listDraftsResult.stdout);
  assert.equal(listDraftsPayload.summary.total, 3);
  assert.equal(listDraftsPayload.summary.returned, 3);
  assert.equal(listDraftsPayload.summary.pendingFollowUps, 3);
  assert.equal(listDraftsPayload.summary.sharedSkillDrafts, 1);
  assert.equal(listDraftsPayload.summary.wrapperPromotionDrafts, 1);
  assert.equal(listDraftsPayload.summary.releaseImpactDrafts, 1);
  assert.equal(
    listDraftsPayload.drafts.some((item) => item.artifactType === "shared-skill-draft" && item.generatedFiles.some((file) => file.endsWith("SKILL.md"))),
    true
  );
  const sharedDraftListEntry = listDraftsPayload.drafts.find((item) => item.artifactType === "shared-skill-draft");
  assert.equal(sharedDraftListEntry?.checklistPath, ".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/manual-checklist.md");
  assert.equal(sharedDraftListEntry?.handoffStatus, "pending-human-follow-up");
  assert.equal(sharedDraftListEntry?.ownerHint, "shared-skill-maintainers");
  assert.equal(sharedDraftListEntry?.nextAction, "Review .power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/SKILL.md");
  assert.equal(sharedDraftListEntry?.handoff?.boundary?.includes("Do not auto-promote this draft into the shared-skill catalog from evolution apply."), true);
  const releaseDraftListEntry = listDraftsPayload.drafts.find((item) => item.artifactType === "release-impact-draft");
  assert.equal(releaseDraftListEntry?.checklistPath, ".power-ai/shared/evolution-drafts/release-impacts/notification-payload/manual-checklist.md");
  assert.equal(releaseDraftListEntry?.ownerHint, "package-maintenance / release-governance");
  assert.equal(releaseDraftListEntry?.handoff?.boundary?.includes("Do not auto-publish packages."), true);

  const sharedSkillDraftId = listDraftsPayload.drafts.find((item) => item.artifactType === "shared-skill-draft")?.draftId;
  assert.ok(sharedSkillDraftId);

  const showDraftResult = runCli(projectRoot, "show-evolution-draft", [
    sharedSkillDraftId,
    "--json"
  ]);
  assert.equal(showDraftResult.status, 0, showDraftResult.stderr);
  const showDraftPayload = JSON.parse(showDraftResult.stdout);
  assert.equal(showDraftPayload.draft.artifactType, "shared-skill-draft");
  assert.equal(showDraftPayload.draft.proposalId, "shared-skill-promotion::manual-seeded");
  assert.equal(showDraftPayload.draft.followUpActionCount, 2);
  assert.equal(
    showDraftPayload.draft.generatedFiles.some((file) => file.endsWith("skill.meta.json")),
    true
  );
  assert.equal(
    showDraftPayload.draft.nextActions.some((item) => item.includes("shared-skill workflow")),
    true
  );
  assert.equal(showDraftPayload.draft.handoff.status, "pending-human-follow-up");
  assert.equal(showDraftPayload.draft.handoff.ownerHint, "shared-skill-maintainers");
  assert.equal(showDraftPayload.draft.checklistPath, ".power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/manual-checklist.md");
  assert.equal(showDraftPayload.draft.nextAction, "Review .power-ai/shared/evolution-drafts/shared-skills/dialog-form-shared/SKILL.md");
});

test("apply-evolution-actions skips materialized project-local draft refresh when source pattern is unchanged", (t) => {
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
    minConversationCountToAnalyze: 3,
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

  const skillPath = path.join(
    projectRoot,
    ".power-ai",
    "skills",
    "project-local",
    "auto-generated",
    "tree-list-page-conversation-project",
    "SKILL.md"
  );
  const skillBefore = fs.readFileSync(skillPath, "utf8");

  const applyResult = runCli(projectRoot, "apply-evolution-actions", ["--json"]);
  assert.equal(applyResult.status, 0, applyResult.stderr);
  const payload = JSON.parse(applyResult.stdout);
  const refreshAction = payload.actions.find((item) => item.actionType === "refresh-project-local-skill-draft");
  assert.ok(refreshAction);
  assert.equal(refreshAction.status, "skipped");
  assert.equal(refreshAction.result.reason, "project-local draft already up to date");
  assert.equal(refreshAction.result.writeMode, "unchanged");

  const skillAfter = fs.readFileSync(skillPath, "utf8");
  assert.equal(skillAfter, skillBefore);
});

test("apply-evolution-actions refreshes materialized project-local draft when source pattern changes", (t) => {
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
    minConversationCountToAnalyze: 3,
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

  const patternsPath = path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json");
  const patternsPayload = readJson(patternsPath);
  patternsPayload.patterns[0].customizations = [
    ...patternsPayload.patterns[0].customizations,
    "toolbar adds batch-import action"
  ];
  writeJson(patternsPath, patternsPayload);

  const skillPath = path.join(
    projectRoot,
    ".power-ai",
    "skills",
    "project-local",
    "auto-generated",
    "tree-list-page-conversation-project",
    "SKILL.md"
  );
  const skillBefore = fs.readFileSync(skillPath, "utf8");

  const applyResult = runCli(projectRoot, "apply-evolution-actions", ["--json"]);
  assert.equal(applyResult.status, 0, applyResult.stderr);
  const payload = JSON.parse(applyResult.stdout);
  const refreshAction = payload.actions.find((item) => item.actionType === "refresh-project-local-skill-draft");
  assert.ok(refreshAction);
  assert.equal(refreshAction.status, "executed");
  assert.equal(refreshAction.result.writeMode, "updated");

  const skillAfter = fs.readFileSync(skillPath, "utf8");
  assert.equal(skillAfter === skillBefore, false);
  assert.equal(skillAfter.includes("toolbar adds batch-import action"), true);
});
