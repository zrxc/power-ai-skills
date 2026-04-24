# Release Notes 0.6.0

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.6.0`
- 生成时间：`2026-03-11T08:34:36.852Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.6.0

- 重构消费项目接入模式，引入 `.power-ai/` 作为唯一真实源目录。
- 新增工具注册表与工具选择配置，支持 `list-tools`、`init --tool`、`init --profile`、`add-tool`、`remove-tool`。
- 支持按工具生成 Codex、Trae、Cursor、Claude Code、Cline、Windsurf、Gemini CLI、Aider 适配入口。
- `sync` 与 `doctor` 增加旧目录结构迁移兼容，能够自动识别旧的 `.trae`、`.codex`、`.cursor` 项目。
- 新增 `docs/tool-adapters.md` 与 `docs/command-manual.md`，统一说明工具适配和命令用法。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init --tool <tool-name>` 或 `pnpm exec power-ai-skills sync`
