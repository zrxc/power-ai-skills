import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const consistencyScriptPath = path.join(root, "scripts", "check-release-consistency.mjs");
const releaseGatesScriptPath = path.join(root, "scripts", "check-release-gates.mjs");
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
      `# Release Notes ${version}\n\n- 包名：\`${packageJson.name}\`\n- 版本：\`${version}\`\n`,
      "utf8"
    );
  }

  const versionRecord = JSON.parse(fs.readFileSync(path.join(tempManifestDir, "version-record.json"), "utf8"));
  versionRecord.packageName = packageJson.name;
  versionRecord.version = version;
  versionRecord.artifacts = {
    ...versionRecord.artifacts,
    skillsManifestPath: path.join(tempManifestDir, "skills-manifest.json"),
    releaseNotesPath: path.join(tempManifestDir, `release-notes-${version}.md`),
    versionRecordPath: path.join(tempManifestDir, "version-record.json"),
    impactReportPath: path.join(tempManifestDir, "impact-report.json"),
    upgradeRiskReportPath: path.join(tempManifestDir, "upgrade-risk-report.json"),
    upgradeRiskMarkdownPath: path.join(tempManifestDir, "upgrade-risk-report.md"),
    consumerCompatibilityMatrixPath: matrixJsonPath,
    consumerCompatibilityMatrixMarkdownPath: matrixMarkdownPath,
    releaseGateReportPath: releaseGateJsonPath,
    releaseGateMarkdownPath: releaseGateMarkdownPath,
    governanceOperationsReportPath: governanceOperationsJsonPath,
    governanceOperationsMarkdownPath: governanceOperationsMarkdownPath,
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
  fs.writeFileSync(path.join(tempManifestDir, "version-record.json"), `${JSON.stringify(versionRecord, null, 2)}\n`, "utf8");

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
    releaseGateMarkdownPath: releaseGateMarkdownPath,
    governanceOperationsReportPath: governanceOperationsJsonPath,
    governanceOperationsMarkdownPath: governanceOperationsMarkdownPath,
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
  fs.writeFileSync(latestNotificationJsonPath, `${JSON.stringify(notificationPayload, null, 2)}\n`, "utf8");
  fs.writeFileSync(latestNotificationJsonPath.replace(/\.json$/i, ".md"), `# Upgrade Payload\n\n- 版本：\`${version}\`\n`, "utf8");
}

test("check-release-gates writes a passing report for a clean manifest snapshot", { concurrency: false }, (t) => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-gates-pass-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  const tempProjectRoot = path.join(tempManifestRoot, "project");
  fs.cpSync(path.join(root, "manifest"), tempManifestDir, { recursive: true });
  normalizeManifestSnapshot(tempManifestDir);
  fs.mkdirSync(path.join(tempProjectRoot, ".power-ai", "proposals"), { recursive: true });

  t.after(() => fs.rmSync(tempManifestRoot, { recursive: true, force: true }));

  const result = runNodeScript(releaseGatesScriptPath, [
    "--project-root", tempProjectRoot,
    "--require-consumer-matrix"
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overallStatus, "pass");
  assert.equal(fs.existsSync(path.join(tempManifestDir, "release-gate-report.json")), true);
  assert.equal(fs.existsSync(path.join(tempManifestDir, "release-gate-report.md")), true);
  const savedReport = JSON.parse(fs.readFileSync(path.join(tempManifestDir, "release-gate-report.json"), "utf8"));
  assert.equal(savedReport.teamPolicy.ok, true);
  assert.equal(savedReport.summary.teamPolicyErrorCount, 0);
  assert.equal(savedReport.gates.some((gate) => gate.id === "team-policy-governance"), true);
  const updatedVersionRecord = JSON.parse(fs.readFileSync(path.join(tempManifestDir, "version-record.json"), "utf8"));
  assert.equal(updatedVersionRecord.artifacts.releaseGateReportPath, path.join(tempManifestDir, "release-gate-report.json"));
  assert.equal(updatedVersionRecord.governanceSummary.releaseGateStatus, "pass");
});

test("check-release-gates blocks release when wrapper promotions are still pending", { concurrency: false }, (t) => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-gates-fail-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  const tempProjectRoot = path.join(tempManifestRoot, "project");
  const promotionRoot = path.join(
    tempProjectRoot,
    ".power-ai",
    "proposals",
    "wrapper-promotions",
    "my-pending-tool"
  );
  fs.cpSync(path.join(root, "manifest"), tempManifestDir, { recursive: true });
  normalizeManifestSnapshot(tempManifestDir);
  fs.mkdirSync(promotionRoot, { recursive: true });
  fs.writeFileSync(
    path.join(promotionRoot, "wrapper-promotion.json"),
    `${JSON.stringify({
      toolName: "my-pending-tool",
      displayName: "My Pending Tool",
      integrationStyle: "gui",
      generatedAt: "2026-04-20T10:00:00.000Z",
      status: "accepted",
      materializationStatus: "generated",
      applicationStatus: "applied",
      followUpStatus: "docs-generated",
      pendingFollowUps: ["merge docs snippet", "run wrapper tests"]
    }, null, 2)}\n`,
    "utf8"
  );

  t.after(() => fs.rmSync(tempManifestRoot, { recursive: true, force: true }));

  const result = runNodeScript(releaseGatesScriptPath, [
    "--project-root", tempProjectRoot,
    "--require-consumer-matrix"
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overallStatus, "fail");
  assert.equal(payload.pendingFollowUps, 1);
});

test("check-release-gates surfaces governance drift as warnings without blocking release", { concurrency: false }, (t) => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-gates-warn-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  const tempProjectRoot = path.join(tempManifestRoot, "project");
  fs.cpSync(path.join(root, "manifest"), tempManifestDir, { recursive: true });
  normalizeManifestSnapshot(tempManifestDir);
  fs.mkdirSync(path.join(tempProjectRoot, ".power-ai", "proposals"), { recursive: true });

  const matrixPath = path.join(tempManifestDir, "consumer-compatibility-matrix.json");
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  matrix.summary.unresolvedProjectProfileDecisions = 1;
  matrix.summary.deferredProjectProfileDecisions = 1;
  matrix.summary.rejectedProjectProfileDecisions = 1;
  matrix.summary.pendingConversationReviews = 2;
  matrix.summary.scenariosWithPendingConversationReviews = 1;
  matrix.summary.warningLevelConversationRecords = 3;
  matrix.summary.scenariosWithWarningLevelConversationRecords = 1;
  matrix.summary.pendingWrapperProposals = 1;
  matrix.summary.scenariosWithPendingWrapperProposals = 1;
  matrix.summary.staleEvolutionProposalReviews = 2;
  matrix.summary.scenariosWithStaleEvolutionProposalReviews = 1;
  matrix.summary.staleAcceptedEvolutionProposals = 1;
  matrix.summary.scenariosWithStaleAcceptedEvolutionProposals = 1;
  fs.writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

  t.after(() => fs.rmSync(tempManifestRoot, { recursive: true, force: true }));

  const result = runNodeScript(releaseGatesScriptPath, [
    "--project-root", tempProjectRoot,
    "--require-consumer-matrix"
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overallStatus, "warn");
  assert.equal(payload.warningGates, 3);

  const savedReport = JSON.parse(fs.readFileSync(path.join(tempManifestDir, "release-gate-report.json"), "utf8"));
  assert.equal(savedReport.summary.warningGates, 3);
  assert.equal(savedReport.summary.failedGates, 0);
  assert.equal(savedReport.governance.unresolvedProjectProfileDecisions, 1);
  assert.equal(savedReport.governance.pendingConversationReviews, 2);
  assert.equal(savedReport.governance.warningLevelConversationRecords, 3);
  assert.equal(savedReport.governance.staleEvolutionProposalReviews, 2);
  assert.equal(savedReport.governance.staleAcceptedEvolutionProposals, 1);
  assert.equal(savedReport.gates.find((gate) => gate.id === "project-profile-decision-governance")?.status, "warn");
  assert.equal(savedReport.gates.find((gate) => gate.id === "conversation-review-governance")?.status, "warn");
  assert.equal(savedReport.gates.find((gate) => gate.id === "conversation-capture-warning-governance")?.status, "warn");
  assert.equal(savedReport.gates.find((gate) => gate.id === "evolution-proposal-governance")?.status, "pass");
  assert.equal(savedReport.gates.find((gate) => gate.id === "evolution-proposal-governance")?.details.staleEvolutionProposalReviews, 2);
  assert.equal(savedReport.gates.find((gate) => gate.id === "evolution-proposal-governance")?.details.staleAcceptedEvolutionProposals, 1);

  const updatedVersionRecord = JSON.parse(fs.readFileSync(path.join(tempManifestDir, "version-record.json"), "utf8"));
  assert.equal(updatedVersionRecord.governanceSummary.releaseGateStatus, "warn");
  assert.equal(updatedVersionRecord.governanceSummary.warningGates, 3);
});

test("check-release-gates warns when applied evolution proposal drafts still have follow-up actions", { concurrency: false }, (t) => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-gates-applied-followup-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  const tempProjectRoot = path.join(tempManifestRoot, "project");
  fs.cpSync(path.join(root, "manifest"), tempManifestDir, { recursive: true });
  normalizeManifestSnapshot(tempManifestDir);
  fs.mkdirSync(path.join(tempProjectRoot, ".power-ai", "proposals"), { recursive: true });

  const matrixPath = path.join(tempManifestDir, "consumer-compatibility-matrix.json");
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  matrix.summary.appliedEvolutionProposalFollowUps = 2;
  matrix.summary.scenariosWithAppliedEvolutionProposalFollowUps = 1;
  matrix.summary.appliedEvolutionProposalFollowUpActionCount = 4;
  matrix.summary.appliedWrapperPromotionDrafts = 1;
  matrix.summary.appliedSharedSkillDrafts = 1;
  matrix.summary.appliedReleaseImpactDrafts = 0;
  fs.writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

  t.after(() => fs.rmSync(tempManifestRoot, { recursive: true, force: true }));

  const result = runNodeScript(releaseGatesScriptPath, [
    "--project-root", tempProjectRoot,
    "--require-consumer-matrix"
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.overallStatus, "warn");
  assert.equal(payload.warningGates, 1);

  const savedReport = JSON.parse(fs.readFileSync(path.join(tempManifestDir, "release-gate-report.json"), "utf8"));
  assert.equal(savedReport.summary.warningGates, 1);
  assert.equal(savedReport.summary.appliedEvolutionProposalFollowUps, 2);
  assert.equal(savedReport.summary.appliedEvolutionProposalFollowUpActionCount, 4);
  assert.equal(savedReport.summary.appliedWrapperPromotionDrafts, 1);
  assert.equal(savedReport.summary.appliedSharedSkillDrafts, 1);
  assert.equal(savedReport.governance.appliedEvolutionProposalFollowUps, 2);
  assert.equal(savedReport.governance.scenariosWithAppliedEvolutionProposalFollowUps, 1);
  assert.equal(savedReport.governance.appliedEvolutionProposalFollowUpActionCount, 4);
  assert.equal(savedReport.gates.find((gate) => gate.id === "evolution-proposal-governance")?.status, "warn");
  assert.equal(savedReport.gates.find((gate) => gate.id === "evolution-proposal-governance")?.details.appliedEvolutionProposalFollowUps, 2);
  assert.equal(savedReport.gates.find((gate) => gate.id === "evolution-proposal-governance")?.details.appliedWrapperPromotionDrafts, 1);
  assert.equal(
    savedReport.recommendedActions.some((item) => item.includes("continue follow-up actions for applied proposal drafts")),
    true
  );
});

test("check-release-consistency validates release gate report when required", { concurrency: false }, (t) => {
  const tempManifestRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-release-gate-consistency-"));
  const tempManifestDir = path.join(tempManifestRoot, "manifest");
  const tempProjectRoot = path.join(tempManifestRoot, "project");
  fs.cpSync(path.join(root, "manifest"), tempManifestDir, { recursive: true });
  normalizeManifestSnapshot(tempManifestDir);
  fs.mkdirSync(path.join(tempProjectRoot, ".power-ai", "proposals"), { recursive: true });

  t.after(() => fs.rmSync(tempManifestRoot, { recursive: true, force: true }));

  const gateResult = runNodeScript(releaseGatesScriptPath, [
    "--project-root", tempProjectRoot,
    "--require-consumer-matrix"
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });
  assert.equal(gateResult.status, 0, gateResult.stderr);

  const result = runNodeScript(consistencyScriptPath, ["--require-release-gate"], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: tempManifestDir
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /发布产物一致性校验通过/);
});
