import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { safeTrim } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntryPath = path.join(root, "bin", "power-ai-skills.mjs");

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLowerText(value = "") {
  return normalizeText(value).toLowerCase();
}

function isTruthyEnvValue(value = "") {
  const normalized = normalizeLowerText(value);
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function printUsageAndExit() {
  console.log("用法：node ./scripts/run-release-unattended-hosted.mjs [--runtime-source ci|cron] [--trigger-id <id>] [--trigger-label <label>] [--expect-status <status>] [--require-manual-trigger] [--strict]");
  console.log("说明：");
  console.log("- 这是维护侧 hosted 调用壳，会代理到 execute-release-unattended-hosted。");
  console.log("- 未显式提供 --runtime-source 时，会优先读取 POWER_AI_RELEASE_RUNTIME_SOURCE，再尝试从 CI / POWER_AI_RELEASE_CRON 推断。");
  console.log("- 当 runtime source 为 ci 时，第一版真实调度接线要求 POWER_AI_ENABLE_HOSTED_RELEASE=1，并且当前运行时必须带 tag 证据。");
  console.log("- 如追加 --require-manual-trigger，则 ci 路径还必须检测到手工触发证据。");
  console.log("- 当 runtime source 为 cron 时，第一版宿主接线要求 POWER_AI_ENABLE_HOSTED_RELEASE=1，并显式提供触发标签（--trigger-label 或 POWER_AI_RELEASE_TRIGGER_LABEL）。");
  console.log("- 如追加 --strict，会统一收口为严格发布策略：ci 自动要求 manual trigger，ci/cron 都自动要求最终状态为 published。");
  console.log("- 默认会把 hosted runtime contract、publish-failed、execution-locked 视为失败；如需把最终状态收口为 published，可追加 --expect-status published。");
  process.exit(0);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsageAndExit();
  }

  const getValue = (flagName) => {
    const index = argv.indexOf(flagName);
    return index === -1 ? "" : argv[index + 1] || "";
  };

  const collectAllValues = (flagName) => {
    const values = [];
    for (let index = 0; index < argv.length; index += 1) {
      if (argv[index] === flagName && argv[index + 1]) {
        values.push(argv[index + 1]);
      }
    }
    return values;
  };

  return {
    runtimeSource: getValue("--runtime-source"),
    triggerId: getValue("--trigger-id"),
    triggerLabel: getValue("--trigger-label"),
    requireManualTrigger: argv.includes("--require-manual-trigger"),
    strictMode: argv.includes("--strict"),
    expectedStatuses: collectAllValues("--expect-status")
      .map((value) => normalizeLowerText(value))
      .filter(Boolean)
  };
}

function resolveRuntimeSource(runtimeSource, env) {
  const normalizedCliValue = normalizeLowerText(runtimeSource);
  if (normalizedCliValue) {
    return {
      runtimeSource: normalizedCliValue,
      resolution: "cli-flag"
    };
  }

  const normalizedEnvValue = normalizeLowerText(env.POWER_AI_RELEASE_RUNTIME_SOURCE);
  if (normalizedEnvValue) {
    return {
      runtimeSource: normalizedEnvValue,
      resolution: "env:POWER_AI_RELEASE_RUNTIME_SOURCE"
    };
  }

  const cronSignal = isTruthyEnvValue(env.POWER_AI_RELEASE_CRON);
  const ciSignal = isTruthyEnvValue(env.CI);
  if (cronSignal) {
    return {
      runtimeSource: "cron",
      resolution: "env:POWER_AI_RELEASE_CRON"
    };
  }
  if (ciSignal) {
    return {
      runtimeSource: "ci",
      resolution: "env:CI"
    };
  }

  return {
    runtimeSource: "",
    resolution: "unresolved"
  };
}

function buildHostedCommandArgs({ runtimeSource, triggerId, triggerLabel }) {
  const args = [
    cliEntryPath,
    "execute-release-unattended-hosted",
    "--json"
  ];

  if (normalizeText(runtimeSource)) {
    args.push("--runtime-source", runtimeSource);
  }
  if (normalizeText(triggerId)) {
    args.push("--trigger-id", triggerId);
  }
  if (normalizeText(triggerLabel)) {
    args.push("--trigger-label", triggerLabel);
  }

  return args;
}

function parseHostedPayload(stdout) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    return {
      __parseError: error.message
    };
  }
}

function buildInvocationPreview(args) {
  return [
    "node",
    "./bin/power-ai-skills.mjs",
    "execute-release-unattended-hosted",
    ...args.slice(3)
  ].join(" ");
}

function resolveCiTagEvidence(env) {
  const gitlabTag = normalizeText(env.CI_COMMIT_TAG);
  if (gitlabTag) {
    return {
      present: true,
      source: "env:CI_COMMIT_TAG",
      value: gitlabTag
    };
  }

  const githubRefType = normalizeLowerText(env.GITHUB_REF_TYPE);
  const githubRefName = normalizeText(env.GITHUB_REF_NAME);
  if (githubRefType === "tag" && githubRefName) {
    return {
      present: true,
      source: "env:GITHUB_REF_TYPE",
      value: githubRefName
    };
  }

  const githubRef = normalizeText(env.GITHUB_REF);
  if (githubRef.startsWith("refs/tags/")) {
    return {
      present: true,
      source: "env:GITHUB_REF",
      value: githubRef.replace(/^refs\/tags\//, "")
    };
  }

  const azureRef = normalizeText(env.BUILD_SOURCEBRANCH);
  if (azureRef.startsWith("refs/tags/")) {
    return {
      present: true,
      source: "env:BUILD_SOURCEBRANCH",
      value: azureRef.replace(/^refs\/tags\//, "")
    };
  }

  const bitbucketTag = normalizeText(env.BITBUCKET_TAG);
  if (bitbucketTag) {
    return {
      present: true,
      source: "env:BITBUCKET_TAG",
      value: bitbucketTag
    };
  }

  return {
    present: false,
    source: "",
    value: ""
  };
}

function resolveManualTriggerEvidence(env) {
  if (isTruthyEnvValue(env.CI_JOB_MANUAL)) {
    return {
      present: true,
      source: "env:CI_JOB_MANUAL",
      value: "true"
    };
  }

  const githubEventName = normalizeLowerText(env.GITHUB_EVENT_NAME);
  if (githubEventName === "workflow_dispatch") {
    return {
      present: true,
      source: "env:GITHUB_EVENT_NAME",
      value: githubEventName
    };
  }

  const buildReason = normalizeLowerText(env.BUILD_REASON);
  if (buildReason === "manual") {
    return {
      present: true,
      source: "env:BUILD_REASON",
      value: buildReason
    };
  }

  return {
    present: false,
    source: "",
    value: ""
  };
}

function evaluateCiReleaseContract({ runtimeSource, env, requireManualTrigger = false }) {
  if (runtimeSource !== "ci") {
    return {
      required: false,
      allowed: true,
      status: "not-applicable",
      blockers: [],
      manualTriggerRequired: requireManualTrigger,
      explicitEnablePresent: isTruthyEnvValue(env.POWER_AI_ENABLE_HOSTED_RELEASE),
      pipelineSource: normalizeText(env.CI_PIPELINE_SOURCE || env.GITHUB_EVENT_NAME || env.BUILD_REASON),
      tagEvidence: resolveCiTagEvidence(env),
      manualTriggerEvidence: resolveManualTriggerEvidence(env)
    };
  }

  const blockers = [];
  const explicitEnablePresent = isTruthyEnvValue(env.POWER_AI_ENABLE_HOSTED_RELEASE);
  const tagEvidence = resolveCiTagEvidence(env);
  const manualTriggerEvidence = resolveManualTriggerEvidence(env);

  if (!explicitEnablePresent) {
    blockers.push({
      code: "hosted-release-not-enabled",
      message: "CI hosted release requires `POWER_AI_ENABLE_HOSTED_RELEASE=1` so the real scheduling path stays explicitly enabled."
    });
  }

  if (!tagEvidence.present) {
    blockers.push({
      code: "hosted-release-tag-required",
      message: "CI hosted release first version only allows tag-backed release jobs; no tag evidence was detected in the current runtime."
    });
  }

  if (requireManualTrigger && !manualTriggerEvidence.present) {
    blockers.push({
      code: "hosted-release-manual-trigger-required",
      message: "CI hosted release manual trigger evidence is required, but the current runtime did not expose a supported manual trigger signal."
    });
  }

  return {
    required: true,
    allowed: blockers.length === 0,
    status: blockers.length === 0 ? "ci-release-contract-allowed" : "ci-release-contract-blocked",
    blockers,
    manualTriggerRequired: requireManualTrigger,
    explicitEnablePresent,
    pipelineSource: normalizeText(env.CI_PIPELINE_SOURCE || env.GITHUB_EVENT_NAME || env.BUILD_REASON),
    tagEvidence,
    manualTriggerEvidence
  };
}

function resolveExplicitTriggerLabelEvidence(triggerLabel, env) {
  const cliTriggerLabel = normalizeText(triggerLabel);
  if (cliTriggerLabel) {
    return {
      present: true,
      source: "cli:--trigger-label",
      value: cliTriggerLabel
    };
  }

  const envTriggerLabel = normalizeText(env.POWER_AI_RELEASE_TRIGGER_LABEL);
  if (envTriggerLabel) {
    return {
      present: true,
      source: "env:POWER_AI_RELEASE_TRIGGER_LABEL",
      value: envTriggerLabel
    };
  }

  return {
    present: false,
    source: "",
    value: ""
  };
}

function evaluateCronReleaseContract({ runtimeSource, triggerLabel, env }) {
  const explicitEnablePresent = isTruthyEnvValue(env.POWER_AI_ENABLE_HOSTED_RELEASE);
  const explicitTriggerLabelEvidence = resolveExplicitTriggerLabelEvidence(triggerLabel, env);
  if (runtimeSource !== "cron") {
    return {
      required: false,
      allowed: true,
      status: "not-applicable",
      blockers: [],
      explicitEnablePresent,
      explicitTriggerLabelEvidence
    };
  }

  const blockers = [];
  if (!explicitEnablePresent) {
    blockers.push({
      code: "hosted-release-not-enabled",
      message: "Cron hosted release requires `POWER_AI_ENABLE_HOSTED_RELEASE=1` so the real scheduling path stays explicitly enabled."
    });
  }

  if (!explicitTriggerLabelEvidence.present) {
    blockers.push({
      code: "hosted-release-cron-trigger-label-required",
      message: "Cron hosted release requires an explicit trigger label via `--trigger-label` or `POWER_AI_RELEASE_TRIGGER_LABEL` so scheduled jobs remain auditable."
    });
  }

  return {
    required: true,
    allowed: blockers.length === 0,
    status: blockers.length === 0 ? "cron-release-contract-allowed" : "cron-release-contract-blocked",
    blockers,
    explicitEnablePresent,
    explicitTriggerLabelEvidence
  };
}

function buildHostedScheduleContract({
  runtimeSource,
  runtimeSourceResolution,
  requireManualTrigger = false,
  ciReleaseContract,
  cronReleaseContract
}) {
  const contractType = runtimeSource === "ci"
    ? "ci"
    : (runtimeSource === "cron" ? "cron" : "unresolved");
  const activeContract = contractType === "ci"
    ? ciReleaseContract
    : (contractType === "cron" ? cronReleaseContract : null);

  return {
    contractType,
    runtimeSource,
    runtimeSourceResolution,
    required: Boolean(activeContract?.required),
    allowed: Boolean(activeContract?.allowed),
    status: activeContract?.status || "not-applicable",
    blockers: activeContract?.blockers || [],
    requireManualTrigger,
    explicitEnablePresent: Boolean(
      activeContract?.explicitEnablePresent
      || ciReleaseContract?.explicitEnablePresent
      || cronReleaseContract?.explicitEnablePresent
    ),
    tagEvidence: ciReleaseContract?.tagEvidence || {
      present: false,
      source: "",
      value: ""
    },
    manualTriggerEvidence: ciReleaseContract?.manualTriggerEvidence || {
      present: false,
      source: "",
      value: ""
    },
    explicitTriggerLabelEvidence: cronReleaseContract?.explicitTriggerLabelEvidence || {
      present: false,
      source: "",
      value: ""
    }
  };
}

function resolveWrapperPolicy({
  runtimeSource,
  strictMode = false,
  requireManualTrigger = false,
  expectedStatuses = []
}) {
  const normalizedExpectedStatuses = Array.isArray(expectedStatuses)
    ? expectedStatuses.map((value) => normalizeLowerText(value)).filter(Boolean)
    : [];
  const resolvedRequireManualTrigger = requireManualTrigger || (strictMode && runtimeSource === "ci");
  const resolvedExpectedStatuses = normalizedExpectedStatuses.length > 0
    ? normalizedExpectedStatuses
    : (strictMode ? ["published"] : []);

  return {
    mode: strictMode ? "strict" : "default",
    strictMode,
    requireManualTrigger: resolvedRequireManualTrigger,
    requireManualTriggerSource: requireManualTrigger
      ? "cli-flag"
      : (strictMode && runtimeSource === "ci" ? "strict-default" : "default"),
    expectedStatuses: resolvedExpectedStatuses,
    expectedStatusesSource: normalizedExpectedStatuses.length > 0
      ? "cli-flag"
      : (strictMode ? "strict-default" : "default")
  };
}

function classifyFinalStatus(normalizedStatus) {
  if (!normalizedStatus) {
    return {
      classification: "unexpected",
      shouldFailByDefault: true,
      reason: "Hosted final status is missing from executor output."
    };
  }

  if (normalizedStatus === "publish-failed") {
    return {
      classification: "publish-failure",
      shouldFailByDefault: true,
      reason: "Hosted execution reached publish-failed, which means a real publish attempt failed."
    };
  }

  if (normalizedStatus === "execution-locked") {
    return {
      classification: "failure-lock",
      shouldFailByDefault: true,
      reason: "Hosted execution reached execution-locked, which means unattended publish is locked until the latest publish failure is reviewed."
    };
  }

  if (["published", "blocked", "not-authorized", "authorization-expired", "follow-up-blocked"].includes(normalizedStatus)) {
    return {
      classification: "record-only",
      shouldFailByDefault: false,
      reason: ""
    };
  }

  return {
    classification: "unexpected",
    shouldFailByDefault: true,
    reason: `Hosted final status ${normalizedStatus} is not covered by the current wrapper default policy.`
  };
}

function shouldFailWrapper(payload, expectedStatuses) {
  const normalizedStatus = normalizeLowerText(payload.hostedExecution?.status);
  if (normalizedStatus === "hosted-runtime-source-required" || normalizedStatus === "hosted-runtime-evidence-missing") {
    return {
      shouldFail: true,
      wrapperStatus: "hosted-runtime-contract-failed",
      reason: `Hosted runtime contract failed with status ${normalizedStatus}.`,
      finalStatusPolicy: {
        status: normalizedStatus,
        classification: "runtime-contract",
        shouldFailByDefault: true
      }
    };
  }

  if (expectedStatuses.length > 0 && !expectedStatuses.includes(normalizedStatus)) {
    return {
      shouldFail: true,
      wrapperStatus: "unexpected-final-status",
      reason: `Hosted final status ${normalizedStatus || "unknown"} is not in expected set: ${expectedStatuses.join(", ")}.`,
      finalStatusPolicy: {
        status: normalizedStatus,
        classification: "expected-status-override",
        shouldFailByDefault: true
      }
    };
  }

  const finalStatusPolicy = {
    status: normalizedStatus,
    ...classifyFinalStatus(normalizedStatus)
  };
  if (finalStatusPolicy.shouldFailByDefault) {
    return {
      shouldFail: true,
      wrapperStatus: "default-final-status-failed",
      reason: finalStatusPolicy.reason,
      finalStatusPolicy
    };
  }

  return {
    shouldFail: false,
    wrapperStatus: "hosted-wrapper-complete",
    reason: "",
    finalStatusPolicy
  };
}

function printAndExit(payload, exitCode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(exitCode);
}

const args = parseArgs(process.argv.slice(2));
const runtimeSourceState = resolveRuntimeSource(args.runtimeSource, process.env);
const wrapperPolicy = resolveWrapperPolicy({
  runtimeSource: runtimeSourceState.runtimeSource,
  strictMode: args.strictMode,
  requireManualTrigger: args.requireManualTrigger,
  expectedStatuses: args.expectedStatuses
});
const ciReleaseContract = evaluateCiReleaseContract({
  runtimeSource: runtimeSourceState.runtimeSource,
  env: process.env,
  requireManualTrigger: wrapperPolicy.requireManualTrigger
});
const cronReleaseContract = evaluateCronReleaseContract({
  runtimeSource: runtimeSourceState.runtimeSource,
  triggerLabel: args.triggerLabel,
  env: process.env
});
const hostedScheduleContract = buildHostedScheduleContract({
  runtimeSource: runtimeSourceState.runtimeSource,
  runtimeSourceResolution: runtimeSourceState.resolution,
  requireManualTrigger: wrapperPolicy.requireManualTrigger,
  ciReleaseContract,
  cronReleaseContract
});

if (!ciReleaseContract.allowed || !cronReleaseContract.allowed) {
  const blockers = [
    ...(ciReleaseContract.allowed ? [] : ciReleaseContract.blockers),
    ...(cronReleaseContract.allowed ? [] : cronReleaseContract.blockers)
  ];
  printAndExit({
    ok: false,
    wrapperStatus: "hosted-schedule-contract-failed",
    wrapperReason: blockers.map((item) => item.message).join(" "),
    wrapper: {
      runtimeSource: runtimeSourceState.runtimeSource,
      runtimeSourceResolution: runtimeSourceState.resolution,
      requireManualTrigger: wrapperPolicy.requireManualTrigger,
      strictMode: wrapperPolicy.strictMode,
      expectedStatuses: wrapperPolicy.expectedStatuses,
      policy: wrapperPolicy,
      ciReleaseContract,
      cronReleaseContract,
      scheduleContract: hostedScheduleContract
    }
  }, 1);
}

const hostedCommandArgs = buildHostedCommandArgs({
  runtimeSource: runtimeSourceState.runtimeSource,
  triggerId: args.triggerId,
  triggerLabel: args.triggerLabel
});
const childResult = spawnSync(process.execPath, hostedCommandArgs, {
  cwd: root,
  encoding: "utf8",
  env: process.env
});
const stdout = safeTrim(childResult.stdout);
const stderr = safeTrim(childResult.stderr) || childResult.error?.message || "";
const hostedExecution = stdout ? parseHostedPayload(stdout) : null;

if (!hostedExecution || hostedExecution.__parseError) {
  printAndExit({
    ok: false,
    wrapperStatus: "hosted-wrapper-child-invalid-json",
    error: hostedExecution?.__parseError || "Hosted executor returned empty stdout.",
    wrapper: {
      runtimeSource: runtimeSourceState.runtimeSource,
      runtimeSourceResolution: runtimeSourceState.resolution,
      requireManualTrigger: wrapperPolicy.requireManualTrigger,
      strictMode: wrapperPolicy.strictMode,
      expectedStatuses: wrapperPolicy.expectedStatuses,
      policy: wrapperPolicy,
      ciReleaseContract,
      cronReleaseContract,
      scheduleContract: hostedScheduleContract,
      invocationPreview: buildInvocationPreview(hostedCommandArgs)
    },
    childProcess: {
      exitCode: childResult.status,
      stdout,
      stderr
    }
  }, 1);
}

if (childResult.status !== 0) {
  printAndExit({
    ok: false,
    wrapperStatus: "hosted-wrapper-child-failed",
    error: "Hosted executor process failed.",
    wrapper: {
      runtimeSource: runtimeSourceState.runtimeSource,
      runtimeSourceResolution: runtimeSourceState.resolution,
      requireManualTrigger: wrapperPolicy.requireManualTrigger,
      strictMode: wrapperPolicy.strictMode,
      expectedStatuses: wrapperPolicy.expectedStatuses,
      policy: wrapperPolicy,
      ciReleaseContract,
      cronReleaseContract,
      scheduleContract: hostedScheduleContract,
      invocationPreview: buildInvocationPreview(hostedCommandArgs)
    },
    childProcess: {
      exitCode: childResult.status,
      stdout,
      stderr
    },
    hostedExecution
  }, 1);
}

const wrapperDecision = shouldFailWrapper({
  hostedExecution
}, wrapperPolicy.expectedStatuses);

printAndExit({
  ok: !wrapperDecision.shouldFail,
  wrapperStatus: wrapperDecision.wrapperStatus,
  wrapperReason: wrapperDecision.reason,
  wrapper: {
    runtimeSource: runtimeSourceState.runtimeSource,
    runtimeSourceResolution: runtimeSourceState.resolution,
    requireManualTrigger: wrapperPolicy.requireManualTrigger,
    strictMode: wrapperPolicy.strictMode,
    expectedStatuses: wrapperPolicy.expectedStatuses,
    policy: wrapperPolicy,
    ciReleaseContract,
    cronReleaseContract,
    scheduleContract: hostedScheduleContract,
    finalStatusPolicy: wrapperDecision.finalStatusPolicy,
    invocationPreview: buildInvocationPreview(hostedCommandArgs)
  },
  childProcess: {
    exitCode: childResult.status,
    stderr
  },
  hostedExecution
}, wrapperDecision.shouldFail ? 1 : 0);
