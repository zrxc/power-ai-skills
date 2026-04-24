# Release Notes 1.4.6

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.4.6`
- 生成时间：`2026-04-22T06:16:09.449Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.4.6

- 完成 `1.4.6 / P3-1` 到 `P3-5` 的治理运营增强，新增 review deadline 检查、治理汇总报表、批量审阅能力、治理历史查询与发布侧 governance operations report。
- `doctor`、`check-project-baseline`、`upgrade-advice`、`release-gates`、`version-record` 与 notification payload 现在会继续消费治理运营摘要，能够识别 overdue review、批量审阅结果与发布侧治理 backlog。
- release consistency 新增 `--require-governance-operations`，`release:prepare` 现在会刷新并校验 governance operations artifact，保证运营摘要进入正式发布闭环。
- 当前 `1.4.6` 全量测试链路已覆盖上述治理运营增强项，并保持消费项目验证与发布一致性检查兼容。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
