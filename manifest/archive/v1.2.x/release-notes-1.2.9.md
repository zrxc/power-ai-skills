# Release Notes 1.2.9

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.9`
- 生成时间：`2026-03-24T05:49:25.127Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.9

- 在 `scaffold-wrapper-promotion` 基础上新增 `review-wrapper-promotion` 和 `list-wrapper-promotions`，补齐 proposal 的 review / acceptance 状态流。
- `wrapper-promotion.json` 现在会保存 `status`、`reviewedAt`、`reviewNote` 和 `reviewHistory`，并同步刷新 proposal README。
- 补充 review 状态流测试和 cwd 解析覆盖，让 wrapper proposal 从生成到接受不再只是一次性脚手架。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
