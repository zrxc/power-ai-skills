# Release Notes 1.1.6

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.6`
- 生成时间：`2026-03-19T05:48:14.769Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.6

- 在 `1.1.5` 的共享 wrapper 执行逻辑基础上新增 `claude-code-capture-session`，让 Claude Code 也能接入同一套确认式自动收集链路。
- `claude-code-capture-session` 同样支持 `--yes`、`--reject`、`--json` 以及 `--from-file/--stdin/--extract-marked-block`。
- 继续保持 wrapper 层复用 `prepare-session-capture`、`confirm-session-capture` 与 pending capture 机制，不向 `conversation-miner` 核心再堆工具特化逻辑。
- 补充 Claude Code wrapper 的端到端测试，并更新 README、命令手册和 `1.1.6` 设计文档。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
