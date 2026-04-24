# Release Notes 1.1.9

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.9`
- 生成时间：`2026-03-23T02:55:25.688Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.9

- 扩展 confirmed capture wrapper 矩阵，正式支持 `codex`、`trae`、`cursor`、`claude-code`、`windsurf`、`gemini-cli`、`github-copilot`、`cline`、`aider`。
- 统一 wrapper 注册表和 `tool-capture-session --tool <name>` 现在覆盖全部 9 个工具，未注册工具的报错提示也会同步反映完整支持列表。
- conversation capture 脚手架新增 `.power-ai/adapters/windsurf-capture.example.ps1`、`.power-ai/adapters/gemini-cli-capture.example.ps1`、`.power-ai/adapters/github-copilot-capture.example.ps1`、`.power-ai/adapters/cline-capture.example.ps1`、`.power-ai/adapters/aider-capture.example.ps1`，`doctor` 也会检查这些示例是否存在。
- 更新 README、`tool-adapters.md`、命令手册和 `1.1.9` 设计文档，并补充 wrapper matrix 的端到端测试。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
