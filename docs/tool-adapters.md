# 工具适配说明

> 此文档由 `node ./scripts/generate-tool-adapters-doc.mjs` 自动生成，请不要手工修改。

## 设计目标

`power-ai-skills` 采用“单一源目录 + 工具适配器”的模式，把企业公共 skill、共享上下文文件、工具专用入口和项目私有 overlay 统一收口到 `.power-ai/`。

## 单一源目录

```text
.power-ai/
  skills/
  shared/
  adapters/
  tool-registry.json
  team-defaults.json
  template-registry.json
  selected-tools.json
```

- `skills/`：企业公共 skill 与项目私有 overlay
- `shared/`：AGENTS、CLAUDE、GEMINI、CONVENTIONS 等共享文件
- `adapters/`：Cursor、Cline、Windsurf 等工具专用适配文件
- `tool-registry.json`：工具注册表
- `team-defaults.json`：团队默认接入策略
- `template-registry.json`：模板与 ownerTool、输出路径、占位符的绑定关系
- `selected-tools.json`：当前项目实际启用的工具集合

## 正式配置源

- 仓库工具注册表：`config/tool-registry.json`
- 仓库团队默认配置：`config/team-defaults.json`
- 仓库模板注册表：`config/template-registry.json`
- 仓库 JSON Schema：`config/schemas/tool-registry.schema.json`、`config/schemas/team-defaults.schema.json`、`config/schemas/template-registry.schema.json`
- 消费项目透明副本：`.power-ai/tool-registry.json`、`.power-ai/team-defaults.json`、`.power-ai/template-registry.json`

## 工具清单

### 原生支持

- `codex`
- `trae`
- `cursor`
- `claude-code`
- `cline`
- `windsurf`
- `gemini-cli`
- `aider`

### 兼容支持

- `agents-md`
- `github-copilot`
- `vscode-agent`

## 团队默认配置

- 默认 preset：`enterprise-standard`
- 默认 preset profiles：`openai`
- 默认展开工具：`agents-md`、`claude-code`、`codex`、`cursor`、`trae`

查看默认配置：

```bash
npx power-ai-skills show-defaults
```

## Profiles

- `minimal` -> `agents-md`
- `openai` -> `codex`
- `editor` -> `cursor`、`cline`、`windsurf`
- `anthropic` -> `claude-code`
- `google` -> `gemini-cli`
- `terminal` -> `codex`、`claude-code`、`gemini-cli`、`aider`
- `all-native` -> `codex`、`trae`、`cursor`、`claude-code`、`cline`、`windsurf`、`gemini-cli`、`aider`

## 入口生成策略

### 目录入口

- `codex` -> `.codex/skills`（源：`skills`）
- `trae` -> `.trae/skills`（源：`skills`）

目录入口优先创建目录链接；如遇文件系统限制，则回退为复制目录。

### 文件入口

- `agents-md` -> `AGENTS.md`（源：`shared/AGENTS.md`）
- `cursor` -> `.cursor/rules/skills.mdc`（源：`adapters/cursor/skills.mdc`）
- `claude-code` -> `CLAUDE.md`（源：`shared/CLAUDE.md`）
- `cline` -> `.clinerules/01-power-ai.md`（源：`adapters/cline/01-power-ai.md`）
- `windsurf` -> `.windsurf/rules/01-power-ai.md`（源：`adapters/windsurf/01-power-ai.md`）
- `gemini-cli` -> `GEMINI.md`（源：`shared/GEMINI.md`）
- `aider` -> `CONVENTIONS.md`（源：`shared/CONVENTIONS.md`）
- `aider` -> `.aider.conf.yml`（源：`shared/aider.conf.yml`）

文件入口优先创建 hard link；如遇文件系统限制，则回退为复制文件。

## 模板注册表

- `shared-agents` -> `shared/AGENTS.md`，ownerTool: `agents-md`，placeholders: `POWER_AI_EXECUTION_FLOW`、`POWER_AI_READ_PRIORITY`、`POWER_AI_CONVERSATION_CAPTURE`
- `shared-claude` -> `shared/CLAUDE.md`，ownerTool: `claude-code`，placeholders: `POWER_AI_EXECUTION_FLOW`、`POWER_AI_READ_PRIORITY`、`POWER_AI_CONVERSATION_CAPTURE`
- `shared-gemini` -> `shared/GEMINI.md`，ownerTool: `gemini-cli`，placeholders: `POWER_AI_EXECUTION_FLOW`、`POWER_AI_READ_PRIORITY`、`POWER_AI_CONVERSATION_CAPTURE`
- `shared-conventions` -> `shared/CONVENTIONS.md`，ownerTool: `aider`，placeholders: `POWER_AI_EXECUTION_FLOW`、`POWER_AI_READ_PRIORITY`、`POWER_AI_CONVERSATION_CAPTURE`
- `shared-aider-config` -> `shared/aider.conf.yml`，ownerTool: `aider`，placeholders: 无占位符
- `cursor-rules` -> `adapters/cursor/skills.mdc`，ownerTool: `cursor`，placeholders: `POWER_AI_EXECUTION_FLOW`、`POWER_AI_READ_PRIORITY`、`POWER_AI_CONVERSATION_CAPTURE`
- `cline-rules` -> `adapters/cline/01-power-ai.md`，ownerTool: `cline`，placeholders: `POWER_AI_EXECUTION_FLOW`、`POWER_AI_READ_PRIORITY`、`POWER_AI_CONVERSATION_CAPTURE`
- `windsurf-rules` -> `adapters/windsurf/01-power-ai.md`，ownerTool: `windsurf`，placeholders: `POWER_AI_EXECUTION_FLOW`、`POWER_AI_READ_PRIORITY`、`POWER_AI_CONVERSATION_CAPTURE`

## 工具读取优先级约定

从 `0.8.2` 开始，工具执行流程和读取优先级统一定义在 `config/tool-registry.json`，模板绑定统一定义在 `config/template-registry.json`。  
`init` / `sync` 在生成 `.power-ai/shared/*` 和 `.power-ai/adapters/*` 时，会自动按这些配置渲染。

### AGENTS.md

- 工具名：`agents-md`
- 主入口类型：`file`
- 主入口：`AGENTS.md`
- 补充来源：无
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：无
- 备注：其中页面骨架和组件选型继续优先遵循工具入口文件与当前项目约定。

### Codex

- 工具名：`codex`
- 主入口类型：`mixed`
- 主入口：`AGENTS.md`、`.codex/skills/`
- 补充来源：无
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`AGENTS.md` > `.codex/skills/` > `project-local` > 企业公共 skill
- 工具依赖：`agents-md`

### Trae

- 工具名：`trae`
- 主入口类型：`directory`
- 主入口：`.trae/skills/`
- 补充来源：`AGENTS.md`
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`.trae/skills/` > `AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：无
- 备注：Trae 的稳定主入口仍然是 `.trae/skills/`。

### Cursor

- 工具名：`cursor`
- 主入口类型：`file`
- 主入口：`.cursor/rules/skills.mdc`
- 补充来源：`AGENTS.md`
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`skills.mdc` > `AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：`agents-md`

### Claude Code

- 工具名：`claude-code`
- 主入口类型：`file`
- 主入口：`CLAUDE.md`
- 补充来源：`AGENTS.md`
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`CLAUDE.md` > `AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：无

### Cline

- 工具名：`cline`
- 主入口类型：`file`
- 主入口：`.clinerules/01-power-ai.md`
- 补充来源：`AGENTS.md`
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`01-power-ai.md` > `AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：无

### Windsurf

- 工具名：`windsurf`
- 主入口类型：`file`
- 主入口：`.windsurf/rules/01-power-ai.md`
- 补充来源：`AGENTS.md`
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`01-power-ai.md` > `AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：无

### Gemini CLI

- 工具名：`gemini-cli`
- 主入口类型：`file`
- 主入口：`GEMINI.md`
- 补充来源：`AGENTS.md`
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`GEMINI.md` > `AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：无

### Aider

- 工具名：`aider`
- 主入口类型：`file`
- 主入口：`CONVENTIONS.md`
- 补充来源：`AGENTS.md`
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`CONVENTIONS.md` > `AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：无

### GitHub Copilot

- 工具名：`github-copilot`
- 主入口类型：`file`
- 主入口：`AGENTS.md`
- 补充来源：无
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：`agents-md`

### VS Code Agent Mode

- 工具名：`vscode-agent`
- 主入口类型：`file`
- 主入口：`AGENTS.md`
- 补充来源：无
- 路由入口：`.power-ai/skills/orchestration/entry-skill/`
- 项目私有覆盖：`.power-ai/skills/project-local/`
- 冲突优先级：`AGENTS.md` > `project-local` > 企业公共 skill
- 工具依赖：`agents-md`

## 常用命令

## Conversation Capture Wrappers

浠?`1.1.7` 寮€濮嬶紝conversation-miner 瀵瑰鎻愪緵缁熶竴鐨?wrapper 鍏ュ彛 `tool-capture-session --tool <name>`锛屽悓鏃朵繚鐣欏叿浣撳伐鍏风殑涓撶敤鍛戒护銆?

- `codex` -> `codex-capture-session` -> `npx power-ai-skills tool-capture-session --tool codex`
- `trae` -> `trae-capture-session` -> `npx power-ai-skills tool-capture-session --tool trae`
- `cursor` -> `cursor-capture-session` -> `npx power-ai-skills tool-capture-session --tool cursor`
- `claude-code` -> `claude-code-capture-session` -> `npx power-ai-skills tool-capture-session --tool claude-code`
- `windsurf` -> `windsurf-capture-session` -> `npx power-ai-skills tool-capture-session --tool windsurf`
- `gemini-cli` -> `gemini-cli-capture-session` -> `npx power-ai-skills tool-capture-session --tool gemini-cli`
- `github-copilot` -> `github-copilot-capture-session` -> `npx power-ai-skills tool-capture-session --tool github-copilot`
- `cline` -> `cline-capture-session` -> `npx power-ai-skills tool-capture-session --tool cline`
- `aider` -> `aider-capture-session` -> `npx power-ai-skills tool-capture-session --tool aider`

## Capture Adapter Examples

`1.1.8` 开始，`init` / `sync` 会同时生成 conversation capture 接入示例和 contract 文件，方便新工具直接按统一协议接入：

- `.power-ai/adapters/codex-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool codex` / `npx power-ai-skills submit-auto-capture --tool codex` / `npx power-ai-skills queue-auto-capture-response --tool codex`
- `.power-ai/adapters/trae-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool trae` / `npx power-ai-skills submit-auto-capture --tool trae` / `npx power-ai-skills queue-auto-capture-response --tool trae`
- `.power-ai/adapters/cursor-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool cursor` / `npx power-ai-skills submit-auto-capture --tool cursor` / `npx power-ai-skills queue-auto-capture-response --tool cursor`
- `.power-ai/adapters/claude-code-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool claude-code` / `npx power-ai-skills submit-auto-capture --tool claude-code` / `npx power-ai-skills queue-auto-capture-response --tool claude-code`
- `.power-ai/adapters/windsurf-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool windsurf` / `npx power-ai-skills submit-auto-capture --tool windsurf` / `npx power-ai-skills queue-auto-capture-response --tool windsurf`
- `.power-ai/adapters/gemini-cli-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool gemini-cli` / `npx power-ai-skills submit-auto-capture --tool gemini-cli` / `npx power-ai-skills queue-auto-capture-response --tool gemini-cli`
- `.power-ai/adapters/github-copilot-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool github-copilot` / `npx power-ai-skills submit-auto-capture --tool github-copilot` / `npx power-ai-skills queue-auto-capture-response --tool github-copilot`
- `.power-ai/adapters/cline-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool cline` / `npx power-ai-skills submit-auto-capture --tool cline` / `npx power-ai-skills queue-auto-capture-response --tool cline`
- `.power-ai/adapters/aider-capture.example.ps1` -> `npx power-ai-skills tool-capture-session --tool aider` / `npx power-ai-skills submit-auto-capture --tool aider` / `npx power-ai-skills queue-auto-capture-response --tool aider`
- `.power-ai/adapters/custom-tool-capture.example.ps1` -> fallback raw prepare/confirm flow for unregistered tools
- `.power-ai/adapters/start-auto-capture-runtime.example.ps1` -> start `watch-auto-capture-inbox` for background auto-capture processing
- `.power-ai/adapters/trae-host-bridge.example.ps1` -> GUI-host sample for confirmed Trae responses
- `.power-ai/adapters/cursor-host-bridge.example.ps1` -> GUI-host sample for confirmed Cursor responses
- `.power-ai/adapters/windsurf-host-bridge.example.ps1` -> GUI-host sample for confirmed Windsurf responses
- `.power-ai/adapters/cline-host-bridge.example.ps1` -> GUI-host sample for confirmed Cline responses
- `.power-ai/adapters/github-copilot-host-bridge.example.ps1` -> GUI-host sample for confirmed GitHub Copilot responses
- `.power-ai/auto-capture/response-inbox/` -> host tools can drop confirmed response text here when they cannot invoke CLI directly
- `.power-ai/shared/conversation-capture.md` -> shared prompt and capture gate guidance
- `.power-ai/references/conversation-capture-contract.md` -> marked block schema and wrapper contract

## Recommended Capture Modes

`1.2.6` 开始，conversation capture 会按工具宿主类型区分推荐路径：终端类工具优先走 `-Auto` 直连，GUI / IDE 类工具优先走 host bridge 或 response inbox bridge。

### Terminal-first

- `codex` -> prefer `.power-ai/adapters/codex-capture.example.ps1 -ResponseText $response -Auto`
- `claude-code` -> prefer `.power-ai/adapters/claude-code-capture.example.ps1 -ResponseText $response -Auto`
- `gemini-cli` -> prefer `.power-ai/adapters/gemini-cli-capture.example.ps1 -ResponseText $response -Auto`
- `aider` -> prefer `.power-ai/adapters/aider-capture.example.ps1 -ResponseText $response -Auto`

### GUI / IDE host-first

- `trae` -> prefer host bridge or `queue-auto-capture-response --tool trae`
- `cursor` -> prefer host bridge or `queue-auto-capture-response --tool cursor`
- `windsurf` -> prefer host bridge or `queue-auto-capture-response --tool windsurf`
- `github-copilot` -> prefer host bridge or `queue-auto-capture-response --tool github-copilot`
- `cline` -> prefer host bridge or `queue-auto-capture-response --tool cline`

### Unregistered tools

- terminal-style custom tool -> prefer `.power-ai/adapters/custom-tool-capture.example.ps1 -ToolName my-cli -ResponseText $response -Auto`
- GUI-style custom tool -> prefer `.power-ai/adapters/custom-tool-capture.example.ps1 -ToolName my-gui -ResponseText $response -QueueResponse -ConsumeNow`

## Wrapper Promotion Scaffold

`1.2.8` 开始，可用 `scaffold-wrapper-promotion` 为未注册工具生成晋升正式 wrapper 的 proposal：

```bash
npx power-ai-skills scaffold-wrapper-promotion --tool my-new-tool --display-name "My New Tool" --style gui
```

输出会写到：

```text
.power-ai/proposals/wrapper-promotions/my-new-tool/wrapper-promotion.json
.power-ai/proposals/wrapper-promotions/my-new-tool/README.md
```

`1.2.9` 开始，可继续执行：

```bash
npx power-ai-skills review-wrapper-promotion --tool my-new-tool --status accepted --note "ready for wrapper registration"
npx power-ai-skills list-wrapper-promotions --json
npx power-ai-skills materialize-wrapper-promotion --tool my-new-tool
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool
```

## 甯哥敤鍛戒护

```bash
npx power-ai-skills list-tools
npx power-ai-skills show-defaults
npx power-ai-skills init
npx power-ai-skills init --tool codex --tool cursor
npx power-ai-skills init --profile editor
npx power-ai-skills add-tool --tool claude-code
npx power-ai-skills remove-tool --tool trae
npx power-ai-skills sync
npx power-ai-skills doctor
```

## doctor 检查范围

- 校验 `.power-ai` 是否完整
- 校验 `.power-ai/skills` 分组是否与源 skill 目录一致
- 校验 `.power-ai/tool-registry.json`、`.power-ai/team-defaults.json`、`.power-ai/template-registry.json`、`.power-ai/selected-tools.json` 是否存在
- 校验 `.power-ai/skills/project-local` 是否存在
- 校验 conversation capture contract、guidance 和 adapter example 是否完整
- 校验未选中的入口是否已清理
- 校验已选入口是否可用，并区分 `linked-directory`、`copied-directory`、`hard-link-file`、`copied-file`

## 迁移说明

如果旧项目只有 `.trae`、`.codex`、`.cursor` 等目录，没有 `.power-ai/`，`sync` 和 `doctor` 会尝试从旧入口推断当前启用的工具集合。  
建议升级后执行一次显式初始化，把工具选择固化到 `.power-ai/selected-tools.json`。
