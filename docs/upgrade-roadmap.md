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

### P6-22 静默 follow-up 最小打扰提示第一版
阶段状态：
- `P6-21` 已正式迁移到 `docs/upgrade-roadmap-history.md`。
- 当前阶段从“latest/history/source + recommendation contract 已稳定”继续往前走，开始补普通使用者真正能感知到的最小打扰提示。
- 这一阶段仍优先复用现有 `postinstall -> sync -> run-evolution-cycle / apply-evolution-actions` 链，不新造 daemon，也不新造平行自动入口。

阶段目标：
- 让普通使用者在不主动执行 `status` 的情况下，也能在 `sync` / `postinstall` 后收到一条极短、不会打断主流程的 follow-up 提示。
- 保持默认体验仍然接近“无感知”，只有在 `review-needed` 或值得看的 `low-risk-follow-up-available` 场景下才暴露提示。
- 继续把高风险动作留在人工 review 边界内，不因为开始补最小打扰提示，就默认放开 shared skill、wrapper、release 等自动推进。

本阶段只做：
- 复用现有 recommendation contract，不重新发明新的结果状态模型。
- 评估提示落点优先级，例如：
  - `sync` 控制台输出追加一行摘要
  - `postinstall` 复用 `sync` 结果，只保留极短提示
  - 只在 `review-needed` 或值得查看的 `low-risk-follow-up-available` 时提示
- 如果需要 next action，优先复用现有 `recommendation.nextActions`，不再引入平行提示语义。

本阶段不做：
- 不新增后台常驻 watcher、daemon 或 OS 级服务。
- 不把 `postinstall` 或 `sync` 变成因为提示生成失败就整体失败的重流程。
- 不自动 accept / reject conversation decision。
- 不自动推进 shared skill promotion、wrapper proposal / registration、release-facing actions。

## 未完成项

- [ ] 决定哪些 recommendation level 应该在 `sync` / `postinstall` 时主动提示，哪些继续只保留在 `status` / artifact。
- [ ] 给 `sync` 的普通使用者输出补一层极短的 next-action 提示，同时保持主流程非阻断。
- [ ] 保持现有 recommendation contract、显式 opt-out 和非阻断边界在提示扩展后仍然成立。

## 完成标准

- 普通使用者在 `postinstall -> sync` 之后，就算不主动执行 `status`，也能在必要时看到一条极短的 follow-up 提示。
- 提示仍保持普通使用者视角，不要求用户依赖维护者侧调试命令。
- 安装路径下的静默触发仍保持非阻断、低风险，并保留显式 opt-out。
- 当前实现仍保持低风险、非阻断，没有越界自动推进高风险治理动作。

## 下一次进入本文档时的动作

- 先看现有 recommendation contract 是否已经足够稳定，再决定最小打扰提示优先落在 `sync`、`postinstall` 还是两者共同复用。
- 继续复用 `status`、latest/history artifact、`sync` 和现有 evolution 链，不要新造平行自动入口。
- 如果进入下一批实现，优先补“必要时才提示”的 consumer-side 暴露层，而不是回退到重新解释 recommendation contract 本身。
