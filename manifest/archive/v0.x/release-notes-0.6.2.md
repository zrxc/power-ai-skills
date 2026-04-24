# Release Notes 0.6.2

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.6.2`
- 生成时间：`2026-03-11T09:13:05.961Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.6.2

- 工具注册表补齐 `status`、`tags`、`recommendedScenarios`，profile 也带统一元数据。
- 团队默认配置新增 `presetSelections`，支持 `init --preset`、`add-tool --preset`、`remove-tool --preset`。
- `show-defaults` 现在会展示 package 默认配置、项目覆盖配置和最终生效的 preset 结果。
- `doctor` 现在会输出每个工具入口是 `linked-directory`、`copied-directory`、`hard-link-file` 还是 `copied-file`，方便排查单一源模式是否退化成复制模式。
- `selected-tools.json` 增加 `selectedPresets` 字段，便于项目后续审计和自动化分析。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
