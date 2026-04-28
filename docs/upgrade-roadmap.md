# 升级路线图

本文只保留当前正在推进的一个阶段。

使用规则：
- `docs/upgrade-roadmap.md` 只保留当前活动阶段和未完成项
- 当前阶段未完成前，不在这里继续堆下一个阶段内容
- 当前阶段全部完成后，将整段迁移到 `docs/upgrade-roadmap-history.md`
- 下一次只把新的活动阶段写回本文，保证每次开发都能直接看到“现在要做什么”

历史记录：
- 已完成阶段、已收口方案、历史版本规划统一迁移到 `docs/upgrade-roadmap-history.md`

## 当前阶段

### P6-6 自动发布编排第一版
阶段目标：
- 在 `P6-5` 已完成受控 release publish 执行链路的基础上，开始规划“自动发布编排”这一更高层能力，而不是继续停留在单次执行命令 contract。
- 把当前已经存在的 `release:prepare`、`plan-release-publish`、`execute-release-publish`、consumer compatibility、release gates、governance summary 和 notification 产物串成一条可编排的发布流水线，但仍保留治理闸口与人工确认边界。
- 明确“受控执行单点命令”与“多步骤发布编排”的职责边界，避免后续为了追求自动化而重新打散现有 planner / executor / publish record contract。
- 保持现有 package-maintenance `doctor`、upgrade summary、release artifacts 与 record contract 语义稳定，不在这一阶段直接引入无人值守定时发版。

本阶段只做：
- 设计自动发布编排第一版的入口 contract，至少明确：
  - 编排入口命令或脚本的职责边界
  - 编排前置输入与依赖产物
  - 哪些步骤可以自动串行，哪些步骤仍需显式人工确认
- 固定“编排状态”与“单次 publish 执行状态”的关系，至少区分：
  - release 材料刷新与校验
  - planner 资格判定
  - 真实 publish 执行
  - 发布后记录 / 通知 / follow-up
- 为自动发布编排增加最小 dry-run / plan 能力，至少能够输出：
  - 将要执行的步骤列表
  - 当前阻断点
  - 人工确认闸口所在位置
  - 建议继续动作
- 让编排结果可以复用当前 doctor / upgrade summary / version record 语义，而不是另起一套发布状态模型。

本阶段不做：
- 不做无人值守定时发版
- 不绕过 `release:prepare`、release gates、consumer compatibility、package-maintenance doctor 或 warn-level acknowledgement
- 不自动决定版本号升级策略
- 不把 wrapper / shared skill / project-local 的高风险治理动作混进发布编排主流程

## 未完成项

- [ ] 设计自动发布编排第一版的 stage model，明确 prepare / plan / publish / post-publish 的阶段划分与状态流转。
- [ ] 增加编排级 dry-run / plan 入口，至少输出步骤清单、阻断原因、人工确认闸口和建议下一步。
- [ ] 明确编排级 record contract 与现有 `release-publish-record.json`、`version-record.json.publishExecutionSummary` 的关系，避免状态重复或语义冲突。
- [ ] 在维护文档里固定“受控单次 publish”与“多步骤自动发布编排”的边界，避免后续把编排入口误读成无人值守自动发版。

## 完成标准

- 发布流程不再只是分散的手工脚本和单点命令，而是具备清晰编排模型、可读 plan 输出和稳定的人工确认落点。
- `release:prepare`、planner、真实 publish、结果记录、通知 follow-up 之间的顺序与职责被写清楚，不会再因为进入编排阶段而打散现有 record contract。
- 本阶段结束后，可以继续讨论更高层的自动化执行方式，但不需要重新梳理编排状态模型、确认闸口和 record contract。

## 下一次进入本文档时的动作

- 如果上面还有未勾选项：继续只做“自动发布编排第一版”，不要提前跳到无人值守定时发版。
- 优先复用现有 planner / executor / release artifacts / publish record contract 设计编排层，不要推倒重建发布状态模型。
- 如果上面全部勾选：把本阶段迁移到 `docs/upgrade-roadmap-history.md`，再决定是否需要立新的“无人值守发布治理”阶段。
