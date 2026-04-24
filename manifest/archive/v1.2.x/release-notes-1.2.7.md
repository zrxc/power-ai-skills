# Release Notes 1.2.7

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.7`
- 生成时间：`2026-03-24T03:18:53.320Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.7

- 将 `custom-tool-capture.example.ps1` 正式定义为未注册工具的双模式接入样板，同时覆盖 terminal-first 和 host-first 两种路径。
- 补充 2 条 custom tool 端到端测试，分别验证 `-ResponseText -Auto` 与 `-ResponseText -QueueResponse -ConsumeNow`。
- 在文档中新增未注册工具的推荐接入方式，降低新 AI 工具进入 wrapper 矩阵前的接入门槛。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
