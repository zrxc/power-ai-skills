# Release Notes 1.2.8

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.8`
- 生成时间：`2026-03-24T05:14:06.613Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.8

- 新增 `scaffold-wrapper-promotion`，用于把未注册工具从 `custom-tool` 接入状态脚手架化为正式 wrapper 候选 proposal。
- 自动生成 `.power-ai/proposals/wrapper-promotions/<tool>/wrapper-promotion.json` 和 `README.md`，给出 target files、推荐命令和校验清单。
- 补充 proposal 生成与已注册工具拒绝的测试，并把该命令纳入 cwd 解析覆盖。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
