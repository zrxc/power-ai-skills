# Release Notes 1.4.0

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.4.0`
- 生成时间：`2026-03-27T01:34:26.161Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.4.0

- 新增 `generate-wrapper-promotion-audit`，会汇总活动区和 archive 区 proposal，生成 `reports/wrapper-promotion-audit.md` 与 `reports/wrapper-promotion-audit.json`。
- audit 报表会输出总量、活动量、归档量、`ready for registration` 数量、挂起 follow-up 数量等摘要，并附带每个 proposal 的 timeline 摘要。
- wrapper promotion 线从单条 timeline 查询扩展为正式 audit 产物，便于做批量审计和版本收尾检查。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
