# Release Notes 0.7.0

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.7.0`
- 生成时间：`2026-03-11T09:29:47.199Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.7.0

- `list-tools`、`show-defaults`、`doctor` 支持 `--output <file>`，可以直接把结果落盘到指定文件。
- `--output` 同时兼容 `json`、`summary`、`markdown` 三种输出格式。
- 统一新增命令输出落盘逻辑，便于后续继续扩展更多报告类命令。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
