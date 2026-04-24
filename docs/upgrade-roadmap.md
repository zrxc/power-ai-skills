# 升级路线图

本文只保留当前正在推进的一个阶段。

使用规则：

- `docs/upgrade-roadmap.md` 只保留当前活动阶段和未完成项
- 当前阶段未完成前，不在这里继续堆叠下一阶段内容
- 当前阶段全部完成后，将整段迁移到 `docs/upgrade-roadmap-history.md`
- 下一次只把新的活动阶段写回本文件，保证每次开发都能直接看到“现在要做什么”

历史记录：

- 已完成阶段、已收口方案、历史版本规划统一迁移到 `docs/upgrade-roadmap-history.md`

## 当前阶段

### P5-6 运营趋势视图第一版

阶段目标：

- 把当前已有的治理摘要快照推进到可对比的趋势视图，而不只停留在单次 snapshot
- 让团队能从 backlog aging、proposal apply 节奏、capture intake 健康度、治理吞吐中看到跨周期变化
- 继续保持当前治理边界：这一阶段只做趋势可视化与摘要沉淀，不引入新的自动注册、自动发版或自动晋升链路

本阶段只做：

- 基于现有 `governance-summary` / `governance-operations-report` 数据模型设计趋势视图所需的最小快照结构
- 明确第一版趋势指标，例如 proposal aging、applied draft follow-up、capture backlog、governance warning / fail 数量
- 设计并落地趋势数据的落盘位置、聚合方式和最小 CLI / report 入口
- 补齐趋势视图的文档与自动化测试

本阶段不做：

- shared skill 自动正式晋升
- wrapper 自动注册
- release 自动发版
- project-local 自动晋升到 `manual` 或 shared skill
- 跨仓库或远端遥测采集

## 未完成项

- [ ] 定义运营趋势视图第一版的快照模型与核心指标
- [ ] 明确趋势数据落盘位置、保留策略和聚合边界
- [ ] 设计趋势视图的 CLI / report 入口，并与现有 governance snapshot 区分职责
- [ ] 更新 `docs/command-manual.md` 与必要设计文档
- [ ] 补充本阶段自动化测试
- [ ] 当前阶段完成后迁移到 `docs/upgrade-roadmap-history.md`

## 完成标准

- 团队可以看到至少一版稳定的跨周期趋势视图，而不只是一组单次摘要快照
- 趋势视图的指标定义、数据来源和边界明确，不与当前治理快照职责混淆
- 新能力仍保持只读 / 辅助治理定位，不越过自动注册、自动发版或自动晋升边界

## 下一次进入本文件时的动作

- 如果上面还有未勾选项：继续只做本阶段
- 如果上面全部勾选：把本阶段迁移到 `docs/upgrade-roadmap-history.md`，再写入下一个活动阶段
