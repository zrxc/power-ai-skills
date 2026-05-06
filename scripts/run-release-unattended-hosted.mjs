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
  console.log("用法：node ./scripts/run-release-unattended-hosted.mjs [--runtime-source ci|cron] [--trigger-id <id>] [--trigger-label <label>] [--expect-status <status>]");
  console.log("说明：");
  console.log("- 这是维护侧 hosted 调用壳，会代理到 execute-release-unattended-hosted。");
  console.log("- 未显式提供 --runtime-source 时，会优先读取 POWER_AI_RELEASE_RUNTIME_SOURCE，再尝试从 CI / POWER_AI_RELEASE_CRON 推断。");
  console.log("- 默认只把 hosted runtime contract 问题视为失败；如需把最终状态收口为 published，可追加 --expect-status published。");
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

function shouldFailWrapper(payload, expectedStatuses) {
  const normalizedStatus = normalizeLowerText(payload.hostedExecution?.status);
  if (normalizedStatus === "hosted-runtime-source-required" || normalizedStatus === "hosted-runtime-evidence-missing") {
    return {
      shouldFail: true,
      wrapperStatus: "hosted-runtime-contract-failed",
      reason: `Hosted runtime contract failed with status ${normalizedStatus}.`
    };
  }

  if (expectedStatuses.length > 0 && !expectedStatuses.includes(normalizedStatus)) {
    return {
      shouldFail: true,
      wrapperStatus: "unexpected-final-status",
      reason: `Hosted final status ${normalizedStatus || "unknown"} is not in expected set: ${expectedStatuses.join(", ")}.`
    };
  }

  return {
    shouldFail: false,
    wrapperStatus: "hosted-wrapper-complete",
    reason: ""
  };
}

function printAndExit(payload, exitCode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(exitCode);
}

const args = parseArgs(process.argv.slice(2));
const runtimeSourceState = resolveRuntimeSource(args.runtimeSource, process.env);
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
      expectedStatuses: args.expectedStatuses,
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
      expectedStatuses: args.expectedStatuses,
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
}, args.expectedStatuses);

printAndExit({
  ok: !wrapperDecision.shouldFail,
  wrapperStatus: wrapperDecision.wrapperStatus,
  wrapperReason: wrapperDecision.reason,
  wrapper: {
    runtimeSource: runtimeSourceState.runtimeSource,
    runtimeSourceResolution: runtimeSourceState.resolution,
    expectedStatuses: args.expectedStatuses,
    invocationPreview: buildInvocationPreview(hostedCommandArgs)
  },
  childProcess: {
    exitCode: childResult.status,
    stderr
  },
  hostedExecution
}, wrapperDecision.shouldFail ? 1 : 0);
