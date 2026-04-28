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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-upgrade-summary-"));
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

function runRepoCli(command, extraArgs = [], options = {}) {
  return spawnSync(
    process.execPath,
    [cliPath, command, ...extraArgs],
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

function writeJsonFile(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function createTempManifestSnapshot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-upgrade-summary-manifest-"));
  const manifestRoot = path.join(tempRoot, "manifest");
  copyDir(path.join(root, "manifest"), manifestRoot);
  const notificationsRoot = path.join(manifestRoot, "notifications");
  const latestNotificationJson = fs.readdirSync(notificationsRoot)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left, "en"))[0];
  const latestNotificationMarkdown = latestNotificationJson.replace(/\.json$/i, ".md");
  const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  const latestNotificationJsonPath = path.join(notificationsRoot, latestNotificationJson);
  const latestNotificationPayload = JSON.parse(fs.readFileSync(latestNotificationJsonPath, "utf8"));
  const governanceOperationsJsonPath = path.join(manifestRoot, "governance-operations-report.json");
  const governanceOperationsMarkdownPath = path.join(manifestRoot, "governance-operations-report.md");
  latestNotificationPayload.links = {
    ...latestNotificationPayload.links,
    changedFilesPath: path.join(manifestRoot, "changed-files.txt"),
    impactReportPath: path.join(manifestRoot, "impact-report.json"),
    upgradeRiskReportPath: path.join(manifestRoot, "upgrade-risk-report.json"),
    upgradeRiskMarkdownPath: path.join(manifestRoot, "upgrade-risk-report.md"),
    promotionTraceReportPath: path.join(manifestRoot, "promotion-trace-report.json"),
    promotionTraceMarkdownPath: path.join(manifestRoot, "promotion-trace-report.md"),
    consumerCompatibilityMatrixPath: path.join(manifestRoot, "consumer-compatibility-matrix.json"),
    consumerCompatibilityMatrixMarkdownPath: path.join(manifestRoot, "consumer-compatibility-matrix.md"),
    releaseGateReportPath: path.join(manifestRoot, "release-gate-report.json"),
    releaseGateMarkdownPath: path.join(manifestRoot, "release-gate-report.md"),
    governanceOperationsReportPath: governanceOperationsJsonPath,
    governanceOperationsMarkdownPath: governanceOperationsMarkdownPath,
    upgradeAdvicePackagePath: path.join(manifestRoot, "upgrade-advice-package.json"),
    upgradeAdvicePackageMarkdownPath: path.join(manifestRoot, "upgrade-advice-package.md"),
    impactTaskPath: path.join(manifestRoot, "impact-tasks", path.basename(latestNotificationPayload.links?.impactTaskPath || "impact-task.md")),
    automationReportPath: path.join(manifestRoot, "automation-report.json")
  };
  fs.writeFileSync(latestNotificationJsonPath, `${JSON.stringify(latestNotificationPayload, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(manifestRoot, "version-record.json"),
    `${JSON.stringify({
      packageName: "@power/power-ai-skills",
      version,
      recordedAt: new Date().toISOString(),
      artifacts: {
        skillsManifestPath: path.join(manifestRoot, "skills-manifest.json"),
        releaseNotesPath: path.join(manifestRoot, `release-notes-${version}.md`),
        versionRecordPath: path.join(manifestRoot, "version-record.json"),
        impactReportPath: path.join(manifestRoot, "impact-report.json"),
        upgradeRiskReportPath: path.join(manifestRoot, "upgrade-risk-report.json"),
        upgradeRiskMarkdownPath: path.join(manifestRoot, "upgrade-risk-report.md"),
        promotionTraceReportPath: path.join(manifestRoot, "promotion-trace-report.json"),
        promotionTraceMarkdownPath: path.join(manifestRoot, "promotion-trace-report.md"),
        consumerCompatibilityMatrixPath: path.join(manifestRoot, "consumer-compatibility-matrix.json"),
        consumerCompatibilityMatrixMarkdownPath: path.join(manifestRoot, "consumer-compatibility-matrix.md"),
        releaseGateReportPath: path.join(manifestRoot, "release-gate-report.json"),
        releaseGateMarkdownPath: path.join(manifestRoot, "release-gate-report.md"),
        governanceOperationsReportPath: governanceOperationsJsonPath,
        governanceOperationsMarkdownPath: governanceOperationsMarkdownPath,
        upgradeAdvicePackagePath: path.join(manifestRoot, "upgrade-advice-package.json"),
        upgradeAdvicePackageMarkdownPath: path.join(manifestRoot, "upgrade-advice-package.md"),
        automationReportPath: path.join(manifestRoot, "automation-report.json"),
        releaseOrchestrationRecordPath: path.join(manifestRoot, "release-orchestration-record.json"),
        notificationJsonPath: latestNotificationJsonPath,
        notificationMarkdownPath: path.join(notificationsRoot, latestNotificationMarkdown)
      },
      governanceSummary: {
        releaseGateStatus: "pass",
        warningGates: 0,
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        pendingConversationReviews: 0,
        pendingWrapperProposals: 0,
        failedCompatibilityScenarios: 0,
        consumerMatrixScenarioCount: 1,
        matchedPromotionRelations: 1,
        totalPromotionRelations: 3,
        recentGovernanceActivityCount: 6
      },
      releaseOrchestrationSummary: {
        executionId: "release_orchestration_20260428120500000",
        recordedAt: "2026-04-28T12:05:00.000Z",
        status: "published-awaiting-follow-up",
        executionMode: "dry-run-plan-recorded",
        stageModelVersion: 1,
        blockerCount: 0,
        blockers: [],
        stageCount: 4,
        stageStatuses: [
          { id: "prepare-release-artifacts", kind: "prepare", status: "completed", humanGate: false },
          { id: "plan-controlled-publish", kind: "plan", status: "completed", humanGate: false },
          { id: "execute-controlled-publish", kind: "publish", status: "completed", humanGate: true },
          { id: "post-publish-follow-up", kind: "post-publish", status: "ready", humanGate: false }
        ],
        humanGateCount: 1,
        nextAction: {
          kind: "post-publish-follow-up",
          command: "npx power-ai-skills generate-upgrade-summary --json",
          reason: "Controlled publish has completed; refresh release-facing summaries and review follow-up artifacts before broad rollout."
        },
        releasePublishPlanStatus: "eligible",
        latestPublishExecutionStatus: "published",
        publishRecordPath: path.join(manifestRoot, "release-publish-record.json"),
        versionRecordPath: path.join(manifestRoot, "version-record.json"),
        recordPath: path.join(manifestRoot, "release-orchestration-record.json"),
        recordPathRelative: "manifest/release-orchestration-record.json",
        historicalRecordPath: path.join(manifestRoot, "release-orchestration-records", "release_orchestration_20260428120500000.json"),
        historicalRecordPathRelative: "manifest/release-orchestration-records/release_orchestration_20260428120500000.json"
      }
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "consumer-compatibility-matrix.json"),
    `${JSON.stringify({
      packageName: "@power/power-ai-skills",
      version,
      generatedAt: new Date().toISOString(),
      summary: {
        totalScenarios: 1,
        passedScenarios: 1,
        failedScenarios: 0,
        fixtureScenarioCount: 1,
        projectScenarioCount: 0,
        strategies: [{ strategy: "team-default", count: 1 }],
        fixtures: [{ fixtureName: "basic", count: 1 }],
        selectedTools: [{ toolName: "codex", count: 1 }],
        selectedProjectProfiles: [{ projectProfile: "terminal-governance", count: 1 }],
        projectProfileDecisions: [{ decision: "accepted", count: 1 }],
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        pendingConversationReviews: 0,
        scenariosWithPendingConversationReviews: 0,
        pendingWrapperProposals: 0,
        scenariosWithPendingWrapperProposals: 0
      },
      dimensions: {
        commandSet: ["init", "sync", "doctor"],
        initStrategy: "team-default",
        profiles: [],
        requestedTools: [],
        selectedTools: ["codex"],
        selectedProjectProfiles: ["terminal-governance"],
        projectProfileDecisions: ["accepted"],
        fixtures: ["basic"]
      },
      scenarios: [
        {
          scenarioId: "basic",
          scenarioLabel: "fixture:basic",
          targetType: "fixture",
          fixtureName: "basic",
          projectRoot: path.join(manifestRoot, "fixtures", "basic"),
          initStrategy: "team-default",
          commands: ["init", "sync", "doctor"],
          ok: true,
          doctorOk: true,
          artifactOk: true,
          selectedPresets: ["enterprise-standard"],
          selectedTools: ["codex"],
          expandedTools: ["agents-md", "codex"],
          governanceContext: {
            selectedProjectProfile: "terminal-governance",
            recommendedProjectProfile: "terminal-governance",
            projectProfileDecision: "accepted",
            baselineStatus: "ok",
            policyDriftStatus: "ok",
            pendingConversationReviews: 0,
            pendingWrapperProposals: 0,
            hasRecommendedProfileDrift: false
          },
          failureCodes: [],
          failedCommands: [],
          missingArtifacts: [],
          artifactCheckCount: 10
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "promotion-trace-report.json"),
    `${JSON.stringify({
      packageName: "@power/power-ai-skills",
      version,
      generatedAt: new Date().toISOString(),
      available: true,
      tracePath: path.join(manifestRoot, "..", ".power-ai", "governance", "promotion-trace.json"),
      changedFilesPath: path.join(manifestRoot, "changed-files.txt"),
      summary: {
        changedFileCount: 2,
        totalRelations: 3,
        matchedRelations: 1
      },
      matchedRelations: [
        {
          relationType: "pattern->project-skill",
          source: {
            type: "pattern",
            id: "pattern_tree_list_page"
          },
          target: {
            type: "project-skill",
            id: "tree-list-page-conversation-project"
          },
          matchedPaths: ["src/conversation-miner/index.mjs"]
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "promotion-trace-report.md"),
    "# Promotion Trace Release Report\n\n- matched relations: 1\n",
    "utf8"
  );
  fs.writeFileSync(
    governanceOperationsJsonPath,
    `${JSON.stringify({
      packageName: "@power/power-ai-skills",
      version,
      generatedAt: new Date().toISOString(),
      summary: {
        releaseGateStatus: "pass",
        releaseGateWarnings: 0,
        blockingIssues: 0,
        failedCompatibilityScenarios: 0,
        consumerMatrixScenarioCount: 1,
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        overdueGovernanceReviews: 0,
        dueTodayGovernanceReviews: 0,
        pendingConversationReviews: 0,
        pendingWrapperProposals: 0,
        readyForRegistration: 0,
        pendingFollowUps: 0,
        stalledProposalCount: 0,
        matchedPromotionRelations: 1,
        totalPromotionRelations: 3,
        manualCheckCount: 1,
        blockingCheckCount: 0,
        recentActivityCount: 6
      },
      backlog: {},
      releaseReadiness: {
        releaseGateStatus: "pass",
        blockingIssues: 0,
        warningGates: 0,
        canPublish: true,
        broadRolloutReady: true,
        requiresExplicitAcknowledgement: false
      },
      recentActivities: [],
      artifacts: {},
      recommendedActions: []
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(governanceOperationsMarkdownPath, "# Governance Operations Report\n", "utf8");
  fs.writeFileSync(
    path.join(manifestRoot, "consumer-compatibility-matrix.md"),
    "# Consumer Compatibility Matrix\n\n- total scenarios: 1\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "release-gate-report.json"),
    `${JSON.stringify({
      packageName: "@power/power-ai-skills",
      version,
      generatedAt: new Date().toISOString(),
      overallStatus: "pass",
      summary: {
        totalGates: 6,
        passedGates: 6,
        warningGates: 0,
        failedGates: 0,
        blockingIssues: 0,
        teamPolicyErrorCount: 0,
        readyForRegistration: 0,
        pendingFollowUps: 0,
        stalledProposalCount: 0,
        failedCompatibilityScenarios: 0,
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        pendingConversationReviews: 0,
        scenariosWithPendingConversationReviews: 0,
        pendingWrapperProposals: 0,
        scenariosWithPendingWrapperProposals: 0
      },
      gates: [],
      compatibilityMatrix: {
        required: true,
        available: true,
        scenarioCount: 1,
        passedScenarioCount: 1,
        failedScenarioCount: 0
      },
      governance: {
        matrixAvailable: true,
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        pendingConversationReviews: 0,
        scenariosWithPendingConversationReviews: 0,
        pendingWrapperProposals: 0,
        scenariosWithPendingWrapperProposals: 0
      },
      wrapperGovernance: {
        summary: {},
        recommendedActions: [],
        readyForRegistration: [],
        pendingFollowUps: [],
        stalledProposals: []
      },
      teamPolicy: {
        ok: true,
        errorCount: 0,
        warningCount: 0,
        releasePolicies: {
          enforceConsumerMatrix: true,
          enforceReleaseGates: true
        }
      },
      recommendedActions: []
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "release-gate-report.md"),
    "# Release Gate Report\n\n- overall status: `pass`\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "upgrade-advice-package.json"),
    `${JSON.stringify({
      packageName: "@power/power-ai-skills",
      version,
      generatedAt: new Date().toISOString(),
      releaseLevel: "minor",
      overallRiskLevel: "high",
      blocked: false,
      summary: {
        consumerCommandCount: 2,
        maintainerCommandCount: 3,
        manualCheckCount: 1,
        blockingCheckCount: 0,
        compatibilityFailures: 0,
        releaseGateFailures: 0,
        releaseGateWarnings: 0,
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        pendingConversationReviews: 0,
        pendingWrapperProposals: 0
      },
      consumerCommands: [
        {
          command: "pnpm exec power-ai-skills sync",
          reason: "同步中心仓库最新 skills、shared、adapters 和 registry。",
          audience: "consumer"
        }
      ],
      maintainerCommands: [],
      manualChecks: []
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "upgrade-advice-package.md"),
    "# Upgrade Advice Package\n\n- blocked: false\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "release-publish-record.json"),
    `${JSON.stringify({
      executionId: "release_publish_20260428121000000",
      recordedAt: "2026-04-28T12:10:00.000Z",
      packageName: "@power/power-ai-skills",
      version,
      packageRoot: root,
      projectRoot: root,
      status: "published",
      executionMode: "manifest-recorded-publish",
      realPublishEnabled: true,
      publishAttempted: true,
      publishSucceeded: true,
      wouldExecuteCommand: "npm publish --registry \"https://registry.npmjs.org/\"",
      commandFlags: {
        confirm: false,
        acknowledgeWarnings: false
      },
      targetPublish: {
        packageName: "@power/power-ai-skills",
        version,
        registryUrl: "https://registry.npmjs.org/",
        access: "public",
        tag: "latest",
        publishCommand: "npm publish --registry \"https://registry.npmjs.org/\""
      },
      plannerSummary: {
        status: "eligible",
        blockerCount: 0,
        blockers: [],
        publishReadiness: {
          releaseGateStatus: "pass",
          warningGates: 0,
          blockingIssues: 0,
          canPublish: true,
          broadRolloutReady: true,
          requiresExplicitAcknowledgement: false
        },
        artifacts: {
          releaseGateReportPath: "manifest/release-gate-report.json"
        }
      },
      blockers: [],
      notes: [
        "Secondary eligibility check passed and the real npm publish command completed successfully."
      ],
      manualConfirmation: {
        mode: "package-maintainer-manual",
        commands: [
          "pnpm refresh:release-artifacts",
          "pnpm release:validate",
          "pnpm release:check",
          "pnpm release:generate",
          "npm publish --registry \"https://registry.npmjs.org/\""
        ],
        publishCommand: "npm publish --registry \"https://registry.npmjs.org/\""
      },
      recordPath: path.join(manifestRoot, "release-publish-record.json"),
      recordPathRelative: "manifest/release-publish-record.json",
      historicalRecordPath: path.join(manifestRoot, "release-publish-records", "release_publish_20260428121000000.json"),
      historicalRecordPathRelative: "manifest/release-publish-records/release_publish_20260428121000000.json",
      failureSummaryPath: "",
      failureSummaryPathRelative: "",
      failureSummary: {
        present: false,
        primaryReason: "",
        summaryPath: "",
        summaryPathRelative: ""
      }
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "release-orchestration-record.json"),
    `${JSON.stringify({
      executionId: "release_orchestration_20260428120500000",
      recordedAt: "2026-04-28T12:05:00.000Z",
      packageName: "@power/power-ai-skills",
      version,
      packageRoot: root,
      projectRoot: root,
      status: "published-awaiting-follow-up",
      executionMode: "dry-run-plan-recorded",
      stageModelVersion: 1,
      blockers: [],
      stages: [
        { id: "prepare-release-artifacts", kind: "prepare", status: "completed", humanGate: false },
        { id: "plan-controlled-publish", kind: "plan", status: "completed", humanGate: false },
        { id: "execute-controlled-publish", kind: "publish", status: "completed", humanGate: true },
        { id: "post-publish-follow-up", kind: "post-publish", status: "ready", humanGate: false }
      ],
      humanGates: [
        {
          stageId: "execute-controlled-publish",
          title: "Run controlled publish execution",
          summary: "Controlled publish already completed successfully for the current release snapshot."
        }
      ],
      nextAction: {
        kind: "post-publish-follow-up",
        command: "npx power-ai-skills generate-upgrade-summary --json",
        reason: "Controlled publish has completed; refresh release-facing summaries and review follow-up artifacts before broad rollout."
      },
      evidence: {
        releasePublishPlanStatus: "eligible",
        latestPublishExecutionStatus: "published",
        targetPublish: {
          packageName: "@power/power-ai-skills",
          version,
          registryUrl: "https://registry.npmjs.org/"
        }
      },
      orchestrationContract: {
        executionMode: "dry-run-plan-recorded",
        stageModelVersion: 1,
        orchestrationRecordPath: path.join(manifestRoot, "release-orchestration-record.json"),
        publishRecordPath: path.join(manifestRoot, "release-publish-record.json"),
        versionRecordPath: path.join(manifestRoot, "version-record.json")
      },
      recordPath: path.join(manifestRoot, "release-orchestration-record.json"),
      recordPathRelative: "manifest/release-orchestration-record.json",
      historicalRecordPath: path.join(manifestRoot, "release-orchestration-records", "release_orchestration_20260428120500000.json"),
      historicalRecordPathRelative: "manifest/release-orchestration-records/release_orchestration_20260428120500000.json"
    }, null, 2)}\n`,
    "utf8"
  );
  fs.mkdirSync(path.join(manifestRoot, "release-publish-records"), { recursive: true });
  fs.writeFileSync(
    path.join(manifestRoot, "release-publish-records", "release_publish_20260428121000000.json"),
    "{\n  \"status\": \"confirmation-required\"\n}\n",
    "utf8"
  );
  fs.mkdirSync(path.join(manifestRoot, "release-orchestration-records"), { recursive: true });
  fs.writeFileSync(
    path.join(manifestRoot, "release-orchestration-records", "release_orchestration_20260428120500000.json"),
    "{\n  \"status\": \"ready-for-controlled-publish\"\n}\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(manifestRoot, "release-publish-failure-summary.md"),
    "# Release Publish Failure Summary\n\n- status: `confirmation-required`\n",
    "utf8"
  );
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return manifestRoot;
}

test("generate-upgrade-summary writes consumer-project summary artifacts", (t) => {
  const projectRoot = createTempConsumerProject(t);
  fs.mkdirSync(path.join(projectRoot, "src", "views", "users"), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, "src", "views", "users", "index.vue"),
    `<template>
  <pc-layout-page-common>
    <pc-table-warp />
  </pc-layout-page-common>
</template>
<script setup lang="ts">
const searchForm = {};
const pageValue = { pageNum: 1, pageSize: 20 };
function getList() {}
</script>
`,
    "utf8"
  );

  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]).status, 0);

  const result = runCli(projectRoot, "generate-upgrade-summary", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.mode, "single-source");
  assert.equal(payload.status, "ok");
  assert.equal(payload.doctor.ok, true);
  assert.equal(payload.projectScan.available, true);
  assert.equal(payload.projectScan.patternCount >= 1, true);
  assert.equal(payload.projectScan.viewFileCount >= 1, true);
  assert.equal(payload.conversation.available, false);
  assert.equal(payload.wrapperPromotions.available, true);
  assert.equal(payload.wrapperPromotions.summary.total, 0);
  assert.equal(payload.release.available, false);
  assert.equal(Array.isArray(payload.recommendedActions), true);
  assert.equal(payload.reportPath, path.join(projectRoot, ".power-ai", "reports", "upgrade-summary.md"));
  assert.equal(payload.jsonPath, path.join(projectRoot, ".power-ai", "reports", "upgrade-summary.json"));
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  const savedJson = JSON.parse(fs.readFileSync(payload.jsonPath, "utf8"));
  assert.equal(markdown.includes("## Project Scan"), true);
  assert.equal(markdown.includes("## Wrapper Promotions"), true);
  assert.equal(savedJson.projectScan.available, true);
  assert.equal(savedJson.wrapperPromotions.summary.total, 0);
  assert.equal(savedJson.promotionTrace.available, true);
});

test("generate-upgrade-summary includes conversation decision ledger details when available", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex"]).status, 0);

  writeJsonFile(path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json"), {
    projectName: "consumer-basic",
    lastAnalyzed: "2026-04-21T10:00:00.000Z",
    filters: { from: "", to: "" },
    summary: {
      fileCount: 1,
      recordCount: 3,
      generate: 1,
      review: 1,
      skip: 0,
      activeMerges: 0,
      archivedPatterns: 0
    },
    patterns: [
      {
        id: "pattern_tree_list_page",
        sceneType: "tree-list-page",
        frequency: 2,
        reuseScore: 72,
        recommendation: "generate"
      },
      {
        id: "pattern_dialog_form",
        sceneType: "dialog-form",
        frequency: 1,
        reuseScore: 52,
        recommendation: "review"
      }
    ]
  });
  writeJsonFile(path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json"), {
    schemaVersion: 1,
    updatedAt: "2026-04-21T10:01:00.000Z",
    decisions: [
      {
        patternId: "pattern_tree_list_page",
        sceneType: "tree-list-page",
        sourceConversationIds: ["conv-1", "conv-2"],
        recommendation: "generate",
        decision: "promoted",
        target: "project-local-skill",
        decisionReason: "Generated a local skill.",
        reviewedBy: "system",
        reviewedAt: "2026-04-21T10:01:00.000Z",
        trace: {
          skillName: "tree-list-page-conversation-project"
        }
      },
      {
        patternId: "pattern_dialog_form",
        sceneType: "dialog-form",
        sourceConversationIds: ["conv-3"],
        recommendation: "review",
        decision: "review",
        target: "",
        decisionReason: "",
        reviewedBy: "system",
        reviewedAt: "2026-04-21T10:01:00.000Z",
        trace: {}
      }
    ]
  });
  writeJsonFile(path.join(projectRoot, ".power-ai", "governance", "conversation-decision-history.json"), {
    schemaVersion: 1,
    entries: [
      {
        recordedAt: "2026-04-21T10:01:00.000Z",
        trigger: "analyze-patterns",
        patternId: "pattern_dialog_form",
        snapshot: {
          patternId: "pattern_dialog_form",
          sceneType: "dialog-form",
          sourceConversationIds: ["conv-3"],
          recommendation: "review",
          decision: "review",
          target: "",
          decisionReason: "",
          reviewedBy: "system",
          reviewedAt: "2026-04-21T10:01:00.000Z",
          trace: {}
        }
      }
    ]
  });
  fs.mkdirSync(path.join(projectRoot, ".power-ai", "reports"), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, ".power-ai", "reports", "conversation-decisions.md"),
    "# Conversation Decisions\n",
    "utf8"
  );
  writeJsonFile(path.join(projectRoot, ".power-ai", "governance", "promotion-trace.json"), {
    schemaVersion: 1,
    updatedAt: "2026-04-21T10:02:00.000Z",
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
          path: ".power-ai/skills/project-local/auto-generated/tree-list-page-conversation-project"
        },
        metadata: {
          decision: "promoted"
        },
        firstRecordedAt: "2026-04-21T10:02:00.000Z",
        lastRecordedAt: "2026-04-21T10:02:00.000Z"
      }
    ]
  });
  fs.writeFileSync(
    path.join(projectRoot, ".power-ai", "reports", "promotion-trace.md"),
    "# Promotion Trace\n",
    "utf8"
  );

  const result = runCli(projectRoot, "generate-upgrade-summary", ["--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.conversation.available, true);
  assert.equal(payload.conversation.decisionSummary.review, 1);
  assert.equal(payload.conversation.decisionSummary.promoted, 1);
  assert.equal(payload.promotionTrace.available, true);
  assert.equal(payload.promotionTrace.summary.patternToProjectSkill, 1);
  assert.equal(
    payload.conversation.artifacts.conversationDecisionsPath,
    path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json")
  );
  assert.equal(
    payload.recommendedActions.some((item) => item.includes("conversation-miner patterns still marked as `review`")),
    true
  );

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  assert.equal(markdown.includes("## Conversation Miner"), true);
  assert.equal(markdown.includes("decision ledger"), true);
});

test("generate-upgrade-summary surfaces applied evolution draft follow-ups from governance context", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]).status, 0);

  writeJsonFile(path.join(projectRoot, ".power-ai", "governance", "evolution-proposals.json"), {
    schemaVersion: 1,
    updatedAt: "2026-04-22T10:00:00+08:00",
    proposals: [
      {
        proposalId: "wrapper-rollout-adjustment-dialog-form",
        proposalType: "wrapper-rollout-adjustment-proposal",
        status: "applied",
        generatedAt: "2026-04-20T10:00:00+08:00",
        statusUpdatedAt: "2026-04-22T10:00:00+08:00",
        statusUpdatedBy: "apply-evolution-proposal",
        riskLevel: "high",
        sourceCandidateIds: ["wrapper-proposal::dialog-form"],
        evidence: {
          sourcePatternIds: ["pattern_dialog_form"],
          sourceConversationIds: ["conv_1"],
          details: {
            recommendedToolName: "my-upgrade-wrapper",
            displayName: "My Upgrade Wrapper",
            integrationStyle: "terminal"
          }
        },
        recommendedAction: "Create a wrapper promotion draft and keep final registration manual.",
        applicationArtifacts: {
          artifactType: "wrapper-promotion-draft",
          draftRoot: ".power-ai/proposals/wrapper-promotions/my-upgrade-wrapper",
          files: [
            ".power-ai/proposals/wrapper-promotions/my-upgrade-wrapper/wrapper-promotion.json"
          ],
          nextActions: [
            "npx power-ai-skills materialize-wrapper-promotion --tool my-upgrade-wrapper",
            "npx power-ai-skills apply-wrapper-promotion --tool my-upgrade-wrapper --dry-run"
          ],
          reusedExistingDraft: false,
          handoff: {
            status: "pending-human-follow-up",
            ownerHint: "wrapper-governance",
            nextReviewAt: "",
            nextAction: "npx power-ai-skills materialize-wrapper-promotion --tool my-upgrade-wrapper",
            checklistPath: ".power-ai/proposals/wrapper-promotions/my-upgrade-wrapper/post-apply-checklist.md",
            boundary: [
              "Keep final wrapper registration manual."
            ]
          },
          toolName: "my-upgrade-wrapper",
          displayName: "My Upgrade Wrapper",
          integrationStyle: "terminal"
        }
      }
    ]
  });

  const result = runCli(projectRoot, "generate-upgrade-summary", ["--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.governanceContext.evolutionProposals.applied, 1);
  assert.equal(payload.governanceContext.evolutionProposals.appliedWrapperPromotionDrafts, 1);
  assert.equal(payload.governanceContext.evolutionProposals.appliedDraftsWithFollowUps, 1);
  assert.equal(payload.governanceContext.evolutionProposals.followUpDraftPreview.length, 1);
  assert.equal(payload.governanceContext.evolutionProposals.followUpDraftPreview[0].ownerHint, "wrapper-governance");
  assert.equal(payload.governanceContext.evolutionProposals.followUpDraftPreview[0].checklistPath, ".power-ai/proposals/wrapper-promotions/my-upgrade-wrapper/post-apply-checklist.md");
  assert.equal(
    payload.governanceContext.evolutionProposals.nextActionPreview.some((item) => item.includes("materialize-wrapper-promotion")),
    true
  );
  assert.equal(
    payload.recommendedActions.some((item) => item.includes("applied evolution proposal drafts")),
    true
  );

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  assert.equal(markdown.includes("applied wrapper drafts: 1"), true);
  assert.equal(markdown.includes("next proposal actions"), true);
  assert.equal(markdown.includes("draft handoff preview"), true);
  assert.equal(markdown.includes("wrapper-governance"), true);
});

test("generate-upgrade-summary writes package-maintenance release summary artifacts", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);

  const result = runRepoCli("generate-upgrade-summary", ["--json"], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot
    }
  });
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.mode, "package-maintenance");
  assert.equal(payload.release.available, true);
  assert.equal(payload.release.ok, true);
  assert.equal(payload.release.recommendedReleaseLevel, "minor");
  assert.equal(payload.release.overallRiskLevel, "high");
  assert.equal(payload.release.risk.categoryCount >= 1, true);
  assert.equal(payload.release.promotionTrace.matchedRelations, 1);
  assert.equal(payload.release.compatibilityMatrix.scenarioCount, 1);
  assert.equal(payload.release.compatibilityMatrix.failedScenarioCount, 0);
  assert.equal(payload.release.releaseGates.overallStatus, "pass");
  assert.equal(payload.release.upgradeAdvice.consumerCommandCount, 2);
  assert.equal(payload.release.upgradeAdvice.blocked, false);
  assert.equal(payload.release.publishExecution.status, "published");
  assert.equal(payload.release.publishExecution.realPublishEnabled, true);
  assert.equal(payload.release.publishExecution.publishAttempted, true);
  assert.equal(payload.release.publishExecution.failureSummaryPresent, false);
  assert.equal(payload.release.publishExecution.recordPath, path.join(manifestRoot, "release-publish-record.json"));
  assert.equal(payload.release.publishExecution.failureSummaryPath, "");
  assert.equal(payload.release.orchestration.status, "published-awaiting-follow-up");
  assert.equal(payload.release.orchestration.stageCount, 4);
  assert.equal(payload.release.orchestration.blockerCount, 0);
  assert.equal(payload.release.orchestration.recordPath, path.join(manifestRoot, "release-orchestration-record.json"));
  assert.equal(payload.release.changedFileCount >= 1, true);
  assert.equal(payload.reportPath, path.join(manifestRoot, "upgrade-summary.md"));
  assert.equal(payload.jsonPath, path.join(manifestRoot, "upgrade-summary.json"));
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
  assert.equal(payload.doctor.mode, "package-maintenance");
  assert.equal(payload.release.notification.level, "minor");
  assert.equal(Array.isArray(payload.release.followUps), true);
  assert.equal(payload.release.followUps.length >= 1, true);
  assert.equal(Array.isArray(payload.release.risk.recommendedActions), true);
  assert.equal(payload.release.risk.recommendedActions.length >= 1, true);

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  const savedJson = JSON.parse(fs.readFileSync(payload.jsonPath, "utf8"));
  assert.equal(markdown.includes("## Release Governance"), true);
  assert.equal(savedJson.release.available, true);
  assert.equal(savedJson.release.recommendedReleaseLevel, "minor");
  assert.equal(savedJson.release.overallRiskLevel, "high");
  assert.equal(savedJson.release.compatibilityMatrix.scenarioCount, 1);
  assert.equal(savedJson.release.releaseGates.overallStatus, "pass");
  assert.equal(savedJson.release.upgradeAdvice.consumerCommandCount, 2);
  assert.equal(savedJson.release.publishExecution.status, "published");
  assert.equal(savedJson.release.publishExecution.realPublishEnabled, true);
  assert.equal(savedJson.release.publishExecution.failureSummaryPresent, false);
  assert.equal(savedJson.release.orchestration.status, "published-awaiting-follow-up");
  assert.equal(markdown.includes("publish execution status: `published`"), true);
  assert.equal(markdown.includes("real publish enabled: true"), true);
  assert.equal(markdown.includes("release orchestration status: `published-awaiting-follow-up`"), true);
  assert.equal(markdown.includes("publish execution failure summary"), false);
});
