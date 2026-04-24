# Release Notes 1.2.5

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.5`
- 生成时间：`2026-03-24T02:49:24.041Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.5

- 新增 `windsurf-host-bridge.example.ps1`、`cline-host-bridge.example.ps1` 和 `github-copilot-host-bridge.example.ps1`，把剩余 GUI/IDE 类工具接入同一套宿主自动触发样板。
- `init` / `sync` 现在会统一生成 5 个 GUI 宿主桥接脚本，宿主只需要交付“用户确认后的最终回复文本”，无需直接理解 capture runtime 细节。
- 补充 3 条端到端宿主桥接测试，并把这 3 个脚本全部纳入 `doctor` conversation 资产检查。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
