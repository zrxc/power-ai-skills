/**
 * 技能治理校验工具
 * 目标：
 * 1. 校验 skill 目录结构是否完整
 * 2. 校验 SKILL.md、agents、references、skill.meta.json 是否满足统一规范
 * 3. 校验 skill 依赖是否真实存在，避免发布后出现悬空 dependsOn
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findSkillDirectories, readJson } from "./shared.mjs";

// 统一允许的生命周期状态，避免团队自由发挥造成治理失控。
const ALLOWED_STATUS = new Set(["stable", "beta", "deprecated"]);

// 预先收集所有 skill 目录，后面校验 dependsOn 时直接复用，避免多次扫描文件系统。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(root, "skills");
const skillDirs = findSkillDirectories(skillsRoot);
const knownSkillNames = new Set(skillDirs.map((skillDir) => path.basename(skillDir)));

function fail(message) {
  console.error(`[validate] ${message}`);
  process.exitCode = 1;
}

function validateSkillBody(skillName, content) {
  // frontmatter 是 skill 的触发入口，没有它就无法稳定被工具识别。
  if (!content.startsWith("---\n")) {
    fail(`${skillName} 的 SKILL.md 缺少 frontmatter`);
  }

  // 技能正文至少要有标题，避免出现只写 metadata、没有工作指引的空 skill。
  if (!content.includes("# ")) {
    fail(`${skillName} 的 SKILL.md 缺少一级标题`);
  }
}

function validateMeta(skillName, metaContent) {
  // 这些字段是团队协作和后续治理的最小集合。
  if (metaContent.name !== skillName) {
    fail(`${skillName} 的 skill.meta.json name 与目录名不一致`);
  }

  if (typeof metaContent.displayName !== "string" || metaContent.displayName.trim() === "") {
    fail(`${skillName} 的 skill.meta.json 缺少有效的 displayName`);
  }

  if (!Array.isArray(metaContent.owners) || metaContent.owners.length === 0) {
    fail(`${skillName} 的 skill.meta.json 缺少 owners 数组`);
  }

  if (!Array.isArray(metaContent.tags) || metaContent.tags.length === 0) {
    fail(`${skillName} 的 skill.meta.json 缺少 tags 数组`);
  }

  if (!ALLOWED_STATUS.has(metaContent.status)) {
    fail(`${skillName} 的 skill.meta.json status 必须是 stable、beta 或 deprecated`);
  }

  if (typeof metaContent.compatibility !== "object" || metaContent.compatibility === null) {
    fail(`${skillName} 的 skill.meta.json 缺少 compatibility 对象`);
  }

  if (!Array.isArray(metaContent.dependsOn)) {
    fail(`${skillName} 的 skill.meta.json 缺少 dependsOn 数组`);
  }

  for (const dependency of metaContent.dependsOn) {
    if (!knownSkillNames.has(dependency)) {
      fail(`${skillName} 的 dependsOn 包含不存在的 skill：${dependency}`);
    }
  }
}

for (const skillDir of skillDirs) {
  const skillName = path.basename(skillDir);
  const skillMd = path.join(skillDir, "SKILL.md");
  const agents = path.join(skillDir, "agents", "openai.yaml");
  const references = path.join(skillDir, "references");
  const meta = path.join(skillDir, "skill.meta.json");

  if (!fs.existsSync(skillMd)) fail(`${skillName} 缺少 SKILL.md`);
  if (!fs.existsSync(agents)) fail(`${skillName} 缺少 agents/openai.yaml`);
  if (!fs.existsSync(references)) fail(`${skillName} 缺少 references 目录`);
  if (!fs.existsSync(meta)) fail(`${skillName} 缺少 skill.meta.json`);

  const content = fs.readFileSync(skillMd, "utf8");
  validateSkillBody(skillName, content);

  const referenceEntries = fs.readdirSync(references);
  if (referenceEntries.length === 0) {
    fail(`${skillName} 的 references 目录为空`);
  }

  const openaiContent = fs.readFileSync(agents, "utf8");
  if (!openaiContent.includes("default_prompt:")) {
    fail(`${skillName} 的 agents/openai.yaml 缺少 default_prompt`);
  }

  const metaContent = readJson(meta);
  validateMeta(skillName, metaContent);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("skill 校验通过");
