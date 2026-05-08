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

### P6-21 静默 follow-up 结果分级建议第一版
阶段状态：
- `P6-20` 已正式迁移到 `docs/upgrade-roadmap-history.md`。
- 当前阶段从“latest/history/source contract 已有稳定 artifact 和 `status` 入口”继续往前走，开始补普通使用者真正关心的结果分级建议。
- 这一阶段仍优先复用现有 `postinstall -> sync -> run-evolution-cycle / apply-evolution-actions` 链，不新造 daemon，也不新造平行自动入口。

阶段目标：
- 让普通使用者不只看到 latest/history/source，还能快速知道哪些 recent follow-up 只是信息型结果、哪些需要 review、哪些需要继续执行低风险后续动作。
- 保持静默触发仍然非阻断、低风险、可追踪，但把“我现在要不要管它”收口成普通使用者可读的分级建议。
- 继续把高风险动作留在人工 review 边界内，不因为开始补结果分级建议，就默认放开 shared skill、wrapper、release 等自动推进。

本阶段只做：
- 继续复用现有 latest/history artifact 和 `status`，不新造新的 consumer-side 命令。
- 评估并收口静默 follow-up 的结果分级，例如：
  - info-only
  - review-needed
  - low-risk-follow-up-available
- 如果需要推荐动作，优先从现有 `mode`、`status`、`reason`、history/source contract 推导，而不是再引入平行状态模型。

本阶段不做：
- 不新增后台常驻 watcher、daemon 或 OS 级服务。
- 不自动 accept / reject conversation decision。
- 不自动推进 shared skill promotion、wrapper proposal / registration、release-facing actions。
- 不把 `postinstall` 或其他后续触发点变成一个因为静默 follow-up 内部失败就整体失败的重流程。

## 未完成项

- [ ] 决定 latest/history follow-up 结果的普通使用者分级口径。
- [ ] 给 `status` 或 artifact 补一份稳定的 next-action / recommendation contract，不要求用户自己解读 `mode + reason`。
- [ ] 保持现有 latest/history/source contract、显式 opt-out 和非阻断边界在结果分级后仍然成立。

## 完成标准

- 普通使用者在 `postinstall -> sync` 之后，不只看到 latest/history/source，还能直接知道“现在是否需要处理它”。
- 分级建议仍保持普通使用者视角，不要求用户依赖维护者侧调试命令。
- 安装路径下的静默触发仍保持非阻断、低风险，并保留显式 opt-out。
- 当前实现仍保持低风险、非阻断，没有越界自动推进高风险治理动作。

## 下一次进入本文档时的动作

- 先看 latest/history/source contract 是否已经足够稳定，再决定结果分级建议落在 `status`、artifact，还是两者都保留。
- 继续复用 `status`、`doctor`、`quickstart`、`sync` 和现有 evolution 链，不要新造平行自动入口。
- 如果进入下一批实现，优先补结果分级建议、next-action contract 和 consumer-side 说明，而不是回退到重新解释 history/source 本身。
