# Release Notes 1.0.3

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.3`
- 生成时间：`2026-03-16T02:22:24.871Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.3

- 新增 `scan-project` 与 `generate-project-local-skills`，在消费项目中输出 `.power-ai/analysis/project-profile.json`、`.power-ai/analysis/patterns.json` 和 `project-local/auto-generated` 草案。
- `init` 默认串联冷启动项目扫描，支持 `--no-project-scan`、`--project-scan-only`、`--regenerate-project-local`，让 `project-local` 初始化后不再为空目录。
- 补齐 1.0.3 对应的自动化回归测试与命令文档，确保新链路与既有 `doctor`、`verify-consumer`、单一真源同步流程兼容。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
