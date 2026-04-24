/**
 * 升级自动化总控脚本
 * 目标：
 * 1. 把 collect-changed-files、impact-check、generate-impact-task、verify-consumer 串成一条标准流水线；
 * 2. 让上游组件库仓库和发布流水线只调用一个脚本，就能得到完整产物；
 * 3. 输出统一的 automation-report.json，便于后续接消息通知或平台 API。
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildUpgradeRiskMarkdown, buildUpgradeRiskReport } from "../src/upgrade-risk/index.mjs";
import { ensureDir, readJson, writeJson, safeTrim } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const manifestDir = path.join(root, "manifest");
const defaultChangedFilesPath = path.join(manifestDir, "changed-files.txt");
const defaultImpactReportPath = path.join(manifestDir, "impact-report.json");
const defaultAutomationReportPath = path.join(manifestDir, "automation-report.json");
const defaultRiskReportPath = path.join(manifestDir, "upgrade-risk-report.json");
const defaultRiskMarkdownPath = path.join(manifestDir, "upgrade-risk-report.md");
const defaultConsumerMatrixPath = path.join(manifestDir, "consumer-compatibility-matrix.json");
const defaultConsumerMatrixMarkdownPath = path.join(manifestDir, "consumer-compatibility-matrix.md");

const scripts = {
  collectChangedFiles: path.join(root, "scripts", "collect-changed-files.mjs"),
  impactCheck: path.join(root, "scripts", "impact-check.mjs"),
  generateImpactTask: path.join(root, "scripts", "generate-impact-task.mjs"),
  verifyConsumer: path.join(root, "scripts", "verify-consumer.mjs")
};

function printUsageAndExit() {
  console.log("用法：node ./scripts/run-upgrade-automation.mjs --base <git-base> --head <git-head>");
  console.log("可选参数：--repo <git-repo-path> --consumer <project-path> --consumer <project-path> --skip-consumer");
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

  const collectAllValues = (flagName) => {
    const values = [];
    for (let index = 0; index < argv.length; index += 1) {
      if (argv[index] === flagName && argv[index + 1]) {
        values.push(argv[index + 1]);
      }
    }
    return values;
  };

  const base = getValue("--base");
  const head = getValue("--head");
  const repoPath = path.resolve(getValue("--repo") || process.cwd());
  const changedFilesPath = path.resolve(getValue("--changed-files") || defaultChangedFilesPath);
  const impactReportPath = path.resolve(getValue("--impact-report") || defaultImpactReportPath);
  const automationReportPath = path.resolve(getValue("--output") || defaultAutomationReportPath);
  const riskReportPath = path.resolve(getValue("--risk-report") || defaultRiskReportPath);
  const riskMarkdownPath = path.resolve(getValue("--risk-markdown") || defaultRiskMarkdownPath);
  const consumerMatrixPath = path.resolve(getValue("--consumer-matrix-json") || defaultConsumerMatrixPath);
  const consumerMatrixMarkdownPath = path.resolve(getValue("--consumer-matrix-markdown") || defaultConsumerMatrixMarkdownPath);
  const consumers = collectAllValues("--consumer").map((value) => path.resolve(value));
  const skipConsumer = argv.includes("--skip-consumer");

  if ((!base || !head) && !fs.existsSync(changedFilesPath)) {
    console.error("[run-upgrade-automation] 未提供 --base/--head，且不存在可复用的 changed-files.txt");
    process.exit(1);
  }

  return {
    base,
    head,
    repoPath,
    changedFilesPath,
    impactReportPath,
    automationReportPath,
    riskReportPath,
    riskMarkdownPath,
    consumerMatrixPath,
    consumerMatrixMarkdownPath,
    consumers,
    skipConsumer
  };
}

/**
 * 运行子脚本并返回结构化结果。
 * 这里保留 stdout/stderr，后续可以直接挂到 automation-report.json 中，方便流水线追踪。
 */
function runNodeScript(scriptPath, args, options = {}) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd || root,
    encoding: "utf8"
  });

  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: safeTrim(result.stdout),
    stderr: safeTrim(result.stderr) || result.error?.message || ""
  };
}

/**
 * 如果 changed-files.txt 不存在，就先根据 git base/head 自动生成。
 * 如果已经存在，则直接复用，避免同一流水线里多次计算 diff。
 */
function ensureChangedFiles(args) {
  if (fs.existsSync(args.changedFilesPath)) {
    return {
      source: "existing-file",
      path: args.changedFilesPath
    };
  }

  const collectResult = runNodeScript(scripts.collectChangedFiles, [
    "--base", args.base,
    "--head", args.head,
    "--repo", args.repoPath,
    "--output", args.changedFilesPath
  ]);

  if (!collectResult.ok) {
    console.error(collectResult.stderr || collectResult.stdout);
    process.exit(collectResult.exitCode || 1);
  }

  return {
    source: "generated",
    path: args.changedFilesPath,
    commandResult: collectResult
  };
}

function runImpactCheck(changedFilesPath, impactReportPath) {
  const changedFiles = fs.readFileSync(changedFilesPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const result = runNodeScript(scripts.impactCheck, changedFiles);
  if (!result.ok) {
    console.error(result.stderr || result.stdout);
    process.exit(result.exitCode || 1);
  }

  ensureDir(path.dirname(impactReportPath));
  fs.writeFileSync(impactReportPath, `${result.stdout}\n`, "utf8");
  return {
    changedFiles,
    reportPath: impactReportPath,
    commandResult: result,
    report: JSON.parse(result.stdout)
  };
}

function runImpactTask(impactReportPath) {
  const result = runNodeScript(scripts.generateImpactTask, ["--report", impactReportPath]);
  if (!result.ok) {
    console.error(result.stderr || result.stdout);
    process.exit(result.exitCode || 1);
  }

  return {
    commandResult: result,
    payload: JSON.parse(result.stdout)
  };
}

function writeUpgradeRiskArtifacts(changedFiles, impactReport, riskReportPath, riskMarkdownPath) {
  const report = buildUpgradeRiskReport({
    packageName: packageJson.name,
    version: packageJson.version,
    changedFiles,
    impactReport
  });

  writeJson(riskReportPath, report);
  ensureDir(path.dirname(riskMarkdownPath));
  fs.writeFileSync(riskMarkdownPath, buildUpgradeRiskMarkdown(report), "utf8");

  return {
    report,
    reportPath: riskReportPath,
    markdownPath: riskMarkdownPath
  };
}

function runConsumerVerification(consumers, skipConsumer, matrixJsonPath, matrixMarkdownPath) {
  if (skipConsumer || consumers.length === 0) {
    return {
      skipped: true,
      reason: skipConsumer ? "显式传入 --skip-consumer" : "未传入消费项目路径"
    };
  }

  const result = runNodeScript(scripts.verifyConsumer, [
    ...consumers,
    "--matrix-json", matrixJsonPath,
    "--matrix-markdown", matrixMarkdownPath
  ]);
  if (!result.ok) {
    return {
      skipped: false,
      ok: false,
      commandResult: result,
      report: JSON.parse(result.stdout || "{}")
    };
  }

  return {
    skipped: false,
    ok: true,
    commandResult: result,
    report: JSON.parse(result.stdout)
  };
}

const args = parseArgs(process.argv.slice(2));
const changedFilesState = ensureChangedFiles(args);
const impactState = runImpactCheck(changedFilesState.path, args.impactReportPath);
const riskState = writeUpgradeRiskArtifacts(
  impactState.changedFiles,
  impactState.report,
  args.riskReportPath,
  args.riskMarkdownPath
);
const taskState = runImpactTask(args.impactReportPath);
const consumerState = runConsumerVerification(
  args.consumers,
  args.skipConsumer,
  args.consumerMatrixPath,
  args.consumerMatrixMarkdownPath
);

const automationReport = {
  packageName: packageJson.name,
  version: packageJson.version,
  repoPath: args.repoPath,
  changedFilesPath: changedFilesState.path,
  impactReportPath: impactState.reportPath,
  riskReportPath: riskState.reportPath,
  riskMarkdownPath: riskState.markdownPath,
  impactTaskPath: taskState.payload.outputPath,
  consumerVerification: consumerState,
  consumerCompatibilityMatrixPath: consumerState.report?.matrixJsonPath || "",
  consumerCompatibilityMatrixMarkdownPath: consumerState.report?.matrixMarkdownPath || "",
  summary: {
    changedFileCount: impactState.changedFiles.length,
    affectedDomainCount: impactState.report.affectedDomainCount,
    affectedSkillCount: impactState.report.affectedSkillCount,
    recommendedReleaseLevel: riskState.report.overallReleaseHint,
    impactRecommendedReleaseLevel: impactState.report.recommendedReleaseLevel,
    overallRiskLevel: riskState.report.overallRiskLevel,
    riskCategoryCount: riskState.report.categories.length,
    consumerMatrixScenarioCount: consumerState.report?.matrix?.summary?.totalScenarios || 0,
    consumerMatrixPassedCount: consumerState.report?.matrix?.summary?.passedScenarios || 0,
    consumerMatrixFailedCount: consumerState.report?.matrix?.summary?.failedScenarios || 0
  }
};

writeJson(args.automationReportPath, automationReport);

console.log(JSON.stringify({
  packageName: packageJson.name,
  version: packageJson.version,
  automationReportPath: args.automationReportPath,
  changedFilesPath: changedFilesState.path,
  impactReportPath: impactState.reportPath,
  riskReportPath: riskState.reportPath,
  riskMarkdownPath: riskState.markdownPath,
  impactTaskPath: taskState.payload.outputPath,
  consumerVerificationSkipped: consumerState.skipped === true,
  consumerCompatibilityMatrixPath: consumerState.report?.matrixJsonPath || "",
  overallRiskLevel: riskState.report.overallRiskLevel,
  overallReleaseHint: riskState.report.overallReleaseHint
}, null, 2));
