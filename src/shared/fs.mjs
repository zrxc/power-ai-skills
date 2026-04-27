import fs from "node:fs";
import path from "node:path";

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function copyDir(src, dest) {
  ensureDir(dest);

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
      continue;
    }

    fs.copyFileSync(srcPath, destPath);
  }
}

export function removeDirIfExists(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function summarizeSpawnFailure(result, fallback) {
  return result?.error?.message || safeTrim(result?.stderr) || safeTrim(result?.stdout) || fallback;
}

export function walkDirectories(rootDir) {
  const results = [];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(rootDir, entry.name);
    results.push(entryPath);
    results.push(...walkDirectories(entryPath));
  }

  return results;
}

export function findSkillDirectories(skillsRoot) {
  return walkDirectories(skillsRoot).filter((dirPath) => {
    return fs.existsSync(path.join(dirPath, "SKILL.md"));
  });
}
