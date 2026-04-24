# Release Notes 1.1.7

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.7`
- 生成时间：`2026-03-19T06:12:42.185Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.7

- 新增统一 wrapper 入口 `tool-capture-session --tool <name>`，让外部适配层不再需要自己维护 `codex`、`cursor`、`claude-code` 的命令名映射。
- 新增共享 wrapper 注册表，并让命令层与适配文档共同复用这份定义。
- `tool-capture-session` 当前支持 `codex`、`cursor`、`claude-code`，对未注册工具会明确报错。
- 更新 `tool-adapters.md`、README、命令手册和 `1.1.7` 设计文档，并补充统一入口的端到端测试。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
