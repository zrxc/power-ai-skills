# Release Notes 1.2.1

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.1`
- 生成时间：`2026-03-23T04:16:48.841Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.1

- 新增 response inbox bridge，补齐 `queue-auto-capture-response` 与 `consume-auto-capture-response-inbox`，让不能直接执行 CLI 的工具也能通过“写入确认后的 AI 回复文件”接入自动收集链路。
- `watch-auto-capture-inbox --once` 现在会先消费 `.power-ai/auto-capture/response-inbox/`，再消费 capture inbox，实现 raw response -> marked block extraction -> gated submit -> conversations 的一跳闭环。
- `.power-ai/auto-capture/response-inbox`、`.power-ai/auto-capture/response-processed`、`.power-ai/auto-capture/response-failed` 目录现在也会自动生成，`doctor` 会一起检查这些桥接资产。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
