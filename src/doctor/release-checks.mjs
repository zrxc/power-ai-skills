import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readJson, safeTrim } from "../../scripts/shared.mjs";

export function shouldCollectReleaseChecks({ context, projectRoot }) {
  return projectRoot === context.packageRoot || Boolean(process.env.POWER_AI_RELEASE_MANIFEST_DIR);
}

export function collectReleaseArtifactChecks({ context, releaseManifestDir, createCheck }) {
  const versionRecordPath = path.join(releaseManifestDir, "version-record.json");
  const impactReportPath = path.join(releaseManifestDir, "impact-report.json");
  const upgradeRiskReportPath = path.join(releaseManifestDir, "upgrade-risk-report.json");
  const automationReportPath = path.join(releaseManifestDir, "automation-report.json");
  const releaseGateReportPath = path.join(releaseManifestDir, "release-gate-report.json");
  const upgradeAdvicePackagePath = path.join(releaseManifestDir, "upgrade-advice-package.json");
  const releaseNotesPath = path.join(releaseManifestDir, `release-notes-${context.packageJson.version}.md`);

  const versionRecord = fs.existsSync(versionRecordPath) ? readJson(versionRecordPath) : null;
  const releaseGateReport = fs.existsSync(releaseGateReportPath) ? readJson(releaseGateReportPath) : null;
  const notificationJsonPath = versionRecord?.artifacts?.notificationJsonPath || "";
  const notificationMarkdownPath = versionRecord?.artifacts?.notificationMarkdownPath || "";
  const recordedNotificationOk = Boolean(notificationJsonPath)
    && Boolean(notificationMarkdownPath)
    && fs.existsSync(notificationJsonPath)
    && fs.existsSync(notificationMarkdownPath);
  const governanceSummary = versionRecord?.governanceSummary || null;

  const consistencyScriptPath = path.join(context.packageRoot, "scripts", "check-release-consistency.mjs");
  const releaseGateScriptPath = path.join(context.packageRoot, "scripts", "check-release-gates.mjs");
  const consistencyResult = spawnSync(
    process.execPath,
    [
      consistencyScriptPath,
      "--require-release-notes",
      "--require-impact-report",
      "--require-risk-report",
      "--require-automation-report",
      "--require-notification-payload"
    ],
    {
      cwd: context.packageRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        POWER_AI_RELEASE_MANIFEST_DIR: releaseManifestDir
      }
    }
  );
  const releaseGateResult = spawnSync(
    process.execPath,
    [
      releaseGateScriptPath,
      "--project-root",
      context.packageRoot
    ],
    {
      cwd: context.packageRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        POWER_AI_RELEASE_MANIFEST_DIR: releaseManifestDir
      }
    }
  );

  return [
    createCheck(
      "PAI-RELEASE-001",
      "version record exists",
      fs.existsSync(versionRecordPath),
      { relativePath: path.relative(context.packageRoot, versionRecordPath) },
      "release",
      "Run `pnpm refresh:release-artifacts` to regenerate the release version record."
    ),
    createCheck(
      "PAI-RELEASE-002",
      "current release notes exist",
      fs.existsSync(releaseNotesPath),
      { relativePath: path.relative(context.packageRoot, releaseNotesPath) },
      "release",
      "Run `pnpm refresh:release-artifacts` to regenerate the current version release notes."
    ),
    createCheck(
      "PAI-RELEASE-003",
      "impact report exists",
      fs.existsSync(impactReportPath),
      { relativePath: path.relative(context.packageRoot, impactReportPath) },
      "release",
      "Run `pnpm refresh:release-artifacts` to regenerate the impact report."
    ),
    createCheck(
      "PAI-RELEASE-004",
      "automation report exists",
      fs.existsSync(automationReportPath),
      { relativePath: path.relative(context.packageRoot, automationReportPath) },
      "release",
      "Run `pnpm refresh:release-artifacts` to regenerate the automation report."
    ),
    createCheck(
      "PAI-RELEASE-007",
      "upgrade risk report exists",
      fs.existsSync(upgradeRiskReportPath),
      { relativePath: path.relative(context.packageRoot, upgradeRiskReportPath) },
      "release",
      "Run `pnpm refresh:release-artifacts` to regenerate the upgrade risk report."
    ),
    createCheck(
      "PAI-RELEASE-005",
      "recorded notification payload exists",
      recordedNotificationOk,
      {
        notificationJsonPath,
        notificationMarkdownPath
      },
      "release",
      "Run `pnpm refresh:release-artifacts` to regenerate the latest notification payload and update version-record.json."
    ),
    createCheck(
      "PAI-RELEASE-006",
      "release artifact consistency passes",
      consistencyResult.status === 0,
      {
        error: consistencyResult.error?.message || "",
        stdout: safeTrim(consistencyResult.stdout),
        stderr: safeTrim(consistencyResult.stderr)
      },
      "release",
      "Run `pnpm refresh:release-artifacts` and then `pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-risk-report --require-automation-report --require-notification-payload`."
    ),
    createCheck(
      "PAI-RELEASE-008",
      "release gate report exists",
      fs.existsSync(releaseGateReportPath),
      { relativePath: path.relative(context.packageRoot, releaseGateReportPath) },
      "release",
      "Run `pnpm check:release-gates` to regenerate the release gate report."
    ),
    createCheck(
      "PAI-RELEASE-009",
      "release gates pass",
      releaseGateResult.status === 0,
      {
        error: releaseGateResult.error?.message || "",
        stdout: safeTrim(releaseGateResult.stdout),
        stderr: safeTrim(releaseGateResult.stderr)
      },
      "release",
      "Run `pnpm check:release-gates` and resolve any wrapper governance or consumer compatibility blockers before release."
    ),
    createCheck(
      "PAI-RELEASE-010",
      "upgrade advice package exists",
      fs.existsSync(upgradeAdvicePackagePath),
      { relativePath: path.relative(context.packageRoot, upgradeAdvicePackagePath) },
      "release",
      "Run `node ./scripts/generate-upgrade-advice-package.mjs --automation-report manifest/automation-report.json` to regenerate the upgrade advice package."
    ),
    createCheck(
      "PAI-RELEASE-011",
      "version record includes governance summary",
      Boolean(governanceSummary),
      {
        governanceSummary
      },
      "release",
      "Run `pnpm refresh:release-artifacts` so version-record.json captures the latest governance summary for this release."
    ),
    createCheck(
      "PAI-RELEASE-012",
      "release governance warnings acknowledged",
      (releaseGateReport?.summary?.warningGates || 0) === 0,
      {
        overallStatus: releaseGateReport?.overallStatus || "missing",
        warningGates: releaseGateReport?.summary?.warningGates || 0,
        unresolvedProjectProfileDecisions: releaseGateReport?.governance?.unresolvedProjectProfileDecisions || 0,
        deferredProjectProfileDecisions: releaseGateReport?.governance?.deferredProjectProfileDecisions || 0,
        rejectedProjectProfileDecisions: releaseGateReport?.governance?.rejectedProjectProfileDecisions || 0,
        pendingConversationReviews: releaseGateReport?.governance?.pendingConversationReviews || 0,
        warningLevelConversationRecords: releaseGateReport?.governance?.warningLevelConversationRecords || 0,
        reviewLevelConversationRecords: releaseGateReport?.governance?.reviewLevelConversationRecords || 0,
        scenariosWithWarningLevelConversationRecords: releaseGateReport?.governance?.scenariosWithWarningLevelConversationRecords || 0,
        scenariosWithReviewLevelConversationRecords: releaseGateReport?.governance?.scenariosWithReviewLevelConversationRecords || 0,
        recordsWithGovernanceMetadata: releaseGateReport?.governance?.recordsWithGovernanceMetadata || 0,
        recordsWithAdmissionMetadata: releaseGateReport?.governance?.recordsWithAdmissionMetadata || 0,
        pendingWrapperProposals: releaseGateReport?.governance?.pendingWrapperProposals || 0
      },
      "release",
      "Review manifest/release-gate-report.json and decide whether the remaining governance warnings are acceptable before publication.",
      "warning"
    )
  ];
}
