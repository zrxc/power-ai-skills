import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";
import { supportedCaptureWrappers } from "../src/conversation-miner/wrappers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolRegistry = readJson(path.join(root, "config", "tool-registry.json"));
const teamDefaults = readJson(path.join(root, "config", "team-defaults.json"));
const templateRegistry = readJson(path.join(root, "config", "template-registry.json"));
const targetPath = path.join(root, "docs", "tool-adapters.md");
const checkMode = process.argv.includes("--check");

function formatCode(value) {
  return `\`${value}\``;
}

function formatList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function normalizeNames(values) {
  return [...new Set((values || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function resolveProfileTools(profileNames) {
  const results = [];
  for (const profileName of profileNames) {
    const profile = toolRegistry.profiles.find((item) => item.name === profileName);
    if (!profile) throw new Error(`Unknown profile: ${profileName}`);
    results.push(...profile.tools);
  }
  return results;
}

function resolvePresetSelection(presetName) {
  const preset = (teamDefaults.presetSelections || []).find((item) => item.name === presetName);
  if (!preset) throw new Error(`Unknown preset: ${presetName}`);
  const profileNames = normalizeNames(preset.profiles || []);
  const toolNames = normalizeNames([...(preset.tools || []), ...resolveProfileTools(profileNames)]);
  const excluded = new Set(normalizeNames(preset.excludeTools || []));
  return {
    preset,
    profileNames,
    toolNames: toolNames.filter((toolName) => !excluded.has(toolName))
  };
}

function expandDependencies(toolNames) {
  const toolMap = new Map(toolRegistry.tools.map((tool) => [tool.name, tool]));
  const expanded = new Set();

  function visit(toolName) {
    const tool = toolMap.get(toolName);
    if (!tool || expanded.has(toolName)) return;
    expanded.add(toolName);
    for (const dependency of tool.dependsOn || []) visit(dependency);
  }

  for (const toolName of toolNames) visit(toolName);
  return normalizeNames([...expanded]);
}

function getDefaultPresetName() {
  return teamDefaults.defaultSelection?.preset || (teamDefaults.defaultSelection?.presets || [])[0] || "";
}

function buildToolSection(title, tools) {
  if (!tools.length) return `### ${title}\n\n- 无\n`;
  return `### ${title}\n\n${formatList(tools.map((tool) => formatCode(tool.name)))}\n`;
}

function buildProfilesSection() {
  return formatList(toolRegistry.profiles.map((profile) => `${formatCode(profile.name)} -> ${(profile.tools || []).map((toolName) => formatCode(toolName)).join("、")}`));
}

function buildEntrypointSection(type) {
  const entrypoints = toolRegistry.tools.flatMap((tool) => (tool.entrypoints || []).filter((entrypoint) => entrypoint.type === type).map((entrypoint) => ({
    tool: tool.name,
    target: entrypoint.target,
    source: entrypoint.source
  })));

  if (!entrypoints.length) return "- 无";
  return formatList(entrypoints.map((entrypoint) => `${formatCode(entrypoint.tool)} -> ${formatCode(entrypoint.target)}（源：${formatCode(entrypoint.source)}）`));
}

function buildTemplateSection() {
  return formatList(templateRegistry.templates.map((template) => {
    const placeholders = template.placeholders.length > 0
      ? template.placeholders.map((placeholder) => formatCode(placeholder)).join("、")
      : "无占位符";
    return `${formatCode(template.name)} -> ${formatCode(template.output)}，ownerTool: ${formatCode(template.ownerTool)}，placeholders: ${placeholders}`;
  }));
}

function buildReadPrioritySection() {
  return toolRegistry.tools.map((tool) => {
    const instructionLoading = tool.instructionLoading;
    const lines = [
      `### ${tool.displayName}`,
      "",
      `- 工具名：${formatCode(tool.name)}`,
      `- 主入口类型：${formatCode(instructionLoading.primarySourceType)}`,
      `- 主入口：${instructionLoading.primarySources.map((source) => formatCode(source)).join("、")}`,
      `- 补充来源：${instructionLoading.supplementalSources.length > 0 ? instructionLoading.supplementalSources.map((source) => formatCode(source)).join("、") : "无"}`,
      `- 路由入口：${formatCode(instructionLoading.routingPath)}`,
      `- 项目私有覆盖：${formatCode(instructionLoading.projectLocalPath)}`,
      `- 冲突优先级：${instructionLoading.conflictPriority.join(" > ")}`,
      `- 工具依赖：${(tool.dependsOn || []).length > 0 ? tool.dependsOn.map((item) => formatCode(item)).join("、") : "无"}`
    ];

    if (instructionLoading.overrideNote) lines.push(`- 备注：${instructionLoading.overrideNote}`);
    return lines.join("\n");
  }).join("\n\n");
}

function buildCaptureWrappersSection() {
  return formatList(supportedCaptureWrappers.map((wrapper) => {
    return `${formatCode(wrapper.toolName)} -> ${formatCode(wrapper.commandName)} -> ${formatCode(`npx power-ai-skills tool-capture-session --tool ${wrapper.toolName}`)}`;
  }));
}

function buildCaptureAdapterExamplesSection() {
  const exampleLines = supportedCaptureWrappers.map((wrapper) => {
    return `${formatCode(`.power-ai/adapters/${wrapper.toolName}-capture.example.ps1`)} -> ${formatCode(`npx power-ai-skills tool-capture-session --tool ${wrapper.toolName}`)} / ${formatCode(`npx power-ai-skills submit-auto-capture --tool ${wrapper.toolName}`)} / ${formatCode(`npx power-ai-skills queue-auto-capture-response --tool ${wrapper.toolName}`)}`;
  });
  exampleLines.push(`${formatCode(".power-ai/adapters/custom-tool-capture.example.ps1")} -> fallback raw prepare/confirm flow for unregistered tools`);
  exampleLines.push(`${formatCode(".power-ai/adapters/start-auto-capture-runtime.example.ps1")} -> start ${formatCode("watch-auto-capture-inbox")} for background auto-capture processing`);
  exampleLines.push(`${formatCode(".power-ai/adapters/trae-host-bridge.example.ps1")} -> GUI-host sample for confirmed Trae responses`);
  exampleLines.push(`${formatCode(".power-ai/adapters/cursor-host-bridge.example.ps1")} -> GUI-host sample for confirmed Cursor responses`);
  exampleLines.push(`${formatCode(".power-ai/adapters/windsurf-host-bridge.example.ps1")} -> GUI-host sample for confirmed Windsurf responses`);
  exampleLines.push(`${formatCode(".power-ai/adapters/cline-host-bridge.example.ps1")} -> GUI-host sample for confirmed Cline responses`);
  exampleLines.push(`${formatCode(".power-ai/adapters/github-copilot-host-bridge.example.ps1")} -> GUI-host sample for confirmed GitHub Copilot responses`);
  exampleLines.push(`${formatCode(".power-ai/auto-capture/response-inbox/")} -> host tools can drop confirmed response text here when they cannot invoke CLI directly`);
  exampleLines.push(`${formatCode(".power-ai/shared/conversation-capture.md")} -> shared prompt and capture gate guidance`);
  exampleLines.push(`${formatCode(".power-ai/references/conversation-capture-contract.md")} -> marked block schema and wrapper contract`);
  return formatList(exampleLines);
}

function buildRecommendedCaptureModesSection() {
  const terminalWrappers = supportedCaptureWrappers.filter((wrapper) => wrapper.integrationStyle === "terminal");
  const guiWrappers = supportedCaptureWrappers.filter((wrapper) => wrapper.integrationStyle === "gui");

  return [
    "### Terminal-first",
    "",
    ...terminalWrappers.map((wrapper) => `- ${formatCode(wrapper.toolName)} -> prefer ${formatCode(`.power-ai/adapters/${wrapper.toolName}-capture.example.ps1 -ResponseText $response -Auto`)}`),
    "",
    "### GUI / IDE host-first",
    "",
    ...guiWrappers.map((wrapper) => `- ${formatCode(wrapper.toolName)} -> prefer host bridge or ${formatCode(`queue-auto-capture-response --tool ${wrapper.toolName}`)}`),
    "",
    "### Unregistered tools",
    "",
    `- terminal-style custom tool -> prefer ${formatCode(".power-ai/adapters/custom-tool-capture.example.ps1 -ToolName my-cli -ResponseText $response -Auto")}`,
    `- GUI-style custom tool -> prefer ${formatCode(".power-ai/adapters/custom-tool-capture.example.ps1 -ToolName my-gui -ResponseText $response -QueueResponse -ConsumeNow")}`
  ].join("\n");
}

function buildDocument() {
  const defaultPresetName = getDefaultPresetName();
  const defaultPreset = defaultPresetName ? resolvePresetSelection(defaultPresetName) : null;
  const defaultExpandedTools = defaultPreset ? expandDependencies(defaultPreset.toolNames) : [];
  const nativeTools = toolRegistry.tools.filter((tool) => tool.level === "native");
  const compatibleTools = toolRegistry.tools.filter((tool) => tool.level === "compatible");

  return `# 工具适配说明

> 此文档由 \`node ./scripts/generate-tool-adapters-doc.mjs\` 自动生成，请不要手工修改。

## 设计目标

\`power-ai-skills\` 采用“单一源目录 + 工具适配器”的模式，把企业公共 skill、共享上下文文件、工具专用入口和项目私有 overlay 统一收口到 \`.power-ai/\`。

## 单一源目录

\`\`\`text
.power-ai/
  skills/
  shared/
  adapters/
  tool-registry.json
  team-defaults.json
  template-registry.json
  selected-tools.json
\`\`\`

- \`skills/\`：企业公共 skill 与项目私有 overlay
- \`shared/\`：AGENTS、CLAUDE、GEMINI、CONVENTIONS 等共享文件
- \`adapters/\`：Cursor、Cline、Windsurf 等工具专用适配文件
- \`tool-registry.json\`：工具注册表
- \`team-defaults.json\`：团队默认接入策略
- \`template-registry.json\`：模板与 ownerTool、输出路径、占位符的绑定关系
- \`selected-tools.json\`：当前项目实际启用的工具集合

## 正式配置源

- 仓库工具注册表：\`config/tool-registry.json\`
- 仓库团队默认配置：\`config/team-defaults.json\`
- 仓库模板注册表：\`config/template-registry.json\`
- 仓库 JSON Schema：\`config/schemas/tool-registry.schema.json\`、\`config/schemas/team-defaults.schema.json\`、\`config/schemas/template-registry.schema.json\`
- 消费项目透明副本：\`.power-ai/tool-registry.json\`、\`.power-ai/team-defaults.json\`、\`.power-ai/template-registry.json\`

## 工具清单

${buildToolSection("原生支持", nativeTools)}
${buildToolSection("兼容支持", compatibleTools)}
## 团队默认配置

- 默认 preset：${defaultPresetName ? formatCode(defaultPresetName) : "未配置"}
- 默认 preset profiles：${defaultPreset ? defaultPreset.profileNames.map((name) => formatCode(name)).join("、") || "无" : "无"}
- 默认展开工具：${defaultExpandedTools.length > 0 ? defaultExpandedTools.map((toolName) => formatCode(toolName)).join("、") : "无"}

查看默认配置：

\`\`\`bash
npx power-ai-skills show-defaults
\`\`\`

## Profiles

${buildProfilesSection()}

## 入口生成策略

### 目录入口

${buildEntrypointSection("directory-link")}

目录入口优先创建目录链接；如遇文件系统限制，则回退为复制目录。

### 文件入口

${buildEntrypointSection("file-link")}

文件入口优先创建 hard link；如遇文件系统限制，则回退为复制文件。

## 模板注册表

${buildTemplateSection()}

## 工具读取优先级约定

从 \`0.8.2\` 开始，工具执行流程和读取优先级统一定义在 \`config/tool-registry.json\`，模板绑定统一定义在 \`config/template-registry.json\`。  
\`init\` / \`sync\` 在生成 \`.power-ai/shared/*\` 和 \`.power-ai/adapters/*\` 时，会自动按这些配置渲染。

${buildReadPrioritySection()}

## 常用命令

## Conversation Capture Wrappers

浠?\`1.1.7\` 寮€濮嬶紝conversation-miner 瀵瑰鎻愪緵缁熶竴鐨?wrapper 鍏ュ彛 \`tool-capture-session --tool <name>\`锛屽悓鏃朵繚鐣欏叿浣撳伐鍏风殑涓撶敤鍛戒护銆?

${buildCaptureWrappersSection()}

## Capture Adapter Examples

\`1.1.8\` 开始，\`init\` / \`sync\` 会同时生成 conversation capture 接入示例和 contract 文件，方便新工具直接按统一协议接入：

${buildCaptureAdapterExamplesSection()}

## Recommended Capture Modes

\`1.2.6\` 开始，conversation capture 会按工具宿主类型区分推荐路径：终端类工具优先走 \`-Auto\` 直连，GUI / IDE 类工具优先走 host bridge 或 response inbox bridge。

${buildRecommendedCaptureModesSection()}

## Wrapper Promotion Scaffold

\`1.2.8\` 开始，可用 \`scaffold-wrapper-promotion\` 为未注册工具生成晋升正式 wrapper 的 proposal：

\`\`\`bash
npx power-ai-skills scaffold-wrapper-promotion --tool my-new-tool --display-name "My New Tool" --style gui
\`\`\`

输出会写到：

\`\`\`text
.power-ai/proposals/wrapper-promotions/my-new-tool/wrapper-promotion.json
.power-ai/proposals/wrapper-promotions/my-new-tool/README.md
\`\`\`

\`1.2.9\` 开始，可继续执行：

\`\`\`bash
npx power-ai-skills review-wrapper-promotion --tool my-new-tool --status accepted --note "ready for wrapper registration"
npx power-ai-skills list-wrapper-promotions --json
npx power-ai-skills materialize-wrapper-promotion --tool my-new-tool
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool
\`\`\`

## 甯哥敤鍛戒护

\`\`\`bash
npx power-ai-skills list-tools
npx power-ai-skills show-defaults
npx power-ai-skills init
npx power-ai-skills init --tool codex --tool cursor
npx power-ai-skills init --profile editor
npx power-ai-skills add-tool --tool claude-code
npx power-ai-skills remove-tool --tool trae
npx power-ai-skills sync
npx power-ai-skills doctor
\`\`\`

## doctor 检查范围

- 校验 \`.power-ai\` 是否完整
- 校验 \`.power-ai/skills\` 分组是否与源 skill 目录一致
- 校验 \`.power-ai/tool-registry.json\`、\`.power-ai/team-defaults.json\`、\`.power-ai/template-registry.json\`、\`.power-ai/selected-tools.json\` 是否存在
- 校验 \`.power-ai/skills/project-local\` 是否存在
- 校验 conversation capture contract、guidance 和 adapter example 是否完整
- 校验未选中的入口是否已清理
- 校验已选入口是否可用，并区分 \`linked-directory\`、\`copied-directory\`、\`hard-link-file\`、\`copied-file\`

## 迁移说明

如果旧项目只有 \`.trae\`、\`.codex\`、\`.cursor\` 等目录，没有 \`.power-ai/\`，\`sync\` 和 \`doctor\` 会尝试从旧入口推断当前启用的工具集合。  
建议升级后执行一次显式初始化，把工具选择固化到 \`.power-ai/selected-tools.json\`。
`;
}

const nextContent = `${buildDocument().trim()}\n`;

if (checkMode) {
  const currentContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
  if (currentContent !== nextContent) {
    console.error("[generate-tool-adapters-doc] docs/tool-adapters.md is out of date. Run: node ./scripts/generate-tool-adapters-doc.mjs");
    process.exit(1);
  }
  console.log("tool-adapters 文档校验通过");
} else {
  fs.writeFileSync(targetPath, nextContent, "utf8");
  console.log(`Generated: ${targetPath}`);
}
