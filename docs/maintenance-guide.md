# 维护指南

## 日常维护原则

- 企业公共 skill 只维护一份真实源，统一放在 `.power-ai/skills`
- 项目私有补充只放 `.power-ai/skills/project-local`
- 工具入口目录和文件都由 CLI 自动生成，不手改
- skill 默认中文，生成代码时默认补充详细中文注释

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

推荐顺序：

```bash
npx power-ai-skills doctor
pnpm refresh:release-artifacts
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-automation-report --require-notification-payload
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

## 推荐命令

```bash
pnpm ci:check
pnpm refresh:release-artifacts
pnpm clean:release-artifacts
pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-automation-report --require-notification-payload
pnpm release:prepare
npx power-ai-skills list-tools
npx power-ai-skills show-defaults
npx power-ai-skills init
npx power-ai-skills sync
npx power-ai-skills doctor
```
