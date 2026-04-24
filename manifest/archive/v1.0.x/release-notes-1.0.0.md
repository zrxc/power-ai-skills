# Release Notes 1.0.0

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.0`
- 生成时间：`2026-03-12T05:17:57.716Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.0

- Add the first publishable enterprise component knowledge layer under `skills/foundation/power-component-library/references/generated/`, including `component-registry.json`, component guides, and the initial `tree-user-crud` page recipe.
- Add `check-component-knowledge.mjs` and wire it into `ci:check` so component aliases, recipes, and guide links are validated before release.
- Strengthen the 1.0.0 execution direction: enterprise component scenarios should read the component registry and page recipes before free-form code generation.
- Promote the package version to `1.0.0` as the first stable release of the component-knowledge-driven workflow.

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
