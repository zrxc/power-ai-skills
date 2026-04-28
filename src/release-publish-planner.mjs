import fs from "node:fs";
import path from "node:path";
import { readJson } from "./shared/fs.mjs";
import { buildPlannerNextAction } from "./release-publish-guidance.mjs";

export const DEFAULT_RELEASE_PUBLISH_CRITERIA = Object.freeze({
  allowedReleaseGateStatuses: ["pass", "warn"],
  requireAutomationReport: true,
  requireVersionRecord: true,
  requireReleaseGateReport: true,
  requireGovernanceOperationsReport: true,
  requireUpgradeAdvicePackage: true,
  requireNotificationPayload: true,
  requireMatchingVersionRecord: true,
  requireMatchingNotificationVersion: true,
  requireAdviceNotBlocked: true,
  requirePublishRegistry: true
});

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLowerText(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeTextList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .map((item) => normalizeLowerText(item))
      .filter(Boolean)
  )];
}

function normalizePosixPath(filePath = "") {
  return String(filePath || "").replace(/\\/g, "/");
}

function pathExists(filePath = "") {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function readJsonIfExists(filePath = "") {
  return pathExists(filePath) ? readJson(filePath) : null;
}

function getLatestNotificationPayloadPath(notificationsRoot) {
  if (!pathExists(notificationsRoot)) return "";
  const candidates = fs.readdirSync(notificationsRoot)
    .filter((item) => item.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left, "en"));
  return candidates.length > 0 ? path.join(notificationsRoot, candidates[0]) : "";
}

function buildCriteria(criteria = {}) {
  const allowedReleaseGateStatuses = normalizeTextList(criteria.allowedReleaseGateStatuses);

  return {
    allowedReleaseGateStatuses: allowedReleaseGateStatuses.length > 0
      ? allowedReleaseGateStatuses
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.allowedReleaseGateStatuses,
    requireAutomationReport: typeof criteria.requireAutomationReport === "boolean"
      ? criteria.requireAutomationReport
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireAutomationReport,
    requireVersionRecord: typeof criteria.requireVersionRecord === "boolean"
      ? criteria.requireVersionRecord
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireVersionRecord,
    requireReleaseGateReport: typeof criteria.requireReleaseGateReport === "boolean"
      ? criteria.requireReleaseGateReport
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireReleaseGateReport,
    requireGovernanceOperationsReport: typeof criteria.requireGovernanceOperationsReport === "boolean"
      ? criteria.requireGovernanceOperationsReport
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireGovernanceOperationsReport,
    requireUpgradeAdvicePackage: typeof criteria.requireUpgradeAdvicePackage === "boolean"
      ? criteria.requireUpgradeAdvicePackage
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireUpgradeAdvicePackage,
    requireNotificationPayload: typeof criteria.requireNotificationPayload === "boolean"
      ? criteria.requireNotificationPayload
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireNotificationPayload,
    requireMatchingVersionRecord: typeof criteria.requireMatchingVersionRecord === "boolean"
      ? criteria.requireMatchingVersionRecord
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireMatchingVersionRecord,
    requireMatchingNotificationVersion: typeof criteria.requireMatchingNotificationVersion === "boolean"
      ? criteria.requireMatchingNotificationVersion
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireMatchingNotificationVersion,
    requireAdviceNotBlocked: typeof criteria.requireAdviceNotBlocked === "boolean"
      ? criteria.requireAdviceNotBlocked
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requireAdviceNotBlocked,
    requirePublishRegistry: typeof criteria.requirePublishRegistry === "boolean"
      ? criteria.requirePublishRegistry
      : DEFAULT_RELEASE_PUBLISH_CRITERIA.requirePublishRegistry
  };
}

function buildBlocker(code, message) {
  return { code, message };
}

function buildTargetPublish({ packageJson }) {
  const registryUrl = normalizeText(packageJson.publishConfig?.registry);
  const access = normalizeText(packageJson.publishConfig?.access);
  const tag = normalizeText(packageJson.publishConfig?.tag || "latest");
  const packageName = normalizeText(packageJson.name);
  const version = normalizeText(packageJson.version);
  const publishArgs = ["publish"];
  if (registryUrl) publishArgs.push("--registry", registryUrl);
  if (access) publishArgs.push("--access", access);
  if (tag && tag !== "latest") publishArgs.push("--tag", tag);
  const publishCommand = publishArgs
    .map((item) => /\s/.test(item) ? `"${item}"` : item)
    .join(" ");

  return {
    packageName,
    version,
    registryUrl,
    access,
    tag,
    publishArgs,
    publishCommand,
    commandTemplate: "npm publish [--registry <registry-url>] [--access <access>] [--tag <tag>]",
    mappingSources: {
      packageName: "package.json name",
      version: "package.json version",
      registryUrl: "package.json publishConfig.registry",
      access: "package.json publishConfig.access",
      tag: "package.json publishConfig.tag (default latest)"
    }
  };
}

function buildManualConfirmation({ packageRoot, targetPublish, publishReadiness }) {
  const notes = [
    "Keep real package publication manual; this planner does not execute npm publish.",
    "Refresh artifacts and re-run release checks immediately before publishing."
  ];

  if (publishReadiness.requiresExplicitAcknowledgement) {
    notes.unshift("Current release snapshot requires explicit acknowledgement before publish because governance warnings are still present.");
  }

  return {
    mode: "package-maintainer-manual",
    packageRoot,
    refreshArtifactsCommand: "pnpm refresh:release-artifacts",
    validationCommand: "pnpm release:validate",
    releaseCheckCommand: "pnpm release:check",
    releaseGenerateCommand: "pnpm release:generate",
    publishCommand: targetPublish.publishCommand,
    commandTemplate: targetPublish.commandTemplate,
    commands: [
      "pnpm refresh:release-artifacts",
      "pnpm release:validate",
      "pnpm release:check",
      "pnpm release:generate",
      targetPublish.publishCommand
    ],
    notes
  };
}

function resolvePublishReadiness({ releaseGateReport, governanceOperationsReport, advicePackage }) {
  const governanceReadiness = governanceOperationsReport?.releaseReadiness || null;
  const releaseGateStatus = normalizeLowerText(
    governanceReadiness?.releaseGateStatus
    || releaseGateReport?.overallStatus
  );
  const warningGates = Number(
    governanceReadiness?.warningGates
    ?? releaseGateReport?.summary?.warningGates
    ?? governanceOperationsReport?.summary?.releaseGateWarnings
    ?? 0
  );
  const blockingIssues = Number(
    governanceReadiness?.blockingIssues
    ?? releaseGateReport?.summary?.blockingIssues
    ?? governanceOperationsReport?.summary?.blockingIssues
    ?? 0
  );
  const canPublish = typeof governanceReadiness?.canPublish === "boolean"
    ? governanceReadiness.canPublish
    : (releaseGateStatus && releaseGateStatus !== "fail" && blockingIssues === 0 && !advicePackage?.blocked);
  const broadRolloutReady = typeof governanceReadiness?.broadRolloutReady === "boolean"
    ? governanceReadiness.broadRolloutReady
    : (releaseGateStatus === "pass" && warningGates === 0 && blockingIssues === 0);
  const requiresExplicitAcknowledgement = typeof governanceReadiness?.requiresExplicitAcknowledgement === "boolean"
    ? governanceReadiness.requiresExplicitAcknowledgement
    : (warningGates > 0 || releaseGateStatus === "warn");

  return {
    releaseGateStatus,
    warningGates,
    blockingIssues,
    canPublish,
    broadRolloutReady,
    requiresExplicitAcknowledgement
  };
}

function buildEvidence({
  packageRoot,
  releaseManifestDir,
  paths,
  packageJson,
  targetPublish,
  publishReadiness,
  versionRecord,
  automationReport,
  releaseGateReport,
  governanceOperationsReport,
  advicePackage,
  notificationPayload,
  latestNotificationJsonPath
}) {
  return {
    packageName: normalizeText(packageJson.name),
    version: normalizeText(packageJson.version),
    targetPublish,
    publishReadiness,
    publishExecutionSummary: versionRecord?.publishExecutionSummary || null,
    manifestRoot: normalizePosixPath(path.relative(packageRoot, releaseManifestDir)),
    artifacts: {
      automationReportPath: normalizePosixPath(path.relative(packageRoot, paths.automationReportPath)),
      versionRecordPath: normalizePosixPath(path.relative(packageRoot, paths.versionRecordPath)),
      releaseGateReportPath: normalizePosixPath(path.relative(packageRoot, paths.releaseGateReportPath)),
      governanceOperationsReportPath: normalizePosixPath(path.relative(packageRoot, paths.governanceOperationsReportPath)),
      upgradeAdvicePackagePath: normalizePosixPath(path.relative(packageRoot, paths.upgradeAdvicePackagePath)),
      notificationJsonPath: paths.notificationJsonPath
        ? normalizePosixPath(path.relative(packageRoot, paths.notificationJsonPath))
        : "",
      latestNotificationJsonPath: latestNotificationJsonPath
        ? normalizePosixPath(path.relative(packageRoot, latestNotificationJsonPath))
        : ""
    },
    versions: {
      packageJsonVersion: normalizeText(packageJson.version),
      versionRecordVersion: normalizeText(versionRecord?.version),
      automationReportVersion: normalizeText(automationReport?.version),
      releaseGateVersion: normalizeText(releaseGateReport?.version),
      governanceOperationsVersion: normalizeText(governanceOperationsReport?.version),
      advicePackageVersion: normalizeText(advicePackage?.version),
      notificationVersion: normalizeText(notificationPayload?.version)
    },
    packageNames: {
      packageJsonName: normalizeText(packageJson.name),
      versionRecordName: normalizeText(versionRecord?.packageName),
      automationReportName: normalizeText(automationReport?.packageName),
      releaseGateName: normalizeText(releaseGateReport?.packageName),
      governanceOperationsName: normalizeText(governanceOperationsReport?.packageName),
      advicePackageName: normalizeText(advicePackage?.packageName),
      notificationPackageName: normalizeText(notificationPayload?.packageName)
    }
  };
}

export function createReleasePublishPlannerService({ context, projectRoot }) {
  const packageRoot = context.packageRoot;
  const releaseManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(packageRoot, "manifest"));

  function planReleasePublish({ criteria = {} } = {}) {
    if (path.resolve(projectRoot) !== path.resolve(packageRoot)) {
      throw new Error("plan-release-publish is only available in package-maintenance mode from the package root.");
    }

    const normalizedCriteria = buildCriteria(criteria);
    const packageJson = context.packageJson;
    const targetPublish = buildTargetPublish({ packageJson });
    const notificationsRoot = path.join(releaseManifestDir, "notifications");
    const paths = {
      automationReportPath: path.join(releaseManifestDir, "automation-report.json"),
      versionRecordPath: path.join(releaseManifestDir, "version-record.json"),
      releaseGateReportPath: path.join(releaseManifestDir, "release-gate-report.json"),
      governanceOperationsReportPath: path.join(releaseManifestDir, "governance-operations-report.json"),
      upgradeAdvicePackagePath: path.join(releaseManifestDir, "upgrade-advice-package.json")
    };

    const versionRecord = readJsonIfExists(paths.versionRecordPath);
    paths.notificationJsonPath = normalizeText(versionRecord?.artifacts?.notificationJsonPath);
    const latestNotificationJsonPath = getLatestNotificationPayloadPath(notificationsRoot);
    const notificationPayload = readJsonIfExists(paths.notificationJsonPath || latestNotificationJsonPath);
    const automationReport = readJsonIfExists(paths.automationReportPath);
    const releaseGateReport = readJsonIfExists(paths.releaseGateReportPath);
    const governanceOperationsReport = readJsonIfExists(paths.governanceOperationsReportPath);
    const advicePackage = readJsonIfExists(paths.upgradeAdvicePackagePath);
    const publishReadiness = resolvePublishReadiness({
      releaseGateReport,
      governanceOperationsReport,
      advicePackage
    });
    const blockers = [];

    if (normalizedCriteria.requirePublishRegistry && !targetPublish.registryUrl) {
      blockers.push(buildBlocker(
        "publish-registry-missing",
        "package.json publishConfig.registry is required before planning a release publish."
      ));
    }

    if (normalizedCriteria.requireAutomationReport && !automationReport) {
      blockers.push(buildBlocker(
        "automation-report-missing",
        "automation-report.json is missing; refresh release artifacts before planning publication."
      ));
    }

    if (normalizedCriteria.requireVersionRecord && !versionRecord) {
      blockers.push(buildBlocker(
        "version-record-missing",
        "version-record.json is missing; refresh release artifacts before planning publication."
      ));
    }

    if (normalizedCriteria.requireReleaseGateReport && !releaseGateReport) {
      blockers.push(buildBlocker(
        "release-gate-report-missing",
        "release-gate-report.json is missing; run release checks before planning publication."
      ));
    }

    if (normalizedCriteria.requireGovernanceOperationsReport && !governanceOperationsReport) {
      blockers.push(buildBlocker(
        "governance-operations-report-missing",
        "governance-operations-report.json is missing; generate governance operations before planning publication."
      ));
    }

    if (normalizedCriteria.requireUpgradeAdvicePackage && !advicePackage) {
      blockers.push(buildBlocker(
        "upgrade-advice-package-missing",
        "upgrade-advice-package.json is missing; generate upgrade advice before planning publication."
      ));
    }

    if (normalizedCriteria.requireNotificationPayload && !notificationPayload) {
      blockers.push(buildBlocker(
        "notification-payload-missing",
        "No readable notification payload was found; refresh release artifacts before planning publication."
      ));
    }

    if (normalizedCriteria.requireMatchingVersionRecord && versionRecord && normalizeText(versionRecord.version) !== normalizeText(packageJson.version)) {
      blockers.push(buildBlocker(
        "version-record-version-mismatch",
        `version-record.json version must match package.json version ${packageJson.version}, received ${versionRecord.version || "empty"}.`
      ));
    }

    if (normalizedCriteria.requireMatchingNotificationVersion && notificationPayload && normalizeText(notificationPayload.version) !== normalizeText(packageJson.version)) {
      blockers.push(buildBlocker(
        "notification-version-mismatch",
        `notification payload version must match package.json version ${packageJson.version}, received ${notificationPayload.version || "empty"}.`
      ));
    }

    if (publishReadiness.releaseGateStatus && !normalizedCriteria.allowedReleaseGateStatuses.includes(publishReadiness.releaseGateStatus)) {
      blockers.push(buildBlocker(
        "release-gate-status-not-allowed",
        `release gate status must be one of ${normalizedCriteria.allowedReleaseGateStatuses.join(", ")}, received ${publishReadiness.releaseGateStatus}.`
      ));
    }

    if (publishReadiness.blockingIssues > 0 || publishReadiness.canPublish === false) {
      blockers.push(buildBlocker(
        "release-readiness-blocked",
        `Release readiness is blocked: status ${publishReadiness.releaseGateStatus || "unknown"}, blocking issues ${publishReadiness.blockingIssues}.`
      ));
    }

    if (normalizedCriteria.requireAdviceNotBlocked && advicePackage?.blocked) {
      blockers.push(buildBlocker(
        "upgrade-advice-blocked",
        "upgrade-advice-package.json is marked blocked; resolve blocking checks before planning publication."
      ));
    }

    const evidence = buildEvidence({
      packageRoot,
      releaseManifestDir,
      paths,
      packageJson,
      targetPublish,
      publishReadiness,
      versionRecord,
      automationReport,
      releaseGateReport,
      governanceOperationsReport,
      advicePackage,
      notificationPayload,
      latestNotificationJsonPath
    });

    const status = blockers.length > 0 ? "blocked" : "eligible";

    return {
      packageRoot,
      manifestRoot: releaseManifestDir,
      criteria: normalizedCriteria,
      status,
      blockers,
      targetPublish,
      evidence,
      manualConfirmation: buildManualConfirmation({
        packageRoot,
        targetPublish,
        publishReadiness
      }),
      nextAction: buildPlannerNextAction({
        status,
        publishReadiness,
        targetPublish
      })
    };
  }

  return {
    planReleasePublish
  };
}
