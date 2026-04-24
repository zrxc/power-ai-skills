# Release Notes 0.6.1

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.6.1`
- 生成时间：`2026-03-11T08:45:15.966Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.6.1

- 把工具注册表提升为正式治理配置，新增 `config/tool-registry.json` 与 `config/team-defaults.json`。
- 新增 `check-tooling-config.mjs`，把工具、profile、依赖关系和团队默认配置纳入 `ci:check`。
- `init` 在新项目首次接入时支持自动走团队默认配置，新增 `show-defaults` / `defaults:show`。
- `doctor` 增加“未选工具入口已清理”检查，避免项目残留过期工具入口。
- 更新 README、命令手册、工具适配说明和发布文档。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
