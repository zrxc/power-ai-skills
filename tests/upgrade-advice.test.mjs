import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const adviceScriptPath = path.join(root, "scripts", "generate-upgrade-advice-package.mjs");
const payloadScriptPath = path.join(root, "scripts", "generate-upgrade-payload.mjs");

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

function createTempManifestSnapshot(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-upgrade-advice-"));
  const manifestRoot = path.join(tempRoot, "manifest");
  fs.cpSync(path.join(root, "manifest"), manifestRoot, { recursive: true });
  const versionRecordPath = path.join(manifestRoot, "version-record.json");

  const automationReport = {
    packageName: packageJson.name,
    version: packageJson.version,
    changedFilesPath: path.join(manifestRoot, "changed-files.txt"),
    impactReportPath: path.join(manifestRoot, "impact-report.json"),
    riskReportPath: path.join(manifestRoot, "upgrade-risk-report.json"),
    riskMarkdownPath: path.join(manifestRoot, "upgrade-risk-report.md"),
    impactTaskPath: path.join(manifestRoot, "impact-tasks", "impact-task.md"),
    consumerVerification: {
      skipped: false,
      ok: true
    },
    consumerCompatibilityMatrixPath: path.join(manifestRoot, "consumer-compatibility-matrix.json"),
    consumerCompatibilityMatrixMarkdownPath: path.join(manifestRoot, "consumer-compatibility-matrix.md"),
    summary: {
      changedFileCount: 2,
      affectedDomainCount: 2,
      affectedSkillCount: 4,
      recommendedReleaseLevel: "minor",
      impactRecommendedReleaseLevel: "minor",
      overallRiskLevel: "high",
      riskCategoryCount: 1,
      consumerMatrixScenarioCount: 1,
      consumerMatrixPassedCount: 1,
      consumerMatrixFailedCount: 0
    }
  };
  fs.writeFileSync(path.join(manifestRoot, "automation-report.json"), `${JSON.stringify(automationReport, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(manifestRoot, "impact-report.json"), `${JSON.stringify({
    packageName: packageJson.name,
    version: packageJson.version,
    changedFiles: ["docs/versioning-policy.md"],
    affectedDomainCount: 2,
    affectedSkillCount: 4,
    recommendedReleaseLevel: "minor",
    followUps: ["Review docs changes in consumer onboarding flow."]
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(manifestRoot, "upgrade-risk-report.json"), `${JSON.stringify({
    packageName: packageJson.name,
    version: packageJson.version,
    overallRiskLevel: "high",
    overallReleaseHint: "minor",
    summary: { categoryCount: 1 },
    categories: [],
    recommendedActions: ["Check generated release artifacts before publishing."]
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(manifestRoot, "upgrade-risk-report.md"), "# Upgrade Risk Report\n", "utf8");
  fs.writeFileSync(path.join(manifestRoot, "release-gate-report.json"), `${JSON.stringify({
    packageName: packageJson.name,
    version: packageJson.version,
    overallStatus: "warn",
    summary: {
      failedGates: 0,
      warningGates: 2,
      readyForRegistration: 0,
      pendingFollowUps: 0,
      stalledProposalCount: 0,
      unresolvedProjectProfileDecisions: 1,
      deferredProjectProfileDecisions: 1,
      rejectedProjectProfileDecisions: 1,
      overdueGovernanceReviews: 1,
      dueTodayGovernanceReviews: 0,
      pendingConversationReviews: 2,
      pendingWrapperProposals: 1
    },
      governance: {
        matrixAvailable: true,
        unresolvedProjectProfileDecisions: 1,
        deferredProjectProfileDecisions: 1,
        rejectedProjectProfileDecisions: 1,
        overdueGovernanceReviews: 1,
        dueTodayGovernanceReviews: 0,
        pendingConversationReviews: 2,
        scenariosWithPendingConversationReviews: 1,
        warningLevelConversationRecords: 3,
        scenariosWithWarningLevelConversationRecords: 1,
        reviewLevelConversationRecords: 2,
        captureLevelConversationRecords: 4,
        recordsWithGovernanceMetadata: 6,
        recordsWithAdmissionMetadata: 6,
        scenariosWithReviewLevelConversationRecords: 1,
        pendingWrapperProposals: 1,
        scenariosWithPendingWrapperProposals: 1
      },
    recommendedActions: []
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(manifestRoot, "consumer-compatibility-matrix.json"), `${JSON.stringify({
    packageName: packageJson.name,
    version: packageJson.version,
    summary: {
      totalScenarios: 1,
      passedScenarios: 1,
      failedScenarios: 0,
      unresolvedProjectProfileDecisions: 1,
      deferredProjectProfileDecisions: 1,
      rejectedProjectProfileDecisions: 1,
      overdueGovernanceReviews: 1,
      dueTodayGovernanceReviews: 0,
      scenariosWithOverdueGovernanceReviews: 1,
      pendingConversationReviews: 2,
      scenariosWithPendingConversationReviews: 1,
      warningLevelConversationRecords: 3,
      scenariosWithWarningLevelConversationRecords: 1,
      reviewLevelConversationRecords: 2,
      captureLevelConversationRecords: 4,
      recordsWithGovernanceMetadata: 6,
      recordsWithAdmissionMetadata: 6,
      scenariosWithReviewLevelConversationRecords: 1,
      pendingWrapperProposals: 1,
      scenariosWithPendingWrapperProposals: 1
    }
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(manifestRoot, "consumer-compatibility-matrix.md"), "# Consumer Compatibility Matrix\n", "utf8");
  fs.mkdirSync(path.join(manifestRoot, "impact-tasks"), { recursive: true });
  fs.writeFileSync(path.join(manifestRoot, "impact-tasks", "impact-task.md"), "# Impact Task\n", "utf8");
  fs.writeFileSync(versionRecordPath, `${JSON.stringify({
    packageName: packageJson.name,
    version: packageJson.version,
    recordedAt: new Date().toISOString(),
    artifacts: {
      versionRecordPath,
      releaseGateReportPath: path.join(manifestRoot, "release-gate-report.json"),
      releaseGateMarkdownPath: path.join(manifestRoot, "release-gate-report.md")
    }
  }, null, 2)}\n`, "utf8");

  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return manifestRoot;
}

test("generate-upgrade-advice-package writes actionable consumer and maintainer guidance", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);

  const result = runNodeScript(adviceScriptPath, [
    "--automation-report", path.join(manifestRoot, "automation-report.json"),
    "--output", path.join(manifestRoot, "upgrade-advice-package.json"),
    "--markdown", path.join(manifestRoot, "upgrade-advice-package.md")
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(fs.readFileSync(path.join(manifestRoot, "upgrade-advice-package.json"), "utf8"));
  assert.equal(payload.releaseLevel, "minor");
  assert.equal(payload.overallRiskLevel, "high");
  assert.equal(payload.summary.consumerCommandCount >= 3, true);
  assert.equal(payload.summary.maintainerCommandCount >= 4, true);
  assert.equal(payload.summary.teamPolicyDefaultToolCount >= 1, true);
  assert.equal(payload.summary.teamProjectProfileCount >= 1, true);
  assert.equal(payload.summary.releaseGateWarnings, 2);
  assert.equal(payload.summary.unresolvedProjectProfileDecisions, 1);
  assert.equal(payload.summary.deferredProjectProfileDecisions, 1);
  assert.equal(payload.summary.rejectedProjectProfileDecisions, 1);
  assert.equal(payload.summary.overdueGovernanceReviews, 1);
  assert.equal(payload.summary.dueTodayGovernanceReviews, 0);
  assert.equal(payload.summary.pendingConversationReviews, 2);
  assert.equal(payload.summary.warningLevelConversationRecords, 3);
  assert.equal(payload.summary.reviewLevelConversationRecords, 2);
  assert.equal(payload.summary.captureLevelConversationRecords, 4);
  assert.equal(payload.summary.scenariosWithWarningLevelConversationRecords, 1);
  assert.equal(payload.summary.pendingWrapperProposals, 1);
  assert.equal(payload.consumerCommands.some((item) => item.command.includes("power-ai-skills sync")), true);
  assert.equal(payload.consumerCommands.some((item) => item.command.includes("show-defaults")), true);
  assert.equal(payload.consumerCommands.some((item) => item.command.includes("check-team-policy-drift")), true);
  assert.equal(payload.consumerCommands.some((item) => item.command.includes("show-project-profile-decision")), true);
  assert.equal(payload.consumerCommands.some((item) => item.command.includes("check-governance-review-deadlines")), true);
  assert.equal(payload.consumerCommands.some((item) => item.command.includes("show-project-governance-context")), true);
  assert.equal(payload.maintainerCommands.some((item) => item.command.includes("check:release-gates")), true);
  assert.equal(payload.maintainerCommands.some((item) => item.command.includes("validate-team-policy")), true);
  assert.equal(payload.manualChecks.some((item) => item.title.includes("project profile")), true);
  assert.equal(payload.manualChecks.some((item) => item.title.includes("Recheck historical project profile decisions")), true);
  assert.equal(payload.manualChecks.some((item) => item.title.includes("Review governance deadlines")), true);
  assert.equal(payload.manualChecks.some((item) => item.title.includes("Review conversation backlog")), true);
  assert.equal(payload.manualChecks.some((item) => item.title.includes("warning-level conversation captures")), true);
  assert.equal(payload.manualChecks.some((item) => item.title.includes("release gate governance warnings")), true);
  assert.equal(payload.notices.some((item) => item.includes("Governance summary")), true);
  assert.equal(payload.notices.some((item) => item.includes("Governance review deadlines")), true);
  assert.equal(payload.notices.some((item) => item.includes("Governance backlog")), true);
  assert.equal(payload.notices.some((item) => item.includes("not blocking publication")), true);

  const versionRecord = JSON.parse(fs.readFileSync(path.join(manifestRoot, "version-record.json"), "utf8"));
  assert.equal(versionRecord.artifacts.upgradeAdvicePackagePath, path.join(manifestRoot, "upgrade-advice-package.json"));
  assert.equal(versionRecord.governanceSummary.releaseGateStatus, "warn");
  assert.equal(versionRecord.governanceSummary.warningGates, 2);
  assert.equal(versionRecord.governanceSummary.overdueGovernanceReviews, 1);
  assert.equal(versionRecord.governanceSummary.pendingConversationReviews, 2);
  assert.equal(versionRecord.governanceSummary.warningLevelConversationRecords, 3);
  assert.equal(versionRecord.governanceSummary.reviewLevelConversationRecords, 2);
  assert.equal(versionRecord.governanceSummary.captureLevelConversationRecords, 4);
  assert.equal(versionRecord.governanceSummary.scenariosWithWarningLevelConversationRecords, 1);
});

test("generate-upgrade-payload embeds advice links and summary when advice package exists", { concurrency: false }, (t) => {
  const manifestRoot = createTempManifestSnapshot(t);

  const adviceResult = runNodeScript(adviceScriptPath, [
    "--automation-report", path.join(manifestRoot, "automation-report.json"),
    "--output", path.join(manifestRoot, "upgrade-advice-package.json"),
    "--markdown", path.join(manifestRoot, "upgrade-advice-package.md")
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot
    }
  });
  assert.equal(adviceResult.status, 0, adviceResult.stderr);

  const payloadResult = runNodeScript(payloadScriptPath, [
    "--automation-report", path.join(manifestRoot, "automation-report.json")
  ], {
    env: {
      POWER_AI_RELEASE_MANIFEST_DIR: manifestRoot
    }
  });
  assert.equal(payloadResult.status, 0, payloadResult.stderr);

  const generated = JSON.parse(payloadResult.stdout);
  const notification = JSON.parse(fs.readFileSync(generated.jsonOutputPath, "utf8"));
  assert.equal(Boolean(notification.advice), true);
  assert.equal(Boolean(notification.governance), true);
  assert.equal(notification.governance.releaseGateStatus, "warn");
  assert.equal(notification.governance.releaseGateWarnings, 2);
  assert.equal(notification.governance.overdueGovernanceReviews, 1);
  assert.equal(notification.governance.pendingConversationReviews, 2);
  assert.equal(notification.governance.warningLevelConversationRecords, 3);
  assert.equal(notification.governance.reviewLevelConversationRecords, 2);
  assert.equal(notification.governance.recordsWithGovernanceMetadata, 6);
  assert.equal(notification.links.releaseGateReportPath, path.join(manifestRoot, "release-gate-report.json"));
  assert.equal(notification.links.upgradeAdvicePackagePath, path.join(manifestRoot, "upgrade-advice-package.json"));
  assert.equal(notification.body.includes("upgrade advice package"), true);
  assert.equal(notification.body.includes("release gate status"), true);
  assert.equal(notification.body.includes("unresolved project profile decisions"), true);
  assert.equal(notification.body.includes("warning-level conversation records"), true);

  const versionRecord = JSON.parse(fs.readFileSync(path.join(manifestRoot, "version-record.json"), "utf8"));
  assert.equal(versionRecord.artifacts.notificationJsonPath, generated.jsonOutputPath);
  assert.equal(versionRecord.governanceSummary.releaseGateStatus, "warn");
  assert.equal(versionRecord.governanceSummary.unresolvedProjectProfileDecisions, 1);
  assert.equal(versionRecord.governanceSummary.overdueGovernanceReviews, 1);
  assert.equal(versionRecord.governanceSummary.warningLevelConversationRecords, 3);
  assert.equal(versionRecord.governanceSummary.recordsWithGovernanceMetadata, 6);
});
