import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, runNpmPackJson } from "./shared.mjs";

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
  "templates/project",
  "bin",
  "config",
  "README.md",
  "CHANGELOG.md"
];

const requiredDocsPackageFiles = [
  "docs/command-manual.md",
  "docs/doctor-error-codes.md",
  "docs/governance.md",
  "docs/tool-adapters.md",
  "docs/troubleshooting-consumer.md"
];

const requiredManifestPackageFiles = [
  "manifest/skills-manifest.json"
];

const requiredPackageFiles = [
  ...requiredWorkspaceFiles,
  ...requiredDocsPackageFiles,
  ...requiredManifestPackageFiles
];

const allowedDocsPackageFiles = new Set(requiredDocsPackageFiles);
const allowedManifestPackageFiles = new Set(requiredManifestPackageFiles);

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

function pathExistsInWorkspace(targetPath) {
  return fs.existsSync(path.join(root, targetPath));
}

function pathExistsInPackedFiles(targetPath, packedFiles) {
  const normalizedTarget = targetPath.replaceAll("\\", "/");
  return packedFiles.some((item) => {
    const packedPath = item.path.replaceAll("\\", "/");
    return packedPath === normalizedTarget || packedPath.startsWith(`${normalizedTarget}/`);
  });
}

function getPackedFiles() {
  const result = runNpmPackJson(root, ["--dry-run"]);
  if (!result.ok) {
    fail(result.error || result.stderr || result.stdout || "npm pack --dry-run failed");
    return null;
  }

  return Array.isArray(result.payload) && result.payload[0]?.files ? result.payload[0].files : [];
}

if (packageJson.name !== "@power/power-ai-skills") {
  fail(`Package name must be @power/power-ai-skills, got ${packageJson.name}`);
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/.test(packageJson.version)) {
  fail(`Version is not valid semver: ${packageJson.version}`);
}

if (packageJson.bin?.["power-ai-skills"] !== "./bin/power-ai-skills.mjs") {
  fail("bin.power-ai-skills must point to ./bin/power-ai-skills.mjs");
}

for (const file of requiredPackageFiles) {
  if (!packageJson.files?.includes(file)) {
    fail(`files is missing published entry: ${file}`);
  }

  if (!pathExistsInWorkspace(file)) {
    fail(`files declares a path that does not exist: ${file}`);
  }
}

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`scripts is missing command: ${scriptName}`);
  }
}

const packedFiles = getPackedFiles();
if (packedFiles) {
  for (const file of requiredPackageFiles) {
    if (!pathExistsInPackedFiles(file, packedFiles)) {
      fail(`npm pack output is missing published entry: ${file}`);
    }
  }

  const packedPaths = packedFiles.map((item) => item.path.replaceAll("\\", "/"));
  const staleReleaseNotes = packedPaths.filter((packedPath) => {
    return /^manifest\/release-notes-/.test(packedPath)
      && packedPath !== `manifest/release-notes-${packageJson.version}.md`;
  });
  if (staleReleaseNotes.length > 0) {
    fail(`npm pack output contains historical release notes: ${staleReleaseNotes.join(", ")}`);
  }

  const archivedManifestFiles = packedPaths.filter((packedPath) => packedPath.startsWith("manifest/archive/"));
  if (archivedManifestFiles.length > 0) {
    fail(`npm pack output should not contain manifest/archive: ${archivedManifestFiles.join(", ")}`);
  }

  const extraManifestFiles = packedPaths.filter((packedPath) => {
    return packedPath.startsWith("manifest/")
      && !allowedManifestPackageFiles.has(packedPath);
  });
  if (extraManifestFiles.length > 0) {
    fail(`npm pack output should not contain maintainer-only manifest files: ${extraManifestFiles.join(", ")}`);
  }

  const technicalSolutionDocs = packedPaths.filter((packedPath) => packedPath.startsWith("docs/technical-solutions/"));
  if (technicalSolutionDocs.length > 0) {
    fail(`npm pack output should not contain technical solution docs: ${technicalSolutionDocs.join(", ")}`);
  }

  const extraDocsFiles = packedPaths.filter((packedPath) => {
    return packedPath.startsWith("docs/")
      && !allowedDocsPackageFiles.has(packedPath);
  });
  if (extraDocsFiles.length > 0) {
    fail(`npm pack output should not contain maintainer-only docs: ${extraDocsFiles.join(", ")}`);
  }

  const packagedScripts = packedPaths.filter((packedPath) => packedPath.startsWith("scripts/"));
  if (packagedScripts.length > 0) {
    fail(`npm pack output should not contain scripts/: ${packagedScripts.join(", ")}`);
  }

  const packagedBaselineFiles = packedPaths.filter((packedPath) => packedPath.startsWith("baseline/"));
  if (packagedBaselineFiles.length > 0) {
    fail(`npm pack output should not contain baseline/: ${packagedBaselineFiles.join(", ")}`);
  }

  const packagedTemplateFiles = packedPaths.filter((packedPath) => {
    return packedPath.startsWith("templates/")
      && !packedPath.startsWith("templates/project/");
  });
  if (packagedTemplateFiles.length > 0) {
    fail(`npm pack output should not contain non-runtime templates: ${packagedTemplateFiles.join(", ")}`);
  }

  if (packedPaths.includes("CODEOWNERS")) {
    fail("npm pack output should not contain CODEOWNERS");
  }

  if (fs.existsSync(versionRecordPath)) {
    const versionRecord = readJson(versionRecordPath);
    const packedNotificationPaths = packedPaths.filter((packedPath) => packedPath.startsWith("manifest/notifications/"));
    if (packedNotificationPaths.length > 0) {
      fail(`npm pack output should not contain notification payloads: ${packedNotificationPaths.join(", ")}`);
    }

    const notificationPayloadPath = versionRecord.artifacts?.notificationJsonPath || "";
    if (notificationPayloadPath && fs.existsSync(notificationPayloadPath)) {
      const notificationPayload = readJson(notificationPayloadPath);
      const packedImpactTaskPaths = packedPaths.filter((packedPath) => packedPath.startsWith("manifest/impact-tasks/"));
      if (notificationPayload.links?.impactTaskPath && packedImpactTaskPaths.length > 0) {
        fail(`npm pack output should not contain impact tasks: ${packedImpactTaskPaths.join(", ")}`);
      }
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("package 校验通过");
