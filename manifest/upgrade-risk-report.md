# Upgrade Risk Report

- package: `@power/power-ai-skills@1.4.7`
- generatedAt: `2026-04-27T05:17:56.103Z`
- overall risk: `medium`
- overall release hint: `minor`
- changed files: 11
- categorized files: 2
- uncategorized files: 9

## Categories

### 文档变更
- id: `docs`
- risk: `low`
- release hint: `patch`
- matched files: 2
- file: `docs/command-manual.md`
- file: `docs/upgrade-roadmap.md`
- recommended checks:
  - 确认 README、命令手册、发布文档和路线图与当前行为一致。
  - 补跑 `pnpm check:docs`，避免生成文档与仓库内容漂移。

## Uncategorized Files

- `src/evolution/index.mjs`
- `src/evolution/evolution-proposal-manager.mjs`
- `src/evolution/evolution-proposal-storage.mjs`
- `src/conversation-miner/index.mjs`
- `src/conversation-miner/conversation-patterns.mjs`
- `src/conversation-miner/conversation-decisions.mjs`
- `src/team-policy/profile-decision.mjs`
- `src/team-policy/helpers.mjs`
- `src/governance-summary/collectors.mjs`

## Recommended Actions

- 确认 README、命令手册、发布文档和路线图与当前行为一致。
- 补跑 `pnpm check:docs`，避免生成文档与仓库内容漂移。
- 重点复核受影响域：utils。
- 检查 3 个受影响 skill 的示例、兼容字段与升级说明。
- 人工复核未命中风险分类的文件，避免遗漏新的治理面。

