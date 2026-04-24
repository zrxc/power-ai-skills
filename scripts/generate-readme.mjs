import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const toolRegistry = readJson(path.join(root, "config", "tool-registry.json"));
const teamDefaults = readJson(path.join(root, "config", "team-defaults.json"));
const templateRegistry = readJson(path.join(root, "config", "template-registry.json"));
const targetPath = path.join(root, "README.md");
const checkMode = process.argv.includes("--check");

function formatCode(value) {
  return `\`${value}\``;
}

function normalizeNames(values) {
  return [...new Set((values || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function resolveProfile(profileName) {
  const profile = toolRegistry.profiles.find((item) => item.name === profileName);
  if (!profile) throw new Error(`Unknown profile: ${profileName}`);
  return profile;
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

function resolvePresetSelection(presetName) {
  const preset = (teamDefaults.presetSelections || []).find((item) => item.name === presetName);
  if (!preset) throw new Error(`Unknown preset: ${presetName}`);
  const profileNames = normalizeNames(preset.profiles || []);
  const profileTools = profileNames.flatMap((profileName) => resolveProfile(profileName).tools || []);
  const toolNames = normalizeNames([...(preset.tools || []), ...profileTools]);
  const excluded = new Set(normalizeNames(preset.excludeTools || []));
  return {
    preset,
    profileNames,
    toolNames: toolNames.filter((toolName) => !excluded.has(toolName))
  };
}

function buildToolLines(level) {
  return toolRegistry.tools
    .filter((tool) => tool.level === level)
    .map((tool) => `- ${formatCode(tool.name)}：${tool.displayName}`)
    .join("\n");
}

function buildProfileLines() {
  return toolRegistry.profiles
    .map((profile) => `- ${formatCode(profile.name)}：${(profile.tools || []).map((toolName) => formatCode(toolName)).join("、")}`)
    .join("\n");
}

function buildEntrypointLines(type) {
  return toolRegistry.tools
    .flatMap((tool) => (tool.entrypoints || []).filter((entrypoint) => entrypoint.type === type).map((entrypoint) => `- ${formatCode(tool.name)} -> ${formatCode(entrypoint.target)}`))
    .join("\n");
}

function buildTemplateLines() {
  return templateRegistry.templates
    .map((template) => `- ${formatCode(template.name)}：${formatCode(template.output)}，ownerTool: ${formatCode(template.ownerTool)}`)
    .join("\n");
}

function buildReferenceLines() {
  return [
    "docs/architecture-0.9.0.md",
    "docs/component-knowledge-plan.md",
    "docs/troubleshooting-consumer.md",
    "docs/doctor-error-codes.md",
    "docs/tool-adapters.md",
    "docs/command-manual.md",
    "docs/maintenance-guide.md",
    "docs/ci-integration.md",
    "docs/upstream-pipeline-integration.md",
    "docs/component-upgrade-flow.md",
    "docs/compatibility-matrix.md",
    "docs/release-process.md",
    "docs/governance.md",
    "docs/versioning-policy.md",
    "skills/orchestration/entry-skill/references/aliases.md",
    "skills/orchestration/entry-skill/references/comment-rules.md",
    "config/tool-registry.json",
    "config/team-defaults.json",
    "config/template-registry.json",
    "config/schemas/tool-registry.schema.json",
    "config/schemas/team-defaults.schema.json",
    "config/schemas/template-registry.schema.json",
    "CHANGELOG.md"
  ].map((item) => `- ${formatCode(item)}`).join("\n");
}

function buildDocument() {
  const defaultPresetName = teamDefaults.defaultSelection?.preset || (teamDefaults.defaultSelection?.presets || [])[0] || "";
  const defaultPresetSelection = defaultPresetName ? resolvePresetSelection(defaultPresetName) : null;
  const defaultExpandedTools = defaultPresetSelection ? expandDependencies(defaultPresetSelection.toolNames) : [];

  return `# ${packageJson.name}

> 此 README 由 \`node ./scripts/generate-readme.mjs\` 自动生成，请不要手工修改。

企业前端 AI skill 中心仓库，面向 ${formatCode("@power/runtime-vue3")}、${formatCode("@power/p-components")}、${formatCode("@power/style")} 以及通用前端页面骨架。

## 目标

- 统一维护企业级前端 skill
- 通过私有 npm 分发到各业务项目
- 用 ${formatCode(".power-ai/")} 作为项目内唯一真实源目录
- 让业务项目按工具选择入口，而不是默认全量生成
- 把基础框架、组件库、页面骨架和交互约束沉淀为可复用的 AI 开发资产

## 目录结构

\`\`\`text
skills/
  orchestration/
  foundation/
  ui/
  workflow/
  engineering/
templates/
scripts/
bin/
baseline/
manifest/
docs/
config/
\`\`\`

## 单一源目录模式

从 \`0.6.0\` 开始，消费项目统一维护一份真实内容：

\`\`\`text
.power-ai/
  skills/
    project-local/
  shared/
  adapters/
  context/
  governance/
  reports/
  proposals/
  tool-registry.json
  team-policy.json
  team-defaults.json
  template-registry.json
  selected-tools.json
\`\`\`

- ${formatCode(".power-ai/skills/")}：企业公共 skill 的唯一真实源目录
- ${formatCode(".power-ai/skills/project-local/")}：项目私有补充规则
- ${formatCode(".power-ai/shared/")} 和 ${formatCode(".power-ai/adapters/")}：工具共享文件与适配文件
- ${formatCode(".power-ai/context/")}：项目治理上下文快照目录
- ${formatCode(".power-ai/governance/")}：画像决策、会话决策、promotion trace 等治理账本目录
- ${formatCode(".power-ai/reports/")}：baseline、doctor、治理汇总与历史查询等报告目录
- ${formatCode(".power-ai/proposals/")}：wrapper promotion proposal 与 archive 目录
- ${formatCode(".power-ai/tool-registry.json")}：工具注册表副本
- ${formatCode(".power-ai/team-policy.json")}：团队策略快照副本
- ${formatCode(".power-ai/team-defaults.json")}：团队默认接入配置副本
- ${formatCode(".power-ai/template-registry.json")}：模板注册表副本
- ${formatCode(".power-ai/selected-tools.json")}：项目当前实际启用的工具集合

## 工具注册表与团队默认配置

- 工具注册表：${formatCode("config/tool-registry.json")}
- 团队默认配置：${formatCode("config/team-defaults.json")}
- 模板注册表：${formatCode("config/template-registry.json")}
- JSON Schema：${formatCode("config/schemas/tool-registry.schema.json")}、${formatCode("config/schemas/team-defaults.schema.json")}、${formatCode("config/schemas/template-registry.schema.json")}
- 文档和模板中的读取优先级、执行流程、模板 ownerTool 都来自这些配置

当前团队默认配置：
- 默认 preset：${defaultPresetName ? formatCode(defaultPresetName) : "未配置"}
- 默认 preset profiles：${defaultPresetSelection ? defaultPresetSelection.profileNames.map((item) => formatCode(item)).join("、") || "无" : "无"}
- 默认展开工具：${defaultExpandedTools.length > 0 ? defaultExpandedTools.map((item) => formatCode(item)).join("、") : "无"}

入口识别与注释规范统一维护在：
- ${formatCode("skills/orchestration/entry-skill/references/aliases.md")}
- ${formatCode("skills/orchestration/entry-skill/references/comment-rules.md")}

## 业务项目接入

### 1. 安装

首次安装前，在项目根目录配置私仓：

\`\`\`bash
@power:registry=http://192.168.140.17:8081/nexus/repository/npm-private/
\`\`\`

安装包：

\`\`\`bash
pnpm add -D @power/power-ai-skills
\`\`\`

### 2. 初始化项目

使用团队默认配置初始化：

\`\`\`bash
npx power-ai-skills init
\`\`\`

默认还会追加一轮项目扫描，生成：

\`\`\`text
.power-ai/analysis/
  project-profile.json
  patterns.json
  pattern-review.json
  pattern-diff.json
  pattern-history.json
  component-graph.json
  component-propagation.json
.power-ai/conversations/
.power-ai/patterns/project-patterns.json
.power-ai/auto-capture/inbox/
.power-ai/auto-capture/response-inbox/
.power-ai/governance/
.power-ai/context/project-governance-context.json
.power-ai/proposals/
.power-ai/reports/
.power-ai/skills/project-local/
\`\`\`

其中：
- \`analysis/\`：项目扫描、模式识别、组件图和传播结果
- \`conversations/\` 和 \`patterns/\`：原始会话与聚合模式
- \`governance/\` 和 \`context/\`：画像决策、会话决策、promotion trace、治理上下文
- \`reports/\`：scan summary、baseline、doctor、治理汇总和历史查询报告
- \`skills/project-local/\`：auto-generated 与 manual 两层项目私有 skill

完整产物说明和字段契约见 ${formatCode("docs/command-manual.md")}。

指定工具：

\`\`\`bash
npx power-ai-skills init --tool codex --tool trae --tool cursor
\`\`\`

也支持简写：

\`\`\`bash
npx power-ai-skills init codex trae cursor
npx power-ai-skills init "codex|trae|cursor"
npx power-ai-skills init codex,cursor
\`\`\`

按 profile 初始化：

\`\`\`bash
npx power-ai-skills init --profile openai
npx power-ai-skills init --profile editor
npx power-ai-skills init --profile terminal
\`\`\`

指定项目目录：

\`\`\`bash
npx power-ai-skills init --tool codex --tool cursor --project D:/your-project
\`\`\`

只跑冷启动扫描，不改工具入口：

\`\`\`bash
npx power-ai-skills init --project-scan-only
\`\`\`

跳过项目扫描：

\`\`\`bash
npx power-ai-skills init --tool codex --no-project-scan
\`\`\`

强制重建自动生成的 project-local 草案：

\`\`\`bash
npx power-ai-skills init --tool codex --regenerate-project-local
\`\`\`

### 3. 项目扫描与 project-local 草案

\`\`\`bash
npx power-ai-skills scan-project
npx power-ai-skills diff-project-scan
npx power-ai-skills generate-project-local-skills
npx power-ai-skills generate-project-local-skills --regenerate-project-local
npx power-ai-skills list-project-local-skills
npx power-ai-skills promote-project-local-skill basic-list-page-project
\`\`\`

项目扫描现在会同时输出模式识别、复核决策、历史快照、diff、组件引用图和多跳传播结果；只有达到频次、置信度、纯度分和复用分门限的模式才会自动生成草案。\`1.0.6\` 起，Vue 页面扫描底层升级为 SFC AST + template AST + script AST。\`1.0.7\` 起，本地 fragment 会通过组件引用图反向响应页面识别。\`1.0.8\` 起，页面还会继承 \`page -> fragment -> dialog-fragment\` 这类多跳链路上的信号。人工确认后，可以把 auto-generated 草案晋升到 \`project-local/manual\`。

### 4. 查看工具、profile 和默认配置

\`\`\`bash
npx power-ai-skills list-tools
npx power-ai-skills show-defaults
\`\`\`

### 5. 团队治理与项目画像

\`\`\`bash
npx power-ai-skills show-team-policy --json
npx power-ai-skills validate-team-policy --json
npx power-ai-skills check-team-policy-drift --json
npx power-ai-skills show-project-profile-decision --json
npx power-ai-skills review-project-profile --accept-recommended --json
npx power-ai-skills review-project-profile --defer --reason "keep current profile" --next-review-at 2026-05-01 --json
npx power-ai-skills check-governance-review-deadlines --json
npx power-ai-skills show-project-governance-context --json
npx power-ai-skills generate-governance-summary --json
npx power-ai-skills show-governance-history --type profile-decision --limit 10 --json
npx power-ai-skills check-project-baseline --json
\`\`\`

这批命令用于查看团队策略、项目画像推荐、治理上下文、review deadline 和治理历史。当前项目已经支持从推荐画像 warning 继续推进到可审计的 decision flow，并把这些结果接入 baseline、doctor、upgrade-advice 和 release gates。

### Conversation Miner

\`\`\`bash
npx power-ai-skills tool-capture-session --tool codex --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills submit-auto-capture --tool trae --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --consume-now --json
npx power-ai-skills submit-auto-capture --tool codex --stdin --extract-marked-block --consume-now --json
npx power-ai-skills queue-auto-capture-response --tool cursor --from-file .power-ai/tmp/assistant-response.txt --json
npx power-ai-skills queue-auto-capture-response --tool windsurf --from-file .power-ai/tmp/assistant-response.txt --consume-now --json
npx power-ai-skills consume-auto-capture-response-inbox --max-items 10 --json
npx power-ai-skills consume-auto-capture-inbox --max-items 10 --json
npx power-ai-skills watch-auto-capture-inbox --once --json
npx power-ai-skills prepare-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills confirm-session-capture --request capture_xxx
npx power-ai-skills confirm-session-capture --request capture_xxx --reject --json
npx power-ai-skills evaluate-session-capture --input .power-ai/tmp/session-summary.json
npx power-ai-skills evaluate-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills capture-session --input .power-ai/tmp/session-summary.json
npx power-ai-skills capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills capture-session --stdin --extract-marked-block --json
npx power-ai-skills capture-session --input .power-ai/tmp/session-summary.json --force
npx power-ai-skills analyze-patterns
npx power-ai-skills analyze-patterns --from 2026-03-01 --to 2026-03-13
npx power-ai-skills generate-project-skill --pattern pattern_tree_list_page
npx power-ai-skills scaffold-wrapper-promotion --tool my-new-tool --display-name "My New Tool" --style gui
npx power-ai-skills review-wrapper-promotion --tool my-new-tool --status accepted --note "ready for wrapper registration"
npx power-ai-skills list-wrapper-promotions --json
npx power-ai-skills materialize-wrapper-promotion --tool my-new-tool
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool
\`\`\`

常用能力分组：
- 收集入口：\`tool-capture-session\`、\`prepare-session-capture\`、\`confirm-session-capture\`
- 自动落盘：\`submit-auto-capture\`、\`queue-auto-capture-response\`、\`watch-auto-capture-inbox\`
- 模式提炼：\`capture-session\`、\`analyze-patterns\`、\`generate-project-skill\`
- wrapper 治理：\`scaffold-wrapper-promotion\`、\`review-wrapper-promotion\`、\`materialize-wrapper-promotion\`、\`apply-wrapper-promotion\`

\`1.1.7\` 起，在保留 \`codex-capture-session\`、\`cursor-capture-session\`、\`claude-code-capture-session\` 的同时，新增了统一入口 \`tool-capture-session --tool <name>\`。对外适配层可以只依赖这一条命令，不需要再自己维护专用 wrapper 命令名称映射。

\`1.1.8\` 起，\`init\` / \`sync\` 会预创建 conversation capture contract、共享 capture guidance 以及 \`adapters/*.example.ps1\` 示例脚本，新的 AI 工具只需遵循 marked block 协议就能更快接入。

\`1.1.9\` 起，\`codex\`、\`trae\`、\`cursor\`、\`claude-code\`、\`windsurf\`、\`gemini-cli\`、\`github-copilot\`、\`cline\`、\`aider\` 都已接入统一 wrapper 注册表，可以直接走完整的确认式 capture 链路。

\`1.2.0\` 起，conversation-miner 新增 auto-capture runtime，可以把已确认的 marked block 通过 \`submit-auto-capture\` 提交到 \`.power-ai/auto-capture/inbox\`，再用即时消费模式或独立 watcher 自动落盘到 \`.power-ai/conversations/\`，不再需要用户手动跑第二条收集命令。

\`1.2.1\` 起，如果某个 AI 工具不能直接执行 CLI，也可以把已确认的回复文本写入 \`.power-ai/auto-capture/response-inbox/\`，由 watcher 自动完成 marked block 提取、门禁判断和 conversations 落盘。

\`1.2.2\` 起，所有 \`<tool>-capture.example.ps1\` 还支持 \`-QueueResponse\` 模式，并可通过 \`-ConsumeNow\` 直接完成"原始回复 -> response inbox bridge -> auto-capture runtime -> conversations"的单命令闭环。

更多 wrapper 示例脚本、适配矩阵和完整命令参数见 ${formatCode("docs/tool-adapters.md")} 与 ${formatCode("docs/command-manual.md")}。

### 6. 会话治理与追溯

\`\`\`bash
npx power-ai-skills review-conversation-pattern --pattern pattern_xxx --accept --target project-local-skill --json
npx power-ai-skills review-conversation-pattern --from-review --accept --target project-local-skill --json
npx power-ai-skills review-conversation-pattern --from-state review --archive --limit 5 --json
npx power-ai-skills show-promotion-trace --pattern pattern_xxx --json
npx power-ai-skills generate-upgrade-summary --json
\`\`\`

当前会话治理已经支持 pattern decision ledger、批量审阅、promotion trace 和升级摘要联动，适合把 conversation-derived changes 继续推进到 project-local skill、wrapper proposal 和 release artifact。

### 7. 后续同步

\`\`\`bash
npx power-ai-skills sync
\`\`\`

### 8. 增减工具

\`\`\`bash
npx power-ai-skills add-tool --tool cline
npx power-ai-skills remove-tool --tool trae
\`\`\`

### 9. 自检

\`\`\`bash
npx power-ai-skills doctor
npx power-ai-skills version
\`\`\`

### 10. 推荐脚本

以下脚本需要在消费项目的 \`package.json\` 中显式配置；配置后，升级依赖并执行安装时才会自动同步 \`.power-ai/\`。

\`\`\`json
{
  "scripts": {
    "skills:sync": "power-ai-skills sync",
    "postinstall": "power-ai-skills sync"
  }
}
\`\`\`

## 支持的工具

### 原生支持

${buildToolLines("native")}

### 兼容支持

${buildToolLines("compatible")}

## Profiles

${buildProfileLines()}

## 模板与入口

### 模板注册表

${buildTemplateLines()}

### 目录入口

${buildEntrypointLines("directory-link")}

目录入口优先使用目录链接，文件系统不支持时回退为复制目录。

### 文件入口

${buildEntrypointLines("file-link")}

文件入口优先使用 hard link，文件系统不支持时回退为复制文件。

## 升级自动化

影响分析：

\`\`\`bash
node ./scripts/impact-check.mjs --from-file changed-files.txt
\`\`\`

生成升级任务：

\`\`\`bash
pnpm impact:task -- --report manifest/impact-report.json
\`\`\`

上游总控命令：

\`\`\`bash
pnpm upgrade:automation -- --base <git-base> --head <git-head> --repo <upstream-repo-path> --consumer <project-path>
\`\`\`

生成通知载荷：

\`\`\`bash
pnpm upgrade:payload
\`\`\`

生成治理运营摘要：

\`\`\`bash
pnpm governance:operations -- --automation-report manifest/automation-report.json
\`\`\`

发布门禁检查：

\`\`\`bash
pnpm check:release-gates -- --require-consumer-matrix
\`\`\`

刷新当前版本发布产物：

\`\`\`bash
pnpm refresh:release-artifacts
\`\`\`

完整发布收口：

\`\`\`bash
pnpm release:prepare
\`\`\`

当前包只会收录“当前版本”的 notification payload 与 impact task；历史通知和历史设计稿保留在源码仓库或归档目录，不作为 npm 包内容分发。

完整发布步骤、门禁要求和发包顺序见 ${formatCode("docs/release-process.md")}。

## 新增 skill

\`\`\`bash
node ./scripts/scaffold-skill.mjs your-skill-name ui
\`\`\`

## 维护规则

- skill 文档默认中文
- 生成代码时默认补充有信息量的中文注释
- 复杂状态、关键数据流、边界处理必须写清楚
- ${formatCode("SKILL.md")} 只保留用途、触发条件、实现清单和切换规则
- 详细模板、字段表和接口说明放到 ${formatCode("references/")}
- 修改 skill 后必须重新生成 manifest
- 发布前执行 ${formatCode("pnpm release:prepare")}

## 参考文档

${buildReferenceLines()}

> 历史技术方案设计稿保留在源码仓库的 \`docs/technical-solutions/\`，不随 npm 包发布。
`;
}

const nextContent = `${buildDocument().trim()}\n`;

if (checkMode) {
  const currentContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
  if (currentContent !== nextContent) {
    console.error("[generate-readme] README.md is out of date. Run: node ./scripts/generate-readme.mjs");
    process.exit(1);
  }
  console.log("README 文档校验通过");
} else {
  fs.writeFileSync(targetPath, nextContent, "utf8");
  console.log(`Generated: ${targetPath}`);
}
