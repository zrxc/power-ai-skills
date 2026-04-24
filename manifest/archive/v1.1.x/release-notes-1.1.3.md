# Release Notes 1.1.3

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.3`
- 生成时间：`2026-03-19T03:19:52.502Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.3

- `conversation-miner` 新增 `prepare-session-capture` 与 `confirm-session-capture` 两段式确认流，供后续 Codex / Cursor / Claude Code wrapper 在提示用户确认后自动完成收集。
- 新增 `.power-ai/pending-captures/` 待确认目录，`prepare-session-capture` 会为 `ask_capture` 结果生成待确认请求，`confirm-session-capture --reject` 则会直接丢弃请求。
- `confirm-session-capture` 在确认后会直接把待收集记录写入 conversations，不再要求 wrapper 重新拼装原始摘要输入。
- 补充 wrapper 风格的确认/拒绝端到端测试，并更新 README、命令手册和 `1.1.3` 设计文档。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
