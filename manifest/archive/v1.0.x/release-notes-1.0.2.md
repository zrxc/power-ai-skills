# Release Notes 1.0.2

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.2`
- 生成时间：`2026-03-12T07:53:55.459Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.2

- 收口 `skills/` 目录，删除首批冗余 skill，包括组件研发类、组件治理类和测试生成类能力，保留业务页面开发主链路。
- 同步清理 `entry-skill` 依赖、`impact-check.mjs`、兼容性与发布链路中的悬挂引用，并重建 `skills-manifest.json`。
- 保持 `ci:check`、`doctor`、`verify-consumer` 校验链可用，确保精简后的发布包仍可在消费项目正常初始化与同步。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
