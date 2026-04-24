# Release Notes 1.3.1

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.1`
- 生成时间：`2026-03-25T02:51:06.294Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.1

- 新增 `apply-wrapper-promotion`，可将 `accepted + materialized` 的 wrapper proposal 直接落到仓库源码注册层。
- `wrapper-promotion.json` 现在会记录 `applicationStatus`、`appliedAt` 和 `appliedFiles`，并同步刷新 proposal README。
- 补充 wrapper promotion apply 的正向/拒绝测试与 cwd 解析覆盖，让 proposal 流程从 scaffold -> review -> materialize 继续延伸到真正的源码应用。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
