/**
 * package.json 治理校验脚本
 * 目标：
 * 1. 确保包名、版本、bin、files、scripts 等关键信息完整；
 * 2. 把发布约束转成可执行检查，减少“文档写了但没人校验”的情况；
 * 3. 让自动化联动相关脚本也进入正式治理范围。
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = path.join(root, "package.json");
const packageJson = readJson(packageJsonPath);
const versionRecordPath = path.join(root, "manifest", "version-record.json");

function fail(message) {
  console.error(`[check-package] ${message}`);
  process.exitCode = 1;
}

const requiredWorkspaceFiles = [
  "src",
  "skills",
  "templates",
  "scripts",
  "bin",
  "baseline",
  "config",
  "README.md",
  "CHANGELOG.md",
  "CODEOWNERS"
];

const requiredDocsPackageFiles = [
  "docs/architecture-0.9.0.md",
  "docs/ci-integration.md",
  "docs/command-manual.md",
  "docs/compatibility-matrix.md",
  "docs/component-knowledge-plan.md",
  "docs/component-upgrade-flow.md",
  "docs/deployment-ops/deployment-guide-frontend-ai-skills.md",
  "docs/doctor-error-codes.md",
  "docs/governance.md",
  "docs/maintenance-guide.md",
  "docs/release-process.md",
  "docs/skill-expansion-guide.md",
  "docs/tool-adapters.md",
  "docs/troubleshooting-consumer.md",
  "docs/upstream-pipeline-integration.md",
  "docs/versioning-policy.md"
];

const requiredManifestPackageFiles = [
  "manifest/skills-manifest.json",
  "manifest/version-record.json",
  `manifest/release-notes-${packageJson.version}.md`,
  "manifest/impact-report.json",
  "manifest/automation-report.json",
  "manifest/changed-files.txt",
  "manifest/notifications",
  "manifest/impact-tasks"
];

const requiredPackageFiles = [
  ...requiredWorkspaceFiles,
  ...requiredDocsPackageFiles,
  ...requiredManifestPackageFiles
];

/**
 * 这里列的是仓库对外承诺的核心脚本命令。
 * 如果命令消失，说明发布能力或自动化联动能力被破坏，应在发版前直接失败。
 */
const requiredScripts = [
  "validate",
  "build:manifest",
  "refresh:release-artifacts",
  "clean:release-artifacts",
  "check:baseline",
  "check:package",
  "check:release-consistency",
  "check:docs",
  "check:component-knowledge",
  "check:tooling-config",
  "collect:changed",
  "impact:check",
  "impact:task",
  "upgrade:automation",
  "upgrade:payload",
  "ci:check",
  "verify:consumer",
  "release:notes",
  "sync",
  "init:project",
  "tools:list",
  "defaults:show",
  "release:prepare"
];

function resolveNpmCliPath() {
  const candidates = [
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(root, "node_modules", "npm", "bin", "npm-cli.js")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function pathExistsInPackedFiles(targetPath, packedFiles) {
  const normalizedTarget = targetPath.replaceAll("\\", "/");
  return packedFiles.some((item) => {
    const packedPath = item.path.replaceAll("\\", "/");
    return packedPath === normalizedTarget || packedPath.startsWith(`${normalizedTarget}/`);
  });
}

function getPackedFiles() {
  const npmCliPath = resolveNpmCliPath();
  if (!npmCliPath) {
    fail("找不到 npm-cli.js，无法执行 npm pack --dry-run");
    return null;
  }

  const result = spawnSync(process.execPath, [npmCliPath, "pack", "--dry-run", "--json"], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const message = result.error?.message || result.stderr?.trim() || result.stdout?.trim() || "未知错误";
    fail(`npm pack --dry-run 执行失败：${message}`);
    return null;
  }

  try {
    const payload = JSON.parse(result.stdout);
    return Array.isArray(payload) && payload[0]?.files ? payload[0].files : [];
  } catch (error) {
    fail(`无法解析 npm pack --dry-run 输出：${error.message}`);
    return null;
  }
}

if (packageJson.name !== "@power/power-ai-skills") {
  fail(`包名必须是 @power/power-ai-skills，当前为 ${packageJson.name}`);
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/.test(packageJson.version)) {
  fail(`版本号不是标准 semver：${packageJson.version}`);
}

if (packageJson.bin?.["power-ai-skills"] !== "./bin/power-ai-skills.mjs") {
  fail("bin.power-ai-skills 必须指向 ./bin/power-ai-skills.mjs");
}

for (const file of requiredPackageFiles) {
  if (!packageJson.files?.includes(file)) {
    fail(`files 缺少发布项：${file}`);
  }

  if (!pathExistsInWorkspace(file)) {
    fail(`files 声明的发布项不存在：${file}`);
  }
}

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`scripts 缺少命令：${scriptName}`);
  }
}

function pathExistsInWorkspace(targetPath) {
  return fs.existsSync(path.join(root, targetPath));
}

const packedFiles = getPackedFiles();
if (packedFiles) {
  for (const file of requiredPackageFiles) {
    if (!pathExistsInPackedFiles(file, packedFiles)) {
      fail(`npm pack 产物缺少发布项：${file}`);
    }
  }

  const packedPaths = packedFiles.map((item) => item.path.replaceAll("\\", "/"));
  const staleReleaseNotes = packedPaths.filter((packedPath) => {
    return /^manifest\/release-notes-/.test(packedPath)
      && packedPath !== `manifest/release-notes-${packageJson.version}.md`;
  });
  if (staleReleaseNotes.length > 0) {
    fail(`npm pack 产物包含历史 release notes：${staleReleaseNotes.join(", ")}`);
  }

  const archivedManifestFiles = packedPaths.filter((packedPath) => packedPath.startsWith("manifest/archive/"));
  if (archivedManifestFiles.length > 0) {
    fail(`npm pack 产物不应包含 manifest/archive：${archivedManifestFiles.join(", ")}`);
  }

  const technicalSolutionDocs = packedPaths.filter((packedPath) => packedPath.startsWith("docs/technical-solutions/"));
  if (technicalSolutionDocs.length > 0) {
    fail(`npm pack 产物不应包含历史技术方案设计稿：${technicalSolutionDocs.join(", ")}`);
  }

  if (fs.existsSync(versionRecordPath)) {
    const versionRecord = readJson(versionRecordPath);
    const notificationJsonName = path.basename(versionRecord.artifacts?.notificationJsonPath || "");
    const notificationMarkdownName = path.basename(versionRecord.artifacts?.notificationMarkdownPath || "");
    const expectedNotificationPaths = new Set([
      notificationJsonName ? `manifest/notifications/${notificationJsonName}` : "",
      notificationMarkdownName ? `manifest/notifications/${notificationMarkdownName}` : ""
    ].filter(Boolean));
    const packedNotificationPaths = packedPaths.filter((packedPath) => packedPath.startsWith("manifest/notifications/"));
    const staleNotificationPaths = packedNotificationPaths.filter((packedPath) => !expectedNotificationPaths.has(packedPath));
    if (staleNotificationPaths.length > 0) {
      fail(`npm pack 产物不应包含非当前通知载荷：${staleNotificationPaths.join(", ")}`);
    }

    const notificationPayloadPath = versionRecord.artifacts?.notificationJsonPath || "";
    if (notificationPayloadPath && fs.existsSync(notificationPayloadPath)) {
      const notificationPayload = readJson(notificationPayloadPath);
      const impactTaskName = path.basename(notificationPayload.links?.impactTaskPath || "");
      const expectedImpactTaskPath = impactTaskName ? `manifest/impact-tasks/${impactTaskName}` : "";
      const packedImpactTaskPaths = packedPaths.filter((packedPath) => packedPath.startsWith("manifest/impact-tasks/"));
      const staleImpactTaskPaths = packedImpactTaskPaths.filter((packedPath) => packedPath !== expectedImpactTaskPath);
      if (staleImpactTaskPaths.length > 0) {
        fail(`npm pack 产物不应包含非当前 impact task：${staleImpactTaskPaths.join(", ")}`);
      }
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("package 校验通过");
