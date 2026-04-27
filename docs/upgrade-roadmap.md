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

### P5-13 图传播与模式聚合第七版
阶段目标：
- 在 `P5-12` 已完成 `project-scan` service composition、review service 与 pipeline handoff 收口的基础上，继续处理图传播与模式聚合这一批仍偏集中的规则聚合热点。
- 优先把 `component-graph.mjs`、`pattern-aggregation.mjs` 里“新增传播规则、聚合字段或关联摘要就容易继续堆大文件”的位置再拆清楚。
- 同时保持已收口的 `scan-engine`、`index.mjs`、`vue-analysis`、发布边界 smoke 和 release 检查链路稳定，不把这轮结构变化重新扩散到 npm 发布面。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

本阶段只做：

- 继续收敛 `project-scan` 的图传播与模式聚合热点，优先处理 component relation propagation、pattern aggregate 累积与项目级关联摘要中的集中逻辑。
- 保持 `scan-engine`、`index.mjs`、`vue-analysis`、detector 目录化与 package/release 边界校验的现有 contract 稳定，避免这轮调整把已收口的 orchestration 或 service composition 重新推回热点。
- 如需继续拆层，只拆到“新增传播规则或聚合字段知道该落哪一层”为止，不在这一阶段追求大规模重写。
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

- [x] 至少再收敛 `component-graph.mjs` 或 `pattern-aggregation.mjs` 中的一处维护热点，优先避免新增传播规则或聚合字段继续回堆到单一大文件。
- [x] 为这轮拆分后的图传播 / 模式聚合落点补一段明确维护说明，约束后续新增 relation propagation、aggregate summary 或关联摘要该落在哪一层。
- [x] 补齐本阶段新增变更对应的自动化测试与校验命令。

## 完成标准

- `component-graph` 或 `pattern-aggregation` 的后续新增能力有更明确的落点，不再优先回堆到单一传播 / 聚合热点文件。
- 已收口的 `scan-engine`、`index.mjs`、`vue-analysis`、detector 目录化与 package/release 边界校验在本阶段结构变化后仍保持稳定，不出现热点回流。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现保持一致，可继续作为后续结构优化的基础。

## 下一次进入本文档时的动作

- 如果上面还有未勾选项：继续只做“图传播与模式聚合第七版”，不要提前切到新功能阶段。
- 优先核对 `component-graph.mjs` 或 `pattern-aggregation.mjs` 的拆分是否真的降低维护热点，而不是只做传播 / 聚合文件搬家。
- 如果上面全部勾选：把本阶段迁移到 `docs/upgrade-roadmap-history.md`，再写入下一个活动阶段。
