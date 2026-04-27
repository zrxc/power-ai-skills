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
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-doctor-"));
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

function createTempManifestSnapshot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-doctor-"));
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
  const matrixJsonPath = path.join(manifestRoot, "consumer-compatibility-matrix.json");
  const matrixMarkdownPath = path.join(manifestRoot, "consumer-compatibility-matrix.md");
  const governanceOperationsJsonPath = path.join(manifestRoot, "governance-operations-report.json");
  const governanceOperationsMarkdownPath = path.join(manifestRoot, "governance-operations-report.md");
  latestNotificationPayload.links = {
    ...latestNotificationPayload.links,
    changedFilesPath: path.join(manifestRoot, "changed-files.txt"),
    impactReportPath: path.join(manifestRoot, "impact-report.json"),
    upgradeRiskReportPath: path.join(manifestRoot, "upgrade-risk-report.json"),
    upgradeRiskMarkdownPath: path.join(manifestRoot, "upgrade-risk-report.md"),
    consumerCompatibilityMatrixPath: matrixJsonPath,
    consumerCompatibilityMatrixMarkdownPath: matrixMarkdownPath,
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
        consumerCompatibilityMatrixPath: matrixJsonPath,
        consumerCompatibilityMatrixMarkdownPath: matrixMarkdownPath,
        governanceOperationsReportPath: governanceOperationsJsonPath,
        governanceOperationsMarkdownPath: governanceOperationsMarkdownPath,
        upgradeAdvicePackagePath: path.join(manifestRoot, "upgrade-advice-package.json"),
        upgradeAdvicePackageMarkdownPath: path.join(manifestRoot, "upgrade-advice-package.md"),
        automationReportPath: path.join(manifestRoot, "automation-report.json"),
        notificationJsonPath: latestNotificationJsonPath,
        notificationMarkdownPath: path.join(notificationsRoot, latestNotificationMarkdown),
        releaseGateReportPath: path.join(manifestRoot, "release-gate-report.json"),
        releaseGateMarkdownPath: path.join(manifestRoot, "release-gate-report.md")
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
        totalPromotionRelations: 2,
        recentGovernanceActivityCount: 6
      }
    }, null, 2)}\n`,
    "utf8"
  );
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
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
        releaseGateFailures: 0
      },
      consumerCommands: [],
      maintainerCommands: [],
      manualChecks: []
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(path.join(manifestRoot, "upgrade-advice-package.md"), "# Upgrade Advice Package\n", "utf8");
  fs.writeFileSync(
    matrixJsonPath,
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
      scenarios: []
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(matrixMarkdownPath, "# Consumer Compatibility Matrix\n", "utf8");
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
        totalPromotionRelations: 2,
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
    path.join(manifestRoot, "release-gate-report.json"),
    `${JSON.stringify({
      packageName: "@power/power-ai-skills",
      version,
      overallStatus: "pass",
      summary: {
        totalGates: 6,
        passedGates: 6,
        warningGates: 0,
        failedGates: 0,
        blockingIssues: 0
      },
      governance: {
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        pendingConversationReviews: 0,
        pendingWrapperProposals: 0
      },
      gates: [],
      recommendedActions: []
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(path.join(manifestRoot, "release-gate-report.md"), "# Release Gate Report\n", "utf8");
  return manifestRoot;
}

test("doctor reports a healthy single-source project after init", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "single-source");
  assert.equal(typeof payload.generatedAt, "string");
  assert.deepEqual(payload.selectedTools, ["codex", "cursor"]);
  assert.deepEqual(payload.expandedTools, ["agents-md", "codex", "cursor"]);
  assert.deepEqual(payload.failureCodes, []);
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
  const doctorMarkdown = fs.readFileSync(payload.reportPath, "utf8");
  const doctorJson = JSON.parse(fs.readFileSync(payload.jsonPath, "utf8"));
  assert.equal(doctorMarkdown.includes("## Summary"), true);
  assert.equal(doctorMarkdown.includes("## Checks"), true);
  assert.equal(doctorJson.ok, true);
  assert.equal(doctorJson.mode, "single-source");
  assert.equal(typeof doctorJson.generatedAt, "string");
  assert.equal(Array.isArray(payload.entrypointStates), true);
  assert.equal(payload.entrypointStates.length, 3);
  assert.equal(payload.checks.every((check) => check.ok || check.severity === "warning"), true);
  assert.deepEqual(
    payload.checkGroups.map((group) => group.name),
    ["workspace", "selection", "policy", "entrypoints", "conversation", "knowledge"]
  );
  assert.equal(payload.checkGroups.every((group) => group.ok), true);
  assert.deepEqual(
    payload.checkGroups.map((group) => group.code),
    ["PAI-WORKSPACE", "PAI-SELECTION", "PAI-POLICY", "PAI-ENTRYPOINT", "PAI-CONVERSATION", "PAI-KNOWLEDGE"]
  );
  assert.deepEqual(payload.remediationTips, []);
  assert.equal(
    payload.checks
      .filter((check) => check.group === "conversation")
      .every((check) => check.ok),
    true
  );
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "shared", "conversation-capture.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "references", "conversation-capture-contract.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "codex-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "trae-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "cursor-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "claude-code-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "windsurf-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "gemini-cli-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "github-copilot-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "cline-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "aider-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "custom-tool-capture.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "start-auto-capture-runtime.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "trae-host-bridge.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "cursor-host-bridge.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "windsurf-host-bridge.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "cline-host-bridge.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "adapters", "github-copilot-host-bridge.example.ps1")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "auto-capture", "inbox")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "auto-capture", "processed")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "auto-capture", "failed")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "auto-capture", "response-inbox")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "auto-capture", "response-processed")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "auto-capture", "response-failed")), true);
  assert.deepEqual(
    payload.checks
      .filter((check) => check.name.startsWith("generated ") || check.name.endsWith("skill exists"))
      .map((check) => check.name),
    [
      "generated component registry exists",
      "generated tree-user-crud recipe exists",
      "generated basic-list-crud recipe exists",
      "generated pc-tree guide exists",
      "generated pc-table-warp guide exists",
      "generated pc-dialog guide exists",
      "generated pc-container guide exists",
      "tree-list-page skill exists",
      "basic-list-page skill exists",
      "entry-skill exists"
    ]
  );
});

test("doctor warns when auto-capture failed queues contain pending failures", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const failedPayloadPath = path.join(projectRoot, ".power-ai", "auto-capture", "failed", "capture_failed_001.json");
  fs.mkdirSync(path.dirname(failedPayloadPath), { recursive: true });
  fs.writeFileSync(
    failedPayloadPath,
    `${JSON.stringify({
      requestId: "capture_failed_001",
      status: "failed",
      failedAt: "2026-04-23T10:00:00+08:00",
      error: {
        message: "bridge failed"
      }
    }, null, 2)}\n`,
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const backlogCheck = payload.checks.find((check) => check.code === "PAI-CONVERSATION-030");
  const failedQueueCheck = payload.checks.find((check) => check.code === "PAI-CONVERSATION-031");
  assert.equal(payload.ok, true);
  assert.equal(backlogCheck?.ok, false);
  assert.equal(backlogCheck?.severity, "warning");
  assert.equal(failedQueueCheck?.ok, false);
  assert.equal(failedQueueCheck?.severity, "warning");
  assert.equal(failedQueueCheck?.detail.failedRequestCount, 1);
  assert.equal(
    payload.checkGroups.find((group) => group.name === "conversation")?.warnings >= 1,
    true
  );
});

test("doctor reports sync guidance when knowledge artifacts are missing", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  fs.rmSync(
    path.join(
      projectRoot,
      ".power-ai",
      "skills",
      "foundation",
      "power-component-library",
      "references",
      "generated",
      "component-registry.json"
    ),
    { force: true }
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 1, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(payload.ok, false);
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
  assert.deepEqual(payload.failureCodes, ["PAI-KNOWLEDGE-001"]);
  assert.equal(payload.checkGroups.find((group) => group.name === "knowledge")?.ok, false);
  assert.equal(
    payload.checks.find((check) => check.name === "generated component registry exists")?.ok,
    false
  );
  assert.equal(
    payload.checks.find((check) => check.name === "generated component registry exists")?.code,
    "PAI-KNOWLEDGE-001"
  );
  assert.equal(
    payload.remediationTips.some((tip) => tip.includes("npx power-ai-skills sync")),
    true
  );
  assert.equal(
    payload.remediationTips.some((tip) => tip.includes(".power-ai") && tip.includes("component-registry.json")),
    true
  );
  assert.equal(
    payload.checks.find((check) => check.name === "generated component registry exists")?.remediation
      ?.includes("generated component registry"),
    true
  );
});

test("doctor reports sync guidance when conversation capture scaffolding is missing", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  fs.rmSync(path.join(projectRoot, ".power-ai", "references", "conversation-capture-contract.md"), { force: true });

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 1, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.failureCodes.includes("PAI-CONVERSATION-003"), true);
  assert.equal(payload.checkGroups.find((group) => group.name === "conversation")?.ok, false);
  assert.equal(
    payload.checks.find((check) => check.name === "conversation capture contract exists")?.ok,
    false
  );
  assert.equal(
    payload.remediationTips.some((tip) => tip.includes("conversation capture")),
    true
  );
});

test("doctor warns when conversation review backlog is still pending", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]).status, 0);
  fs.writeFileSync(
    path.join(projectRoot, ".power-ai", "patterns", "project-patterns.json"),
    `${JSON.stringify({
      projectName: "consumer-basic",
      lastAnalyzed: new Date().toISOString(),
      summary: {
        fileCount: 1,
        recordCount: 2,
        generate: 0,
        review: 1,
        skip: 0,
        activeMerges: 0,
        archivedPatterns: 0
      },
      patterns: [
        {
          id: "pattern_dialog_form",
          sceneType: "dialog-form",
          frequency: 2,
          recommendation: "review",
          sampleConversationIds: ["conv_1", "conv_2"],
          candidateSkill: {
            name: "dialog-form-conversation-project",
            baseSkill: "dialog-skill",
            displayName: "Project Dialog Form Conversation Skill"
          }
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );
  fs.mkdirSync(path.join(projectRoot, ".power-ai", "governance"), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, ".power-ai", "governance", "conversation-decisions.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      decisions: [
        {
          patternId: "pattern_dialog_form",
          sceneType: "dialog-form",
          sourceConversationIds: ["conv_1", "conv_2"],
          recommendation: "review",
          decision: "review",
          target: "",
          decisionReason: "",
          reviewedBy: "system",
          reviewedAt: new Date().toISOString(),
          trace: {}
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const conversationDecisionCheck = payload.checks.find((check) => check.code === "PAI-CONVERSATION-029");
  assert.equal(conversationDecisionCheck.severity, "warning");
  assert.equal(conversationDecisionCheck.ok, false);
  assert.equal(conversationDecisionCheck.detail.pendingReviewCount, 1);
});

test("doctor reports policy drift when team policy snapshot is missing", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  fs.rmSync(path.join(projectRoot, ".power-ai", "team-policy.json"), { force: true });

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 1, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.failureCodes.includes("PAI-POLICY-001"), true);
  assert.equal(payload.failureCodes.includes("PAI-POLICY-002"), true);
  assert.equal(payload.checkGroups.find((group) => group.name === "policy")?.ok, false);
  assert.equal(
    payload.remediationTips.some((tip) => tip.includes("check-team-policy-drift") || tip.includes("team-policy.json")),
    true
  );
});

test("doctor warns when recommended project profile drifts from the current selection", (t) => {
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

  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const profileCheck = payload.checks.find((check) => check.code === "PAI-POLICY-007");
  assert.equal(profileCheck.severity, "warning");
  assert.equal(profileCheck.ok, false);
  assert.equal(profileCheck.detail.recommendedProjectProfile, "enterprise-vue");
});

test("doctor keeps deferred project profile drift as warning and exposes decision metadata", (t) => {
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
    "--reason", "profile migration is blocked by current rollout window",
    "--next-review-at", "2026-05-20"
  ]).status, 0);

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const profileCheck = payload.checks.find((check) => check.code === "PAI-POLICY-007");
  assert.equal(profileCheck.severity, "warning");
  assert.equal(profileCheck.ok, false);
  assert.equal(profileCheck.detail.projectProfileDecision, "deferred");
  assert.equal(profileCheck.detail.projectProfileDecisionReason, "profile migration is blocked by current rollout window");
  assert.equal(profileCheck.detail.projectProfileDecisionReviewAt, "2026-05-20");
});

test("doctor warns when project profile governance review deadline is overdue", (t) => {
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
    "--reason", "profile migration is paused",
    "--next-review-at", "2024-01-01"
  ]).status, 0);

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const reviewCheck = payload.checks.find((check) => check.code === "PAI-POLICY-008");
  assert.equal(reviewCheck.severity, "warning");
  assert.equal(reviewCheck.ok, false);
  assert.equal(reviewCheck.detail.reviewStatus, "overdue");
  assert.equal(payload.governanceContext.projectProfileDecisionReviewStatus, "overdue");
  assert.equal(payload.governanceContext.overdueGovernanceReviews, 1);
});

test("doctor warns when project capture safety policy drifts from the team baseline", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const captureSafetyPath = path.join(projectRoot, ".power-ai", "capture-safety-policy.json");
  const captureSafetyPolicy = JSON.parse(fs.readFileSync(captureSafetyPath, "utf8"));
  captureSafetyPolicy.retention.autoArchiveDays = 30;
  fs.writeFileSync(captureSafetyPath, `${JSON.stringify(captureSafetyPolicy, null, 2)}\n`, "utf8");

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const captureSafetyCheck = payload.checks.find((check) => check.code === "PAI-POLICY-012");
  assert.ok(captureSafetyCheck);
  assert.equal(payload.ok, true);
  assert.equal(captureSafetyCheck.severity, "warning");
  assert.equal(captureSafetyCheck.ok, false);
  assert.equal(captureSafetyCheck.detail.differencePaths.includes("retention.autoArchiveDays"), true);
});

test("doctor warns when warning-level conversation captures need acknowledgement", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const conversationsRoot = path.join(projectRoot, ".power-ai", "conversations");
  fs.mkdirSync(conversationsRoot, { recursive: true });
  fs.writeFileSync(
    path.join(conversationsRoot, "2026-04-03.json"),
    `${JSON.stringify({
      date: "2026-04-03",
      records: [
        {
          id: "conv-warning-1",
          timestamp: "2026-04-03T09:00:00.000Z",
          sceneType: "form",
          captureAdmissionLevel: "capture",
          captureSafetyGovernanceLevel: "warning"
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const warningCheck = payload.checks.find((check) => check.code === "PAI-CONVERSATION-035");
  const reviewCheck = payload.checks.find((check) => check.code === "PAI-CONVERSATION-036");
  assert.ok(warningCheck);
  assert.ok(reviewCheck);
  assert.equal(warningCheck.severity, "warning");
  assert.equal(warningCheck.ok, false);
  assert.equal(warningCheck.detail.warningLevelConversationRecords, 1);
  assert.equal(payload.governanceContext.warningLevelConversationRecords, 1);
  assert.equal(reviewCheck.ok, true);
});

test("doctor warns when an applied wrapper promotion still has pending follow-ups", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const promotionRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-followup-tool");
  fs.mkdirSync(promotionRoot, { recursive: true });
  fs.writeFileSync(
    path.join(promotionRoot, "wrapper-promotion.json"),
    JSON.stringify(
      {
        toolName: "my-followup-tool",
        displayName: "My Followup Tool",
        integrationStyle: "gui",
        generatedAt: "2026-03-25T10:00:00.000Z",
        status: "accepted",
        materializationStatus: "generated",
        applicationStatus: "applied",
        pendingFollowUps: [
          "replace test.todo placeholders with real coverage",
          "review README and tool-adapters docs"
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(payload.ok, true);
  assert.equal(
    payload.warnings.some((warning) => warning.includes("my-followup-tool") && warning.includes("follow-ups") && warning.includes("applied")),
    true
  );
});

test("doctor warns when evolution proposal backlog exceeds governance SLA", (t) => {
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

  fs.writeFileSync(
    path.join(projectRoot, ".power-ai", "governance", "evolution-proposals.json"),
    `${JSON.stringify({
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
          recommendedAction: "Review the recommended project profile migration."
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
            sourceConversationIds: ["conv_1"],
            details: {}
          },
          recommendedAction: "Apply the accepted shared-skill promotion after manual validation."
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const proposalCheck = payload.checks.find((check) => check.code === "PAI-POLICY-011");
  assert.ok(proposalCheck);
  assert.equal(proposalCheck.severity, "warning");
  assert.equal(proposalCheck.ok, false);
  assert.equal(proposalCheck.detail.staleReviewCount, 1);
  assert.equal(proposalCheck.detail.staleAcceptedCount, 1);
});

test("doctor warns when applied evolution proposal drafts still have follow-up actions", (t) => {
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

  fs.writeFileSync(
    path.join(projectRoot, ".power-ai", "governance", "evolution-proposals.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      updatedAt: "2026-04-22T10:00:00+08:00",
      proposals: [
        {
          proposalId: "wrapper-rollout-adjustment-my-tool",
          proposalType: "wrapper-rollout-adjustment-proposal",
          status: "applied",
          generatedAt: "2026-04-20T10:00:00+08:00",
          statusUpdatedAt: "2026-04-22T10:00:00+08:00",
          statusUpdatedBy: "apply-evolution-proposal",
          riskLevel: "high",
          sourceCandidateIds: ["wrapper-proposal::my-tool"],
          evidence: {
            sourcePatternIds: ["pattern_dialog_form"],
            sourceConversationIds: ["conv_1"],
            details: {
              recommendedToolName: "my-tool"
            }
          },
          recommendedAction: "Create a wrapper promotion draft and keep final registration manual.",
          applicationArtifacts: {
            artifactType: "wrapper-promotion-draft",
            draftRoot: ".power-ai/proposals/wrapper-promotions/my-tool",
            files: [
              ".power-ai/proposals/wrapper-promotions/my-tool/wrapper-promotion.json"
            ],
            nextActions: [
              "npx power-ai-skills materialize-wrapper-promotion --tool my-tool",
              "npx power-ai-skills apply-wrapper-promotion --tool my-tool --dry-run"
            ],
            reusedExistingDraft: false,
            handoff: {
              status: "pending-human-follow-up",
              ownerHint: "wrapper-governance",
              nextReviewAt: "",
              nextAction: "npx power-ai-skills materialize-wrapper-promotion --tool my-tool",
              checklistPath: ".power-ai/proposals/wrapper-promotions/my-tool/post-apply-checklist.md",
              boundary: [
                "Keep final wrapper registration manual."
              ]
            },
            toolName: "my-tool"
          }
        }
      ]
    }, null, 2)}\n`,
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  const proposalCheck = payload.checks.find((check) => check.code === "PAI-POLICY-013");
  assert.ok(proposalCheck);
  assert.equal(proposalCheck.severity, "warning");
  assert.equal(proposalCheck.ok, false);
  assert.equal(proposalCheck.detail.appliedDraftFollowUpCount, 1);
  assert.equal(proposalCheck.detail.proposalIds.includes("wrapper-rollout-adjustment-my-tool"), true);
  assert.equal(proposalCheck.detail.artifactTypes.includes("wrapper-promotion-draft"), true);
  assert.equal(proposalCheck.detail.handoffPreview[0].ownerHint, "wrapper-governance");
  assert.equal(proposalCheck.detail.handoffPreview[0].checklistPath, ".power-ai/proposals/wrapper-promotions/my-tool/post-apply-checklist.md");
  assert.equal(
    payload.warnings.some((warning) => warning.includes("wrapper-rollout-adjustment-my-tool") && warning.includes("wrapper-governance")),
    true
  );
});

test("doctor warns when a finalized wrapper promotion is ready for registration", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const promotionRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-finalized-tool");
  fs.mkdirSync(promotionRoot, { recursive: true });
  fs.writeFileSync(
    path.join(promotionRoot, "wrapper-promotion.json"),
    JSON.stringify(
      {
        toolName: "my-finalized-tool",
        displayName: "My Finalized Tool",
        integrationStyle: "terminal",
        generatedAt: "2026-03-25T10:00:00.000Z",
        status: "accepted",
        materializationStatus: "generated",
        applicationStatus: "applied",
        followUpStatus: "finalized",
        pendingFollowUps: []
      },
      null,
      2
    ),
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(
    payload.warnings.some((warning) => warning.includes("my-finalized-tool") && warning.includes("ready for registration")),
    true
  );
});

test("doctor does not warn for registered wrapper promotions", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const promotionRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "my-registered-tool");
  fs.mkdirSync(promotionRoot, { recursive: true });
  fs.writeFileSync(
    path.join(promotionRoot, "wrapper-promotion.json"),
    JSON.stringify(
      {
        toolName: "my-registered-tool",
        displayName: "My Registered Tool",
        integrationStyle: "terminal",
        generatedAt: "2026-03-25T10:00:00.000Z",
        status: "accepted",
        materializationStatus: "generated",
        applicationStatus: "applied",
        followUpStatus: "finalized",
        registrationStatus: "registered",
        pendingFollowUps: []
      },
      null,
      2
    ),
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(
    payload.warnings.some((warning) => warning.includes("my-registered-tool")),
    false
  );
});

test("doctor ignores archived wrapper promotions because they leave the active proposal root", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--tool", "cursor"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const archiveRoot = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions-archive", "my-archived-tool");
  fs.mkdirSync(archiveRoot, { recursive: true });
  fs.writeFileSync(
    path.join(archiveRoot, "wrapper-promotion.json"),
    JSON.stringify(
      {
        toolName: "my-archived-tool",
        displayName: "My Archived Tool",
        integrationStyle: "terminal",
        generatedAt: "2026-03-25T10:00:00.000Z",
        status: "accepted",
        materializationStatus: "generated",
        applicationStatus: "applied",
        followUpStatus: "finalized",
        registrationStatus: "registered",
        archiveStatus: "archived",
        pendingFollowUps: []
      },
      null,
      2
    ),
    "utf8"
  );

  const doctorResult = runCli(projectRoot, "doctor");
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(
    payload.warnings.some((warning) => warning.includes("my-archived-tool")),
    false
  );
});

test("doctor reports release governance when run in package root", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const doctorResult = runRepoCli("doctor", [], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot
    }
  });
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mode, "package-maintenance");
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
  assert.equal(payload.reportPath, path.join(manifestRoot, "doctor-report.md"));
  assert.equal(payload.jsonPath, path.join(manifestRoot, "doctor-report.json"));
  const doctorMarkdown = fs.readFileSync(payload.reportPath, "utf8");
  const doctorJson = JSON.parse(fs.readFileSync(payload.jsonPath, "utf8"));
  assert.equal(doctorMarkdown.includes("## Summary"), true);
  assert.equal(doctorJson.mode, "package-maintenance");
  assert.deepEqual(payload.checkGroups.map((group) => group.name), ["release"]);
  assert.deepEqual(payload.failureCodes, []);
  assert.equal(payload.checks.every((check) => check.ok), true);
  assert.deepEqual(
    payload.checks.map((check) => check.code),
    [
      "PAI-RELEASE-001",
      "PAI-RELEASE-002",
      "PAI-RELEASE-003",
      "PAI-RELEASE-004",
      "PAI-RELEASE-007",
      "PAI-RELEASE-005",
      "PAI-RELEASE-006",
      "PAI-RELEASE-008",
      "PAI-RELEASE-009",
      "PAI-RELEASE-010",
      "PAI-RELEASE-011",
      "PAI-RELEASE-012"
    ]
  );
  assert.equal(payload.checks.find((check) => check.code === "PAI-RELEASE-011")?.ok, true);
  assert.equal(payload.checks.find((check) => check.code === "PAI-RELEASE-012")?.severity, "warning");
});

test("doctor package-maintenance surfaces release governance warnings without failing", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const releaseGateReportPath = path.join(manifestRoot, "release-gate-report.json");
  const versionRecordPath = path.join(manifestRoot, "version-record.json");

  const releaseGateReport = JSON.parse(fs.readFileSync(releaseGateReportPath, "utf8"));
  releaseGateReport.overallStatus = "warn";
  releaseGateReport.summary.warningGates = 1;
  releaseGateReport.governance.pendingConversationReviews = 2;
  fs.writeFileSync(releaseGateReportPath, `${JSON.stringify(releaseGateReport, null, 2)}\n`, "utf8");

  const versionRecord = JSON.parse(fs.readFileSync(versionRecordPath, "utf8"));
  versionRecord.governanceSummary.releaseGateStatus = "warn";
  versionRecord.governanceSummary.warningGates = 1;
  versionRecord.governanceSummary.pendingConversationReviews = 2;
  fs.writeFileSync(versionRecordPath, `${JSON.stringify(versionRecord, null, 2)}\n`, "utf8");

  const doctorResult = runRepoCli("doctor", [], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot
    }
  });
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(payload.ok, true);
  const releaseWarningCheck = payload.checks.find((check) => check.code === "PAI-RELEASE-012");
  assert.equal(releaseWarningCheck.ok, false);
  assert.equal(releaseWarningCheck.severity, "warning");
  assert.equal(releaseWarningCheck.detail.warningGates, 1);
  assert.equal(releaseWarningCheck.detail.pendingConversationReviews, 2);
});

test("doctor reports release governance failures when version record drifts", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);
  const versionRecordPath = path.join(manifestRoot, "version-record.json");
  const versionRecord = JSON.parse(fs.readFileSync(versionRecordPath, "utf8"));
  versionRecord.version = "0.0.0";
  fs.writeFileSync(versionRecordPath, `${JSON.stringify(versionRecord, null, 2)}\n`, "utf8");

  const doctorResult = runRepoCli("doctor", [], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot
    }
  });
  assert.equal(doctorResult.status, 1, doctorResult.stderr);

  const payload = JSON.parse(doctorResult.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.mode, "package-maintenance");
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
  assert.equal(payload.failureCodes.includes("PAI-RELEASE-006"), true);
  assert.equal(payload.failureCodes.includes("PAI-RELEASE-009"), true);
  assert.equal(payload.checkGroups.find((group) => group.name === "release")?.ok, false);
  assert.equal(
    payload.remediationTips.some((tip) => tip.includes("pnpm refresh:release-artifacts")),
    true
  );
});
