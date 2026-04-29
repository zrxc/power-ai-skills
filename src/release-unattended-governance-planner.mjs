import fs from "node:fs";
import path from "node:path";
import { persistReleaseUnattendedGovernanceArtifacts } from "./release-unattended-governance-record.mjs";
import { readJson } from "./shared/fs.mjs";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLowerText(value = "") {
  return normalizeText(value).toLowerCase();
}

function pathExists(filePath = "") {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function readJsonIfExists(filePath = "") {
  return pathExists(filePath) ? readJson(filePath) : null;
}

function buildBlocker(code, message) {
  return { code, message };
}

function asIsoDate(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function isExpired(isoValue = "", now = new Date()) {
  const parsed = asIsoDate(isoValue);
  if (!parsed) return false;
  return new Date(parsed).getTime() < now.getTime();
}

function matchesTargetPublish(left = {}, right = {}) {
  return normalizeText(left.packageName) === normalizeText(right.packageName)
    && normalizeText(left.version) === normalizeText(right.version)
    && normalizeText(left.registryUrl) === normalizeText(right.registryUrl)
    && normalizeText(left.access) === normalizeText(right.access)
    && normalizeText(left.tag) === normalizeText(right.tag)
    && normalizeText(left.publishCommand) === normalizeText(right.publishCommand);
}

function buildGovernanceNextAction({
  status,
  publishPlan,
  authorization,
  releaseManifestDir
}) {
  if (status === "execution-locked") {
    return {
      kind: "review-publish-failure",
      command: "",
      reason: "The latest real publish failed; review the publish record and failure summary before any new unattended authorization or retry.",
      recordPath: path.join(releaseManifestDir, "release-publish-record.json"),
      failureSummaryPath: path.join(releaseManifestDir, "release-publish-failure-summary.md")
    };
  }

  if (status === "follow-up-blocked") {
    return {
      kind: "review-post-publish-follow-up",
      command: "npx power-ai-skills generate-upgrade-summary --json",
      reason: "Real publish already completed, but post-publish follow-up is still pending; refresh and review maintenance summaries before any next release cycle.",
      recordPath: path.join(releaseManifestDir, "release-orchestration-record.json")
    };
  }

  if (status === "blocked") {
    return {
      kind: "resolve-governance-blockers",
      command: publishPlan.nextAction?.command || "",
      reason: "Current release evidence does not qualify for unattended governance; resolve the latest orchestration or publish planner blockers first.",
      recordPath: path.join(releaseManifestDir, "release-orchestration-record.json")
    };
  }

  if (status === "authorization-expired") {
    return {
      kind: "refresh-and-reauthorize",
      command: "pnpm refresh:release-artifacts",
      reason: "The existing unattended authorization is no longer valid for the latest release evidence; refresh artifacts and create a new authorization after review.",
      recordPath: authorization.recordPath || path.join(releaseManifestDir, "release-unattended-authorization.json")
    };
  }

  if (status === "not-authorized") {
    return {
      kind: "grant-unattended-authorization",
      command: "",
      reason: "Technical release readiness is acceptable, but no valid unattended authorization exists yet.",
      recordPath: path.join(releaseManifestDir, "release-unattended-authorization.json")
    };
  }

  return {
    kind: "unattended-candidate-ready",
    command: "",
    reason: "The current release snapshot is eligible for unattended governance and a valid authorization is present. This planner does not execute real publish.",
    recordPath: authorization.recordPath || path.join(releaseManifestDir, "release-unattended-authorization.json")
  };
}

function buildAuthorizationState({
  authorizationRecord,
  publishPlan,
  orchestrationPlan,
  now
}) {
  if (!authorizationRecord) {
    return {
      present: false,
      status: "",
      valid: false,
      consumed: false,
      authorizationId: "",
      expiresAt: "",
      recordPath: "",
      invalidReason: "missing",
      invalidCode: "authorization-missing"
    };
  }

  const constraints = authorizationRecord.constraints || {};
  const evidenceSnapshot = authorizationRecord.evidenceSnapshot || {};
  const orchestrationExecutionId = orchestrationPlan.releaseOrchestrationSummary?.executionId
    || orchestrationPlan.orchestrationExecutionId
    || "";
  const currentStatus = normalizeText(authorizationRecord.status || "active");
  const consumed = Boolean(authorizationRecord.consumption?.consumed);
  const expiresAt = normalizeText(constraints.expiresAt || authorizationRecord.expiresAt);
  const invalidState = currentStatus && currentStatus !== "active";

  if (consumed) {
    return {
      present: true,
      status: currentStatus || "consumed",
      valid: false,
      consumed: true,
      authorizationId: authorizationRecord.authorizationId || "",
      expiresAt,
      recordPath: authorizationRecord.recordPath || "",
      invalidReason: "consumed",
      invalidCode: "authorization-invalidated"
    };
  }

  if (invalidState) {
    return {
      present: true,
      status: currentStatus,
      valid: false,
      consumed: false,
      authorizationId: authorizationRecord.authorizationId || "",
      expiresAt,
      recordPath: authorizationRecord.recordPath || "",
      invalidReason: "authorization-status-not-active",
      invalidCode: currentStatus === "expired" ? "authorization-expired" : "authorization-invalidated"
    };
  }

  if (isExpired(expiresAt, now)) {
    return {
      present: true,
      status: "expired",
      valid: false,
      consumed: false,
      authorizationId: authorizationRecord.authorizationId || "",
      expiresAt,
      recordPath: authorizationRecord.recordPath || "",
      invalidReason: "authorization-expired",
      invalidCode: "authorization-expired"
    };
  }

  if (normalizeText(authorizationRecord.packageName) !== normalizeText(publishPlan.targetPublish.packageName)
    || normalizeText(authorizationRecord.version) !== normalizeText(publishPlan.targetPublish.version)) {
    return {
      present: true,
      status: "invalidated",
      valid: false,
      consumed: false,
      authorizationId: authorizationRecord.authorizationId || "",
      expiresAt,
      recordPath: authorizationRecord.recordPath || "",
      invalidReason: "package-or-version-changed",
      invalidCode: "authorization-invalidated"
    };
  }

  if (!matchesTargetPublish(authorizationRecord.targetPublish, publishPlan.targetPublish)) {
    return {
      present: true,
      status: "invalidated",
      valid: false,
      consumed: false,
      authorizationId: authorizationRecord.authorizationId || "",
      expiresAt,
      recordPath: authorizationRecord.recordPath || "",
      invalidReason: "target-publish-changed",
      invalidCode: "authorization-invalidated"
    };
  }

  if (Boolean(constraints.requirePlannerEligible) && publishPlan.status !== "eligible") {
    return {
      present: true,
      status: "invalidated",
      valid: false,
      consumed: false,
      authorizationId: authorizationRecord.authorizationId || "",
      expiresAt,
      recordPath: authorizationRecord.recordPath || "",
      invalidReason: "publish-planner-no-longer-eligible",
      invalidCode: "authorization-invalidated"
    };
  }

  if (Boolean(constraints.requireOrchestrationReady) && orchestrationPlan.status !== "ready-for-controlled-publish") {
    return {
      present: true,
      status: "invalidated",
      valid: false,
      consumed: false,
      authorizationId: authorizationRecord.authorizationId || "",
      expiresAt,
      recordPath: authorizationRecord.recordPath || "",
      invalidReason: "orchestration-no-longer-ready",
      invalidCode: "authorization-invalidated"
    };
  }

  if (constraints.allowWarnGate === false && publishPlan.evidence?.publishReadiness?.requiresExplicitAcknowledgement) {
    return {
      present: true,
      status: "invalidated",
      valid: false,
      consumed: false,
      authorizationId: authorizationRecord.authorizationId || "",
      expiresAt,
      recordPath: authorizationRecord.recordPath || "",
      invalidReason: "warning-acknowledgement-required",
      invalidCode: "authorization-invalidated"
    };
  }

  return {
    present: true,
    status: currentStatus || "active",
    valid: true,
    consumed: false,
    authorizationId: authorizationRecord.authorizationId || "",
    expiresAt,
    recordPath: authorizationRecord.recordPath || "",
    invalidReason: "",
    invalidCode: ""
  };
}

export function createReleaseUnattendedGovernancePlannerService({
  context,
  projectRoot,
  releasePublishPlannerService,
  releaseOrchestrationPlannerService,
  nowProvider = () => new Date()
}) {
  const packageRoot = context.packageRoot;
  const releaseManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(packageRoot, "manifest"));

  function planReleaseUnattendedGovernance() {
    if (path.resolve(projectRoot) !== path.resolve(packageRoot)) {
      throw new Error("plan-release-unattended-governance is only available in package-maintenance mode from the package root.");
    }

    const publishPlan = releasePublishPlannerService.planReleasePublish();
    const orchestrationPlan = releaseOrchestrationPlannerService.planReleaseOrchestration();
    const versionRecord = readJsonIfExists(path.join(releaseManifestDir, "version-record.json")) || {};
    const authorizationPath = normalizeText(
      versionRecord.artifacts?.releaseUnattendedAuthorizationPath
      || path.join(releaseManifestDir, "release-unattended-authorization.json")
    );
    const authorizationRecord = readJsonIfExists(authorizationPath);
    const authorization = buildAuthorizationState({
      authorizationRecord,
      publishPlan,
      orchestrationPlan,
      now: nowProvider()
    });
    const publishReadiness = publishPlan.evidence?.publishReadiness || {};
    const latestPublishExecution = publishPlan.evidence?.publishExecutionSummary || null;
    const eligibility = {
      orchestrationStatus: orchestrationPlan.status || "unknown",
      publishPlannerStatus: publishPlan.status || "unknown",
      releaseGateStatus: normalizeLowerText(publishReadiness.releaseGateStatus),
      requiresExplicitAcknowledgement: Boolean(publishReadiness.requiresExplicitAcknowledgement),
      latestPublishExecutionStatus: normalizeText(latestPublishExecution?.status) || "not-started",
      followUpPending: orchestrationPlan.status === "published-awaiting-follow-up"
    };
    const blockers = [];
    const riskFlags = [];
    let status = "authorized-ready";
    let recommendedExecutionMode = "unattended-candidate";
    let lockState = "unlocked";
    let lockReason = "";

    if (eligibility.latestPublishExecutionStatus === "publish-failed"
      || orchestrationPlan.nextAction?.kind === "review-publish-failure") {
      status = "execution-locked";
      lockState = "execution-locked";
      lockReason = "publish-failed-lock";
      recommendedExecutionMode = "manual-review-required";
      blockers.push(buildBlocker(
        "publish-failed-lock",
        "The latest real publish attempt failed; unattended execution is locked until a maintainer reviews the publish record and failure summary."
      ));
    } else if (eligibility.followUpPending) {
      status = "follow-up-blocked";
      lockState = "follow-up-blocked";
      lockReason = "follow-up-pending";
      recommendedExecutionMode = "post-publish-follow-up";
      blockers.push(buildBlocker(
        "follow-up-pending",
        "The latest release already published successfully, but post-publish follow-up is still pending."
      ));
    } else if (eligibility.orchestrationStatus !== "ready-for-controlled-publish") {
      status = "blocked";
      recommendedExecutionMode = "manual-controlled-publish";
      blockers.push(buildBlocker(
        "orchestration-not-ready",
        `Release orchestration is not ready for unattended governance: current status ${eligibility.orchestrationStatus || "unknown"}.`
      ));
    } else if (eligibility.publishPlannerStatus !== "eligible") {
      status = "blocked";
      recommendedExecutionMode = "manual-controlled-publish";
      blockers.push(buildBlocker(
        "planner-blocked",
        "The controlled publish planner is not eligible for the current release snapshot."
      ));
    } else if (eligibility.requiresExplicitAcknowledgement) {
      status = "blocked";
      riskFlags.push("warning-acknowledgement-required");
      recommendedExecutionMode = "manual-controlled-publish";
      blockers.push(buildBlocker(
        "warning-acknowledgement-required",
        "Warn-level release readiness still requires explicit maintainer acknowledgement and cannot be promoted to unattended execution."
      ));
    } else if (!authorization.present) {
      status = "not-authorized";
      recommendedExecutionMode = "await-authorization";
      blockers.push(buildBlocker(
        "authorization-missing",
        "No unattended release authorization record is present for the current release snapshot."
      ));
    } else if (!authorization.valid) {
      status = authorization.invalidCode === "authorization-expired" ? "authorization-expired" : "authorization-expired";
      recommendedExecutionMode = "await-reauthorization";
      riskFlags.push(authorization.invalidReason);
      blockers.push(buildBlocker(
        authorization.invalidCode || "authorization-invalidated",
        `The current unattended authorization is no longer valid: ${authorization.invalidReason || "unknown reason"}.`
      ));
    }

    const result = {
      packageRoot,
      projectRoot,
      manifestRoot: releaseManifestDir,
      packageName: publishPlan.targetPublish.packageName,
      version: publishPlan.targetPublish.version,
      status,
      blockers,
      riskFlags,
      eligibility,
      authorization: {
        present: authorization.present,
        status: authorization.status,
        authorizationId: authorization.authorizationId,
        authorizedBy: authorizationRecord?.authorizedBy || null,
        expiresAt: authorization.expiresAt,
        consumed: authorization.consumed,
        recordPath: authorization.recordPath
      },
      governanceDecision: {
        canRunUnattended: status === "authorized-ready",
        requiresHumanReview: status !== "authorized-ready",
        lockState,
        lockReason,
        recommendedExecutionMode
      },
      evidence: {
        releaseOrchestrationRecordPath: orchestrationPlan.orchestrationManifestArtifacts?.recordPath
          || orchestrationPlan.releaseOrchestrationSummary?.recordPath
          || path.join(releaseManifestDir, "release-orchestration-record.json"),
        releasePublishRecordPath: latestPublishExecution?.recordPath
          || path.join(releaseManifestDir, "release-publish-record.json"),
        releaseUnattendedAuthorizationPath: authorization.recordPath || authorizationPath,
        versionRecordPath: path.join(releaseManifestDir, "version-record.json"),
        releaseOrchestrationSummary: orchestrationPlan.releaseOrchestrationSummary || null,
        publishExecutionSummary: latestPublishExecution,
        publishPlannerStatus: publishPlan.status
      },
      executionMode: "dry-run-plan-recorded"
    };
    result.nextAction = buildGovernanceNextAction({
      status,
      publishPlan,
      authorization: result.authorization,
      releaseManifestDir
    });

    const persisted = persistReleaseUnattendedGovernanceArtifacts({
      releaseManifestDir,
      packageRoot,
      projectRoot,
      result
    });

    return {
      ...result,
      governanceExecutionId: persisted.executionId,
      governanceRecordedAt: persisted.recordedAt,
      governanceManifestArtifacts: persisted.manifestArtifacts,
      releaseUnattendedGovernanceSummary: persisted.snapshot,
      governanceContract: {
        executionMode: "dry-run-plan-recorded",
        governanceRecordPath: persisted.manifestArtifacts.recordPath,
        governanceRecordPathRelative: persisted.manifestArtifacts.recordPathRelative,
        governanceHistoryPath: persisted.manifestArtifacts.historicalRecordPath,
        governanceHistoryPathRelative: persisted.manifestArtifacts.historicalRecordPathRelative,
        authorizationRecordPath: result.authorization.recordPath || authorizationPath
      }
    };
  }

  return {
    planReleaseUnattendedGovernance
  };
}
