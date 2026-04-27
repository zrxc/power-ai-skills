import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  copyDir,
  ensureDir,
  findSkillDirectories,
  readJson,
  removeDirIfExists,
  safeTrim,
  summarizeSpawnFailure,
  walkDirectories,
  writeJson
} from "../src/shared/fs.mjs";

export {
  copyDir,
  ensureDir,
  findSkillDirectories,
  readJson,
  removeDirIfExists,
  safeTrim,
  summarizeSpawnFailure,
  walkDirectories,
  writeJson
};

export function resolveNpmCliPath(rootDir) {
  const candidates = [
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(rootDir, "node_modules", "npm", "bin", "npm-cli.js")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

export function runNpmPackJson(rootDir, args = []) {
  const npmCliPath = resolveNpmCliPath(rootDir);
  if (!npmCliPath) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: "",
      error: "Could not locate npm-cli.js for npm pack."
    };
  }

  const result = spawnSync(process.execPath, [npmCliPath, "pack", "--json", ...args], {
    cwd: rootDir,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return {
      ok: false,
      status: typeof result.status === "number" ? result.status : 1,
      stdout: safeTrim(result.stdout),
      stderr: safeTrim(result.stderr),
      error: result.error?.message || ""
    };
  }

  try {
    return {
      ok: true,
      status: 0,
      stdout: safeTrim(result.stdout),
      stderr: safeTrim(result.stderr),
      error: "",
      payload: JSON.parse(result.stdout)
    };
  } catch (error) {
    return {
      ok: false,
      status: 1,
      stdout: safeTrim(result.stdout),
      stderr: safeTrim(result.stderr),
      error: `Could not parse npm pack output: ${error.message}`
    };
  }
}
