# Release Notes 1.0.4

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.4`
- 生成时间：`2026-03-16T02:49:02.265Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.4

- 重构 `project-scan`，新增 `page / page-candidate / page-fragment / dialog-fragment` 文件角色识别，避免 `src/views/**/components/**` 直接污染页面模式统计。
- 把模式识别升级为结构化打分与排除规则，收紧 `detail-page` 误判链路，并为 `basic-list-page`、`tree-list-page`、`dialog-form` 增加更稳定的页面骨架判断。
- 新增 `.power-ai/analysis/pattern-review.json` 与 `.power-ai/reports/project-scan-summary.md`，把模式自动生成、人工复核、直接跳过三类决策显式落盘。
- `generate-project-local-skills` 现在只为高置信且达到频次门槛的模式生成草案，低频或混入 fragment 的模式保留在 review 结果中，不再直接写入 `auto-generated`。
- 补充 1.0.4 技术方案文档与回归测试，并用真实消费项目验证新的项目扫描链路。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
