import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyDir } from "../src/shared/fs.mjs";
import os from "node:os";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const refreshScriptPath = path.join(root, "scripts", "refresh-release-artifacts.mjs");
const cleanScriptPath = path.join(root, "scripts", "clean-release-artifacts.mjs");
const consistencyScriptPath = path.join(root, "scripts", "check-release-consistency.mjs");
const releaseGatesScriptPath = path.join(root, "scripts", "check-release-gates.mjs");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const notificationsDir = path.join(root, "manifest", "notifications");
const versionRecordPath = path.join(root, "manifest", "version-record.json");
const archiveNotificationsDir = path.join(root, "manifest", "archive", "notifications");

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

function normalizeManifestSnapshot(tempManifestDir) {
  const version = packageJson.version;
  const matrixJsonPath = path.join(tempManifestDir, "consumer-compatibility-matrix.json");
  const matrixMarkdownPath = path.join(tempManifestDir, "consumer-compatibility-matrix.md");
  const releaseGateJsonPath = path.join(tempManifestDir, "release-gate-report.json");
  const releaseGateMarkdownPath = path.join(tempManifestDir, "release-gate-report.md");
  const governanceOperationsJsonPath = path.join(tempManifestDir, "governance-operations-report.json");
  const governanceOperationsMarkdownPath = path.join(tempManifestDir, "governance-operations-report.md");
  const adviceJsonPath = path.join(tempManifestDir, "upgrade-advice-package.json");
  const adviceMarkdownPath = path.join(tempManifestDir, "upgrade-advice-package.md");
  const automationReportPath = path.join(tempManifestDir, "automation-report.json");
  const notificationsDir = path.join(tempManifestDir, "notifications");
  const latestNotificationJson = fs.readdirSync(notificationsDir)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left, "en"))[0];
  const latestNotificationJsonPath = path.join(notificationsDir, latestNotificationJson);

  writeJson(matrixJsonPath, {
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
      warningLevelConversationRecords: 0,
      scenariosWithWarningLevelConversationRecords: 0,
      reviewLevelConversationRecords: 0,
      captureLevelConversationRecords: 0,
      recordsWithGovernanceMetadata: 0,
      recordsWithAdmissionMetadata: 0,
      scenariosWithReviewLevelConversationRecords: 0,
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
  });
  writeMarkdown(matrixMarkdownPath, "Consumer Compatibility Matrix");

  writeJson(releaseGateJsonPath, {
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
      warningLevelConversationRecords: 0,
      scenariosWithWarningLevelConversationRecords: 0,
      reviewLevelConversationRecords: 0,
      captureLevelConversationRecords: 0,
      recordsWithGovernanceMetadata: 0,
      recordsWithAdmissionMetadata: 0,
      scenariosWithReviewLevelConversationRecords: 0,
      pendingWrapperProposals: 0,
      scenariosWithPendingWrapperProposals: 0
    }
  });
  writeMarkdown(releaseGateMarkdownPath, "Release Gate Report");

  writeJson(governanceOperationsJsonPath, {
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
  });
  writeMarkdown(governanceOperationsMarkdownPath, "Governance Operations Report");

  writeJson(adviceJsonPath, {
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
  });
  writeMarkdown(adviceMarkdownPath, "Upgrade Advice Package");

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

  const versionRecord = JSON.parse(fs.readFileSync(path.join(tempManifestDir, "version-record.json"), "utf8"));
  versionRecord.packageName = packageJson.name;
  versionRecord.version = version;
  versionRecord.artifacts = {
    ...(versionRecord.artifacts || {}),
    skillsManifestPath: path.join(tempManifestDir, "skills-manifest.json"),
    releaseNotesPath: path.join(tempManifestDir, `release-notes-${version}.md`),
    versionRecordPath: path.join(tempManifestDir, "version-record.json"),
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
    ...(versionRecord.governanceSummary || {}),
    releaseGateStatus: "pass",
    warningGates: 0,
    unresolvedProjectProfileDecisions: 0,
    deferredProjectProfileDecisions: 0,
    rejectedProjectProfileDecisions: 0,
    overdueGovernanceReviews: 0,
    dueTodayGovernanceReviews: 0,
    pendingConversationReviews: 0,
    warningLevelConversationRecords: 0,
    reviewLevelConversationRecords: 0,
    captureLevelConversationRecords: 0,
    recordsWithGovernanceMetadata: 0,
    recordsWithAdmissionMetadata: 0,
    scenariosWithWarningLevelConversationRecords: 0,
    scenariosWithReviewLevelConversationRecords: 0,
    pendingWrapperProposals: 0,
    failedCompatibilityScenarios: 0,
    consumerMatrixScenarioCount: 1,
    matchedPromotionRelations: 1,
    totalPromotionRelations: 2,
    recentGovernanceActivityCount: 6
  };
  writeJson(path.join(tempManifestDir, "version-record.json"), versionRecord);

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
  notificationPayload.governance = {
    releaseGateStatus: "pass",
    releaseGateWarnings: 0,
    unresolvedProjectProfileDecisions: 0,
    deferredProjectProfileDecisions: 0,
    rejectedProjectProfileDecisions: 0,
    pendingConversationReviews: 0,
    warningLevelConversationRecords: 0,
    reviewLevelConversationRecords: 0,
    captureLevelConversationRecords: 0,
    recordsWithGovernanceMetadata: 0,
    recordsWithAdmissionMetadata: 0,
    scenariosWithWarningLevelConversationRecords: 0,
    scenariosWithReviewLevelConversationRecords: 0,
    pendingWrapperProposals: 0
  };
  notificationPayload.governanceOperations = {
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
  };
  writeJson(latestNotificationJsonPath, notificationPayload);
  fs.writeFileSync(latestNotificationJsonPath.replace(/\.json$/i, ".md"), `# Upgrade Payload\n\n- 版本：\`${version}\`\n`, "utf8");
}

function getLatestNotificationJsonPath() {
  const candidates = fs.readdirSync(notificationsDir)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left, "en"));
  return candidates.length ? path.join(notificationsDir, candidates[0]) : "";
}

test("refresh-release-artifacts rebuilds current release artifacts and notification payloads", { concurrency: false }, (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-promotion-trace-"));
  const tracePath = path.join(tempRoot, "promotion-trace.json");
  const changedFilesPath = path.join(root, "manifest", "changed-files.txt");
  const firstChangedFile = fs.existsSync(changedFilesPath)
    ? String(fs.readFileSync(changedFilesPath, "utf8").split(/\r?\n/u).find(Boolean) || "")
    : "";
  fs.writeFileSync(tracePath, `${JSON.stringify({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    relations: [
      {
        traceKey: "pattern->project-skill::pattern::pattern_tree_list_page::project-skill::tree-list-page-conversation-project",
        relationType: "pattern->project-skill",
        source: {
          type: "pattern",
          id: "pattern_tree_list_page",
          label: "pattern_tree_list_page",
          path: firstChangedFile || "src/conversation-miner/index.mjs"
        },
        target: {
          type: "project-skill",
          id: "tree-list-page-conversation-project",
          label: "tree-list-page-conversation-project",
          path: "skills/tree-list-page-project/SKILL.md"
        },
        metadata: {},
        firstRecordedAt: new Date().toISOString(),
        lastRecordedAt: new Date().toISOString()
      }
    ]
  }, null, 2)}\n`, "utf8");
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const result = runNodeScript(refreshScriptPath, [], {
    env: {
      POWER_AI_PROMOTION_TRACE_PATH: tracePath
    }
  });
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.packageName, packageJson.name);
  assert.equal(payload.version, packageJson.version);
  assert.equal(
    payload.refreshedArtifacts.includes(path.join("manifest", `release-notes-${packageJson.version}.md`)),
    true
  );
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "upgrade-risk-report.json")), true);
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "upgrade-risk-report.md")), true);
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "promotion-trace-report.json")), true);
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "promotion-trace-report.md")), true);
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "governance-operations-report.json")), true);
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "governance-operations-report.md")), true);
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "upgrade-advice-package.json")), true);
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "upgrade-advice-package.md")), true);
  assert.equal(
    payload.refreshedArtifacts.some((item) => item.startsWith(path.join("manifest", "notifications", "upgrade-payload-")) && item.endsWith(".json")),
    true
  );
  assert.equal(
    payload.refreshedArtifacts.some((item) => item.startsWith(path.join("manifest", "notifications", "upgrade-payload-")) && item.endsWith(".md")),
    true
  );
  assert.equal(payload.refreshedArtifacts.includes(path.join("manifest", "version-record.json")), true);

  const versionRecord = JSON.parse(fs.readFileSync(versionRecordPath, "utf8"));
  assert.equal(versionRecord.packageName, packageJson.name);
  assert.equal(versionRecord.version, packageJson.version);
  assert.equal(versionRecord.artifacts.versionRecordPath, versionRecordPath);
  assert.equal(versionRecord.artifacts.releaseNotesPath.endsWith(`release-notes-${packageJson.version}.md`), true);
  assert.equal(versionRecord.artifacts.upgradeRiskReportPath.endsWith(path.join("manifest", "upgrade-risk-report.json")), true);
  assert.equal(versionRecord.artifacts.upgradeRiskMarkdownPath.endsWith(path.join("manifest", "upgrade-risk-report.md")), true);
  assert.equal(versionRecord.artifacts.promotionTraceReportPath.endsWith(path.join("manifest", "promotion-trace-report.json")), true);
  assert.equal(versionRecord.artifacts.promotionTraceMarkdownPath.endsWith(path.join("manifest", "promotion-trace-report.md")), true);
  assert.equal(versionRecord.artifacts.governanceOperationsReportPath.endsWith(path.join("manifest", "governance-operations-report.json")), true);
  assert.equal(versionRecord.artifacts.governanceOperationsMarkdownPath.endsWith(path.join("manifest", "governance-operations-report.md")), true);
  assert.equal(versionRecord.artifacts.upgradeAdvicePackagePath.endsWith(path.join("manifest", "upgrade-advice-package.json")), true);
  assert.equal(versionRecord.artifacts.upgradeAdvicePackageMarkdownPath.endsWith(path.join("manifest", "upgrade-advice-package.md")), true);
  assert.equal(versionRecord.governanceSummary.consumerMatrixScenarioCount >= 0, true);
  assert.equal(versionRecord.governanceSummary.recentGovernanceActivityCount >= 1, true);
  assert.equal(typeof payload.cleanupSummary, "object");

  const updatedTrace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  assert.equal(updatedTrace.relations.some((item) => item.relationType === "decision->release" && item.target.id === packageJson.version), true);

  const latestPayload = JSON.parse(fs.readFileSync(getLatestNotificationJsonPath(), "utf8"));
  assert.equal(latestPayload.governanceOperations.consumerMatrixScenarioCount >= 0, true);
  assert.equal(latestPayload.links.governanceOperationsReportPath.endsWith(path.join("manifest", "governance-operations-report.json")), true);
});

test("check-release-consistency validates current release, automation, and notification artifacts", { concurrency: false }, (t) => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-consistency-current-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  copyDir(path.join(root, "manifest"), tempManifestDir);
  normalizeManifestSnapshot(tempManifestDir);
  t.after(() => fs.rmSync(tempManifestRoot, { recursive: true, force: true }));

  const result = runNodeScript(consistencyScriptPath, [
    "--require-release-notes",
    "--require-impact-report",
    "--require-risk-report",
    "--require-governance-operations",
    "--require-upgrade-advice",
    "--require-automation-report",
    "--require-notification-payload"
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /发布产物一致性校验通过/);
});

test("check-release-consistency fails when the latest notification payload drifts from current version", { concurrency: false }, (t) => {
  const payloadPath = getLatestNotificationJsonPath();
  assert.equal(Boolean(payloadPath), true);

  const originalContent = fs.readFileSync(payloadPath, "utf8");
  t.after(() => fs.writeFileSync(payloadPath, originalContent, "utf8"));

  const payload = JSON.parse(originalContent);
  payload.version = "0.0.0";
  fs.writeFileSync(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const result = runNodeScript(consistencyScriptPath, ["--require-notification-payload"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /notification payload .* version 与 package\.json 不一致/);
});

test("check-release-consistency fails when version-record drifts from current version", { concurrency: false }, (t) => {
  const originalContent = fs.readFileSync(versionRecordPath, "utf8");
  t.after(() => fs.writeFileSync(versionRecordPath, originalContent, "utf8"));

  const record = JSON.parse(originalContent);
  record.version = "0.0.0";
  fs.writeFileSync(versionRecordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const result = runNodeScript(consistencyScriptPath);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /version-record\.json 的 version 与 package\.json 不一致/);
});

test("clean-release-artifacts archives stale notifications and keeps the latest recorded payload", { concurrency: false }, () => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-artifacts-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  const tempNotificationsDir = path.join(tempManifestDir, "notifications");
  const tempArchiveDir = path.join(tempManifestDir, "archive", "notifications");
  fs.mkdirSync(tempNotificationsDir, { recursive: true });

  const protectedJsonPath = path.join(tempNotificationsDir, "upgrade-payload-20260402-151419.json");
  const protectedMarkdownPath = path.join(tempNotificationsDir, "upgrade-payload-20260402-151419.md");
  const staleJsonPath = path.join(tempNotificationsDir, "upgrade-payload-20260401-101010.json");
  const staleMarkdownPath = path.join(tempNotificationsDir, "upgrade-payload-20260401-101010.md");

  fs.writeFileSync(protectedJsonPath, JSON.stringify({ version: packageJson.version }, null, 2));
  fs.writeFileSync(protectedMarkdownPath, `# payload\n\n- version: ${packageJson.version}\n`);
  fs.writeFileSync(staleJsonPath, JSON.stringify({ version: "older" }, null, 2));
  fs.writeFileSync(staleMarkdownPath, "# payload\n\n- version: older\n");
  fs.writeFileSync(path.join(tempManifestDir, "version-record.json"), `${JSON.stringify({
    packageName: packageJson.name,
    version: packageJson.version,
    recordedAt: new Date().toISOString(),
    artifacts: {
      notificationJsonPath: protectedJsonPath,
      notificationMarkdownPath: protectedMarkdownPath
    }
  }, null, 2)}\n`);

  const result = runNodeScript(cleanScriptPath, ["--keep", "1"], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.keepCount, 1);
  assert.equal(Array.isArray(payload.archivedPayloads), true);
  assert.equal(fs.existsSync(protectedJsonPath), true);
  assert.equal(fs.existsSync(protectedMarkdownPath), true);
  assert.equal(fs.existsSync(staleJsonPath), false);
  assert.equal(fs.existsSync(staleMarkdownPath), false);
  assert.equal(fs.existsSync(path.join(tempArchiveDir, path.basename(staleJsonPath))), true);
  assert.equal(fs.existsSync(path.join(tempArchiveDir, path.basename(staleMarkdownPath))), true);
  assert.equal(payload.archivedPayloads.length, 1);
  assert.equal(payload.archivedPayloads[0].baseName, "upgrade-payload-20260401-101010");

  fs.rmSync(tempManifestRoot, { recursive: true, force: true });
});

test("check-release-consistency validates consumer compatibility matrix when required", { concurrency: false }, (t) => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-matrix-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  copyDir(path.join(root, "manifest"), tempManifestDir);
  normalizeManifestSnapshot(tempManifestDir);
  const matrixJsonPath = path.join(tempManifestDir, "consumer-compatibility-matrix.json");
  const matrixMarkdownPath = path.join(tempManifestDir, "consumer-compatibility-matrix.md");
  const notificationsDir = path.join(tempManifestDir, "notifications");
  const latestNotificationJson = fs.readdirSync(notificationsDir)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left, "en"))[0];
  const latestNotificationJsonPath = path.join(notificationsDir, latestNotificationJson);
  const version = packageJson.version;

  fs.writeFileSync(
    matrixJsonPath,
    `${JSON.stringify({
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
        selectedTools: [{ toolName: "codex", count: 1 }]
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
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(matrixMarkdownPath, "# Consumer Compatibility Matrix\n", "utf8");

  const originalRecord = JSON.parse(fs.readFileSync(path.join(tempManifestDir, "version-record.json"), "utf8"));
  originalRecord.packageName = packageJson.name;
  originalRecord.version = version;
  originalRecord.artifacts.skillsManifestPath = path.join(tempManifestDir, "skills-manifest.json");
  originalRecord.artifacts.releaseNotesPath = path.join(tempManifestDir, `release-notes-${version}.md`);
  originalRecord.artifacts.versionRecordPath = path.join(tempManifestDir, "version-record.json");
  originalRecord.artifacts.impactReportPath = path.join(tempManifestDir, "impact-report.json");
  originalRecord.artifacts.upgradeRiskReportPath = path.join(tempManifestDir, "upgrade-risk-report.json");
  originalRecord.artifacts.upgradeRiskMarkdownPath = path.join(tempManifestDir, "upgrade-risk-report.md");
  originalRecord.artifacts.automationReportPath = path.join(tempManifestDir, "automation-report.json");
  originalRecord.artifacts.notificationJsonPath = latestNotificationJsonPath;
  originalRecord.artifacts.notificationMarkdownPath = latestNotificationJsonPath.replace(/\.json$/i, ".md");
  originalRecord.artifacts.consumerCompatibilityMatrixPath = matrixJsonPath;
  originalRecord.artifacts.consumerCompatibilityMatrixMarkdownPath = matrixMarkdownPath;
  originalRecord.artifacts.governanceOperationsReportPath = path.join(tempManifestDir, "governance-operations-report.json");
  originalRecord.artifacts.governanceOperationsMarkdownPath = path.join(tempManifestDir, "governance-operations-report.md");
  originalRecord.artifacts.upgradeAdvicePackagePath = path.join(tempManifestDir, "upgrade-advice-package.json");
  originalRecord.artifacts.upgradeAdvicePackageMarkdownPath = path.join(tempManifestDir, "upgrade-advice-package.md");
  fs.writeFileSync(path.join(tempManifestDir, "version-record.json"), `${JSON.stringify(originalRecord, null, 2)}\n`, "utf8");

  fs.writeFileSync(
    path.join(tempManifestDir, "upgrade-advice-package.json"),
    `${JSON.stringify({
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
        releaseGateFailures: 0
      },
      consumerCommands: [],
      maintainerCommands: [],
      manualChecks: []
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(path.join(tempManifestDir, "upgrade-advice-package.md"), "# Upgrade Advice Package\n", "utf8");

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
    governanceOperationsReportPath: path.join(tempManifestDir, "governance-operations-report.json"),
    governanceOperationsMarkdownPath: path.join(tempManifestDir, "governance-operations-report.md"),
    upgradeAdvicePackagePath: path.join(tempManifestDir, "upgrade-advice-package.json"),
    upgradeAdvicePackageMarkdownPath: path.join(tempManifestDir, "upgrade-advice-package.md"),
    impactTaskPath: path.join(tempManifestDir, "impact-tasks", path.basename(notificationPayload.links?.impactTaskPath || "impact-task.md")),
    automationReportPath: path.join(tempManifestDir, "automation-report.json")
  };
  fs.writeFileSync(latestNotificationJsonPath, `${JSON.stringify(notificationPayload, null, 2)}\n`, "utf8");

  t.after(() => fs.rmSync(tempManifestRoot, { recursive: true, force: true }));

  const result = runNodeScript(consistencyScriptPath, ["--require-consumer-matrix"], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /校验通过/);
});
