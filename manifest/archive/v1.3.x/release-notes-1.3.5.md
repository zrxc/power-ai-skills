# Release Notes 1.3.5

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.5`
- 生成时间：`2026-03-25T07:43:34.518Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.5

- 新增 `finalize-wrapper-promotion`，用于在 proposal 已完成 accept/materialize/apply 且测试与文档样板都生成后，将状态正式收口到 `finalized`。
- proposal 新增 `finalizedAt` 与 `finalizationNote`，`pendingFollowUps` 会在 finalize 后清空，形成 wrapper promotion 的真正闭环。
- `doctor` 现在会跳过已 `finalized` 的 wrapper proposal，不再继续提示 follow-up warning。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
