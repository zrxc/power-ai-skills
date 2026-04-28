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

### P6-5 release 受控执行第一版
阶段目标：
- 在 `P6-4` 已完成 release publish dry-run planner 的基础上，开始进入“真实执行但仍保留显式人工确认”的下一层，而不是直接跳到无人值守自动 publish。
- 让发布动作从“手工照着 planner 输出敲命令”升级为“受控 CLI 执行入口”，但仍要求 package root、实时复核和显式确认，不能绕过现有 release 治理闸口。
- 明确 `plan-release-publish`、实时 artifact 复核、最终 `npm publish` 执行与 publish 结果记录之间的状态边界，避免后续把 dry-run 结果当成已完成发版。
- 保持现有 `release:prepare`、`release:check`、`upgrade:advice`、`upgrade:payload`、`governance:operations`、package-maintenance `doctor` 与 manifest 产物语义稳定，不在这一阶段引入无人值守定时发版。

本阶段只做：
- 增加一个受控 release publish 执行入口，至少要求：
  - 只能在 package-maintenance 模式和 package root 下运行
  - 执行前重新校验 release publish planner 或等价资格判定
  - 只有显式 `--confirm` / `--yes` 一类确认参数时才允许进入真实 publish
- 在真实 publish 前固定最后一跳校验边界，至少区分：
  - planner 资格判定
  - refresh / validate / check / generate 的复核步骤
  - 最终真实 publish
- 为真实 publish 增加最小结果沉淀，至少记录：
  - 执行时间
  - 目标 registry / package / version
  - 执行前 planner 摘要
  - success / failure 状态与错误摘要
- 保持 warning 语义可见：如果 release gate 为 `warn`，执行层仍需显式 acknowledgement，不能把 planner 的 `eligible` 直接等价成“无条件自动发版”。

当前链路现状：
- 当前已具备：
  - `plan-release-publish --json`，可输出 `eligible / blocked`、目标 registry、evidence 与人工确认命令
  - `release:prepare`、`release:check`、`upgrade:payload`、`governance:operations`、`upgrade:advice` 已能生成和校验发版前治理材料
  - `manifest/version-record.json`、release notes、notification payload、risk / advice / governance report 已可作为发版前证据
  - `execute-release-publish [--confirm] [--acknowledge-warnings] --json` 已作为受控执行入口落地，并且每次执行前都会重新运行最新 planner，而不是复用旧 dry-run 结果
  - `manifest/release-publish-record.json`、`manifest/release-publish-records/`、`manifest/release-publish-failure-summary.md`、`manifest/version-record.json.publishExecutionSummary` 已能沉淀最近一次受控执行状态，并被 package-maintenance `doctor`、upgrade summary 和 planner evidence 复用
- 当前缺口：
  - `execute-release-publish` 目前仍是受控 skeleton，`ready-to-execute` 之后还不会真正调用 `npm publish`
  - 因为还没进入真实 publish，这一阶段的“第一版真实执行链路”完成标准还没有达成
- 当前主要风险：
  - 如果后续直接把 skeleton 接到真实 publish，但没有继续沿用当前 record contract，可能再次出现“dry-run / execute / publish result”语义脱节
  - 在尚未接入真实 publish 前，维护者仍需要把 `ready-to-execute` 结果和最终手工 `npm publish` 明确区分，避免把受控闸口通过误读成“已经发版”

本阶段不做：
- 不做无人值守自动 publish 或定时发版
- 不自动修改正式版本号或跳过现有 release checks
- 不绕过 `release:prepare`、`release:check`、package-maintenance doctor 或 planner 复核
- 不把 shared skill / wrapper 的高风险自动化动作重新并回这一阶段

## 未完成项

- [x] 设计 release 受控执行 contract，至少明确执行命令、显式确认参数、执行前复核步骤和失败返回结构。
- [x] 增加真实 publish 前的二次资格校验，避免直接复用过期 dry-run 结果去执行发布。
- [x] 为 publish 结果增加 manifest / governance 记录，至少沉淀目标 registry、package、version、执行时间、状态与错误摘要。
- [x] 在路线图和维护说明里固定“受控执行”与“无人值守自动 publish”的边界，避免后续把这一阶段误扩成全自动发版。
- [x] 在明确允许前继续保持 `execute-release-publish` 为受控 skeleton；等边界放开后，再把 `ready-to-execute` 接到真实 `npm publish`，并把真实 publish 结果继续落进同一份 record contract。
  当前 contract 已切到 `realPublishEnabled: true`，真实 publish 成功与失败结果都会沉淀到 record / version record / upgrade summary。

## 完成标准

- release 从“纯手工照命令执行”升级为“有受控 CLI 入口、带显式确认和执行前复核”的第一版真实执行链路。
- planner、执行前复核、真实 publish 与结果记录之间的职责被写清楚，不会再把 dry-run 输出误当成真实发版完成。
- 本阶段结束后，可以讨论更进一步的 release 自动化，但不需要重新梳理确认边界、执行前闸口和 publish record contract。

## 下一次进入本文档时的动作

- 如果上面还有未勾选项：继续只做 release 受控执行第一版，不要提前跳到无人值守自动 publish。
- 优先沿用现有 planner / executor / record contract 收口真实 publish 接口，不要推倒当前受控 skeleton 重做。
- 如果上面全部勾选：把本阶段迁移到 `docs/upgrade-roadmap-history.md`，再决定是否需要立新的“自动发布编排”阶段。
