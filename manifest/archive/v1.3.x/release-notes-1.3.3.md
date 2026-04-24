# Release Notes 1.3.3

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.3`
- 生成时间：`2026-03-25T07:14:59.073Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.3

- `apply-wrapper-promotion` 不再只追加 `test.todo`，而是按 `gui / terminal` 生成可运行的 wrapper 测试样板。
- proposal 的 `followUpStatus` 现在会推进到 `tests-generated`，并把后续收尾重点调整为运行样板测试、修正 fixture 细节和补文档。
- 更新 `1.3.3` 技术方案与命令文档，明确 wrapper proposal 在 apply 之后已经进入“可跑测试样板”阶段。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
