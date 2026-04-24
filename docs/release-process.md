# 发布流程

## 当前版本

当前包版本以 `package.json` 为准；发布产物版本记录统一写入 `manifest/version-record.json`。

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

14. 生成发布说明：

```bash
pnpm release:notes
```

15. 执行本地打包验证：

```bash
pnpm pack:local
```

16. 正式发布前，执行完整预发检查：

```bash
pnpm release:prepare
```

17. 如需验证消费侧链路，执行：

```bash
node ./scripts/verify-consumer.mjs <project-path>
```

18. 发布到私有 npm：

```bash
pnpm publish --registry http://192.168.140.17:8081/nexus/repository/npm-private/
```

## release:prepare 当前包含的动作

```bash
pnpm refresh:release-artifacts
pnpm ci:check
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-risk-report --require-automation-report --require-notification-payload
node ./scripts/verify-consumer.mjs --fixture basic --matrix-json manifest/consumer-compatibility-matrix.json --matrix-markdown manifest/consumer-compatibility-matrix.md
pnpm check:release-gates -- --require-consumer-matrix
pnpm upgrade:advice -- --automation-report manifest/automation-report.json
pnpm governance:operations -- --automation-report manifest/automation-report.json
pnpm upgrade:payload -- --automation-report manifest/automation-report.json
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-risk-report --require-consumer-matrix --require-release-gate --require-governance-operations --require-upgrade-advice --require-automation-report --require-notification-payload
```

说明：
- 第一段一致性校验用于确认刷新后的 release notes、impact、risk、automation 和 notification 基线。
- `verify-consumer` 会在验证消费侧链路的同时产出当前 consumer compatibility matrix。
- `check:release-gates` 会把 artifact consistency、team policy、consumer compatibility 和治理 warning gate 收敛成统一门禁报告。
- `upgrade:advice`、`governance:operations`、`upgrade:payload` 会补齐治理摘要、升级建议和当前通知载荷。
- 最后一段一致性校验用于确认 consumer matrix、release gate、governance operations 和 notification 已全部对齐当前版本。

## 当前收包口径

- npm 包只会携带当前版本的 `manifest/notifications/upgrade-payload-*.json/.md`
- npm 包只会携带当前版本对应的 `manifest/impact-tasks/impact-task-*.md`
- `manifest/archive/` 和历史技术方案设计稿 `docs/technical-solutions/` 不会进入 npm 包
- 如果仓库里手动清掉了 `manifest/archive/`，后续执行 `pnpm refresh:release-artifacts` 或 `pnpm clean:release-artifacts` 时会在需要时自动重建

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
