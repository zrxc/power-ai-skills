# Release Notes 1.3.8

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.8`
- 生成时间：`2026-03-25T09:39:44.962Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.8

- 新增 `restore-wrapper-promotion`，可将 `.power-ai/proposals/wrapper-promotions-archive/` 中的已归档 proposal 恢复回活动 proposal 目录。
- proposal 新增 `restoredAt` 与 `restorationNote`，恢复时会在活动目录中生成 `restore-record.json`，保留归档恢复审计轨迹。
- 恢复后的 proposal 会重新出现在默认 `list-wrapper-promotions` 结果中，可继续进行修订、再次 finalize/register/archive。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
