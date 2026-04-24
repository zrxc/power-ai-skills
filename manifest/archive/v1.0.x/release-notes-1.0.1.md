# Release Notes 1.0.1

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.0.1`
- 生成时间：`2026-03-12T06:26:22.632Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.0.1

- 修复 npm 发包清单遗漏 `src/` 的问题，避免消费项目安装后执行 `power-ai-skills init` 时出现 `ERR_MODULE_NOT_FOUND`。
- 强化 `check-package.mjs`，发布前强制校验 `files` 中必须包含 `src`，防止再次发布出“bin 可执行但运行时依赖未随包发布”的版本。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
