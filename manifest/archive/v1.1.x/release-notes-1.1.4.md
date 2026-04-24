# Release Notes 1.1.4

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.4`
- 生成时间：`2026-03-19T03:26:21.087Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.4

- 新增 `codex-capture-session` wrapper 命令，把 `prepare-session-capture -> 用户确认 -> confirm-session-capture` 收敛成一次调用。
- `codex-capture-session` 支持 `--yes`、`--reject`、`--json` 以及 `--from-file/--stdin/--extract-marked-block`，适合先用在 Codex 的自动收集适配层。
- 在交互式终端下，`codex-capture-session` 会直接提示用户确认；非交互场景则要求显式传入 `--yes` 或 `--reject`。
- 补充 `codex` wrapper 的端到端测试，并更新 README、命令手册和 `1.1.4` 设计文档。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
