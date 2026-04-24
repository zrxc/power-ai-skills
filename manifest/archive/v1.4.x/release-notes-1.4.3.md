# Release Notes 1.4.3

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.4.3`
- 生成时间：`2026-04-20T05:14:37.077Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.4.3

- `generate-wrapper-promotion-audit` 新增 `--fields`、`--format`、`--output`，支持导出聚焦后的轻量 audit 结果。
- export 当前支持 `json`、`md`、`csv`，并会返回 `exportPath`、`exportFields`、`exportCount` 供外部流水线消费。
- wrapper promotion audit 从“可排序”继续推进到“可导出”，筛选队列可以直接接给后续人工或自动流程。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
