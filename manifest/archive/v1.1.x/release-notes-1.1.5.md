# Release Notes 1.1.5

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.5`
- 生成时间：`2026-03-19T03:52:41.554Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.5

- 在 `1.1.4` 的 Codex wrapper 基础上继续新增 `cursor-capture-session`，让 Cursor 也能复用同一套确认式自动收集链路。
- 抽取共享 wrapper 执行逻辑，避免 `codex`、`cursor` 后续继续复制 `prepare -> confirm/reject` 流程。
- `cursor-capture-session` 同样支持 `--yes`、`--reject`、`--json` 以及 `--from-file/--stdin/--extract-marked-block`。
- 补充 Cursor wrapper 的端到端测试，并更新 README、命令手册和 `1.1.5` 设计文档。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
