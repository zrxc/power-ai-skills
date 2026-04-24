# Release Notes 1.2.4

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.4`
- 生成时间：`2026-03-23T05:47:05.289Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.4

- 新增 `cursor-host-bridge.example.ps1`，把 `Cursor` 也接入 GUI 宿主自动触发样板，支持 `-ResponsePath`、`-ResponseText` 和 `-UseClipboard` 三种输入。
- 将 GUI 宿主桥接脚本抽象成通用生成器，后续扩展 `Windsurf / Cline / GitHub Copilot` 时不再需要重复维护脚本主体。
- 补充 Cursor host bridge 的端到端测试，并将该脚本纳入 `doctor` conversation 资产检查。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
