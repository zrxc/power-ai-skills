# Release Notes 0.3.0

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.3.0`
- 生成时间：`2026-03-11T07:15:08.338Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.3.0

- 重写 `impact-check.mjs`，让影响分析从简单命中升级为结构化报告，输出影响域、受影响 skill、owner 汇总、建议检查点和推荐发版级别。
- 新增 `docs/compatibility-matrix.md`，统一记录基础框架、组件库与 skill 的兼容关系。
- 重写 `docs/component-upgrade-flow.md`，把组件库 / 基础框架升级后的分析、修订、验证和发布步骤串成闭环。
- `check-docs.mjs` 现在会校验兼容矩阵和升级流程文档是否存在，并要求 README 提及这些关键文档。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init` 或 `pnpm exec power-ai-skills sync`
