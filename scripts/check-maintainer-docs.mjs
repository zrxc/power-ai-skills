import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routerPath = ".codex/SKILL.md";
const requiredFiles = [
  routerPath,
  ".codex/rules/project-rules.md",
  ".codex/workflows/update-rules.md",
  ".codex/references/gotchas.md",
  "docs/technical-solutions/skill-based-architecture-adoption.md"
];

function readText(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function collectBacktickMarkdownRefs(content) {
  return [...content.matchAll(/`([^`\r\n]+\.md)`/g)].map((match) => match[1]);
}

function resolveRouterReference(rootDir, referencePath) {
  if (referencePath.startsWith("./") || referencePath.startsWith("../")) {
    return path.resolve(path.join(rootDir, ".codex"), referencePath);
  }

  return path.resolve(rootDir, referencePath);
}

export function checkMaintainerDocs({ rootDir = defaultRoot } = {}) {
  const errors = [];

  for (const relativePath of requiredFiles) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      errors.push(`缺少维护者文档：${relativePath}`);
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  const router = readText(rootDir, routerPath);
  const routerLines = router.split(/\r?\n/).length;

  if (routerLines > 120) {
    errors.push(`.codex/SKILL.md 过长：${routerLines} 行，建议控制在 120 行以内`);
  }

  for (const sectionTitle of ["## Always Read", "## Common Tasks", "## Boundaries"]) {
    if (!router.includes(sectionTitle)) {
      errors.push(`.codex/SKILL.md 缺少必要章节：${sectionTitle}`);
    }
  }

  if (!router.includes("`./references/gotchas.md`")) {
    errors.push(".codex/SKILL.md 未显式路由到 `./references/gotchas.md`");
  }

  for (const referencePath of collectBacktickMarkdownRefs(router)) {
    const absolutePath = resolveRouterReference(rootDir, referencePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`.codex/SKILL.md 引用了不存在的文档：${referencePath}`);
    }
  }

  const projectRules = readText(rootDir, ".codex/rules/project-rules.md");
  for (const requiredSnippet of ["`skills/`", "`.codex/`", "`.power-ai/`"]) {
    if (!projectRules.includes(requiredSnippet)) {
      errors.push(`project-rules.md 缺少关键边界说明：${requiredSnippet}`);
    }
  }

  for (const requiredSnippet of ["自动注册", "自动发版", "自动 promotion"]) {
    if (!projectRules.includes(requiredSnippet)) {
      errors.push(`project-rules.md 缺少高风险自动化边界说明：${requiredSnippet}`);
    }
  }

  const updateRules = readText(rootDir, ".codex/workflows/update-rules.md");
  if (!updateRules.includes("Task Closure Protocol")) {
    errors.push("update-rules.md 缺少 `Task Closure Protocol` 章节");
  }

  for (const question of [
    "这次有没有新 gotcha",
    "这次有没有新 task route",
    "这次有没有已有规则不够显眼",
    "这次有没有过时规则"
  ]) {
    if (!updateRules.includes(question)) {
      errors.push(`update-rules.md 缺少收口问题：${question}`);
    }
  }

  const gotchas = readText(rootDir, ".codex/references/gotchas.md");
  const gotchaHeadingCount = (gotchas.match(/^##\s+\d+\./gm) || []).length;
  if (gotchaHeadingCount < 3) {
    errors.push(`gotchas.md 顶层坑点数量过少：${gotchaHeadingCount}，至少应有 3 条`);
  }

  for (const requiredSnippet of ["handoff", "project-local", "`list/show`", "Roadmap History"]) {
    if (!gotchas.includes(requiredSnippet)) {
      errors.push(`gotchas.md 缺少核心经验主题：${requiredSnippet}`);
    }
  }

  const adoptionDoc = readText(rootDir, "docs/technical-solutions/skill-based-architecture-adoption.md");
  for (const sectionTitle of ["## 2. 适用对象", "## 4. 本次采纳范围", "## 8. 验收标准", "## 10. 非目标"]) {
    if (!adoptionDoc.includes(sectionTitle)) {
      errors.push(`skill-based-architecture-adoption.md 缺少必要章节：${sectionTitle}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkMaintainerDocs();

  if (!result.ok) {
    for (const message of result.errors) {
      console.error(`[check-maintainer-docs] ${message}`);
    }
    process.exit(1);
  }

  console.log("维护者文档校验通过");
}
