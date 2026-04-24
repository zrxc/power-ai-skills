# Release Notes 1.0.7

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.7`
- 生成时间：`2026-03-19T01:27:04.098Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.7

- `project-scan` 新增组件引用图分析，扫描会额外生成 `.power-ai/analysis/component-graph.json` 与 `.power-ai/reports/component-graph-summary.md`。
- 在 `vue-analysis.mjs` 中补充本地相对 `.vue` 导入与模板自定义标签的 AST 识别，为页面到 fragment 的组件边建立结构化基础。
- 页面现在会把已引用的 `page-fragment` / `dialog-fragment` 信号回灌到自身识别中，`dialog-form` 场景可识别“页面壳 + 引用弹窗组件”的跨文件实现。
- `patterns.json` 新增 `relatedComponents` 与 `supportingFragments`，`project-profile.json` 新增 `componentGraphSummary`，让扫描结果不再只停留在单文件命中。
- 补充 1.0.7 设计文档与回归测试，覆盖组件图工件生成和“页面引用 dialog fragment”识别链路。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
