# Release Notes 1.3.7

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.7`
- 生成时间：`2026-03-25T09:28:48.674Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.7

- 新增 `archive-wrapper-promotion`，只允许对已 `registered` 的 proposal 执行归档，将活动 proposal 移动到 `.power-ai/proposals/wrapper-promotions-archive/`。
- proposal 新增 `archiveStatus`、`archivedAt`、`archiveNote`，并会在归档目录下生成 `archive-record.json` 作为审计记录。
- `list-wrapper-promotions` 默认只返回活动 proposal，显式带 `--archived` 时会一并返回归档 proposal；`doctor` 也不会再扫描归档目录中的条目。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
