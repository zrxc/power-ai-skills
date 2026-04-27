# 项目结构评估结论

## 本轮结论

- 当前仓库最明显的结构风险不是功能缺失，而是工程入口重复维护、运行时与维护脚本边界混杂，以及 npm 发布面偏宽。
- 本轮收口优先围绕四件事展开：命令注册单一源、CLI 启动入口瘦身、运行时依赖边界澄清、发布与清理边界收紧。
- 清理动作坚持“先收边界、再删内容”的原则，避免误伤维护资料、历史产物和本地运行现场。

## 已完成收口

- 命令注册收敛到 `src/commands/registry.mjs`，命令分发与 `project root` 解析共享同一份元数据。
- CLI 启动与服务装配迁移到 `src/cli/index.mjs`，`bin/power-ai-skills.mjs` 只保留执行壳层。
- 运行时共享文件工具迁移到 `src/shared/fs.mjs`，消除 `src/` 对 `scripts/` 的反向依赖。
- npm 包发布面收缩为运行时资产和最小消费文档，维护脚本、baseline、通知载荷和其他 release 中间产物不再随包发布。
- `check-package` 已同步新的发布口径校验，避免实现收紧但发包检查仍按旧边界放行。
- 发布边界 smoke 已补齐到 `tests/package-boundary-smoke.test.mjs`：除了 `npm pack --dry-run --json` 路径名单，还会对真实 tarball 解包后的关键运行时入口和最小 consumer fixture 做 smoke 验证。
- `clean-runtime-artifacts` 现在除了清理 `manifest/` 下的忽略产物，还会回收 `.power-ai/` 下已确认安全的空运行时目录，并支持 `--json`、`--manifest-root`、`--runtime-root`，便于自动化验证。
- Windows / Node 24 下会触发进程崩溃的测试复制路径问题已修复，相关测试统一改为使用稳定的 `copyDir(...)`。

## 高优先级后续优化

- 继续拆 `src/project-scan/index.mjs`，把扫描 orchestration、落盘和草案生成入口再分出更明确的服务层。
- 把命令手册中的命令清单进一步改造成从注册表生成或校验，减少文档和实现之间的手工同步成本。

## P5-8 第二轮拆分方案

### 当前热点判断

- `src/project-scan/index.mjs` 已不再是唯一热点，但仍承担 service composition、scan orchestration、feedback review 和 project-local generation 聚合入口。
- 第二轮真正容易继续膨胀的文件，已经转移到：
  - `src/project-scan/scan-engine.mjs`
  - `src/project-scan/analysis-artifacts.mjs`
  - `src/project-scan/project-local-service.mjs`
  - `src/project-scan/pattern-detectors.mjs`
  - `src/project-scan/vue-analysis.mjs`
- 这几层目前各自已经有边界雏形，但“继续加能力时应该加到哪一层”还不够清晰，后续最容易重新长回“在现有文件里顺手多塞一点逻辑”。

### 第二轮目标

- 不再只追求把文件拆小，而是把后续扩展面收敛成几类稳定边界：
  - `scan inputs`：项目文件读取、SFC / 依赖信号采集
  - `pattern inference`：pattern candidate 检测、聚合和评分
  - `analysis projection`：scan result 到 artifact / report / history 的投影
  - `project-local materialization`：review 后的 draft 生成、增量更新、promotion handoff
- 保证以后新增能力时，先判断“它属于哪一层”，而不是默认堆回 `scan-engine`、`project-local-service` 或测试大文件。

### 建议边界

#### 1. scan-engine 收敛成 orchestration，不继续承载细节规则

- 当前 `scan-engine.mjs` 同时做了：
  - 文件系统遍历
  - `package.json` / 目录结构探测
  - framework signals 汇总
  - view file 逐个分析
  - component graph / propagation 拼装
  - pattern aggregation 与 project profile recommendation 汇总
- 第二轮建议把它收敛成单纯 orchestration，后续新增规则不要直接往这里加。
- 适合继续拆出的子边界：
  - `scan-inputs`：目录结构、view file 列表、package metadata、framework signals
  - `scan-analysis`：单文件 signals 收集、component usage / role summary 汇总
  - `scan-result-builder`：graph、patterns、project profile 拼装

#### 2. analysis-artifacts 拆成 path model 与 writer

- 当前 `analysis-artifacts.mjs` 同时维护：
  - 路径模型 `getProjectScanPaths`
  - artifact load
  - overlay root ensure
  - json / markdown 写盘
- 这会让“新增一个 artifact”时同时牵动 path 定义、load 语义和 write 语义。
- 第二轮建议拆成至少两层：
  - `analysis-paths`：只负责 project-scan 的路径约定
  - `analysis-artifact-store`：只负责 load / write / existence contract
- `ensureOverlayRoot` 更接近 project-local overlay lifecycle，也可以从这里再挪走，避免 analysis 和 materialization 概念继续绑死。

#### 3. project-local-service 拆成 lifecycle 与 generation

- 当前 `project-local-service.mjs` 同时覆盖：
  - generate
  - list
  - promote
  - overlay root ensure
  - promotion trace 记录
- 这些职责都和 “project-local skill lifecycle” 有关，但并不都属于同一个扩展面。
- 第二轮建议至少拆成：
  - `project-local-generation-service`：generate / regenerate / incremental refresh
  - `project-local-lifecycle-service`：list / promote / future archive / cleanup
- 这样后续如果继续补 manual handoff、draft status 或 promotion governance，不会再默认堆回同一文件。

#### 4. pattern-detectors 与 vue-analysis 继续向“规则层”收敛

- `pattern-detectors.mjs` 已经是规则层，但四类 pattern 仍放在同一文件里；未来一旦新增 pattern，很容易把它继续推回超大 switchboard。
- `vue-analysis.mjs` 已经同时承担 template AST、script AST、signal synthesis，后续如果继续增强 SFC 解析，体积还会继续涨。
- 第二轮建议：
  - `pattern-detectors/` 目录化，按 pattern type 分文件，例如 `basic-list-detector`、`tree-list-detector`、`dialog-form-detector`、`detail-page-detector`
  - `vue-analysis` 拆成 `template-analysis`、`script-analysis`、`signal-synthesis`
- 这部分不一定要在本阶段全部落完，但至少要把目录和落点规则先立住，否则下一轮能力扩张时又会回到大文件。

### 推荐执行顺序

1. 先拆 `analysis-artifacts`
   - 风险最低，收益直接
   - 能先把 path / write / load contract 固定下来
   - 也方便后续 `project-local-service` 和 release maintenance 边界继续解耦

2. 再拆 `project-local-service`
   - 当前生成与 lifecycle 已经是天然的两个面
   - 拆完后，后续 project-local governance 功能就有更稳定落点

3. 然后收窄 `scan-engine`
   - 等 path store 与 project-local lifecycle 稳定后，再把 orchestration 从扫描细节里抽干净
   - 这样不容易出现“拆完又要因为输出 contract 重写”的反复返工

4. 最后再处理 detector / vue-analysis 目录化
   - 这是后续扩展收益最大的长期动作
   - 但改动面更广，放在前面容易把本阶段变成纯文件迁移

### 本阶段优先落点

- 如果本阶段只允许做一轮实现，优先顺序建议是：
  - 第一优先：`analysis-artifacts.mjs`
  - 第二优先：`project-local-service.mjs`
  - 第三优先：`scan-engine.mjs`
- 对应判断标准：
  - 新增一个 project-scan artifact 时，不需要同时修改路径模型、writer、overlay 生命周期三套逻辑
  - 新增一个 project-local lifecycle 动作时，不需要顺手碰 draft generation
  - 新增一个 scan 信号或 profile 汇总时，不需要直接修改 `scan-engine` 的大段主流程

### 当前进展

- 本轮已经先完成 `analysis-artifacts` 的第一层结构收口：
  - `analysis-paths.mjs` 只负责 project-scan 路径模型
  - `analysis-artifact-store.mjs` 只负责 artifact load / write contract
  - `project-local-overlay.mjs` 只负责 overlay root lifecycle
- `analysis-artifacts.mjs` 现在退回到兼容导出层，调用方已开始改为直接依赖更窄的模块边界。
- 这一轮先保留外部 contract 不变，优先验证“路径模型 / artifact store / overlay lifecycle”已经不再绑在同一文件里。
- `project-local-service.mjs` 也已经完成第一层拆分：
  - `project-local-generation-service.mjs` 只负责 draft generation / regenerate
  - `project-local-lifecycle-service.mjs` 只负责 list / promote 等 lifecycle 动作
- `project-local-service.mjs` 现在退回到装配层，后续如果继续补 governance handoff、archive 或 cleanup，不必再默认堆回同一文件。

## 后续优化

- 评估是否把仓库维护态的 release 检查入口与消费项目 CLI 再做一次解耦，减少运行时包对维护流程概念的感知。
- 持续压缩大型测试文件中的重复样例，把命令解析类测试整理成表驱动形式。
- 继续梳理 `.power-ai` 运行时目录的保留策略，明确哪些非空目录仍需要长期保留，哪些产物适合交给专门清理命令管理。

## 清理范围说明

- 本轮没有删除已跟踪的 release artifacts、技术方案文档或历史归档目录。
- 已完成的“清理”主要包括两类：
  - 边界收紧：运行时不再依赖 `scripts/`，npm 包不再携带维护脚本、baseline、通知载荷和其他 release 中间产物。
  - 安全回收：`clean-runtime-artifacts` 会删除 `manifest/` 中按规则生成的无价值运行时产物，并回收 `.power-ai/` 下的空目录，例如空的 `context/`、`conversations/`、`auto-capture/failed/`、`proposals/wrapper-promotions/` 等。
- `.power-ai/` 下仍有内容的运行时目录不在自动删除范围内，避免误删现场数据。
