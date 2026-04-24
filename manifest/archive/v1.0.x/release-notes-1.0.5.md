# Release Notes 1.0.5

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.5`
- 生成时间：`2026-03-16T03:14:12.759Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.5

- `project-scan` 新增子模式、交互特征、数据流特征和质量分，`patterns.json` 现在会输出 `dominantSubpattern`、`subpatterns`、`structuralScore`、`purityScore`、`reuseScore` 等结构化字段。
- 每次执行 `scan-project` 都会落盘 `.power-ai/analysis/pattern-diff.json`、`.power-ai/analysis/pattern-history.json` 和 `.power-ai/reports/project-scan-diff.md`，用于跟踪模式演进与回归变化。
- 新增 `diff-project-scan`、`list-project-local-skills`、`promote-project-local-skill` 三个命令，补齐从自动草案到人工维护规则的接管链路。
- `project-local` 新增 `manual/` 目录，`promote-project-local-skill` 会把指定草案从 `auto-generated` 晋升到 `manual`，并把元数据标记为人工维护版本。
- 补充 1.0.5 设计文档、回归测试和 README/命令手册更新，确保新链路与既有初始化、同步和验收流程兼容。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
