import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, readJson, writeJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(root, "manifest"));
const defaultAutomationReportPath = path.join(defaultManifestDir, "automation-report.json");
const defaultOutputPath = path.join(defaultManifestDir, "governance-operations-report.json");
const defaultMarkdownPath = path.join(defaultManifestDir, "governance-operations-report.md");
const defaultVersionRecordPath = path.join(defaultManifestDir, "version-record.json");

function printUsageAndExit() {
  console.log("Usage: node ./scripts/generate-governance-operations-report.mjs [--automation-report manifest/automation-report.json]");
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
    console.error(`[generate-governance-operations-report] automation report not found: ${automationReportPath}`);
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

function createActivity(id, type, generatedAt, summary, details = {}) {
  return { id, type, generatedAt: generatedAt || "", summary, details };
}

function buildRecentActivities({
  automationReport,
  releaseGateReport,
  advicePackage,
  compatibilityMatrix,
  promotionTraceReport,
  versionRecord
}) {
  const activities = [
    createActivity(
      "upgrade-automation",
      "automation",
      automationReport?.generatedAt || versionRecord?.recordedAt || "",
      `Release automation summarized ${automationReport?.summary?.changedFileCount || 0} changed file(s), ${automationReport?.summary?.affectedDomainCount || 0} affected domain(s), and recommended a ${automationReport?.summary?.recommendedReleaseLevel || "unknown"} release.`,
      {
        changedFileCount: automationReport?.summary?.changedFileCount || 0,
        affectedDomainCount: automationReport?.summary?.affectedDomainCount || 0,
        affectedSkillCount: automationReport?.summary?.affectedSkillCount || 0,
        overallRiskLevel: automationReport?.summary?.overallRiskLevel || "unknown"
      }
    )
  ];

  if (compatibilityMatrix) {
    activities.push(createActivity(
      "consumer-compatibility",
      "consumer-compatibility",
      compatibilityMatrix.generatedAt || "",
      `Consumer compatibility matrix covered ${compatibilityMatrix.summary?.totalScenarios || 0} scenario(s) with ${compatibilityMatrix.summary?.failedScenarios || 0} failure(s).`,
      {
        totalScenarios: compatibilityMatrix.summary?.totalScenarios || 0,
        passedScenarios: compatibilityMatrix.summary?.passedScenarios || 0,
        failedScenarios: compatibilityMatrix.summary?.failedScenarios || 0
      }
    ));
  }

  if (releaseGateReport) {
    activities.push(createActivity(
      "release-gates",
      "release-gates",
      releaseGateReport.generatedAt || "",
      `Release gates finished with status ${releaseGateReport.overallStatus || "unknown"} (${releaseGateReport.summary?.failedGates || 0} blocking, ${releaseGateReport.summary?.warningGates || 0} warning).`,
      {
        overallStatus: releaseGateReport.overallStatus || "unknown",
        failedGates: releaseGateReport.summary?.failedGates || 0,
        warningGates: releaseGateReport.summary?.warningGates || 0,
        totalGates: releaseGateReport.summary?.totalGates || 0
      }
    ));
  }

  if (advicePackage) {
    activities.push(createActivity(
      "upgrade-advice",
      "upgrade-advice",
      advicePackage.generatedAt || "",
      `Upgrade advice prepared ${advicePackage.summary?.consumerCommandCount || 0} consumer command(s), ${advicePackage.summary?.maintainerCommandCount || 0} maintainer command(s), and ${advicePackage.summary?.manualCheckCount || 0} manual check(s).`,
      {
        consumerCommandCount: advicePackage.summary?.consumerCommandCount || 0,
        maintainerCommandCount: advicePackage.summary?.maintainerCommandCount || 0,
        manualCheckCount: advicePackage.summary?.manualCheckCount || 0,
        blockingCheckCount: advicePackage.summary?.blockingCheckCount || 0
      }
    ));
  }

  if (promotionTraceReport) {
    activities.push(createActivity(
      "promotion-trace",
      "promotion-trace",
      promotionTraceReport.generatedAt || "",
      `Promotion trace matched ${promotionTraceReport.summary?.matchedRelations || 0} relation(s) from ${promotionTraceReport.summary?.totalRelations || 0} tracked relation(s).`,
      {
        matchedRelations: promotionTraceReport.summary?.matchedRelations || 0,
        totalRelations: promotionTraceReport.summary?.totalRelations || 0,
        changedFileCount: promotionTraceReport.summary?.changedFileCount || 0
      }
    ));
  }

  if (versionRecord?.recordedAt) {
    activities.push(createActivity(
      "version-record",
      "version-record",
      versionRecord.recordedAt,
      `Version record last updated for ${versionRecord.packageName || ""}@${versionRecord.version || ""}.`,
      {
        version: versionRecord.version || "",
        recordedAt: versionRecord.recordedAt
      }
    ));
  }

  return activities
    .filter((item) => item.summary)
    .sort((left, right) => Date.parse(right.generatedAt || 0) - Date.parse(left.generatedAt || 0));
}

function buildPayload({
  automationReport,
  releaseGateReport,
  advicePackage,
  compatibilityMatrix,
  promotionTraceReport,
  versionRecord,
  artifactPaths
}) {
  const summary = {
    releaseGateStatus: releaseGateReport?.overallStatus || versionRecord?.governanceSummary?.releaseGateStatus || "unknown",
    releaseGateWarnings: releaseGateReport?.summary?.warningGates || advicePackage?.summary?.releaseGateWarnings || 0,
    blockingIssues: releaseGateReport?.summary?.blockingIssues || 0,
    failedCompatibilityScenarios: compatibilityMatrix?.summary?.failedScenarios || 0,
    consumerMatrixScenarioCount: compatibilityMatrix?.summary?.totalScenarios || 0,
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
    reviewLevelConversationRecords: advicePackage?.summary?.reviewLevelConversationRecords
      || releaseGateReport?.governance?.reviewLevelConversationRecords
      || 0,
    captureLevelConversationRecords: advicePackage?.summary?.captureLevelConversationRecords
      || releaseGateReport?.governance?.captureLevelConversationRecords
      || 0,
    recordsWithAdmissionMetadata: releaseGateReport?.governance?.recordsWithAdmissionMetadata || 0,
    scenariosWithReviewLevelConversationRecords: advicePackage?.summary?.scenariosWithReviewLevelConversationRecords
      || releaseGateReport?.governance?.scenariosWithReviewLevelConversationRecords
      || 0,
    pendingWrapperProposals: advicePackage?.summary?.pendingWrapperProposals
      || releaseGateReport?.governance?.pendingWrapperProposals
      || 0,
    staleEvolutionProposalReviews: releaseGateReport?.governance?.staleEvolutionProposalReviews || 0,
    staleAcceptedEvolutionProposals: releaseGateReport?.governance?.staleAcceptedEvolutionProposals || 0,
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
      || 0,
    readyForRegistration: releaseGateReport?.summary?.readyForRegistration || 0,
    pendingFollowUps: releaseGateReport?.summary?.pendingFollowUps || 0,
    stalledProposalCount: releaseGateReport?.summary?.stalledProposalCount || 0,
    matchedPromotionRelations: promotionTraceReport?.summary?.matchedRelations || 0,
    totalPromotionRelations: promotionTraceReport?.summary?.totalRelations || 0,
    manualCheckCount: advicePackage?.summary?.manualCheckCount || 0,
    blockingCheckCount: advicePackage?.summary?.blockingCheckCount || 0,
    recentActivityCount: 0
  };

  const recentActivities = buildRecentActivities({
    automationReport,
    releaseGateReport,
    advicePackage,
    compatibilityMatrix,
    promotionTraceReport,
    versionRecord
  });
  summary.recentActivityCount = recentActivities.length;

  const recommendedActions = [
    ...(releaseGateReport?.recommendedActions || []),
    ...((advicePackage?.manualChecks || []).filter((item) => item.blocking).map((item) => item.detail)),
    ...((advicePackage?.notices || []).filter((item) => item.includes("Governance")))
  ].filter(Boolean);

  return {
    packageName: automationReport.packageName,
    version: automationReport.version,
    generatedAt: new Date().toISOString(),
    summary,
    backlog: {
      unresolvedProjectProfileDecisions: summary.unresolvedProjectProfileDecisions,
      deferredProjectProfileDecisions: summary.deferredProjectProfileDecisions,
      rejectedProjectProfileDecisions: summary.rejectedProjectProfileDecisions,
      overdueGovernanceReviews: summary.overdueGovernanceReviews,
      dueTodayGovernanceReviews: summary.dueTodayGovernanceReviews,
      pendingConversationReviews: summary.pendingConversationReviews,
      reviewLevelConversationRecords: summary.reviewLevelConversationRecords,
      captureLevelConversationRecords: summary.captureLevelConversationRecords,
      recordsWithAdmissionMetadata: summary.recordsWithAdmissionMetadata,
      scenariosWithReviewLevelConversationRecords: summary.scenariosWithReviewLevelConversationRecords,
      pendingWrapperProposals: summary.pendingWrapperProposals,
      staleEvolutionProposalReviews: summary.staleEvolutionProposalReviews,
      staleAcceptedEvolutionProposals: summary.staleAcceptedEvolutionProposals,
      autoCaptureWarningScenarios: summary.autoCaptureWarningScenarios,
      autoCaptureAttentionScenarios: summary.autoCaptureAttentionScenarios,
      autoCaptureCaptureBacklog: summary.autoCaptureCaptureBacklog,
      autoCaptureResponseBacklog: summary.autoCaptureResponseBacklog,
      autoCaptureFailedRequests: summary.autoCaptureFailedRequests,
      readyForRegistration: summary.readyForRegistration,
      pendingFollowUps: summary.pendingFollowUps,
      stalledProposalCount: summary.stalledProposalCount
    },
    releaseReadiness: {
      releaseGateStatus: summary.releaseGateStatus,
      blockingIssues: summary.blockingIssues,
      warningGates: summary.releaseGateWarnings,
      canPublish: summary.releaseGateStatus !== "fail",
      broadRolloutReady: summary.releaseGateStatus === "pass"
        && summary.unresolvedProjectProfileDecisions === 0
        && summary.pendingConversationReviews === 0
        && summary.reviewLevelConversationRecords === 0
        && summary.overdueGovernanceReviews === 0
        && summary.staleEvolutionProposalReviews === 0
        && summary.staleAcceptedEvolutionProposals === 0
        && summary.autoCaptureAttentionScenarios === 0
        && summary.autoCaptureFailedRequests === 0
        && summary.autoCaptureCaptureBacklog === 0
        && summary.autoCaptureResponseBacklog === 0
        && summary.pendingWrapperProposals === 0,
      requiresExplicitAcknowledgement: summary.releaseGateWarnings > 0
        || summary.deferredProjectProfileDecisions > 0
        || summary.rejectedProjectProfileDecisions > 0
        || summary.dueTodayGovernanceReviews > 0
        || summary.reviewLevelConversationRecords > 0
        || summary.staleEvolutionProposalReviews > 0
        || summary.staleAcceptedEvolutionProposals > 0
        || summary.autoCaptureWarningScenarios > 0
    },
    recentActivities,
    artifacts: artifactPaths,
    recommendedActions: [...new Set(recommendedActions)]
  };
}

function buildMarkdown(payload) {
  const lines = [
    "# Governance Operations Report",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- generatedAt: \`${payload.generatedAt}\``,
    `- release gate status: \`${payload.summary.releaseGateStatus}\``,
    `- release gate warnings: ${payload.summary.releaseGateWarnings}`,
    `- blocking issues: ${payload.summary.blockingIssues}`,
    `- consumer matrix scenarios: ${payload.summary.consumerMatrixScenarioCount}`,
    `- failed compatibility scenarios: ${payload.summary.failedCompatibilityScenarios}`,
    `- unresolved project profile decisions: ${payload.summary.unresolvedProjectProfileDecisions}`,
    `- deferred project profile decisions: ${payload.summary.deferredProjectProfileDecisions}`,
    `- rejected project profile decisions: ${payload.summary.rejectedProjectProfileDecisions}`,
    `- overdue governance reviews: ${payload.summary.overdueGovernanceReviews}`,
    `- due today governance reviews: ${payload.summary.dueTodayGovernanceReviews}`,
    `- pending conversation reviews: ${payload.summary.pendingConversationReviews}`,
    `- review-level conversation records: ${payload.summary.reviewLevelConversationRecords}`,
    `- capture-level conversation records: ${payload.summary.captureLevelConversationRecords}`,
    `- records with admission metadata: ${payload.summary.recordsWithAdmissionMetadata}`,
    `- scenarios with review-level conversation records: ${payload.summary.scenariosWithReviewLevelConversationRecords}`,
    `- pending wrapper proposals: ${payload.summary.pendingWrapperProposals}`,
    `- stale evolution proposal reviews: ${payload.summary.staleEvolutionProposalReviews}`,
    `- stale accepted evolution proposals: ${payload.summary.staleAcceptedEvolutionProposals}`,
    `- auto-capture warning scenarios: ${payload.summary.autoCaptureWarningScenarios}`,
    `- auto-capture attention scenarios: ${payload.summary.autoCaptureAttentionScenarios}`,
    `- auto-capture capture backlog: ${payload.summary.autoCaptureCaptureBacklog}`,
    `- auto-capture response backlog: ${payload.summary.autoCaptureResponseBacklog}`,
    `- auto-capture failed requests: ${payload.summary.autoCaptureFailedRequests}`,
    `- matched promotion relations: ${payload.summary.matchedPromotionRelations}/${payload.summary.totalPromotionRelations}`,
    "",
    "## Release Readiness",
    "",
    `- can publish: ${payload.releaseReadiness.canPublish}`,
    `- broad rollout ready: ${payload.releaseReadiness.broadRolloutReady}`,
    `- requires explicit acknowledgement: ${payload.releaseReadiness.requiresExplicitAcknowledgement}`,
    "",
    "## Governance Backlog",
    "",
    `- ready for registration: ${payload.backlog.readyForRegistration}`,
    `- pending follow-ups: ${payload.backlog.pendingFollowUps}`,
    `- stalled proposals: ${payload.backlog.stalledProposalCount}`,
    `- pending conversation reviews: ${payload.backlog.pendingConversationReviews}`,
    `- review-level conversation records: ${payload.backlog.reviewLevelConversationRecords}`,
    `- overdue reviews: ${payload.backlog.overdueGovernanceReviews}`,
    `- stale evolution proposal reviews: ${payload.backlog.staleEvolutionProposalReviews}`,
    `- stale accepted evolution proposals: ${payload.backlog.staleAcceptedEvolutionProposals}`,
    `- auto-capture warning scenarios: ${payload.backlog.autoCaptureWarningScenarios}`,
    `- auto-capture attention scenarios: ${payload.backlog.autoCaptureAttentionScenarios}`,
    `- auto-capture capture backlog: ${payload.backlog.autoCaptureCaptureBacklog}`,
    `- auto-capture response backlog: ${payload.backlog.autoCaptureResponseBacklog}`,
    `- auto-capture failed requests: ${payload.backlog.autoCaptureFailedRequests}`,
    "",
    "## Recent Activities",
    ""
  ];

  if (payload.recentActivities.length === 0) {
    lines.push("- none");
  } else {
    for (const item of payload.recentActivities) {
      lines.push(`- [${item.type}] ${item.summary}${item.generatedAt ? ` (\`${item.generatedAt}\`)` : ""}`);
    }
  }

  lines.push("", "## Artifacts", "");
  for (const [key, value] of Object.entries(payload.artifacts || {})) {
    lines.push(`- ${key}: \`${value || ""}\``);
  }

  lines.push("", "## Recommended Actions", "");
  if (payload.recommendedActions.length === 0) {
    lines.push("- none");
  } else {
    for (const item of payload.recommendedActions) {
      lines.push(`- ${item}`);
    }
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function updateVersionRecord(payload, outputPath, markdownPath) {
  if (!fs.existsSync(defaultVersionRecordPath)) {
    return;
  }

  const versionRecord = readJson(defaultVersionRecordPath);
  writeJson(defaultVersionRecordPath, {
    ...versionRecord,
    recordedAt: new Date().toISOString(),
    artifacts: {
      ...(versionRecord.artifacts || {}),
      governanceOperationsReportPath: outputPath,
      governanceOperationsMarkdownPath: markdownPath
    },
    governanceSummary: {
      ...(versionRecord.governanceSummary || {}),
      releaseGateStatus: payload.summary.releaseGateStatus,
      warningGates: payload.summary.releaseGateWarnings,
      unresolvedProjectProfileDecisions: payload.summary.unresolvedProjectProfileDecisions,
      deferredProjectProfileDecisions: payload.summary.deferredProjectProfileDecisions,
      rejectedProjectProfileDecisions: payload.summary.rejectedProjectProfileDecisions,
      overdueGovernanceReviews: payload.summary.overdueGovernanceReviews,
      dueTodayGovernanceReviews: payload.summary.dueTodayGovernanceReviews,
      pendingConversationReviews: payload.summary.pendingConversationReviews,
      reviewLevelConversationRecords: payload.summary.reviewLevelConversationRecords,
      captureLevelConversationRecords: payload.summary.captureLevelConversationRecords,
      recordsWithAdmissionMetadata: payload.summary.recordsWithAdmissionMetadata,
      scenariosWithReviewLevelConversationRecords: payload.summary.scenariosWithReviewLevelConversationRecords,
      pendingWrapperProposals: payload.summary.pendingWrapperProposals,
      autoCaptureWarningScenarios: payload.summary.autoCaptureWarningScenarios,
      autoCaptureAttentionScenarios: payload.summary.autoCaptureAttentionScenarios,
      autoCaptureCaptureBacklog: payload.summary.autoCaptureCaptureBacklog,
      autoCaptureResponseBacklog: payload.summary.autoCaptureResponseBacklog,
      autoCaptureFailedRequests: payload.summary.autoCaptureFailedRequests,
      failedCompatibilityScenarios: payload.summary.failedCompatibilityScenarios,
      consumerMatrixScenarioCount: payload.summary.consumerMatrixScenarioCount,
      matchedPromotionRelations: payload.summary.matchedPromotionRelations,
      totalPromotionRelations: payload.summary.totalPromotionRelations,
      recentGovernanceActivityCount: payload.summary.recentActivityCount
    }
  });
}

const args = parseArgs(process.argv.slice(2));
const manifestDir = path.dirname(args.automationReportPath);
const automationReport = readJson(args.automationReportPath);
const releaseGateReport = readOptionalJson(path.join(manifestDir, "release-gate-report.json"));
const advicePackage = readOptionalJson(path.join(manifestDir, "upgrade-advice-package.json"));
const compatibilityMatrix = readOptionalJson(path.join(manifestDir, "consumer-compatibility-matrix.json"));
const promotionTraceReport = readOptionalJson(path.join(manifestDir, "promotion-trace-report.json"));
const versionRecord = readOptionalJson(defaultVersionRecordPath);

const payload = buildPayload({
  automationReport,
  releaseGateReport,
  advicePackage,
  compatibilityMatrix,
  promotionTraceReport,
  versionRecord,
  artifactPaths: {
    automationReportPath: args.automationReportPath,
    releaseGateReportPath: path.join(manifestDir, "release-gate-report.json"),
    upgradeAdvicePackagePath: path.join(manifestDir, "upgrade-advice-package.json"),
    consumerCompatibilityMatrixPath: path.join(manifestDir, "consumer-compatibility-matrix.json"),
    promotionTraceReportPath: path.join(manifestDir, "promotion-trace-report.json"),
    versionRecordPath: defaultVersionRecordPath
  }
});

ensureDir(path.dirname(args.outputPath));
writeJson(args.outputPath, payload);
fs.writeFileSync(args.markdownPath, buildMarkdown(payload), "utf8");
updateVersionRecord(payload, args.outputPath, args.markdownPath);

console.log(JSON.stringify({
  packageName: payload.packageName,
  version: payload.version,
  outputPath: args.outputPath,
  markdownPath: args.markdownPath,
  releaseGateStatus: payload.summary.releaseGateStatus,
  recentActivityCount: payload.summary.recentActivityCount
}, null, 2));
