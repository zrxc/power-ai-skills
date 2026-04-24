# Release Notes 0.6.3

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.6.3`
- 生成时间：`2026-03-11T09:16:26.103Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.6.3

- `list-tools`、`show-defaults`、`doctor` 新增 `--format summary` 输出模式，方便团队直接阅读。
- 保留 JSON 默认输出，避免影响现有自动化脚本和 CI 调用。
- `doctor` 的 summary 输出会直接展示检查结果、入口状态和 warning，不用再手动展开 JSON。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
