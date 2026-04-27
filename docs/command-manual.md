# 命令手册

## 文档导航

- `README.md`
  适合第一次接触仓库时快速了解定位、接入路径、治理主线和发布入口。
- `docs/command-manual.md`
  适合按命令查参数、看典型调用方式和追溯版本能力增量。
- `docs/governance.md`
  适合了解 team policy、project profile、conversation decision 和 release governance 的治理目标与边界。
- `docs/release-process.md`
  适合仓库维护者按当前版本发布链路执行收口、校验和发包。

## 命令分层

- 仓库维护
  `doctor`、`ci:check`、`refresh:release-artifacts`、`check:release-consistency`、`release:prepare`
- 项目初始化与同步
  `init`、`sync`、`list-tools`、`show-defaults`、`add-tool`、`remove-tool`
- 项目扫描与 project-local
  `scan-project`、`diff-project-scan`、`generate-project-local-skills`、`promote-project-local-skill`
- 团队治理与项目画像
  `show-team-policy`、`validate-team-policy`、`check-team-policy-drift`、`review-project-profile`、`check-governance-review-deadlines`
- 会话治理与 promotion
  `capture-session`、`analyze-patterns`、`review-conversation-pattern`、`show-promotion-trace`
- 发布治理
  `impact:check`、`upgrade:risk`、`upgrade:advice`、`check:release-gates`、`governance:operations`、`upgrade:payload`

## 命令注册约定

- 统一命令注册源位于 `src/commands/registry.mjs`。
- 命令分发、`project root` 解析策略都从这份注册表读取，新增或调整命令时不再分别维护多份长列表。
- 当前 `project root` 只保留三种解析策略：
  - `init-target-or-cwd`：`init`、`add-tool`、`remove-tool` 这类命令允许把单个路径型位置参数视作目标项目目录。
  - `cwd`：会话治理、wrapper promotion、治理查询等命令始终以当前工作目录为项目根。
  - `first-positional-or-cwd`：其余命令默认使用第一个位置参数，否则退回当前工作目录。
- CLI 启动入口已收敛到 `src/cli/index.mjs`，`bin/power-ai-skills.mjs` 只保留可执行壳层，不再继续堆叠服务装配细节。

<!-- GENERATED:COMMAND_REGISTRY:START -->
## 注册表命令清单

> 此片段由 `node ./scripts/generate-command-registry-doc.mjs` 自动生成，请不要手工修改。
> 它用于保证命令手册和 `src/commands/registry.mjs` 保持一致；下面的章节仍负责参数说明和典型示例。

### project root strategy 对照

- `cwd`：始终以当前工作目录作为 project root。
- `first-positional-or-cwd`：优先使用第一个位置参数，否则退回当前工作目录。
- `init-target-or-cwd`：优先使用 `init` / `add-tool` / `remove-tool` 的目标目录参数，否则退回当前工作目录。

### info 命令（4）

| Command | Handler | Project Root Strategy |
| --- | --- | --- |
| `list-tools` | `listToolsCommand` | `first-positional-or-cwd` |
| `version` | `versionCommand` | `first-positional-or-cwd` |
| `show-defaults` | `showDefaultsCommand` | `first-positional-or-cwd` |
| `doctor` | `doctorCommand` | `first-positional-or-cwd` |

### project 命令（78）

| Command | Handler | Project Root Strategy |
| --- | --- | --- |
| `sync` | `syncCommand` | `first-positional-or-cwd` |
| `init` | `initCommand` | `init-target-or-cwd` |
| `scan-project` | `scanProjectCommand` | `first-positional-or-cwd` |
| `diff-project-scan` | `diffProjectScanCommand` | `first-positional-or-cwd` |
| `generate-project-local-skills` | `generateProjectLocalSkillsCommand` | `first-positional-or-cwd` |
| `list-project-local-skills` | `listProjectLocalSkillsCommand` | `first-positional-or-cwd` |
| `promote-project-local-skill` | `promoteProjectLocalSkillCommand` | `cwd` |
| `review-project-pattern` | `reviewProjectPatternCommand` | `cwd` |
| `queue-auto-capture-response` | `queueAutoCaptureResponseCommand` | `cwd` |
| `submit-auto-capture` | `submitAutoCaptureCommand` | `cwd` |
| `evaluate-session-capture` | `evaluateSessionCaptureCommand` | `cwd` |
| `prepare-session-capture` | `prepareSessionCaptureCommand` | `cwd` |
| `confirm-session-capture` | `confirmSessionCaptureCommand` | `cwd` |
| `consume-auto-capture-response-inbox` | `consumeAutoCaptureResponseInboxCommand` | `cwd` |
| `consume-auto-capture-inbox` | `consumeAutoCaptureInboxCommand` | `cwd` |
| `watch-auto-capture-inbox` | `watchAutoCaptureInboxCommand` | `cwd` |
| `codex-capture-session` | `codexCaptureSessionCommand` | `cwd` |
| `trae-capture-session` | `traeCaptureSessionCommand` | `cwd` |
| `cursor-capture-session` | `cursorCaptureSessionCommand` | `cwd` |
| `claude-code-capture-session` | `claudeCodeCaptureSessionCommand` | `cwd` |
| `windsurf-capture-session` | `windsurfCaptureSessionCommand` | `cwd` |
| `gemini-cli-capture-session` | `geminiCliCaptureSessionCommand` | `cwd` |
| `github-copilot-capture-session` | `githubCopilotCaptureSessionCommand` | `cwd` |
| `cline-capture-session` | `clineCaptureSessionCommand` | `cwd` |
| `aider-capture-session` | `aiderCaptureSessionCommand` | `cwd` |
| `tool-capture-session` | `toolCaptureSessionCommand` | `cwd` |
| `capture-session` | `captureSessionCommand` | `cwd` |
| `analyze-patterns` | `analyzePatternsCommand` | `cwd` |
| `review-conversation-pattern` | `reviewConversationPatternCommand` | `cwd` |
| `merge-conversation-pattern` | `mergeConversationPatternCommand` | `cwd` |
| `archive-conversation-pattern` | `archiveConversationPatternCommand` | `cwd` |
| `restore-conversation-pattern` | `restoreConversationPatternCommand` | `cwd` |
| `generate-project-skill` | `generateProjectSkillCommand` | `cwd` |
| `scaffold-wrapper-promotion` | `scaffoldWrapperPromotionCommand` | `cwd` |
| `list-wrapper-promotions` | `listWrapperPromotionsCommand` | `cwd` |
| `show-wrapper-promotion-timeline` | `showWrapperPromotionTimelineCommand` | `cwd` |
| `generate-wrapper-promotion-audit` | `generateWrapperPromotionAuditCommand` | `cwd` |
| `generate-wrapper-registry-governance` | `generateWrapperRegistryGovernanceCommand` | `cwd` |
| `generate-upgrade-summary` | `generateUpgradeSummaryCommand` | `cwd` |
| `generate-governance-summary` | `generateGovernanceSummaryCommand` | `cwd` |
| `show-evolution-policy` | `showEvolutionPolicyCommand` | `cwd` |
| `validate-evolution-policy` | `validateEvolutionPolicyCommand` | `cwd` |
| `generate-evolution-candidates` | `generateEvolutionCandidatesCommand` | `cwd` |
| `apply-evolution-actions` | `applyEvolutionActionsCommand` | `cwd` |
| `generate-evolution-proposals` | `generateEvolutionProposalsCommand` | `cwd` |
| `list-evolution-proposals` | `listEvolutionProposalsCommand` | `cwd` |
| `list-evolution-drafts` | `listEvolutionDraftsCommand` | `cwd` |
| `show-evolution-draft` | `showEvolutionDraftCommand` | `cwd` |
| `review-evolution-proposal` | `reviewEvolutionProposalCommand` | `cwd` |
| `apply-evolution-proposal` | `applyEvolutionProposalCommand` | `cwd` |
| `run-evolution-cycle` | `runEvolutionCycleCommand` | `cwd` |
| `show-governance-history` | `showGovernanceHistoryCommand` | `cwd` |
| `generate-conversation-miner-strategy` | `generateConversationMinerStrategyCommand` | `cwd` |
| `check-auto-capture-runtime` | `checkAutoCaptureRuntimeCommand` | `cwd` |
| `show-auto-capture-bridge-contract` | `showAutoCaptureBridgeContractCommand` | `cwd` |
| `show-capture-safety-policy` | `showCaptureSafetyPolicyCommand` | `cwd` |
| `validate-capture-safety-policy` | `validateCaptureSafetyPolicyCommand` | `cwd` |
| `check-capture-retention` | `checkCaptureRetentionCommand` | `cwd` |
| `apply-capture-retention` | `applyCaptureRetentionCommand` | `cwd` |
| `check-project-baseline` | `checkProjectBaselineCommand` | `cwd` |
| `show-team-policy` | `showTeamPolicyCommand` | `cwd` |
| `validate-team-policy` | `validateTeamPolicyCommand` | `cwd` |
| `check-team-policy-drift` | `checkTeamPolicyDriftCommand` | `cwd` |
| `check-governance-review-deadlines` | `checkGovernanceReviewDeadlinesCommand` | `cwd` |
| `show-project-profile-decision` | `showProjectProfileDecisionCommand` | `cwd` |
| `review-project-profile` | `reviewProjectProfileCommand` | `cwd` |
| `show-project-governance-context` | `showProjectGovernanceContextCommand` | `cwd` |
| `show-promotion-trace` | `showPromotionTraceCommand` | `cwd` |
| `review-wrapper-promotion` | `reviewWrapperPromotionCommand` | `cwd` |
| `materialize-wrapper-promotion` | `materializeWrapperPromotionCommand` | `cwd` |
| `apply-wrapper-promotion` | `applyWrapperPromotionCommand` | `cwd` |
| `finalize-wrapper-promotion` | `finalizeWrapperPromotionCommand` | `cwd` |
| `register-wrapper-promotion` | `registerWrapperPromotionCommand` | `cwd` |
| `archive-wrapper-promotion` | `archiveWrapperPromotionCommand` | `cwd` |
| `restore-wrapper-promotion` | `restoreWrapperPromotionCommand` | `cwd` |
| `add-tool` | `addToolCommand` | `init-target-or-cwd` |
| `remove-tool` | `removeToolCommand` | `init-target-or-cwd` |
| `clean-reports` | `cleanReportsCommand` | `first-positional-or-cwd` |
<!-- GENERATED:COMMAND_REGISTRY:END -->

## 仓库命令

进入仓库：

```bash
cd D:/webCode/Myd/power-ai-skills
```

基础校验：

```bash
npx power-ai-skills doctor
npx power-ai-skills generate-upgrade-summary --json
pnpm ci:check
```

说明：
- 在仓库根目录执行 `doctor` 会进入 `package-maintenance` 模式，检查 `version-record.json`、release notes、impact report、automation report、通知载荷和 release 一致性。

发布前准备：

```bash
pnpm refresh:release-artifacts
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-risk-report --require-automation-report --require-notification-payload
pnpm upgrade:payload -- --automation-report manifest/automation-report.json
pnpm release:prepare
```

整理旧发布通知：

```bash
pnpm clean:release-artifacts
```

说明：
- `pnpm refresh:release-artifacts` 会更新当前版本产物，并维护 `manifest/version-record.json`。
- `pnpm clean:release-artifacts` 会保留最近 3 组通知载荷，把更旧记录归档到 `manifest/archive/notifications/`。

查看工具注册表：

```bash
pnpm tools:list
pnpm defaults:show
```

## 消费项目命令

进入业务项目：

```bash
cd D:/your-project
```

首次接入，直接用团队默认：

```bash
npx power-ai-skills init
```

说明：
- 在交互终端中直接执行 `init`，控制台会列出当前可选 AI 工具，并在初始化前要求确认。
- 直接回车会采用团队默认工具组合。
- 默认会在同步公共 skill 和工具入口后，继续执行项目扫描，产出 `.power-ai/analysis/project-profile.json`、`.power-ai/analysis/patterns.json`、`.power-ai/analysis/pattern-review.json`、`.power-ai/reports/project-scan-summary.md` 和 `.power-ai/skills/project-local/auto-generated/`。

初始化指定工具：

```bash
npx power-ai-skills init codex trae cursor
```

等价写法：

```bash
npx power-ai-skills init "codex|trae|cursor"
npx power-ai-skills init codex,cursor
npx power-ai-skills init --tool codex --tool trae --tool cursor
```

按 profile 初始化：

```bash
npx power-ai-skills init --profile openai
```

按团队项目画像初始化：

```bash
npx power-ai-skills init --project-profile enterprise-vue
npx power-ai-skills init --project-profile terminal-governance --no-project-scan
```

如果不是在当前项目目录执行，推荐用 `--project` 明确指定目标目录：

```bash
npx power-ai-skills init codex trae cursor --project D:/your-project
```

只跑冷启动扫描，不改工具入口：

```bash
npx power-ai-skills init --project-scan-only
```

跳过项目扫描，保持旧版初始化行为：

```bash
npx power-ai-skills init --tool codex --no-project-scan
```

强制覆盖自动生成的 project-local 草案：

```bash
npx power-ai-skills init --tool codex --regenerate-project-local
```

同步已选择工具：

```bash
npx power-ai-skills sync
```

单独执行项目扫描：

```bash
npx power-ai-skills scan-project
```

根据扫描结果生成 project-local 草案：

```bash
npx power-ai-skills scan-project
npx power-ai-skills diff-project-scan
npx power-ai-skills generate-project-local-skills
npx power-ai-skills generate-project-local-skills --regenerate-project-local
npx power-ai-skills list-project-local-skills
npx power-ai-skills promote-project-local-skill basic-list-page-project
```

- `1.0.6` 起，`scan-project` 的 Vue 文件解析底座升级为 `SFC AST + template AST + script AST`，不再继续堆叠整段正则。
- `1.0.7` 起，`scan-project` 还会输出 `component-graph.json` 与 `component-graph-summary.md`，并把本地 fragment 的组件引用关系回灌到页面识别。
- `1.0.8` 起，`scan-project` 还会输出 `component-propagation.json` 与 `component-propagation-summary.md`，把 `page -> fragment -> dialog-fragment` 这类多跳传播链路显式落盘。
- `scan-project` 现在会同时输出 `pattern-review.json`、`pattern-feedback.json`、`pattern-diff.json`、`pattern-history.json`、`project-scan-summary.md`、`project-scan-feedback.md` 和 `project-scan-diff.md`。
- `diff-project-scan` 会读取最近一次扫描落盘的 diff 结果，快速查看模式变化。
- `generate-project-local-skills` 只会为达到频次、置信度、纯度分和复用分门槛的模式生成草案。
- `1.4.4` 起，`generate-project-local-skills` 默认会按当前扫描结果做增量同步：只重写真正变化的草案，保留未变化的草案，并移除已不再命中的旧草案目录。
- `list-project-local-skills` 会同时列出 `project-local/auto-generated` 与 `project-local/manual`。
- `promote-project-local-skill` 会把指定草案从 `auto-generated` 晋升到 `manual`，并把 `skill.meta.json` 标记为人工维护版本。

说明：
- `scan-project` 会同时输出结构化模式结果和人工复核摘要。
- `1.4.4` 起，可以通过 `review-project-pattern <pattern-id> --decision generate|review|skip [--note "..."]` 把人工复核结果写回 `.power-ai/analysis/pattern-feedback.json`，并让后续扫描与草案生成复用这份反馈。
- `generate-project-local-skills` 只会为达到频次与置信度门槛的模式生成草案。
- 默认重复执行 `generate-project-local-skills` 不再直接整批跳过，而是返回 `created / updated / unchanged / removed` 四类结果，方便判断本次草案是否真的发生了变化。
- 如需强制全量重建 `auto-generated`，继续使用 `--regenerate-project-local`。
- 未自动生成的模式会保留在 `.power-ai/analysis/pattern-review.json` 和 `.power-ai/reports/project-scan-summary.md` 中，供人工确认。

增加工具：

```bash
npx power-ai-skills add-tool --tool claude-code
```

移除工具：

```bash
npx power-ai-skills remove-tool --tool trae
```

查看可选工具和默认配置：

```bash
npx power-ai-skills list-tools
npx power-ai-skills show-defaults
npx power-ai-skills show-defaults --project-profile terminal-governance --format summary
```

自检：

```bash
npx power-ai-skills doctor
npx power-ai-skills check-project-baseline --json
npx power-ai-skills generate-upgrade-summary --json
```

查看版本：

```bash
npx power-ai-skills version
```

## 升级自动化命令

影响分析：

```bash
pnpm impact:check -- packages/p-components/src/components/pc-dialog/index.vue
```

从 git diff 收集变更文件：

```bash
pnpm collect:changed -- --base origin/master --head HEAD --repo D:/upstream-repo --output manifest/changed-files.txt
```

生成升级任务：

```bash
pnpm impact:task -- --report manifest/impact-report.json
```

生成升级风险报告：
```bash
pnpm upgrade:risk -- --impact-report manifest/impact-report.json
```

跑完整升级自动化：

```bash
pnpm upgrade:automation -- --base origin/master --head HEAD --repo D:/upstream-repo --consumer D:/your-project
```

生成通知载荷：

```bash
pnpm upgrade:payload
```

## 0.6.2 新命令习惯

按团队 preset 初始化：
```bash
npx power-ai-skills init --preset enterprise-standard
```

给现有项目补一个 preset：
```bash
npx power-ai-skills add-tool --preset editor-collaboration
```

移除某个 preset 展开的工具：
```bash
npx power-ai-skills remove-tool --preset terminal-evaluation
```

`doctor` 新增入口状态输出：
- `linked-directory`：目录入口是链接模式
- `copied-directory`：目录入口因权限或占用降级成复制模式
- `hard-link-file`：文件入口是硬链接
- `copied-file`：文件入口是复制模式

## 0.6.3 summary 输出

如果希望命令结果更适合直接给团队阅读，可以加 `--format summary`：

```bash
npx power-ai-skills list-tools --format summary
npx power-ai-skills show-defaults --format summary
npx power-ai-skills doctor --format summary
```

说明：
- 默认仍然输出 JSON，适合脚本和 CI。
- `--format summary` 适合人工阅读和问题排查。
- 也可以显式使用 `--json` 强制 JSON 输出。

## 0.6.4 markdown 输出

如果希望直接把结果贴到 issue、群通知或发布说明，可以使用：

```bash
npx power-ai-skills list-tools --format markdown
npx power-ai-skills show-defaults --format markdown
npx power-ai-skills doctor --format markdown
```

也支持简写：

```bash
npx power-ai-skills doctor --format md
```

## 0.7.0 文件落盘

现在可以直接把结果写到文件：

```bash
npx power-ai-skills doctor --format markdown --output .power-ai/reports/doctor.md
npx power-ai-skills show-defaults --format markdown --output .power-ai/reports/defaults.md
npx power-ai-skills list-tools --format json --output .power-ai/reports/tools.json
```

说明：
- `--output` 使用相对路径时，相对于当前项目根目录。
- 命令会自动创建缺失目录。
- 不传 `--output` 时，仍然只输出到终端。

## 0.7.1 报告清理

如果需要清空当前项目的报告目录，可以执行：

```bash
npx power-ai-skills clean-reports
pnpm reports:clean
```

默认会清理：

```text
.power-ai/reports/
```

## 1.1.0 conversation-miner

```bash
npx power-ai-skills capture-session --input .power-ai/tmp/session-summary.json
npx power-ai-skills analyze-patterns
npx power-ai-skills analyze-patterns --from 2026-03-01 --to 2026-03-13
npx power-ai-skills analyze-patterns --json
npx power-ai-skills merge-conversation-pattern --source pattern_dialog_form --target pattern_tree_list_page --json
npx power-ai-skills archive-conversation-pattern --pattern pattern_tree_list_page --json
npx power-ai-skills restore-conversation-pattern --pattern pattern_dialog_form --json
npx power-ai-skills generate-project-skill --pattern pattern_tree_list_page
```

- `capture-session` 会把结构化会话摘要落盘到 `.power-ai/conversations/{YYYY-MM-DD}.json`，并做基础脱敏与生成文件路径归一化。
- `analyze-patterns` 会按 `sceneType` 聚合会话记录，输出 `.power-ai/patterns/project-patterns.json` 和 `.power-ai/reports/conversation-patterns-summary.md`。
- `1.4.4` 起，`analyze-patterns --json` 会同时带上 conversation pattern governance 信息，并维护 `.power-ai/patterns/pattern-governance.json` 与 `.power-ai/reports/conversation-pattern-governance.md`。
- `merge-conversation-pattern` 可以把一个碎片化 pattern 显式并入另一个 pattern；后续重新执行 `analyze-patterns` 时，会自动按治理规则重新聚合。
- `archive-conversation-pattern` 会把指定 pattern 从活动输出中隐藏，但保留治理记录；`restore-conversation-pattern` 可撤销 merge source 或 archived pattern 的治理规则。
- `generate-project-skill` 会把指定 pattern 生成到 `.power-ai/skills/project-local/auto-generated/*-conversation-project/`，避免与 `project-scan` 的 `*-project` 草案命名冲突。
## 1.1.1 capture gate

```bash
npx power-ai-skills evaluate-session-capture --input .power-ai/tmp/session-summary.json
npx power-ai-skills capture-session --input .power-ai/tmp/session-summary.json
npx power-ai-skills capture-session --input .power-ai/tmp/session-summary.json --force
```

- `evaluate-session-capture` 会先评估摘要是否值得收集，只对高价值、非重复、且未被现有项目级 skill 覆盖的记录返回 `ask_capture`。
- `capture-session` 从 `1.1.1` 开始默认只落盘 `ask_capture` 记录；如果需要绕过门禁，可以显式使用 `--force`。
- 评估结果会区分 `skip_irrelevant`、`skip_incomplete`、`skip_low_value`、`skip_duplicate`、`skip_already_covered` 和 `ask_capture` 六类决策。
- 重复判定基于 `sceneType`、`skillsUsed`、`entities`、`customizations`、`generatedFiles` 生成的记录指纹；已覆盖判定会对比 `.power-ai/skills/project-local/manual/` 与 `.power-ai/skills/project-local/auto-generated/` 中已有项目级 skill。
- 评估明细会写入 `.power-ai/reports/session-capture-evaluation.md`，项目级策略可通过 `.power-ai/conversation-miner-config.json` 调整。
## 1.1.2 marked block capture

```bash
npx power-ai-skills evaluate-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills capture-session --stdin --extract-marked-block --json
```

- `1.1.2` 开始，`conversation-miner` 不再只接受独立的 `session-summary.json`，也可以直接处理 AI 回复文本。
- 当输入源不是纯 JSON，而是普通回答文本时，使用 `--extract-marked-block` 提取 `<<<POWER_AI_SESSION_SUMMARY_V1 ... >>>` 摘要块。
- `--from-file <path>` 适合 wrapper 先落临时回复文本；`--stdin` 适合直接通过管道把 AI 最终回复送进 CLI。
- `--save-extracted <path>` 会把提取出的 JSON 另存一份，便于调试或后续人工复核。
- `capture-session --json` 会输出结构化结果，方便后续 Codex / Cursor / Claude Code 的适配层直接消费。

## 1.1.3 confirmed capture flow

```bash
npx power-ai-skills prepare-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills confirm-session-capture --request capture_xxx
npx power-ai-skills confirm-session-capture --request capture_xxx --reject --json
```

- `prepare-session-capture` 会在 `1.1.2` 的 marked block 提取基础上继续执行 `1.1.1` 的 capture gate；只有存在 `ask_capture` 时，才返回 `shouldPrompt: true` 并生成待确认请求。
- 待确认请求会落盘到 `.power-ai/pending-captures/*.json`，其中保存 `requestId`、`promptMessage` 和待落盘的规范化记录。
- `confirm-session-capture --request <id>` 会在用户确认后直接把待确认记录写入 `.power-ai/conversations/*.json`，不需要 wrapper 再次提供原始摘要。
- `confirm-session-capture --reject` 会删除待确认请求，不写入 conversations，适合用户明确拒绝收集的场景。
- 这一版的目标是让后续 Codex / Cursor / Claude Code wrapper 只需要负责“展示确认提示”和“回传确认结果”，而不必自己实现状态持久化。

## 1.1.4 codex wrapper

```bash
npx power-ai-skills codex-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills codex-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills codex-capture-session --stdin --extract-marked-block --reject --json
```

- `codex-capture-session` 是 `1.1.4` 新增的第一个真实 wrapper 命令，会自动串联 `prepare-session-capture` 和 `confirm-session-capture`。
- 如果当前终端是交互式 TTY，且没有传 `--yes` / `--reject`，命令会直接向用户发起确认提示。
- 如果当前终端不是交互式环境，则必须显式传入 `--yes` 或 `--reject`，避免后台流程误收集。
- `--json` 会返回 `tool / prepared / resolved / decision` 结构，适合 Codex 适配层直接消费。
- 这一版先把 Codex 跑通，后续 Cursor / Claude Code 可以沿用同一套 prepare/confirm contract。

## 1.1.5 cursor wrapper

```bash
npx power-ai-skills cursor-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills cursor-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills cursor-capture-session --stdin --extract-marked-block --reject --json
```

- `cursor-capture-session` 是 `1.1.5` 新增的第二个真实 wrapper，行为与 `codex-capture-session` 保持一致。
- 这一版把 wrapper 层的公共执行流程抽成共享逻辑，所以后续再加 `claude-code` 等工具时不需要重新复制 `prepare -> confirm/reject` 实现。
- 在交互式终端中，`cursor-capture-session` 会直接提示用户确认；非交互环境仍然要求显式传入 `--yes` 或 `--reject`。
- `--json` 输出格式保持不变，仍然适合工具适配层直接消费。

## 1.1.6 claude-code wrapper

```bash
npx power-ai-skills claude-code-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills claude-code-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills claude-code-capture-session --stdin --extract-marked-block --reject --json
```

- `claude-code-capture-session` 是 `1.1.6` 新增的第三个真实 wrapper，行为与 `codex-capture-session`、`cursor-capture-session` 保持一致。
- 这一版继续证明共享 wrapper 执行逻辑可复用，不需要再为 Claude Code 单独重写 `prepare -> confirm/reject`。
- 在交互式终端中，`claude-code-capture-session` 会直接提示用户确认；非交互环境仍然要求显式传入 `--yes` 或 `--reject`。
- `--json` 输出结构保持不变，适合 Claude Code 后续适配层直接消费。

## 1.1.7 unified wrapper entry

```bash
npx power-ai-skills tool-capture-session --tool codex --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills tool-capture-session --tool trae --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills tool-capture-session --tool cursor --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills tool-capture-session --tool claude-code --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
```

- `tool-capture-session` 是 `1.1.7` 新增的统一 wrapper 入口，适配层现在可以通过 `--tool <name>` 走同一条命令，而不必自己维护 `codex`、`trae`、`cursor`、`claude-code`、`windsurf`、`gemini-cli`、`github-copilot`、`cline`、`aider` 的命令名映射。
- 现有专用命令仍然保留，用于人工调试或兼容旧接入方式。
- 当前统一入口支持 `codex`、`trae`、`cursor`、`claude-code`、`windsurf`、`gemini-cli`、`github-copilot`、`cline`、`aider`；如果传入未注册工具，会直接报错而不是静默降级。
- `tool-adapters.md` 也会同步列出当前已支持的 capture wrappers 和对应统一入口示例。
## 1.1.8 adapter contract and scaffold assets

```bash
npx power-ai-skills init --tool codex
npx power-ai-skills sync
npx power-ai-skills doctor
```

- `1.1.8` 开始，`init`、`sync`、`add-tool`、`remove-tool` 会自动补齐 conversation capture 脚手架，不再需要等第一次执行 `capture-session` 才创建。
- 新增的脚手架包括 `.power-ai/shared/conversation-capture.md`、`.power-ai/references/conversation-capture-contract.md`、`.power-ai/adapters/codex-capture.example.ps1`、`.power-ai/adapters/trae-capture.example.ps1`、`.power-ai/adapters/cursor-capture.example.ps1`、`.power-ai/adapters/claude-code-capture.example.ps1`、`.power-ai/adapters/windsurf-capture.example.ps1`、`.power-ai/adapters/gemini-cli-capture.example.ps1`、`.power-ai/adapters/github-copilot-capture.example.ps1`、`.power-ai/adapters/cline-capture.example.ps1`、`.power-ai/adapters/aider-capture.example.ps1`、`.power-ai/adapters/custom-tool-capture.example.ps1`、`.power-ai/adapters/trae-host-bridge.example.ps1`、`.power-ai/adapters/cursor-host-bridge.example.ps1`、`.power-ai/adapters/windsurf-host-bridge.example.ps1`、`.power-ai/adapters/cline-host-bridge.example.ps1` 和 `.power-ai/adapters/github-copilot-host-bridge.example.ps1`。
- 入口模板现在会直接注入 conversation capture 规则，要求 AI 只在“任务真正完成且值得沉淀”时询问用户是否收集；用户确认后只输出 `<<<POWER_AI_SESSION_SUMMARY_V1 ... >>>` 标记块。
- `doctor` 新增 conversation capture 检查项，会验证 contract、guidance、adapter 示例和 conversation 目录是否完整。
## 1.1.9 wrapper matrix

```bash
npx power-ai-skills trae-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills trae-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills trae-capture-session --stdin --extract-marked-block --reject --json
```

- `1.1.9` 把 `trae`、`windsurf`、`gemini-cli`、`github-copilot`、`cline`、`aider` 一次性纳入统一 wrapper 注册表，让它们和 `codex`、`cursor`、`claude-code` 共用同一套 `prepare -> 用户确认 -> confirm/reject` capture 流。
- `Trae` 不再只能依赖模板里的软提示；`tool-capture-session --tool trae` 现在可以直接走正式 wrapper 链路。

## 1.2.0 auto-capture runtime

```bash
npx power-ai-skills submit-auto-capture --tool trae --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --consume-now --json
npx power-ai-skills submit-auto-capture --tool codex --stdin --extract-marked-block --consume-now --json
npx power-ai-skills consume-auto-capture-inbox --max-items 10 --json
npx power-ai-skills watch-auto-capture-inbox --once --json
```

- `submit-auto-capture` 会复用 `evaluate-session-capture` 的门禁，只把 `ask_capture` 记录排队到 `.power-ai/auto-capture/inbox/`。
- 传入 `--consume-now` 时，会在提交后立即消费队列并自动写入 `.power-ai/conversations/`，适合“用户已在 AI 工具内确认收集”的自动落盘场景。
- `consume-auto-capture-inbox` 会把成功请求移动到 `.power-ai/auto-capture/processed/`，失败请求移动到 `.power-ai/auto-capture/failed/`。
- `watch-auto-capture-inbox` 适合后台 runtime；`--once` 适合验收、脚本调用和测试。
- `.power-ai/adapters/start-auto-capture-runtime.example.ps1` 可直接作为 watcher 启动脚本示例，所有 `<tool>-capture.example.ps1` 现在也支持 `-Auto`。

## 1.2.1 response inbox bridge

```bash
npx power-ai-skills queue-auto-capture-response --tool trae --from-file .power-ai/tmp/assistant-response.txt --json
npx power-ai-skills queue-auto-capture-response --tool cursor --from-file .power-ai/tmp/assistant-response.txt --consume-now --json
npx power-ai-skills consume-auto-capture-response-inbox --max-items 10 --json
npx power-ai-skills watch-auto-capture-inbox --once --json
```

- `queue-auto-capture-response` 适合不能直接调用 CLI 的宿主工具，只要能把“已确认收集”的 AI 最终回复写成文本文件，就可以先投递到 `.power-ai/auto-capture/response-inbox/`。
- 传入 `--consume-now` 时，`queue-auto-capture-response` 会立即串联 response inbox 消费，不需要再单独跑 `consume-auto-capture-response-inbox`。
- `consume-auto-capture-response-inbox` 会自动完成 marked block 提取、门禁判断，并把有效结果继续转入 auto-capture runtime。
- `watch-auto-capture-inbox` 从 `1.2.1` 开始会先处理 `response-inbox`，再处理 capture inbox，所以一个 watcher 就能覆盖“直接 submit”和“只会投递原始回复文件”两类工具接法。
- `.power-ai/auto-capture/response-processed/` 和 `.power-ai/auto-capture/response-failed/` 会保留桥接层的处理结果，方便排查宿主工具接入问题。

## 1.2.2 queue-response adapter mode

```powershell
.\.power-ai\adapters\trae-capture.example.ps1 -ResponsePath .power-ai\tmp\assistant-response.txt -QueueResponse -ConsumeNow
.\.power-ai\adapters\cursor-capture.example.ps1 -ResponsePath .power-ai\tmp\assistant-response.txt -QueueResponse
```

- 所有 `<tool>-capture.example.ps1` 现在都支持 `-QueueResponse`，适合“宿主能保存回复文本，但不想自己理解 response inbox 结构”的接法。
- 叠加 `-ConsumeNow` 后，会直接调用 `queue-auto-capture-response --consume-now`，把原始回复桥接、提取、门禁判断和 conversations 落盘串成一条命令。
- `custom-tool-capture.example.ps1` 也支持同样的 `-QueueResponse` / `-ConsumeNow` 组合，给未注册工具预留统一入口。

## 1.2.3 Trae host bridge sample

```powershell
.\.power-ai\adapters\trae-host-bridge.example.ps1 -ResponsePath .power-ai\tmp\assistant-response.txt
.\.power-ai\adapters\trae-host-bridge.example.ps1 -UseClipboard
```

- `trae-host-bridge.example.ps1` 是第一个真正面向 GUI 宿主的自动触发样板。
- 宿主只要能拿到“用户确认收集后”的最终回复文本，就可以把它交给这个脚本；脚本会自动写入 `.power-ai/tmp/assistant-response.trae.txt` 并继续走 `-QueueResponse -ConsumeNow`。
- 生成的 PowerShell capture 脚本现在会优先调用项目本地 `node_modules/.bin/power-ai-skills.cmd`，找不到时才回退到 `npx power-ai-skills`，所以消费项目安装态和本地联调态都能工作。
- 这几个工具的 example 脚手架也会自动生成到 `.power-ai/adapters/*.example.ps1`，`doctor` 会把它们一起纳入检查。

## 1.2.4 Cursor host bridge sample

```powershell
.\.power-ai\adapters\cursor-host-bridge.example.ps1 -ResponsePath .power-ai\tmp\assistant-response.txt
.\.power-ai\adapters\cursor-host-bridge.example.ps1 -ResponseText $response
.\.power-ai\adapters\cursor-host-bridge.example.ps1 -UseClipboard
```

- `cursor-host-bridge.example.ps1` 复用了同一套 GUI 宿主桥接 contract。
- 宿主只要能拿到“用户确认收集后”的最终回复文本，就可以把它交给这个脚本；脚本会自动写入 `.power-ai/tmp/assistant-response.cursor.txt` 并继续走 `-QueueResponse -ConsumeNow`。
- 这意味着 `Cursor` 已经和 `Trae` 一样具备了完整的 GUI 宿主自动触发样板，后续 `Windsurf / Cline / GitHub Copilot` 可以继续沿这个模板复制。

## 1.2.5 Additional GUI host bridge samples

```powershell
.\.power-ai\adapters\windsurf-host-bridge.example.ps1 -ResponsePath .power-ai\tmp\assistant-response.txt
.\.power-ai\adapters\cline-host-bridge.example.ps1 -ResponseText $response
.\.power-ai\adapters\github-copilot-host-bridge.example.ps1 -UseClipboard
```

- `windsurf-host-bridge.example.ps1`、`cline-host-bridge.example.ps1` 和 `github-copilot-host-bridge.example.ps1` 都复用了同一套 GUI 宿主桥接 contract。
- 这三个脚本会分别转接到对应的 `<tool>-capture.example.ps1 -QueueResponse -ConsumeNow`，宿主无需直接理解 auto-capture runtime。
- 到 `1.2.5` 为止，`Trae / Cursor / Windsurf / Cline / GitHub Copilot` 这 5 类 GUI/IDE 宿主都已有可复制的自动触发样板。

## 1.2.6 Terminal direct auto-capture

```powershell
.\.power-ai\adapters\codex-capture.example.ps1 -ResponseText $response -Auto
.\.power-ai\adapters\claude-code-capture.example.ps1 -ResponseText $response -Auto
.\.power-ai\adapters\gemini-cli-capture.example.ps1 -UseClipboard -Auto
.\.power-ai\adapters\aider-capture.example.ps1 -ResponseText $response -Auto
```

- 从 `1.2.6` 开始，终端类工具推荐直接走 `<tool>-capture.example.ps1 -Auto`，不再优先走 GUI host bridge。
- 这些 wrapper 现在除了 `-ResponsePath`，也支持 `-ResponseText` 和 `-UseClipboard`，可以直接接终端里已经确认过的最终回复文本。
- 推荐的 terminal-first 工具有：`codex`、`claude-code`、`gemini-cli`、`aider`。

## 1.2.7 Custom tool dual-mode examples

```powershell
.\.power-ai\adapters\custom-tool-capture.example.ps1 -ToolName my-cli -ResponseText $response -Auto
.\.power-ai\adapters\custom-tool-capture.example.ps1 -ToolName my-gui -ResponseText $response -QueueResponse -ConsumeNow
.\.power-ai\adapters\custom-tool-capture.example.ps1 -ToolName my-tool -ResponsePath .power-ai\tmp\assistant-response.txt -Yes
```

- `custom-tool-capture.example.ps1` 现在作为未注册工具的正式双模式样板来用。
- 如果你的新工具更像终端工具，优先走 `-Auto`。
- 如果你的新工具更像 GUI / IDE 宿主，优先走 `-QueueResponse -ConsumeNow`。

## 1.2.8 Wrapper promotion scaffold

```bash
npx power-ai-skills scaffold-wrapper-promotion --tool my-new-tool --display-name "My New Tool" --style gui
npx power-ai-skills scaffold-wrapper-promotion --tool my-new-tool --display-name "My New Tool" --style gui --pattern pattern_tree_list_page --json
```

- 这个命令不会直接修改 wrapper 注册表。
- 它会在 `.power-ai/proposals/wrapper-promotions/<tool>/` 下生成 proposal 目录。
- proposal 里会带上当前推荐入口、target files 和一个最小校验清单，适合把 `custom-tool` 状态的工具晋升为正式 wrapper。
- 当显式传入 `--pattern <id>` 时，proposal 会额外记录 `sourcePatternId`，并把 `pattern -> wrapper proposal` 关系写入 `.power-ai/governance/promotion-trace.json`。

## 1.2.9 Wrapper promotion review flow

```bash
npx power-ai-skills review-wrapper-promotion --tool my-new-tool --status accepted --note "ready for wrapper registration"
npx power-ai-skills list-wrapper-promotions --json
```

- `review-wrapper-promotion` 支持的状态有：`accepted`、`rejected`、`needs-work`。
- 它会更新 `wrapper-promotion.json` 中的状态字段，并同步刷新 proposal README。
- `list-wrapper-promotions` 可用来查看当前 proposal 列表和状态，适合在正式注册 wrapper 之前做人工 review。

## 1.3.0 Wrapper promotion materialization

```bash
npx power-ai-skills materialize-wrapper-promotion --tool my-new-tool
```

- 这个命令要求 proposal 已处于 `accepted` 状态。
- 它会在 `.power-ai/proposals/wrapper-promotions/<tool>/registration-artifacts/` 下生成 registration bundle 和 patch 文档。
- 这一步仍然不会自动改源码，但已经把正式 wrapper 注册所需的主要代码片段收口出来了。

## 1.3.1 Wrapper promotion apply

```bash
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool
```

- 这个命令要求 proposal 已经 `accepted` 且已完成 `materialize-wrapper-promotion`。
- 它会把 registration bundle 中的核心片段真正写回源码层：`wrappers.mjs`、`project-commands.mjs`、`commands/index.mjs`、`selection/cli.mjs`，GUI wrapper 还会补充 host bridge 生成逻辑。
- proposal 会同步记录 `applicationStatus`、`appliedAt` 和 `appliedFiles`，方便后续审计和继续补测试/文档。

## 1.3.2 Wrapper promotion follow-up scaffolding

```bash
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool
```

- `apply-wrapper-promotion` 现在除了核心注册源码，还会为 `tests/conversation-miner.test.mjs` 和 `tests/selection.test.mjs` 自动追加最小 `test.todo` 占位。
- proposal 目录下会新增 `post-apply-checklist.md`，把测试补齐、文档复核和 doctor 复跑这些收尾任务显式列出来。
- `wrapper-promotion.json` 会继续补充 `followUpStatus`、`testsScaffoldedAt`、`testScaffoldFiles`、`postApplyChecklistPath` 和 `pendingFollowUps`，避免“源码已写回”被误解成“wrapper 已经完全接入”。

## 1.3.4 Wrapper promotion documentation scaffolds

```bash
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool
```

- `apply-wrapper-promotion` 现在会在 proposal 目录下继续生成 `documentation-scaffolds/README.snippet.md`、`tool-adapters.snippet.md` 和 `command-manual.snippet.md`。
- proposal 的 `followUpStatus` 会推进到 `docs-generated`，同时记录 `docsGeneratedAt` 和 `docScaffoldFiles`。
- 剩余工作重点会从“先把样板补出来”收敛到“review 文档样板、合并到正式文档、再做最终 doctor/回归确认”。

## 1.4.4 Wrapper promotion dry-run

```bash
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool --dry-run --json
```

- `apply-wrapper-promotion` 新增 `--dry-run` 预演模式，用来预览源码回写、proposal 元数据更新和文档脚手架生成会影响哪些文件。
- dry-run 不会修改仓库源码，也不会更新 proposal 的 `applicationStatus`、`followUpStatus`、`appliedAt` 等状态字段。
- `--json` 输出会额外包含 `sourceChanges`、`wouldWriteFiles` 和 `postApplyChecklistPath`，方便后续接入自动审查或 CI 预检。

## 1.4.4 Doctor report templates

```bash
npx power-ai-skills doctor --json
```

- `doctor` 现在会统一生成 markdown / json 两份报告产物，消费项目默认写到 `.power-ai/reports/doctor-report.md` 和 `.power-ai/reports/doctor-report.json`。
- 在仓库根目录运行 `doctor` 时，会进入 `package-maintenance` 模式，并把同样的报告契约写到 `manifest/doctor-report.md` 和 `manifest/doctor-report.json`。
- 控制台摘要、`--format markdown` 输出和自动落盘报告会复用同一套检查分组模板，方便 CI、人工审查和后续升级摘要复用。

## 1.4.4 Project-local incremental generation

```bash
npx power-ai-skills generate-project-local-skills
npx power-ai-skills generate-project-local-skills --regenerate-project-local
```

- `generate-project-local-skills` 现在默认按当前扫描结果做增量更新，而不是“目录已存在就整批跳过”。
- 命令输出会显式区分 `created`、`updated`、`unchanged`、`removed`，便于快速判断本次扫描对 `project-local/auto-generated` 的真实影响。
- 只有 `generatedAt` 这类时间戳发生变化时，不会触发草案重写；只有结构化内容真的变化时，才会回写对应草案。
- `--regenerate-project-local` 仍保留为强制全量重建入口，适合需要彻底刷新 `auto-generated` 的场景。

## 1.4.4 Scan-project feedback loop

```bash
npx power-ai-skills review-project-pattern pattern_tree_list_page --decision generate --note "manual whitelist" --json
npx power-ai-skills review-project-pattern tree-list-page --clear --json
```

- `review-project-pattern` 用来把人工复核结果持久化到 `.power-ai/analysis/pattern-feedback.json`，支持 `generate`、`review`、`skip` 三种覆盖决策。
- 写入反馈后，命令会自动重跑当前项目扫描，刷新 `.power-ai/analysis/pattern-review.json`、`.power-ai/reports/project-scan-summary.md` 和 `.power-ai/reports/project-scan-feedback.md`。
- `generate-project-local-skills` 会直接消费覆盖后的 `pattern-review.json`，所以人工放行的模式会生成草案，人工抑制的模式会在后续同步中停止生成或被移除。
- `--clear` 用来删除指定 pattern 的人工覆盖规则，让该模式回到启发式判定结果。

## 1.4.4 Upgrade summary generation

```bash
npx power-ai-skills generate-upgrade-summary --json
```

- `generate-upgrade-summary` 会统一汇总当前环境下已有的治理产物，并同时落盘 markdown/json 摘要。
- 在消费项目中，摘要默认写到 `.power-ai/reports/upgrade-summary.md` 和 `.power-ai/reports/upgrade-summary.json`，重点汇总 `doctor`、`project-scan`、`conversation-miner` 和 `wrapper promotion audit`。
- 在仓库根目录运行并进入 `package-maintenance` 模式时，摘要会写到 `manifest/upgrade-summary.md` 和 `manifest/upgrade-summary.json`，并额外汇总 `impact-report.json`、`upgrade-risk-report.json`、`automation-report.json`、`version-record.json` 与最新 notification payload。
- 命令会复用并刷新 `doctor` 报告与 `wrapper-promotion-audit` 报告，可作为团队升级治理的单份入口报告。

## 1.4.4 Project baseline check

```bash
npx power-ai-skills check-project-baseline --json
```

- `check-project-baseline` 用来比较当前消费项目与包内团队默认基线的差异，并同时落盘 `.power-ai/reports/project-baseline.md` 和 `.power-ai/reports/project-baseline.json`。
- 当前检查维度包括 preset / tool selection 覆盖情况、`.power-ai/skills` 知识目录与 package baseline 的一致性、`.power-ai/shared` / `.power-ai/adapters` 模板产物、registry 快照和已选工具 entrypoint 状态。
- 如果项目显式选择了少于团队默认的工具集合，报告会标记 `PAI-BASELINE-PRESET-002` 为 attention，并列出 `missingDefaultTools`，便于团队判断是合理裁剪还是需要补齐。
- `PAI-BASELINE-PRESET-003` 是 warning 级别，用于提醒“当前项目是否仍保留默认 preset 元数据”；显式工具选择项目可以把它作为已接受差异复核。

## 1.4.4 Wrapper registry governance

```bash
npx power-ai-skills generate-wrapper-registry-governance --json
npx power-ai-skills generate-wrapper-registry-governance --stale-days 7 --json
```

- `generate-wrapper-registry-governance` 会把当前内置 capture wrapper registry 与项目里的 wrapper promotion proposal 合并成团队级治理视图。
- 报告会写到 `.power-ai/reports/wrapper-registry-governance.md` 和 `.power-ai/reports/wrapper-registry-governance.json`。
- 当前视图会列出已注册 wrapper、活动 proposal、归档 proposal、已 finalized 但未 register 的 proposal、仍有 pending follow-up 的 proposal，以及超过 `--stale-days` 仍停留在中间态的 proposal。
- `--stale-days` 默认是 `14`，用于判断 proposal 是否长期停留在 `needs-review`、`in-progress` 或 `pending-follow-ups` 状态。

## 1.4.4 Conversation miner strategy template

```bash
npx power-ai-skills generate-conversation-miner-strategy --type enterprise-vue --json
npx power-ai-skills generate-conversation-miner-strategy --type strict-governance --dry-run --json
```

- `generate-conversation-miner-strategy` 会按项目类型生成 `.power-ai/conversation-miner-config.json`，并同步输出 `.power-ai/reports/conversation-miner-strategy.md` 和 `.power-ai/reports/conversation-miner-strategy.json`。
- 当前支持 `enterprise-vue`、`strict-governance`、`exploration`、`manual-review` 四种策略模板。
- `enterprise-vue` 是默认模板，适合已经接入企业 Vue skill 体系的业务项目。
- `strict-governance` 会提高捕获阈值，减少低价值会话进入沉淀链路。
- `exploration` 会降低捕获阈值，适合早期发现项目模式，但需要更频繁复核。
- `manual-review` 会默认关闭 auto-capture runtime，更适合要求人工显式确认的团队。
- 使用 `--dry-run` 时只生成策略报告，不改写 `.power-ai/conversation-miner-config.json`。

## 1.4.4 Conversation pattern governance

```bash
npx power-ai-skills analyze-patterns --json
npx power-ai-skills merge-conversation-pattern --source pattern_dialog_form --target pattern_tree_list_page --json
npx power-ai-skills archive-conversation-pattern --pattern pattern_tree_list_page --json
npx power-ai-skills restore-conversation-pattern --pattern pattern_dialog_form --json
```

- `conversation-miner` 现在支持对 pattern 做显式治理，用来处理长期运行后同类 pattern 碎片化的问题。
- merge / archive / restore 会更新 `.power-ai/patterns/pattern-governance.json`，并自动重跑当前 pattern 聚合结果。
- 治理摘要会同步写到 `.power-ai/reports/conversation-pattern-governance.md`，便于人工复核最近的 merge / archive / restore 历史。
- merge 后目标 pattern 会补充 `sourceSceneTypes` 和 `mergedFromSceneTypes`；archive 后该 pattern 会从活动输出中隐藏，但治理记录仍会保留。

## 1.4.5 Conversation decision ledger

```bash
npx power-ai-skills analyze-patterns --json
npx power-ai-skills review-conversation-pattern --pattern pattern_dialog_form --accept --target docs --reason "document first" --json
npx power-ai-skills review-conversation-pattern --pattern pattern_tree_list_page --reject --reason "project-specific noise" --json
npx power-ai-skills review-conversation-pattern --pattern pattern_dialog_form --archive --json
```

- `analyze-patterns` 现在会同步维护 `.power-ai/governance/conversation-decisions.json` 与 `.power-ai/governance/conversation-decision-history.json`，把每个 conversation pattern 的当前决策状态一起落盘。
- 当前固定状态包括：`detected`、`review`、`accepted`、`rejected`、`promoted`、`archived`；固定目标类型包括：`project-local-skill`、`team-rule`、`wrapper-proposal`、`docs`、`ignored`。
- `review-conversation-pattern` 用来把 conversation-miner 的候选 pattern 推进成正式治理决策，支持：
  - `--accept --target <type>`：接受当前 pattern，并指定去向
  - `--reject --reason "..."`：显式拒绝该 pattern，并标记为 `ignored`
  - `--archive`：把该 pattern 决策归档
- 决策账本还会同步生成 `.power-ai/reports/conversation-decisions.md`，便于快速查看当前 active decisions 与最近 history。
- `merge-conversation-pattern`、`archive-conversation-pattern`、`restore-conversation-pattern` 现在都会联动更新 conversation decisions，避免 pattern 治理与决策账本脱节。
- `generate-project-skill` 成功后，会把对应 pattern 自动推进到 `promoted -> project-local-skill`，并把 skill trace 写回 decision ledger。
- `doctor` 现在会检查 conversation review backlog；如果 `.power-ai/governance/conversation-decisions.json` 里仍有 `review` 状态项，会给出 warning，提醒继续治理。
- `generate-upgrade-summary` 现在也会汇总 decision ledger，展示 pending review 数量，并把 decision ledger 路径带入升级摘要。

## 1.4.5 Team policy center

```bash
npx power-ai-skills show-team-policy --json
npx power-ai-skills validate-team-policy --json
npx power-ai-skills check-team-policy-drift --json
```

- `show-team-policy` 会输出当前包内团队策略中心内容，并在消费项目里附带 `.power-ai/team-policy.json` 快照与基础校验结果。
- `validate-team-policy` 会校验 `config/team-policy.json` 是否引用了已注册工具、已存在的 skills、已声明的 preset，以及合法的 wrapper rollout 阶段。
- `check-team-policy-drift` 会把项目当前状态和团队策略做对比，并落盘 `.power-ai/reports/team-policy-drift.md` 和 `.power-ai/reports/team-policy-drift.json`。
- 当前 drift 检查维度包括：`.power-ai/team-policy.json` 快照是否存在且与包内一致、已选工具是否在 `allowedTools` 内、`requiredSkills` 是否都已同步到 `.power-ai/skills`、当前工具是否仍覆盖团队默认工具基线、选中 wrapper 是否处于 `general` rollout。
- `sync` 现在会把 `config/team-policy.json` 同步到消费项目的 `.power-ai/team-policy.json`，作为团队治理的单一快照。

## 1.4.5 Project profile decision flow

```bash
npx power-ai-skills show-project-profile-decision --json
npx power-ai-skills review-project-profile --accept enterprise-vue --json
npx power-ai-skills review-project-profile --reject --reason "workspace is intentionally CLI-first" --json
npx power-ai-skills review-project-profile --defer --reason "wait for next rollout window" --next-review-at 2026-05-20 --json
```

- `sync` / `init` 现在会自动生成 `.power-ai/governance/project-profile-decision.json` 与 `.power-ai/governance/project-profile-decision-history.json`，把当前已绑定画像、推荐画像和当前决策状态一起落盘。
- 当前 project profile decision 固定支持四种状态：`auto-recommended`、`accepted`、`rejected`、`deferred`。
- `show-project-profile-decision` 用来查看当前项目画像决策记录、最近 history 以及当前 recommendation source / signal。
- `review-project-profile` 用来把 project profile drift 从“仅 warning”推进成“可审计决策”：
  - `--accept <profile>`：接受当前推荐画像
  - `--reject --reason "..."`：显式拒绝本轮推荐画像
  - `--defer --reason "..." --next-review-at YYYY-MM-DD`：暂不迁移，并记录下次复核日期
- `check-team-policy-drift`、`doctor` 与 `check-project-baseline` 现在都会带出 `projectProfileDecision`、`decisionReason` 和 `nextReviewAt`，避免团队只看到漂移，不知道是否已经做过治理决策。
- 当 recommendation source 或已绑定画像发生变化时，系统会自动重置为新的 `auto-recommended` 决策，并把旧快照保留在 history 中，避免用旧决策覆盖新状态。

## 1.4.5 Promotion trace

```bash
npx power-ai-skills show-promotion-trace --pattern pattern_tree_list_page --json
npx power-ai-skills show-promotion-trace --skill tree-list-page-conversation-project --json
npx power-ai-skills show-promotion-trace --tool my-new-tool --json
npx power-ai-skills show-promotion-trace --release 1.4.4 --json
```

- `generate-project-skill` 现在会把 `pattern -> project-skill` 关系写入 `.power-ai/governance/promotion-trace.json`，并同步刷新 `.power-ai/reports/promotion-trace.md`。
- `promote-project-local-skill` 现在会把 `project-skill -> manual-project-skill` 关系写入 promotion trace，第一版先覆盖项目内“自动草案晋升为人工维护 skill”的链路。
- `scaffold-wrapper-promotion --pattern <id>` 会把 `pattern -> wrapper-proposal` 关系写入 promotion trace；后续 `register-wrapper-promotion` 成功时，会继续把 `registrationStatus`、`registeredAt` 和 `registrationRecordPath` 回写到同一条 trace relation。
- `show-promotion-trace` 用来按 `pattern`、`skill`、`tool` 或 `release` 查询当前 promotion trace，并返回匹配关系、总览统计、trace 路径与 markdown 报告路径。
- `generate-upgrade-summary` 现在会汇总 promotion trace，帮助团队快速判断哪些会话洞察已经真正进入 project skill、wrapper proposal 或 release 链路。
- 包维护侧刷新 release artifacts 时，还会生成 `manifest/promotion-trace-report.json` 和 `manifest/promotion-trace-report.md`，把本次版本实际命中的 trace relations 单独沉淀下来。

## 1.4.5 Project governance context

```bash
npx power-ai-skills show-project-governance-context --json
```

- `sync`、`init`、`add-tool`、`remove-tool`、conversation decision 命令、wrapper promotion 命令和 `check-project-baseline` 现在都会刷新 `.power-ai/context/project-governance-context.json`。
- 当前快照会统一沉淀 `selectedProjectProfile`、`recommendedProjectProfile`、`projectProfileDecision`、`teamPolicyVersion`、`allowedTools`、`requiredSkills`、`conversationMinerStrategy`、`baselineStatus`、`policyDriftStatus`、`pendingConversationReviews` 和 `pendingWrapperProposals`。
- `show-project-governance-context` 用来主动刷新并查看这份快照，适合在项目升级后快速确认当前治理状态，而不必分别翻 `team-policy-drift`、`project-profile-decision`、`conversation-decisions` 和 wrapper proposal 目录。
- `doctor` 现在会检查 `.power-ai/context/project-governance-context.json` 是否存在；`check-project-baseline` 会把快照一起回显到结果里；`generate-upgrade-summary` 也会把治理上下文作为独立 section 展示。

## 1.4.5 Team policy enforcement

```bash
npx power-ai-skills init --tool github-copilot
npx power-ai-skills add-tool --tool vscode-agent
pnpm check:release-gates -- --require-consumer-matrix
pnpm upgrade:advice -- --automation-report manifest/automation-report.json
pnpm upgrade:payload -- --automation-report manifest/automation-report.json
```

- `init` 和 `add-tool` 现在会在真正写入工具选择前做团队策略准入校验。
- 如果工具不在 `config/team-policy.json` 的 `allowedTools` 里，或者 rollout 阶段为 `disabled`，命令会直接失败。
- 如果工具处于 `pilot` / `compatible-only` rollout，命令不会阻断，但会先打印策略 warning，提醒这不是团队级通用基线。
- `init --project-profile <name>` 现在会把 `team policy projectProfiles` 真正接入默认选择，自动决定 preset、工具集合和 required skills，并把 `selectedProjectProfile` / `requiredSkills` 一起落盘到 `.power-ai/selected-tools.json`。
- 当未显式传入 `--project-profile` 时，`init` / `show-defaults` 现在会优先根据工作区特征自动推荐团队画像；当前已内置 `enterprise-vue` 与 `terminal-governance` 的保守识别规则。
- `show-defaults --project-profile <name>` 会直接展示该项目画像下的默认 preset 和 required skills，方便初始化前预览治理策略。
- 当项目已经绑定 `selectedProjectProfile` 后，后续 `add-tool` 也会继续受该 profile 的 `allowedTools` 约束，避免增量绕开团队项目边界。
- `doctor`、`check-project-baseline` 和 `upgrade:advice` 现在也会关注“当前推荐 project profile 是否与项目已绑定画像一致”，帮助团队在升级后发现项目画像漂移。

## 1.4.6 Governance review deadlines

```bash
npx power-ai-skills check-governance-review-deadlines --json
```

- `check-governance-review-deadlines` 会扫描当前项目里已经记录的治理复核日期，第一版先覆盖 `project-profile-decision`，并同时落盘 `.power-ai/reports/governance-review-deadlines.md` 与 `.power-ai/reports/governance-review-deadlines.json`。
- `check-auto-capture-runtime --json` 会只读检查 `.power-ai/auto-capture/*` 的 runtime 状态，输出 `capture backlog / response backlog / failed queues / bridge scaffolding` 汇总，并落盘 `.power-ai/reports/auto-capture-runtime.md/json`。
- `show-project-governance-context --json` 现在会额外带出 `autoCaptureRuntime`，方便在项目治理快照里直接看到自动采集是否启用、是否有积压、是否有失败队列。
- 当前会区分 `not-scheduled`、`scheduled`、`due-today`、`overdue` 四种 review status，并返回 `daysUntilReview`、`daysOverdue`、`nextReviewAt` 与推荐 remediation。
- `show-project-profile-decision --json` 现在会额外回显 `reviewDeadline`，方便在查看单条画像决策时直接确认是否已经过期待复核。
- `.power-ai/context/project-governance-context.json` 现在会同步沉淀 `projectProfileDecisionReviewStatus`、`overdueGovernanceReviews`、`dueTodayGovernanceReviews` 与 `nextGovernanceReviewAt`，供 `doctor`、`check-project-baseline`、`generate-upgrade-summary` 和后续 release governance 复用。
- `doctor` 与 `check-project-baseline` 已新增“治理复核日期是否过期”的 warning 检查；`upgrade:advice` 和 consumer compatibility matrix 也会把 overdue / due-today 计数带进治理摘要。
- `check:release-gates` 现在会附带 `team-policy-governance` gate，并默认继承 `teamPolicy.releasePolicies.enforceConsumerMatrix`。
- `upgrade:advice` 现在会自动补充 `check-team-policy-drift` 和 `validate-team-policy` 的建议动作，让消费者和维护者都能看到策略相关的后续步骤。
- `check:release-gates` 现在还会区分 `pass / warn / fail`：release artifact consistency、wrapper governance、team policy 和 consumer compatibility 仍然是 blocking gate；未处理的 project profile recommendation、conversation review backlog，以及已 `applied` 但仍有 follow-up actions 的 evolution proposal draft，会以下沉治理 warning 的方式写入 `manifest/release-gate-report.md/json`。
- `upgrade:advice`、notification payload 和 `manifest/version-record.json` 现在会复用同一份治理摘要，包含 unresolved / deferred / rejected project profile decisions、pending conversation reviews、pending wrapper proposals 以及 release gate warning 数。
- 对已经 `deferred` 或 `rejected` 的 project profile decision，升级建议现在以“升级后复核历史决策”为主，不再默认要求所有消费者项目立即迁移。

## 1.3.5 Wrapper promotion finalize

```bash
npx power-ai-skills finalize-wrapper-promotion --tool my-new-tool --note "ready for registration"
```

- 这个命令要求 proposal 已经 `accepted`、`materialized`、`applied`，并且当前 `followUpStatus` 已达到 `docs-generated`。
- finalize 后 proposal 会写入 `finalizedAt`、`finalizationNote`，同时清空 `pendingFollowUps` 并把 `followUpStatus` 收口到 `finalized`。
- `doctor` 会对 `finalized` proposal 停止 follow-up warning，后续只保留正常的项目健康检查。

## 1.3.6 Wrapper promotion register

```bash
npx power-ai-skills register-wrapper-promotion --tool my-new-tool --note "officially supported"
```

- 这个命令只允许对已经 `finalized` 的 proposal 执行，表示该 wrapper 已正式纳入支持矩阵。
- register 后 proposal 会写入 `registrationStatus`、`registeredAt`、`registrationNote`，并在 proposal 目录下生成 `registration-record.json`。
- `doctor` 会对 `finalized` 但尚未 register 的 proposal 提示 `ready for registration`；对已 `registered` 的 proposal 不再继续提示 wrapper promotion warning。

## 1.3.7 Wrapper promotion archive

```bash
npx power-ai-skills archive-wrapper-promotion --tool my-new-tool --note "archived after official registration"
npx power-ai-skills list-wrapper-promotions --archived --json
```

- 这个命令只允许对已经 `registered` 的 proposal 执行，会把目录从 `.power-ai/proposals/wrapper-promotions/<tool>/` 移动到 `.power-ai/proposals/wrapper-promotions-archive/<tool>/`。
- archive 后 proposal 会写入 `archiveStatus`、`archivedAt`、`archiveNote`，并在归档目录中生成 `archive-record.json`。
- `list-wrapper-promotions` 默认只列活动 proposal；带 `--archived` 时会把活动和归档 proposal 一起返回，并标记 `archived: true/false`。

## 1.3.8 Wrapper promotion restore

```bash
npx power-ai-skills restore-wrapper-promotion --tool my-new-tool --note "resume wrapper iteration"
```

- 这个命令只允许对已归档 proposal 执行，会把目录从 `.power-ai/proposals/wrapper-promotions-archive/<tool>/` 移回 `.power-ai/proposals/wrapper-promotions/<tool>/`。
- restore 后 proposal 会写入 `restoredAt` 与 `restorationNote`，并在活动目录中生成 `restore-record.json`。
- 恢复后的 proposal 会重新出现在默认 `list-wrapper-promotions` 结果中，适合继续修订或重新走后续状态流。

## 1.3.9 Wrapper promotion timeline

```bash
npx power-ai-skills show-wrapper-promotion-timeline --tool my-new-tool --json
```

- 这个命令会优先在活动 proposal root 查找，找不到时自动到 archive root 查找。
- 输出会统一聚合 `scaffolded / reviewed / materialized / applied / finalized / registered / archived / restored` 等关键节点。
- 适合快速确认某个 wrapper proposal 当前在哪个阶段，以及它是否经历过 archive / restore。

## 1.4.0 Wrapper promotion audit

```bash
npx power-ai-skills generate-wrapper-promotion-audit --json
```

- 这个命令会同时扫描活动 proposal root 和 archive root，并生成 `.power-ai/reports/wrapper-promotion-audit.md` 与 `.power-ai/reports/wrapper-promotion-audit.json`。
- audit 输出包含总量、活动量、归档量、`ready for registration` 数量、挂起 follow-up 数量等摘要。
- 每个 proposal 还会带上 last event 和 timeline 摘要，适合版本收尾或批量审计。

## 1.4.1 Wrapper promotion audit filters

```bash
npx power-ai-skills generate-wrapper-promotion-audit --filter ready-for-registration --json
npx power-ai-skills generate-wrapper-promotion-audit --filter archived --json
```

- `--filter` 当前支持：`active`、`archived`、`ready-for-registration`、`pending-follow-ups`。

## 1.4.2 Wrapper promotion audit sort

```bash
npx power-ai-skills generate-wrapper-promotion-audit --sort tool-name --json
npx power-ai-skills generate-wrapper-promotion-audit --filter ready-for-registration --sort last-event-desc --json
```

- `--sort` 当前支持：`tool-name`、`last-event-desc`、`last-event-asc`。
- `--filter` 和 `--sort` 可以同时使用，先筛选，再排序。

## 1.4.3 Wrapper promotion audit export

```bash
npx power-ai-skills generate-wrapper-promotion-audit --fields toolName,status --format csv --output .power-ai/reports/wrapper-promotion-audit.export.csv --json
npx power-ai-skills generate-wrapper-promotion-audit --filter ready-for-registration --sort last-event-desc --fields toolName,displayName,registrationStatus,lastEvent --format json --json
```

- `--fields` 使用逗号分隔，当前支持：`toolName`、`displayName`、`archived`、`status`、`materializationStatus`、`applicationStatus`、`followUpStatus`、`registrationStatus`、`archiveStatus`、`promotionRoot`、`lastEvent`、`pendingFollowUps`。
- `--format` 当前支持：`json`、`md`、`csv`。
- `--output` 可指定导出文件；不传时会输出到 `.power-ai/reports/wrapper-promotion-audit.export.<ext>`。
- 只传 `--fields` 时，会默认生成一份 `json` export。
- 过滤后仍会生成完整的 audit JSON 和 Markdown，但 `summary` 与 `proposals` 都只针对当前筛选结果。
- 适合直接查看待注册 proposal、挂起 follow-up proposal 或归档 proposal，而不需要再从全量报表里手工筛。

## 1.4.6 Governance summary

```bash
npx power-ai-skills generate-governance-summary --json
```

- `generate-governance-summary` 会输出 `.power-ai/reports/governance-summary.md` 和 `.power-ai/reports/governance-summary.json`，把项目治理状态整理成一份运营总览。
- 当前会汇总 `project-profile-decision`、governance review deadline、conversation decision backlog、wrapper promotion backlog、promotion trace、baseline status、team policy drift status 和 governance context。
- 报表会直接显示 `overdue governance reviews`、`pending conversation reviews`、`pending wrapper proposals`、`ready for registration`、`pending wrapper follow-ups` 等关键计数，适合作为项目治理巡检入口。
- 这份报表与 `generate-upgrade-summary` 的定位不同：`generate-upgrade-summary` 偏升级与发布视角，`generate-governance-summary` 偏消费项目日常治理视角。

## 1.4.6 Batch governance review

```bash
npx power-ai-skills review-project-profile --accept-recommended --json
npx power-ai-skills review-conversation-pattern --from-review --accept --target project-local-skill --json
npx power-ai-skills review-conversation-pattern --from-review --archive --limit 5 --json
```

- `review-project-profile` 现在支持 `--accept-recommended`，用于直接接受当前推荐画像，不需要重复手工填写 profile 名称。
- `review-conversation-pattern` 现在支持批量模式：`--from-review` 等价于 `--from-state review`，会对当前 decision ledger 中匹配状态的 pattern 执行统一审阅动作。
- 批量模式当前支持 `--accept`、`--reject`、`--archive`，并可配合 `--target`、`--reason`、`--limit <n>` 使用。
- 批量处理后仍会写回 `.power-ai/governance/conversation-decisions.json`、history 和 markdown report，并刷新 governance context。

## 1.4.6 Governance history

```bash
npx power-ai-skills show-governance-history --type profile-decision --limit 10 --json
npx power-ai-skills show-governance-history --type conversation-decision --limit 20 --json
npx power-ai-skills show-governance-history --type promotion --limit 20 --json
```

- `show-governance-history` 会输出 `.power-ai/reports/governance-history.md` 和 `.power-ai/reports/governance-history.json`，统一查看最近的治理历史。
- 当前支持三类历史：`profile-decision`、`conversation-decision`、`promotion`。
- `promotion` 当前复用 `promotion-trace.json` 作为历史来源，适合先查看最近发生过哪些 promotion relation 变化；后续如果需要更细粒度事件流，再单独扩展。
- 可配合 `--limit <n>` 控制返回条数，默认按最近记录时间倒序输出。
## 1.4.7 Evolution cycle

```bash
npx power-ai-skills run-evolution-cycle --json
npx power-ai-skills run-evolution-cycle --min-new-conversations 5 --json
npx power-ai-skills run-evolution-cycle --force --dry-run --json
```

## 1.4.7 Evolution policy

```bash
npx power-ai-skills show-evolution-policy --json
npx power-ai-skills validate-evolution-policy --json
```

- `show-evolution-policy` 会在项目缺失配置时自动补齐 `.power-ai/evolution-policy.json`。
- `validate-evolution-policy` 会校验 schema、自动化布尔开关和数值阈值，避免项目在自进化前带着无效配置运行。
- `run-evolution-cycle` 现在会读取 evolution policy，并遵守：
  - `autoAnalyzeEnabled`
  - `autoRefreshGovernanceContext`
  - `autoRefreshGovernanceSummary`
  - `minConversationCountToAnalyze`
- 高风险自动化开关默认保持关闭，包括：
  - `allowAutoProjectLocalSkillRefresh`
  - `allowAutoSharedSkillPromotion`
  - `allowAutoWrapperProposal`
  - `allowAutoReleaseActions`

## 1.4.7 Evolution candidates

```bash
npx power-ai-skills generate-evolution-candidates --json
```

- `generate-evolution-candidates` 会生成：
  - `.power-ai/governance/evolution-candidates.json`
  - `.power-ai/governance/evolution-candidate-history.json`
  - `.power-ai/reports/evolution-summary.md`
  - `.power-ai/reports/evolution-summary.json`
- 当前第一版会从以下输入自动生成候选：
  - conversation patterns
  - conversation decision ledger
  - project profile drift
- 当前已落地的候选类型包括：
  - `project-local-skill-draft`
  - `wrapper-proposal-candidate`
  - `docs-candidate`
  - `profile-adjustment-candidate`
- 这一层只生成候选，不会直接修改 shared skill、wrapper registry 或 release 产物。

## 1.4.7 Evolution actions

```bash
npx power-ai-skills apply-evolution-actions --json
npx power-ai-skills apply-evolution-actions --dry-run --json
```

## 1.4.7 Evolution proposals

```bash
npx power-ai-skills generate-evolution-proposals --json
```

- `generate-evolution-proposals` 会生成：
  - `.power-ai/governance/evolution-proposals.json`
  - `.power-ai/governance/evolution-proposal-history.json`
  - `.power-ai/reports/evolution-proposals.md`
  - `.power-ai/reports/evolution-proposals.json`
- 同时会在 `.power-ai/proposals/evolution/` 下为每条 proposal 生成独立目录，落盘 `proposal.json` 与 `README.md`
- 当前第一版会把高风险或需要人工治理的 evolution candidate 推进成 proposal，主要覆盖：
  - `project-profile-adjustment-proposal`
  - `wrapper-rollout-adjustment-proposal`
  - `shared-skill-promotion-proposal`
  - `release-impact-escalation-proposal`
- proposal 会保留 `sourceCandidateIds`、`sourcePatternIds`、`riskLevel`、`recommendedAction` 和 evidence 摘要，便于后续进入人工审阅与治理流
- `run-evolution-cycle` 在完成 candidate generation 和低风险 actions 后，也会自动刷新 evolution proposals

## 1.4.7 Evolution proposal review

```bash
npx power-ai-skills list-evolution-proposals --json
npx power-ai-skills list-evolution-proposals --type project-profile-adjustment-proposal --json
npx power-ai-skills list-evolution-proposals --status review --limit 10 --json
npx power-ai-skills review-evolution-proposal --proposal <proposal-id> --accept --note "approved by team" --json
npx power-ai-skills review-evolution-proposal --proposal <proposal-id> --reject --reason "not stable enough" --json
npx power-ai-skills review-evolution-proposal --proposal <proposal-id> --archive --json
npx power-ai-skills review-evolution-proposal --from-status draft --type project-profile-adjustment-proposal --accept --limit 5 --json
```

- `list-evolution-proposals` 用于统一查看当前项目中的高风险 evolution proposal，支持按 `--type`、`--status` 和 `--archived` 过滤
- `review-evolution-proposal` 当前支持把 proposal 推进到 `review`、`accepted`、`rejected`、`archived`
- `review-evolution-proposal` 现在同时支持单条模式和批量模式：
  - 单条模式使用 `--proposal <proposal-id>`
  - 批量模式使用 `--from-status <status>`，并可叠加 `--type`、`--limit`、`--archived`
- 批量 review 会返回 `processedCount`、`skippedCount` 和 `skipped` 明细，便于团队先筛选再批量处理
- proposal 审阅后会刷新：
  - `.power-ai/governance/evolution-proposals.json`
  - `.power-ai/governance/evolution-proposal-history.json`
  - `.power-ai/reports/evolution-proposals.md/json`
  - `.power-ai/context/project-governance-context.json`
  - `.power-ai/reports/governance-summary.md/json`
- 当前这一层仍然是“治理流”，不会直接自动应用 shared skill、wrapper registry、team policy 或 release 变更

## 1.4.7 Evolution proposal apply

```bash
npx power-ai-skills apply-evolution-proposal --proposal <proposal-id> --json
npx power-ai-skills apply-evolution-proposal --from-status accepted --type project-profile-adjustment-proposal --limit 5 --json
```

- `apply-evolution-proposal` 现在支持已 `accepted` 的以下 proposal：
  - `project-profile-adjustment-proposal`
  - `shared-skill-promotion-proposal`
  - `wrapper-rollout-adjustment-proposal`
  - `release-impact-escalation-proposal`
- `apply-evolution-proposal` 现在同时支持单条模式和批量模式：
  - 单条模式使用 `--proposal <proposal-id>`
  - 批量模式使用 `--from-status <status>`，并可叠加 `--type`、`--limit`、`--archived`
- 对高风险 proposal，`apply-evolution-proposal` 不会自动注册 wrapper、不会自动发版，而是生成下一层可执行 draft artifact：
  - shared skill draft bundle
  - accepted wrapper promotion draft
  - release impact escalation draft bundle
- `shared-skill` / `release-impact` draft 现在都会补齐统一的 handoff scaffold：
  - README 会显式写出 owner hint、handoff status、next action / next review 与 manual boundary
  - draft root 内会生成 `manual-checklist.md`
  - `skill.meta.json` / `release-impact-draft.json` 会携带与 CLI `list/show` 对齐的 `draftId`、`draftRoot`、`generatedFiles` 与 `handoff`
- apply 成功后会把 proposal 状态推进到 `applied`，并刷新：
  - `.power-ai/governance/evolution-proposals.json`
  - `.power-ai/governance/evolution-proposal-history.json`
  - `.power-ai/context/project-governance-context.json`
  - `.power-ai/reports/governance-summary.md/json`
- `project-governance-context`、`generate-governance-summary` 与 `generate-upgrade-summary` 现在会继续汇总 apply 后生成的 draft artifact，包括：
  - `applied evolution proposals`
  - `applied wrapper drafts`
  - `applied shared-skill drafts`
  - `applied release-impact drafts`
  - `applied proposal follow-ups`
- `doctor` 现在也会对“已 apply 但仍有 follow-up actions 的 evolution draft”给出 warning：
  - `PAI-POLICY-013`
  - 重点用于提醒团队不要把 draft artifact 误当成已经完全收口的正式治理产物
- `project-governance-context`、`generate-governance-summary`、`generate-upgrade-summary` 与 `doctor` 现在会继续带出 applied draft handoff preview，方便不进入 draft root 也能看到：
  - `ownerHint`
  - `handoffStatus`
  - `checklistPath`
  - `nextAction`
- `release-gates` 现在也会把这类“已 apply 但仍有后续动作”的 proposal draft 映射到 `evolution-proposal-governance` warning，提醒先把 apply 后的收尾动作完成，再做大范围发布
- 如果 apply 产物里带有 `nextActions`，治理摘要会直接把这批 follow-up 动作显示出来，方便继续推进：
  - wrapper draft 后续通常会提示 `materialize-wrapper-promotion` / `apply-wrapper-promotion --dry-run`
  - shared-skill draft 后续通常会提示继续人工整理并进入 shared-skill workflow
  - release-impact draft 后续通常会提示交给 package-maintenance / release governance 人工收口
- `generate-governance-summary` 与 `generate-upgrade-summary` 的 markdown 里现在会额外出现 `draft handoff preview`，把 proposal id、owner hint、handoff status 和 next action 直接汇总到治理摘要里
- 现在还可以直接查看 apply 后生成的 draft artifact，而不必手工翻 `evolution-proposals.json`：
  - `npx power-ai-skills list-evolution-drafts --json`
  - `npx power-ai-skills list-evolution-drafts --type shared-skill-draft --limit 5 --json`
  - `npx power-ai-skills show-evolution-draft --proposal <proposal-id> --json`
  - `npx power-ai-skills show-evolution-draft <draft-id> --json`
- `list-evolution-drafts` 当前会统一返回：
  - `draftId`
  - `artifactType`
  - `proposalId` / `proposalType`
  - `draftRoot`
  - `generatedFiles`
  - `nextActions`
  - `handoff`
  - `handoffStatus` / `ownerHint` / `checklistPath` / `nextAction` / `nextReviewAt`
  - `metadata`
- `show-evolution-draft` 适合在团队已经从 `doctor`、`release-gates` 或摘要里拿到 proposal id / draft id 后，快速定位具体 draft root 和下一步动作
- 当前 apply 动作仍然是受控治理动作，不会自动改 shared skill 正式注册、wrapper registry、team policy 主配置或 release 产物

## 1.4.7 Evolution proposal aging

- evolution proposal 现在会按治理 SLA 自动标记 aging：
  - `review` 超过 `7` 天记为 stale review
  - `accepted` 超过 `3` 天且尚未 apply 记为 stale accepted proposal
- `show-project-governance-context`、`generate-governance-summary`、consumer compatibility matrix、release gates、upgrade advice 与 governance operations report 都会同步汇总：
  - `staleEvolutionProposalReviews`
  - `staleAcceptedEvolutionProposals`
  - proposal aging 对应的 SLA 与 oldest age
- `doctor` 新增 `PAI-POLICY-011`，用于提示 evolution proposal backlog 已经超过治理 SLA
- 当 proposal aging 出现时，治理总览会自动补充建议动作，优先引导：
  - `npx power-ai-skills list-evolution-proposals --json`
  - `npx power-ai-skills review-evolution-proposal --proposal <id> --accept|--reject|--archive`
  - `npx power-ai-skills apply-evolution-proposal --proposal <id>`

- `apply-evolution-actions` 会生成或刷新 `.power-ai/governance/evolution-actions.json`。
- 当前第一版只执行低风险动作：
  - 刷新 `project-local` auto-generated drafts
  - 刷新 project governance context
  - 刷新 governance summary
- 是否允许自动刷新 project-local drafts，取决于 `evolution-policy.json` 中的 `allowAutoProjectLocalSkillRefresh`。
- `refresh-project-local-skill-draft` 现在会继续处理已经 `materialized` 的 project-local candidate，而不是只在第一次生成时执行。
- 当底层 conversation pattern 没有发生实质变化时，自动 refresh 不会强制重写草稿，而是把 action 记为 `skipped`，并返回 `project-local draft already up to date` / `writeMode: unchanged`。
- 只有 pattern 内容真的变化时，才会把 action 记为 `executed` 并刷新草稿内容，避免仅因 `generatedAt` 变化产生无意义 churn。
- `run-evolution-cycle` 在触发分析后，也会自动串起这一步。

- `run-evolution-cycle` 是自进化第一版调度入口，会检查当前项目已采集的 conversations 数量，并根据"自上次 analyze-patterns 之后新增的会话数"决定是否触发一轮自动分析。
- 第一版默认阈值是 `3` 条新增会话，也可以通过 `--min-new-conversations <n>` 临时覆盖；`--force` 会忽略阈值直接触发，`--dry-run` 只输出本轮 would-run 结果，不实际执行分析。
- 当触发执行时，当前会自动串起 `analyze-patterns`、治理上下文刷新和 `generate-governance-summary`，并输出 `.power-ai/reports/evolution-cycle-report.md` 与 `.power-ai/reports/evolution-cycle-report.json`。
- 当前这一版还不会自动生成 shared skill、Wrapper 正式注册或 release 动作；定位是"先完成自动分析调度和治理报告"，后续再继续扩展 evolution policy、candidate generation 和低风险自动落地。

## Capture Safety Policy Baseline

```bash
npx power-ai-skills show-capture-safety-policy --json
npx power-ai-skills validate-capture-safety-policy --json
```

- `config/team-policy.json` 现在可以声明团队级 `captureSafetyPolicy` 基线，作为消费项目的默认采集安全边界。
- `init` / `sync` 首次补齐 `.power-ai/capture-safety-policy.json` 时，会优先使用团队基线，而不是只写入内置默认值。
- 运行时会按“内置默认值 -> team policy captureSafetyPolicy -> 项目 `.power-ai/capture-safety-policy.json`”三层顺序合并。
- 这意味着项目仍可做局部覆盖，但未覆盖的字段会继续继承团队基线，而不是回退到零散默认值。
- `show-capture-safety-policy` 与 `validate-capture-safety-policy` 现在都会基于同一份生效策略输出结果，便于排查团队基线和项目覆盖是否一致。
- `capture-session`、auto-capture admission 判定和 capture retention 现在也复用这份生效策略，不再各自读取不同来源。

## 1.4.7 Capture safety governance semantics

```bash
npx power-ai-skills show-capture-safety-policy --json
npx power-ai-skills validate-capture-safety-policy --json
npx power-ai-skills prepare-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills submit-auto-capture --tool codex --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --consume-now --json
npx power-ai-skills doctor --json
npx power-ai-skills generate-governance-summary --json
pnpm check:release-gates -- --require-consumer-matrix
```

- 当前 capture safety 风险已经统一映射到三层治理语义：
  - `warning`: 允许采集，但属于低信号证据；会在治理链路中保留 `captureSafetyGovernanceLevel=warning`
  - `review`: 允许进入待确认边界，但必须经过显式人工确认；会保留 `captureAdmissionLevel=review`
  - `blocking`: 禁止进入采集链路；记录不会落入 conversations
- 典型命中来源包括：
  - `warning`: `low-signal-capture`
  - `review`: `review-scene-type`、`review-intent-keyword`、`review-generated-file-pattern`
  - `blocking`: `scene-not-in-allowed-list`、`blocked-scene-type`、`blocked-intent-keyword`、`blocked-generated-file-pattern`
- `prepare-session-capture` 与 `submit-auto-capture` 现在遵守同一套 review boundary：
  - 手工确认流通过 `prepare-session-capture -> confirm-session-capture`
  - 自动采集流在命中 review 级别时不会直接自动消费，而是返回 `review_required`
- 这意味着 review 场景下，manual capture 与 auto-capture 都不会绕过显式确认边界，只是入口不同。

## 1.4.7 Capture safety governance troubleshooting

```bash
npx power-ai-skills check-auto-capture-runtime --json
npx power-ai-skills show-project-governance-context --json
npx power-ai-skills generate-upgrade-summary --json
```

- 当项目里已经存在 conversations 时，治理链路会把 capture safety 风险继续投影到多个汇总面：
  - `doctor` 会提示 warning-level 与 review-level conversation records
  - `generate-governance-summary` 会汇总 warning / review / blocking 相关计数
  - `generate-upgrade-summary` 会把这些计数连同 auto-capture backlog 一起纳入升级建议
  - `release-gates` 会把它们映射到非 blocking 的治理 gate，提醒先完成确认或复核
- 如果你需要确认“为什么某条记录没有自动落盘”，优先按下面顺序排查：
  1. `prepare-session-capture --json` 或 `submit-auto-capture --json`，确认是 `captured`、`review_required` 还是 `skip_*`
  2. `show-capture-safety-policy --json`，确认当前项目实际生效的 review / blocking 规则
  3. `check-auto-capture-runtime --json`，确认是不是卡在 backlog、failed queue 或 bridge contract
  4. `show-project-governance-context --json`，确认治理上下文里是否已经累积 warning-level / review-level records
- 如果是 review 级别记录：
  - `prepare-session-capture` 会返回待确认请求，再用 `confirm-session-capture --request <id>` 显式落盘
  - `submit-auto-capture --consume-now` 不会绕过 review boundary，而是保留 `review_required` 结果，等待人工处理
- 如果是 blocking 级别记录：
  - 记录不会进入 conversations，也不会进入 auto-capture 正常落盘链路
  - 应先调整 `.power-ai/capture-safety-policy.json` 或团队基线，再重新执行采集

## 1.4.7 Release governance linkage

- capture safety 的治理状态已经接入以下发布与治理检查：
  - `doctor`
    - `PAI-CONVERSATION-035`: warning-level conversation captures are acknowledged
    - `PAI-CONVERSATION-036`: review-level conversation captures are triaged
  - `generate-governance-summary`
    - 汇总 `warningLevelConversationRecords`、`reviewLevelConversationRecords`、`blockingLevelConversationRecords`
  - `pnpm check:release-gates`
    - `conversation-capture-warning-governance`
    - `conversation-capture-admission-governance`
- 当前这些 gate 默认是 warning 语义，而不是直接 blocking release：
  - `warning-level` 重点提醒“低信号证据不要直接当成稳定演进依据”
  - `review-level` 重点提醒“需要先 triage，再进入 project-local / evolution / release 决策”
- 这样做的目标是先把治理表达和确认边界统一，再为后续更严格的 blocking 或审批流升级保留接口，而不是在当前版本一次性把所有 capture risk 都升级成发版阻断。
