# Release Notes 1.3.9

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.9`
- 生成时间：`2026-03-25T10:00:31.582Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.9

- 新增 `show-wrapper-promotion-timeline`，可直接输出某个 proposal 的完整状态轨迹，自动兼容活动区和 archive 区。
- timeline 会统一聚合 `scaffolded / reviewed / materialized / applied / finalized / registered / archived / restored` 等关键事件，便于审计和排查。
- proposal 新增 timeline 相关展示字段，README 里也会同步展示恢复信息，避免状态只散落在多个时间字段中。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
