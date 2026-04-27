import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readJson, safeTrim } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const consistencyScriptPath = path.join(root, "scripts", "check-release-consistency.mjs");
const releaseConsumerInputsScriptPath = path.join(root, "scripts", "release-consumer-inputs.mjs");
const releaseGatesScriptPath = path.join(root, "scripts", "check-release-gates.mjs");

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env: process.env
  });

  return {
    ok: result.status === 0,
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdout: safeTrim(result.stdout),
    stderr: safeTrim(result.stderr),
    error: result.error?.message || ""
  };
}

function parseJson(stdout) {
  if (!stdout) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

const steps = [
  {
    id: "prerequisite-artifacts",
    scriptPath: consistencyScriptPath,
    args: [
      "--require-release-notes",
      "--require-impact-report",
      "--require-risk-report",
      "--require-automation-report",
      "--require-notification-payload"
    ]
  },
  {
    id: "consumer-release-inputs",
    scriptPath: releaseConsumerInputsScriptPath,
    args: []
  },
  {
    id: "release-gates",
    scriptPath: releaseGatesScriptPath,
    args: [
      "--require-consumer-matrix"
    ]
  },
  {
    id: "final-release-consistency",
    scriptPath: consistencyScriptPath,
    args: [
      "--require-release-notes",
      "--require-impact-report",
      "--require-risk-report",
      "--require-consumer-matrix",
      "--require-release-gate",
      "--require-governance-operations",
      "--require-upgrade-advice",
      "--require-automation-report",
      "--require-notification-payload"
    ]
  }
];

const results = [];

for (const step of steps) {
  const result = runNodeScript(step.scriptPath, step.args);
  const parsedPayload = parseJson(result.stdout);
  results.push({
    id: step.id,
    ok: result.ok,
    exitCode: result.exitCode,
    summary: parsedPayload
      ? {
          overallStatus: parsedPayload.overallStatus || "",
          overallOk: parsedPayload.overallOk ?? null,
          ok: parsedPayload.ok ?? null,
          matrixJsonPath: parsedPayload.matrixJsonPath || "",
          matrixMarkdownPath: parsedPayload.matrixMarkdownPath || "",
          outputPath: parsedPayload.outputPath || "",
          markdownPath: parsedPayload.markdownPath || "",
          reports: Array.isArray(parsedPayload.reports) ? parsedPayload.reports.length : undefined
        }
      : null,
    stdout: parsedPayload ? "" : result.stdout,
    stderr: result.stderr,
    error: result.error
  });

  if (!result.ok) {
    console.error(result.stderr || result.stdout || result.error || `Step failed: ${step.id}`);
    process.exit(result.exitCode);
  }
}

console.log(JSON.stringify({
  packageName: packageJson.name,
  version: packageJson.version,
  ok: true,
  steps: results
}, null, 2));
