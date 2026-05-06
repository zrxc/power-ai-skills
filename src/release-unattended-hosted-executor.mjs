import path from "node:path";
import { persistReleaseUnattendedHostedExecutionArtifacts } from "./release-unattended-hosted-record.mjs";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function isTruthyEnvValue(value = "") {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function buildBlocker(code, message) {
  return { code, message };
}

function buildHostedNextAction({
  status,
  runtimeSource,
  governanceResult
}) {
  if (status === "hosted-runtime-source-required") {
    return {
      kind: "provide-runtime-source",
      command: "",
      reason: "Provide a valid hosted runtime source with `--runtime-source ci` or `--runtime-source cron` before using the hosted unattended executor."
    };
  }

  if (status === "hosted-runtime-evidence-missing") {
    if (runtimeSource === "ci") {
      return {
        kind: "run-from-ci-runtime",
        command: "",
        reason: "Re-run this hosted executor from a CI runtime where the `CI` environment variable is present."
      };
    }
    return {
      kind: "run-from-cron-runtime",
      command: "",
      reason: "Re-run this hosted executor from a cron wrapper that exports `POWER_AI_RELEASE_CRON=1`."
    };
  }

  return governanceResult?.nextAction || {
    kind: "review-hosted-execution",
    command: "",
    reason: "Review the latest hosted unattended execution record before continuing."
  };
}

function resolveTriggerContext({
  runtimeSource,
  triggerId,
  triggerLabel,
  env,
  recordedAt
}) {
  const resolvedTriggerId = normalizeText(triggerId)
    || normalizeText(env.POWER_AI_RELEASE_TRIGGER_ID)
    || normalizeText(env.GITHUB_RUN_ID)
    || normalizeText(env.BUILD_BUILDID)
    || normalizeText(env.CI_PIPELINE_ID)
    || `hosted-trigger-${recordedAt.replace(/[-:.TZ]/g, "").slice(0, 17)}`;
  const resolvedTriggerLabel = normalizeText(triggerLabel)
    || normalizeText(env.POWER_AI_RELEASE_TRIGGER_LABEL)
    || normalizeText(env.GITHUB_WORKFLOW)
    || normalizeText(env.BUILD_DEFINITIONNAME)
    || normalizeText(env.CI_PIPELINE_SOURCE)
    || `${runtimeSource}-hosted-trigger`;

  return {
    triggerId: resolvedTriggerId,
    triggerLabel: resolvedTriggerLabel
  };
}

function evaluateHostedBoundary({ runtimeSource, env }) {
  const normalizedSource = normalizeText(runtimeSource).toLowerCase();
  if (!normalizedSource || !["ci", "cron"].includes(normalizedSource)) {
    return {
      allowed: false,
      status: "hosted-runtime-source-required",
      blockers: [
        buildBlocker(
          "hosted-runtime-source-required",
          "Hosted unattended execution requires `--runtime-source ci` or `--runtime-source cron`."
        )
      ],
      runtimeSource: normalizedSource
    };
  }

  if (normalizedSource === "ci" && !isTruthyEnvValue(env.CI)) {
    return {
      allowed: false,
      status: "hosted-runtime-evidence-missing",
      blockers: [
        buildBlocker(
          "hosted-runtime-evidence-missing",
          "Hosted CI execution requires a CI runtime signal such as `CI=true`."
        )
      ],
      runtimeSource: normalizedSource
    };
  }

  if (normalizedSource === "cron" && !isTruthyEnvValue(env.POWER_AI_RELEASE_CRON)) {
    return {
      allowed: false,
      status: "hosted-runtime-evidence-missing",
      blockers: [
        buildBlocker(
          "hosted-runtime-evidence-missing",
          "Hosted cron execution requires `POWER_AI_RELEASE_CRON=1` so the runtime boundary stays explicit."
        )
      ],
      runtimeSource: normalizedSource
    };
  }

  return {
    allowed: true,
    status: "hosted-runtime-allowed",
    blockers: [],
    runtimeSource: normalizedSource
  };
}

export function createReleaseUnattendedHostedExecutorService({
  context,
  projectRoot,
  releaseUnattendedGovernanceExecutorService,
  envProvider = () => process.env
}) {
  const packageRoot = context.packageRoot;
  const releaseManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(packageRoot, "manifest"));

  function executeReleaseUnattendedHosted({
    runtimeSource = "",
    triggerId = "",
    triggerLabel = ""
  } = {}) {
    if (path.resolve(projectRoot) !== path.resolve(packageRoot)) {
      throw new Error("execute-release-unattended-hosted is only available in package-maintenance mode from the package root.");
    }

    const env = envProvider();
    const boundary = evaluateHostedBoundary({
      runtimeSource,
      env
    });
    const recordedAt = new Date().toISOString();
    const trigger = resolveTriggerContext({
      runtimeSource: boundary.runtimeSource || runtimeSource,
      triggerId,
      triggerLabel,
      env,
      recordedAt
    });

    let governanceResult = null;
    let status = boundary.status;
    let blockers = boundary.blockers || [];
    let nextAction = buildHostedNextAction({
      status,
      runtimeSource: boundary.runtimeSource || runtimeSource,
      governanceResult
    });

    if (boundary.allowed) {
      governanceResult = releaseUnattendedGovernanceExecutorService.executeReleaseUnattendedGovernance();
      status = governanceResult.status;
      blockers = governanceResult.blockers || [];
      nextAction = buildHostedNextAction({
        status,
        runtimeSource: boundary.runtimeSource,
        governanceResult
      });
    }

    const result = {
      packageRoot,
      projectRoot,
      packageName: governanceResult?.governancePlan?.packageName || context.packageJson.name,
      version: governanceResult?.governancePlan?.version || context.packageJson.version,
      status,
      executionMode: "hosted-unattended-executor",
      runtimeSource: boundary.runtimeSource || normalizeText(runtimeSource).toLowerCase(),
      trigger,
      hostedBoundary: {
        allowed: Boolean(boundary.allowed),
        status: boundary.status,
        blockers: boundary.blockers || []
      },
      governanceStatus: governanceResult?.governanceStatus || "",
      governancePlan: governanceResult?.governancePlan || null,
      publishExecuted: Boolean(governanceResult?.publishExecuted),
      authorizationConsumed: Boolean(governanceResult?.authorizationConsumed),
      publishExecution: governanceResult?.publishExecution || null,
      blockers,
      nextAction
    };

    const persisted = persistReleaseUnattendedHostedExecutionArtifacts({
      releaseManifestDir,
      packageRoot,
      projectRoot,
      result
    });

    return {
      ...result,
      hostedExecutionId: persisted.executionId,
      hostedRecordedAt: persisted.recordedAt,
      hostedManifestArtifacts: persisted.manifestArtifacts,
      releaseUnattendedHostedExecutionSummary: persisted.snapshot,
      hostedContract: {
        executionMode: "hosted-unattended-executor",
        hostedRecordPath: persisted.manifestArtifacts.recordPath,
        hostedRecordPathRelative: persisted.manifestArtifacts.recordPathRelative,
        hostedHistoryPath: persisted.manifestArtifacts.historicalRecordPath,
        hostedHistoryPathRelative: persisted.manifestArtifacts.historicalRecordPathRelative
      }
    };
  }

  return {
    executeReleaseUnattendedHosted
  };
}
