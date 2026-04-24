# Release Notes 1.0.8

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.8`
- 生成时间：`2026-03-19T01:34:38.888Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.8

- `project-scan` 新增 `.power-ai/analysis/component-propagation.json` 与 `.power-ai/reports/component-propagation-summary.md`，把页面到 fragment 的多跳传播结果显式落盘，便于审计和回归。
- 在组件图基础上增加多跳可达性计算，页面现在不仅会继承直接引用 fragment 的信号，也会继承 `page -> fragment -> dialog-fragment` 这类跨文件链路上的 dialog / form / submit 信号。
- `patterns.json`、`project-profile.json` 和匹配样本中补充 transitive 相关字段，帮助判断一个项目模式是由直接组件关系还是多跳传播支撑起来的。
- 补充 `1.0.8` 技术方案文档与回归测试，覆盖多跳 dialog-form 识别、传播产物生成和 `init` 默认链路兼容性。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
