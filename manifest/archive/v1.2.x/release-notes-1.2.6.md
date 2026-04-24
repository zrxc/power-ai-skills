# Release Notes 1.2.6

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.6`
- 生成时间：`2026-03-24T03:08:30.311Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.6

- 终端类工具的 `<tool>-capture.example.ps1` 现在支持 `-ResponseText` 和 `-UseClipboard`，可以直接走 `-Auto` 完成确认后的自动收集。
- 明确收口 `Codex / Claude Code / Gemini CLI / Aider` 的 terminal-first 路径，不再把它们默认视为 GUI host bridge 接入对象。
- 补充 4 条终端直连 auto-capture 端到端测试，并在文档中区分 terminal direct auto-capture 与 GUI host bridge。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
