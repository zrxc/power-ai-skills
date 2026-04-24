import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntimeContext } from "../src/context.mjs";
import {
  buildUpgradeAdviceMarkdown,
  buildUpgradeAdvicePackage
} from "../src/upgrade-advice/index.mjs";
import { ensureDir, readJson, writeJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = createRuntimeContext(import.meta.url);
const defaultManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(root, "manifest"));
const defaultAutomationReportPath = path.join(defaultManifestDir, "automation-report.json");
const defaultOutputPath = path.join(defaultManifestDir, "upgrade-advice-package.json");
const defaultMarkdownPath = path.join(defaultManifestDir, "upgrade-advice-package.md");
const defaultVersionRecordPath = path.join(defaultManifestDir, "version-record.json");

function printUsageAndExit() {
  console.log("用法：node ./scripts/generate-upgrade-advice-package.mjs [--automation-report manifest/automation-report.json]");
  process.exit(0);
}

function parseArgs(argv) {
  if (argv.includes("--help")) {
    printUsageAndExit();
  }

  const getValue = (flagName, fallback = "") => {
    const index = argv.indexOf(flagName);
    return index === -1 ? fallback : argv[index + 1] || fallback;
  };

  const automationReportPath = path.resolve(getValue("--automation-report", defaultAutomationReportPath));
  if (!fs.existsSync(automationReportPath)) {
    console.error(`[generate-upgrade-advice-package] automation report not found: ${automationReportPath}`);
    process.exit(1);
  }

  return {
    automationReportPath,
    outputPath: path.resolve(getValue("--output", defaultOutputPath)),
    markdownPath: path.resolve(getValue("--markdown", defaultMarkdownPath))
  };
}

function readOptionalJson(filePath) {
  return filePath && fs.existsSync(filePath) ? readJson(filePath) : null;
}

function updateVersionRecord(payload, outputPath, markdownPath, releaseGateReport) {
  if (!fs.existsSync(defaultVersionRecordPath)) {
    return;
  }

  const versionRecord = readJson(defaultVersionRecordPath);
  writeJson(defaultVersionRecordPath, {
    ...versionRecord,
    recordedAt: new Date().toISOString(),
    artifacts: {
      ...(versionRecord.artifacts || {}),
      upgradeAdvicePackagePath: outputPath,
      upgradeAdvicePackageMarkdownPath: markdownPath
    },
    governanceSummary: {
      ...(versionRecord.governanceSummary || {}),
      releaseGateStatus: releaseGateReport?.overallStatus || versionRecord.governanceSummary?.releaseGateStatus || "unknown",
      warningGates: releaseGateReport?.summary?.warningGates || versionRecord.governanceSummary?.warningGates || 0,
      unresolvedProjectProfileDecisions: payload.summary?.unresolvedProjectProfileDecisions || 0,
      deferredProjectProfileDecisions: payload.summary?.deferredProjectProfileDecisions || 0,
      rejectedProjectProfileDecisions: payload.summary?.rejectedProjectProfileDecisions || 0,
      overdueGovernanceReviews: payload.summary?.overdueGovernanceReviews || 0,
      dueTodayGovernanceReviews: payload.summary?.dueTodayGovernanceReviews || 0,
      pendingConversationReviews: payload.summary?.pendingConversationReviews || 0,
      warningLevelConversationRecords: payload.summary?.warningLevelConversationRecords || 0,
      reviewLevelConversationRecords: payload.summary?.reviewLevelConversationRecords || 0,
      captureLevelConversationRecords: payload.summary?.captureLevelConversationRecords || 0,
      scenariosWithWarningLevelConversationRecords: payload.summary?.scenariosWithWarningLevelConversationRecords || 0,
      scenariosWithReviewLevelConversationRecords: payload.summary?.scenariosWithReviewLevelConversationRecords || 0,
      recordsWithGovernanceMetadata: versionRecord.governanceSummary?.recordsWithGovernanceMetadata || 0,
      recordsWithAdmissionMetadata: versionRecord.governanceSummary?.recordsWithAdmissionMetadata || 0,
      pendingWrapperProposals: payload.summary?.pendingWrapperProposals || 0,
      autoCaptureWarningScenarios: payload.summary?.autoCaptureWarningScenarios || 0,
      autoCaptureAttentionScenarios: payload.summary?.autoCaptureAttentionScenarios || 0,
      autoCaptureCaptureBacklog: payload.summary?.autoCaptureCaptureBacklog || 0,
      autoCaptureResponseBacklog: payload.summary?.autoCaptureResponseBacklog || 0,
      autoCaptureFailedRequests: payload.summary?.autoCaptureFailedRequests || 0,
      failedCompatibilityScenarios: versionRecord.governanceSummary?.failedCompatibilityScenarios || 0,
      consumerMatrixScenarioCount: versionRecord.governanceSummary?.consumerMatrixScenarioCount || 0,
      matchedPromotionRelations: versionRecord.governanceSummary?.matchedPromotionRelations || 0,
      totalPromotionRelations: versionRecord.governanceSummary?.totalPromotionRelations || 0,
      recentGovernanceActivityCount: versionRecord.governanceSummary?.recentGovernanceActivityCount || 0
    }
  });
}

const args = parseArgs(process.argv.slice(2));
const automationReport = readJson(args.automationReportPath);
const impactReport = readOptionalJson(automationReport.impactReportPath);
const riskReport = readOptionalJson(automationReport.riskReportPath);
const releaseGateReport = readOptionalJson(path.join(path.dirname(args.automationReportPath), "release-gate-report.json"));
const compatibilityMatrix = readOptionalJson(automationReport.consumerCompatibilityMatrixPath);

const payload = buildUpgradeAdvicePackage({
  packageName: automationReport.packageName,
  version: automationReport.version,
  generatedAt: new Date().toISOString(),
  automationReport,
  impactReport,
  riskReport,
  releaseGateReport,
  compatibilityMatrix,
  teamPolicy: context.teamPolicy,
  impactTaskPath: automationReport.impactTaskPath || ""
});

ensureDir(path.dirname(args.outputPath));
writeJson(args.outputPath, payload);
fs.writeFileSync(args.markdownPath, buildUpgradeAdviceMarkdown(payload), "utf8");
updateVersionRecord(payload, args.outputPath, args.markdownPath, releaseGateReport);

console.log(JSON.stringify({
  packageName: payload.packageName,
  version: payload.version,
  outputPath: args.outputPath,
  markdownPath: args.markdownPath,
  blocked: payload.blocked,
  consumerCommandCount: payload.summary.consumerCommandCount,
  maintainerCommandCount: payload.summary.maintainerCommandCount
}, null, 2));
