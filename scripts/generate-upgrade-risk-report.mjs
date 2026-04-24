import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildUpgradeRiskMarkdown, buildUpgradeRiskReport } from "../src/upgrade-risk/index.mjs";
import { readJson, writeJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const manifestDir = path.join(root, "manifest");
const defaultChangedFilesPath = path.join(manifestDir, "changed-files.txt");
const defaultImpactReportPath = path.join(manifestDir, "impact-report.json");
const defaultJsonOutputPath = path.join(manifestDir, "upgrade-risk-report.json");
const defaultMarkdownOutputPath = path.join(manifestDir, "upgrade-risk-report.md");

function printUsageAndExit() {
  console.log("用法：node ./scripts/generate-upgrade-risk-report.mjs [--changed-files manifest/changed-files.txt] [--impact-report manifest/impact-report.json]");
  console.log("可选参数：--json-output manifest/upgrade-risk-report.json --markdown-output manifest/upgrade-risk-report.md");
  process.exit(0);
}

function parseArgs(argv) {
  if (argv.includes("--help")) {
    printUsageAndExit();
  }

  const getValue = (flagName, defaultValue) => {
    const index = argv.indexOf(flagName);
    return path.resolve(index === -1 ? defaultValue : argv[index + 1] || defaultValue);
  };

  return {
    changedFilesPath: getValue("--changed-files", defaultChangedFilesPath),
    impactReportPath: getValue("--impact-report", defaultImpactReportPath),
    jsonOutputPath: getValue("--json-output", defaultJsonOutputPath),
    markdownOutputPath: getValue("--markdown-output", defaultMarkdownOutputPath)
  };
}

function readChangedFiles(filePath) {
  if (!fs.existsSync(filePath)) return [];

  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const args = parseArgs(process.argv.slice(2));
const impactReport = fs.existsSync(args.impactReportPath) ? readJson(args.impactReportPath) : null;
const changedFiles = readChangedFiles(args.changedFilesPath);
const effectiveChangedFiles = changedFiles.length > 0 ? changedFiles : (impactReport?.changedFiles || []);

if (effectiveChangedFiles.length === 0) {
  console.error("[generate-upgrade-risk-report] 未找到可用于风险分级的 changed files，请先生成 manifest/changed-files.txt 或 impact-report.json");
  process.exit(1);
}

const report = buildUpgradeRiskReport({
  packageName: packageJson.name,
  version: packageJson.version,
  changedFiles: effectiveChangedFiles,
  impactReport
});

writeJson(args.jsonOutputPath, report);
fs.writeFileSync(args.markdownOutputPath, buildUpgradeRiskMarkdown(report), "utf8");

console.log(JSON.stringify({
  packageName: packageJson.name,
  version: packageJson.version,
  changedFilesPath: args.changedFilesPath,
  impactReportPath: impactReport ? args.impactReportPath : "",
  jsonOutputPath: args.jsonOutputPath,
  markdownOutputPath: args.markdownOutputPath,
  overallRiskLevel: report.overallRiskLevel,
  overallReleaseHint: report.overallReleaseHint,
  categoryCount: report.categories.length
}, null, 2));
