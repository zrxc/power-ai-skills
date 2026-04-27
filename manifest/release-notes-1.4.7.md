# Release Notes 1.4.7

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.4.7`
- 生成时间：`2026-04-27T05:17:56.001Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.4.7

- 完成 `1.4.7 / P4-1` 到 `P4-8` 的自进化第一阶段，新增 evolution cycle、evolution policy、candidates、actions、proposals、proposal review/apply 与 proposal aging 治理提醒。
- `doctor`、`generate-governance-summary`、`show-project-governance-context`、consumer compatibility matrix、release gates、upgrade advice 与 governance operations report 现在都会统一消费 evolution proposal backlog 和 SLA aging 信息，新增 `PAI-POLICY-011`。
- 补齐了 P4 端到端和治理回归测试，当前全量自动化覆盖自进化调度、proposal apply、aging reminder、governance summary 与 release gate 联动。
- 同时将 `@vue/compiler-dom` 与 `@vue/compiler-sfc` 固定到 `3.5.32`，避免消费项目在镜像同步不一致时被解析到 `3.5.33` 后出现 `@vue/compiler-core` 缺失错误。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
