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
  - 新增 Vue SFC 信号优先放 `src/project-scan/vue-analysis.mjs` 对应子层
  - 新增 artifact / report / history 不要回塞 detector 或 `scan-engine`
  - 新增 project-local lifecycle 行为不要回塞 scan 聚合入口

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
