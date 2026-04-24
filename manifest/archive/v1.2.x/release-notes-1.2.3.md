# Release Notes 1.2.3

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.3`
- 生成时间：`2026-03-23T05:41:02.585Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.3

- 新增 `trae-host-bridge.example.ps1`，提供第一个真正面向 GUI 宿主的自动触发样板，宿主只需交付“确认后的最终回复文本”即可完成桥接和自动落盘。
- 生成的 PowerShell capture 示例脚本现在会优先调用项目本地 `node_modules/.bin/power-ai-skills.cmd`，找不到时才回退到 `npx power-ai-skills`，提升了开发态和链接态的可用性。
- 补充 Trae host bridge 的端到端测试，并把该脚本纳入 `doctor` conversation 资产检查。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
