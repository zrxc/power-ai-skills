# Release Notes 1.3.6

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.6`
- 生成时间：`2026-03-25T08:13:27.736Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.6

- 新增 `register-wrapper-promotion`，只允许对已 `finalized` 的 proposal 执行正式注册确认，并写入 `registrationStatus`、`registeredAt`、`registrationNote`。
- proposal 目录会新增 `registration-record.json`，用于保留正式注册时的审计结果和最终登记时间。
- `doctor` 现在会对已 `finalized` 但未注册的 proposal 给出 “ready for registration” 提示；对已 `registered` 的 proposal 不再提示 wrapper promotion warning。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
