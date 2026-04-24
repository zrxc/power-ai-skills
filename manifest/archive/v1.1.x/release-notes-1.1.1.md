# Release Notes 1.1.1

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.1`
- 生成时间：`2026-03-19T03:01:58.092Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.1

- `conversation-miner` 新增 `evaluate-session-capture` 门禁命令，用于在提示用户是否收集前，先判断本次摘要是否值得沉淀。
- `capture-session` 默认会执行高价值过滤，自动跳过与项目无关、未完成、重复以及已被现有 project-local skill 覆盖的摘要；如需强制落盘可使用 `--force`。
- 新增 `.power-ai/conversation-miner-config.json` 默认配置和 `.power-ai/reports/session-capture-evaluation.md` 评估报告，便于后续工具适配层消费同一套决策结果。
- 补充重复判定、已覆盖判定和高价值候选测试，确保 `1.1.1` 的自动确认收集链路有稳定的前置门禁。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
