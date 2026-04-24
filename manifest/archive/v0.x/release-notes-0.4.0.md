# Release Notes 0.4.0

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.4.0`
- 生成时间：`2026-03-11T07:26:42.932Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.4.0

- 新增 `verify-consumer.mjs`，把消费项目的 `init / sync / doctor` 串成标准验证链路，并输出结构化报告。
- 新增 `generate-impact-task.mjs`，可以根据影响分析报告生成可直接投放到 issue / MR 的升级任务文档。
- 新增 `docs/ci-integration.md` 和 `templates/ci/gitlab-ci.yml`，补齐 `impact-check -> 任务生成 -> 消费验证` 的 CI 接入示例。
- `package.json` 增加 `verify:consumer` 和 `impact:task` 命令，`check-package.mjs` / `check-docs.mjs` 同步纳入校验。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init` 或 `pnpm exec power-ai-skills sync`
