# Release Notes 0.1.0

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.1.0`
- 生成时间：`2026-03-11T06:39:39.565Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.1.0

- 新增治理文档：`docs/governance.md`、`docs/versioning-policy.md`。
- 新增发布辅助脚本：`check-package.mjs`、`check-docs.mjs`、`generate-release-notes.mjs`。
- 强化 `validate-skills.mjs`，把 `displayName`、`owners`、`tags`、`status`、`dependsOn` 纳入治理校验。
- `package.json` 增加 `check:package`、`check:docs`、`release:notes`、`release:prepare` 命令。
- 统一两个老格式 foundation skill 的元数据结构，纳入标准治理体系。
- 更新 README、维护规范、发布流程、PR 模板和扩展指南。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init` 或 `pnpm exec power-ai-skills sync`
