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

### P5-10 Vue Analysis 拆层与维护热点第四版
阶段目标：
- 在 `P5-9` 已完成 detector 目录化、测试样板收敛和运行时目录治理的基础上，继续处理 `vue-analysis` 这块剩余的规则层热点。
- 优先把 template analysis、script analysis 和 signal synthesis 的边界再拆清楚，避免后续 SFC 信号继续回堆到同一个文件。
- 同时继续压缩剩余维护热点，尤其是 release / package 边界与结构说明中仍偏集中的位置。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

本阶段只做：

- 继续拆分 `project-scan` 的规则层热点，优先处理 `vue-analysis` 的 template / script / signal synthesis 边界收口。
- 保持 detector 目录化后的调用面稳定，避免因继续拆层把 `scan-engine` 或 `signals` 再次推回热点。
- 继续收敛剩余维护热点，优先处理 release / package 边界相关说明、脚本或测试中仍明显偏集中的位置。
- 保持现有命令文档、发布边界 smoke、维护文档和 release 检查链路稳定，不在这一阶段重新放宽 npm 发布面。
- 持续保持 `pnpm test`、`pnpm check:package`、`pnpm check:docs`、`pnpm release:check` 和关键 CLI 验证通过。

本阶段不做：

- 新增运营趋势视图、治理趋势聚合或新的报表能力
- shared skill 自动正式晋升
- wrapper 自动注册
- release 自动发版
- project-local 自动晋升到 `manual` 或 `shared skill`
- 跨仓库或远程遥测采集
- 大规模重写现有业务能力或替换当前治理模型

## 未完成项

- [ ] 至少把 `vue-analysis` 拆成更明确的子边界，优先让 template analysis、script analysis 与 signal synthesis 不再长期共栖同一文件。
- [ ] 为 `vue-analysis` 拆层后的新增信号落点补一段明确维护说明，避免未来 SFC 规则继续回堆。
- [ ] 再收敛一处剩余维护热点，优先处理 release / package 边界相关脚本、测试或文档中的重复结构。
- [ ] 补齐本阶段新增变更对应的自动化测试与校验命令。

## 完成标准

- `vue-analysis` 的后续新增能力有更明确的拆层落点，不再优先往单一文件回堆 template、script 与 synthesis 逻辑。
- release / package 边界相关的剩余维护热点至少再收敛一处，避免结构评估已经收口但实现侧仍保留明显重复热点。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现保持一致，可继续作为后续结构优化的基础。

## 下一次进入本文档时的动作

- 如果上面还有未勾选项：继续只做“Vue Analysis 拆层与维护热点第四版”，不要提前切到新功能阶段。
- 优先核对 `vue-analysis` 的拆层是否真的降低规则热点，而不是只做文件移动。
- 如果上面全部勾选：把本阶段迁移到 `docs/upgrade-roadmap-history.md`，再写入下一个活动阶段。
