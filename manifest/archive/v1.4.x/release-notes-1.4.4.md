# Release Notes 1.4.4

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.4.4`
- 生成时间：`2026-04-22T02:58:36.862Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.4.4

- 完成 `1.4.4` 路线图的治理收口，新增 `generate-upgrade-summary`、`check-project-baseline`、`generate-wrapper-registry-governance`、`generate-conversation-miner-strategy` 等治理命令。
- `project-scan` 侧补齐人工反馈闭环与 project-local 增量同步，`conversation-miner` 侧补齐 pattern governance、项目策略模板和 wrapper registry 团队治理视图。
- wrapper promotion 生命周期继续补强到 dry-run 预览、统一 audit、团队级治理视图，消费项目与仓库维护侧都可以输出更稳定的 markdown/json 报告。
- 当前 `1.4.4` 全量测试链路已覆盖上述治理增强项，并保持发布校验与消费项目验证链兼容。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
