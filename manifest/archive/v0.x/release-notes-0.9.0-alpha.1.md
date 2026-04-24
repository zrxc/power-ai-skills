# Release Notes 0.9.0-alpha.1

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`0.9.0-alpha.1`
- 生成时间：`2026-03-12T03:39:49.030Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.9.0-alpha.1

- 完成 `bin/power-ai-skills.mjs` 第一阶段拆分，CLI 入口收口为薄启动层，核心逻辑迁移到 `src/context`、`src/selection`、`src/rendering`、`src/workspace`、`src/commands`、`src/doctor`。
- 引入显式 `config/template-registry.json`，模板 ownerTool、输出路径和占位符不再依赖 `entrypoint.source` 反推，`.power-ai/template-registry.json` 也会同步落到消费项目。
- 补齐最小自动化回归：`selection` / `rendering` 单测、`doctor` 集成测试、`verify-consumer` 内置 fixture smoke，并把消费侧 smoke 串进 `release:prepare`。
- 把 `docs/tool-adapters.md` 和 `README.md` 改为脚本生成，文档校验现在会检查生成结果是否过期，减少配置与文档漂移。
- 新增 `config/schemas/*.schema.json`，并为 `tool-registry.json`、`team-defaults.json`、`template-registry.json` 挂载 `$schema`，让配置治理同时覆盖编辑器提示和 CI 校验。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
