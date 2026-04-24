# Release Notes 0.7.1

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.7.1`
- 生成时间：`2026-03-11T09:32:32.638Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.7.1

- 清理 CLI 中残留的异常文本，补齐 `profile/preset/tool` 等核心报错和说明文案。
- 新增 `clean-reports` 命令，以及 `pnpm reports:clean` 脚本，用于清理 `.power-ai/reports`。
- `README.md`、单一源目录说明和本地 overlay README 的输出文本改成稳定可读版本。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
