/**
 * 发布产物一致性校验脚本
 * 目标：
 * 1. 校验 package.json 与当前 manifest 产物的版本和包名是否一致；
 * 2. 把“旧版本产物残留”转成显式失败，避免错误带入发布流程；
 * 3. 支持按需要求 release notes / impact / automation 等产物必须存在。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const manifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(root, "manifest"));

const canonicalArtifacts = {
  skillsManifest: path.join(manifestDir, "skills-manifest.json"),
  versionRecord: path.join(manifestDir, "version-record.json"),
  impactReport: path.join(manifestDir, "impact-report.json"),
  upgradeRiskReport: path.join(manifestDir, "upgrade-risk-report.json"),
  upgradeRiskMarkdown: path.join(manifestDir, "upgrade-risk-report.md"),
  consumerCompatibilityMatrix: path.join(manifestDir, "consumer-compatibility-matrix.json"),
  consumerCompatibilityMatrixMarkdown: path.join(manifestDir, "consumer-compatibility-matrix.md"),
  releaseGateReport: path.join(manifestDir, "release-gate-report.json"),
  releaseGateMarkdown: path.join(manifestDir, "release-gate-report.md"),
  governanceOperationsReport: path.join(manifestDir, "governance-operations-report.json"),
  governanceOperationsMarkdown: path.join(manifestDir, "governance-operations-report.md"),
  upgradeAdvicePackage: path.join(manifestDir, "upgrade-advice-package.json"),
  upgradeAdvicePackageMarkdown: path.join(manifestDir, "upgrade-advice-package.md"),
  automationReport: path.join(manifestDir, "automation-report.json"),
  releaseNotes: path.join(manifestDir, `release-notes-${packageJson.version}.md`),
  notificationsDir: path.join(manifestDir, "notifications")
};

function fail(message) {
  console.error(`[check-release-consistency] ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  return {
    requireReleaseNotes: argv.includes("--require-release-notes"),
    requireImpactReport: argv.includes("--require-impact-report"),
    requireRiskReport: argv.includes("--require-risk-report"),
    requireConsumerMatrix: argv.includes("--require-consumer-matrix"),
    requireReleaseGate: argv.includes("--require-release-gate"),
    requireGovernanceOperations: argv.includes("--require-governance-operations"),
    requireUpgradeAdvice: argv.includes("--require-upgrade-advice"),
    requireAutomationReport: argv.includes("--require-automation-report"),
    requireNotificationPayload: argv.includes("--require-notification-payload")
  };
}

function shouldValidateArtifact(filePath, required) {
  if (required) {
    if (!fs.existsSync(filePath)) {
      fail(`缺少必需产物：${path.relative(root, filePath)}`);
      return false;
    }
    return true;
  }

  return fs.existsSync(filePath);
}

function validateVersionedJsonArtifact(filePath, label, requiredKeys = []) {
  let data;
  try {
    data = readJson(filePath);
  } catch (error) {
    fail(`${label} 不是合法 JSON：${path.relative(root, filePath)}，${error.message}`);
    return null;
  }

  if (data.packageName !== packageJson.name) {
    fail(`${label} 的 packageName 与 package.json 不一致：${data.packageName} !== ${packageJson.name}`);
  }

  if (data.version !== packageJson.version) {
    fail(`${label} 的 version 与 package.json 不一致：${data.version} !== ${packageJson.version}`);
  }

  for (const key of requiredKeys) {
    if (!(key in data)) {
      fail(`${label} 缺少必需字段：${key}`);
    }
  }

  return data;
}

function validateReleaseNotes(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  if (!content.includes(`# Release Notes ${packageJson.version}`)) {
    fail(`发布说明缺少当前版本标题：${path.relative(root, filePath)}`);
  }

  if (!content.includes(`- 包名：\`${packageJson.name}\``)) {
    fail(`发布说明缺少当前包名：${path.relative(root, filePath)}`);
  }

  if (!content.includes(`- 版本：\`${packageJson.version}\``)) {
    fail(`发布说明缺少当前版本号：${path.relative(root, filePath)}`);
  }
}

function validateVersionRecord(filePath) {
  const record = validateVersionedJsonArtifact(filePath, "version-record.json", ["recordedAt", "artifacts"]);
  if (!record) return;

  if (!record.artifacts || typeof record.artifacts !== "object") {
    fail("version-record.json 缺少 artifacts 对象");
    return;
  }

  const requiredPaths = [
    ["skillsManifestPath", canonicalArtifacts.skillsManifest],
    ["releaseNotesPath", canonicalArtifacts.releaseNotes],
    ["versionRecordPath", canonicalArtifacts.versionRecord]
  ];

  for (const [key, expectedPath] of requiredPaths) {
    if (record.artifacts[key] !== expectedPath) {
      fail(`version-record.json 的 ${key} 与当前产物不一致：${record.artifacts[key]} !== ${expectedPath}`);
      continue;
    }

    if (!fs.existsSync(expectedPath)) {
      fail(`version-record.json 记录的产物不存在：${record.artifacts[key]}`);
    }
  }

  const optionalPaths = [
    "impactReportPath",
    "upgradeRiskReportPath",
    "upgradeRiskMarkdownPath",
    "promotionTraceReportPath",
    "promotionTraceMarkdownPath",
    "consumerCompatibilityMatrixPath",
    "consumerCompatibilityMatrixMarkdownPath",
    "releaseGateReportPath",
    "releaseGateMarkdownPath",
    "governanceOperationsReportPath",
    "governanceOperationsMarkdownPath",
    "upgradeAdvicePackagePath",
    "upgradeAdvicePackageMarkdownPath",
    "automationReportPath",
    "notificationJsonPath",
    "notificationMarkdownPath"
  ];

  for (const key of optionalPaths) {
    const artifactPath = record.artifacts[key];
    if (!artifactPath) continue;
    if (!fs.existsSync(artifactPath)) {
      fail(`version-record.json 记录的可选产物不存在：${artifactPath}`);
    }
  }
}

function validateAutomationReport(report) {
  if (!report.summary || typeof report.summary !== "object") {
    fail("automation-report.json 缺少 summary");
  }

  if (!report.riskReportPath) {
    fail("automation-report.json 缺少 riskReportPath");
  }

  if (!report.riskMarkdownPath) {
    fail("automation-report.json 缺少 riskMarkdownPath");
  }

  if (report.impactReportPath) {
    const resolvedImpactReportPath = path.resolve(report.impactReportPath);
    if (!fs.existsSync(resolvedImpactReportPath)) {
      fail(`automation-report.json 指向的 impact report 不存在：${report.impactReportPath}`);
      return;
    }

    const impactReport = validateVersionedJsonArtifact(
      resolvedImpactReportPath,
      "automation-report 关联的 impact-report",
      ["changedFiles"]
    );
    if (!impactReport) return;
  }

  if (report.riskReportPath) {
    const resolvedRiskReportPath = path.resolve(report.riskReportPath);
    if (!fs.existsSync(resolvedRiskReportPath)) {
      fail(`automation-report.json 指向的 risk report 不存在：${report.riskReportPath}`);
      return;
    }

    validateUpgradeRiskReport(resolvedRiskReportPath, report.riskMarkdownPath || "");
  }

  if (report.consumerCompatibilityMatrixPath) {
    const resolvedMatrixPath = path.resolve(report.consumerCompatibilityMatrixPath);
    if (!fs.existsSync(resolvedMatrixPath)) {
      fail(`automation-report.json 指向的 consumer compatibility matrix 不存在：${report.consumerCompatibilityMatrixPath}`);
      return;
    }

    validateConsumerCompatibilityMatrix(
      resolvedMatrixPath,
      report.consumerCompatibilityMatrixMarkdownPath || ""
    );
  }

  if (!("overallRiskLevel" in report.summary)) {
    fail("automation-report.json summary 缺少 overallRiskLevel");
  }

  if (!("riskCategoryCount" in report.summary)) {
    fail("automation-report.json summary 缺少 riskCategoryCount");
  }
}

function validateConsumerCompatibilityMatrix(filePath, markdownPath = "") {
  const matrix = validateVersionedJsonArtifact(
    filePath,
    "consumer-compatibility-matrix.json",
    ["summary", "dimensions", "scenarios"]
  );
  if (!matrix) return null;

  if (!Array.isArray(matrix.scenarios)) {
    fail("consumer-compatibility-matrix.json 的 scenarios 必须是数组");
  }

  const resolvedMarkdownPath = markdownPath ? path.resolve(markdownPath) : canonicalArtifacts.consumerCompatibilityMatrixMarkdown;
  if (!fs.existsSync(resolvedMarkdownPath)) {
    fail(`consumer-compatibility-matrix 缺少对应 markdown 文件：${path.relative(root, resolvedMarkdownPath)}`);
    return matrix;
  }

  const markdownContent = fs.readFileSync(resolvedMarkdownPath, "utf8");
  if (!markdownContent.includes("# Consumer Compatibility Matrix")) {
    fail(`consumer-compatibility-matrix markdown 缺少标题：${path.relative(root, resolvedMarkdownPath)}`);
  }

  return matrix;
}

function validateUpgradeRiskReport(filePath, markdownPath = "") {
  const report = validateVersionedJsonArtifact(
    filePath,
    "upgrade-risk-report.json",
    ["overallRiskLevel", "overallReleaseHint", "summary", "categories", "recommendedActions"]
  );
  if (!report) return null;

  if (!Array.isArray(report.categories)) {
    fail("upgrade-risk-report.json 的 categories 必须是数组");
  }

  if (!Array.isArray(report.recommendedActions)) {
    fail("upgrade-risk-report.json 的 recommendedActions 必须是数组");
  }

  const resolvedMarkdownPath = markdownPath ? path.resolve(markdownPath) : canonicalArtifacts.upgradeRiskMarkdown;
  if (!fs.existsSync(resolvedMarkdownPath)) {
    fail(`upgrade-risk-report 缺少对应 markdown 文件：${path.relative(root, resolvedMarkdownPath)}`);
    return report;
  }

  const markdownContent = fs.readFileSync(resolvedMarkdownPath, "utf8");
  if (!markdownContent.includes(`# Upgrade Risk Report`)) {
    fail(`upgrade-risk-report markdown 缺少标题：${path.relative(root, resolvedMarkdownPath)}`);
  }

  if (!markdownContent.includes(`- overall risk: \`${report.overallRiskLevel}\``)) {
    fail(`upgrade-risk-report markdown 缺少当前风险等级：${path.relative(root, resolvedMarkdownPath)}`);
  }

  return report;
}

function validateReleaseGateReport(filePath, markdownPath = "") {
  const report = validateVersionedJsonArtifact(
    filePath,
    "release-gate-report.json",
    ["overallStatus", "summary", "gates", "recommendedActions"]
  );
  if (!report) return null;

  if (!Array.isArray(report.gates)) {
    fail("release-gate-report.json 的 gates 必须是数组");
  }

  if (!Array.isArray(report.recommendedActions)) {
    fail("release-gate-report.json 的 recommendedActions 必须是数组");
  }

  const resolvedMarkdownPath = markdownPath ? path.resolve(markdownPath) : canonicalArtifacts.releaseGateMarkdown;
  if (!fs.existsSync(resolvedMarkdownPath)) {
    fail(`release-gate-report 缺少对应 markdown 文件：${path.relative(root, resolvedMarkdownPath)}`);
    return report;
  }

  const markdownContent = fs.readFileSync(resolvedMarkdownPath, "utf8");
  if (!markdownContent.includes("# Release Gate Report")) {
    fail(`release-gate-report markdown 缺少标题：${path.relative(root, resolvedMarkdownPath)}`);
  }

  return report;
}

function validateUpgradeAdvicePackage(filePath, markdownPath = "") {
  const report = validateVersionedJsonArtifact(
    filePath,
    "upgrade-advice-package.json",
    ["releaseLevel", "overallRiskLevel", "summary", "consumerCommands", "maintainerCommands", "manualChecks"]
  );
  if (!report) return null;

  if (!Array.isArray(report.consumerCommands)) {
    fail("upgrade-advice-package.json 的 consumerCommands 必须是数组");
  }

  if (!Array.isArray(report.maintainerCommands)) {
    fail("upgrade-advice-package.json 的 maintainerCommands 必须是数组");
  }

  if (!Array.isArray(report.manualChecks)) {
    fail("upgrade-advice-package.json 的 manualChecks 必须是数组");
  }

  const resolvedMarkdownPath = markdownPath ? path.resolve(markdownPath) : canonicalArtifacts.upgradeAdvicePackageMarkdown;
  if (!fs.existsSync(resolvedMarkdownPath)) {
    fail(`upgrade-advice-package 缺少对应 markdown 文件：${path.relative(root, resolvedMarkdownPath)}`);
    return report;
  }

  const markdownContent = fs.readFileSync(resolvedMarkdownPath, "utf8");
  if (!markdownContent.includes("# Upgrade Advice Package")) {
    fail(`upgrade-advice-package markdown 缺少标题：${path.relative(root, resolvedMarkdownPath)}`);
  }

  return report;
}

function validateGovernanceOperationsReport(filePath, markdownPath = "") {
  const report = validateVersionedJsonArtifact(
    filePath,
    "governance-operations-report.json",
    ["summary", "backlog", "releaseReadiness", "recentActivities", "recommendedActions"]
  );
  if (!report) return null;

  if (!Array.isArray(report.recentActivities)) {
    fail("governance-operations-report.json 的 recentActivities 必须是数组");
  }

  if (!Array.isArray(report.recommendedActions)) {
    fail("governance-operations-report.json 的 recommendedActions 必须是数组");
  }

  const resolvedMarkdownPath = markdownPath ? path.resolve(markdownPath) : canonicalArtifacts.governanceOperationsMarkdown;
  if (!fs.existsSync(resolvedMarkdownPath)) {
    fail(`governance-operations-report 缺少对应 markdown 文件：${path.relative(root, resolvedMarkdownPath)}`);
    return report;
  }

  const markdownContent = fs.readFileSync(resolvedMarkdownPath, "utf8");
  if (!markdownContent.includes("# Governance Operations Report")) {
    fail(`governance-operations-report markdown 缺少标题：${path.relative(root, resolvedMarkdownPath)}`);
  }

  return report;
}

function getLatestNotificationPayloadPath(notificationsDir) {
  if (!fs.existsSync(notificationsDir)) {
    return "";
  }

  const candidates = fs.readdirSync(notificationsDir)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => right.localeCompare(left, "en"));

  return candidates.length ? path.join(notificationsDir, candidates[0]) : "";
}

function validateNotificationPayload(filePath, automationReportPath) {
  const payload = validateVersionedJsonArtifact(
    filePath,
    `notification payload (${path.basename(filePath)})`,
    ["body", "links", "level"]
  );
  if (!payload) return;

  if (typeof payload.body !== "string" || !payload.body.includes(`- 版本：\`${packageJson.version}\``)) {
    fail(`通知载荷正文缺少当前版本号：${path.relative(root, filePath)}`);
  }

  if (!payload.links || typeof payload.links !== "object") {
    fail(`通知载荷缺少 links：${path.relative(root, filePath)}`);
    return;
  }

  if (payload.links.automationReportPath !== automationReportPath) {
    fail(
      `通知载荷引用的 automation report 与当前产物不一致：${payload.links.automationReportPath} !== ${automationReportPath}`
    );
  }

  if (payload.links.upgradeRiskReportPath && payload.links.upgradeRiskReportPath !== canonicalArtifacts.upgradeRiskReport) {
    fail(
      `通知载荷引用的 risk report 与当前产物不一致：${payload.links.upgradeRiskReportPath} !== ${canonicalArtifacts.upgradeRiskReport}`
    );
  }

  if (
    payload.links.consumerCompatibilityMatrixPath
    && payload.links.consumerCompatibilityMatrixPath !== canonicalArtifacts.consumerCompatibilityMatrix
  ) {
    fail(
      `通知载荷引用的 consumer compatibility matrix 与当前产物不一致：${payload.links.consumerCompatibilityMatrixPath} !== ${canonicalArtifacts.consumerCompatibilityMatrix}`
    );
  }

  if (
    payload.links.upgradeAdvicePackagePath
    && payload.links.upgradeAdvicePackagePath !== canonicalArtifacts.upgradeAdvicePackage
  ) {
    fail(
      `通知载荷引用的 upgrade advice package 与当前产物不一致：${payload.links.upgradeAdvicePackagePath} !== ${canonicalArtifacts.upgradeAdvicePackage}`
    );
  }

  if (
    payload.links.governanceOperationsReportPath
    && payload.links.governanceOperationsReportPath !== canonicalArtifacts.governanceOperationsReport
  ) {
    fail(
      `閫氱煡杞借嵎寮曠敤鐨?governance operations report 涓庡綋鍓嶄骇鐗╀笉涓€鑷达細${payload.links.governanceOperationsReportPath} !== ${canonicalArtifacts.governanceOperationsReport}`
    );
  }

  const markdownPath = filePath.replace(/\.json$/i, ".md");
  if (!fs.existsSync(markdownPath)) {
    fail(`通知载荷缺少对应 markdown 文件：${path.relative(root, markdownPath)}`);
    return;
  }

  const markdownContent = fs.readFileSync(markdownPath, "utf8");
  if (!markdownContent.includes(`- 版本：\`${packageJson.version}\``)) {
    fail(`通知 markdown 缺少当前版本号：${path.relative(root, markdownPath)}`);
  }
}

const args = parseArgs(process.argv.slice(2));

if (shouldValidateArtifact(canonicalArtifacts.skillsManifest, true)) {
  const skillsManifest = validateVersionedJsonArtifact(
    canonicalArtifacts.skillsManifest,
    "skills-manifest.json",
    ["generatedAt", "skills"]
  );
  if (skillsManifest && !Array.isArray(skillsManifest.skills)) {
    fail("skills-manifest.json 的 skills 必须是数组");
  }
}

if (shouldValidateArtifact(canonicalArtifacts.versionRecord, true)) {
  validateVersionRecord(canonicalArtifacts.versionRecord);
}

if (shouldValidateArtifact(canonicalArtifacts.releaseNotes, args.requireReleaseNotes)) {
  validateReleaseNotes(canonicalArtifacts.releaseNotes);
}

if (shouldValidateArtifact(canonicalArtifacts.impactReport, args.requireImpactReport)) {
  validateVersionedJsonArtifact(canonicalArtifacts.impactReport, "impact-report.json", ["changedFiles"]);
}

if (shouldValidateArtifact(canonicalArtifacts.upgradeRiskReport, args.requireRiskReport)) {
  validateUpgradeRiskReport(canonicalArtifacts.upgradeRiskReport, canonicalArtifacts.upgradeRiskMarkdown);
}

if (shouldValidateArtifact(canonicalArtifacts.consumerCompatibilityMatrix, args.requireConsumerMatrix)) {
  validateConsumerCompatibilityMatrix(
    canonicalArtifacts.consumerCompatibilityMatrix,
    canonicalArtifacts.consumerCompatibilityMatrixMarkdown
  );
}

if (shouldValidateArtifact(canonicalArtifacts.releaseGateReport, args.requireReleaseGate)) {
  validateReleaseGateReport(
    canonicalArtifacts.releaseGateReport,
    canonicalArtifacts.releaseGateMarkdown
  );
}

if (shouldValidateArtifact(canonicalArtifacts.governanceOperationsReport, args.requireGovernanceOperations)) {
  validateGovernanceOperationsReport(
    canonicalArtifacts.governanceOperationsReport,
    canonicalArtifacts.governanceOperationsMarkdown
  );
}

if (shouldValidateArtifact(canonicalArtifacts.upgradeAdvicePackage, args.requireUpgradeAdvice)) {
  validateUpgradeAdvicePackage(
    canonicalArtifacts.upgradeAdvicePackage,
    canonicalArtifacts.upgradeAdvicePackageMarkdown
  );
}

if (shouldValidateArtifact(canonicalArtifacts.automationReport, args.requireAutomationReport)) {
  const automationReport = validateVersionedJsonArtifact(
    canonicalArtifacts.automationReport,
    "automation-report.json",
    ["impactReportPath", "summary"]
  );
  if (automationReport) {
    validateAutomationReport(automationReport);
  }
}

const latestNotificationPayloadPath = getLatestNotificationPayloadPath(canonicalArtifacts.notificationsDir);
if (args.requireNotificationPayload && !latestNotificationPayloadPath) {
  fail(`缺少必需通知载荷：${path.relative(root, canonicalArtifacts.notificationsDir)}`);
}

if (latestNotificationPayloadPath) {
  validateNotificationPayload(latestNotificationPayloadPath, canonicalArtifacts.automationReport);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("发布产物一致性校验通过");
