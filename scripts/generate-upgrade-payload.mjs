import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, readJson, writeJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultAutomationReportPath = path.join(root, "manifest", "automation-report.json");

function printUsageAndExit() {
  console.log("Usage: node ./scripts/generate-upgrade-payload.mjs [--automation-report manifest/automation-report.json]");
  process.exit(0);
}

function parseArgs(argv) {
  if (argv.includes("--help")) {
    printUsageAndExit();
  }

  const reportIndex = argv.indexOf("--automation-report");
  const automationReportPath = path.resolve(
    reportIndex === -1 ? defaultAutomationReportPath : argv[reportIndex + 1] || defaultAutomationReportPath
  );

  if (!fs.existsSync(automationReportPath)) {
    console.error(`[generate-upgrade-payload] automation report not found: ${automationReportPath}`);
    process.exit(1);
  }

  return { automationReportPath };
}

function getTimestampTag() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function renderConsumerSummary(consumerState) {
  if (consumerState?.skipped) {
    return `- consumer verification: skipped (${consumerState.reason || "no reason"})`;
  }

  if (consumerState) {
    return `- consumer verification: ${consumerState.ok ? "passed" : "failed"}`;
  }

  return "- consumer verification: not available";
}

function buildAdvicePaths(automationReportPath) {
  const manifestRoot = path.dirname(automationReportPath);
  return {
    jsonPath: path.join(manifestRoot, "upgrade-advice-package.json"),
    markdownPath: path.join(manifestRoot, "upgrade-advice-package.md")
  };
}

function buildReleaseGatePaths(automationReportPath) {
  const manifestRoot = path.dirname(automationReportPath);
  return {
    jsonPath: path.join(manifestRoot, "release-gate-report.json"),
    markdownPath: path.join(manifestRoot, "release-gate-report.md")
  };
}

function buildGovernanceOperationsPaths(automationReportPath) {
  const manifestRoot = path.dirname(automationReportPath);
  return {
    jsonPath: path.join(manifestRoot, "governance-operations-report.json"),
    markdownPath: path.join(manifestRoot, "governance-operations-report.md")
  };
}

function collectGovernanceSummary(advicePackage, releaseGateReport) {
  return {
    releaseGateStatus: releaseGateReport?.overallStatus || "unknown",
    releaseGateWarnings: releaseGateReport?.summary?.warningGates || 0,
    unresolvedProjectProfileDecisions: advicePackage?.summary?.unresolvedProjectProfileDecisions
      || releaseGateReport?.governance?.unresolvedProjectProfileDecisions
      || 0,
    deferredProjectProfileDecisions: advicePackage?.summary?.deferredProjectProfileDecisions
      || releaseGateReport?.governance?.deferredProjectProfileDecisions
      || 0,
    rejectedProjectProfileDecisions: advicePackage?.summary?.rejectedProjectProfileDecisions
      || releaseGateReport?.governance?.rejectedProjectProfileDecisions
      || 0,
    overdueGovernanceReviews: advicePackage?.summary?.overdueGovernanceReviews
      || releaseGateReport?.governance?.overdueGovernanceReviews
      || 0,
    dueTodayGovernanceReviews: advicePackage?.summary?.dueTodayGovernanceReviews
      || releaseGateReport?.governance?.dueTodayGovernanceReviews
      || 0,
    pendingConversationReviews: advicePackage?.summary?.pendingConversationReviews
      || releaseGateReport?.governance?.pendingConversationReviews
      || 0,
    warningLevelConversationRecords: advicePackage?.summary?.warningLevelConversationRecords
      || releaseGateReport?.governance?.warningLevelConversationRecords
      || 0,
    reviewLevelConversationRecords: advicePackage?.summary?.reviewLevelConversationRecords
      || releaseGateReport?.governance?.reviewLevelConversationRecords
      || 0,
    captureLevelConversationRecords: advicePackage?.summary?.captureLevelConversationRecords
      || releaseGateReport?.governance?.captureLevelConversationRecords
      || 0,
    recordsWithGovernanceMetadata: releaseGateReport?.governance?.recordsWithGovernanceMetadata || 0,
    recordsWithAdmissionMetadata: releaseGateReport?.governance?.recordsWithAdmissionMetadata || 0,
    scenariosWithWarningLevelConversationRecords: advicePackage?.summary?.scenariosWithWarningLevelConversationRecords
      || releaseGateReport?.governance?.scenariosWithWarningLevelConversationRecords
      || 0,
    scenariosWithReviewLevelConversationRecords: advicePackage?.summary?.scenariosWithReviewLevelConversationRecords
      || releaseGateReport?.governance?.scenariosWithReviewLevelConversationRecords
      || 0,
    pendingWrapperProposals: advicePackage?.summary?.pendingWrapperProposals
      || releaseGateReport?.governance?.pendingWrapperProposals
      || 0,
    autoCaptureWarningScenarios: advicePackage?.summary?.autoCaptureWarningScenarios
      || releaseGateReport?.governance?.autoCaptureWarningScenarios
      || 0,
    autoCaptureAttentionScenarios: advicePackage?.summary?.autoCaptureAttentionScenarios
      || releaseGateReport?.governance?.autoCaptureAttentionScenarios
      || 0,
    autoCaptureCaptureBacklog: advicePackage?.summary?.autoCaptureCaptureBacklog
      || releaseGateReport?.governance?.autoCaptureCaptureBacklog
      || 0,
    autoCaptureResponseBacklog: advicePackage?.summary?.autoCaptureResponseBacklog
      || releaseGateReport?.governance?.autoCaptureResponseBacklog
      || 0,
    autoCaptureFailedRequests: advicePackage?.summary?.autoCaptureFailedRequests
      || releaseGateReport?.governance?.autoCaptureFailedRequests
      || 0
  };
}

function renderMarkdown(
  report,
  advicePackage,
  advicePaths,
  releaseGateReport,
  releaseGatePaths,
  governanceSummary,
  governanceOperations,
  governanceOperationsPaths
) {
  const lines = [
    "# Upgrade Automation Notification",
    "",
    `- package: \`${report.packageName}\``,
    `- version: \`${report.version}\``,
    `- 版本：\`${report.version}\``,
    `- recommended release level: \`${report.summary.recommendedReleaseLevel}\``,
    `- impact release level: \`${report.summary.impactRecommendedReleaseLevel || report.summary.recommendedReleaseLevel}\``
  ];

  if (report.summary?.overallRiskLevel) {
    lines.push(`- overall risk level: \`${report.summary.overallRiskLevel}\``);
  }

  if (typeof report.summary?.riskCategoryCount === "number") {
    lines.push(`- risk category count: ${report.summary.riskCategoryCount}`);
  }

  if (typeof report.summary?.consumerMatrixScenarioCount === "number" && report.summary.consumerMatrixScenarioCount > 0) {
    lines.push(`- consumer matrix scenarios: ${report.summary.consumerMatrixScenarioCount}`);
    lines.push(`- consumer matrix passed: ${report.summary.consumerMatrixPassedCount || 0}`);
    lines.push(`- consumer matrix failed: ${report.summary.consumerMatrixFailedCount || 0}`);
  }

  if (advicePackage) {
    lines.push(`- consumer command count: ${advicePackage.summary?.consumerCommandCount || 0}`);
    lines.push(`- maintainer command count: ${advicePackage.summary?.maintainerCommandCount || 0}`);
    lines.push(`- manual check count: ${advicePackage.summary?.manualCheckCount || 0}`);
  }

  if (releaseGateReport) {
    lines.push(`- release gate status: \`${releaseGateReport.overallStatus}\``);
    lines.push(`- release gate warnings: ${releaseGateReport.summary?.warningGates || 0}`);
  }

  if (governanceOperations?.summary) {
    lines.push(`- governance activities: ${governanceOperations.summary.recentActivityCount || 0}`);
    lines.push(`- matched promotion relations: ${governanceOperations.summary.matchedPromotionRelations || 0}/${governanceOperations.summary.totalPromotionRelations || 0}`);
  }

  lines.push(`- unresolved project profile decisions: ${governanceSummary.unresolvedProjectProfileDecisions}`);
  lines.push(`- deferred project profile decisions: ${governanceSummary.deferredProjectProfileDecisions}`);
  lines.push(`- rejected project profile decisions: ${governanceSummary.rejectedProjectProfileDecisions}`);
  lines.push(`- overdue governance reviews: ${governanceSummary.overdueGovernanceReviews}`);
  lines.push(`- due today governance reviews: ${governanceSummary.dueTodayGovernanceReviews}`);
  lines.push(`- pending conversation reviews: ${governanceSummary.pendingConversationReviews}`);
  lines.push(`- warning-level conversation records: ${governanceSummary.warningLevelConversationRecords}`);
  lines.push(`- review-level conversation records: ${governanceSummary.reviewLevelConversationRecords}`);
  lines.push(`- capture-level conversation records: ${governanceSummary.captureLevelConversationRecords}`);
  lines.push(`- records with governance metadata: ${governanceSummary.recordsWithGovernanceMetadata}`);
  lines.push(`- records with admission metadata: ${governanceSummary.recordsWithAdmissionMetadata}`);
  lines.push(`- scenarios with warning-level conversation records: ${governanceSummary.scenariosWithWarningLevelConversationRecords}`);
  lines.push(`- scenarios with review-level conversation records: ${governanceSummary.scenariosWithReviewLevelConversationRecords}`);
  lines.push(`- pending wrapper proposals: ${governanceSummary.pendingWrapperProposals}`);
  lines.push(`- auto-capture warning scenarios: ${governanceSummary.autoCaptureWarningScenarios}`);
  lines.push(`- auto-capture attention scenarios: ${governanceSummary.autoCaptureAttentionScenarios}`);
  lines.push(`- auto-capture capture backlog: ${governanceSummary.autoCaptureCaptureBacklog}`);
  lines.push(`- auto-capture response backlog: ${governanceSummary.autoCaptureResponseBacklog}`);
  lines.push(`- auto-capture failed requests: ${governanceSummary.autoCaptureFailedRequests}`);
  lines.push(
    `- changed file count: ${report.summary.changedFileCount}`,
    `- affected domain count: ${report.summary.affectedDomainCount}`,
    `- affected skill count: ${report.summary.affectedSkillCount}`,
    renderConsumerSummary(report.consumerVerification),
    "",
    "## Artifacts",
    "",
    `- changed files: \`${report.changedFilesPath}\``,
    `- impact report: \`${report.impactReportPath}\``,
    `- upgrade risk report: \`${report.riskReportPath || ""}\``,
    `- upgrade risk markdown: \`${report.riskMarkdownPath || ""}\``,
    `- consumer compatibility matrix: \`${report.consumerCompatibilityMatrixPath || ""}\``,
    `- consumer compatibility markdown: \`${report.consumerCompatibilityMatrixMarkdownPath || ""}\``,
    `- release gate report: \`${releaseGateReport ? releaseGatePaths.jsonPath : ""}\``,
    `- release gate markdown: \`${releaseGateReport ? releaseGatePaths.markdownPath : ""}\``,
    `- governance operations report: \`${governanceOperations ? governanceOperationsPaths.jsonPath : ""}\``,
    `- governance operations markdown: \`${governanceOperations ? governanceOperationsPaths.markdownPath : ""}\``,
    `- upgrade advice package: \`${advicePackage ? advicePaths.jsonPath : ""}\``,
    `- upgrade advice markdown: \`${advicePackage ? advicePaths.markdownPath : ""}\``,
    `- impact task: \`${report.impactTaskPath}\``,
    `- automation report: \`${report.automationReportPath || ""}\``,
    ""
  );

  if (advicePackage) {
    lines.push("## Upgrade Advice", "");
    if ((advicePackage.consumerCommands || []).length === 0) {
      lines.push("- none");
    } else {
      for (const item of advicePackage.consumerCommands.slice(0, 5)) {
        lines.push(`- \`${item.command}\`: ${item.reason}`);
      }
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function updateVersionRecord(versionRecordPath, payload, jsonOutputPath, markdownOutputPath) {
  if (!fs.existsSync(versionRecordPath)) {
    return;
  }

  const versionRecord = readJson(versionRecordPath);
  writeJson(versionRecordPath, {
    ...versionRecord,
    recordedAt: new Date().toISOString(),
    artifacts: {
      ...(versionRecord.artifacts || {}),
      notificationJsonPath: jsonOutputPath,
      notificationMarkdownPath: markdownOutputPath
    },
    governanceSummary: {
      ...(versionRecord.governanceSummary || {}),
      releaseGateStatus: payload.governance?.releaseGateStatus || "unknown",
      warningGates: payload.governance?.releaseGateWarnings || 0,
      unresolvedProjectProfileDecisions: payload.governance?.unresolvedProjectProfileDecisions || 0,
      deferredProjectProfileDecisions: payload.governance?.deferredProjectProfileDecisions || 0,
      rejectedProjectProfileDecisions: payload.governance?.rejectedProjectProfileDecisions || 0,
      overdueGovernanceReviews: payload.governance?.overdueGovernanceReviews || 0,
      dueTodayGovernanceReviews: payload.governance?.dueTodayGovernanceReviews || 0,
      pendingConversationReviews: payload.governance?.pendingConversationReviews || 0,
      warningLevelConversationRecords: payload.governance?.warningLevelConversationRecords || 0,
      reviewLevelConversationRecords: payload.governance?.reviewLevelConversationRecords || 0,
      captureLevelConversationRecords: payload.governance?.captureLevelConversationRecords || 0,
      recordsWithGovernanceMetadata: payload.governance?.recordsWithGovernanceMetadata || 0,
      recordsWithAdmissionMetadata: payload.governance?.recordsWithAdmissionMetadata || 0,
      scenariosWithWarningLevelConversationRecords: payload.governance?.scenariosWithWarningLevelConversationRecords || 0,
      scenariosWithReviewLevelConversationRecords: payload.governance?.scenariosWithReviewLevelConversationRecords || 0,
      pendingWrapperProposals: payload.governance?.pendingWrapperProposals || 0,
      autoCaptureWarningScenarios: payload.governance?.autoCaptureWarningScenarios || 0,
      autoCaptureAttentionScenarios: payload.governance?.autoCaptureAttentionScenarios || 0,
      autoCaptureCaptureBacklog: payload.governance?.autoCaptureCaptureBacklog || 0,
      autoCaptureResponseBacklog: payload.governance?.autoCaptureResponseBacklog || 0,
      autoCaptureFailedRequests: payload.governance?.autoCaptureFailedRequests || 0,
      failedCompatibilityScenarios: payload.governanceOperations?.failedCompatibilityScenarios
        || versionRecord.governanceSummary?.failedCompatibilityScenarios
        || 0,
      consumerMatrixScenarioCount: payload.governanceOperations?.consumerMatrixScenarioCount
        || versionRecord.governanceSummary?.consumerMatrixScenarioCount
        || 0,
      matchedPromotionRelations: payload.governanceOperations?.matchedPromotionRelations
        || versionRecord.governanceSummary?.matchedPromotionRelations
        || 0,
      totalPromotionRelations: payload.governanceOperations?.totalPromotionRelations
        || versionRecord.governanceSummary?.totalPromotionRelations
        || 0,
      recentGovernanceActivityCount: payload.governanceOperations?.recentActivityCount
        || versionRecord.governanceSummary?.recentGovernanceActivityCount
        || 0
    }
  });
}

const args = parseArgs(process.argv.slice(2));
const automationReport = readJson(args.automationReportPath);
automationReport.automationReportPath = args.automationReportPath;

const advicePaths = buildAdvicePaths(args.automationReportPath);
const advicePackage = fs.existsSync(advicePaths.jsonPath) ? readJson(advicePaths.jsonPath) : null;
const releaseGatePaths = buildReleaseGatePaths(args.automationReportPath);
const releaseGateReport = fs.existsSync(releaseGatePaths.jsonPath) ? readJson(releaseGatePaths.jsonPath) : null;
const governanceOperationsPaths = buildGovernanceOperationsPaths(args.automationReportPath);
const governanceOperations = fs.existsSync(governanceOperationsPaths.jsonPath)
  ? readJson(governanceOperationsPaths.jsonPath)
  : null;
const governanceSummary = collectGovernanceSummary(advicePackage, releaseGateReport);
const versionRecordPath = path.join(path.dirname(args.automationReportPath), "version-record.json");
const outputDir = path.join(path.dirname(args.automationReportPath), "notifications");

ensureDir(outputDir);
const tag = getTimestampTag();
const jsonOutputPath = path.join(outputDir, `upgrade-payload-${tag}.json`);
const markdownOutputPath = path.join(outputDir, `upgrade-payload-${tag}.md`);

const payload = {
  title: `[${automationReport.packageName}] Upgrade automation report`,
  level: automationReport.summary.recommendedReleaseLevel,
  packageName: automationReport.packageName,
  version: automationReport.version,
  body: renderMarkdown(
    automationReport,
    advicePackage,
    advicePaths,
    releaseGateReport,
    releaseGatePaths,
    governanceSummary,
    governanceOperations,
    governanceOperationsPaths
  ),
  advice: advicePackage,
  governance: governanceSummary,
  governanceOperations: governanceOperations?.summary || null,
  links: {
    changedFilesPath: automationReport.changedFilesPath,
    impactReportPath: automationReport.impactReportPath,
    upgradeRiskReportPath: automationReport.riskReportPath || "",
    upgradeRiskMarkdownPath: automationReport.riskMarkdownPath || "",
    consumerCompatibilityMatrixPath: automationReport.consumerCompatibilityMatrixPath || "",
    consumerCompatibilityMatrixMarkdownPath: automationReport.consumerCompatibilityMatrixMarkdownPath || "",
    releaseGateReportPath: releaseGateReport ? releaseGatePaths.jsonPath : "",
    releaseGateMarkdownPath: releaseGateReport ? releaseGatePaths.markdownPath : "",
    governanceOperationsReportPath: governanceOperations ? governanceOperationsPaths.jsonPath : "",
    governanceOperationsMarkdownPath: governanceOperations ? governanceOperationsPaths.markdownPath : "",
    upgradeAdvicePackagePath: advicePackage ? advicePaths.jsonPath : "",
    upgradeAdvicePackageMarkdownPath: advicePackage ? advicePaths.markdownPath : "",
    impactTaskPath: automationReport.impactTaskPath,
    automationReportPath: args.automationReportPath
  }
};

writeJson(jsonOutputPath, payload);
fs.writeFileSync(markdownOutputPath, payload.body, "utf8");
updateVersionRecord(versionRecordPath, payload, jsonOutputPath, markdownOutputPath);

console.log(JSON.stringify({
  packageName: automationReport.packageName,
  version: automationReport.version,
  jsonOutputPath,
  markdownOutputPath
}, null, 2));
