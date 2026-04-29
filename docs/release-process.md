# 发布流程

## 当前版本

当前包版本以 `package.json` 为准；发布产物版本记录统一写入 `manifest/version-record.json`。

当前 release 维护侧有两类正式 record：

- `manifest/release-orchestration-record.json`
  - 记录多步骤发布编排的 dry-run 结论
  - 关注点是 stage model、blockers、human gates、evidence 和 `nextAction`
  - 不声明真实 publish 已执行
- `manifest/release-publish-record.json`
  - 记录单次真实受控 publish 执行结果
  - 关注点是确认闸口、真实 publish 是否尝试、是否成功、失败摘要和 `nextAction`
  - 是真实发包状态的权威记录

`manifest/version-record.json` 会回填这两类快照：

- `releaseOrchestrationSummary`
- `publishExecutionSummary`

后续 `doctor` package-maintenance 与 `generate-upgrade-summary` 都优先读取这里的快照，而不是重新各自推导一套 release 状态。

## 三层状态边界

- 编排已 ready：
  - 以 `manifest/release-orchestration-record.json` 或 `manifest/version-record.json.releaseOrchestrationSummary` 中的 `ready-for-controlled-publish` 为准。
  - 只表示 pre-publish 步骤已经推进到真实 publish 人工闸口前。
  - 不表示已经获得无人值守治理授权，也不表示真实 publish 已执行。
- 已授权无人值守候选：
  - 这是无人值守治理层的概念，详细设计见 `docs/technical-solutions/release-unattended-governance-design-1.4.7.md`。
  - 当前由 `manifest/release-unattended-authorization.json` / `releaseUnattendedAuthorizationSummary` 声明；它表达的只是“当前版本在特定证据和约束下被允许进入无人值守候选窗口”。
  - 它不声明真实 publish 已执行，也不能覆盖 `release-publish-record.json` 的最终状态语义。
- 真实 publish 已执行：
  - 以 `manifest/release-publish-record.json` 或 `manifest/version-record.json.publishExecutionSummary` 为准。
  - 只有这一层负责声明真实 publish 是否尝试、是否成功，以及失败摘要。
  - 如果这里不是 `published`，就不能把任何编排 ready 或治理授权状态解读为“已经发出去了”。

当前仓库现在有两个真实发版相关入口：

- `authorize-release-unattended-governance`
  - 维护者显式创建或覆盖当前无人值守治理授权。
  - 会写入当前授权 record、历史授权归档以及 `version-record.json.releaseUnattendedAuthorizationSummary`。
- `execute-release-publish`
  - 维护者显式确认后直接执行真实 publish。
- `execute-release-unattended-governance`
  - 先重新跑无人值守治理 planner。
  - 只有在治理状态达到 `authorized-ready` 时，才会继续代理调用真实 publish executor。
  - 如果治理条件不满足，它只会记录当前阻断状态，不会触发真实 publish。

但这仍不等于“默认自动发版”已经启用。当前仓库还没有把无人值守治理接成 cron、CI 定时器或 webhook 自动触发入口；所有真实发版动作仍然需要维护者显式运行命令。

## 中心仓库发布

1. 修改 skill、脚本、模板或文档。
2. 更新 `package.json` 版本号与 `CHANGELOG.md`。
3. 在仓库根目录执行维护态自检：

```bash
npx power-ai-skills doctor
```

4. 执行 `pnpm ci:check`。
5. 如涉及基础框架或组件库升级，执行 `pnpm impact:check -- <changed-files>`。
6. 如需只读检查依赖变化，执行 `pnpm check:dependencies`；如需生成 `deps-updates.json` 报告，执行 `pnpm report:dependencies`。
7. 如需写回依赖兼容信息和报告，执行 `pnpm update:dependencies`。脚本会跳过 registry 返回版本低于当前基线的降级结果，并提示人工复核。
8. 如需生成升级任务，执行：

```bash
pnpm impact:task -- --report manifest/impact-report.json
```

9. 如需跑完整自动化链路，执行：

```bash
pnpm upgrade:automation -- --base <git-base> --head <git-head> --repo <upstream-repo-path> --consumer <project-path>
```

10. 如需单独生成通知载荷，执行：

```bash
pnpm upgrade:payload
```

11. 如需单独刷新和记录当前版本发布产物，执行：

```bash
pnpm refresh:release-artifacts
```

这一步会：
- 重建 `manifest/skills-manifest.json`
- 生成 `manifest/release-notes-<version>.md`
- 刷新 `manifest/impact-report.json`、`manifest/automation-report.json`、`manifest/upgrade-advice-package.json`、`manifest/governance-operations-report.json`
- 生成最新通知载荷到 `manifest/notifications/`
- 更新 `manifest/version-record.json`
- 将更旧通知归档到 `manifest/archive/notifications/`
- 重写 `manifest/notifications/.npmignore` 与 `manifest/impact-tasks/.npmignore`，确保 npm 包只收录当前版本的 notification payload 和 impact task

12. 如需单独校验发布产物一致性，执行：

```bash
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-risk-report --require-consumer-matrix --require-release-gate --require-governance-operations --require-upgrade-advice --require-automation-report --require-notification-payload
```

13. 如需只归档旧通知，执行：

```bash
pnpm clean:release-artifacts
```

14. 如需顺手清理 `manifest/` 忽略产物与 `.power-ai/` 空运行时目录，执行：

```bash
pnpm clean:runtime
```

15. 生成发布说明：

```bash
pnpm release:notes
```

16. 执行本地打包验证：

```bash
pnpm pack:local
```

如需只验证“真实 tarball 的发布边界 + 运行时入口”这一层 smoke，可单独执行：

```bash
node --test ./tests/package-boundary-smoke.test.mjs
```

这组 smoke 会直接：
- 执行真实 `npm pack`
- 解包 tarball 并校验运行时必须资产仍在包内
- 校验维护脚本、baseline、通知载荷和维护侧文档未被误收进 tarball
- 从解包产物直接启动 `bin/power-ai-skills.mjs`
- 对内置 consumer fixture 跑一轮最小 `show-defaults` / `init` / `doctor` 验证

17. 正式发布前，执行完整预发检查：

```bash
pnpm release:prepare
```

18. 如需验证消费侧链路，执行：

```bash
node ./scripts/verify-consumer.mjs <project-path>
```

19. 在正式 publish 前，先确认 planner 仍然 `eligible`：

```bash
npx power-ai-skills plan-release-publish --json
```

20. 在进入真实 publish 前，先运行编排层受控串行执行，把 pre-publish 步骤统一推进到人工 publish 闸口前：

```bash
npx power-ai-skills execute-release-orchestration --json
```

- 这一步会刷新：
  - `manifest/release-orchestration-record.json`
  - `manifest/release-orchestration-records/`
  - `manifest/version-record.json.releaseOrchestrationSummary`
- 它会自动顺序执行：
  - `pnpm refresh:release-artifacts`
  - `pnpm release:validate`
  - `pnpm release:check`
  - `pnpm release:generate`
- 如果当前状态是：
  - `prepare-failed`：先按 orchestration record 里的失败步骤和 `nextAction` 处理，不进入真实 publish
  - `blocked`：说明 pre-publish 步骤虽然跑完，但最新 orchestration planner 仍然阻断，先处理 blocker
  - `ready-for-controlled-publish`：说明已经安全推进到真实 publish 人工闸口前，可以继续进入下一步受控 publish executor；这仍不是“已授权无人值守候选”或“真实 publish 已执行”
  - `published-awaiting-follow-up`：说明最近一次真实 publish 已完成，应先做 follow-up，而不是重复发版

21. 如需只读确认当前编排层状态，也可以单独再看一次 dry-run：

```bash
npx power-ai-skills plan-release-orchestration --json
```

22. 如当前编排层与治理 planner 都已就绪，可先显式写入无人值守治理授权：

```bash
npx power-ai-skills authorize-release-unattended-governance --authorized-by <maintainer> --json
```

- 这一步会：
  - 把当前授权写入 `manifest/release-unattended-authorization.json`
  - 归档历史授权到 `manifest/release-unattended-authorizations/`
  - 如存在旧的 active 授权，则先把它标记为 `superseded`
- 这一步仍不触发真实 publish；它只是在当前证据快照上声明“允许进入无人值守候选窗口”。

23. 如已具备有效治理授权，且希望通过治理入口代理执行真实 publish，可执行：

```bash
npx power-ai-skills execute-release-unattended-governance --json
```

- 这一步会先重新检查：
  - 当前编排层是否仍是 `ready-for-controlled-publish`
  - 当前 publish planner 是否仍是 `eligible`
  - 当前版本是否存在有效且未消费的无人值守授权
- 只有治理状态达到 `authorized-ready` 时，它才会继续调用真实 publish executor。
- 如果返回 `blocked`、`execution-locked`、`follow-up-blocked` 或 `authorization-expired`，说明这一步没有触发真实 publish，应先处理治理 blocker。

24. 再运行一次受控 publish executor，确保本次发版使用的是最新证据，而不是旧 dry-run：

```bash
npx power-ai-skills execute-release-publish --confirm --json
```

- 如果 release gate 是 `warn`，改为：

```bash
npx power-ai-skills execute-release-publish --confirm --acknowledge-warnings --json
```

- 当前 executor 会在 controlled gate 满足后直接执行真实 publish；成功时返回 `published`，失败时返回 `publish-failed`。
- 因此完成这一步后，不需要再额外手工补一次 `pnpm publish`；是否真正发包以 `manifest/release-publish-record.json` 中的最终状态为准。
- 这一步会刷新：
  - `manifest/release-publish-record.json`
  - `manifest/release-publish-records/`
  - `manifest/version-record.json.publishExecutionSummary`
  - 失败时额外写出 `manifest/release-publish-failure-summary.md`

24. 真实 publish 结束后，刷新维护视图并确认 follow-up：

```bash
npx power-ai-skills generate-upgrade-summary --json
npx power-ai-skills doctor
```

- 如果最新 orchestration snapshot 已进入 `published-awaiting-follow-up`，重点查看：
  - `manifest/release-orchestration-record.json`
  - `manifest/release-publish-record.json`
  - `manifest/upgrade-summary.md`
- 这一步的目标不是再次发包，而是确认 post-publish follow-up、通知和治理摘要都已经对齐当前版本。

## 维护者快速判读

- 想知道“当前编排层建议我做什么”：
  - 看 `manifest/release-orchestration-record.json`
  - 或看 `manifest/version-record.json.releaseOrchestrationSummary`
- 想知道“当前是否只是推进到了人工闸口前”：
  - 看编排层状态是不是 `ready-for-controlled-publish`
  - 这只表示可以进入受控 publish executor，不表示已经发版
- 想知道“未来如果接入无人值守治理，这份状态算不算已授权候选”：
  - 不能只看 orchestration ready
  - 需要单独看治理授权记录；详细 contract 见 `docs/technical-solutions/release-unattended-governance-design-1.4.7.md`
- 想知道“刚才到底有没有真的发出去”：
  - 看 `manifest/release-publish-record.json`
  - 或看 `manifest/version-record.json.publishExecutionSummary`
- 想知道“为什么现在不能继续发”：
  - 编排层 blocker 看 `release-orchestration-record.json.blockers`
  - 单次 publish 失败看 `release-publish-record.json.blockers`
  - 真实 publish 失败摘要看 `manifest/release-publish-failure-summary.md`
- 想把两层状态放在一张表里看：
  - 运行 `npx power-ai-skills generate-upgrade-summary --json`
  - 或运行 `npx power-ai-skills doctor` 进入 `package-maintenance` 模式

## release:prepare 当前包含的动作

```bash
pnpm refresh:release-artifacts
pnpm ci:check
node ./scripts/check-release-consistency.mjs --require-release-notes --require-impact-report --require-risk-report --require-automation-report --require-notification-payload
node ./scripts/release-consumer-inputs.mjs --fixture basic --matrix-json manifest/consumer-compatibility-matrix.json --matrix-markdown manifest/consumer-compatibility-matrix.md
node ./scripts/check-release-gates.mjs --require-consumer-matrix
pnpm upgrade:advice -- --automation-report manifest/automation-report.json
pnpm governance:operations -- --automation-report manifest/automation-report.json
pnpm upgrade:payload -- --automation-report manifest/automation-report.json
node ./scripts/check-release-consistency.mjs --require-release-notes --require-impact-report --require-risk-report --require-consumer-matrix --require-release-gate --require-governance-operations --require-upgrade-advice --require-automation-report --require-notification-payload
```

说明：
- `release:validate` 现在只负责仓库维护态校验，也就是 `pnpm ci:check`。
- 第一段一致性校验用于确认刷新后的 release notes、impact、risk、automation 和 notification 基线。
- `release:consumer-inputs` 会在维护态入口里统一刷新当前 consumer compatibility matrix；底层仍然调用 `verify-consumer`，但 fixture、matrix 路径和 manifest 目录不再散落在 release 脚本串里。
- `release:check` 会继续串起 consumer release inputs、release gates 和最终一致性校验，把 artifact consistency、team policy、consumer compatibility 和治理 warning gate 收敛成统一收口。
- `upgrade:advice`、`governance:operations`、`upgrade:payload` 会补齐治理摘要、升级建议和当前通知载荷。
- 最后一段一致性校验用于确认 consumer matrix、release gate、governance operations 和 notification 已全部对齐当前版本。
- `pnpm test` 当前已包含 `tests/package-boundary-smoke.test.mjs`，因此 `release:prepare` 里的 `pnpm ci:check` 不只验证路径名单，也会验证真实 tarball 的运行时 smoke。

## 当前收包口径

- npm 包只保留运行时必须资产：`src/`、`skills/`、`templates/project/`、`bin/`、`config/`、`manifest/skills-manifest.json`
- npm 包只保留最小消费文档：`docs/command-manual.md`、`docs/tool-adapters.md`、`docs/doctor-error-codes.md`、`docs/troubleshooting-consumer.md`、`docs/governance.md`
- 仓库维护脚本 `scripts/`、发布基线 `baseline/`、release artifacts、通知载荷、impact task、`manifest/archive/` 和维护侧文档不再进入 npm 包
- 历史技术方案设计稿 `docs/technical-solutions/` 继续只保留在源码仓库
- 发布边界校验现在分两层：
  - `pnpm check:package` 负责校验 `files`、`scripts`、`npm pack --dry-run --json` 路径名单和不应进入 tarball 的目录
  - `tests/package-boundary-smoke.test.mjs` 负责校验真实 tarball 解包后的关键运行时入口和最小 consumer smoke
- 如果仓库里手动清掉了 `manifest/archive/`，后续执行 `pnpm refresh:release-artifacts` 或 `pnpm clean:release-artifacts` 时会在需要时自动重建
- 如果需要顺手回收 `manifest/` 忽略产物和 `.power-ai/` 下的空运行时目录，可以执行 `pnpm clean:runtime`

## 业务项目消费

1. 更新依赖版本。
2. 执行 `pnpm install`。
3. 如消费项目已配置推荐脚本，`postinstall` 会自动触发 `power-ai-skills sync`；否则手动执行 `pnpm exec power-ai-skills sync`。
4. 项目内 `.power-ai/` 自动更新。
5. 如需排查同步状态，执行 `pnpm exec power-ai-skills doctor`。
6. 如需查看团队默认配置，执行 `pnpm exec power-ai-skills show-defaults`。
7. 如需新增工具入口，执行 `pnpm exec power-ai-skills add-tool --tool <tool-name>`。
8. 如需移除工具入口，执行 `pnpm exec power-ai-skills remove-tool --tool <tool-name>`。

## 版本建议

- `patch`：文档修订、模板调整、轻微兼容修复
- `minor`：新增 skill、工具适配增强、入口识别增强
- `major`：目录结构、接入方式、核心模式发生不兼容变化

详见 `docs/versioning-policy.md`。
