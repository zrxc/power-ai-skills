# Release Notes 1.0.6

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.6`
- 生成时间：`2026-03-16T03:21:43.552Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.6

- `project-scan` 的 Vue 文件分析底座从文本匹配升级为 AST 解析，新增 `src/project-scan/vue-analysis.mjs` 负责 `SFC + template AST + script AST` 信号提取。
- 新增运行时依赖 `@vue/compiler-sfc`、`@vue/compiler-dom` 和 `@babel/parser`，用于稳定解析 `.vue` 文件与 `script/script setup`。
- 页面容器、页面级 `PcTree`、dialog 内部 `PcTree`、`el-form`、`el-descriptions`、`el-tabs` 等模板信号改由 template AST 识别，不再依赖整段正则。
- `searchForm`、`handleSubmit`、`getList`、`fetchDetail` 等脚本信号改由 script AST 遍历收集 `Identifier / MemberExpression / StringLiteral` 后判断，减少文本误判。
- 补充 `1.0.6` 技术设计文档，并保持 `1.0.5` 的 diff/history/manual 晋升链路与现有测试全部兼容。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
