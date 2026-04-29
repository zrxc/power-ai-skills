# 升级路线图

本文用于沉淀 `@power/power-ai-skills` 当前能力边界、后续升级方向与现有测试方案。

当前路线图基于 `1.4.7` 版本代码现状制定，暂不包含 React / TSX 项目扫描扩展，后续如需扩展到非 Vue 技术栈，将单独开设专题方案。

## 当前对齐状态

这张表用于把最近讨论的 5 项统一映射到当前版本进度，方便后续持续对齐“哪些已经收口、哪些还在半程、哪些属于下一阶段”。

| 事项 | 当前状态 | 当前落点 | 已落地范围 | 后续对齐点 |
| --- | --- | --- | --- | --- |
| 自动采集闭环标准化 | 已收口 | `1.2.0` - `1.2.6` 主链路已打通 | 已完成 `submit-auto-capture`、`queue-auto-capture-response`、`consume-auto-capture-response-inbox`、`consume-auto-capture-inbox`、`watch-auto-capture-inbox`，并统一了 terminal direct、response inbox bridge、host bridge 三种标准接法，形成 `AI reply -> 提取 -> 门禁 -> conversations 落盘` 闭环。 | 后续以 runtime 健康检查、wrapper 适配维护和文档补强为主，不再作为单独主线继续扩张。 |
| 采集安全边界 | 半程 | 已有第一版边界治理，但还未完全平台化 | 已有 `.power-ai/capture-safety-policy.json`、`show-capture-safety-policy`、`validate-capture-safety-policy`、默认脱敏、scene / intent admission、retention、doctor 与 governance summary 联动。 | 继续补团队级统一策略、更细粒度敏感信息规则和更明确的 blocking / 审批联动；当前适合定义为“第一版已落地，尚未完全收口”。 |
| proposal apply 扩展 | 半程 | `1.4.7 / P4-7` 到 `P5-5` 已完成第四阶段 | 已支持 `apply-evolution-proposal`、批量 review / apply、proposal aging、governance summary / upgrade summary / doctor / release gates 联动、applied draft follow-up 可见性、统一 `list-evolution-drafts` / `show-evolution-draft` 入口，以及 shared-skill / release-impact draft 的 handoff metadata、README / checklist scaffold。 | 目前 applied draft 已能被直接查看、直接 handoff，但仍停留在人工收口边界；后续若继续推进 proposal apply 主线，应评估更完整的 finalize / archive /跨阶段治理闭环，而不是越过边界直接自动注册 wrapper 或自动发版。 |
| project-local 自动进化增强 | 半程 | `1.4.7 / P4-1` 到 `P4-4` 已完成骨架 | 已支持 `run-evolution-cycle`、`evolution-policy`、`generate-evolution-candidates`、`apply-evolution-actions`，并能在策略允许下自动刷新 `project-local` draft。 | 当前仍以 draft refresh 为边界，没有自动晋升到 `manual` / shared skill；后续重点是质量验证、治理策略细化和更稳的 promotion 边界。 |
| 运营趋势视图 | 当前阶段 | `P5-6` 将作为当前活动阶段启动第一版趋势视图 | 已有 `generate-governance-summary` 与 `manifest/governance-operations-report.*` 两类快照，可看 backlog、SLA 和治理摘要。 | 当前应补跨版本 / 跨周期趋势对比，把 backlog aging、proposal apply 节奏、capture intake 健康度、治理吞吐做成趋势视图，而不只看单次快照。 |

## 当前已支持的功能

### 1. 项目初始化与单一真实源管理

当前支持：

- `init` 初始化项目，创建 `.power-ai/` 单一真实源目录
- `sync` 同步公共 skills、shared、adapters、registry 与默认配置
- `add-tool` / `remove-tool` 动态增删工具接入
- `list-tools` / `show-defaults` 查看当前可用工具、preset、profile 与默认配置
- `clean-reports` 清理 `.power-ai/reports/`
- 通过 `selected-tools.json` 维护项目级实际启用工具集合
- 支持 preset、profile、显式 tool 选择三种初始化方式

核心价值：

- 把消费者项目里的 AI 配置统一收敛到 `.power-ai/`
- 降低多工具并存时的入口散落问题
- 为后续 doctor、升级、治理提供稳定检查对象

### 2. 项目扫描与 project-local skill 生成

当前支持：

- `scan-project`
- `diff-project-scan`
- `generate-project-local-skills`
- `list-project-local-skills`
- `promote-project-local-skill`

当前扫描能力包括：

- Vue SFC AST、template AST、script AST 分析
- 页面模式识别
- `pattern-review.json` 复核决策
- `pattern-history.json` 历史快照
- `pattern-diff.json` 扫描差异
- `component-graph.json` 组件引用图
- `component-propagation.json` 多跳传播结果
- 生成 `.power-ai/skills/project-local/auto-generated/` 草案
- 支持将草案晋升到 `project-local/manual/`

核心价值：

- 从“项目里已经存在的实现习惯”反推团队私有 skill
- 让 AI 输出更贴近当前项目真实做法
- 形成静态扫描驱动的项目知识沉淀

### 3. Conversation Miner 会话沉淀

当前支持：

- `evaluate-session-capture`
- `prepare-session-capture`
- `confirm-session-capture`
- `capture-session`
- `analyze-patterns`
- `generate-project-skill`
- `generate-conversation-miner-strategy`

当前能力包括：

- 从结构化 summary 或 marked block 提取记录
- 自动判定 `ask_capture` / `skip_irrelevant` / `skip_incomplete` / `skip_low_value` / `skip_duplicate` / `skip_already_covered`
- 会话按日期沉淀到 `.power-ai/conversations/YYYY-MM-DD.json`
- 从会话记录中聚合项目模式
- 生成 conversation-driven project skill 草案
- 输出会话评估报告与 conversation pattern 摘要
- 按项目类型生成 `conversation-miner-config.json` 策略模板

核心价值：

- 让“AI 辅助开发过程”变成可复用的项目知识资产
- 用真实对话行为补充静态扫描无法覆盖的项目习惯

### 4. Auto Capture 与工具 wrapper 接入

当前支持：

- `submit-auto-capture`
- `queue-auto-capture-response`
- `consume-auto-capture-response-inbox`
- `consume-auto-capture-inbox`
- `watch-auto-capture-inbox`
- `tool-capture-session`

当前内置 wrapper / adapter 覆盖：

- `codex`
- `trae`
- `cursor`
- `claude-code`
- `windsurf`
- `gemini-cli`
- `github-copilot`
- `cline`
- `aider`
- `custom-tool`

当前还支持：

- host bridge example script
- terminal capture example script
- `custom-tool-capture.example.ps1`
- `start-auto-capture-runtime.example.ps1`

核心价值：

- 降低不同 AI 工具接入成本
- 统一 capture 协议和行为
- 支撑 conversation-miner 自动化落地

### 5. Wrapper Promotion 生命周期

当前支持：

- `scaffold-wrapper-promotion`
- `review-wrapper-promotion`
- `materialize-wrapper-promotion`
- `apply-wrapper-promotion`
- `finalize-wrapper-promotion`
- `register-wrapper-promotion`
- `archive-wrapper-promotion`
- `restore-wrapper-promotion`
- `list-wrapper-promotions`
- `show-wrapper-promotion-timeline`
- `generate-wrapper-promotion-audit`
- `generate-wrapper-registry-governance`

当前能力包括：

- proposal 建模
- 状态流转
- 注册片段生成
- 文档 scaffold 生成
- 测试 scaffold 生成
- 审计、筛选、排序、导出
- 团队级 registry / proposal 治理视图
- 归档与恢复

核心价值：

- 把“临时接入工具”升级为“正式支持工具”时的过程制度化
- 降低新增 wrapper 时的人工改动和遗漏风险

### 6. Doctor 与发布治理

当前支持：

- `doctor`
- `release:prepare`
- `check:release-consistency`
- `verify:consumer`

当前检查维度包括：

- workspace
- selection
- entrypoints
- conversation scaffolding
- knowledge artifacts
- release governance

当前发布治理能力包括：

- `version-record.json`
- `release-notes-<version>.md`
- `impact-report.json`
- `upgrade-risk-report.json` / `upgrade-risk-report.md`
- `automation-report.json`
- `release-gate-report.json` / `release-gate-report.md`
- notification payload
- release artifact consistency 检查

核心价值：

- 为消费者项目和中心仓库分别提供健康度诊断
- 降低升级、发版和回归时的不可见风险

## 后续升级方向

后续升级遵循两个原则：

- 优先把现有能力做深做稳，不先扩技术栈
- 优先提升治理、可维护性和规模化接入能力

### 第一阶段：产品化现有能力

目标：

- 降低人工操作成本
- 减少误用和重复劳动
- 统一命令输出、报告和治理体验

建议新增：

- wrapper promotion dry-run 能力
  - 在真正写入源码前预览将变更哪些文件、插入哪些片段
- doctor 报告统一模板
  - 输出统一 markdown / json 契约
  - 便于 CI、人工审查、升级通知复用
- project-local 技能增量更新模式
  - 只更新变化草案，减少无效重写
- conversation pattern 合并与归档能力
  - 减少长期运行后 pattern 碎片化
- scan-project 误报反馈闭环
  - 让 pattern-review 不只是报告，还能反向影响后续扫描行为

建议优先级：P0

### 第二阶段：增强项目治理能力

目标：

- 提高多项目并行使用时的治理效率
- 让项目扫描、会话沉淀、发布治理形成闭环

建议新增：

- 扫描结果风险分级
  - 把 pattern 区分为高价值、待确认、低优先级
- wrapper registry 的团队级治理视图
  - 哪些 wrapper 已注册
  - 哪些 proposal 长期停留在中间态
  - 哪些 proposal 已可注册但未注册
- conversation-miner 的项目策略模板
  - 按项目类型生成默认 `conversation-miner-config.json`
- 统一升级摘要生成
  - 基于 impact report、doctor 结果、wrapper 审计结果输出一份团队可读升级摘要
- 项目基线检查
  - 比较当前项目与团队默认 preset / knowledge / adapters 的差距

建议优先级：P1

### 第三阶段：平台化发布与消费治理

目标：

- 从命令集演进为团队级治理平台
- 让升级动作、消费验证和通知生成自动闭环

建议新增：

- 团队级策略中心
  - 哪些工具允许启用
  - 哪些 wrapper 只能试点使用
  - 哪些 skills 必须随项目初始化
- 升级风险分级
  - 文档变更
  - skill 内容变更
  - adapter 行为变更
  - wrapper 协议变更
- 消费项目兼容矩阵增强
  - 不同消费者模板、不同初始化策略、不同工具组合的验证结果
- 自动升级建议包
  - 已完成第一版：`pnpm upgrade:advice -- --automation-report manifest/automation-report.json`
  - 当前会生成 `manifest/upgrade-advice-package.md/json`，沉淀消费者命令、维护者命令、人工检查项和阻断状态
  - 当前 notification payload 与 `upgrade-summary` 会直接复用这份 advice package，输出更可读的升级摘要
- CI 门禁增强
  - wrapper proposal 未完成关键状态时阻断注册
  - release artifacts 不一致时阻断发布

建议优先级：P2

#### P2-5 当前已完成

- 团队级策略中心第一版已落地：
  - 新增 `config/team-policy.json`
  - 新增 `show-team-policy`
  - 新增 `validate-team-policy`
  - 新增 `check-team-policy-drift`
- `sync` 现在会同步 `.power-ai/team-policy.json`，消费项目拥有可审计的策略快照。
- `doctor` 已接入 `policy` 分组，覆盖策略快照存在性、快照一致性、allowed tools、required skills、默认工具基线覆盖、wrapper rollout 阶段提示。
- `init` / `add-tool` 已开始消费 team policy，对 `allowedTools` 之外或 rollout 为 `disabled` 的工具做前置拦截；`pilot` / `compatible-only` 工具会保留 warning。
- `projectProfiles` 已开始驱动真实初始化策略：`init --project-profile <name>` 会按画像默认 preset 生成工具集合，并把 `selectedProjectProfile` / `requiredSkills` 一起持久化到 `.power-ai/selected-tools.json`。
- `init` / `show-defaults` 在未显式指定 `--project-profile` 时，已经开始根据工作区与 `scan-project` 画像信号自动推荐并应用团队画像。
- `show-defaults --project-profile <name>` 会直接预览指定团队画像的 preset、工具集合与 required skills。
- 已绑定 `selectedProjectProfile` 的项目，后续 `add-tool` 也会继续受该 profile 的 `allowedTools` 约束，避免增量绕开项目级策略边界。
- `doctor`、`check-project-baseline` 与 `upgrade:advice` 已开始把“推荐 project profile 与已绑定画像是否漂移”纳入治理提醒链路。
- `check:release-gates` 已接入 team policy governance gate，并默认继承 `teamPolicy.releasePolicies.enforceConsumerMatrix`。
- `upgrade:advice` 已接入 team policy，自动补充 `check-team-policy-drift` / `validate-team-policy` 建议动作。
- `sync` / `init` 现在会自动补齐 `.power-ai/governance/project-profile-decision.json` 与 `.power-ai/governance/project-profile-decision-history.json`，把 project profile recommendation 推进成可审计决策记录。
- 新增 `show-project-profile-decision` 与 `review-project-profile`，当前支持 `accepted` / `rejected` / `deferred` 三种人工决策，以及 recommendation / selected profile 变化后的 `auto-recommended` 自动回退。
- `check-team-policy-drift`、`doctor` 与 `check-project-baseline` 现在都会带出 `projectProfileDecision`、`decisionReason` 与 `nextReviewAt`，帮助团队区分“未处理漂移”和“已审阅但暂不迁移”。
- `upgrade:advice` 现在会补充 `show-project-profile-decision --json` 建议动作，让消费者升级后可以直接查看当前画像决策记录。
- 当前这一版已经把团队策略从“只读治理中心”推进到了“初始化 / 发布 / 建议包”联动；后续可以继续把它深入接进更多消费命令和项目画像自动识别链路。

## 明确暂不纳入的内容

当前路线图暂不纳入：

- React / TSX 项目扫描
- 非 Vue 技术栈的页面模式识别
- 与 React 生态绑定的 preset / base skill

原因：

- 当前现有能力主战场仍是 Vue + 企业前端模板体系
- 先把 Vue 侧扫描、conversation-miner、wrapper promotion 和 release governance 做深，更能提升现阶段交付效率
- 非 Vue 技术栈扩展需要单独设计模式识别、知识资产结构和测试基线，适合在后续专题方案中推进

## 建议的版本升级节奏

### 近期两次迭代

第 1 次迭代：

- wrapper promotion dry-run
  - 已完成第一版：`apply-wrapper-promotion --dry-run [--json]`
  - 当前可预览源码改动、proposal/doc scaffold 写入路径以及 post-apply checklist 路径
- doctor 报告模板统一
  - 已完成第一版：`doctor` 自动生成统一 `markdown/json` 报告
  - 当前会写出项目级 `.power-ai/reports/doctor-report.*` 与仓库级 `manifest/doctor-report.*`
- project-local skill 增量更新
  - 已完成第一版：`generate-project-local-skills` 默认走增量同步
  - 当前会区分 `created / updated / unchanged / removed`，并自动清理不再命中的旧草案

第 2 次迭代：

- scan-project 误报反馈闭环
  - 已完成第一版：`review-project-pattern --decision/--clear [--json]`
  - 当前会维护 `.power-ai/analysis/pattern-feedback.json` 与 `.power-ai/reports/project-scan-feedback.md`
  - 当前人工反馈会反向影响后续 `scan-project` 的 `pattern-review.json`，并直接影响 `generate-project-local-skills`
- conversation pattern 合并 / 归档
  - 已完成第一版：`merge-conversation-pattern` / `archive-conversation-pattern` / `restore-conversation-pattern`
  - 当前会维护 `.power-ai/patterns/pattern-governance.json` 与 `conversation-pattern-governance.md`
- 升级摘要生成
  - 已完成第一版：`generate-upgrade-summary --json`
  - 消费项目侧会输出 `.power-ai/reports/upgrade-summary.md/json`
  - 仓库维护侧会输出 `manifest/upgrade-summary.md/json`，并汇总 doctor、wrapper audit、impact、automation、version record 与 notification payload

### 中期两次迭代

第 3 次迭代：

- 项目基线检查
  - 已完成第一版：`check-project-baseline --json`
  - 消费项目侧会输出 `.power-ai/reports/project-baseline.md/json`
  - 当前会比较团队默认 preset / tool selection、`.power-ai/skills` 知识目录、registry 快照、adapter 模板产物与 selected entrypoints
- wrapper registry 治理视图
  - 已完成第一版：`generate-wrapper-registry-governance --json`
  - 当前会输出 `.power-ai/reports/wrapper-registry-governance.md/json`
  - 当前会合并内置 capture wrapper registry 与 wrapper promotion proposal，标记 ready-for-registration、pending follow-ups 和 stale proposal
- conversation-miner 项目策略模板
  - 已完成第一版：`generate-conversation-miner-strategy --type enterprise-vue|strict-governance|exploration|manual-review [--dry-run] --json`
  - 当前会生成 `.power-ai/conversation-miner-config.json`，并输出 `.power-ai/reports/conversation-miner-strategy.md/json`
  - 当前支持企业 Vue 默认、严格治理、探索沉淀、人工复核四类项目策略

第 4 次迭代：

- 升级风险分级
  - 已完成第一版：`pnpm upgrade:risk` 与 release automation 集成
  - 当前会生成 `manifest/upgrade-risk-report.md/json`，并把风险等级、风险分类数接入 `automation-report.json`、notification payload、doctor release checks 与 `generate-upgrade-summary`
- consumer compatibility matrix 增强
  - 已完成第一版：`verify-consumer` 支持输出 `consumer-compatibility-matrix.md/json`
  - 当前会沉淀场景数、通过/失败数、初始化策略、fixture / project 维度和 selected tools，并接入 `upgrade-summary` 与 release gate
- 发布门禁增强
  - 已完成第一版：`pnpm check:release-gates -- --require-consumer-matrix`
  - 当前会统一校验 release artifact consistency、wrapper proposal governance 与 consumer compatibility matrix，并生成 `manifest/release-gate-report.md/json`
  - 当前 `release:prepare`、`doctor` package-maintenance 模式与最终 `check:release-consistency -- --require-release-gate` 都会消费这份门禁报告

## 现有功能测试方案

### 1. 当前测试文件分布

当前测试文件：

- `tests/conversation-miner.test.mjs`
- `tests/doctor.test.mjs`
- `tests/governance-enhancements.test.mjs`
- `tests/project-scan.test.mjs`
- `tests/project-baseline.test.mjs`
- `tests/release-governance.test.mjs`
- `tests/rendering.test.mjs`
- `tests/selection.test.mjs`
- `tests/upgrade-summary.test.mjs`
- `tests/verify-consumer.test.mjs`

### 2. 当前测试覆盖重点

`conversation-miner.test.mjs` 覆盖：

- capture-session 端到端
- evaluate / prepare / confirm 流程
- auto-capture inbox / response inbox
- 多工具 wrapper capture
- host bridge example script
- wrapper promotion 全生命周期
- wrapper promotion audit / export

`governance-enhancements.test.mjs` 覆盖：

- wrapper registry 团队级治理视图
- ready-for-registration proposal 识别
- stale proposal 识别
- conversation-miner 项目策略模板写入
- conversation-miner 策略 dry-run 不改写配置

`project-scan.test.mjs` 覆盖：

- scan-project
- diff-project-scan
- component graph
- component propagation
- malformed vue 容错
- project-local 草案生成与晋升

`doctor.test.mjs` 覆盖：

- single-source 健康检查
- knowledge artifacts 缺失提示
- conversation scaffolding 缺失提示
- wrapper promotion follow-up / ready-for-registration 警告
- release governance 检查

`project-baseline.test.mjs` 覆盖：

- 团队默认 preset 初始化后的项目基线检查
- 显式裁剪工具集合时的 preset drift 报告
- `.power-ai/reports/project-baseline.md/json` 报告落盘

`selection.test.mjs` 覆盖：

- preset / profile / tool 解析
- positional 参数识别
- project root 解析

`release-governance.test.mjs` 覆盖：

- release artifact refresh
- consistency check
- version record / notification drift

`verify-consumer.test.mjs` 覆盖：

- 消费项目 fixture 验证

`rendering.test.mjs` 覆盖：

- 模板渲染与 placeholder 校验

`upgrade-summary.test.mjs` 覆盖：
- 消费项目升级摘要生成
- 仓库维护模式升级摘要生成

### 3. 推荐测试分层

#### 日常开发最小集

```bash
pnpm test
```

适用场景：

- 普通逻辑改动
- 小范围重构
- 命令输出微调

#### 功能改动标准集

```bash
pnpm test
pnpm check:package
pnpm check:docs
pnpm validate
```

适用场景：

- 增加命令参数
- 调整工具入口
- 修改技能、模板、输出格式

#### 治理 / 发布 / 接入改动增强集

```bash
pnpm test
pnpm check:package
pnpm check:docs
pnpm validate
pnpm check:tooling-config
pnpm check:component-knowledge
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-risk-report --require-automation-report --require-notification-payload
node ./bin/power-ai-skills.mjs doctor
```

适用场景：

- wrapper promotion 改动
- doctor 改动
- release governance 改动
- tool registry / defaults / template registry 改动

#### 发布前完整验收

```bash
pnpm release:prepare
```

适用场景：

- 版本发布前
- 中心仓库交付前

### 4. 建议补强的测试点

建议后续新增的测试方向：

- wrapper promotion dry-run 快照测试
- scan-project 误报抑制回归测试
- conversation pattern 合并 / 归档测试
- 大量会话记录下的性能回归测试
- 损坏输入与异常中断恢复测试
- `--json` 输出契约测试
- pack 内容精确校验测试
- doctor 报告模板快照测试

## 升级验收建议

每个新功能上线时，建议都按以下顺序验收：

1. 单模块测试通过
2. 全量测试通过
3. `check:package`、`check:docs`、`validate` 通过
4. 如涉及治理能力，补跑 `doctor`、`check:release-consistency`、`check:tooling-config`
5. `npm pack --dry-run --json` 检查新增文件是否被正确收包

## 结论

当前项目已经具备以下四条主线能力：

- 项目初始化与单一真实源治理
- 项目扫描与 project-local skill 自动生成
- conversation-miner 会话知识沉淀
- wrapper promotion 与发布治理

后续升级不应优先扩技术栈，而应优先把这四条主线做深做稳，尤其是：

- 减少误报
- 提高增量维护能力
- 提高 wrapper 生命周期治理能力
- 强化发布与消费侧的升级闭环

在上述能力稳定后，再考虑单独规划非 Vue 技术栈扩展。

## 后续治理执行清单（Trellis 参考版）

本节用于承接后续治理演进，目标不是把当前项目改造成 Trellis 的开发工作流，而是吸收其中最有价值的治理骨架：

- 上下文装配
- 决策记录
- 状态流转
- 稳定知识与原始过程分层

适用边界：

- 继续围绕 `team policy`、`project profile`、`conversation-miner`、`promotion`、`doctor`、`release governance` 演进
- 不引入开发者个人 `workspace/journal` 模型
- 不新增一套通用 task 系统
- 不让原始会话绕过 review 和 decision 直接进入正式资产

### 总体开发顺序

- [ ] `P2-6` 项目画像决策流
- [x] `P2-7` 会话洞察决策账本
- [x] `P2-8` promotion 全链路追溯
- [x] `P2-9` 治理上下文快照
- [x] `P2-10` 发布与消费闭环增强

### 通用开发约束

- [ ] 所有新增治理能力优先落在 `.power-ai/` 下的结构化 JSON 文件
- [ ] 所有新增治理对象都必须有固定状态枚举，禁止自由文本驱动流程
- [ ] 所有新增命令都必须支持 `--json`
- [ ] 所有新增结果优先接入 `doctor`、`check-project-baseline`、`upgrade-advice`
- [ ] 只有会影响发布判断时才接入 `release-gates`
- [ ] 所有治理文件都要考虑旧项目无文件时的兼容行为
- [ ] 新增字段时优先复用已有概念，不重复造同义字段

### `P2-6` 项目画像决策流

目标：
把“推荐画像”与“已绑定画像”的差异，从 warning 升级为正式决策对象。

建议新增产物：

- [x] `.power-ai/governance/project-profile-decision.json`
- [x] `.power-ai/governance/project-profile-decision-history.json`

建议固定状态：

- [x] `auto-recommended`
- [x] `accepted`
- [x] `rejected`
- [x] `deferred`

建议固定字段：

- [x] `selectedProjectProfile`
- [x] `recommendedProjectProfile`
- [x] `decision`
- [x] `decisionReason`
- [x] `decisionSource`
- [x] `decidedBy`
- [x] `decidedAt`
- [x] `sourceSignals`
- [x] `nextReviewAt`

开发清单：

- [x] `sync` 自动补齐 governance 目录与 decision 文件骨架
- [x] 新增 `review-project-profile`
- [x] 支持 `review-project-profile --accept <profile>`
- [x] 支持 `review-project-profile --reject --reason "..."`
- [x] 支持 `review-project-profile --defer --reason "..." --next-review-at YYYY-MM-DD`
- [x] 新增 `show-project-profile-decision --json`
- [x] `doctor` 接入 project profile decision 状态
- [x] `doctor` 对“已漂移但已 reject/defer”的情况降级为 warning
- [x] `check-project-baseline` 输出推荐画像、已绑定画像与决策状态
- [x] `upgrade-advice` 基于 decision 状态输出差异化动作建议
- [x] 推荐画像变化后自动追加 history

完成标准：

- [x] 新项目执行 `sync` 后自动具备 decision 文件
- [x] 漂移不再只是 warning，而是可查询、可解释、可复核
- [x] `doctor`、`baseline`、`advice` 对同一项目给出一致结论

### `P2-7` 会话洞察决策账本

目标：
让每条从 `conversation-miner` 提炼出的 pattern，都有状态、去向、理由和来源。

建议新增产物：

- [x] `.power-ai/governance/conversation-decisions.json`
- [x] `.power-ai/governance/conversation-decision-history.json`

建议固定状态：

- [x] `detected`
- [x] `review`
- [x] `accepted`
- [x] `rejected`
- [x] `promoted`
- [x] `archived`

建议固定目标类型：

- [x] `project-local-skill`
- [x] `team-rule`
- [x] `wrapper-proposal`
- [x] `docs`
- [x] `ignored`

建议固定字段：

- [x] `patternId`
- [x] `sourceConversationIds`
- [x] `decision`
- [x] `target`
- [x] `decisionReason`
- [x] `reviewedBy`
- [x] `reviewedAt`
- [x] `trace`

开发清单：

- [x] `analyze-patterns` 对新 pattern 自动写入 `detected/review`
- [x] 新增 `review-conversation-pattern`
- [x] 支持 `review-conversation-pattern --accept --target <type>`
- [x] 支持 `review-conversation-pattern --reject --reason "..."`
- [x] 支持 `review-conversation-pattern --archive`
- [x] `merge-conversation-pattern` 同步归并 decision
- [x] `archive-conversation-pattern` 同步写入 `archived`
- [x] `restore-conversation-pattern` 恢复到合理状态，而不是默认 `accepted`
- [x] `generate-project-skill` 成功后将相关 pattern 标记为 `promoted`
- [x] 对每个 decision 保留 `sourceConversationIds`
- [x] `doctor` 增加长期 `review` 未处理 pattern 的提示
- [x] `upgrade-summary` 展示待处理 conversation decisions 数量

完成标准：

- [x] 每个 pattern 都能回答“现在是什么状态、为什么、去哪里了”
- [x] 会话记录进入可治理的候选知识池，而不只是原始存档
- [x] pattern 治理与 skill、wrapper、docs 的去向建立明确关系

### `P2-8` promotion 全链路追溯

目标：
把 `conversation -> pattern -> decision -> skill/wrapper/docs -> release` 变成可追溯链条。

建议新增产物：

- [x] `.power-ai/governance/promotion-trace.json`

建议固定关系类型：

- [x] `pattern->project-skill`
- [ ] `project-skill->shared-skill`
- [x] `project-skill->manual-project-skill`
- [x] `pattern->wrapper-proposal`
- [x] `decision->release`

开发清单：

- [x] `generate-project-skill` 写入 trace
- [x] `promote-project-local-skill` 写入 trace
- [x] `scaffold-wrapper-promotion` 写入 trace
- [x] `register-wrapper-promotion` 更新 trace 状态
- [x] `generate-upgrade-summary` 引用 trace 中的 conversation-derived assets 摘要
- [x] `refresh-release-artifacts` 把 trace 摘要带入 release 产物
- [x] 新增 `show-promotion-trace --pattern <id>`
- [x] 新增 `show-promotion-trace --skill <name>`
- [x] 新增 `show-promotion-trace --release <version>`
- [x] 保证 trace 文件对重复执行具备幂等性

当前第一版说明：

- 当前已落地的 promotion trace 会同时输出 `.power-ai/reports/promotion-trace.md`，并支持 `pattern`、`skill`、`tool`、`release` 四类查询视角。
- `project-skill->shared-skill` 仍保留为后续扩展项；本轮先以 `project-skill->manual-project-skill` 覆盖项目内“自动草案 -> 人工维护 skill”这条实际存在的晋升链路。
- 包维护侧还会额外生成 `manifest/promotion-trace-report.json` 与 `manifest/promotion-trace-report.md`，用于说明当前 release 实际命中了哪些 promotion trace 关系。

完成标准：

- [x] 任意 conversation-derived asset 都能追溯到来源模式和决策
- [x] 任意 release 都能回答“本次吸收了哪些会话洞察”
- [x] promotion 不再是孤立动作，而是治理链条上的节点

### `P2-9` 治理上下文快照

目标：
把项目当前治理状态整理成统一快照，供多个命令复用。

建议新增产物：

- [x] `.power-ai/context/project-governance-context.json`

建议固定字段：

- [x] `selectedProjectProfile`
- [x] `recommendedProjectProfile`
- [x] `projectProfileDecision`
- [x] `teamPolicyVersion`
- [x] `allowedTools`
- [x] `requiredSkills`
- [x] `conversationMinerStrategy`
- [x] `baselineStatus`
- [x] `policyDriftStatus`
- [x] `pendingConversationReviews`
- [x] `pendingWrapperProposals`

开发清单：

- [x] `sync` 负责生成和刷新治理上下文快照
- [x] `doctor` 优先消费上下文快照，而不是重复装配同一批状态
- [x] `check-project-baseline` 复用快照中的 current state
- [x] `generate-upgrade-summary` 复用快照中的决策与待办计数
- [x] 如快照缺失，命令能够回退到现有逻辑
- [x] 新增 `show-project-governance-context --json`

当前第一版说明：

- 当前快照由 `src/governance-context/index.mjs` 统一生成，并通过 `.power-ai/context/project-governance-context.json` 作为项目治理状态的单一 JSON 入口。
- `baselineStatus` 当前以最近一次 `check-project-baseline` 结果为准；如果项目尚未执行基线检查，则会落为 `not-run`。
- `conversationMinerStrategy` 当前会读取 `.power-ai/conversation-miner-config.json` 中的 `strategy.projectType`、`capture.mode` 和 `autoCapture.enabled`，兼容“未显式生成策略模板，但已有默认 config”的项目。
- 当前消费者侧的升级建议复用点先落在 `generate-upgrade-summary`；后续如果需要进一步推进 package-maintenance 侧 `upgrade-advice`，可以继续复用同一份上下文快照。

完成标准：

- [x] 项目当前治理状态可以由单一 JSON 快照表达
- [x] `doctor`、`baseline`、`advice` 的核心字段保持对齐
- [x] 后续如做 UI 或 dashboard，可直接复用这份上下文

### `P2-10` 发布与消费闭环增强

目标：
让 release governance 真正消费前面几步沉淀下来的决策数据。

开发清单：

- [x] `release-gates` 接入未处理的 project profile decision 风险判断
- [x] `release-gates` 接入长期未处理的 conversation reviews 判断
- [x] 明确哪些治理问题属于 warning，哪些属于 blocking
- [x] `upgrade-advice` 输出基于历史决策的差异化升级动作
- [x] `consumer compatibility matrix` 增加与 project profile decision 相关的维度
- [x] `version-record` 增加治理决策摘要字段
- [x] notification payload 引入治理摘要
- [x] `doctor` release checks 增加必要的治理提示
- [x] 对 `deferred/rejected` 决策提供升级后复核提示，而不是一律要求迁移

完成标准：

- [ ] 发布链路能区分“未处理风险”和“已知但已决策风险”
- [ ] 消费项目收到的升级建议不再是通用话术，而是带治理上下文的动作包
- [ ] 发布治理开始真正消费项目决策数据

### 每一批都必须补的测试清单

- [ ] service 层单测
- [ ] CLI 命令测试
- [ ] `--json` 输出契约测试
- [ ] 老数据兼容测试
- [ ] 幂等测试
- [ ] 与 `doctor` 联动测试
- [ ] 与 `check-project-baseline` 联动测试
- [ ] 与 `upgrade-advice` 联动测试
- [ ] 如涉及发布，再补 `release-gates` 联动测试

### 每一批都必须补的文档清单

- [ ] 更新 `docs/command-manual.md`
- [ ] 更新 `docs/upgrade-roadmap.md`
- [ ] 如新增 doctor 提示码，更新 `docs/doctor-error-codes.md`
- [ ] 如影响发布策略，更新 `docs/versioning-policy.md`

### 推荐的开发节奏

- [ ] 第一批只做 `P2-6`
- [x] 第二批做 `P2-7`
- [x] 第三批已完成 `P2-8` 与 `P2-9`
- [x] 第四批做 `P2-10`

### `1.4.6 / P3-1` 决策过期提醒

- 目标：把已有的治理决策从“静态记录”推进成“可催办、可提醒、可汇总”的运营对象，第一版先覆盖 `project-profile-decision.nextReviewAt`。
- 已完成第一版：
  - 新增 `check-governance-review-deadlines --json`
  - 输出 `.power-ai/reports/governance-review-deadlines.md/json`
  - 统一沉淀 `not-scheduled` / `scheduled` / `due-today` / `overdue`
  - `show-project-profile-decision` 回显 review deadline 状态
  - governance context 新增 overdue / due-today 计数与下次 review 日期
  - `doctor`、`check-project-baseline`、`generate-upgrade-summary`、consumer compatibility matrix、`upgrade:advice` 已接入该状态
- 后续可继续扩展：
  - 把同样的 review deadline 模型扩到 conversation decision ledger
  - 在 release gates 中增加 overdue governance reviews 的运营 warning gate
  - 补批量复核动作，例如按状态批量 defer / archive / accept

### 推荐的验收命令模板

- [ ] `pnpm test`
- [ ] `pnpm check:docs`
- [ ] `pnpm check:tooling-config`
- [ ] 如涉及发布链路，执行 `pnpm release:prepare`

### `1.4.6 / P3-2` Governance summary

- 目标：把 `project profile decision`、review deadline、conversation backlog、wrapper backlog、promotion trace、baseline 和 policy drift 汇总成统一的项目治理运营总览。
- 已完成第一版：
  - 新增 `generate-governance-summary --json`
  - 输出 `.power-ai/reports/governance-summary.md/json`
  - 汇总 `project-profile-decision`、governance review deadline、conversation decision ledger、wrapper promotion audit、promotion trace、project baseline、team policy drift、project governance context
  - 报表直接给出 `overdue governance reviews`、`pending conversation reviews`、`pending wrapper proposals`、`ready for registration`、`pending wrapper follow-ups` 等关键计数
  - 推荐作为消费项目日常治理巡检入口，与 `show-project-governance-context --json`、`check-governance-review-deadlines --json`、`check-project-baseline --json` 配合使用

### `1.4.6 / P3-3` Batch governance review

- 目标：降低治理运营的人肉点选成本，把已有单条审阅动作推进成批量处理入口。
- 已完成第一版：
  - `review-project-profile` 新增 `--accept-recommended`
  - `review-conversation-pattern` 新增 `--from-review`、`--from-state <state>`、`--limit <n>` 批量审阅入口
  - 当前支持把 `review` 状态的 conversation pattern 批量执行 `--accept`、`--reject`、`--archive`
  - 批量处理后仍复用同一套 decision ledger 和 governance context 刷新链路

### `1.4.6 / P3-4` Governance history query

- 目标：把已经存在的 decision / promotion 历史数据统一成一个可查询入口，便于追溯最近发生了什么治理动作。
- 已完成第一版：
  - 新增 `show-governance-history --type profile-decision|conversation-decision|promotion --limit <n> --json`
  - 输出 `.power-ai/reports/governance-history.md/json`
  - 当前会复用 `project-profile-decision-history.json`、`conversation-decision-history.json` 和 `promotion-trace.json`
  - 支持按治理类型过滤，并按最近记录时间倒序输出

## 1.4.6 / P3-5 治理运营摘要

目标：
- 新增 manifest/governance-operations-report.json / manifest/governance-operations-report.md，作为 release 视角下的治理运营摘要
- 摘要包含 release gate 状态、consumer compatibility matrix 健康度、project profile decision backlog、governance review deadline backlog、conversation backlog、wrapper proposal backlog、promotion trace 健康度、manual checks 待办等治理活动
- refresh-release-artifacts 现在会自动刷新 governance operations report
- upgrade-payload / version-record.json 现在会附带 governance operations summary 与 artifact 路径
- check-release-consistency 新增 --require-governance-operations，用于校验产物 markdown 是否与最新结构一致

当前策略：
- 当前处于 1.4.6 收口阶段，会把 governance operations summary 直接生成 release notes 摘要
- 预计在 1.4.7，会把 governance operations report 做成跨版本对比，而不仅限于当前 release 的汇总

## 1.4.6 版本收口

目标：
- 为 P3-2 和 P3-5 补充自动化测试，覆盖 governance summary、governance history、batch review、governance operations report、release consistency 等，以及 package-maintenance doctor/release-gates 的数据产出
- 当前 1.4.6 测试链路已经覆盖 consumer governance、history/summary、release governance operations 和 release validation 全部治理自动化回归范围

下一步：
- 下一步直接进入 1.4.6 版本收口与发布准备，不再补充不同粒度的治理测试

## 1.4.7 / P4-1 自进化调度器

目标：
- 新增 `run-evolution-cycle --json`，作为自进化第一版调度入口
- 根据“自上次 `analyze-patterns` 之后新增的会话数”判断是否触发自动分析
- 第一版先串起 `analyze-patterns`、治理上下文刷新和 `generate-governance-summary`
- 输出 `.power-ai/reports/evolution-cycle-report.md/json`，为后续 evolution policy 和 candidate generation 打基础

当前第一版说明：

- 当前默认阈值是 `3` 条新增会话，可通过 `--min-new-conversations <n>` 临时覆盖
- `--force` 可忽略阈值直接触发，`--dry-run` 只输出 would-run 结果，不实际执行分析
- 当前只负责“自动分析调度”和“治理报告刷新”，还不会自动升级 shared skill、wrapper registry 或 release 流程
- 后续 `P4-2` 会继续补 evolution policy，`P4-3` 再接 candidate generation

## 1.4.7 / P4-2 进化策略配置

目标：
- 新增项目级 `.power-ai/evolution-policy.json`，定义自进化自动化边界
- 新增 `show-evolution-policy --json` 与 `validate-evolution-policy --json`
- 让 `run-evolution-cycle` 不再只依赖命令行阈值，而是优先读取项目策略

当前第一版说明：

- `init` / `sync` 会自动补齐 evolution policy
- 默认策略会开启：
  - `autoAnalyzeEnabled`
  - `autoRefreshGovernanceContext`
  - `autoRefreshGovernanceSummary`
- 默认策略会关闭高风险自动化：
  - `allowAutoProjectLocalSkillRefresh`
  - `allowAutoSharedSkillPromotion`
  - `allowAutoWrapperProposal`
  - `allowAutoReleaseActions`
- `project-governance-context` 已经纳入 evolution policy 摘要，后续 `P4-3` 和 `P4-4` 可以直接复用这份状态

## 1.4.7 / P4-3 候选升级生成器

目标：
- 自动把会话分析结果推进成候选升级项，而不是直接修改正式资产
- 生成 evolution candidate ledger、candidate history 和 evolution summary
- 把候选层接入治理上下文和治理汇总，形成可持续扩展的自进化骨架

当前第一版说明：

- 新增 `generate-evolution-candidates --json`
- 当前会生成：
  - `.power-ai/governance/evolution-candidates.json`
  - `.power-ai/governance/evolution-candidate-history.json`
  - `.power-ai/reports/evolution-summary.md/json`
- 当前已支持的候选类型：
  - `project-local-skill-draft`
  - `wrapper-proposal-candidate`
  - `docs-candidate`
  - `profile-adjustment-candidate`
- `run-evolution-cycle` 在触发分析后会自动刷新 evolution candidates
- `project-governance-context` 和 `generate-governance-summary` 已经开始消费 candidate 计数与高风险摘要

## 1.4.7 / P4-4 低风险自动落地

目标：
- 在候选层之上，放开项目内低风险自动动作
- 先支持 project-local drafts 与治理快照刷新，不碰 shared skill、wrapper registry 和 release
- 为后续高风险 proposal 化提供明确的动作记录层

当前第一版说明：

- 新增 `apply-evolution-actions --json`
- 生成 `.power-ai/governance/evolution-actions.json`
- 当前支持的低风险动作：
  - `refresh-project-local-skill-draft`
  - `refresh-governance-context`
  - `refresh-governance-summary`
- `run-evolution-cycle` 在分析和候选生成后，会自动尝试执行这些动作
- `allowAutoProjectLocalSkillRefresh` 默认仍关闭，只有明确打开策略时，才会自动刷新 project-local drafts

## 1.4.7 / P4-5 高风险升级提案化

目标：
- 把高风险 evolution candidate 推进成正式 proposal，而不是继续自动执行
- 让 shared skill、wrapper rollout、project profile adjustment、release impact escalation 都能进入可审计治理流
- 为后续人工审阅、批量治理和 release gate 联动保留稳定提案层

当前第一版说明：

- 新增 `generate-evolution-proposals --json`
- 当前会生成：
  - `.power-ai/governance/evolution-proposals.json`
  - `.power-ai/governance/evolution-proposal-history.json`
  - `.power-ai/reports/evolution-proposals.md/json`
- 当前 proposal 类型包括：
  - `project-profile-adjustment-proposal`
  - `wrapper-rollout-adjustment-proposal`
  - `shared-skill-promotion-proposal`
  - `release-impact-escalation-proposal`
- 每条 proposal 都会在 `.power-ai/proposals/evolution/<proposal>/` 下生成独立目录，包含 `proposal.json` 与 `README.md`
- `run-evolution-cycle` 现在已经会在 candidate generation 和低风险 actions 之后自动刷新 evolution proposals
- 当前这一层仍然只负责“生成提案”，不会直接修改 shared skill、wrapper registry、team policy 或 release 产物

## 1.4.7 / P4-6 提案审阅流

目标：
- 让 evolution proposal 不只是“能生成”，还可以被团队查看、审阅和归档
- 把 proposal backlog 接入项目治理总览，而不是停留在独立 ledger 中
- 为后续更细粒度的 apply / release gate 联动打基础

当前第一版说明：

- 新增 `list-evolution-proposals --json`
- 新增 `review-evolution-proposal --proposal <id> --accept|--reject|--archive|--review --json`
- proposal 审阅后会回写：
  - `.power-ai/governance/evolution-proposals.json`
  - `.power-ai/governance/evolution-proposal-history.json`
  - `.power-ai/reports/evolution-proposals.md/json`
- `show-project-governance-context` 现在会直接展示 evolution proposal 摘要
- `generate-governance-summary` 现在会把 evolution proposals 数量、review backlog 和建议动作带进治理总览
- 当前第一版仍然只处理“治理状态流转”，不做自动 apply，不直接修改 shared skill、wrapper registry、team policy 或 release 产物

## 1.4.7 / P4-7 提案应用与门禁联动

目标：
- 为已接受的 evolution proposal 提供受控 apply 入口，而不是停留在“accepted but not applied”
- 把 evolution proposal backlog 接进 doctor 与 release gate 的治理提醒
- 继续坚持“高风险不自动落地”，但让人工 apply 有正式入口

当前第一版说明：

- 新增 `apply-evolution-proposal --proposal <id> --json`
- 当前版本支持已 `accepted` 的以下 proposal：
  - `project-profile-adjustment-proposal`
  - `shared-skill-promotion-proposal`
  - `wrapper-rollout-adjustment-proposal`
  - `release-impact-escalation-proposal`
- 对 shared skill、wrapper rollout 和 release impact，apply 不会直接自动落地到正式注册/正式发版，而是推进成下一层可执行 draft artifact
- `doctor` 新增 evolution proposal backlog warning：
  - review backlog
  - accepted but not applied backlog
- consumer compatibility matrix 与 release gates 现在会汇总：
  - pending evolution proposal reviews
  - accepted evolution proposals
  - high-risk evolution proposals
- release gates 当前先以 warning 方式提示 evolution proposal backlog，不直接 blocking

## 1.4.7 / P4-8 提案老化与运营提醒

目标：
- 把 evolution proposal backlog 从“有状态”继续推进到“有 SLA、可催办、可运营提醒”
- 让 stale review 和 accepted-but-not-applied proposal 能稳定出现在治理总览、doctor、release gates 与运营报表中
- 为后续 proposal aging、批量处理和运营汇总提供统一度量

当前第一版说明：

- evolution proposal 现在会自动区分：
  - `review` 超过 `7` 天记为 stale review
  - `accepted` 超过 `3` 天且未 apply 记为 stale accepted proposal
- `project-governance-context`、`generate-governance-summary`、consumer compatibility matrix、release gates、upgrade advice、governance operations report 都会汇总：
  - `staleEvolutionProposalReviews`
  - `staleAcceptedEvolutionProposals`
  - 对应的 SLA 与 oldest age
- `doctor` 新增 `PAI-POLICY-011`，用于提示 evolution proposal backlog 已经超过治理 SLA
- governance summary 会自动给出建议动作，优先引导：
  - `list-evolution-proposals --json`
  - `review-evolution-proposal --proposal <id> --accept|--reject|--archive`
  - `apply-evolution-proposal --proposal <id>`

## 1.4.7 / P4-9 提案批量治理

目标：
- 把 evolution proposal 从“逐条审阅、逐条应用”推进到“可按状态批量处理”
- 在不突破当前风险边界的前提下，降低治理 backlog 的人工成本
- 保持昨天拆分后的模块边界稳定，不把 proposal manager 重新堆回超大文件

当前第一版说明：

- `list-evolution-proposals` 新增 `--limit`，便于按窗口查看 backlog
- `review-evolution-proposal` 现在支持两种入口：
  - 单条：`--proposal <id>`
  - 批量：`--from-status <status> [--type <proposal-type>] [--limit <n>] [--archived]`
- `apply-evolution-proposal` 现在也支持同样的批量入口：
  - 单条：`--proposal <id>`
  - 批量：`--from-status <status> [--type <proposal-type>] [--limit <n>] [--archived]`
- 批量 review / apply 都会返回：
  - `processedCount`
  - `skippedCount`
  - `skipped`
- 批量 apply 现在会对受控 proposal 执行两类动作：
  - `project-profile-adjustment-proposal`：真正应用到 project profile selection
  - `shared-skill-promotion-proposal` / `wrapper-rollout-adjustment-proposal` / `release-impact-escalation-proposal`：生成下一层可执行 draft artifact
- 即使完成 apply，仍然不会自动注册 wrapper、不会自动发版，保持现有治理边界不变
- proposal manager 已继续拆分为更小模块，storage / selection / artifact 落盘逻辑移到独立文件，保持单文件不再回到超大体积

## 1.4.7 / P5-1 采集安全边界收口

目标：
- 把采集安全策略从“项目本地默认值”推进到“团队基线 + 项目覆盖”
- 让 `init` / `sync` / `show-capture-safety-policy` / `validate-capture-safety-policy` / 实际采集判定共享同一套边界来源
- 为后续更细粒度敏感信息规则、blocking 策略和审批联动打基础

当前完成说明：

- 在 `team-policy` 中正式引入团队级 `captureSafetyPolicy` 基线
- `init` / `sync` 现在会按团队基线脚手架 `.power-ai/capture-safety-policy.json`
- 运行时统一按“内置默认值 -> team policy captureSafetyPolicy -> 项目 `.power-ai/capture-safety-policy.json`”三层顺序合并
- `show-capture-safety-policy --json` 与 `validate-capture-safety-policy --json` 现在都会输出同一份生效策略
- `capture-session`、auto-capture admission、capture retention 现在统一复用这份生效策略
- `check-team-policy-drift` 与 `doctor` 新增了团队级 `captureSafetyPolicy` 漂移提示
- 本阶段补上了第一批更细粒度规则：
  - `admission.blockedGeneratedFilePatterns`
  - `admission.reviewGeneratedFilePatterns`
- 这两组规则已经接入：
  - team policy schema
  - team baseline
  - show / validate 输出
  - capture evaluation 运行时判定
  - doctor / governance summary / upgrade summary 摘要计数
- 当前默认团队基线已经可对 `.env`、证书 / 密钥文件、`secrets/`、`credentials/` 等高风险输出做 blocking，对 `migrations/`、`deploy/`、`ops/`、`scripts/release` 等高风险变更目录做 review 提示
- 已补充自动化测试，并确认全量测试通过

阶段收口判断：

- 团队策略可以定义 capture safety 基线
- 新项目初始化后会按团队基线生成采集安全策略文件
- 项目局部覆盖后，运行时仍能保留团队基线剩余规则
- `show-capture-safety-policy --json` 和 `validate-capture-safety-policy --json` 输出一致的生效结果
- 有对应自动化测试，且现有 doctor 链路不回归

结论：

- `P5-1` 已按原阶段定义收口，后续进入 `P5-2`，继续推进 capture safety 与治理动作联动

## P5-2 采集安全治理联动

目标：
- 把已经收口的采集安全边界继续推进到更明确的治理动作
- 让 capture safety 的风险状态能稳定映射到 blocking / warning / review 三层处理语义
- 为后续 release-gates blocking 升级和审批联动保留统一接口

当前完成说明：

- 已明确 capture safety 风险等级与治理动作映射：
  - `warning` 对应低信号但允许采集的记录
  - `review` 对应允许进入待确认边界、但必须人工确认的记录
  - `blocking` 对应违反采集边界、禁止进入采集链路的记录
- 已将 capture safety 风险摘要接入 `doctor`、governance summary、upgrade summary 与 `release-gates`
- `doctor` 已新增：
  - `PAI-CONVERSATION-035`：warning-level conversation captures are acknowledged
  - `PAI-CONVERSATION-036`：review-level conversation captures are triaged
- `release-gates` 已新增并稳定输出：
  - `conversation-capture-warning-governance`
  - `conversation-capture-admission-governance`
- 已统一 auto-capture / manual capture 在 review 场景下的确认边界：
  - `prepare-session-capture -> confirm-session-capture` 负责手工确认流
  - `submit-auto-capture --consume-now` 命中 review 边界时不会绕过确认，而是返回 `review_required`
- 已补充自动化测试，覆盖 capture safety 规则命中、review boundary 和治理汇总链路
- 已更新 `docs/command-manual.md`，补充 capture safety governance semantics、troubleshooting 与 release linkage 的命令手册说明

阶段收口判断：

- capture safety 规则命中后已有明确且一致的治理语义
- `doctor`、governance summary、release-gates 对 capture safety 风险的表达一致
- review 场景下的 capture 入口行为一致
- 有对应自动化测试，且现有治理链路不回归

结论：

- `P5-2` 已按原阶段定义收口；`docs/upgrade-roadmap.md` 应在下一次进入时写入新的活动阶段，而不是继续追加本阶段内容

## P5-3 提案 Apply 收口

目标：

- 把 evolution proposal 在 `apply` 之后生成的 draft artifact 真正纳入治理视图，而不是只停留在 proposal ledger
- 让团队能从 governance context / governance summary / upgrade summary 直接看到“已经 apply 了什么、下一步还要收什么尾”
- 继续保持高风险 proposal 的边界：不在这一阶段引入自动注册 wrapper 或自动发版

当前完成说明：

- `project-governance-context` 现在会稳定汇总 applied proposal artifact，包括：
  - `appliedProjectProfileSelections`
  - `appliedWrapperPromotionDrafts`
  - `appliedSharedSkillDrafts`
  - `appliedReleaseImpactDrafts`
  - `appliedDraftsWithFollowUps`
  - `followUpActionCount`
  - `nextActionPreview`
- `generate-governance-summary` 与 `generate-upgrade-summary` 现在都会显式展示 applied draft follow-up，并补充后续建议动作
- consumer compatibility matrix 与 `release-gates` 现在会继续汇总：
  - `appliedEvolutionProposalFollowUps`
  - `scenariosWithAppliedEvolutionProposalFollowUps`
  - `appliedEvolutionProposalFollowUpActionCount`
  - applied wrapper / shared-skill / release-impact draft 数量
- `doctor` 已新增 `PAI-POLICY-013`，用于提示“已 apply 但仍有 follow-up actions 的 evolution draft”
- `release-gates` 已复用 `evolution-proposal-governance` gate，把 applied draft follow-up 映射为非 blocking warning
- 已更新 `docs/command-manual.md` 与 `docs/doctor-error-codes.md`，补齐 apply 后续动作、doctor 与 release-gates 联动说明
- 已补充自动化测试，覆盖 governance summary、upgrade summary、doctor、release-gates 与 verify-consumer 相关回归

阶段收口判断：

- applied evolution proposal 生成的 draft artifact 已能在治理摘要中稳定看见
- 团队可以直接从摘要里看到 apply 后的 follow-up 动作，而不必只翻 proposal ledger
- `doctor` 与 `release-gates` 对 applied draft follow-up 的治理表达一致
- 高风险 proposal 仍保持人工收口边界，没有引入自动注册 wrapper、自动发版或 shared skill 自动正式晋升

结论：

- `P5-3` 已按原阶段定义收口；下一阶段应继续推进 draft artifact 的统一收口入口，而不是回到仅靠摘要做提示

## P5-4 Draft Artifact 收口入口

目标：

- 把 apply 后生成的 shared-skill / wrapper / release-impact draft 从“摘要里可见”推进到“团队可以直接查看、直接继续处理”
- 为 applied draft artifact 提供统一入口，避免团队只能依赖 `evolution-proposals.json` 或零散路径手工定位
- 继续保持高风险 proposal 的边界：不在这一阶段引入自动 shared skill 晋升、自动 wrapper 注册或自动发版

当前完成说明：

- 已新增统一 draft 视图和数据模型，覆盖：
  - `draftId`
  - `artifactType`
  - `proposalId` / `proposalType`
  - `draftRoot`
  - `generatedFiles`
  - `nextActions`
  - `metadata`
- 已新增两个 CLI 入口：
  - `list-evolution-drafts`
  - `show-evolution-draft`
- `doctor`、`governance-context` 和 `generate-governance-summary` 现在对 applied draft follow-up 的汇总已复用同一套 helper，而不是重复装配
- 已更新 `docs/command-manual.md`，补齐 draft list / show 的使用方式与字段说明
- 已补充自动化测试，覆盖 evolution draft list/show、CLI project root 解析、doctor 与 governance summary 回归

阶段收口判断：

- 团队无需手工翻 `evolution-proposals.json` 就能定位 applied draft artifact 与下一步动作
- shared-skill / wrapper / release-impact draft 的核心字段表达一致
- `doctor` 与 `governance summary` 对 applied draft 的治理表达开始复用同一套底层投影逻辑
- 高风险 proposal 仍保持人工收口边界，没有引入自动 shared skill 晋升、自动注册或自动发版

结论：

- `P5-4` 已按原阶段定义收口；下一阶段应继续推进 draft artifact 的人工交接与收口脚手架，而不只是“能看见、能定位”

## P5-5 Draft Handoff 脚手架

目标：

- 把 apply 后生成的 `shared-skill` / `release-impact` draft 从“可查看”推进到“有明确 handoff 和收尾脚手架”
- 让团队在进入 draft 之后，能直接拿到面向人工治理的 checklist、说明和后续责任边界
- 继续保持高风险 proposal 的边界：不在这一阶段引入自动 shared skill 晋升、自动 wrapper 注册或自动发版

当前完成说明：

- `shared-skill` / `release-impact` draft 现在已补齐统一 handoff metadata，覆盖：
  - `handoff.status`
  - `handoff.ownerHint`
  - `handoff.nextReviewAt`
  - `handoff.nextAction`
  - `handoff.checklistPath`
  - `handoff.boundary`
- `shared-skill` draft 现在会补齐 `manual-checklist.md`，并在 `skill.meta.json` 中写入：
  - `draftId`
  - `draftRoot`
  - `generatedFiles`
  - `handoff`
- `release-impact` draft 现在会在 `release-impact-draft.json` 中写入同样的 handoff / draft linkage 字段，并与 README / checklist 的表达保持一致
- `list-evolution-drafts` / `show-evolution-draft` 已直接展示：
  - `handoff`
  - `handoffStatus`
  - `ownerHint`
  - `checklistPath`
  - `nextAction`
  - `nextReviewAt`
- `project-governance-context`、`generate-governance-summary`、`generate-upgrade-summary` 与 `doctor` 现在都会继续带出 applied draft handoff preview，而不是只显示 `nextActions`
- `generate-governance-summary` 与 `generate-upgrade-summary` 的 markdown 已新增 `draft handoff preview`
- `PAI-POLICY-013` 现在会带出 owner hint、checklist 与 next action，方便直接进行人工交接
- 已更新 `docs/command-manual.md` 与 `docs/doctor-error-codes.md`
- 已补充自动化测试，覆盖 evolution draft handoff、doctor、governance summary 与 upgrade summary 回归

阶段收口判断：

- 团队进入 `shared-skill` / `release-impact` draft 后，可以直接看到清晰的 handoff / checklist / 下一步治理动作
- draft 的人工收口边界表达一致，不需要再依赖零散 README 文本猜测
- `list/show`、governance summary、upgrade summary 与 doctor 对 applied draft handoff 的表达已对齐
- 高风险 proposal 仍保持人工收口边界，没有引入自动 shared skill 晋升、自动注册或自动发版

结论：

- `P5-5` 已按原阶段定义收口；下一阶段应转向运营趋势视图，把现有摘要视图推进成跨周期趋势对比，而不是继续在当前文件里堆叠已完成阶段

## 1.4.7 / P5-6 项目评估与结构优化第一版

阶段目标：

- 先把“继续做功能”的前提建立在“结构可维护、发布可控、校验稳定”上。
- 优先收敛命令注册重复维护、CLI 入口热点膨胀、运行时与维护脚本边界混杂、npm 发布面偏宽，以及已确认安全的低价值运行时产物。

已完成：

- 新增 `src/commands/registry.mjs`，把命令注册、命令分发和 `project root` 解析共用的元数据收敛到单一源。
- 新增 `src/cli/index.mjs`，把 CLI 服务装配从 `bin/power-ai-skills.mjs` 拆出，保留薄壳入口。
- 新增 `src/shared/fs.mjs`，消除运行时代码对 `scripts/` 的反向依赖。
- 收紧 `package.json` 的 `files` 边界，只保留运行时必需资产和最小消费文档。
- 同步更新 `scripts/check-package.mjs`，对 tarball 中不应出现的维护脚本、baseline、额外 manifest 文档和 release 中间产物做拦截。
- 输出 `docs/project-structure-assessment.md`，把本轮结论、高优先级后续优化和清理范围写入维护文档。
- 更新 `docs/command-manual.md`、`docs/maintenance-guide.md`、`docs/release-process.md`，让实现与维护说明保持一致。
- 新增 `tests/command-registry.test.mjs`，覆盖命令注册表的唯一性与分发行为。
- 修复 Windows / Node 24 下测试复制中文路径目录时 `fs.cpSync(...)` 导致的进程级崩溃，相关测试统一改为使用稳定的 `copyDir(...)`。
- 升级 `scripts/clean-runtime-artifacts.mjs`：除了清理 `manifest/` 中的忽略产物，还会回收 `.power-ai/` 下的空运行时目录，并支持 `--json`、`--manifest-root`、`--runtime-root` 以便自动化验证。
- 新增 `tests/clean-runtime-artifacts.test.mjs`，覆盖运行时产物清理与空目录回收。

清理范围：

- 本轮没有删除已跟踪的 release artifacts、历史归档目录或技术方案文档。
- 已确认安全并纳入清理的内容，主要是 `manifest/` 中按规则生成的无价值运行时产物，以及 `.power-ai/` 下无内容的运行时空目录。
- `.power-ai/` 下仍有内容的目录继续保留，避免误删现场数据。

验收结果：

- `pnpm test`
- `pnpm check:package`
- `pnpm check:docs`

结论：

- `P5-6` 已经完成第一轮结构收口，可以转入下一阶段，继续处理 `project-scan` 热点模块拆分、命令手册与注册表一致性，以及发布边界 smoke 校验。

## 1.4.7 / P5-7 项目扫描拆分与发布验证第二版

阶段目标：

- 在 `P5-6` 的结构收口基础上，继续处理后续最容易持续膨胀的模块与校验链路。
- 优先解决 `project-scan` 入口过重、命令文档与注册表的手工同步成本，以及发布边界缺少更直接 smoke 校验的问题。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- 完成 `src/project-scan/index.mjs` 的第一轮继续拆分，把 orchestration、分析管线、分析产物落盘和 project-local 入口进一步拆到独立模块。
- 为命令手册补上基于注册表的自动生成 / 校验链路，避免命令清单继续完全依赖人工同步。
- 新增 `tests/package-boundary-smoke.test.mjs`，对真实 `npm pack` tarball 做发布边界 smoke：
  - 校验关键运行时资产仍在包内
  - 校验维护脚本、baseline、通知载荷和维护侧文档未误入 tarball
  - 从解包产物直接启动 `bin/power-ai-skills.mjs`
  - 对内置 consumer fixture 跑最小 `show-defaults` / `init` / `doctor` 验证
- 更新 `docs/release-process.md`、`docs/maintenance-guide.md`、`docs/project-structure-assessment.md`，把“路径名单 + 运行时 smoke”的发布边界校验口径写回维护说明。
- `docs/upgrade-roadmap.md` 中本阶段未完成项已经全部勾完，阶段说明与自动化链路保持一致。

验收结果：

- `node --test ./tests/package-boundary-smoke.test.mjs`
- `node ./scripts/check-package.mjs`
- `node ./scripts/check-docs.mjs`

结论：

- `P5-7` 已按原阶段定义收口；下一阶段应继续优先处理 `project-scan` 的后续扩展热点，并评估仓库维护态 release 检查与消费项目运行时入口的进一步解耦。

## 1.4.7 / P5-8 项目扫描深拆与维护态边界解耦

阶段目标：

- 在 `P5-7` 已完成的第一轮拆分基础上，继续压缩 `project-scan` 后续最容易重新膨胀的扩展面。
- 优先处理 `project-scan` orchestration 与维护态 release 检查之间仍然偏近的边界，避免运行时概念继续侵入仓库维护流程。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- 输出 `docs/project-structure-assessment.md` 第二轮拆分方案，明确后续新增能力优先落到 `scan inputs`、`pattern inference`、`analysis projection`、`project-local materialization` 等稳定边界，而不是继续回堆入口文件。
- 完成 `analysis-artifacts` 第一层结构收口：
  - `src/project-scan/analysis-paths.mjs` 只负责 project-scan 路径模型
  - `src/project-scan/analysis-artifact-store.mjs` 只负责 artifact load / write contract
  - `src/project-scan/project-local-overlay.mjs` 只负责 overlay root lifecycle
- 完成 `project-local-service` 第一层结构收口：
  - `src/project-scan/project-local-generation-service.mjs` 只负责 draft generation / regenerate
  - `src/project-scan/project-local-lifecycle-service.mjs` 只负责 list / promote 等 lifecycle 动作
- 将 `src/project-scan/analysis-artifacts.mjs` 与 `src/project-scan/project-local-service.mjs` 收回为兼容装配层，避免路径模型、artifact store、overlay lifecycle 和 project-local lifecycle 继续绑定在同一文件中。
- 将 CLI 运行时装配继续稳定在 `src/cli/index.mjs`，并把维护态 release 检查入口收敛为独立的 `scripts/run-release-check.mjs`，减少消费项目运行时包对维护流程概念的直接感知。
- 新增 `scripts/release-consumer-inputs.mjs` 与 `pnpm release:consumer-inputs` / `pnpm release:check` 链路，明确维护态 release 检查的分步职责边界。
- 同步更新 `docs/command-manual.md`、`docs/maintenance-guide.md`、`docs/release-process.md`、`docs/upgrade-roadmap.md`，保证结构变化、维护态边界和校验方式描述一致。
- 补齐自动化验证：
  - `tests/run-release-check.test.mjs`
  - `tests/package-boundary-smoke.test.mjs`
  - `pnpm test`
  - `pnpm check:package`
  - `pnpm check:docs`
  - `pnpm release:check`

阶段收口判断：

- `project-scan` 后续新增能力已有更明确的边界落点，不再默认回堆到单一入口或同一批 helpers。
- 仓库维护态 release 检查与消费项目运行时入口的职责边界比上一阶段更清晰，维护流程不再默认借道运行时概念层。
- 现有命令文档、发布边界 smoke 和维护说明在结构变化后仍保持一致。
- 本阶段实现、测试和文档已对齐，可继续作为后续结构优化的基础。

结论：

- `P5-8` 已按原阶段定义收口；下一阶段应继续处理规则层目录化、测试热点收敛和运行时目录治理，而不是提前切回功能扩张。

## 1.4.7 / P5-9 规则层目录化与维护收口第三版

阶段目标：

- 在 `P5-8` 已完成服务边界收口的基础上，继续处理 `project-scan` 里最容易再次膨胀的规则层与测试热点。
- 优先把 detector / vue-analysis 一类“规则继续增长就会回到大文件”的位置，收敛成更稳定的目录化落点。
- 同时补齐运行时目录保留策略和测试结构治理，避免后续维护成本重新上升。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- `src/project-scan/pattern-detectors.mjs` 已退回为兼容导出层，四类 page pattern detector 已拆到 `src/project-scan/pattern-detectors/` 目录下的独立规则模块。
- 当前拆分先保持 `scan-engine` 与现有调用面的 contract 不变，优先验证“规则层目录化”已经成立，再决定是否继续处理 `vue-analysis`。
- `docs/project-structure-assessment.md` 与 `docs/maintenance-guide.md` 已补充规则层落点说明，明确 detector、SFC signal、scan orchestration、analysis projection 与 project-local lifecycle 的边界分工。
- `tests/selection.test.mjs` 中成批 `resolveProjectRoot keeps cwd ...` 用例已收敛为表驱动结构，后续新增命令解析覆盖时不再需要继续复制整段测试样板。
- `tests/run-release-check.test.mjs` 中 release 产物快照的 JSON / Markdown 搭建已抽成复用 helper，release 边界测试的样板量进一步下降。
- `clean-runtime-artifacts` 已切换为“白名单式空目录回收”：只回收 `analysis`、`context`、`reports`、`patterns`、`conversations`、`proposals`、`auto-capture` 等已确认安全的空目录，`skills`、`shared`、`adapters`、`governance` 等基础结构目录即使为空也继续保留。
- `.power-ai/` 运行时目录保留策略、清理边界和例外项已同步到维护文档与结构评估文档。
- 本阶段关键回归基线已补齐并通过：
  - `pnpm test -- --test-name-pattern "project scan|component graph|component propagation|scan-project"`
  - `pnpm test -- --test-name-pattern "resolveProjectRoot|parsePositionalSelection|expandToolSelection|resolveSelection|detectProjectProfileRecommendation"`
  - `pnpm test -- --test-name-pattern "run-release-check|release consumer inputs|check-release-gates|check-release-consistency"`
  - `pnpm test -- --test-name-pattern "clean-runtime-artifacts|clean runtime"`
  - `pnpm check:docs`

阶段收口判断：

- `project-scan` 规则层的后续新增能力已有更明确的目录化落点，不再优先堆回 detector / vue-analysis 热点文件。
- 大型测试文件中至少一类重复样例已稳定收敛，后续扩展测试时不再默认复制整段场景。
- `.power-ai/` 运行时目录的保留和回收策略更清晰，清理命令、测试和维护说明对边界表达一致。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。

结论：

- `P5-9` 已按原阶段定义收口；下一阶段应继续处理 `vue-analysis` 的细分拆层与剩余维护热点，而不是回到功能扩张。

## 1.4.7 / P5-10 Vue Analysis 拆层与维护热点第四版

阶段目标：

- 在 `P5-9` 已完成 detector 目录化、测试样板收敛和运行时目录治理的基础上，继续处理 `vue-analysis` 这块剩余的规则层热点。
- 优先把 template analysis、script analysis 和 signal synthesis 的边界再拆清楚，避免后续 SFC 信号继续回堆到同一个文件。
- 同时继续压缩剩余维护热点，尤其是 release / package 边界与结构说明中仍偏集中的位置。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- `src/project-scan/vue-analysis.mjs` 已退回兼容导出层，template analysis、script analysis、signal synthesis 与共享 helper 已拆到 `src/project-scan/vue-analysis/` 目录下的独立模块。
- 当前拆分保持 `signals` 与 `scan-engine` 的现有调用面稳定，优先把 SFC 规则层边界先立住，再继续处理后续维护热点。
- `docs/maintenance-guide.md` 已补充 `vue-analysis` 子层落点说明，明确 template AST、script AST、语义信号组合与兼容导出层的职责边界，避免后续 SFC 规则继续回堆。
- `tests/project-scan.test.mjs` 已新增针对 `analyzeTemplateAst`、`analyzeScriptAst`、`buildScriptSignals` 与 `analyzeVueSfc` 的直接入口断言，保证这轮拆层不是单纯文件移动。
- `scripts/shared.mjs` 已补充仓库维护侧共用的 `npm pack` 定位与 JSON 解析 helper，`scripts/check-package.mjs` 与 `tests/package-boundary-smoke.test.mjs` 不再各自维护重复的 pack 调用逻辑。
- 发布边界相关校验链路在共享 helper 收口后仍保持一致，`pnpm check:package` 继续负责路径名单约束，`tests/package-boundary-smoke.test.mjs` 继续负责真实 tarball 的运行时 smoke。
- 本阶段关键回归基线已补齐并通过：
  - `node --test ./tests/project-scan.test.mjs --test-name-pattern "vue template analysis|vue script analysis|vue signal synthesis"`
  - `pnpm check:docs`
  - `pnpm check:package`
  - `node --test ./tests/package-boundary-smoke.test.mjs`
  - `pnpm release:check`

阶段收口判断：

- `vue-analysis` 的后续新增能力已有更明确的拆层落点，不再优先往单一文件回堆 template、script 与 synthesis 逻辑。
- release / package 边界相关的剩余维护热点至少又收敛了一处，发布边界脚本与 smoke 测试不再继续复制 `npm pack` 调用逻辑。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现已对齐，可继续作为后续结构优化的基础。

结论：

- `P5-10` 已按原阶段定义收口；下一阶段应继续处理 `project-scan` 的扫描编排与聚合热点，而不是回到功能扩张。

## 1.4.7 / P5-11 扫描编排与聚合边界第五版

阶段目标：

- 在 `P5-10` 已完成 `vue-analysis` 拆层、维护说明补齐和 package/release 热点收敛的基础上，继续处理 `project-scan` 里仍偏集中的扫描编排与聚合边界。
- 优先把 `scan-engine`、相邻信号聚合或项目级汇总里“新增能力容易继续回堆主流程”的位置再拆清楚，避免规则层稳定后热点重新回流到 orchestration。
- 同时保持已收口的 `vue-analysis`、发布边界 smoke 和 release 检查链路稳定，不把这轮结构变化重新扩散到 npm 发布面。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- `src/project-scan/scan-engine.mjs` 已收窄为 orchestration，只负责串联输入采集、逐文件分析和项目级结果拼装。
- `src/project-scan/scan-inputs.mjs` 已承接项目文件读取、目录结构探测、view file 枚举与 framework signals 汇总，不再让这些输入采集细节继续堆在 `scan-engine` 主流程里。
- `src/project-scan/scan-analysis.mjs` 已承接逐文件 signals 收集、component usage 汇总、file role 聚合以及 graph / pattern 分析的项目内分析层逻辑。
- `src/project-scan/scan-result-builder.mjs` 已承接 project profile、pattern artifact 与项目级摘要拼装，避免新增 profile 汇总或输出结构时继续直接改 orchestration 主流程。
- `docs/maintenance-guide.md` 已补充 `scan-inputs`、`scan-analysis`、`scan-result-builder` 与 `scan-engine` 的职责边界，约束后续新增输入采集、项目级汇总与 profile 聚合的落点。
- `tests/project-scan.test.mjs` 已新增针对 `collectProjectScanInputs`、`analyzeProjectViewFiles`、`buildProjectScanAnalysis` 与 `buildProjectScanResult` 的直接边界断言，保证这轮拆分不是单纯文件搬家。
- 本阶段关键回归基线已补齐并通过：
  - `node --test ./tests/project-scan.test.mjs --test-name-pattern "project scan orchestration keeps scan inputs|scan-project writes analysis artifacts|component graph links|component propagation reaches|scan-project tolerates malformed vue files"`
  - `pnpm check:docs`

阶段收口判断：

- `project-scan` 的扫描编排或项目级聚合后续新增能力已有更明确的落点，不再优先回堆到单一 orchestration 主流程。
- 已收口的 `vue-analysis`、detector 目录化与 package/release 边界校验在本阶段结构变化后仍保持稳定，没有出现热点回流。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现已对齐，可继续作为后续结构优化的基础。

结论：

- `P5-11` 已按原阶段定义收口；下一阶段应继续处理 `project-scan` 的服务装配与评审聚合边界，而不是回到功能扩张。

## 1.4.7 / P5-12 服务装配与评审边界第六版

阶段目标：

- 在 `P5-11` 已完成 `scan-engine` orchestration 收窄、扫描输入 / 分析 / 结果拼装拆层的基础上，继续处理 `project-scan` 仍偏集中的服务装配与评审聚合边界。
- 优先把 `src/project-scan/index.mjs` 里 service composition、pattern feedback review、scan + generation 联动这些“后续能力容易继续堆回一个 service 文件”的位置再拆清楚。
- 同时保持已收口的 `scan-engine`、`vue-analysis`、发布边界 smoke 和 release 检查链路稳定，不把这轮结构变化重新扩散到 npm 发布面。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- `src/project-scan/project-scan-review-service.mjs` 已承接 pattern feedback override、review 决策校验与 review 结果回写，`src/project-scan/index.mjs` 不再直接维护整段 review 细节。
- `src/project-scan/project-scan-pipeline-service.mjs` 已承接 scan + generation handoff，`src/project-scan/index.mjs` 不再直接维护扫描后草案生成联动流程。
- `src/project-scan/index.mjs` 目前主要保留 `project-scan` service composition、分析产物装配与对外 service contract，结构上更接近纯装配层。
- `docs/maintenance-guide.md` 已补充 review service、pipeline service 与 `index.mjs` 的职责边界，约束后续新增 review 或 scan handoff 行为的落点。
- `tests/project-scan.test.mjs` 已新增针对 `createProjectScanReviewService(...)` 与 `createProjectScanPipelineService(...)` 的直接边界断言。
- 本阶段关键回归基线已补齐并通过：
  - `node --test ./tests/project-scan.test.mjs --test-name-pattern "project scan review service owns|project scan pipeline service owns|review-project-pattern feedback overrides|init runs project scan by default|project scan orchestration keeps scan inputs"`
  - `pnpm check:docs`

阶段收口判断：

- `project-scan` 的服务装配或评审聚合后续新增能力已有更明确的落点，不再优先回堆到单一 service composition / review 入口。
- 已收口的 `scan-engine`、`vue-analysis`、detector 目录化与 package/release 边界校验在本阶段结构变化后仍保持稳定，不出现热点回流。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现已对齐，可继续作为后续结构优化的基础。

结论：

- `P5-12` 已按原阶段定义收口；下一阶段应继续处理 `project-scan` 的图传播与模式聚合热点，而不是回到功能扩张。

## 1.4.7 / P5-13 图传播与模式聚合第七版

阶段目标：

- 在 `P5-12` 已完成 `project-scan` service composition、review service 与 pipeline handoff 收口的基础上，继续处理图传播与模式聚合这一批仍偏集中的规则聚合热点。
- 优先把 `component-graph.mjs`、`pattern-aggregation.mjs` 里“新增传播规则、聚合字段或关联摘要就容易继续堆大文件”的位置再拆清楚。
- 同时保持已收口的 `scan-engine`、`index.mjs`、`vue-analysis`、发布边界 smoke 和 release 检查链路稳定，不把这轮结构变化重新扩散到 npm 发布面。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- `src/project-scan/component-graph.mjs` 已退回兼容导出层，graph 构建、propagation 分析和 signals enrichment 分拆到了 `src/project-scan/component-graph/` 下的独立模块。
- `src/project-scan/component-graph/graph-builders.mjs` 已承接组件引用边构建、template import 解析与 graph summary 字段；后续新增 graph 规则不再默认回堆到兼容入口。
- `src/project-scan/component-graph/propagation-analysis.mjs` 已承接 relation propagation、reach depth 与跨组件 fragment 传播分析；后续新增传播规则有了明确落点。
- `src/project-scan/component-graph/signal-enrichment.mjs` 已承接 graph / propagation 对单文件 signals 的回灌；后续新增关联字段不再继续混在 graph 构建逻辑里。
- `docs/maintenance-guide.md` 已补充 component graph 子层落点说明，明确 graph builder、propagation analysis、signal enrichment 与兼容导出层的职责边界。
- `tests/project-scan.test.mjs` 已新增针对 `buildComponentGraph(...)`、`buildComponentPropagation(...)` 与 `enrichSignalsWithComponentGraph(...)` 的直接 facade 断言，保证这轮拆分不是单纯文件搬家。
- 本阶段关键回归基线已补齐并通过：
  - `node --test ./tests/project-scan.test.mjs --test-name-pattern "component graph facade|component graph links|component propagation reaches|project scan orchestration keeps"`
  - `pnpm check:docs`
  - `pnpm check:package`
  - `pnpm release:check`
  - `pnpm test`

阶段收口判断：

- `component-graph` 的后续新增能力已有更明确的落点，不再优先回堆到单一传播 / 聚合热点文件。
- 已收口的 `scan-engine`、`index.mjs`、`vue-analysis`、detector 目录化与 package/release 边界校验在本阶段结构变化后仍保持稳定，不出现热点回流。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现已对齐，可继续作为后续结构优化的基础。

结论：

- `P5-13` 已按原阶段定义收口；下一阶段应继续处理 `pattern-aggregation` 与项目级关联摘要热点，而不是回到功能扩张。

## 1.4.7 / P5-14 模式聚合与关联摘要第八版

阶段目标：

- 在 `P5-13` 已完成 component graph 子层拆分的基础上，继续处理 `pattern-aggregation` 与项目级关联摘要这一批仍偏集中的聚合热点。
- 优先把 `pattern-aggregation.mjs` 里“新增 aggregate 累积字段、sample summary 或关联摘要就容易继续堆大文件”的位置再拆清楚。
- 同时保持已收口的 `component-graph`、`scan-engine`、`index.mjs`、`vue-analysis`、发布边界 smoke 和 release 检查链路稳定，不把这轮结构变化重新扩散到 npm 发布面。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- `src/project-scan/pattern-aggregation.mjs` 已退回兼容导出层，pattern aggregate collection 与结果构建分拆到了 `src/project-scan/pattern-aggregation/` 下的独立模块。
- `src/project-scan/pattern-aggregation/aggregate-collector.mjs` 已承接 aggregate 累积、matched file entry 组装和聚合收集规则；后续新增聚合字段不再默认回堆到兼容入口。
- `src/project-scan/pattern-aggregation/pattern-result-builder.mjs` 已承接 aggregate summary、sample file 选择与最终 pattern payload 拼装；后续新增 pattern summary 规则有了明确落点。
- `src/project-scan/scan-result-builder.mjs` 已退回兼容导出层，page pattern summary、project profile artifact 与最终 result payload 分拆到了 `src/project-scan/scan-result/` 下的独立模块。
- `src/project-scan/scan-result/pattern-profile-summary.mjs` 已承接项目级 page pattern summary / frequency counters；`src/project-scan/scan-result/project-profile-builder.mjs` 与 `result-payload-builder.mjs` 已分别承接 project profile 和最终结果包装。
- `docs/maintenance-guide.md` 已补充 pattern aggregation 与 scan result 子层落点说明，明确 aggregate collector、pattern result builder、pattern profile summary、project profile builder 与 result payload builder 的职责边界。
- `tests/project-scan.test.mjs` 已新增针对 `collectPatternAggregates(...)`、`buildAggregatedPatterns(...)`、`buildProjectPagePatternSummary(...)`、`buildProjectProfileArtifact(...)` 与 `buildProjectScanResult(...)` 的直接 facade 断言，保证这轮拆分不是单纯文件搬家。
- 本阶段关键回归基线已补齐并通过：
  - `node --test ./tests/project-scan.test.mjs --test-name-pattern "pattern aggregation facade|scan result facade|project scan orchestration keeps|scan-project writes analysis artifacts|component graph facade"`
  - `pnpm check:docs`
  - `pnpm check:package`
  - `pnpm release:check`
  - `pnpm test`

阶段收口判断：

- `pattern-aggregation` 的后续新增能力已有更明确的落点，不再优先回堆到单一模式聚合热点文件。
- 项目级 pattern 关联摘要或结果拼装至少又收敛了一处，避免结构评估已收口但 summary 侧仍保留明显集中热点。
- 已收口的 `component-graph`、`scan-engine`、`index.mjs`、`vue-analysis`、detector 目录化与 package/release 边界校验在本阶段结构变化后仍保持稳定，不出现热点回流。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现已对齐，可继续作为后续结构优化的基础。

结论：

- `P5-14` 已按原阶段定义收口；下一阶段应继续处理 project-scan 的结果投影与报告渲染热点，而不是回到功能扩张。

## 1.4.7 / P5-15 结果投影与报告渲染第九版

阶段目标：

- 在 `P5-14` 已完成 pattern aggregation 与 scan result 子层拆分的基础上，继续处理 `analysis-artifact-store`、`report-renderers` 这批仍偏集中的结果投影与报告渲染热点。
- 优先把“新增 artifact report、summary markdown 或结果投影规则就容易继续堆大文件”的位置再拆清楚。
- 同时保持已收口的 `component-graph`、`pattern-aggregation`、`scan-result`、`scan-engine`、`index.mjs`、`vue-analysis`、发布边界 smoke 和 release 检查链路稳定，不把这轮结构变化重新扩散到 npm 发布面。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- `src/project-scan/report-renderers.mjs` 已退回兼容导出层，scan summary、scan diff、component graph summary 与 component propagation summary markdown renderer 分拆到了 `src/project-scan/report-renderers/` 下的独立模块。
- `src/project-scan/report-renderers/scan-summary-renderer.mjs` 已承接项目扫描摘要 markdown 渲染；后续新增 summary 字段不再默认回堆到兼容入口。
- `src/project-scan/report-renderers/scan-diff-renderer.mjs` 已承接 diff markdown 渲染；`component-graph-renderer.mjs` 与 `component-propagation-renderer.mjs` 已分别承接图摘要与传播摘要的独立报告输出。
- `docs/maintenance-guide.md` 已补充 report renderer 子层落点说明，明确 scan summary、scan diff、component graph / propagation report 与兼容导出层的职责边界。
- `tests/project-scan.test.mjs` 已新增针对 `buildScanSummaryMarkdown(...)`、`buildScanDiffMarkdown(...)`、`buildComponentGraphSummaryMarkdown(...)` 与 `buildComponentPropagationSummaryMarkdown(...)` 的直接 facade 断言，保证这轮拆分不是单纯文件搬家。
- 本阶段关键回归基线已补齐并通过：
  - `node --test ./tests/project-scan.test.mjs --test-name-pattern "report renderer facade|scan-project writes analysis artifacts|scan result facade|pattern aggregation facade|component graph facade"`
  - `pnpm check:docs`
  - `pnpm check:package`
  - `pnpm release:check`
  - `pnpm test`

阶段收口判断：

- `report-renderers` 的后续新增能力已有更明确的落点，不再优先回堆到单一结果投影 / 报告热点文件。
- 项目级 report summary 至少又收敛了一处，避免结构评估已收口但输出侧仍保留明显集中热点。
- 已收口的 `component-graph`、`pattern-aggregation`、`scan-result`、`scan-engine`、`index.mjs`、`vue-analysis`、detector 目录化与 package/release 边界校验在本阶段结构变化后仍保持稳定，不出现热点回流。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现已对齐，可继续作为后续结构优化的基础。

结论：

- `P5-15` 已按原阶段定义收口；下一阶段应继续处理 `analysis-artifact-store` 的 artifact projection 与写盘热点，而不是回到功能扩张。

## 1.4.7 / P5-16 Artifact Projection 与写盘边界第十版

阶段目标：

- 在 `P5-15` 已完成 report renderer 子层拆分的基础上，继续处理 `analysis-artifact-store` 这块仍偏集中的 artifact projection 与写盘热点。
- 优先把“新增 artifact payload、write contract 或 report output path 就容易继续堆大文件”的位置再拆清楚。
- 同时保持已收口的 `component-graph`、`pattern-aggregation`、`scan-result`、`report-renderers`、`scan-engine`、`index.mjs`、`vue-analysis`、发布边界 smoke 和 release 检查链路稳定，不把这轮结构变化重新扩散到 npm 发布面。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

已完成：

- `src/project-scan/analysis-artifact-store.mjs` 已退回兼容导出层，artifact loader、json artifact write projection 与 report write persistence 分拆到了 `src/project-scan/analysis-artifact-store/` 下的独立模块。
- `src/project-scan/analysis-artifact-store/artifact-loader.mjs` 已承接 artifact 存在性校验、load contract 与 pattern feedback fallback；后续新增 load / read 规则不再默认回堆到兼容入口。
- `src/project-scan/analysis-artifact-store/artifact-json-writer.mjs` 已承接 analysis json artifact projection 与持久化字段写盘；后续新增 artifact payload 字段有了明确落点。
- `src/project-scan/analysis-artifact-store/artifact-report-writer.mjs` 已承接 markdown report 输出与写盘 persistence；后续新增 report output path 或 write 规则不再继续混在 loader / json projection 逻辑里。
- `docs/maintenance-guide.md` 已补充 artifact loader、json writer、report writer 与兼容导出层的职责边界。
- `tests/project-scan.test.mjs` 已新增针对 `loadAnalysisArtifacts(...)` 与 `writeProjectAnalysisArtifacts(...)` 的直接 facade 断言，覆盖 load / json projection / report write 三类 contract。
- 本阶段关键回归基线已补齐并通过：
  - `node --test ./tests/project-scan.test.mjs --test-name-pattern "analysis artifact store facade|report renderer facade|scan-project writes analysis artifacts|scan result facade|pattern aggregation facade|component graph facade"`
  - `pnpm check:docs`
  - `pnpm check:package`
  - `pnpm release:check`

阶段收口判断：

- `analysis-artifact-store` 的后续新增能力已有更明确的落点，不再优先回堆到单一 artifact projection / write 热点文件。
- 项目级 artifact payload 或 write projection 至少又收敛了一处，避免结构评估已收口但写盘侧仍保留明显集中热点。
- 已收口的 `component-graph`、`pattern-aggregation`、`scan-result`、`report-renderers`、`scan-engine`、`index.mjs`、`vue-analysis`、detector 目录化与 package/release 边界校验在本阶段结构变化后仍保持稳定，不出现热点回流。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现已对齐，可继续作为后续结构优化的基础。

结论：

- `P5-16` 已按原阶段定义收口；下一阶段如继续推进，应转向当前路线图明确排除的新增能力立项，而不是继续在同一条结构收口主线上做无目的拆分。

## 1.4.7 / P6-1 自动晋升与自动注册规划第一版

阶段目标：

- 在 `P5-16` 已完成 `project-scan`、artifact projection、report renderer 与 release/check 边界收口的基础上，正式规划四类高风险自动化扩边：`project-local` 自动晋升到 `manual`、`shared skill` 自动正式晋升、wrapper 自动注册、release 自动发版。
- 先把四条自动化链路的前置状态、治理闸口、触发条件、dry-run / manual-confirm 边界和推荐推进顺序写清楚，避免一开始就把“自动草案晋升”“正式注册”“真实发布”混成一条不可控流水线。
- 保持现有 `project-local` 草案生成、evolution proposal / draft handoff、wrapper promotion lifecycle、release checks 与 package/release 边界稳定，不在这一阶段直接抹掉人工复核边界。
- 保持“先立策略与闸口、再开自动动作”的节奏，不在这一阶段直接追求四条链路全部正式自动执行。

已完成：

- 已明确四类动作的统一任务分层，固定了：
  - 当前人工边界
  - 目标自动化边界
  - 触发条件
  - 阻断条件
  - 回退路径
- 已明确推荐推进顺序与依赖关系：
  1. `project-local -> manual`
  2. `shared skill` 自动正式晋升
  3. wrapper 自动注册
  4. release 自动发版
- 已明确首批只进入“策略判定、dry-run / plan 输出、人工确认接口”的最小范围，不直接进入真实注册或真实发布。
- 已完成 `project-local -> manual` 第一版低风险实现：
  - 新增 `src/project-scan/project-local-promotion-planner.mjs`
  - `src/project-scan/project-local-lifecycle-service.mjs` 已接入 `planProjectLocalPromotions(...)`
  - 新增 CLI 入口 `plan-project-local-promotions [--skill <skill-name>] [--json]`
  - 资格判定来源已固定为 `project-local` 草案 `skill.meta.json` 中的 `reviewDecision / frequency / reuseScore / purityScore / confidence`，并检查是否已存在同名 `manual` skill
  - 人工确认落点保持为 `npx power-ai-skills promote-project-local-skill <skill-name>`
- `docs/upgrade-roadmap.md`、`docs/command-manual.md`、`docs/maintenance-guide.md` 已同步收口这轮规划和第一版 planner 落点。

阶段收口判断：

- 四类自动化方向已经不再停留在“以后自动化”的模糊描述，而是形成了统一的治理边界表达。
- 低风险到高风险的推进顺序已经明确，后续进入实现时不再需要重新讨论“先做哪条、为什么”。
- `project-local -> manual` 已从单纯规划推进到可执行 dry-run 能力，为后续 `shared skill` / wrapper / release 三条链路提供了模板。
- 当前已收口的 `project-scan`、evolution proposal / draft、wrapper promotion lifecycle、release checks 与 package/release 边界在规划阶段保持稳定，没有为了规划提前打破人工边界。

结论：

- `P6-1` 已按原阶段定义收口；下一阶段应进入 `shared skill` 自动正式晋升 dry-run 第一版，而不是继续停留在统一规划层。

## 1.4.7 / P6-2 shared skill 自动正式晋升 dry-run 第一版

阶段目标：

- 在 `P6-1` 已完成四类高风险自动化统一分层规划、并已落地 `project-local -> manual` dry-run planner 的基础上，开始第二条链路：`shared skill` 自动正式晋升。
- 先补“资格判定 + dry-run / plan 输出 + 人工确认落点”，保持正式 shared skill catalog 写入仍然人工执行，不直接绕过治理闸口。
- 明确 `shared-skill-draft` 到仓库真实 `skills/` 目录的目标落点表达，避免后续一上来就把草案 promotion 和正式资产写入揉成一条黑盒动作。
- 保持现有 evolution proposal / draft handoff、`list-evolution-drafts` / `show-evolution-draft`、doctor / governance summary / release gates 的治理语义稳定，不在这一阶段直接开启 shared skill 正式写入。

已完成：

- 已新增 `src/evolution/shared-skill-promotion-planner.mjs`，把 `shared-skill-draft -> skills/` 正式目录的 dry-run 资格判定从 evolution proposal manager 中拆出，单独承接：
  - proposal 状态来源
  - draft `skill.meta.json` 元数据来源
  - handoff owner / status / next action 来源
  - `manual-checklist.md` 存在性校验
  - shared catalog 目标目录与冲突判断
- 已新增 CLI 入口 `plan-shared-skill-promotions [--skill <skill-name>] [--draft <draft-id>] [--proposal <proposal-id>] [--json]`，用于输出：
  - `eligible / blocked`
  - 阻断原因
  - 建议目标目录 `skills/<group>/<skill-name>`
  - 人工确认脚手架命令 `node ./scripts/scaffold-skill.mjs <skill-name> <group>`
  - 校验命令 `pnpm ci:check`
- 已固定 shared skill 正式目录映射规则：
  - `skillName` 优先取 draft `skill.meta.json.name`，其次回退到 proposal evidence 中的 `recommendedSkillName`
  - `group` 优先取 draft / proposal 显式 metadata
  - 如 catalog 中已存在唯一同名 shared skill，则复用现有 group
  - 如仍无显式 group，则按 skillName / sceneType / source pattern 做保守推断
  - 如同名 skill 已存在于正式 catalog，第一版默认阻断覆盖；只有显式允许覆盖时才进入候选
- 已保持人工边界稳定：planner 只做 dry-run / plan，不直接写入仓库 `skills/`。
- `docs/command-manual.md`、`docs/maintenance-guide.md`、`docs/upgrade-roadmap.md` 已同步收口 shared skill promotion planner 的职责边界和人工确认边界。
- 已补充自动化测试，覆盖：
  - eligible shared skill draft
  - catalog 已存在同名 shared skill 的阻断
  - 无法确定 target group 的阻断
  - 新命令的 `project root` 解析策略

阶段收口判断：

- `shared skill` 自动正式晋升已经不再停留在模糊设想，而是具备清晰的资格判定来源和 dry-run contract。
- shared skill draft、正式 `skills/` 目录和人工确认边界的职责已经被写清楚，不会再把 draft handoff 误当成正式 catalog 注册。
- `project-local -> manual` 与 `shared skill -> skills/` 两条自动晋升链路现在都具备最小 dry-run 模板，可为后续 wrapper / release 自动化继续复用。
- 当前已收口的 evolution proposal / draft、governance summary、doctor、release gates 与 package/release 边界在本阶段保持稳定，没有为了 planner 提前打破人工边界。

结论：

- `P6-2` 已按原阶段定义收口；下一阶段应进入 wrapper 自动注册的 dry-run 规划 / 实现阶段，而不是继续回到 shared skill 资格判定讨论。

## 1.4.7 / P6-3 wrapper 自动注册 dry-run 第一版

阶段目标：

- 在 `P6-2` 已完成 `shared skill` 自动正式晋升 dry-run planner 的基础上，开始第三条链路：wrapper 自动注册。
- 先补“资格判定 + dry-run / plan 输出 + 人工确认落点”，保持真实 wrapper registry 写入仍然人工执行，不直接绕过治理闸口。
- 明确 wrapper promotion proposal、materialized artifact、finalized status 与真实 registry 落点之间的状态边界，避免后续把 wrapper draft、registry 变更和发布动作揉成一条黑盒流程。
- 保持现有 wrapper promotion lifecycle、`list-wrapper-promotions` / `show-wrapper-promotion-timeline` / `generate-wrapper-registry-governance`、doctor / governance summary / release gates 的治理语义稳定，不在这一阶段直接开启真实 registry 注册。

已完成：

- 已新增 `src/conversation-miner/wrapper-registration-planner.mjs`，把 wrapper promotion proposal 的注册资格判定从 lifecycle / audit 流程中拆出，单独承接：
  - proposal 状态来源
  - materialization / application / finalization / registration 状态来源
  - follow-up checklist 与 pending follow-up 来源
  - registration artifact 存在性与 bundle 内容来源
  - 内置 wrapper registry 冲突判断来源
- 已新增 CLI 入口 `plan-wrapper-registrations [--tool <tool-name>] [--json]`，用于输出：
  - `eligible / blocked`
  - 阻断原因
  - 建议目标 registry 落点
  - 建议写入 entry
  - `append-new-wrapper-entry` / `conflict-existing-wrapper-entry` / `overwrite-existing-wrapper-entry` 动作
  - 人工确认命令 `npx power-ai-skills register-wrapper-promotion --tool <tool-name>`
- 已固定 wrapper registry 第一版映射规则：
  - 真实落点固定为 `src/conversation-miner/wrappers.mjs`
  - `toolName` 取 proposal `toolName`
  - `displayName` 取 proposal `displayName`
  - `integrationStyle` 取 proposal `integrationStyle`
  - `commandName` 优先取 materialized bundle 中的 `artifacts.commandName`，缺失时退回 `<tool>-capture-session` 派生规则
  - 如命中内置 wrapper，同名 proposal 默认阻断；只有显式允许 overwrite 时才进入覆盖候选
- 已保持人工边界稳定：planner 只做 dry-run / plan，不直接写入 `src/conversation-miner/wrappers.mjs`，也不自动执行 `register-wrapper-promotion`。
- `docs/command-manual.md`、`docs/upgrade-roadmap.md` 已同步收口 wrapper registration planner 的职责边界和人工确认边界。
- 已补充自动化测试，覆盖：
  - eligible wrapper proposal
  - 未 finalize proposal 的阻断
  - 命中内置 wrapper 的冲突阻断
  - 显式允许 overwrite 后的覆盖候选
  - 新命令的 `project root` 解析策略

阶段收口判断：

- wrapper 自动注册已经不再停留在模糊设想，而是具备清晰的资格判定来源和 dry-run contract。
- wrapper proposal、真实 registry 和人工确认边界的职责已经被写清楚，不会再把 finalized proposal 误当成已正式注册的 wrapper。
- `project-local -> manual`、`shared skill -> skills/`、`wrapper -> registry` 三条链路现在都具备最小 dry-run 模板，可为后续 release 自动化继续复用。
- 当前已收口的 wrapper promotion lifecycle、governance summary、doctor、release gates 与 package/release 边界在本阶段保持稳定，没有为了 planner 提前打破人工边界。

结论：

- `P6-3` 已按原阶段定义收口；下一阶段应进入 release 自动发版的 dry-run 规划 / 实现阶段，而不是继续停留在 wrapper 注册资格判定讨论。

## 1.4.7 / P6-4 release 自动发版 dry-run 第一版

阶段目标：

- 在 `P6-3` 已完成 wrapper 自动注册 dry-run planner 的基础上，开始第四条链路：release 自动发版。
- 先补“资格判定 + dry-run / plan 输出 + 人工确认落点”，保持真实发版动作仍然人工执行，不直接绕过 package / release 治理闸口。
- 明确 release governance artifact、automation report、release gates、version record、notification payload 与真实 `npm publish` / 私服发布动作之间的状态边界，避免后续把“已生成发布材料”误当成“已正式发版”。
- 保持现有 `release:prepare`、`release:check`、`upgrade:advice`、`upgrade:payload`、`governance:operations`、package-maintenance `doctor` 与 manifest 产物语义稳定，不在这一阶段直接开启真实发布。

已完成：

- 已新增 `src/release-publish-planner.mjs`，把 release publish dry-run 资格判定从手工发布步骤中抽出，单独承接：
  - `automation-report.json`
  - `version-record.json`
  - `release-gate-report.json`
  - `governance-operations-report.json`
  - `upgrade-advice-package.json`
  - notification payload
  - `package.json publishConfig.registry`
- 已新增 CLI 入口 `plan-release-publish [--json]`，用于输出：
  - `eligible / blocked`
  - 阻断原因
  - 建议目标发布落点 `targetPublish`
  - artifact evidence
  - 建议人工确认步骤与 `npm publish` 命令
- 已固定 release publish 第一版映射规则：
  - `packageName` 取 `package.json name`
  - `version` 取 `package.json version`
  - `registryUrl` 取 `package.json publishConfig.registry`
  - `publishCommand` 优先生成为 `npm publish --registry "<registry>"`
  - release gate 允许 `pass` / `warn`，但 `warn` 仍要求显式 acknowledgement
  - planner 默认要求 version record、notification payload 与当前 `package.json version` 一致
- 已保持人工边界稳定：planner 只做 dry-run / plan，不直接执行真实 `npm publish`，也不自动刷新版本号或绕过现有 release checks。
- `docs/command-manual.md`、`docs/upgrade-roadmap.md` 已同步收口 release publish planner 的职责边界和人工确认边界。
- 已补充自动化测试，覆盖：
  - eligible release snapshot
  - version mismatch / release gate fail / blocked advice 的阻断
  - `warn` 但要求显式 acknowledgement 的可发布场景
  - 新命令的 `project root` 解析策略

阶段收口判断：

- release 自动发版已经不再停留在模糊设想，而是具备清晰的资格判定来源和 dry-run contract。
- release artifact、目标 registry、真实 publish 与人工确认边界的职责已经被写清楚，不会再把 planner 输出误当成真实发版完成。
- `project-local -> manual`、`shared skill -> skills/`、`wrapper -> registry`、`release -> publish-plan` 四条链路现在都具备最小 dry-run 模板。
- 当前已收口的 governance summary、doctor、release gates 与 package/release 边界在本阶段保持稳定，没有为了 planner 提前打破人工边界。

结论：

- `P6-4` 已按原阶段定义收口；下一阶段应进入“release 受控执行第一版”，而不是继续停留在 dry-run 资格判定讨论，或直接跳到无人值守自动 publish。

## 1.4.7 / P6-5 release 受控执行第一版

阶段目标：

- 在 `P6-4` 已完成 release publish dry-run planner 的基础上，进入“真实执行但仍保留显式人工确认”的下一层，而不是直接跳到无人值守自动 publish。
- 让发布动作从“手工照着 planner 输出敲命令”升级为“受控 CLI 执行入口”，仍要求 package root、实时复核和显式确认，不能绕过现有 release 治理闸口。
- 明确 `plan-release-publish`、实时 artifact 复核、最终 `npm publish` 执行与 publish 结果记录之间的状态边界，避免后续把 dry-run 结果当成已完成发版。
- 保持现有 `release:prepare`、`release:check`、`upgrade:advice`、`upgrade:payload`、`governance:operations`、package-maintenance `doctor` 与 manifest 产物语义稳定，不在这一阶段引入无人值守定时发版。

已完成：

- 已新增 `src/release-publish-guidance.mjs`，统一承接 planner / executor 的 `nextAction` 和命令建议拼装。
- 已新增 `execute-release-publish [--confirm] [--acknowledge-warnings] --json` 受控入口，并固定：
  - 只能在 package-maintenance 模式和 package root 下运行
  - 每次执行前重新运行最新 planner，而不是复用旧 dry-run 结果
  - 缺少 `--confirm` 时返回 `confirmation-required`
  - warn-level release readiness 缺少 `--acknowledge-warnings` 时返回 `acknowledgement-required`
- 已把 `manifest/release-publish-record.json`、`manifest/release-publish-records/`、`manifest/release-publish-failure-summary.md`、`manifest/version-record.json.publishExecutionSummary` 收口为统一 publish record contract，并补充：
  - `nextAction`
  - `realPublishEnabled`
  - `publishResult`
  - 成功 / 失败后对 failure summary 的清理或保留规则
- 已先以 skeleton 方式固化执行 contract，再把真实 publish 接入同一 contract：
  - 受控闸口通过后会真正执行 `npm publish`
  - 成功时状态为 `published`
  - 失败时状态为 `publish-failed`
  - publish 尝试结果会记录 `exitCode`、stdout/stderr 摘要和错误消息
- 已把 `doctor`、upgrade summary、CLI 文本输出、refresh-release-artifacts 对 `publishExecutionSummary` 的读取逻辑全部同步到真实 publish 语义。
- 已同步更新 `docs/command-manual.md`、`docs/maintenance-guide.md`、`docs/release-process.md`、`docs/doctor-error-codes.md`、`docs/upgrade-roadmap.md`，收口：
  - 受控执行与无人值守自动 publish 的边界
  - `published / publish-failed` 状态语义
  - 维护者在真实 publish 前后的操作顺序
- 已补充自动化测试，覆盖：
  - planner 的 `nextAction` 输出
  - executor 的确认闸口 / warn acknowledgement / 真正 publish 成功 / 真正 publish 失败
  - refresh-release-artifacts 对 publishExecutionSummary 的保真回写
  - doctor / upgrade summary 对真实 publish 状态的摘要
- `pnpm ci:check` 已完整通过。

阶段收口判断：

- release 已从“纯手工照命令执行”升级为“有受控 CLI 入口、带显式确认和执行前复核”的第一版真实执行链路。
- planner、执行前复核、真实 publish 与结果记录之间的职责已经被写清楚，不会再把 dry-run 输出误当成真实发版完成。
- 当前 record contract、doctor、upgrade summary、release-process 文档和维护入口已经对齐，为后续更进一步的发布编排提供稳定基础。

结论：

- `P6-5` 已按原阶段定义收口；下一阶段应进入“自动发布编排”，讨论如何在不丢失当前人工边界和治理闸口的前提下，编排更完整的 release 自动化，而不是回退到单点执行 contract 的细节修补。

## 1.4.7 / P6-6 自动发布编排第一版

阶段目标：

- 在 `P6-5` 已完成受控 release publish 执行链路的基础上，开始规划“自动发布编排”这一更高层能力，而不是继续停留在单次执行命令 contract。
- 把当前已经存在的 `release:prepare`、`plan-release-publish`、`execute-release-publish`、consumer compatibility、release gates、governance summary 和 notification 产物串成一条可编排的发布流水线，但仍保留治理闸口与人工确认边界。
- 明确“受控执行单点命令”与“多步骤发布编排”的职责边界，避免后续为了追求自动化而重新打散现有 planner / executor / publish record contract。
- 保持现有 package-maintenance `doctor`、upgrade summary、release artifacts 与 record contract 语义稳定，不在这一阶段直接引入无人值守定时发版。

已完成：

- 已设计自动发布编排第一版的 stage model，明确 `prepare / plan / publish / post-publish` 的阶段划分与状态流转。
  - 当前已固定四段：`prepare-release-artifacts`、`plan-controlled-publish`、`execute-controlled-publish`、`post-publish-follow-up`
  - 当前已明确主状态：`blocked`、`ready-for-controlled-publish`、`published-awaiting-follow-up`
- 已增加编排级 dry-run / plan 入口，至少输出步骤清单、阻断原因、人工确认闸口和建议下一步。
  - 已完成 `plan-release-orchestration [--json]`
  - 已落盘 `manifest/release-orchestration-record.json` 与历史记录目录
- 已明确编排级 record contract 与现有 `release-publish-record.json`、`version-record.json.publishExecutionSummary` 的关系，避免状态重复或语义冲突。
  - 编排层权威快照：`manifest/release-orchestration-record.json`
  - 版本记录回填：`manifest/version-record.json.releaseOrchestrationSummary`
  - 真实 publish 权威记录仍是：`manifest/release-publish-record.json` / `manifest/version-record.json.publishExecutionSummary`
- 已在维护文档里固定“受控单次 publish”与“多步骤自动发布编排”的边界，避免后续把编排入口误读成无人值守自动发版。
  - 已同步 `docs/command-manual.md`
  - 已同步 `docs/release-process.md`
  - 已同步 `docs/maintenance-guide.md`
- 已增加编排驱动的受控串行执行入口，在不越过真实 publish 人工闸口的前提下推进 pre-publish 步骤。
  - 已完成 `execute-release-orchestration [--json]`
  - 当前会自动顺序运行 `refresh-release-artifacts`、`release:validate`、`release:check`、`release:generate`
  - 当前会在到达 `execute-controlled-publish` 人工闸口前停止，不会自动触发真实 publish

阶段收口判断：

- 发布流程不再只是分散的手工脚本和单点命令，而是具备清晰编排模型、可读 plan 输出和稳定的人工确认落点。
- `release:prepare`、planner、真实 publish、结果记录、通知 follow-up 之间的顺序与职责已经被写清楚，不会再因为进入编排阶段而打散现有 record contract。
- 编排层已经能稳定复用现有 release artifacts、doctor、upgrade summary、version record 和 publish record 语义，而不是另起一套发布状态模型。
- 当前已收口的 package / release 治理边界、warn acknowledgement 和真实 publish 人工闸口在本阶段保持稳定，没有为了编排提前滑向无人值守自动发版。

结论：

- `P6-6` 已按原阶段定义收口；下一阶段应先明确是否正式立项“无人值守发布治理”，或改为别的后续主题，而不是继续把已完成的编排阶段挂在当前路线图中。

## 1.4.7 / P6-7 无人值守发布治理第一版

阶段目标：

- 在 `P6-6` 已完成自动发布编排第一版的基础上，继续向上补“无人值守发布治理”这一层，但先补治理 contract，不直接跳到定时自动发版。
- 明确什么条件下当前版本才具备“允许无人值守发布”的资格，避免把“编排层已 ready”误读成“可以随时自动 publish”。
- 把编排层状态、真实 publish 执行状态、治理授权、失败锁定和 follow-up 收口为一套可审计的治理语义，而不是继续依赖维护者记忆流程。
- 保持现有 `plan-release-orchestration`、`execute-release-orchestration`、`plan-release-publish`、`execute-release-publish`、package-maintenance `doctor`、upgrade summary 与 manifest record contract 语义稳定，不在这一阶段直接引入默认开启的定时任务。

已完成：

- 已把无人值守发布治理的资格模型、授权 artifact、治理 planner contract、失败锁定 / 冷却 / follow-up gate 设计沉淀到 `docs/technical-solutions/release-unattended-governance-design-1.4.7.md`。
- 已新增无人值守治理 planner 与 record persistence skeleton：
  - `src/release-unattended-governance-planner.mjs`
  - `src/release-unattended-governance-record.mjs`
- 已新增命令入口 `plan-release-unattended-governance [--json]`，并把命令注册表片段同步回 `docs/command-manual.md`。
- 已在维护文档中固定三层状态边界：
  - 编排已 ready
  - 已授权无人值守候选
  - 真实 publish 已执行
  - 已同步 `docs/release-process.md`
  - 已同步 `docs/maintenance-guide.md`
- 已补充自动化测试，覆盖：
  - 授权缺失
  - 有效授权下的 `authorized-ready`
  - warn-level 阻断
  - `publish-failed-lock`
  - `follow-up-pending`
  - 版本变化导致的授权失效
  - 新增测试：`tests/release-unattended-governance-planner.test.mjs`

阶段收口判断：

- 无人值守治理已经不再停留在纯文档设想，而是具备可运行的 planner skeleton、record contract 和第一批关键治理场景测试。
- 编排 ready、治理授权候选和真实 publish 执行三层状态边界已经被写清楚，不会再把任意一层误读成另一层。
- 失败锁定、人工解锁、follow-up gate 和授权失效这些高风险状态已经有明确阻断语义，不会默认朝自动重试或自动继续推进滑动。
- 当前实现仍然保持了“先做治理判定与授权，再决定是否进入真正托管执行入口”的节奏，没有提前把设计稿误接成默认自动发版。

结论：

- `P6-7` 已按原阶段定义收口；下一阶段如继续推进，应单独立项真实托管执行入口或 CI / cron 执行边界，而不是回退到治理 contract 的重定义。

## 1.4.7 / P6-8 无人值守治理授权入口第一版

阶段目标：

- 在 `P6-7` 已完成无人值守治理 planner、record contract 和执行锁定语义的基础上，补齐“治理授权如何被正式发出”的第一版入口，而不是继续依赖手工编写 authorization fixture 或临时 JSON。
- 把当前治理 planner、authorization record、历史授权归档、`version-record.json.releaseUnattendedAuthorizationSummary` 和执行入口收口成一条可运行链路，但仍保持默认自动触发关闭。
- 明确“授权已发出”“治理状态已 ready”和“真实 publish 已执行”三层语义边界，避免后续把授权 record 误读成已经自动发版。
- 保持现有 `plan-release-unattended-governance`、`execute-release-unattended-governance`、`execute-release-publish`、doctor、upgrade summary 与 manifest record contract 语义稳定，不在这一阶段直接接入 cron、CI 或 webhook 自动触发。

已完成：

- 已新增 `src/release-unattended-authorization-service.mjs`，统一承接无人值守治理授权的正式写入：
  - 当前授权写入 `manifest/release-unattended-authorization.json`
  - 历史授权归档到 `manifest/release-unattended-authorizations/`
  - `manifest/version-record.json.releaseUnattendedAuthorizationSummary` 回填
- 已新增命令入口 `authorize-release-unattended-governance [--authorized-by <actor>] [--display-name <name>] [--reason <text>] [--expires-at <iso>] [--max-execution-count <n>] [--json]`，用于：
  - 在当前 release evidence 满足治理前提时正式发放授权
  - 复用现有 unattended governance planner 做前置资格复核
  - 输出下一步建议，明确继续走 `execute-release-unattended-governance`
- 已固定授权入口第一版生命周期规则：
  - 当前 active 授权存在时，新授权会先把旧授权标记为 `superseded`
  - 已消费或非 active 授权不会被误改写
  - 非法 `--expires-at` 会直接阻断，不写入脏 record
- 已把 CLI wiring、project output summary 与命令注册表同步到新授权入口，并补齐 `cwd` 解析规则。
- 已同步更新 `docs/maintenance-guide.md`、`docs/release-process.md`、`docs/upgrade-roadmap.md`，收口：
  - `plan -> authorize -> execute-release-unattended-governance` 的推荐顺序
  - authorization record 与 publish record 的语义边界
  - “当前已有授权入口，但仍未默认接入自动触发”的维护口径
- 已补充自动化测试，覆盖：
  - 首次授权创建
  - 旧 active 授权 supersede
  - warn-level 仍需人工 acknowledgement 时的阻断
  - 新命令的 `project root` 解析策略
  - 原有 unattended governance planner / executor 回归场景

阶段收口判断：

- 无人值守治理授权已经不再停留在设计稿或测试 fixture，而是具备正式 CLI 入口、稳定 record contract 和版本记录回填链路。
- `planner -> authorization -> executor -> publish record` 的职责边界已经被写清楚，不会再把“授权已发出”误读成“真实 publish 已执行”。
- 当前实现仍然保持了默认自动触发关闭、人工显式运行命令的边界，没有为了补授权入口提前滑向 cron / CI 自动发版。
- 维护文档、路线图和现有 unattended governance 测试已经同步到同一口径，后续可以在这个基础上继续讨论托管执行边界，而不是回退到 authorization contract 的缺口。

结论：

- `P6-8` 已按原阶段定义收口；下一阶段如继续推进，应单独立项真实托管执行入口或 CI / cron 托管执行边界，而不是继续停留在授权 record 的手工补写。
