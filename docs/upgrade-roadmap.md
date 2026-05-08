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

### P6-27 静默 follow-up 标题层第一版
阶段状态：
- `P6-26` 已正式迁移到 `docs/upgrade-roadmap-history.md`。
- 当前阶段从“顶层口径已经稳定”继续往前走，开始补更适合统一渲染的标题层。
- 这一阶段仍优先复用现有 `postinstall -> sync -> run-evolution-cycle / apply-evolution-actions` 链，不新造 daemon，也不新造平行自动入口。

阶段目标：
- 让普通使用者在不同入口里不仅读到同一句顶层判断，还能读到更稳定、更统一的标题层输出。
- 保持默认体验仍然接近“无感知”，只有在确实需要用户处理时才显式暴露这层标题。
- 继续把高风险动作留在人工 review 边界内，不因为开始补标题层，就默认放开 shared skill、wrapper、release 等自动推进。

本阶段只做：
- 复用现有 recommendation contract、primary action、resolution signal、final status、headline 和极短提示，不重新发明新的结果状态模型。
- 评估是否需要给普通使用者补一个更适合不同入口共用的标题 / badge / heading 层，而不是只保留 plain-text headline。
- 如果需要提示，优先从已有 `No action needed` / `Review later` / `Needs action now` 中提炼，而不是引入新的治理状态。

本阶段不做：
- 不新增后台常驻 watcher、daemon 或 OS 级服务。
- 不把 `postinstall` 或 `sync` 变成因为标题层生成失败就整体失败的重流程。
- 不自动 accept / reject conversation decision。
- 不自动推进 shared skill promotion、wrapper proposal / registration、release-facing actions。

## 未完成项

- [ ] 决定普通使用者是否还需要一个更稳定的标题 / badge / heading 层，还是现有 headline 已经足够。
- [ ] 如果需要，给普通使用者输出补一层更适合不同入口统一渲染的标题层，同时保持主流程非阻断。
- [ ] 保持现有 recommendation contract、primary action、resolution signal、final status、headline、显式 opt-out 和非阻断边界在标题层扩展后仍然成立。

## 完成标准

- 普通使用者在 `postinstall -> sync` 之后，能在不同入口里看到更稳定统一的标题层，而不需要自己再决定该读哪条顶层判断。
- 标题层仍保持普通使用者视角，不要求用户依赖维护者侧调试命令。
- 安装路径下的静默触发仍保持非阻断、低风险，并保留显式 opt-out。
- 当前实现仍保持低风险、非阻断，没有越界自动推进高风险治理动作。

## 下一次进入本文档时的动作

- 先看现有 recommendation contract、primary action、resolution signal、final status、headline 和极短提示是否已经足够稳定，再决定标题层优先落在 `sync`、`status` 还是两者共同复用。
- 继续复用 `status`、latest/history artifact、`sync` 和现有 evolution 链，不要新造平行自动入口。
- 如果进入下一批实现，优先补“统一渲染标题层”的 consumer-side 口径，而不是回退到重新解释现有 contract。
