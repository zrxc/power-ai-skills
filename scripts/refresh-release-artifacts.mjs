/**
 * 发布产物刷新脚本
 * 目标：
 * 1. 在 release:prepare 前统一刷新 manifest 和 release notes；
 * 2. 如果存在 changed-files.txt，则顺带重建 impact / automation / notification 产物；
 * 3. 让后续一致性校验有一套明确的“当前版本产物”可以验证。
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const manifestDir = path.join(root, "manifest");
const changedFilesPath = path.join(manifestDir, "changed-files.txt");
const impactReportPath = path.join(manifestDir, "impact-report.json");
const automationReportPath = path.join(manifestDir, "automation-report.json");
const upgradeRiskReportPath = path.join(manifestDir, "upgrade-risk-report.json");
const upgradeRiskMarkdownPath = path.join(manifestDir, "upgrade-risk-report.md");
const consumerCompatibilityMatrixPath = path.join(manifestDir, "consumer-compatibility-matrix.json");
const consumerCompatibilityMatrixMarkdownPath = path.join(manifestDir, "consumer-compatibility-matrix.md");
const releaseGateReportPath = path.join(manifestDir, "release-gate-report.json");
const releaseGateMarkdownPath = path.join(manifestDir, "release-gate-report.md");
const upgradeAdvicePackagePath = path.join(manifestDir, "upgrade-advice-package.json");
const upgradeAdvicePackageMarkdownPath = path.join(manifestDir, "upgrade-advice-package.md");
const promotionTraceReportPath = path.join(manifestDir, "promotion-trace-report.json");
const promotionTraceMarkdownPath = path.join(manifestDir, "promotion-trace-report.md");
const governanceOperationsReportPath = path.join(manifestDir, "governance-operations-report.json");
const governanceOperationsMarkdownPath = path.join(manifestDir, "governance-operations-report.md");
const versionRecordPath = path.join(manifestDir, "version-record.json");
const releasePublishRecordPath = path.join(manifestDir, "release-publish-record.json");
const releasePublishFailureSummaryPath = path.join(manifestDir, "release-publish-failure-summary.md");

const scripts = {
  buildManifest: path.join(root, "scripts", "build-manifest.mjs"),
  releaseNotes: path.join(root, "scripts", "generate-release-notes.mjs"),
  upgradeAutomation: path.join(root, "scripts", "run-upgrade-automation.mjs"),
  promotionTraceReleaseReport: path.join(root, "scripts", "generate-promotion-trace-release-report.mjs"),
  upgradeAdvicePackage: path.join(root, "scripts", "generate-upgrade-advice-package.mjs"),
  governanceOperationsReport: path.join(root, "scripts", "generate-governance-operations-report.mjs"),
  upgradePayload: path.join(root, "scripts", "generate-upgrade-payload.mjs"),
  cleanReleaseArtifacts: path.join(root, "scripts", "clean-release-artifacts.mjs")
};

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  return result;
}

function parseJsonStdout(result, label) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    console.error(`[refresh-release-artifacts] ${label} 输出不是合法 JSON：${error.message}`);
    process.exit(1);
  }
}

function collectGovernanceSummary(artifacts) {
  const releaseGateReport = artifacts.releaseGateReportPath && fs.existsSync(artifacts.releaseGateReportPath)
    ? readJson(artifacts.releaseGateReportPath)
    : null;
  const advicePackage = artifacts.upgradeAdvicePackagePath && fs.existsSync(artifacts.upgradeAdvicePackagePath)
    ? readJson(artifacts.upgradeAdvicePackagePath)
    : null;
  const notificationPayload = artifacts.notificationJsonPath && fs.existsSync(artifacts.notificationJsonPath)
    ? readJson(artifacts.notificationJsonPath)
    : null;
  const operationsReport = artifacts.governanceOperationsReportPath && fs.existsSync(artifacts.governanceOperationsReportPath)
    ? readJson(artifacts.governanceOperationsReportPath)
    : null;

  return {
    releaseGateStatus: releaseGateReport?.overallStatus || notificationPayload?.governance?.releaseGateStatus || "unknown",
    warningGates: releaseGateReport?.summary?.warningGates || notificationPayload?.governance?.releaseGateWarnings || 0,
    unresolvedProjectProfileDecisions: advicePackage?.summary?.unresolvedProjectProfileDecisions
      || releaseGateReport?.governance?.unresolvedProjectProfileDecisions
      || notificationPayload?.governance?.unresolvedProjectProfileDecisions
      || 0,
    deferredProjectProfileDecisions: advicePackage?.summary?.deferredProjectProfileDecisions
      || releaseGateReport?.governance?.deferredProjectProfileDecisions
      || notificationPayload?.governance?.deferredProjectProfileDecisions
      || 0,
    rejectedProjectProfileDecisions: advicePackage?.summary?.rejectedProjectProfileDecisions
      || releaseGateReport?.governance?.rejectedProjectProfileDecisions
      || notificationPayload?.governance?.rejectedProjectProfileDecisions
      || 0,
    overdueGovernanceReviews: advicePackage?.summary?.overdueGovernanceReviews
      || releaseGateReport?.governance?.overdueGovernanceReviews
      || notificationPayload?.governance?.overdueGovernanceReviews
      || 0,
    dueTodayGovernanceReviews: advicePackage?.summary?.dueTodayGovernanceReviews
      || releaseGateReport?.governance?.dueTodayGovernanceReviews
      || notificationPayload?.governance?.dueTodayGovernanceReviews
      || 0,
    failedCompatibilityScenarios: operationsReport?.summary?.failedCompatibilityScenarios || 0,
    consumerMatrixScenarioCount: operationsReport?.summary?.consumerMatrixScenarioCount || 0,
    matchedPromotionRelations: operationsReport?.summary?.matchedPromotionRelations || 0,
    totalPromotionRelations: operationsReport?.summary?.totalPromotionRelations || 0,
    recentGovernanceActivityCount: operationsReport?.summary?.recentActivityCount || 0,
    pendingConversationReviews: advicePackage?.summary?.pendingConversationReviews
      || releaseGateReport?.governance?.pendingConversationReviews
      || notificationPayload?.governance?.pendingConversationReviews
      || 0,
    warningLevelConversationRecords: advicePackage?.summary?.warningLevelConversationRecords
      || releaseGateReport?.governance?.warningLevelConversationRecords
      || notificationPayload?.governance?.warningLevelConversationRecords
      || 0,
    reviewLevelConversationRecords: advicePackage?.summary?.reviewLevelConversationRecords
      || releaseGateReport?.governance?.reviewLevelConversationRecords
      || notificationPayload?.governance?.reviewLevelConversationRecords
      || 0,
    captureLevelConversationRecords: advicePackage?.summary?.captureLevelConversationRecords
      || releaseGateReport?.governance?.captureLevelConversationRecords
      || notificationPayload?.governance?.captureLevelConversationRecords
      || 0,
    recordsWithGovernanceMetadata: releaseGateReport?.governance?.recordsWithGovernanceMetadata
      || notificationPayload?.governance?.recordsWithGovernanceMetadata
      || 0,
    recordsWithAdmissionMetadata: releaseGateReport?.governance?.recordsWithAdmissionMetadata
      || notificationPayload?.governance?.recordsWithAdmissionMetadata
      || 0,
    scenariosWithWarningLevelConversationRecords: advicePackage?.summary?.scenariosWithWarningLevelConversationRecords
      || releaseGateReport?.governance?.scenariosWithWarningLevelConversationRecords
      || notificationPayload?.governance?.scenariosWithWarningLevelConversationRecords
      || 0,
    scenariosWithReviewLevelConversationRecords: advicePackage?.summary?.scenariosWithReviewLevelConversationRecords
      || releaseGateReport?.governance?.scenariosWithReviewLevelConversationRecords
      || notificationPayload?.governance?.scenariosWithReviewLevelConversationRecords
      || 0,
    pendingWrapperProposals: advicePackage?.summary?.pendingWrapperProposals
      || releaseGateReport?.governance?.pendingWrapperProposals
      || notificationPayload?.governance?.pendingWrapperProposals
      || 0,
    autoCaptureWarningScenarios: advicePackage?.summary?.autoCaptureWarningScenarios
      || releaseGateReport?.governance?.autoCaptureWarningScenarios
      || notificationPayload?.governance?.autoCaptureWarningScenarios
      || 0,
    autoCaptureAttentionScenarios: advicePackage?.summary?.autoCaptureAttentionScenarios
      || releaseGateReport?.governance?.autoCaptureAttentionScenarios
      || notificationPayload?.governance?.autoCaptureAttentionScenarios
      || 0,
    autoCaptureCaptureBacklog: advicePackage?.summary?.autoCaptureCaptureBacklog
      || releaseGateReport?.governance?.autoCaptureCaptureBacklog
      || notificationPayload?.governance?.autoCaptureCaptureBacklog
      || 0,
    autoCaptureResponseBacklog: advicePackage?.summary?.autoCaptureResponseBacklog
      || releaseGateReport?.governance?.autoCaptureResponseBacklog
      || notificationPayload?.governance?.autoCaptureResponseBacklog
      || 0,
    autoCaptureFailedRequests: advicePackage?.summary?.autoCaptureFailedRequests
      || releaseGateReport?.governance?.autoCaptureFailedRequests
      || notificationPayload?.governance?.autoCaptureFailedRequests
      || 0
  };
}

function collectPublishExecutionSummary(artifacts) {
  const publishRecordPath = artifacts.releasePublishRecordPath || releasePublishRecordPath;
  if (!publishRecordPath || !fs.existsSync(publishRecordPath)) {
    return null;
  }

  const publishRecord = readJson(publishRecordPath);
  return {
    executionId: publishRecord.executionId || "",
    recordedAt: publishRecord.recordedAt || "",
    status: publishRecord.status || "unknown",
    executionMode: publishRecord.executionMode || "",
    publishAttempted: Boolean(publishRecord.publishAttempted),
    publishSucceeded: Boolean(publishRecord.publishSucceeded),
    wouldExecuteCommand: publishRecord.wouldExecuteCommand || "",
    commandFlags: {
      confirm: Boolean(publishRecord.commandFlags?.confirm),
      acknowledgeWarnings: Boolean(publishRecord.commandFlags?.acknowledgeWarnings)
    },
    plannerStatus: publishRecord.plannerSummary?.status || "unknown",
    plannerBlockerCount: publishRecord.plannerSummary?.blockerCount || 0,
    plannerBlockers: publishRecord.plannerSummary?.blockers || [],
    releaseGateStatus: publishRecord.plannerSummary?.publishReadiness?.releaseGateStatus || "",
    requiresExplicitAcknowledgement: Boolean(publishRecord.plannerSummary?.publishReadiness?.requiresExplicitAcknowledgement),
    failureSummaryPresent: Boolean(publishRecord.failureSummary?.present),
    failurePrimaryReason: publishRecord.failureSummary?.primaryReason || "",
    recordPath: publishRecord.recordPath || publishRecordPath,
    recordPathRelative: publishRecord.recordPathRelative || "manifest/release-publish-record.json",
    historicalRecordPath: publishRecord.historicalRecordPath || "",
    historicalRecordPathRelative: publishRecord.historicalRecordPathRelative || "",
    failureSummaryPath: publishRecord.failureSummary?.summaryPath || publishRecord.failureSummaryPath || "",
    failureSummaryPathRelative: publishRecord.failureSummary?.summaryPathRelative || publishRecord.failureSummaryPathRelative || ""
  };
}

function writeVersionRecord(artifacts) {
  writeJson(versionRecordPath, {
    packageName: packageJson.name,
    version: packageJson.version,
    recordedAt: new Date().toISOString(),
    artifacts,
    governanceSummary: collectGovernanceSummary(artifacts),
    publishExecutionSummary: collectPublishExecutionSummary(artifacts)
  });
}

function writeNpmIgnoreList(dirPath, keepFilePaths) {
  const existingKeepFiles = keepFilePaths
    .filter(Boolean)
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => path.basename(filePath));
  if (!fs.existsSync(dirPath) || existingKeepFiles.length === 0) return;

  const content = [
    "*",
    ...existingKeepFiles.map((fileName) => `!${fileName}`),
    ""
  ].join("\n");
  fs.writeFileSync(path.join(dirPath, ".npmignore"), content, "utf8");
}

function writePacklistFilters(artifacts) {
  let impactTaskPath = "";
  if (artifacts.notificationJsonPath && fs.existsSync(artifacts.notificationJsonPath)) {
    const notificationPayload = readJson(artifacts.notificationJsonPath);
    impactTaskPath = notificationPayload.links?.impactTaskPath || "";
  }

  writeNpmIgnoreList(path.join(manifestDir, "notifications"), [
    artifacts.notificationJsonPath,
    artifacts.notificationMarkdownPath
  ]);
  writeNpmIgnoreList(path.join(manifestDir, "impact-tasks"), [impactTaskPath]);
}

function hasChangedFiles() {
  if (!fs.existsSync(changedFilesPath)) {
    return false;
  }

  const content = fs.readFileSync(changedFilesPath, "utf8").trim();
  return content.length > 0;
}

function removeArtifactIfVersionDrifts(jsonPath, markdownPath = "") {
  if (!fs.existsSync(jsonPath)) {
    return false;
  }

  try {
    const payload = readJson(jsonPath);
    if (payload.version === packageJson.version) {
      return false;
    }
  } catch {
    // If the artifact is malformed, drop it and let a later stage rebuild it.
  }

  fs.rmSync(jsonPath, { force: true });
  if (markdownPath) {
    fs.rmSync(markdownPath, { force: true });
  }
  return true;
}

removeArtifactIfVersionDrifts(consumerCompatibilityMatrixPath, consumerCompatibilityMatrixMarkdownPath);
removeArtifactIfVersionDrifts(releaseGateReportPath, releaseGateMarkdownPath);

runNodeScript(scripts.buildManifest);
runNodeScript(scripts.releaseNotes);

const refreshedArtifacts = [
  path.relative(root, path.join(manifestDir, "skills-manifest.json")),
  path.relative(root, path.join(manifestDir, `release-notes-${packageJson.version}.md`))
];

const versionArtifacts = {
  skillsManifestPath: path.join(manifestDir, "skills-manifest.json"),
  releaseNotesPath: path.join(manifestDir, `release-notes-${packageJson.version}.md`),
  versionRecordPath
};

if (fs.existsSync(releasePublishRecordPath)) {
  versionArtifacts.releasePublishRecordPath = releasePublishRecordPath;
  refreshedArtifacts.push(path.relative(root, releasePublishRecordPath));
}

if (fs.existsSync(releasePublishFailureSummaryPath)) {
  versionArtifacts.releasePublishFailureSummaryPath = releasePublishFailureSummaryPath;
  refreshedArtifacts.push(path.relative(root, releasePublishFailureSummaryPath));
}

if (hasChangedFiles()) {
  runNodeScript(scripts.upgradeAutomation, [
    "--changed-files", changedFilesPath,
    "--impact-report", impactReportPath,
    "--risk-report", upgradeRiskReportPath,
    "--risk-markdown", upgradeRiskMarkdownPath,
    "--output", automationReportPath,
    "--skip-consumer"
  ]);
  runNodeScript(scripts.promotionTraceReleaseReport, [
    "--changed-files", changedFilesPath,
    "--output", promotionTraceReportPath,
    "--markdown", promotionTraceMarkdownPath
  ]);
  runNodeScript(scripts.upgradeAdvicePackage, [
    "--automation-report", automationReportPath,
    "--output", upgradeAdvicePackagePath,
    "--markdown", upgradeAdvicePackageMarkdownPath
  ]);
  runNodeScript(scripts.governanceOperationsReport, [
    "--automation-report", automationReportPath,
    "--output", governanceOperationsReportPath,
    "--markdown", governanceOperationsMarkdownPath
  ]);
  const payloadResult = runNodeScript(scripts.upgradePayload, ["--automation-report", automationReportPath]);
  const payload = parseJsonStdout(payloadResult, "generate-upgrade-payload");
  versionArtifacts.impactReportPath = impactReportPath;
  versionArtifacts.upgradeRiskReportPath = upgradeRiskReportPath;
  versionArtifacts.upgradeRiskMarkdownPath = upgradeRiskMarkdownPath;
  versionArtifacts.promotionTraceReportPath = promotionTraceReportPath;
  versionArtifacts.promotionTraceMarkdownPath = promotionTraceMarkdownPath;
  versionArtifacts.governanceOperationsReportPath = governanceOperationsReportPath;
  versionArtifacts.governanceOperationsMarkdownPath = governanceOperationsMarkdownPath;
  versionArtifacts.automationReportPath = automationReportPath;
  versionArtifacts.notificationJsonPath = payload.jsonOutputPath;
  versionArtifacts.notificationMarkdownPath = payload.markdownOutputPath;
  refreshedArtifacts.push(
    path.relative(root, impactReportPath),
    path.relative(root, upgradeRiskReportPath),
    path.relative(root, upgradeRiskMarkdownPath),
    path.relative(root, promotionTraceReportPath),
    path.relative(root, promotionTraceMarkdownPath),
    path.relative(root, governanceOperationsReportPath),
    path.relative(root, governanceOperationsMarkdownPath),
    path.relative(root, automationReportPath),
    path.relative(root, payload.jsonOutputPath),
    path.relative(root, payload.markdownOutputPath)
  );
}

if (fs.existsSync(consumerCompatibilityMatrixPath)) {
  versionArtifacts.consumerCompatibilityMatrixPath = consumerCompatibilityMatrixPath;
  refreshedArtifacts.push(path.relative(root, consumerCompatibilityMatrixPath));
}

if (fs.existsSync(consumerCompatibilityMatrixMarkdownPath)) {
  versionArtifacts.consumerCompatibilityMatrixMarkdownPath = consumerCompatibilityMatrixMarkdownPath;
  refreshedArtifacts.push(path.relative(root, consumerCompatibilityMatrixMarkdownPath));
}

if (fs.existsSync(releaseGateReportPath)) {
  versionArtifacts.releaseGateReportPath = releaseGateReportPath;
  refreshedArtifacts.push(path.relative(root, releaseGateReportPath));
}

if (fs.existsSync(releaseGateMarkdownPath)) {
  versionArtifacts.releaseGateMarkdownPath = releaseGateMarkdownPath;
  refreshedArtifacts.push(path.relative(root, releaseGateMarkdownPath));
}

if (fs.existsSync(upgradeAdvicePackagePath)) {
  versionArtifacts.upgradeAdvicePackagePath = upgradeAdvicePackagePath;
  refreshedArtifacts.push(path.relative(root, upgradeAdvicePackagePath));
}

if (fs.existsSync(upgradeAdvicePackageMarkdownPath)) {
  versionArtifacts.upgradeAdvicePackageMarkdownPath = upgradeAdvicePackageMarkdownPath;
  refreshedArtifacts.push(path.relative(root, upgradeAdvicePackageMarkdownPath));
}

if (fs.existsSync(governanceOperationsReportPath)) {
  versionArtifacts.governanceOperationsReportPath = governanceOperationsReportPath;
  refreshedArtifacts.push(path.relative(root, governanceOperationsReportPath));
}

if (fs.existsSync(governanceOperationsMarkdownPath)) {
  versionArtifacts.governanceOperationsMarkdownPath = governanceOperationsMarkdownPath;
  refreshedArtifacts.push(path.relative(root, governanceOperationsMarkdownPath));
}

writeVersionRecord(versionArtifacts);
refreshedArtifacts.push(path.relative(root, versionRecordPath));

const cleanupResult = runNodeScript(scripts.cleanReleaseArtifacts);
const cleanupSummary = parseJsonStdout(cleanupResult, "clean-release-artifacts");
writePacklistFilters(versionArtifacts);
for (const archivedItem of cleanupSummary.archivedPayloads || []) {
  if (archivedItem.archivedJsonPath) {
    refreshedArtifacts.push(path.relative(root, archivedItem.archivedJsonPath));
  }
  if (archivedItem.archivedMarkdownPath) {
    refreshedArtifacts.push(path.relative(root, archivedItem.archivedMarkdownPath));
  }
}

const uniqueRefreshedArtifacts = [...new Set(refreshedArtifacts)];

console.log(JSON.stringify({
  packageName: packageJson.name,
  version: packageJson.version,
  refreshedArtifacts: uniqueRefreshedArtifacts,
  cleanupSummary
}, null, 2));
