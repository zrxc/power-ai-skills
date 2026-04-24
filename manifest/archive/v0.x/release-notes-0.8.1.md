# Release Notes 0.8.1

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.8.1`
- 生成时间：`2026-03-12T01:49:48.918Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.8.1

- 补充各 AI 工具的读取优先级约定，按工具原生入口文件、`AGENTS.md` 共享规则、`project-local` 覆盖层和企业公共 skill 的顺序组织执行流程。
- 强化项目模板中的执行流程说明，要求先走 `entry-skill` 路由，再按命中的主 skill 和辅助 skill 实现。
- 增强树列表场景识别，补充 `左侧部门右侧用户`、`点击部门显示用户` 等表达，并明确优先使用 `CommonLayoutContainer + pc-table-warp`。
- 更新工具适配文档，统一说明 Codex、Cursor、Claude Code、Gemini CLI、Aider、Trae 等工具的读取入口和优先级。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
