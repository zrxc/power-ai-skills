# Release Notes 1.4.1

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.4.1`
- 生成时间：`2026-03-27T01:48:00.454Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.4.1

- `generate-wrapper-promotion-audit` 新增 `--filter`，支持 `active`、`archived`、`ready-for-registration`、`pending-follow-ups` 四种筛选视图。
- audit 的 JSON 和 Markdown 现在会记录 `filter`，便于区分全量报表和聚焦视图。
- 批量审计从“全量总览”进一步推进到“可直接筛选待办队列”。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
