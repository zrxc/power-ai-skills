# Release Notes 1.4.5

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.4.5`
- 生成时间：`2026-04-22T05:31:42.863Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.4.5

- 完成 `P2-6` 到 `P2-10` 的治理闭环，新增项目画像决策流、会话洞察决策账本、promotion trace、治理上下文快照，并把治理数据真正接入发布链路。
- `doctor`、`check-project-baseline`、`upgrade-advice`、`release-gates`、`version-record` 与 notification payload 现在会统一消费治理摘要，能够区分 blocking risk、governance warning 与已人工决策的 `deferred` / `rejected` 状态。
- release governance 继续补强到差异化升级建议、治理 warning gate、consumer 兼容矩阵治理维度和 package-maintenance 检查，`release:prepare` 也会刷新最新 governance summary。
- 当前 `1.4.5` 全量测试链路已覆盖上述治理增强项，并保持消费项目验证与发布一致性检查兼容。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
