# Release Notes 1.3.2

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.2`
- 生成时间：`2026-03-25T03:47:43.677Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.2

- `apply-wrapper-promotion` 现在会一并为 `tests/conversation-miner.test.mjs` 和 `tests/selection.test.mjs` 追加最小 `test.todo` 占位，并在 proposal 目录下生成 `post-apply-checklist.md`。
- proposal 新增 `followUpStatus`、`testsScaffoldedAt`、`testScaffoldFiles`、`postApplyChecklistPath` 和 `pendingFollowUps`，把“核心代码已落地但仍待补齐”的状态显式记录下来。
- `doctor` 现在会对“已 applied 但仍有 pending follow-ups”的 wrapper promotion 给出 warning，避免误判为已完全接入。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
