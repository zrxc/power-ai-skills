import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifyConsumerScriptPath = path.join(root, "scripts", "verify-consumer.mjs");
const manifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(root, "manifest"));
const defaultMatrixJsonPath = path.join(manifestDir, "consumer-compatibility-matrix.json");
const defaultMatrixMarkdownPath = path.join(manifestDir, "consumer-compatibility-matrix.md");

function parseArgs(argv) {
  const optionValueFlags = new Set([
    "--commands",
    "--profile",
    "--tool",
    "--fixture",
    "--matrix-json",
    "--matrix-markdown"
  ]);
  let hasProjectTarget = false;
  let hasFixture = false;
  let hasMatrixJson = false;
  let hasMatrixMarkdown = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--fixture") {
      hasFixture = true;
      index += 1;
      continue;
    }

    if (token === "--matrix-json") {
      hasMatrixJson = true;
      index += 1;
      continue;
    }

    if (token === "--matrix-markdown") {
      hasMatrixMarkdown = true;
      index += 1;
      continue;
    }

    if (optionValueFlags.has(token)) {
      index += 1;
      continue;
    }

    if (!token.startsWith("--")) {
      hasProjectTarget = true;
    }
  }

  return {
    argv: [...argv],
    hasFixture,
    hasProjectTarget,
    hasMatrixJson,
    hasMatrixMarkdown
  };
}

const parsed = parseArgs(process.argv.slice(2));
const verifyArgs = [...parsed.argv];

if (!parsed.hasFixture && !parsed.hasProjectTarget) {
  verifyArgs.push("--fixture", "basic");
}

if (!parsed.hasMatrixJson) {
  verifyArgs.push("--matrix-json", defaultMatrixJsonPath);
}

if (!parsed.hasMatrixMarkdown) {
  verifyArgs.push("--matrix-markdown", defaultMatrixMarkdownPath);
}

const result = spawnSync(process.execPath, [verifyConsumerScriptPath, ...verifyArgs], {
  cwd: root,
  encoding: "utf8"
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}
