# 升级路线图

本文只保留当前正在推进的一个阶段。

使用规则：
- `docs/upgrade-roadmap.md` 只保留当前活动阶段和未完成项
- 当前阶段未完成前，不在这里继续堆叠下一个阶段内容
- 当前阶段全部完成后，将整段迁移到 `docs/upgrade-roadmap-history.md`
- 下一次只把新的活动阶段写回本文，保证每次开发都能直接看到“现在要做什么”

历史记录：
- 已完成阶段、已收口方案、历史版本规划统一迁移到 `docs/upgrade-roadmap-history.md`

## 当前阶段

### P6-3 wrapper 自动注册 dry-run 第一版
阶段目标：
- 在 `P6-2` 已完成 `shared skill` 自动正式晋升 dry-run planner 的基础上，开始第三条链路：wrapper 自动注册。
- 先补“资格判定 + dry-run / plan 输出 + 人工确认落点”，保持真实 wrapper registry 写入仍然人工执行，不直接绕过治理闸口。
- 明确 wrapper promotion proposal、materialized artifact、finalized status 与真实 registry 落点之间的状态边界，避免后续把 wrapper draft、registry 变更和发布动作揉成一条黑盒流程。
- 保持现有 wrapper promotion lifecycle、`list-wrapper-promotions` / `show-wrapper-promotion-timeline` / `generate-wrapper-registry-governance`、doctor / governance summary / release gates 的治理语义稳定，不在这一阶段直接开启真实 registry 注册。

本阶段只做：

- 基于现有 wrapper promotion proposal、timeline / lifecycle 状态、follow-up checklist 和 registration status，定义 wrapper 自动注册的资格判定来源。
- 增加 wrapper registration 的 dry-run / plan 输出，至少能告诉用户：哪些 wrapper proposal 可进入注册候选、为什么、目标 registry 落点在哪、哪些被阻断。
- 明确真实 wrapper registry 的目标落点与建议写入动作，避免把 proposal 状态变更误当成 registry 注册完成。
- 保持人工确认边界，第一版只允许输出建议执行动作，不直接修改真实 registry。

当前链路现状：

- 当前人工边界：
  - wrapper proposal 先进入 `.power-ai/proposals/wrapper-promotions/<tool>/`
  - `materialize-wrapper-promotion` / `apply-wrapper-promotion` / `finalize-wrapper-promotion` 已覆盖 proposal 到代码改动、follow-up 与 finalize 状态
  - `register-wrapper-promotion` 仍是人工显式动作，registry 写入没有被 evolution / proposal apply 自动接管
  - `generate-wrapper-registry-governance`、doctor、release gates 已能暴露 pending / stalled wrapper proposal
- 目标自动化边界：
  - 先自动判断某个 wrapper promotion proposal 是否具备真实 registry 注册资格
  - 再给出 dry-run 计划、目标 registry 落点和人工确认命令/步骤
  - 真实 registry 写入仍保持人工确认，不在本阶段自动执行
- 当前主要风险：
  - 把未完成 follow-up 或未 finalization 的 wrapper proposal 过早推进到 registry
  - 自动选错 registry 写入位置、状态字段或归档边界，污染对外命令入口

本阶段不做：

- 不直接写入真实 wrapper registry
- 不自动执行 `register-wrapper-promotion`
- 不自动修改 release 产物或 npm 发布面
- 不把 release 自动发版一起并进来

## 未完成项

- [ ] 定义 wrapper proposal / lifecycle -> registry 注册候选的资格判定来源，至少覆盖 proposal 状态、materialization / application / finalization / registration 状态、follow-up checklist 和目标 registry 落点来源。
- [ ] 增加 wrapper registration 的 dry-run / plan contract，至少输出 `eligible / blocked`、阻断原因、建议目标 registry 落点和人工确认落点。
- [ ] 明确 wrapper registry 正式映射规则，至少回答“toolName / commandName 从哪来、何时允许覆盖已有 wrapper、何时必须先 finalize 再 register”。
- [ ] 在路线图和维护说明里固定 wrapper registration planner 与真实注册边界，避免后续直接跳过 dry-run 去写 registry。

## 完成标准

- wrapper 自动注册不再停留在模糊设想，而是有清晰的资格判定来源和 dry-run contract。
- wrapper proposal、真实 registry 和人工确认边界的职责被写清楚，不会再把 finalized proposal 误当成已注册 wrapper。
- 本阶段结束后，可以进入 wrapper 自动注册的真实实现，而不必重新讨论目标 registry、阻断条件和人工边界。

## 下一次进入本文档时的动作

- 如果上面还有未勾选项：继续只做 wrapper 自动注册 dry-run 第一版，不要提前跳到 release 自动发版。
- 先把 wrapper 的资格判定来源、目标 registry 映射和 dry-run 输出定下来，再决定是否补 CLI 命令。
- 如果上面全部勾选：把本阶段迁移到 `docs/upgrade-roadmap-history.md`，再进入 release 自动发版的 dry-run 规划 / 实现阶段。
