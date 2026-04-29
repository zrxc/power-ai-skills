# 1.4.7 Unattended Release Governance Design

## Goal

在 `P6-6` 已完成自动发布编排第一版的基础上，为 release 增加“无人值守发布治理”这一层，但先补治理 contract，不直接跳到 cron / CI 定时自动发版。

## Scope

- 定义无人值守候选资格模型。
- 定义治理授权 artifact 与审计 contract。
- 定义治理级 dry-run / plan 入口 contract。
- 这些设计都复用现有 orchestration / publish record contract，不另起一套 release 状态事实源。

## Qualification model

### Evidence priority

- 编排层状态优先取 `manifest/version-record.json.releaseOrchestrationSummary`，缺失时回退到 `manifest/release-orchestration-record.json`。
- 真实 publish 执行状态优先取 `manifest/version-record.json.publishExecutionSummary`，缺失时回退到 `manifest/release-publish-record.json`。
- publish readiness 继续复用 `plan-release-publish` 已有证据链：`release-gate-report.json`、`governance-operations-report.json`、`upgrade-advice-package.json`、notification payload 与 `package.json publishConfig`。

### Hard requirements for unattended candidacy

- 编排层状态必须是 `ready-for-controlled-publish`；如果是 `blocked`、`prepare-failed` 或 `published-awaiting-follow-up`，一律不能进入无人值守候选。
- `plan-release-publish` 必须是 `eligible`，不能带 planner blocker。
- `publishReadiness.canPublish` 必须为 `true`。
- `publishReadiness.releaseGateStatus` 第一版只接受 `pass`；`warn` 虽然仍可人工受控 publish，但不进入无人值守候选。
- `publishReadiness.requiresExplicitAcknowledgement` 必须为 `false`；任何需要 `--acknowledge-warnings` 的版本都继续保留人工确认。
- 当前版本不能已经存在 `published` 状态的 publish execution snapshot；已成功发布的版本只能进入 follow-up，不再进入无人值守候选。

### Cases that must stay manual

- 最新 publish execution snapshot 是 `confirmation-required` 或 `acknowledgement-required`。
- release gate 为 `warn`，或 governance summary 仍要求显式 acknowledgement。
- 编排层虽然已经 `ready-for-controlled-publish`，但治理授权 artifact 缺失、过期或与当前版本 / registry / tag 不匹配。
- 当前版本已经进入过人工复核路径，且记录明确要求 maintainer review `nextAction` 后再继续。

### Direct blockers

- 最新编排层状态是 `blocked`、`prepare-failed` 或 `published-awaiting-follow-up`。
- 最新 publish execution snapshot 是 `publish-failed`；第一版不允许在失败后自动重试同一版本。
- `releaseOrchestrationSummary.nextAction` 或 `publishExecutionSummary.nextAction` 明确要求人工排障、人工确认或人工 follow-up。
- post-publish follow-up 尚未收口，或当前版本已发布但治理摘要 / 通知摘要尚未刷新完成。

### Governance states

- `not-authorized`：技术条件满足与否先不论，当前没有有效治理授权。
- `authorized-pending-validation`：已有治理授权，但还没通过最新资格复核。
- `authorized-ready`：已有有效治理授权，且当前版本满足无人值守候选硬条件。
- `execution-locked`：出现 `publish-failed`、关键记录缺失或显式人工排障要求，自动执行被锁定。
- `follow-up-blocked`：真实 publish 已完成，但 post-publish follow-up 未收口，禁止再次自动推进。
- `authorization-expired`：授权超过有效期、版本变化、registry/tag 变化或关键证据更新后失效，需要重新授权。

## Authorization artifact

### Storage

- 当前有效授权记录固定为 `manifest/release-unattended-authorization.json`。
- 历史授权记录固定归档到 `manifest/release-unattended-authorizations/<authorizationId>.json`。
- `manifest/version-record.json` 回填：
  - `artifacts.releaseUnattendedAuthorizationPath`
  - `artifacts.releaseUnattendedAuthorizationsRoot`
  - `releaseUnattendedAuthorizationSummary`

### Semantics

- authorization record 只声明“当前版本曾被谁在什么条件下授权为无人值守候选”。
- authorization record 不声明真实 publish 已执行。
- 是否真的发出去，仍以 `manifest/release-publish-record.json` / `publishExecutionSummary` 为准。

### Suggested record fields

- `authorizationId`
- `authorizedAt`
- `status`
- `packageName`
- `version`
- `packageRoot`
- `projectRoot`
- `targetPublish`
- `authorizedBy`
- `reason`
- `reviewContext`
- `constraints`
- `evidenceSnapshot`
- `invalidatesWhen`
- `consumption`
- `audit`

### Minimum `constraints`

- `expiresAt`
- `maxExecutionCount`
- `allowWarnGate`
- `requireNoPendingFollowUp`
- `requirePlannerEligible`
- `requireOrchestrationReady`

### Minimum `evidenceSnapshot`

- `releaseOrchestrationStatus`
- `releaseOrchestrationExecutionId`
- `releaseOrchestrationRecordPath`
- `publishPlannerStatus`
- `releaseGateStatus`
- `requiresExplicitAcknowledgement`
- `latestPublishExecutionStatus`
- `publishRecordPath`

### Minimum `invalidatesWhen`

- `versionChanged`
- `targetPublishChanged`
- `orchestrationSnapshotChanged`
- `plannerStatusChanged`
- `followUpBecamePending`

### Minimum `consumption`

- `consumed`
- `consumedAt`
- `publishExecutionId`
- `publishRecordPath`

### Minimum `audit`

- `recordPath`
- `recordPathRelative`
- `historicalRecordPath`
- `historicalRecordPathRelative`
- `supersedesAuthorizationId`
- `revokedBy`
- `revokedAt`

### Suggested summary fields

- `authorizationId`
- `recordedAt`
- `status`
- `packageName`
- `version`
- `targetPublish`
- `authorizedBy`
- `expiresAt`
- `consumed`
- `consumedAt`
- `releaseOrchestrationStatus`
- `publishPlannerStatus`
- `latestPublishExecutionStatus`
- `recordPath`
- `recordPathRelative`
- `historicalRecordPath`
- `historicalRecordPathRelative`

### Expiration / invalidation rules

- `package.json version` 变化后自动失效。
- `publishConfig.registry`、`access`、`tag` 或 `publishCommand` 推导结果变化后自动失效。
- 最新 `releaseOrchestrationSummary.executionId` 变化且状态不再满足 `ready-for-controlled-publish` 时自动失效。
- 最新 `plan-release-publish` 重新判定为 `blocked`，或出现 `requiresExplicitAcknowledgement: true` 时自动失效。
- 真实 publish 成功后，授权状态转为 `consumed`，不能复用于下一次发布。
- 维护者显式撤销、或新授权覆盖旧授权时，旧授权分别转为 `revoked` / `superseded`。

### Audit usage

- 想知道“当前有没有有效无人值守授权”：优先看 `manifest/release-unattended-authorization.json`。
- 想知道“这份授权是基于哪次编排快照和哪次资格判定批出来的”：看 `evidenceSnapshot.releaseOrchestrationExecutionId`、`releaseOrchestrationRecordPath` 与 `publishPlannerStatus`。
- 想知道“这份授权有没有真的被用掉”：看 `consumption`，再交叉看 `manifest/release-publish-record.json`。
- 想知道“为什么授权失效或被撤销”：看 `status`、`invalidatesWhen` 与 `audit.revokedBy / revokedAt / supersedesAuthorizationId`。

## Governance planner

### Suggested command

```bash
npx power-ai-skills plan-release-unattended-governance --json
```

### Responsibility boundary

- 这是治理层 dry-run / plan 入口，不执行真实 publish，也不自动消费授权。
- 它只回答三件事：
  - 当前版本是否满足无人值守候选资格
  - 当前是否存在有效治理授权
  - 如果现在不能无人值守推进，具体卡在资格、授权、锁定还是 follow-up
- 它复用现有 `plan-release-orchestration`、`plan-release-publish`、`releaseUnattendedAuthorizationSummary`、`publishExecutionSummary` 证据链，不另起一套 release 状态事实源。

### Status set

- `authorized-ready`
- `not-authorized`
- `authorized-pending-validation`
- `authorization-expired`
- `execution-locked`
- `follow-up-blocked`
- `blocked`

### Suggested output fields

- `status`
- `blockers`
- `riskFlags`
- `nextAction`
- `eligibility`
- `authorization`
- `governanceDecision`
- `evidence`

### `eligibility` fields

- `orchestrationStatus`
- `publishPlannerStatus`
- `releaseGateStatus`
- `requiresExplicitAcknowledgement`
- `latestPublishExecutionStatus`
- `followUpPending`

### `authorization` fields

- `present`
- `status`
- `authorizationId`
- `authorizedBy`
- `expiresAt`
- `consumed`
- `recordPath`

### `governanceDecision` fields

- `canRunUnattended`
- `requiresHumanReview`
- `lockReason`
- `recommendedExecutionMode`

### `evidence` fields

- `releaseOrchestrationRecordPath`
- `releasePublishRecordPath`
- `releaseUnattendedAuthorizationPath`
- `versionRecordPath`

### Blocker codes

- `authorization-missing`
- `authorization-expired`
- `authorization-invalidated`
- `orchestration-not-ready`
- `planner-blocked`
- `warning-acknowledgement-required`
- `publish-failed-lock`
- `follow-up-pending`
- `governance-record-missing`
- `required-artifact-missing`

### `nextAction` guidance

- 如果缺授权：指向后续治理授权入口或人工审批动作，而不是误导去跑真实 publish。
- 如果授权过期：明确要求先刷新 release evidence，再重新授权。
- 如果资格满足且授权有效：给出“允许进入无人值守执行候选”的说明，但仍不在这个 planner 内直接触发执行。
- 如果是 `publish-failed-lock` 或 `follow-up-pending`：明确要求先看 `manifest/release-publish-record.json` 或 follow-up 摘要。

### Record contract

- 当前治理 dry-run 结果落到 `manifest/release-unattended-governance-record.json`。
- 历史记录归档到 `manifest/release-unattended-governance-records/<executionId>.json`。
- `manifest/version-record.json` 回填：
  - `artifacts.releaseUnattendedGovernanceRecordPath`
  - `artifacts.releaseUnattendedGovernanceRecordsRoot`
  - `releaseUnattendedGovernanceSummary`
- 这份 record 只描述治理级 dry-run 判定、blocker、risk flag、授权状态和下一步建议，不声明真实 publish 已执行。

### CLI summary guidance

- 非 `--json` 模式下，直接摘要：
  - 当前版本
  - 治理状态
  - 授权状态
  - blocker 数量
  - record 路径
  - nextAction
- 文本口径应显式保留一句：`Unattended governance planning does not execute real publish.`

## Failure lock, cooldown, and follow-up gate

### Goal

避免无人值守执行在高风险状态下反复重试，或者在真实 publish 已成功但后续收口未完成时继续推进下一轮自动动作。

### Lock triggers

- 最新 `publishExecutionSummary.status` 是 `publish-failed`。
- 最新 `releaseOrchestrationSummary.status` 是 `blocked`，且 `nextAction.kind` 明确要求 `review-publish-failure` 或人工排障。
- 当前治理记录缺少判断所需的关键 record，例如：
  - `manifest/release-publish-record.json`
  - `manifest/release-orchestration-record.json`
  - `manifest/version-record.json`
- 最新资格复核显示授权已失效，且失效原因来自关键证据变化，而不是单纯“尚未授权”。

### Lock semantics

- 一旦命中 `publish-failed`，当前版本自动进入 `execution-locked`。
- 第一版不允许对同一 `packageName@version + targetPublish` 组合做无人值守自动重试。
- `execution-locked` 的目标是停机排障，而不是排队等待下一次自动尝试。
- 进入 `execution-locked` 后，治理 planner 的 `nextAction` 必须明确指向人工复核 `manifest/release-publish-record.json` 与 `manifest/release-publish-failure-summary.md`。

### Unlock conditions

- 维护者显式撤销旧授权并重新授权。
- 版本号变化，形成新的发布对象。
- `targetPublish` 变化，形成新的授权对象。
- 人工完成失败排障，并重新跑：
  - `pnpm refresh:release-artifacts`
  - `npx power-ai-skills plan-release-orchestration --json`
  - `npx power-ai-skills plan-release-publish --json`
  - 新的治理 planner 结果不再命中 `publish-failed-lock`

第一版不做自动解锁；即使只是 transient failure，也要求重新授权，而不是静默恢复自动执行。

### Cooldown model

- 第一版 cooldown 采用保守策略：`execution-locked` 本身就代表无限期冷却，直到显式人工解锁。
- 不单独引入“30 分钟后自动重试”之类的时间窗口。
- 如果后续需要时间型 cooldown，应作为下一阶段增强，而不是在第一版里混入自动重试策略。

### Follow-up gate triggers

- 最新 `releaseOrchestrationSummary.status` 是 `published-awaiting-follow-up`。
- 最新真实 publish 已成功，但以下任一信号仍显示 post-publish 收口未完成：
  - 最新 upgrade summary 未刷新到当前 publish 结果
  - notification payload / governance summary 还未复核
  - 维护 runbook 仍要求人工检查 rollout follow-up

### Follow-up gate semantics

- 命中 follow-up gate 时，治理状态进入 `follow-up-blocked`。
- `follow-up-blocked` 不表示发布失败；它表示“真实 publish 已完成，但下一轮无人值守动作必须暂停”。
- 在 `follow-up-blocked` 状态下：
  - 不允许再次消费同一份无人值守授权
  - 不允许为同版本继续尝试新的无人值守执行
  - `nextAction` 必须指向 follow-up 相关命令或记录，而不是重新触发 publish

### Follow-up clear conditions

- 维护者执行并复核：
  - `npx power-ai-skills generate-upgrade-summary --json`
  - `npx power-ai-skills doctor`
- 最新治理视图不再显示当前版本存在待处理 post-publish follow-up。
- 如当前版本的授权已经被消费，后续只允许为新版本生成新授权，不复用旧授权继续推进。

### Suggested planner / record fields

治理 planner 与治理 record 应补充：

- `lockState`
  - `unlocked`
  - `execution-locked`
  - `follow-up-blocked`
- `lockReason`
- `lockRecordedAt`
- `cooldownMode`
  - `none`
  - `manual-unlock-required`
- `unlockRequirements`
- `followUpPending`
- `followUpActions`

### Suggested blocker codes

- `publish-failed-lock`
- `publish-failure-review-required`
- `authorization-reuse-blocked`
- `follow-up-pending`
- `follow-up-review-required`
- `governance-state-incomplete`

### Recommended next actions

- `publish-failed-lock`
  - 先看 `manifest/release-publish-record.json`
  - 再看 `manifest/release-publish-failure-summary.md`
  - 排障后刷新 artifacts，并重新走授权流程
- `follow-up-pending`
  - 先跑 `npx power-ai-skills generate-upgrade-summary --json`
  - 再跑 `npx power-ai-skills doctor`
  - 确认 post-publish follow-up 收口后，下一轮只针对新版本重新授权

## Suggested automated test matrix

### Goal

在真正实现无人值守治理 planner / authorization record 前，先固定应该补哪些自动化覆盖，避免后续只实现 happy path。

### Recommended test files

- `tests/release-governance.test.mjs`
  - 优先承接治理资格、授权 artifact、治理 planner 输出与锁定规则相关测试。
- `tests/doctor.test.mjs`
  - 复用 package-maintenance 视图，验证 doctor 对新增治理快照和阻断状态的摘要。
- `tests/upgrade-summary.test.mjs`
  - 验证 upgrade summary 对治理层状态、授权状态、锁定状态和 follow-up gate 的汇总。
- `tests/maintainer-docs.test.mjs`
  - 验证维护文档中的命令与关键状态说明未漂移。

### Core scenarios

#### Qualification and authorization

- 缺少治理授权 record 时，治理 planner 返回 `not-authorized`，并带 `authorization-missing` blocker。
- 存在有效授权且当前资格满足时，治理 planner 返回 `authorized-ready`。
- 存在授权但当前 orchestration 不再是 `ready-for-controlled-publish` 时，治理 planner 返回 `authorization-expired` 或 `blocked`，并显式说明授权失效原因。
- 存在授权但 `publishReadiness.requiresExplicitAcknowledgement` 为 `true` 时，治理 planner 不允许进入 `authorized-ready`。

#### Authorization expiration and invalidation

- `package.json version` 变化后，旧授权自动失效。
- `publishConfig.registry`、`access`、`tag` 或 `publishCommand` 变化后，旧授权自动失效。
- `releaseOrchestrationSummary.executionId` 更新且状态不再满足授权前提时，旧授权自动失效。
- 同版本下生成新授权时，旧授权状态转为 `superseded`。

#### Publish failure lock

- 最新 `publishExecutionSummary.status` 为 `publish-failed` 时，治理 planner 返回 `execution-locked`。
- 命中 `execution-locked` 时，`nextAction` 必须指向 `manifest/release-publish-record.json` 与 `manifest/release-publish-failure-summary.md`。
- 在 `execution-locked` 状态下，不允许对同一 `packageName@version + targetPublish` 继续给出无人值守可执行结论。
- 只有重新授权或版本变化后，才能解除 `publish-failed-lock`。

#### Follow-up gate

- 最新 `releaseOrchestrationSummary.status` 为 `published-awaiting-follow-up` 时，治理 planner 返回 `follow-up-blocked`。
- 命中 `follow-up-blocked` 时，`nextAction` 指向 `generate-upgrade-summary --json` 和 `doctor`，而不是重新触发 publish。
- 已消费授权的版本在 follow-up 未收口时，不允许再次消费同一份授权。
- follow-up 收口后，旧授权仍不能被重用到下一次发布。

#### Summary and maintenance views

- doctor 在 package-maintenance 模式下能区分：
  - 编排层 ready
  - 治理授权存在但未必可执行
  - 真实 publish 已执行
- upgrade summary 能同时摘要：
  - 治理 planner 状态
  - 授权状态
  - lock state
  - follow-up pending 状态
- 当治理层 record 缺失但 orchestration / publish record 存在时，doctor 和 upgrade summary 不应误报“已授权无人值守候选”。

### Fixtures and helper guidance

- 优先复用现有 release governance / release publish / release orchestration 测试里的 manifest fixture 拼装方式。
- 如新增治理授权 fixture，建议统一提供：
  - 当前授权 record
  - 历史授权 record
  - `version-record.json.releaseUnattendedAuthorizationSummary`
  - 可选的治理 planner record
- 避免在每个测试里重复手写完整 release manifest；优先补 shared fixture builder。

### Minimum acceptance bar

- 至少覆盖：
  - `authorization-missing`
  - `authorization-expired`
  - `warning-acknowledgement-required`
  - `publish-failed-lock`
  - `follow-up-pending`
- 至少验证一个 doctor 摘要场景和一个 upgrade summary 摘要场景，确保治理状态不会只存在于单个 planner JSON 输出里。
