import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findSkillDirectories } from "./shared.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const triggerCuePatterns = [/适用于/u, /用于/u, /当/u, /命中/u, /场景/u, /需要/u];
const actionCuePatterns = [/生成/u, /扩展/u, /定义/u, /描述/u, /路由/u, /改造/u, /判断/u, /梳理/u, /识别/u, /初始化/u, /补齐/u];
const focusSkillNames = new Set([
  "entry-skill",
  "power-component-library",
  "power-foundation-app",
  "project-structure-skill"
]);

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*"(.*)"$/);
    if (fieldMatch) {
      frontmatter[fieldMatch[1]] = fieldMatch[2];
    }
  }

  return frontmatter;
}

function collectWarningsForSkill(skillName, content) {
  const warnings = [];
  const frontmatter = parseFrontmatter(content);
  const description = typeof frontmatter.description === "string" ? frontmatter.description.trim() : "";

  if (!description) {
    warnings.push({
      code: "missing-description",
      message: "缺少 frontmatter description"
    });
    return warnings;
  }

  if (description.length < 24) {
    warnings.push({
      code: "description-too-short",
      message: "description 过短，容易退化成摘要式命名"
    });
  }

  if (!triggerCuePatterns.some((pattern) => pattern.test(description))) {
    warnings.push({
      code: "missing-trigger-cue",
      message: "description 缺少明显的触发语义，建议补充“适用于/用于/当…时”等表达"
    });
  }

  if (!actionCuePatterns.some((pattern) => pattern.test(description))) {
    warnings.push({
      code: "missing-action-cue",
      message: "description 缺少动作导向词，建议说明该 skill 会生成、扩展、定义或路由什么"
    });
  }

  if (!content.includes("## 适用场景")) {
    warnings.push({
      code: "missing-scenarios-section",
      message: "正文缺少 `## 适用场景`，维护者不易快速判断何时激活"
    });
  }

  if (!/##\s*.*切换到其他技能/u.test(content)) {
    warnings.push({
      code: "missing-switch-boundary",
      message: "正文缺少“切换到其他技能”边界，容易让 skill 路由停留在摘要层"
    });
  }

  return warnings;
}

export function checkSkillDescriptions({ rootDir = defaultRoot } = {}) {
  const skillsRoot = path.join(rootDir, "skills");
  const warnings = [];

  for (const skillDir of findSkillDirectories(skillsRoot)) {
    const skillName = path.basename(skillDir);
    const skillPath = path.join(skillDir, "SKILL.md");
    const content = fs.readFileSync(skillPath, "utf8");
    const skillWarnings = collectWarningsForSkill(skillName, content);

    for (const warning of skillWarnings) {
      warnings.push({
        skillName,
        skillPath: path.relative(rootDir, skillPath),
        focus: focusSkillNames.has(skillName),
        ...warning
      });
    }
  }

  return {
    ok: warnings.length === 0,
    warnings
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const strict = process.argv.includes("--strict");
  const result = checkSkillDescriptions();
  const focusWarnings = result.warnings.filter((item) => item.focus);

  if (result.warnings.length === 0) {
    console.log("skill description 校验通过");
    process.exit(0);
  }

  console.warn(
    `[check-skill-descriptions] 发现 ${result.warnings.length} 条 description 质量提醒，其中重点 skill ${focusWarnings.length} 条。`
  );

  for (const warning of result.warnings) {
    const scope = warning.focus ? "focus" : "general";
    console.warn(
      `[check-skill-descriptions] [${scope}] ${warning.skillName} (${warning.skillPath}) ${warning.code}: ${warning.message}`
    );
  }

  if (strict) {
    process.exit(1);
  }
}
