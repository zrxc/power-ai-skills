# Release Notes 1.1.2

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.2`
- 生成时间：`2026-03-19T03:13:18.311Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.2

- `conversation-miner` 新增标准摘要块协议，支持从 AI 回复文本中提取 `<<<POWER_AI_SESSION_SUMMARY_V1 ... >>>` 结构化摘要。
- `evaluate-session-capture` 和 `capture-session` 现在支持 `--from-file`、`--stdin`、`--extract-marked-block` 与 `--save-extracted`，不再要求先手工整理独立 JSON 文件。
- `capture-session` 新增 `--json` 输出，便于后续 Codex / Cursor / Claude Code wrapper 或其它工具适配层直接消费。
- 补充 AI 回复文本提取与标准输入收集的端到端测试，并更新 README、命令手册和 `1.1.2` 技术方案文档。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
