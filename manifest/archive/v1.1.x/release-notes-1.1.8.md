# Release Notes 1.1.8

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.8`
- 生成时间：`2026-03-20T01:42:25.136Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.8

- `init`、`sync`、`add-tool`、`remove-tool` 现在会自动补齐 conversation capture 脚手架，包括共享 guidance、contract 文档和 `adapters/*.example.ps1` 示例脚本。
- 入口模板新增统一的 conversation capture 规则占位符，要求 AI 只在“任务完成且值得沉淀”时询问用户是否收集，并在确认后只输出 `<<<POWER_AI_SESSION_SUMMARY_V1 ... >>>` 标记块。
- `doctor` 新增 conversation capture 检查组，覆盖 config、guidance、contract、adapter 示例和 conversation 目录完整性。
- 更新 README、`tool-adapters.md`、命令手册和 `1.1.8` 设计文档，并补充 rendering、doctor、conversation-miner 端到端测试。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
