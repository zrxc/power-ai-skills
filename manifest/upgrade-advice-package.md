# Upgrade Advice Package

- package: `@power/power-ai-skills@1.4.7`
- generatedAt: `2026-04-27T05:40:30.309Z`
- release level: `minor`
- risk level: `medium`
- blocked: false

## Consumer Commands

- `pnpm exec power-ai-skills sync`: Sync the latest skills, shared files, adapters, registry, and team policy snapshot.
- `pnpm exec power-ai-skills doctor`: Validate the current consumer project's .power-ai workspace, entrypoints, and knowledge artifacts.
- `pnpm exec power-ai-skills show-defaults --format summary`: Preview the current default selection and the recommended team project profile for this workspace.
- `pnpm exec power-ai-skills check-team-policy-drift --json`: Confirm the project still matches the team policy baseline after upgrade.
- `pnpm exec power-ai-skills show-project-profile-decision --json`: Inspect the current project profile decision record before accepting, rejecting, or deferring any new recommendation.
- `pnpm exec power-ai-skills check-governance-review-deadlines --json`: Check whether any governance review deadlines are due today or already overdue after upgrade.
- `pnpm exec power-ai-skills check-auto-capture-runtime --json`: Confirm the consumer project's auto-capture queues, failures, and bridge scaffolding are healthy after upgrade.
- `pnpm exec power-ai-skills check-capture-retention --json`: Confirm conversation retention backlog is still within project policy before trusting self-evolution data.
- `pnpm exec power-ai-skills show-project-governance-context --json`: Inspect the unified governance snapshot after upgrade, including profile decisions, pending conversation reviews, and baseline status.

## Maintainer Commands

- `pnpm refresh:release-artifacts`: Refresh release notes, impact, risk, payload, and other release artifacts.
- `pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-risk-report --require-automation-report --require-notification-payload`: Validate that the core release artifacts are internally consistent.
- `pnpm check:release-gates -- --require-consumer-matrix`: Run final release gates, including wrapper governance, team policy, and consumer compatibility checks.
- `pnpm exec power-ai-skills validate-team-policy --json`: Validate config/team-policy.json again before publishing.

## Manual Checks

- Handle impact follow-up: 更新 baseline/current.json 中的 @power/utils 版本
- Handle impact follow-up: 更新 docs/compatibility-matrix.md 的 utils 兼容矩阵
- Confirm recommended project profile drift: After upgrading, run `power-ai-skills show-defaults --format summary`, `check-team-policy-drift --json`, and `show-project-profile-decision --json` to confirm whether the recommended team project profile still matches the project's bound profile and whether a manual decision should be refreshed.
- Team policy requires consumer matrix: The current team policy requires a green consumer compatibility matrix before release. [blocking]
- Handle risk recommendation: 确认 README、命令手册、发布文档和路线图与当前行为一致。
- Handle risk recommendation: 补跑 `pnpm check:docs`，避免生成文档与仓库内容漂移。
- Handle risk recommendation: 重点复核受影响域：utils。
- Handle risk recommendation: 检查 3 个受影响 skill 的示例、兼容字段与升级说明。
- Handle risk recommendation: 人工复核未命中风险分类的文件，避免遗漏新的治理面。

## Notes

- Impact task generated for maintainer follow-up: D:\webCode\个人\power-ai-skills\manifest\impact-tasks\impact-task-20260427-134030.md
- Recommended release level: minor; overall risk level: medium.
- Current team policy default tool baseline: agents-md, codex, trae, cursor, claude-code.
- Current team policy project profile count: 2.

