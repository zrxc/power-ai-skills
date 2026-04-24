/**
 * 发布产物清理脚本
 * 目标：
 * 1. 归档过旧的通知载荷，避免 manifest/notifications 持续膨胀；
 * 2. 默认保留当前版本记录引用的通知文件，以及最近若干组通知；
 * 3. 使用归档而不是删除，保证历史产物仍可追溯。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(root, "manifest"));
const notificationsDir = path.join(manifestDir, "notifications");
const archiveRoot = path.join(manifestDir, "archive", "notifications");
const versionRecordPath = path.join(manifestDir, "version-record.json");
const defaultKeepCount = 3;

function parseArgs(argv) {
  const keepIndex = argv.indexOf("--keep");
  const keepCount = keepIndex === -1 ? defaultKeepCount : Number(argv[keepIndex + 1] || defaultKeepCount);

  if (!Number.isInteger(keepCount) || keepCount < 1) {
    console.error("[clean-release-artifacts] --keep 必须是大于等于 1 的整数");
    process.exit(1);
  }

  return { keepCount };
}

function getProtectedPaths() {
  if (!fs.existsSync(versionRecordPath)) {
    return new Set();
  }

  const versionRecord = readJson(versionRecordPath);
  const protectedPaths = new Set();
  for (const key of ["notificationJsonPath", "notificationMarkdownPath"]) {
    if (versionRecord.artifacts?.[key]) {
      protectedPaths.add(path.resolve(versionRecord.artifacts[key]));
    }
  }
  return protectedPaths;
}

function collectNotificationPairs() {
  if (!fs.existsSync(notificationsDir)) {
    return [];
  }

  const files = fs.readdirSync(notificationsDir)
    .filter((name) => /^upgrade-payload-\d{8}-\d{6}\.(json|md)$/i.test(name))
    .sort((left, right) => right.localeCompare(left, "en"));

  const pairs = new Map();
  for (const fileName of files) {
    const match = fileName.match(/^(upgrade-payload-\d{8}-\d{6})\.(json|md)$/i);
    if (!match) continue;
    const baseName = match[1];
    const extension = match[2].toLowerCase();
    if (!pairs.has(baseName)) {
      pairs.set(baseName, { baseName, jsonPath: "", markdownPath: "" });
    }
    const entry = pairs.get(baseName);
    const absolutePath = path.join(notificationsDir, fileName);
    if (extension === "json") entry.jsonPath = absolutePath;
    if (extension === "md") entry.markdownPath = absolutePath;
  }

  return [...pairs.values()].sort((left, right) => right.baseName.localeCompare(left.baseName, "en"));
}

function archiveFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return "";
  ensureDir(archiveRoot);
  const targetPath = path.join(archiveRoot, path.basename(filePath));
  fs.renameSync(filePath, targetPath);
  return targetPath;
}

const args = parseArgs(process.argv.slice(2));
const protectedPaths = getProtectedPaths();
const notificationPairs = collectNotificationPairs();
const keptPairs = [];
const archivedPairs = [];

for (const [index, pair] of notificationPairs.entries()) {
  const pairPaths = [pair.jsonPath, pair.markdownPath].filter(Boolean).map((item) => path.resolve(item));
  const isProtected = pairPaths.some((item) => protectedPaths.has(item));
  if (index < args.keepCount || isProtected) {
    keptPairs.push(pair);
    continue;
  }

  archivedPairs.push({
    baseName: pair.baseName,
    archivedJsonPath: archiveFile(pair.jsonPath),
    archivedMarkdownPath: archiveFile(pair.markdownPath)
  });
}

console.log(JSON.stringify({
  keptCount: keptPairs.length,
  archivedCount: archivedPairs.length,
  keepCount: args.keepCount,
  keptPayloads: keptPairs.map((item) => item.baseName),
  archivedPayloads: archivedPairs
}, null, 2));
