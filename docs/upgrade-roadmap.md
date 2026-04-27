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

### P6-1 自动晋升与自动注册规划第一版
阶段目标：
- 在 `P5-16` 已完成 `project-scan`、artifact projection、report renderer 与 release/check 边界收口的基础上，正式规划四类高风险自动化扩边：`project-local` 自动晋升到 `manual`、`shared skill` 自动正式晋升、wrapper 自动注册、release 自动发版。
- 先把四条自动化链路的前置状态、治理闸口、触发条件、dry-run / manual-confirm 边界和推荐推进顺序写清楚，避免一开始就把“自动草案晋升”“正式注册”“真实发布”混成一条不可控流水线。
- 保持现有 `project-local` 草案生成、evolution proposal / draft handoff、wrapper promotion lifecycle、release checks 与 package/release 边界稳定，不在这一阶段直接抹掉人工复核边界。
- 保持“先立策略与闸口、再开自动动作”的节奏，不在这一阶段直接追求四条链路全部正式自动执行。

本阶段只做：

- 梳理四类自动化动作的当前人工边界、目标自动化边界、前置依赖、风险等级和推荐推进顺序。
- 明确每条链路进入自动化前至少需要哪些状态机节点、治理确认、dry-run 输出和回滚/中止条件。
- 优先把低风险到高风险的分层顺序写清楚：`project-local -> manual`、`shared skill` 正式晋升、wrapper 注册、release 发版。
- 如需进入实现，只允许先做“策略表达、资格判定、dry-run / plan 输出、人工确认接口”这类低风险基础，不直接跳到真实注册或真实发布。
- 保持现有命令文档、治理摘要、doctor / release gates / evolution handoff 语义稳定，不在这一阶段提前放宽高风险动作。

本阶段不做：

- 不直接开启真实 npm 发布自动执行
- 不直接取消 wrapper 注册前的人工 finalize / register 边界
- 不直接让 `shared skill` 候选绕过人工验证进入正式 catalog
- 不直接让 `project-local` 草案无闸口晋升到 `manual` 或 `shared skill`
- 不引入跨仓库或远程遥测采集
- 不在这一阶段同时重写 evolution、wrapper、release 三套治理模型

## 未完成项

- [ ] 为四类高风险自动化动作补一版统一的任务分层说明：当前人工边界、目标自动化边界、触发条件、阻断条件、回退路径。
- [ ] 明确四类动作的推荐推进顺序与依赖关系，避免高风险动作先于低风险治理基础落地。
- [ ] 为首批要进入实现的动作圈定最小可执行范围，优先限定在策略判定、dry-run 或人工确认接口，而不是直接真实执行。

## 完成标准

- 四类自动化方向都有明确的范围定义，不再停留在“以后自动化”这种模糊表述。
- 自动化推进顺序、治理闸口与风险分层被写清楚，后续进入实现时知道应该先做哪条、为什么。
- 当前已收口的 `project-scan`、evolution proposal / draft、wrapper promotion lifecycle、release checks 与 package/release 边界在规划阶段保持稳定，没有为了规划而提前破坏人工边界。
- 本阶段文档能够直接作为下一轮真实实现的任务入口，而不是只留下零散想法。

## 下一次进入本文档时的动作

- 如果上面还有未勾选项：继续只做“自动晋升与自动注册规划第一版”，不要直接跳到真实自动发版实现。
- 优先把四类自动化动作的依赖、闸口和最小实现范围写清楚，再决定先落哪一条。
- 如果上面全部勾选：把本阶段迁移到 `docs/upgrade-roadmap-history.md`，再进入第一条已选中的自动化实现阶段。
