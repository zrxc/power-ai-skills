# Doctor 错误码说明

面向消费项目和维护者，统一说明 `power-ai-skills doctor` 输出中的错误码含义。

## 使用方式

消费项目自检：

```bash
npx power-ai-skills doctor --format summary
```

仓库发布治理自检：

```bash
cd D:/webCode/Myd/power-ai-skills
npx power-ai-skills doctor --format summary
```

如果存在失败项，输出中会包含：
- `Failure Codes`
- 每个检查分组的组级错误码
- 每个具体检查项的明细错误码

示例：

```text
Failure Codes: PAI-KNOWLEDGE-001
- fail knowledge [PAI-KNOWLEDGE] (9/10)
  - fail [PAI-KNOWLEDGE-001] generated component registry exists
```

## 分组级错误码

### `PAI-RELEASE`

说明：
- 当前版本发布产物缺失、`version-record.json` 漂移、通知载荷未刷新，或 release 一致性校验失败

优先动作：

```bash
pnpm refresh:release-artifacts
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-automation-report --require-notification-payload
```

### `PAI-WORKSPACE`

说明：
- `.power-ai` 工作区缺失、配置文件缺失、复制的 skill 目录不完整

优先动作：

```bash
npx power-ai-skills sync
```

### `PAI-SELECTION`

说明：
- 当前工具选择元数据缺失，或项目里仍然残留旧入口/旧包名

优先动作：

```bash
npx power-ai-skills init --tool <tool-name>
```

### `PAI-POLICY`

说明：
- 团队级策略快照缺失、团队策略与包内基线不一致、当前已选工具不符合团队策略，或团队要求的 skills 没有同步到 `.power-ai/skills`

优先动作：
```bash
npx power-ai-skills check-team-policy-drift --json
npx power-ai-skills sync
```

### `PAI-ENTRYPOINT`

说明：
- 工具入口文件或目录未正确链接、复制或清理

优先动作：

```bash
npx power-ai-skills sync
```

### `PAI-KNOWLEDGE`

说明：
- 组件知识层文件缺失，包括组件注册表、组件 guide、页面配方和关键页面 skill

优先动作：

```bash
npx power-ai-skills sync
```

### `PAI-CONVERSATION`

说明：
- conversation-miner 相关治理结果存在待处理项，当前主要用于提示会话 pattern 决策账本里仍有 `review` backlog

优先动作：
```bash
npx power-ai-skills review-conversation-pattern --pattern <id> --accept --target <type>
npx power-ai-skills review-conversation-pattern --pattern <id> --reject --reason "..."
```

## 明细错误码

### Release

| 错误码 | 含义 | 修复动作 |
| --- | --- | --- |
| `PAI-RELEASE-001` | `manifest/version-record.json` 缺失 | 执行 `pnpm refresh:release-artifacts` |
| `PAI-RELEASE-002` | 当前版本 `release-notes-<version>.md` 缺失 | 执行 `pnpm refresh:release-artifacts` |
| `PAI-RELEASE-003` | `manifest/impact-report.json` 缺失 | 执行 `pnpm refresh:release-artifacts` |
| `PAI-RELEASE-004` | `manifest/automation-report.json` 缺失 | 执行 `pnpm refresh:release-artifacts` |
| `PAI-RELEASE-005` | `version-record.json` 记录的通知载荷不存在 | 执行 `pnpm refresh:release-artifacts` |
| `PAI-RELEASE-006` | 发布产物一致性校验失败 | 执行 `pnpm refresh:release-artifacts`，再执行 `pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-automation-report --require-notification-payload` |
| `PAI-RELEASE-007` | `manifest/upgrade-risk-report.json` 缺失 | 执行 `pnpm refresh:release-artifacts` |
| `PAI-RELEASE-008` | `manifest/release-gate-report.json` 缺失 | 执行 `pnpm check:release-gates` |
| `PAI-RELEASE-009` | release gates 存在 blocking 失败项 | 执行 `pnpm check:release-gates` 并先清理 blocking gate |
| `PAI-RELEASE-010` | `manifest/upgrade-advice-package.json` 缺失 | 执行 `pnpm upgrade:advice -- --automation-report manifest/automation-report.json` |
| `PAI-RELEASE-011` | `version-record.json` 缺少 `governanceSummary` | 执行 `pnpm refresh:release-artifacts`，让当前 release 重新记录治理摘要 |
| `PAI-RELEASE-012` | release gate 里仍有 governance warning | 复核 `manifest/release-gate-report.json` 的治理 warning，并确认这些 warning 是否允许随当前版本一起发布 |

### Workspace

| 错误码 | 含义 | 修复动作 |
| --- | --- | --- |
| `PAI-WORKSPACE-001` | `.power-ai` 根目录不存在 | 执行 `npx power-ai-skills sync` |
| `PAI-WORKSPACE-002` | `.power-ai/skills` 不存在 | 执行 `npx power-ai-skills sync` |
| `PAI-WORKSPACE-003` | `.power-ai/skills` 分组与包内源 skill 不一致 | 执行 `npx power-ai-skills sync` |
| `PAI-WORKSPACE-004` | `.power-ai/tool-registry.json` 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-WORKSPACE-005` | `.power-ai/team-defaults.json` 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-WORKSPACE-006` | `.power-ai/template-registry.json` 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-WORKSPACE-007` | `.power-ai/skills/project-local` 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-WORKSPACE-008` | manifest 技能数量与实际复制 skill 数量不一致 | 重新安装当前包版本后执行 `npx power-ai-skills sync` |

### Selection

| 错误码 | 含义 | 修复动作 |
| --- | --- | --- |
| `PAI-SELECTION-001` | `.power-ai/selected-tools.json` 缺失 | 执行 `npx power-ai-skills init --tool <tool-name>` |
| `PAI-SELECTION-002` | 项目里仍残留旧包名或旧入口引用 | 清理旧引用后重新执行 `npx power-ai-skills init --tool <tool-name>` |

### Entrypoint

| 错误码 | 含义 | 修复动作 |
| --- | --- | --- |
| `PAI-ENTRYPOINT-001` | 未选中工具的旧入口未被清理 | 执行 `npx power-ai-skills sync` |
| `PAI-ENTRYPOINT-002` | 已选中工具的入口不可用 | 执行 `npx power-ai-skills sync`，必要时重新 `init` |

### Policy

| 错误码 | 含义 | 修复动作 |
| --- | --- | --- |
| `PAI-POLICY-001` | `.power-ai/team-policy.json` 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-POLICY-002` | `.power-ai/team-policy.json` 与包内团队策略不一致 | 执行 `npx power-ai-skills sync` |
| `PAI-POLICY-003` | 当前已选工具不在团队允许范围内 | 调整工具选择或更新 `config/team-policy.json` |
| `PAI-POLICY-004` | 团队要求的 skills 未完整同步到 `.power-ai/skills` | 执行 `npx power-ai-skills sync` |
| `PAI-POLICY-005` | 当前项目未完整覆盖团队默认工具基线 | 如需保留默认基线，重新执行 `npx power-ai-skills init --preset enterprise-standard` 或补齐缺失工具 |
| `PAI-POLICY-006` | 当前项目启用了 `pilot` / `compatible-only` / `disabled` rollout 的 wrapper | 复核 `config/team-policy.json` rollout 策略与当前项目工具选择 |
| `PAI-POLICY-007` | 当前项目已绑定的 project profile 与最新推荐画像不一致 | 执行 `npx power-ai-skills show-defaults --format summary`、`check-team-policy-drift --json` 与 `show-project-profile-decision --json`，然后按需用 `review-project-profile --accept/--reject/--defer` 记录治理决策，或重新 `init --project-profile ...` |
| `PAI-POLICY-008` | 已记录的治理复核日期已过期，需要重新确认 project profile 决策 | 执行 `npx power-ai-skills check-governance-review-deadlines --json` 查看过期项，然后重新运行 `review-project-profile --accept/--reject/--defer` 刷新治理决策 |

| `PAI-POLICY-009` | `.power-ai/governance/evolution-proposals.json` 閲屼粛瀛樺湪寰呭鐞嗙殑 `review` proposal | 鎵ц `npx power-ai-skills list-evolution-proposals --json` 锛岀劧鍚庣敤 `review-evolution-proposal --proposal <id> --accept/--reject/--archive` 娓呯悊 backlog |
| `PAI-POLICY-010` | 宸茶 `accepted` 鐨?evolution proposal 灏氭湭 apply | 鎵ц `npx power-ai-skills apply-evolution-proposal --proposal <id>`锛屾垨灏嗚 proposal 鍥為€€鍒?`review/archived` |
| `PAI-POLICY-011` | evolution proposal backlog 已超过治理 SLA，包含 stale `review` 或 accepted-but-not-applied proposal | 先执行 `npx power-ai-skills list-evolution-proposals --json` 查看 aging proposal，再按需用 `review-evolution-proposal` 或 `apply-evolution-proposal` 清理过期 backlog |
| `PAI-POLICY-013` | 已 `applied` 的 evolution proposal draft 仍带有待继续处理的 follow-up actions | 查看 `.power-ai/governance/evolution-proposals.json` 中的 `applicationArtifacts.nextActions` / `applicationArtifacts.handoff`，或直接运行 `doctor --json`、`generate-governance-summary --json` 查看 owner hint、checklist 与 next action，然后继续推进 shared-skill / wrapper / release-impact draft 的人工收口动作 |

### Conversation

| 错误码 | 含义 | 修复动作 |
| --- | --- | --- |
| `PAI-CONVERSATION-029` | `.power-ai/governance/conversation-decisions.json` 里仍存在待处理的 `review` 项 | 执行 `npx power-ai-skills review-conversation-pattern --pattern <id> --accept --target <type>` 或 `--reject --reason "..."` 清理 backlog |
| `PAI-CONVERSATION-030` | auto-capture 队列存在积压、陈旧请求或 runtime scaffolding 不完整 | 执行 `npx power-ai-skills check-auto-capture-runtime --json` 查看 backlog / bridge 状态，然后启动 `watch-auto-capture-inbox` 或清理积压 |
| `PAI-CONVERSATION-031` | auto-capture 失败队列不为空，说明桥接或 runtime 存在失败请求 | 检查 `.power-ai/auto-capture/failed` 与 `.power-ai/auto-capture/response-failed`，修复后重放或清理失败 payload |

### Knowledge

| 错误码 | 含义 | 修复动作 |
| --- | --- | --- |
| `PAI-KNOWLEDGE-001` | `component-registry.json` 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-002` | `tree-user-crud.json` 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-003` | `basic-list-crud.json` 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-004` | `pc-tree.md` guide 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-005` | `pc-table-warp.md` guide 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-006` | `pc-dialog.md` guide 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-007` | `pc-container.md` guide 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-008` | `tree-list-page` skill 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-009` | `basic-list-page` skill 缺失 | 执行 `npx power-ai-skills sync` |
| `PAI-KNOWLEDGE-010` | `entry-skill` 缺失 | 执行 `npx power-ai-skills sync` |

## 建议

- 在仓库根目录看到 `PAI-RELEASE-*` 时，优先按发布治理流程处理，不要执行消费项目 `sync`
- 出现 `PAI-KNOWLEDGE-*` 时，优先怀疑消费项目没有同步到最新的组件知识层
- 出现 `PAI-ENTRYPOINT-*` 时，优先怀疑入口文件没有和当前工具组合对齐
- 出现 `PAI-SELECTION-*` 时，不要只执行 `sync`，通常还需要重新 `init`
- 出现 `PAI-POLICY-*` 时，优先先跑一次 `check-team-policy-drift --json` 看清楚是快照漂移、工具越权，还是必备 skills 缺失
- 出现 `PAI-WORKSPACE-*` 且多项同时失败时，先重新安装包版本，再执行 `sync`
