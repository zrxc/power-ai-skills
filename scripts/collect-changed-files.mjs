/**
 * 变更文件收集脚本
 * 目标：
 * 1. 在 CI 或本地环境中，统一从 git diff 提取变更文件列表；
 * 2. 让上游组件库仓库不必手写平台相关的 diff 命令；
 * 3. 输出标准文本文件，供 impact-check 和自动化总控脚本继续使用。
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ensureDir, readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const defaultOutputPath = path.join(root, "manifest", "changed-files.txt");

function printUsageAndExit() {
  console.log("用法：node ./scripts/collect-changed-files.mjs --base <git-base> --head <git-head>");
  console.log("可选参数：--repo <git-repo-path> --output <output-file>");
  process.exit(0);
}

function parseArgs(argv) {
  if (argv.length === 0) {
    printUsageAndExit();
  }

  const getValue = (flagName) => {
    const index = argv.indexOf(flagName);
    return index === -1 ? "" : argv[index + 1] || "";
  };

  const base = getValue("--base");
  const head = getValue("--head");
  const repoPath = getValue("--repo") || process.cwd();
  const outputPath = path.resolve(getValue("--output") || defaultOutputPath);

  if (!base || !head) {
    console.error("[collect-changed-files] 必须同时提供 --base 和 --head");
    process.exit(1);
  }

  return {
    base,
    head,
    repoPath: path.resolve(repoPath),
    outputPath
  };
}

/**
 * 统一走 git diff --name-only，避免不同 CI 平台各写一套 shell。
 * 如果仓库路径不对，或 base/head 无效，会把 stderr 原样打出来，方便排查。
 */
function collectChangedFiles({ base, head, repoPath }) {
  const result = spawnSync("git", ["diff", "--name-only", base, head], {
    cwd: repoPath,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const args = parseArgs(process.argv.slice(2));
const changedFiles = collectChangedFiles(args);

ensureDir(path.dirname(args.outputPath));
fs.writeFileSync(args.outputPath, changedFiles.join("\n"), "utf8");

console.log(JSON.stringify({
  packageName: packageJson.name,
  version: packageJson.version,
  repoPath: args.repoPath,
  base: args.base,
  head: args.head,
  outputPath: args.outputPath,
  changedFileCount: changedFiles.length
}, null, 2));
