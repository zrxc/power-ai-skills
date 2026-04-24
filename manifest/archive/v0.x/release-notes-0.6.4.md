# Release Notes 0.6.4

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.6.4`
- 生成时间：`2026-03-11T09:24:58.899Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.6.4

- `list-tools`、`show-defaults`、`doctor` 新增 `--format markdown`，可以直接复制到 issue、群通知和发布说明里。
- `--format md` 作为 `--format markdown` 的简写。
- 保留 `json` 和 `summary` 两种已有输出，兼容原有脚本与人工排查流程。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
