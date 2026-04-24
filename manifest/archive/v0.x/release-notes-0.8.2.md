# Release Notes 0.8.2

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.8.2`
- 生成时间：`2026-03-12T01:57:07.101Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.8.2

- 把各 AI 工具的“读取优先级”和“执行流程补充说明”抽到 `config/tool-registry.json`，统一由配置驱动。
- `init` / `sync` 生成规则文件时，自动把 `instructionRendering.sharedExecutionFlow` 和 `tools[].instructionLoading` 渲染到 `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、`CONVENTIONS.md` 及各编辑器适配文件。
- 新增工具配置治理校验，要求每个工具显式声明 `instructionLoading`，避免新增工具后模板规则缺失。
- 更新工具适配文档，说明读取优先级已改为配置驱动，不再手工维护模板内的同类文案。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
