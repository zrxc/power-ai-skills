import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyDir } from "../src/shared/fs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runReleaseCheckScriptPath = path.join(root, "scripts", "run-release-check.mjs");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function runNodeScript(scriptPath, args = [], options = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(options.env || {})
    }
  });
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeMarkdown(filePath, title, lines = []) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `# ${title}\n${lines.length ? `\n${lines.join("\n")}\n` : ""}`, "utf8");
}

function writeArtifactPair({ jsonPath, jsonPayload, markdownPath, markdownTitle, markdownLines = [] }) {
  writeJson(jsonPath, jsonPayload);
  writeMarkdown(markdownPath, markdownTitle, markdownLines);
}

function normalizeManifestSnapshot(tempManifestDir) {
  const notificationsDir = path.join(tempManifestDir, "notifications");
  const latestNotificationJson = fs.readdirSync(notificationsDir)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left, "en"))[0];
  const latestNotificationJsonPath = path.join(notificationsDir, latestNotificationJson);
  const version = packageJson.version;
  const matrixJsonPath = path.join(tempManifestDir, "consumer-compatibility-matrix.json");
  const matrixMarkdownPath = path.join(tempManifestDir, "consumer-compatibility-matrix.md");
  const adviceJsonPath = path.join(tempManifestDir, "upgrade-advice-package.json");
  const adviceMarkdownPath = path.join(tempManifestDir, "upgrade-advice-package.md");
  const releaseGateJsonPath = path.join(tempManifestDir, "release-gate-report.json");
  const releaseGateMarkdownPath = path.join(tempManifestDir, "release-gate-report.md");
  const governanceOperationsJsonPath = path.join(tempManifestDir, "governance-operations-report.json");
  const governanceOperationsMarkdownPath = path.join(tempManifestDir, "governance-operations-report.md");
  const automationReportPath = path.join(tempManifestDir, "automation-report.json");
  const releaseNotesPath = path.join(tempManifestDir, `release-notes-${version}.md`);

  writeArtifactPair({
    jsonPath: matrixJsonPath,
    jsonPayload: {
      packageName: packageJson.name,
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
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        overdueGovernanceReviews: 0,
        dueTodayGovernanceReviews: 0,
        scenariosWithOverdueGovernanceReviews: 0,
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
        fixtures: ["basic"]
      },
      scenarios: []
    },
    markdownPath: matrixMarkdownPath,
    markdownTitle: "Consumer Compatibility Matrix"
  });

  writeArtifactPair({
    jsonPath: adviceJsonPath,
    jsonPayload: {
      packageName: packageJson.name,
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
        overdueGovernanceReviews: 0,
        dueTodayGovernanceReviews: 0,
        pendingConversationReviews: 0,
        pendingWrapperProposals: 0
      },
      consumerCommands: [],
      maintainerCommands: [],
      manualChecks: []
    },
    markdownPath: adviceMarkdownPath,
    markdownTitle: "Upgrade Advice Package"
  });

  writeArtifactPair({
    jsonPath: releaseGateJsonPath,
    jsonPayload: {
      packageName: packageJson.name,
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
        overdueGovernanceReviews: 0,
        dueTodayGovernanceReviews: 0,
        scenariosWithOverdueGovernanceReviews: 0,
        pendingConversationReviews: 0,
        scenariosWithPendingConversationReviews: 0,
        pendingWrapperProposals: 0,
        scenariosWithPendingWrapperProposals: 0
      },
      gates: [],
      recommendedActions: [],
      governance: {
        matrixAvailable: true,
        unresolvedProjectProfileDecisions: 0,
        deferredProjectProfileDecisions: 0,
        rejectedProjectProfileDecisions: 0,
        overdueGovernanceReviews: 0,
        dueTodayGovernanceReviews: 0,
        scenariosWithOverdueGovernanceReviews: 0,
        pendingConversationReviews: 0,
        scenariosWithPendingConversationReviews: 0,
        pendingWrapperProposals: 0,
        scenariosWithPendingWrapperProposals: 0
      }
    },
    markdownPath: releaseGateMarkdownPath,
    markdownTitle: "Release Gate Report"
  });

  writeArtifactPair({
    jsonPath: governanceOperationsJsonPath,
    jsonPayload: {
      packageName: packageJson.name,
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
      releaseReadiness: {},
      recentActivities: [],
      recommendedActions: []
    },
    markdownPath: governanceOperationsMarkdownPath,
    markdownTitle: "Governance Operations Report"
  });

  writeJson(automationReportPath, {
    packageName: packageJson.name,
    version,
    repoPath: root,
    changedFilesPath: path.join(tempManifestDir, "changed-files.txt"),
    impactReportPath: path.join(tempManifestDir, "impact-report.json"),
    riskReportPath: path.join(tempManifestDir, "upgrade-risk-report.json"),
    riskMarkdownPath: path.join(tempManifestDir, "upgrade-risk-report.md"),
    impactTaskPath: path.join(tempManifestDir, "impact-tasks", "impact-task.md"),
    consumerVerification: {
      skipped: false,
      reason: ""
    },
    consumerCompatibilityMatrixPath: matrixJsonPath,
    consumerCompatibilityMatrixMarkdownPath: matrixMarkdownPath,
    summary: {
      changedFileCount: 1,
      affectedDomainCount: 1,
      affectedSkillCount: 1,
      recommendedReleaseLevel: "minor",
      impactRecommendedReleaseLevel: "minor",
      overallRiskLevel: "high",
      riskCategoryCount: 1,
      consumerMatrixScenarioCount: 1,
      consumerMatrixPassedCount: 1,
      consumerMatrixFailedCount: 0
    }
  });

  if (!fs.existsSync(releaseNotesPath)) {
    fs.writeFileSync(
      releaseNotesPath,
      `# Release Notes ${version}\n\n- 鍖呭悕锛歕\`${packageJson.name}\`\n- 鐗堟湰锛歕\`${version}\`\n`,
      "utf8"
    );
  }

  const versionRecordPath = path.join(tempManifestDir, "version-record.json");
  const versionRecord = JSON.parse(fs.readFileSync(versionRecordPath, "utf8"));
  versionRecord.packageName = packageJson.name;
  versionRecord.version = version;
  versionRecord.artifacts = {
    ...versionRecord.artifacts,
    skillsManifestPath: path.join(tempManifestDir, "skills-manifest.json"),
    releaseNotesPath,
    versionRecordPath,
    impactReportPath: path.join(tempManifestDir, "impact-report.json"),
    upgradeRiskReportPath: path.join(tempManifestDir, "upgrade-risk-report.json"),
    upgradeRiskMarkdownPath: path.join(tempManifestDir, "upgrade-risk-report.md"),
    consumerCompatibilityMatrixPath: matrixJsonPath,
    consumerCompatibilityMatrixMarkdownPath: matrixMarkdownPath,
    releaseGateReportPath: releaseGateJsonPath,
    releaseGateMarkdownPath,
    governanceOperationsReportPath: governanceOperationsJsonPath,
    governanceOperationsMarkdownPath,
    upgradeAdvicePackagePath: adviceJsonPath,
    upgradeAdvicePackageMarkdownPath: adviceMarkdownPath,
    automationReportPath,
    notificationJsonPath: latestNotificationJsonPath,
    notificationMarkdownPath: latestNotificationJsonPath.replace(/\.json$/i, ".md")
  };
  versionRecord.governanceSummary = {
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
  };
  fs.writeFileSync(versionRecordPath, `${JSON.stringify(versionRecord, null, 2)}\n`, "utf8");

  const notificationPayload = JSON.parse(fs.readFileSync(latestNotificationJsonPath, "utf8"));
  notificationPayload.packageName = packageJson.name;
  notificationPayload.version = version;
  notificationPayload.links = {
    ...notificationPayload.links,
    changedFilesPath: path.join(tempManifestDir, "changed-files.txt"),
    impactReportPath: path.join(tempManifestDir, "impact-report.json"),
    upgradeRiskReportPath: path.join(tempManifestDir, "upgrade-risk-report.json"),
    upgradeRiskMarkdownPath: path.join(tempManifestDir, "upgrade-risk-report.md"),
    consumerCompatibilityMatrixPath: matrixJsonPath,
    consumerCompatibilityMatrixMarkdownPath: matrixMarkdownPath,
    releaseGateReportPath: releaseGateJsonPath,
    releaseGateMarkdownPath,
    governanceOperationsReportPath: governanceOperationsJsonPath,
    governanceOperationsMarkdownPath,
    upgradeAdvicePackagePath: adviceJsonPath,
    upgradeAdvicePackageMarkdownPath: adviceMarkdownPath,
    impactTaskPath: path.join(tempManifestDir, "impact-tasks", path.basename(notificationPayload.links?.impactTaskPath || "impact-task.md")),
    automationReportPath
  };
  fs.writeFileSync(latestNotificationJsonPath, `${JSON.stringify(notificationPayload, null, 2)}\n`, "utf8");
}

test("run-release-check refreshes consumer inputs and release gates without relying on release:validate side effects", { concurrency: false }, (t) => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-run-release-check-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  copyDir(path.join(root, "manifest"), tempManifestDir);
  normalizeManifestSnapshot(tempManifestDir);
  const releaseGateReportPath = path.join(tempManifestDir, "release-gate-report.json");
  const releaseGateMarkdownPath = path.join(tempManifestDir, "release-gate-report.md");
  const versionRecordPath = path.join(tempManifestDir, "version-record.json");
  fs.rmSync(releaseGateReportPath, { force: true });
  fs.rmSync(releaseGateMarkdownPath, { force: true });

  const versionRecord = JSON.parse(fs.readFileSync(versionRecordPath, "utf8"));
  delete versionRecord.artifacts.releaseGateReportPath;
  delete versionRecord.artifacts.releaseGateMarkdownPath;
  fs.writeFileSync(versionRecordPath, `${JSON.stringify(versionRecord, null, 2)}\n`, "utf8");

  t.after(() => fs.rmSync(tempManifestRoot, { recursive: true, force: true }));

  const result = runNodeScript(runReleaseCheckScriptPath, [], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.deepEqual(
    payload.steps.map((step) => step.id),
    ["prerequisite-artifacts", "consumer-release-inputs", "release-gates", "final-release-consistency"]
  );
  assert.equal(payload.steps.every((step) => step.ok), true);
  assert.equal(fs.existsSync(path.join(tempManifestDir, "consumer-compatibility-matrix.json")), true);
  assert.equal(fs.existsSync(releaseGateReportPath), true);
});
