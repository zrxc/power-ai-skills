# Release Notes 1.3.0

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.0`
- 生成时间：`2026-03-25T02:03:32.221Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.0

- 新增 `materialize-wrapper-promotion`，可将 `accepted` 的 wrapper proposal 继续生成真正的 registration bundle 和 patch 文档。
- 在 proposal 中新增 `materializationStatus` 与 `materializedAt`，并把这些信息同步回 proposal README。
- 补充 accepted proposal materialize 与 draft proposal 拒绝的测试，让 wrapper promotion 流程从 scaffold -> review 进一步延伸到 registration artifact 生成。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
