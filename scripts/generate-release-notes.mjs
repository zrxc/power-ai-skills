import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const manifest = readJson(path.join(root, "manifest", "skills-manifest.json"));
const changelogPath = path.join(root, "CHANGELOG.md");
const outputPath = path.join(root, "manifest", `release-notes-${packageJson.version}.md`);

function extractChangelogSection(version, changelogContent) {
  const marker = `## ${version}`;
  const start = changelogContent.indexOf(marker);
  if (start === -1) return "未在 CHANGELOG.md 中找到当前版本说明。";

  const nextIndex = changelogContent.indexOf("\n## ", start + marker.length);
  return nextIndex === -1
    ? changelogContent.slice(start).trim()
    : changelogContent.slice(start, nextIndex).trim();
}

const groupCounter = {};
for (const skill of manifest.skills) {
  const groupName = skill.skillPath.split("/")[0];
  groupCounter[groupName] = (groupCounter[groupName] || 0) + 1;
}

const groupedSummary = Object.entries(groupCounter)
  .sort((a, b) => a[0].localeCompare(b[0], "zh-CN"))
  .map(([groupName, count]) => `- ${groupName}: ${count} 个 skill`)
  .join("\n");

const changelogContent = fs.readFileSync(changelogPath, "utf8");
const changelogSection = extractChangelogSection(packageJson.version, changelogContent);

const content = `# Release Notes ${packageJson.version}

## 包信息
- 包名：\`${packageJson.name}\`
- 版本：\`${packageJson.version}\`
- 生成时间：\`${new Date().toISOString()}\`

## Skill 统计

- 总 skill 数量：${manifest.skills.length}
${groupedSummary}

## Changelog 摘要

${changelogSection}

## 发布建议

1. 执行 \`pnpm ci:check\`
2. 确认 \`CHANGELOG.md\` 已更新
3. 如涉及基础依赖升级，执行 \`pnpm check:dependencies\`
4. 发布到私仓
5. 在消费项目执行 \`pnpm exec power-ai-skills init\`、\`pnpm exec power-ai-skills show-defaults\` 或 \`pnpm exec power-ai-skills sync\`
`;

fs.writeFileSync(outputPath, content, "utf8");
console.log(`已生成发布说明: ${outputPath}`);
