import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "../../scripts/shared.mjs";

export function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

export function writeFileIfChanged(filePath, content) {
  ensureDir(path.dirname(filePath));
  if (readTextIfExists(filePath) !== content) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

export function removePathIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.lstatSync(targetPath);
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } else {
    fs.unlinkSync(targetPath);
  }
}

export function cleanupEmptyParentDirectories({ projectRoot, targetPath }) {
  let current = path.dirname(targetPath);
  while (current.startsWith(projectRoot) && current !== projectRoot) {
    if (!fs.existsSync(current) || fs.readdirSync(current).length > 0) break;
    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

export function isGeneratedFile({ context, filePath }) {
  return readTextIfExists(filePath).includes(context.generatedMarker);
}

export function createWorkspaceSharedHelpers() {
  return {
    readTextIfExists,
    writeFileIfChanged,
    removePathIfExists,
    cleanupEmptyParentDirectories,
    isGeneratedFile
  };
}
