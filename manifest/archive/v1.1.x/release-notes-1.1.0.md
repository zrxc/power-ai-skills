# Release Notes 1.1.0

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.1.0`
- 生成时间：`2026-03-19T01:58:52.870Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.1.0

- 新增 `conversation-miner` 首版链路，支持 `capture-session`、`analyze-patterns` 和 `generate-project-skill` 三个命令，把结构化会话摘要沉淀为项目模式和 project-local skill 草案。
- 新增 `.power-ai/conversations/*.json`、`.power-ai/patterns/project-patterns.json`、`.power-ai/reports/conversation-patterns-summary.md`，并预留 `.power-ai/proposals/` 与 `.power-ai/notifications/` 目录作为后续企业级扩展入口。
- `capture-session` 会对输入摘要做字段校验、基础脱敏和生成文件路径归一化，避免直接把原始对话或敏感信息落盘。
- `analyze-patterns` 会按 `sceneType` 聚合会话记录，输出频次、通用 skills、对象、操作、自定义点和生成建议；`generate-project-skill` 会基于模式结果生成 `*-conversation-project` 草案，避免与 `project-scan` 产物互相覆盖。
- 补充 `conversation-miner-skill-design-1.1.0.md` 对应实现、CLI 端到端测试、README 和命令手册更新。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
