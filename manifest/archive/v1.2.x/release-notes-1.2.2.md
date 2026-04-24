# Release Notes 1.2.2

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.2`
- 生成时间：`2026-03-23T05:18:52.894Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.2

- 各 `<tool>-capture.example.ps1` 与 `custom-tool-capture.example.ps1` 现在新增 `-QueueResponse` 模式，可把“已确认收集”的原始 AI 回复直接桥接到 response inbox。
- `queue-auto-capture-response` 新增 `--consume-now`，宿主集成可以用一条命令完成 `response-inbox -> auto-capture runtime -> conversations` 闭环。
- 文档和脚手架已统一更新为“直接 submit”、“response inbox bridge”、“单命令 QueueResponse bridge”三种接法，便于 GUI 工具和 CLI 工具按能力选择。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
