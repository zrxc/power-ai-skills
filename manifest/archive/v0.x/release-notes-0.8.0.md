# Release Notes 0.8.0

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.8.0`
- 生成时间：`2026-03-11T10:00:36.056Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.8.0

- `init` 在交互终端下支持直接展示可选 AI 工具，并在控制台内完成选择与确认。
- `init`、`add-tool`、`remove-tool` 支持位置参数简写，推荐使用 `npx power-ai-skills init codex trae cursor`。
- 额外兼容 `"codex|trae|cursor"`、`codex,cursor` 这类分隔写法，减少重复输入 `--tool`。
- 补充 `--project` 的推荐用法，避免项目路径与工具选择位置参数产生歧义。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
