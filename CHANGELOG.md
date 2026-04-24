﻿﻿﻿# Changelog

## 1.4.7

- 完成 `1.4.7 / P4-1` 到 `P4-8` 的自进化第一阶段，新增 evolution cycle、evolution policy、candidates、actions、proposals、proposal review/apply 与 proposal aging 治理提醒。
- `doctor`、`generate-governance-summary`、`show-project-governance-context`、consumer compatibility matrix、release gates、upgrade advice 与 governance operations report 现在都会统一消费 evolution proposal backlog 和 SLA aging 信息，新增 `PAI-POLICY-011`。
- 补齐了 P4 端到端和治理回归测试，当前全量自动化覆盖自进化调度、proposal apply、aging reminder、governance summary 与 release gate 联动。
- 同时将 `@vue/compiler-dom` 与 `@vue/compiler-sfc` 固定到 `3.5.32`，避免消费项目在镜像同步不一致时被解析到 `3.5.33` 后出现 `@vue/compiler-core` 缺失错误。

## 1.4.6

- 完成 `1.4.6 / P3-1` 到 `P3-5` 的治理运营增强，新增 review deadline 检查、治理汇总报表、批量审阅能力、治理历史查询与发布侧 governance operations report。
- `doctor`、`check-project-baseline`、`upgrade-advice`、`release-gates`、`version-record` 与 notification payload 现在会继续消费治理运营摘要，能够识别 overdue review、批量审阅结果与发布侧治理 backlog。
- release consistency 新增 `--require-governance-operations`，`release:prepare` 现在会刷新并校验 governance operations artifact，保证运营摘要进入正式发布闭环。
- 当前 `1.4.6` 全量测试链路已覆盖上述治理运营增强项，并保持消费项目验证与发布一致性检查兼容。

## 1.4.5

- 完成 `P2-6` 到 `P2-10` 的治理闭环，新增项目画像决策流、会话洞察决策账本、promotion trace、治理上下文快照，并把治理数据真正接入发布链路。
- `doctor`、`check-project-baseline`、`upgrade-advice`、`release-gates`、`version-record` 与 notification payload 现在会统一消费治理摘要，能够区分 blocking risk、governance warning 与已人工决策的 `deferred` / `rejected` 状态。
- release governance 继续补强到差异化升级建议、治理 warning gate、consumer 兼容矩阵治理维度和 package-maintenance 检查，`release:prepare` 也会刷新最新 governance summary。
- 当前 `1.4.5` 全量测试链路已覆盖上述治理增强项，并保持消费项目验证与发布一致性检查兼容。

## 1.4.4

- 完成 `1.4.4` 路线图的治理收口，新增 `generate-upgrade-summary`、`check-project-baseline`、`generate-wrapper-registry-governance`、`generate-conversation-miner-strategy` 等治理命令。
- `project-scan` 侧补齐人工反馈闭环与 project-local 增量同步，`conversation-miner` 侧补齐 pattern governance、项目策略模板和 wrapper registry 团队治理视图。
- wrapper promotion 生命周期继续补强到 dry-run 预览、统一 audit、团队级治理视图，消费项目与仓库维护侧都可以输出更稳定的 markdown/json 报告。
- 当前 `1.4.4` 全量测试链路已覆盖上述治理增强项，并保持发布校验与消费项目验证链兼容。

## 1.4.3

- `generate-wrapper-promotion-audit` 新增 `--fields`、`--format`、`--output`，支持导出聚焦后的轻量 audit 结果。
- export 当前支持 `json`、`md`、`csv`，并会返回 `exportPath`、`exportFields`、`exportCount` 供外部流水线消费。
- wrapper promotion audit 从“可排序”继续推进到“可导出”，筛选队列可以直接接给后续人工或自动流程。

## 1.4.2

- `generate-wrapper-promotion-audit` 新增 `--sort`，支持 `tool-name`、`last-event-desc`、`last-event-asc` 三种排序视图。
- audit 的 JSON 和 Markdown 现在会记录 `sort`，便于区分同一筛选条件下的不同排序结果。
- wrapper promotion audit 从"可筛选"进一步推进到"可排序"，待办队列更适合直接人工处理。

## 1.4.1

- `generate-wrapper-promotion-audit` 新增 `--filter`，支持 `active`、`archived`、`ready-for-registration`、`pending-follow-ups` 四种筛选视图。
- audit 的 JSON 和 Markdown 现在会记录 `filter`，便于区分全量报表和聚焦视图。
- 批量审计从"全量总览"进一步推进到"可直接筛选待办队列"。

## 1.4.0

- 新增 `generate-wrapper-promotion-audit`，会汇总活动区和 archive 区 proposal，生成 `reports/wrapper-promotion-audit.md` 与 `reports/wrapper-promotion-audit.json`。
- audit 报表会输出总量、活动量、归档量、`ready for registration` 数量、挂起 follow-up 数量等摘要，并附带每个 proposal 的 timeline 摘要。
- wrapper promotion 线从单条 timeline 查询扩展为正式 audit 产物，便于做批量审计和版本收尾检查。

## 1.3.9

- 新增 `show-wrapper-promotion-timeline`，可直接输出某个 proposal 的完整状态轨迹，自动兼容活动区和 archive 区。
- timeline 会统一聚合 `scaffolded / reviewed / materialized / applied / finalized / registered / archived / restored` 等关键事件，便于审计和排查。
- proposal 新增 timeline 相关展示字段，README 里也会同步展示恢复信息，避免状态只散落在多个时间字段中。

## 1.3.8

- 新增 `restore-wrapper-promotion`，可将 `.power-ai/proposals/wrapper-promotions-archive/` 中的已归档 proposal 恢复回活动 proposal 目录。
- proposal 新增 `restoredAt` 与 `restorationNote`，恢复时会在活动目录中生成 `restore-record.json`，保留归档恢复审计轨迹。
- 恢复后的 proposal 会重新出现在默认 `list-wrapper-promotions` 结果中，可继续进行修订、再次 finalize/register/archive。

## 1.3.7

- 新增 `archive-wrapper-promotion`，只允许对已 `registered` 的 proposal 执行归档，将活动 proposal 移动到 `.power-ai/proposals/wrapper-promotions-archive/`。
- proposal 新增 `archiveStatus`、`archivedAt`、`archiveNote`，并会在归档目录下生成 `archive-record.json` 作为审计记录。
- `list-wrapper-promotions` 默认只返回活动 proposal，显式带 `--archived` 时会一并返回归档 proposal；`doctor` 也不会再扫描归档目录中的条目。

## 1.3.6

- 新增 `register-wrapper-promotion`，只允许对已 `finalized` 的 proposal 执行正式注册确认，并写入 `registrationStatus`、`registeredAt`、`registrationNote`。
- proposal 目录会新增 `registration-record.json`，用于保留正式注册时的审计结果和最终登记时间。
- `doctor` 现在会对已 `finalized` 但未注册的 proposal 给出 "ready for registration" 提示；对已 `registered` 的 proposal 不再提示 wrapper promotion warning。

## 1.3.5

- 新增 `finalize-wrapper-promotion`，用于在 proposal 已完成 accept/materialize/apply 且测试与文档样板都生成后，将状态正式收口到 `finalized`。
- proposal 新增 `finalizedAt` 与 `finalizationNote`，`pendingFollowUps` 会在 finalize 后清空，形成 wrapper promotion 的真正闭环。
- `doctor` 现在会跳过已 `finalized` 的 wrapper proposal，不再继续提示 follow-up warning。

## 1.3.4

- `apply-wrapper-promotion` 现在会在 proposal 目录下自动生成 `documentation-scaffolds/README.snippet.md`、`tool-adapters.snippet.md` 和 `command-manual.snippet.md`。
- proposal 新增 `docsGeneratedAt` 与 `docScaffoldFiles`，`followUpStatus` 进一步推进到 `docs-generated`，让"测试样板 + 文档样板"都进入可审阅状态。
- `doctor` 的 wrapper promotion warning 现在会带上当前 `followUpStatus`，方便区分是测试收尾还是文档收尾阶段。

## 1.3.3

- `apply-wrapper-promotion` 不再只追加 `test.todo`，而是按 `gui / terminal` 生成可运行的 wrapper 测试样板。
- proposal 的 `followUpStatus` 现在会推进到 `tests-generated`，并把后续收尾重点调整为运行样板测试、修正 fixture 细节和补文档。
- 更新 `1.3.3` 技术方案与命令文档，明确 wrapper proposal 在 apply 之后已经进入"可跑测试样板"阶段。

## 1.3.2

- `apply-wrapper-promotion` 现在会一并为 `tests/conversation-miner.test.mjs` 和 `tests/selection.test.mjs` 追加最小 `test.todo` 占位，并在 proposal 目录下生成 `post-apply-checklist.md`。
- proposal 新增 `followUpStatus`、`testsScaffoldedAt`、`testScaffoldFiles`、`postApplyChecklistPath` 和 `pendingFollowUps`，把"核心代码已落地但仍待补齐"的状态显式记录下来。
- `doctor` 现在会对"已 applied 但仍有 pending follow-ups"的 wrapper promotion 给出 warning，避免误判为已完全接入。

## 1.3.1

- 新增 `apply-wrapper-promotion`，可将 `accepted + materialized` 的 wrapper proposal 直接落到仓库源码注册层。
- `wrapper-promotion.json` 现在会记录 `applicationStatus`、`appliedAt` 和 `appliedFiles`，并同步刷新 proposal README。
- 补充 wrapper promotion apply 的正向/拒绝测试与 cwd 解析覆盖，让 proposal 流程从 scaffold -> review -> materialize 继续延伸到真正的源码应用。

## 1.3.0

- 新增 `materialize-wrapper-promotion`，可将 `accepted` 的 wrapper proposal 继续生成真正的 registration bundle 和 patch 文档。
- 在 proposal 中新增 `materializationStatus` 与 `materializedAt`，并把这些信息同步回 proposal README。
- 补充 accepted proposal materialize 与 draft proposal 拒绝的测试，让 wrapper promotion 流程从 scaffold -> review 进一步延伸到 registration artifact 生成。

## 1.2.9

- 在 `scaffold-wrapper-promotion` 基础上新增 `review-wrapper-promotion` 和 `list-wrapper-promotions`，补齐 proposal 的 review / acceptance 状态流。
- `wrapper-promotion.json` 现在会保存 `status`、`reviewedAt`、`reviewNote` 和 `reviewHistory`，并同步刷新 proposal README。
- 补充 review 状态流测试和 cwd 解析覆盖，让 wrapper proposal 从生成到接受不再只是一次性脚手架。

## 1.2.8

- 新增 `scaffold-wrapper-promotion`，用于把未注册工具从 `custom-tool` 接入状态脚手架化为正式 wrapper 候选 proposal。
- 自动生成 `.power-ai/proposals/wrapper-promotions/<tool>/wrapper-promotion.json` 和 `README.md`，给出 target files、推荐命令和校验清单。
- 补充 proposal 生成与已注册工具拒绝的测试，并把该命令纳入 cwd 解析覆盖。

## 1.2.7

- 将 `custom-tool-capture.example.ps1` 正式定义为未注册工具的双模式接入样板，同时覆盖 terminal-first 和 host-first 两种路径。
- 补充 2 条 custom tool 端到端测试，分别验证 `-ResponseText -Auto` 与 `-ResponseText -QueueResponse -ConsumeNow`。
- 在文档中新增未注册工具的推荐接入方式，降低新 AI 工具进入 wrapper 矩阵前的接入门槛。

## 1.2.6

- 终端类工具的 `<tool>-capture.example.ps1` 现在支持 `-ResponseText` 和 `-UseClipboard`，可以直接走 `-Auto` 完成确认后的自动收集。
- 明确收口 `Codex / Claude Code / Gemini CLI / Aider` 的 terminal-first 路径，不再把它们默认视为 GUI host bridge 接入对象。
- 补充 4 条终端直连 auto-capture 端到端测试，并在文档中区分 terminal direct auto-capture 与 GUI host bridge。

## 1.2.5

- 新增 `windsurf-host-bridge.example.ps1`、`cline-host-bridge.example.ps1` 和 `github-copilot-host-bridge.example.ps1`，把剩余 GUI/IDE 类工具接入同一套宿主自动触发样板。
- `init` / `sync` 现在会统一生成 5 个 GUI 宿主桥接脚本，宿主只需要交付"用户确认后的最终回复文本"，无需直接理解 capture runtime 细节。
- 补充 3 条端到端宿主桥接测试，并把这 3 个脚本全部纳入 `doctor` conversation 资产检查。

## 1.2.4

- 新增 `cursor-host-bridge.example.ps1`，把 `Cursor` 也接入 GUI 宿主自动触发样板，支持 `-ResponsePath`、`-ResponseText` 和 `-UseClipboard` 三种输入。
- 将 GUI 宿主桥接脚本抽象成通用生成器，后续扩展 `Windsurf / Cline / GitHub Copilot` 时不再需要重复维护脚本主体。
- 补充 Cursor host bridge 的端到端测试，并将该脚本纳入 `doctor` conversation 资产检查。

## 1.2.3

- 新增 `trae-host-bridge.example.ps1`，提供第一个真正面向 GUI 宿主的自动触发样板，宿主只需交付"确认后的最终回复文本"即可完成桥接和自动落盘。
- 生成的 PowerShell capture 示例脚本现在会优先调用项目本地 `node_modules/.bin/power-ai-skills.cmd`，找不到时才回退到 `npx power-ai-skills`，提升了开发态和链接态的可用性。
- 补充 Trae host bridge 的端到端测试，并把该脚本纳入 `doctor` conversation 资产检查。

## 1.2.2

- 各 `<tool>-capture.example.ps1` 与 `custom-tool-capture.example.ps1` 现在新增 `-QueueResponse` 模式，可把"已确认收集"的原始 AI 回复直接桥接到 response inbox。
- `queue-auto-capture-response` 新增 `--consume-now`，宿主集成可以用一条命令完成 `response-inbox -> auto-capture runtime -> conversations` 闭环。
- 文档和脚手架已统一更新为"直接 submit"、"response inbox bridge"、"单命令 QueueResponse bridge"三种接法，便于 GUI 工具和 CLI 工具按能力选择。

## 1.2.1

- 新增 response inbox bridge，补齐 `queue-auto-capture-response` 与 `consume-auto-capture-response-inbox`，让不能直接执行 CLI 的工具也能通过"写入确认后的 AI 回复文件"接入自动收集链路。
- `watch-auto-capture-inbox --once` 现在会先消费 `.power-ai/auto-capture/response-inbox/`，再消费 capture inbox，实现 raw response -> marked block extraction -> gated submit -> conversations 的一跳闭环。
- `.power-ai/auto-capture/response-inbox`、`.power-ai/auto-capture/response-processed`、`.power-ai/auto-capture/response-failed` 目录现在也会自动生成，`doctor` 会一起检查这些桥接资产。

## 1.2.0

- 新增 auto-capture runtime，补齐 `submit-auto-capture`、`consume-auto-capture-inbox`、`watch-auto-capture-inbox` 三个命令，把"已确认的 marked block"提交、排队、消费并自动写入 `.power-ai/conversations/`。
- `.power-ai/auto-capture/inbox`、`.power-ai/auto-capture/processed`、`.power-ai/auto-capture/failed` 目录现在会随 `init` / `sync` 自动生成，支持后续外层工具适配脚本或后台 watcher 直接复用同一套收集底座。
- 所有 conversation capture 示例脚本新增 `-Auto` 模式，确认后的 AI 回复可以直接走 `submit-auto-capture --consume-now`，不再要求用户手动执行第二条收集命令。
- `doctor` 新增 auto-capture runtime 资产检查，覆盖 runtime example script 与 inbox/processed/failed 目录，补充 `1.2.0` 的会话自动收集链路自检。

## 1.1.9

- 扩展 confirmed capture wrapper 矩阵，正式支持 `codex`、`trae`、`cursor`、`claude-code`、`windsurf`、`gemini-cli`、`github-copilot`、`cline`、`aider`。
- 统一 wrapper 注册表和 `tool-capture-session --tool <name>` 现在覆盖全部 9 个工具，未注册工具的报错提示也会同步反映完整支持列表。
- conversation capture 脚手架新增 `.power-ai/adapters/windsurf-capture.example.ps1`、`.power-ai/adapters/gemini-cli-capture.example.ps1`、`.power-ai/adapters/github-copilot-capture.example.ps1`、`.power-ai/adapters/cline-capture.example.ps1`、`.power-ai/adapters/aider-capture.example.ps1`，`doctor` 也会检查这些示例是否存在。
- 更新 README、`tool-adapters.md`、命令手册和 `1.1.9` 设计文档，并补充 wrapper matrix 的端到端测试。

## 1.1.8

- `init`、`sync`、`add-tool`、`remove-tool` 现在会自动补齐 conversation capture 脚手架，包括共享 guidance、contract 文档和 `adapters/*.example.ps1` 示例脚本。
- 入口模板新增统一的 conversation capture 规则占位符，要求 AI 只在"任务完成且值得沉淀"时询问用户是否收集，并在确认后只输出 `<<<POWER_AI_SESSION_SUMMARY_V1 ... >>>` 标记块。
- `doctor` 新增 conversation capture 检查组，覆盖 config、guidance、contract、adapter 示例和 conversation 目录完整性。
- 更新 README、`tool-adapters.md`、命令手册和 `1.1.8` 设计文档，并补充 rendering、doctor、conversation-miner 端到端测试。

## 1.1.7

- 新增统一 wrapper 入口 `tool-capture-session --tool <name>`，让外部适配层不再需要自己维护 `codex`、`cursor`、`claude-code` 的命令名映射。
- 新增共享 wrapper 注册表，并让命令层与适配文档共同复用这份定义。
- `tool-capture-session` 当前支持 `codex`、`cursor`、`claude-code`，对未注册工具会明确报错。
- 更新 `tool-adapters.md`、README、命令手册和 `1.1.7` 设计文档，并补充统一入口的端到端测试。

## 1.1.6

- 在 `1.1.5` 的共享 wrapper 执行逻辑基础上新增 `claude-code-capture-session`，让 Claude Code 也能接入同一套确认式自动收集链路。
- `claude-code-capture-session` 同样支持 `--yes`、`--reject`、`--json` 以及 `--from-file/--stdin/--extract-marked-block`。
- 继续保持 wrapper 层复用 `prepare-session-capture`、`confirm-session-capture` 与 pending capture 机制，不在 `conversation-miner` 核心再堆工具特化逻辑。
- 补充 Claude Code wrapper 的端到端测试，并更新 README、命令手册和 `1.1.6` 设计文档。

## 1.1.5

- 在 `1.1.4` 的 Codex wrapper 基础上继续新增 `cursor-capture-session`，让 Cursor 也能复用同一套确认式自动收集链路。
- 抽取共享 wrapper 执行逻辑，避免 `codex`、`cursor` 后续继续复制 `prepare -> confirm/reject` 流程。
- `cursor-capture-session` 同样支持 `--yes`、`--reject`、`--json` 以及 `--from-file/--stdin/--extract-marked-block`。
- 补充 Cursor wrapper 的端到端测试，并更新 README、命令手册和 `1.1.5` 设计文档。

## 1.1.4

- 新增 `codex-capture-session` wrapper 命令，把 `prepare-session-capture -> 用户确认 -> confirm-session-capture` 收敛成一次调用。
- `codex-capture-session` 支持 `--yes`、`--reject`、`--json` 以及 `--from-file/--stdin/--extract-marked-block`，适合先用在 Codex 的自动收集适配层。
- 在交互式终端下，`codex-capture-session` 会直接提示用户确认；非交互场景则要求显式传入 `--yes` 或 `--reject`。
- 补充 `codex` wrapper 的端到端测试，并更新 README、命令手册和 `1.1.4` 设计文档。

## 1.1.3

- `conversation-miner` 新增 `prepare-session-capture` 与 `confirm-session-capture` 两段式确认流，供后续 Codex / Cursor / Claude Code wrapper 在提示用户确认后自动完成收集。
- 新增 `.power-ai/pending-captures/` 待确认目录，`prepare-session-capture` 会为 `ask_capture` 结果生成待确认请求，`confirm-session-capture --reject` 则会直接丢弃请求。
- `confirm-session-capture` 在确认后会直接把待收集记录写入 conversations，不再要求 wrapper 重新拼接原始摘要输入。
- 补充 wrapper 风格的确认/拒绝端到端测试，并更新 README、命令手册和 `1.1.3` 设计文档。

## 1.1.2

- `conversation-miner` 新增标准摘要块协议，支持从 AI 回复文本中提取 `<<<POWER_AI_SESSION_SUMMARY_V1 ... >>>` 结构化摘要。
- `evaluate-session-capture` 和 `capture-session` 现在支持 `--from-file`、`--stdin`、`--extract-marked-block` 与 `--save-extracted`，不再要求先手动整理独立 JSON 文件。
- `capture-session` 新增 `--json` 输出，便于后续 Codex / Cursor / Claude Code wrapper 或其它工具适配层直接消费。
- 补充 AI 回复文本提取与标准输入收集的端到端测试，并更新 README、命令手册和 `1.1.2` 技术方案文档。

## 1.1.1

- `conversation-miner` 新增 `evaluate-session-capture` 门禁命令，用于在提示用户是否收集前，先判断本次摘要是否值得沉淀。
- `capture-session` 默认会执行高价值过滤，自动跳过与项目无关、未完成、重复以及已被现有 project-local skill 覆盖的摘要；如需强制落盘可使用 `--force`。
- 新增 `.power-ai/conversation-miner-config.json` 默认配置和 `.power-ai/reports/session-capture-evaluation.md` 评估报告，便于后续工具适配层消费同一套决策结果。
- 补充重复判定、已覆盖判定和高价值候选项测试，确保 `1.1.1` 的自动确认收集链路有稳定的前置门禁。

## 1.1.0

- 新增 `conversation-miner` 首版链路，支持 `capture-session`、`analyze-patterns` 和 `generate-project-skill` 三个命令，把结构化会话摘要沉淀为项目模式和 project-local skill 草案。
- 新增 `.power-ai/conversations/*.json`、`.power-ai/patterns/project-patterns.json`、`.power-ai/reports/conversation-patterns-summary.md`，并预留 `.power-ai/proposals/` 与 `.power-ai/notifications/` 目录作为后续企业级扩展入口。
- `capture-session` 会对输入摘要做字段校验、基础脱敏和生成文件路径归一化，避免直接把原始对话或敏感信息落盘。
- `analyze-patterns` 会按 `sceneType` 聚合会话记录，输出频次、通用 skills、对象、操作、自定义点和生成建议；`generate-project-skill` 会基于模式结果生成 `*-conversation-project` 草案，避免与 `project-scan` 产物互相覆盖。
- 补充 `conversation-miner-skill-design-1.1.0.md` 对应实现、CLI 端到端测试、README 和命令手册更新。

## 1.0.8

- `project-scan` 新增 `.power-ai/analysis/component-propagation.json` 与 `.power-ai/reports/component-propagation-summary.md`，把页面到 fragment 的多跳传播结果显式落盘，便于审计和回归。
- 在组件图基础上增加多跳可达性计算，页面现在不仅会继承直接引用 fragment 的信号，也会继承 `page -> fragment -> dialog-fragment` 这类跨文件链路上的 dialog / form / submit 信号。
- `patterns.json`、`project-profile.json` 和匹配样本中补充 transitive 相关字段，帮助判断一个项目模式是由直接组件关系还是多跳传播支脉衍生出来的。
- 补充 `1.0.8` 技术方案文档与回归测试，覆盖多跳 dialog-form 识别、传播产物生成和 `init` 默认链路兼容性。

## 1.0.7

- `project-scan` 新增组件引用图分析，扫描会额外生成 `.power-ai/analysis/component-graph.json` 与 `.power-ai/reports/component-graph-summary.md`。
- 在 `vue-analysis.mjs` 中补充本地相对 `.vue` 导入与模板自定义标签的 AST 识别，为页面到 fragment 的组件边建立结构化基础。
- 页面现在会把已引用的 `page-fragment` / `dialog-fragment` 信号回灌到自身识别中，`dialog-form` 场景可识别"页面壳 + 引用弹窗组件"的跨文件实现。
- `patterns.json` 新增 `relatedComponents` 与 `supportingFragments`，`project-profile.json` 新增 `componentGraphSummary`，让扫描结果不再只停留在单文件命中。
- 补充 1.0.7 设计文档与回归测试，覆盖组件图工件生成和"页面引用 dialog fragment"识别链路。

## 1.0.6

- `project-scan` 的 Vue 文件分析底层从文本匹配升级为 AST 解析，新增 `src/project-scan/vue-analysis.mjs` 负责 `SFC + template AST + script AST` 信号提取。
- 新增运行时依赖 `@vue/compiler-sfc`、`@vue/compiler-dom` 和 `@babel/parser`，用于稳定解析 `.vue` 文件中 `script/script setup`。
- 页面容器、页面级 `PcTree`、dialog 内部 `PcTree`、`el-form`、`el-descriptions`、`el-tabs` 等模板信号改用 template AST 识别，不再依赖整段正则。
- `searchForm`、`handleSubmit`、`getList`、`fetchDetail` 等脚本信号改用 script AST 遍历收集 `Identifier / MemberExpression / StringLiteral` 后判断，减少文本误判。
- 补充 `1.0.6` 技术设计文档，并保持 `1.0.5` 的 diff/history/manual 晋升链路与现有测试全部兼容。

## 1.0.5

- `project-scan` 新增子模式、交互特征、数据流特征和质量分，`patterns.json` 现在会输出 `dominantSubpattern`、`subpatterns`、`structuralScore`、`purityScore`、`reuseScore` 等结构化字段。
- 每次执行 `scan-project` 都会落盘 `.power-ai/analysis/pattern-diff.json`、`.power-ai/analysis/pattern-history.json` 和 `.power-ai/reports/project-scan-diff.md`，用于跟踪模式演进与回归变化。
- 新增 `diff-project-scan`、`list-project-local-skills`、`promote-project-local-skill` 三个命令，补齐从自动草案到人工维护规则的接管链路。
- `project-local` 新增 `manual/` 目录，`promote-project-local-skill` 会把指定草案从 `auto-generated` 晋升到 `manual`，并把元数据标记为人工维护版本。
- 补充 1.0.5 设计文档、回归测试和 README/命令手册更新，确保新链路与既有初始化、同步和验收流程兼容。

## 1.0.4

- 重构 `project-scan`，新增 `page / page-candidate / page-fragment / dialog-fragment` 文件角色识别，避免 `src/views/**/components/**` 直接污染页面模式统计。
- 把模式识别升级为结构化打分与排除规则，收敛 `detail-page` 误判链路，并为 `basic-list-page`、`tree-list-page`、`dialog-form` 增加更稳定的页面骨架判断。
- 新增 `.power-ai/analysis/pattern-review.json` 与 `.power-ai/reports/project-scan-summary.md`，把模式自动生成、人工复核、直接跳过三类决策显式落盘。
- `generate-project-local-skills` 现在只为高置信且达到频次门限的模式生成草案，低频或混合 fragment 的模式保留在 review 结果中，不再直接写入 `auto-generated`。
- 补充 1.0.4 技术方案文档与回归测试，并用真实消费项目验证新的项目扫描链路。

## 1.0.3

- 新增 `scan-project` 与 `generate-project-local-skills`，在消费项目中输出 `.power-ai/analysis/project-profile.json`、`.power-ai/analysis/patterns.json` 和 `project-local/auto-generated` 草案。
- `init` 默认串联冷启动项目扫描，支持 `--no-project-scan`、`--project-scan-only`、`--regenerate-project-local`，让 `project-local` 初始化后不再为空目录。
- 补齐 1.0.3 对应的自动化回归测试与命令文档，确保新链路与既有 `doctor`、`verify-consumer`、单一真源同步流程兼容。

## 1.0.2

- 收拢 `skills/` 目录，删除首批冗余 skill，包括组件研发类、组件治理类和测试生成类能力，保留业务页面开发主链路。
- 同步清理 `entry-skill` 依赖、`impact-check.mjs`、兼容性与发布链路中的悬挂引用，并重建 `skills-manifest.json`。
- 保持 `ci:check`、`doctor`、`verify-consumer` 校验链可用，确保精简后的发布包仍可在消费项目正常初始化与同步。

## 1.0.1

- 修复 npm 发布清单遗漏 `src/` 的问题，避免消费项目安装后执行 `power-ai-skills init` 时出现 `ERR_MODULE_NOT_FOUND`。
- 强化 `check-package.mjs`，发布前强制校验 `files` 中必须包含 `src`，防止再次发布出"bin 可执行但运行时依赖未随包发布"的版本。

## 1.0.0

- 新增第一版可发布的企业组件知识层，落地于 `skills/foundation/power-component-library/references/generated/`，包含 `component-registry.json`、组件 guide 和首批 `tree-user-crud` 页面配方。
- 新增 `check-component-knowledge.mjs` 并并入 `ci:check`，在发布前校验组件别名、页面配方和 guide 链接是否有效。
- 强化 1.0.0 的执行方向：命中企业组件场景时，先读取组件注册表和页面配方，再开始编码。
- 明确中文为主语言，并补充"生成代码默认添加中文注释"的执行约束。
- 版本正式提升到 `1.0.0`，作为企业组件知识驱动工作流的首个稳定版本。

## 0.9.0-alpha.1

- 完成 `bin/power-ai-skills.mjs` 第一阶段拆分，CLI 入口收拢为薄启动层，核心逻辑迁移到 `src/context`、`src/selection`、`src/rendering`、`src/workspace`、`src/commands`、`src/doctor`。
- 引入显式 `config/template-registry.json`，模板 ownerTool、输出路径和占位符不再依赖 `entrypoint.source` 反推，`.power-ai/template-registry.json` 也会同步落到消费项目。
- 补齐最小自动化回归：`selection` / `rendering` 单测、`doctor` 集成测试、`verify-consumer` 内置 fixture smoke，并把消费侧 smoke 串进 `release:prepare`。
- 把 `docs/tool-adapters.md` 和 `README.md` 改为脚本生成，文档检验现在会检查生成结果是否过期，减少配置与文档漂移。
- 新增 `config/schemas/*.schema.json`，并为 `tool-registry.json`、`team-defaults.json`、`template-registry.json` 挂载 `$schema`，让配置治理同时覆盖编辑器提示和 CI 校验。

## 0.8.2

- 把各 AI 工具的"读取优先级"和"执行流程补充说明"抽到 `config/tool-registry.json`，统一由配置驱动。
- `init` / `sync` 生成规则文件时，自动把 `instructionRendering.sharedExecutionFlow` 和 `tools[].instructionLoading` 渲染到 `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、`CONVENTIONS.md` 及各编辑器适配文件。
- 新增工具配置治理校验，要求每个工具显式声明 `instructionLoading`，避免新增工具后模板规则缺失。
- 更新工具适配文档，说明读取优先级已改为配置驱动，不再手工维护模板内的同类文案。

## 0.8.1

- 补充各 AI 工具的读取优先级约定，按工具原生入口文件、`AGENTS.md` 共享规则、`project-local` 覆盖层和企业公共 skill 的顺序组织执行流程。
- 强化项目模板中的执行流程说明，要求先走 `entry-skill` 路由，再按命中的主 skill 和辅助 skill 实现。
- 增强树列表场景识别，补充 `左侧部门右侧用户`、`点击部门显示用户` 等表述，并明确优先使用 `CommonLayoutContainer + pc-table-warp`。
- 更新工具适配文档，统一说明 Codex、Cursor、Claude Code、Gemini CLI、Aider、Trae 等工具的读取入口和优先级。

## 0.8.0

- `init` 在交互终端下支持直接展示可选 AI 工具，并在控制台内完成选择与确认。
- `init`、`add-tool`、`remove-tool` 支持位置参数简写，推荐使用 `npx power-ai-skills init codex trae cursor`。
- 额外兼容 `"codex|trae|cursor"`、`codex,cursor` 这类分隔写法，减少重复输入 `--tool`。
- 补充 `--project` 的推荐用法，避免项目路径与工具选择位置参数产生歧义。

## 0.7.1

- 清理 CLI 中残留的异常文本，补齐 `profile/preset/tool` 等核心报错和说明文案。
- 新增 `clean-reports` 命令，以及 `pnpm reports:clean` 脚本，用于清理 `.power-ai/reports`。
- `README.md`、单一真源目录说明和本地 overlay README 的输出文本改成稳定可读版本。

## 0.7.0

- `list-tools`、`show-defaults`、`doctor` 支持 `--output <file>`，可以直接把结果落盘到指定文件。
- `--output` 同时兼容 `json`、`summary`、`markdown` 三种输出格式。
- 统一新增命令输出落盘逻辑，便于后续继续扩展更多报告类命令。

## 0.6.4

- `list-tools`、`show-defaults`、`doctor` 新增 `--format markdown`，可以直接复制到 issue、群通知和发布说明里。
- `--format md` 作为 `--format markdown` 的简写。
- 保留 `json` 和 `summary` 两种已有输出，兼容原有脚本与人工排查流程。

## 0.6.3

- `list-tools`、`show-defaults`、`doctor` 新增 `--format summary` 输出模式，方便团队直接阅读。
- 保留 JSON 默认输出，避免影响现有自动化脚本和 CI 调用。
- `doctor` 的 summary 输出会直接展示检查结果、入口状态和 warning，不用再手动展开 JSON。

## 0.6.2

- 工具注册表补充 `status`、`tags`、`recommendedScenarios`，profile 也带统一元数据。
- 团队默认配置新增 `presetSelections`，支持 `init --preset`、`add-tool --preset`、`remove-tool --preset`。
- `show-defaults` 现在会展示 package 默认配置、项目覆盖配置和最终生效的 preset 结果。
- `doctor` 现在会输出每个工具入口是 `linked-directory`、`copied-directory`、`hard-link-file` 还是 `copied-file`，方便排查单一真源模式是否退化成复制模式。
- `selected-tools.json` 增加 `selectedPresets` 字段，便于项目后续审计和自动化分析。

## 0.6.1

- 把工具注册表提升为正式治理配置，新增 `config/tool-registry.json` 与 `config/team-defaults.json`。
- 新增 `check-tooling-config.mjs`，把工具、profile、依赖关系和团队默认配置纳入 `ci:check`。
- `init` 在新项目首次接入时支持自动走团队默认配置，新增 `show-defaults` / `defaults:show`。
- `doctor` 增加"未选工具入口已清理"检查，避免项目残留过期工具入口。
- 更新 README、命令手册、工具适配说明和发布文档。

## 0.6.0

- 重构消费项目接入模式，引入 `.power-ai/` 作为唯一真源目录。
- 新增工具注册表与工具选择配置，支持 `list-tools`、`init --tool`、`init --profile`、`add-tool`、`remove-tool`。
- 支持按工具生成 Codex、Trae、Cursor、Claude Code、Cline、Windsurf、Gemini CLI、Aider 适配入口。
- `sync` 与 `doctor` 增加旧目录结构迁移兼容，能够自动识别旧的 `.trae`、`.codex`、`.cursor` 项目。
- 新增 `docs/tool-adapters.md` 与 `docs/command-manual.md`，统一说明工具适配和命令用法。

## 0.5.0

- 新增 `collect-changed-files.mjs`，统一从 git diff 收集变更文件。
- 新增 `run-upgrade-automation.mjs`，串联变更收集、影响分析、任务生成和消费验证。
- 新增 `generate-upgrade-payload.mjs`，基于自动化报告生成通知载荷。
- 增加上游流水线接入说明与模板。

## 0.4.0

- 新增 `verify-consumer.mjs`，把消费项目的 `init / sync / doctor` 串成标准验证链路。
- 新增 `generate-impact-task.mjs`，可根据影响分析报告生成任务文档。
- 增加 CI 接入说明与模板。

## 0.3.0

- 重写 `impact-check.mjs`，输出结构化的影响分析结果。
- 新增 `docs/compatibility-matrix.md`。
- 完善组件库与基础框架升级联动说明。

## 0.2.0

- 强化 `entry-skill` 的自然语言入口识别。
- 新增 `aliases.md` 与 `comment-rules.md`。
- 增加项目 overlay 支持和旧包名检测。

## 0.1.0

- 新增治理文档与发布辅助脚本。
- 强化 `validate-skills.mjs`。
- 建立发布与治理基础流程。

## 0.0.4

- 包名统一为 `@power/power-ai-skills`。
- CLI 增加 `version` 与 `doctor`。
- `sync` 增强清理与稳定性处理。
