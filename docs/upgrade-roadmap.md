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

### P5-9 规则层目录化与维护收口第三版
阶段目标：
- 在 `P5-8` 已完成服务边界收口的基础上，继续处理 `project-scan` 里最容易再次膨胀的规则层与测试热点。
- 优先把 detector / vue-analysis 一类“规则继续增长就会回到大文件”的位置，收敛成更稳定的目录化落点。
- 同时补齐运行时目录保留策略和测试结构治理，避免后续维护成本重新上升。
- 保持“先稳结构、再扩能力”的节奏，不在这一阶段引入新的业务能力扩张。

本阶段只做：

- 继续拆分 `project-scan` 的规则层热点，优先处理 `pattern-detectors` 与 `vue-analysis` 的目录化或更窄边界落点。
- 收敛大型测试文件中的重复样例，把命令解析、边界 smoke 或相似行为测试逐步整理成更稳定的表驱动结构。
- 梳理 `.power-ai/` 运行时目录的保留与回收策略，明确哪些目录需要长期保留、哪些目录适合继续纳入安全清理。
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

- [x] 至少把 `pattern-detectors` 或 `vue-analysis` 其中一个热点拆到更稳定的目录化规则边界，减少继续堆大文件的惯性。
- [x] 为规则层后续扩展补一份明确落点说明，约束新增检测规则、SFC 分析能力和聚合逻辑应落在哪一层。
- [x] 收敛至少一类大型重复测试样例，优先处理命令解析类或边界 smoke 类测试，让新增覆盖不再主要依赖复制粘贴。
- [x] 明确 `.power-ai/` 运行时目录保留策略，并把必要的清理边界、例外项和维护说明同步到文档与校验链路。
- [x] 补齐本阶段新增变更对应的自动化测试与校验命令。

当前进展：

- `src/project-scan/pattern-detectors.mjs` 已退回为兼容导出层，四类 page pattern detector 已拆到 `src/project-scan/pattern-detectors/` 目录下的独立规则模块。
- 当前拆分先保持 `scan-engine` 与现有调用面的 contract 不变，优先验证“规则层目录化”已经成立，再决定是否继续处理 `vue-analysis`。
- `pnpm test -- --test-name-pattern "project scan|component graph|component propagation|scan-project"` 已通过，可作为本阶段第一轮规则层拆分的回归基线。
- `docs/project-structure-assessment.md` 与 `docs/maintenance-guide.md` 已补充规则层落点说明，明确 detector、SFC signal、scan orchestration、analysis projection 与 project-local lifecycle 的边界分工。
- `tests/selection.test.mjs` 中成批 `resolveProjectRoot keeps cwd ...` 用例已收敛为表驱动结构，后续新增命令解析覆盖时不再需要继续复制整段测试样板。
- `tests/run-release-check.test.mjs` 中 release 产物快照的 JSON / Markdown 搭建已抽成复用 helper，release 边界测试的样板量进一步下降。
- `clean-runtime-artifacts` 已切换为“白名单式空目录回收”：只回收 `analysis`、`context`、`reports`、`patterns`、`conversations`、`proposals`、`auto-capture` 等已确认安全的空目录，`skills`、`shared`、`adapters`、`governance` 等基础结构目录即使为空也继续保留。
- 本阶段关键回归基线已补齐并通过：
  - `pnpm test -- --test-name-pattern "project scan|component graph|component propagation|scan-project"`
  - `pnpm test -- --test-name-pattern "resolveProjectRoot|parsePositionalSelection|expandToolSelection|resolveSelection|detectProjectProfileRecommendation"`
  - `pnpm test -- --test-name-pattern "run-release-check|release consumer inputs|check-release-gates|check-release-consistency"`
  - `pnpm test -- --test-name-pattern "clean-runtime-artifacts|clean runtime"`
  - `pnpm check:docs`

## 完成标准

- `project-scan` 规则层的后续新增能力有更明确的目录化落点，不再优先堆回 detector / vue-analysis 热点文件。
- 大型测试文件中至少有一类重复样例被稳定收敛，后续扩展测试时不再默认复制整段场景。
- `.power-ai/` 运行时目录的保留和回收策略更清晰，清理命令与维护说明对边界表达一致。
- 现有命令文档、发布边界 smoke、维护说明和 release 检查链路在结构变化后仍保持一致。
- 本阶段文档、测试和实现保持一致，可继续作为后续结构优化的基础。

## 下一次进入本文档时的动作

- 如果上面还有未勾选项：继续只做“规则层目录化与维护收口第三版”，不要提前切到新功能阶段。
- 优先核对规则层和测试结构是否真的降低维护热点，而不是只做文件移动或样例搬家。
- 如果上面全部勾选：把本阶段迁移到 `docs/upgrade-roadmap-history.md`，再写入下一个活动阶段。
