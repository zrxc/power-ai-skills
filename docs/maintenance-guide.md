# 维护指南

## 日常维护原则

- 企业公共 skill 只维护一份真实源，统一放在 `.power-ai/skills`
- 项目私有补充只放 `.power-ai/skills/project-local`
- 工具入口目录和文件都由 CLI 自动生成，不手改
- skill 默认中文，生成代码时默认补充详细中文注释

## 当前结构收口

- 命令注册单一源已经收敛到 `src/commands/registry.mjs`，不要再在命令分发和 `project root` 解析里各自维护命令长表。
- CLI 启动和服务装配已迁移到 `src/cli/index.mjs`，`bin/` 入口只保留执行壳层。
- 运行时文件读写工具已迁移到 `src/shared/fs.mjs`；`scripts/shared.mjs` 现在只做仓库维护侧复用，不再作为运行时依赖入口。
- npm 发包边界已收缩为运行时资产、最小使用文档和 `skills-manifest`，发布流程产物与维护脚本继续保留在仓库内，但不再进入 npm 包。
- 发布边界校验现在分成“路径名单 + 运行时 smoke”两层：`pnpm check:package` 负责名单约束，`tests/package-boundary-smoke.test.mjs` 负责真实 tarball 解包后的运行时入口 smoke。
- `pnpm clean:runtime` 现在除了清理 `manifest/` 下的忽略产物，还会按白名单回收 `.power-ai/` 下已确认安全的空运行时目录；像 `skills/`、`shared/`、`adapters/`、`governance/` 这类基础结构目录即使暂时为空，也不会被主动删除。
- `docs/command-manual.md` 里的“注册表命令清单”片段由 `pnpm docs:command-manual` 自动生成，并在 `pnpm check:docs` 中校验，新增命令后不要只改文档正文而忽略这段清单。
- 本轮结构评估与后续建议见 `docs/project-structure-assessment.md`。
- `project-scan` 规则层默认按“detector / SFC signal / scan orchestration / analysis projection / project-local lifecycle”分层扩展：
  - 新增 pattern 规则优先放 `src/project-scan/pattern-detectors/`
  - 新增 Vue SFC template AST 信号优先放 `src/project-scan/vue-analysis/template-analysis.mjs`
  - 新增 Vue SFC script AST 信号优先放 `src/project-scan/vue-analysis/script-analysis.mjs`
  - 新增由 template / script 组合得到的语义信号优先放 `src/project-scan/vue-analysis/signal-synthesis.mjs`
  - `src/project-scan/vue-analysis.mjs` 只保留兼容导出入口，不再回填新规则
  - 新增项目文件读取、目录结构探测、view file 枚举或 framework signal 汇总优先放 `src/project-scan/scan-inputs.mjs`
  - 新增逐文件 signals 收集、component usage 汇总或 file role 聚合优先放 `src/project-scan/scan-analysis.mjs`
  - 新增 graph、pattern、project profile 这类项目级扫描结果拼装优先放 `src/project-scan/scan-result-builder.mjs`
  - 新增组件引用边、template import 解析或 graph summary 字段优先放 `src/project-scan/component-graph/graph-builders.mjs`
  - 新增 relation propagation、reach depth 或跨组件 fragment 传播规则优先放 `src/project-scan/component-graph/propagation-analysis.mjs`
  - 新增由 graph / propagation 回灌到单文件 signals 的关联字段优先放 `src/project-scan/component-graph/signal-enrichment.mjs`
  - `src/project-scan/component-graph.mjs` 只保留兼容导出入口，不再继续回填 graph / propagation / enrichment 细节
  - 新增 pattern aggregate 累积、matched file entry 组装或 aggregate collection 规则优先放 `src/project-scan/pattern-aggregation/aggregate-collector.mjs`
  - 新增 pattern aggregate summary、sample file 选择或最终 pattern payload 拼装优先放 `src/project-scan/pattern-aggregation/pattern-result-builder.mjs`
  - `src/project-scan/pattern-aggregation.mjs` 只保留兼容导出入口，不再继续回填 aggregate collection 或 result builder 细节
  - 新增项目级 page pattern summary、pattern frequency 摘要或 profile pattern counters 优先放 `src/project-scan/scan-result/pattern-profile-summary.mjs`
  - 新增 project profile artifact 字段拼装优先放 `src/project-scan/scan-result/project-profile-builder.mjs`
  - 新增最终 result payload 包装或 artifact payload shape 优先放 `src/project-scan/scan-result/result-payload-builder.mjs`
  - `src/project-scan/scan-result-builder.mjs` 只保留兼容导出入口，不再继续回填 profile summary 或 result payload 细节
  - 新增 project scan summary markdown 渲染优先放 `src/project-scan/report-renderers/scan-summary-renderer.mjs`
  - 新增 project scan diff markdown 渲染优先放 `src/project-scan/report-renderers/scan-diff-renderer.mjs`
  - 新增 component graph / propagation 报告渲染优先放 `src/project-scan/report-renderers/component-graph-renderer.mjs` 或 `component-propagation-renderer.mjs`
  - `src/project-scan/report-renderers.mjs` 只保留兼容导出入口，不再继续回填具体 markdown renderer 细节
  - 新增 artifact 存在性校验、load contract 或反馈回退逻辑优先放 `src/project-scan/analysis-artifact-store/artifact-loader.mjs`
  - 新增 json artifact write projection 或 analysis 持久化字段优先放 `src/project-scan/analysis-artifact-store/artifact-json-writer.mjs`
  - 新增 markdown report 输出或 report write persistence 优先放 `src/project-scan/analysis-artifact-store/artifact-report-writer.mjs`
  - `src/project-scan/analysis-artifact-store.mjs` 只保留兼容导出入口，不再继续回填 load / json write / report write 细节
  - `src/project-scan/scan-engine.mjs` 只保留 orchestration，不再继续回填输入采集或项目级结果拼装细节
  - 新增 pattern feedback override、review 决策校验或 review 结果回写优先放 `src/project-scan/project-scan-review-service.mjs`
  - 新增 scan + generation 联动、扫描后草案生成 handoff 优先放 `src/project-scan/project-scan-pipeline-service.mjs`
  - `src/project-scan/index.mjs` 只保留 project-scan service composition，不再继续回填 review 或 pipeline 细节
  - 新增 artifact / report / history 不要回塞 detector 或 `scan-engine`
  - 新增 project-local lifecycle 行为不要回塞 scan 聚合入口
  - 新增 `project-local -> manual` 自动晋升资格判定、阻断原因或 dry-run 计划输出优先放 `src/project-scan/project-local-promotion-planner.mjs`
  - `src/project-scan/project-local-lifecycle-service.mjs` 只保留 `list / plan / promote` 这类 lifecycle facade，不再继续回填资格规则细节
  - 新增 `shared-skill-draft -> skills/` 正式目录晋升资格判定、group 映射、覆盖规则或 dry-run 计划输出优先放 `src/evolution/shared-skill-promotion-planner.mjs`
  - shared skill planner 第一版只允许输出 `eligible / blocked`、目标 `skills/<group>/<skill-name>` 建议和人工确认命令，不直接写入仓库 `skills/`

## 修改 skill 后要做什么

1. 修改 `skills/` 下的 skill 或参考资料。
2. 执行 `pnpm ci:check`。
3. 如变更影响基础框架或组件库，执行 `pnpm impact:check -- <changed-files>`。
4. 如需要，更新 `CHANGELOG.md`。
5. 执行 `pnpm release:prepare`。

## 仓库发布治理

- 在仓库根目录执行 `npx power-ai-skills doctor`，会进入 `package-maintenance` 模式，只检查发布产物，不检查消费项目 `.power-ai/`。
- `pnpm refresh:release-artifacts` 会统一刷新当前版本的 `skills-manifest.json`、`release-notes-<version>.md`、`impact-report.json`、`automation-report.json`、通知载荷以及 `manifest/version-record.json`。
- `manifest/version-record.json` 是当前版本发布产物的正式记录文件，后续校验和排障都以它为准。
- `plan-release-publish` 和 `execute-release-publish` 现在组成受控发布入口：先用 planner 看当前版本是否 `eligible`，再用 executor 重新复核并穿过确认闸口，最后才允许维护者单独手工执行真实 `npm publish`。
- `execute-release-publish` 当前仍保持 skeleton 边界；即使返回 `ready-to-execute`，`manifest/release-publish-record.json`、`manifest/version-record.json.publishExecutionSummary` 和 upgrade summary 里也会明确记录 `realPublishEnabled: false`，表示真实 publish 仍未在 CLI 内启用。
- 在边界正式放开前，不要把 `ready-to-execute` 解读成“已经发版”或“CLI 可以自动发版”；它只表示当前这一轮的受控复核、显式确认和 warning acknowledgement 都已满足。
- `scripts/shared.mjs` 现在统一承接仓库维护侧的 `npm pack` 定位与 JSON 解析 helper；如果继续扩发布边界脚本或 smoke 测试，优先复用这里，不要在脚本和测试里各自再写一套 pack 调用逻辑。
- `manifest/notifications/` 默认只保留最近 3 组通知载荷；更旧的通知会归档到 `manifest/archive/notifications/`，不会直接删除。
- 如只想单独归档旧通知，可执行 `pnpm clean:release-artifacts`。
- 如需同时清理 `manifest/` 忽略产物和 `.power-ai/` 空目录，可执行 `pnpm clean:runtime`。
- 如果改动了 `package.json > files`、`bin/`、`src/cli/`、`src/context.mjs`、`config/`、`templates/project/` 或 release 边界相关忽略规则，除了 `pnpm check:package`，还要补跑：

```bash
node --test ./tests/package-boundary-smoke.test.mjs
```

这组测试会直接验证真实 tarball 解包后的运行时入口还能启动，并对内置 consumer fixture 跑一轮最小 `init` / `doctor` smoke。
- 如果发布边界变化是有意的，要同步更新 `tests/package-boundary-smoke.test.mjs` 中的包含项/排除项断言，保证“发布口径”有明确的自动化表达。

推荐顺序：

```bash
npx power-ai-skills doctor
pnpm clean:runtime
pnpm refresh:release-artifacts
npx power-ai-skills plan-release-publish --json
npx power-ai-skills execute-release-publish --confirm --json
node --test ./tests/package-boundary-smoke.test.mjs
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-automation-report --require-notification-payload
pnpm release:consumer-inputs
pnpm release:prepare
```

## 消费项目维护

- 首次接入优先执行 `power-ai-skills init`
- 如需覆盖团队默认配置，再使用 `power-ai-skills init --tool ...` 或 `--profile ...`
- 后续升级使用 `power-ai-skills sync`
- 调整工具入口使用 `power-ai-skills add-tool` / `remove-tool`
- 项目自检使用 `power-ai-skills doctor`

说明：
- 在消费项目根目录执行 `doctor`，会进入 `single-source` 或 `legacy-compatible` 模式，检查 `.power-ai/`、工具入口、conversation scaffolding 和知识产物。
- 在中心仓库根目录执行 `doctor`，会进入 `package-maintenance` 模式，检查发布治理产物。

## overlay 约定

- 项目差异化规则放 `.power-ai/skills/project-local`
- 不在项目里复制企业公共 skill
- `sync` 默认保留 `project-local`

## 运行时目录保留策略

- 默认长期保留的基础结构：
  - `.power-ai/skills`
  - `.power-ai/shared`
  - `.power-ai/adapters`
  - `.power-ai/governance`
- 这些目录即使暂时为空，也不由 `pnpm clean:runtime` 主动删除，避免影响后续 `sync`、治理账本或工具入口的稳定落点。
- 可安全回收的空目录只限于当前已确认的临时/派生产物区域：
  - `.power-ai/analysis`
  - `.power-ai/context`
  - `.power-ai/reports`
  - `.power-ai/patterns`
  - `.power-ai/conversations`
  - `.power-ai/conversations-archive`
  - `.power-ai/proposals`
  - `.power-ai/proposals/wrapper-promotions`
  - `.power-ai/proposals/wrapper-promotions-archive`
  - `.power-ai/auto-capture` 及其空子目录，例如 `inbox`、`processed`、`failed`、`response-inbox`、`response-processed`、`response-failed`
- 如果某个目录里仍有真实内容，`pnpm clean:runtime` 不会递归清空它，只会在目录本身为空时回收。

## 推荐命令

```bash
pnpm ci:check
pnpm docs:command-manual
pnpm clean:runtime
pnpm refresh:release-artifacts
node --test ./tests/package-boundary-smoke.test.mjs
pnpm clean:release-artifacts
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-automation-report --require-notification-payload
pnpm release:prepare
npx power-ai-skills list-tools
npx power-ai-skills show-defaults
npx power-ai-skills init
npx power-ai-skills sync
npx power-ai-skills doctor
```
