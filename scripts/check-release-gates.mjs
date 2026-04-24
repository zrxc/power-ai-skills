import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRuntimeContext } from "../src/context.mjs";
import {
  buildReleaseGateMarkdown,
  buildReleaseGateReport,
  collectWrapperRegistryGovernance
} from "../src/release-gates/index.mjs";
import { validateTeamPolicyConfig } from "../src/team-policy/index.mjs";
import { ensureDir, readJson, safeTrim, writeJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = createRuntimeContext(import.meta.url);
const packageJson = readJson(path.join(root, "package.json"));
const defaultManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(root, "manifest"));
const defaultOutputPath = path.join(defaultManifestDir, "release-gate-report.json");
const defaultMarkdownPath = path.join(defaultManifestDir, "release-gate-report.md");
const defaultMatrixPath = path.join(defaultManifestDir, "consumer-compatibility-matrix.json");
const defaultVersionRecordPath = path.join(defaultManifestDir, "version-record.json");
const consistencyScriptPath = path.join(root, "scripts", "check-release-consistency.mjs");

function printUsageAndExit() {
  console.log("用法：node ./scripts/check-release-gates.mjs [--project-root <path>] [--output <path>] [--markdown <path>]");
  console.log("可选参数：--require-consumer-matrix --stale-days <number>");
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
  const staleDaysValue = Number(getValue("--stale-days", "14"));
  const requireConsumerMatrixFlag = argv.includes("--require-consumer-matrix");

  return {
    projectRoot: path.resolve(getValue("--project-root", root)),
    outputPath: path.resolve(getValue("--output", defaultOutputPath)),
    markdownPath: path.resolve(getValue("--markdown", defaultMarkdownPath)),
    requireConsumerMatrix: requireConsumerMatrixFlag || Boolean(context.teamPolicy.releasePolicies?.enforceConsumerMatrix),
    staleDays: Number.isFinite(staleDaysValue) && staleDaysValue >= 0 ? staleDaysValue : 14
  };
}

function runConsistencyCheck({ requireConsumerMatrix }) {
  const args = [
    consistencyScriptPath,
    "--require-release-notes",
    "--require-impact-report",
    "--require-risk-report",
    "--require-automation-report",
    "--require-notification-payload"
  ];

  if (requireConsumerMatrix) {
    args.push("--require-consumer-matrix");
  }

  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      POWER_AI_RELEASE_MANIFEST_DIR: defaultManifestDir
    }
  });

  return {
    ok: result.status === 0,
    exitCode: result.status || 0,
    stdout: safeTrim(result.stdout),
    stderr: safeTrim(result.stderr)
  };
}

function updateVersionRecord(report, outputPath, markdownPath) {
  if (!fs.existsSync(defaultVersionRecordPath)) {
    return;
  }

  const versionRecord = readJson(defaultVersionRecordPath);
  writeJson(defaultVersionRecordPath, {
    ...versionRecord,
    recordedAt: new Date().toISOString(),
    artifacts: {
      ...(versionRecord.artifacts || {}),
      releaseGateReportPath: outputPath,
      releaseGateMarkdownPath: markdownPath
    },
    governanceSummary: {
      ...(versionRecord.governanceSummary || {}),
      releaseGateStatus: report.overallStatus,
      warningGates: report.summary.warningGates || 0,
      unresolvedProjectProfileDecisions: report.governance?.unresolvedProjectProfileDecisions || 0,
      deferredProjectProfileDecisions: report.governance?.deferredProjectProfileDecisions || 0,
      rejectedProjectProfileDecisions: report.governance?.rejectedProjectProfileDecisions || 0,
      overdueGovernanceReviews: report.governance?.overdueGovernanceReviews || 0,
      dueTodayGovernanceReviews: report.governance?.dueTodayGovernanceReviews || 0,
      pendingConversationReviews: report.governance?.pendingConversationReviews || 0,
      warningLevelConversationRecords: report.governance?.warningLevelConversationRecords || 0,
      pendingWrapperProposals: report.governance?.pendingWrapperProposals || 0,
      recordsWithGovernanceMetadata: report.governance?.recordsWithGovernanceMetadata || 0,
      scenariosWithWarningLevelConversationRecords: report.governance?.scenariosWithWarningLevelConversationRecords || 0,
      reviewLevelConversationRecords: report.governance?.reviewLevelConversationRecords || 0,
      captureLevelConversationRecords: report.governance?.captureLevelConversationRecords || 0,
      recordsWithAdmissionMetadata: report.governance?.recordsWithAdmissionMetadata || 0,
      scenariosWithReviewLevelConversationRecords: report.governance?.scenariosWithReviewLevelConversationRecords || 0,
      autoCaptureWarningScenarios: report.governance?.autoCaptureWarningScenarios || 0,
      autoCaptureAttentionScenarios: report.governance?.autoCaptureAttentionScenarios || 0,
      autoCaptureCaptureBacklog: report.governance?.autoCaptureCaptureBacklog || 0,
      autoCaptureResponseBacklog: report.governance?.autoCaptureResponseBacklog || 0,
      autoCaptureFailedRequests: report.governance?.autoCaptureFailedRequests || 0
    }
  });
}

const args = parseArgs(process.argv.slice(2));
const matrix = fs.existsSync(defaultMatrixPath) ? readJson(defaultMatrixPath) : null;
const consistency = runConsistencyCheck({ requireConsumerMatrix: args.requireConsumerMatrix });
const wrapperGovernance = collectWrapperRegistryGovernance({
  projectRoot: args.projectRoot,
  staleDays: args.staleDays
});
const teamPolicyValidation = validateTeamPolicyConfig({
  context,
  projectRoot: args.projectRoot
});
const report = buildReleaseGateReport({
  packageName: packageJson.name,
  version: packageJson.version,
  generatedAt: new Date().toISOString(),
  consistency,
  wrapperGovernance,
  compatibilityMatrix: matrix,
  teamPolicyValidation,
  teamPolicyReleasePolicies: context.teamPolicy.releasePolicies || null,
  requireConsumerMatrix: args.requireConsumerMatrix
});

ensureDir(path.dirname(args.outputPath));
writeJson(args.outputPath, report);
fs.writeFileSync(args.markdownPath, buildReleaseGateMarkdown(report), "utf8");
updateVersionRecord(report, args.outputPath, args.markdownPath);

  console.log(JSON.stringify({
  packageName: report.packageName,
  version: report.version,
  overallStatus: report.overallStatus,
  outputPath: args.outputPath,
  markdownPath: args.markdownPath,
  warningGates: report.summary.warningGates || 0,
  failedGates: report.summary.failedGates,
  teamPolicyErrorCount: report.summary.teamPolicyErrorCount,
  readyForRegistration: report.summary.readyForRegistration,
  pendingFollowUps: report.summary.pendingFollowUps,
  stalledProposalCount: report.summary.stalledProposalCount,
  failedCompatibilityScenarios: report.summary.failedCompatibilityScenarios,
    unresolvedProjectProfileDecisions: report.summary.unresolvedProjectProfileDecisions || 0,
    overdueGovernanceReviews: report.summary.overdueGovernanceReviews || 0,
    pendingConversationReviews: report.summary.pendingConversationReviews || 0,
    warningLevelConversationRecords: report.summary.warningLevelConversationRecords || 0,
    reviewLevelConversationRecords: report.summary.reviewLevelConversationRecords || 0,
    autoCaptureWarningScenarios: report.summary.autoCaptureWarningScenarios || 0,
    autoCaptureAttentionScenarios: report.summary.autoCaptureAttentionScenarios || 0,
    autoCaptureFailedRequests: report.summary.autoCaptureFailedRequests || 0
}, null, 2));

if (report.overallStatus === "fail") {
  process.exit(1);
}
