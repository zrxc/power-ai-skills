# Release Notes 0.5.0

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.5.0`
- 生成时间：`2026-03-11T07:32:16.054Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.5.0

- 新增 `collect-changed-files.mjs`，统一从 git diff 收集变更文件，方便上游仓库和 CI 直接调用。
- 新增 `run-upgrade-automation.mjs`，把变更收集、影响分析、任务生成、消费项目验证串成一条总控流水线。
- 新增 `generate-upgrade-payload.mjs`，可以基于自动化报告生成 JSON 和 Markdown 通知载荷。
- 新增 `docs/upstream-pipeline-integration.md` 和 `templates/ci/upstream-gitlab-ci.yml`，补齐组件库仓库 / 私仓发布流水线的接入模板。
- `package.json` 增加 `collect:changed`、`upgrade:automation`、`upgrade:payload` 命令，`check-package.mjs` / `check-docs.mjs` 同步纳入治理校验。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init` 或 `pnpm exec power-ai-skills sync`
