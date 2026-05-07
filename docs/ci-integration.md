# CI 接入说明

## 目标

把 `impact-check`、升级任务生成和消费项目验证接入 CI，让 `power-ai-skills` 的升级从“人工执行脚本”变成“流水线自动出报告、自动给出任务、自动验证消费侧”。

## 推荐接入链路

### 1. 仓库基础校验

每次提交或合并请求执行：

```bash
pnpm ci:check
```

### 2. 影响分析

当基础框架或组件库相关文件变更时执行：

```bash
node ./scripts/impact-check.mjs --from-file changed-files.txt
```

建议把输出重定向到文件：

```bash
node ./scripts/impact-check.mjs --from-file changed-files.txt > manifest/impact-report.json
```

### 3. 生成升级任务

```bash
node ./scripts/generate-impact-task.mjs --report manifest/impact-report.json
```

### 4. 消费项目验证

```bash
node ./scripts/verify-consumer.mjs D:/webCode/Myd/基础服务/powermonitor_front
```

如需更严格，也可以跑：

```bash
node ./scripts/verify-consumer.mjs --commands init,sync,doctor D:/path/to/project
```

## 推荐的 CI 阶段

- `lint`
  - `pnpm ci:check`
- `impact`
  - `impact-check`
  - `generate-impact-task`
- `consumer`
  - `verify-consumer`
- `hosted-release`
  - `pnpm release:hosted -- --strict`

## Hosted 调用壳

如果你们已经准备把仓库维护侧发布挂到托管运行时，但还不想直接把“自动触发默认开启”写死到仓库里，优先接这一层：

```bash
pnpm release:hosted -- --strict
```

说明：

- `release:hosted` 是维护侧 wrapper，会代理到 `execute-release-unattended-hosted --json`。
- 对脚本 / pipeline 的推荐读取口径，优先看 `wrapper.scheduleContract`，不要先把 `ciReleaseContract` / `cronReleaseContract` 当成一线入口。
- 如需统一严格策略，优先用 `--strict`，不要先在不同宿主里手工拼 `--expect-status published` / `--require-manual-trigger`。
- 未显式传 `--runtime-source` 时，它会优先读 `POWER_AI_RELEASE_RUNTIME_SOURCE`，否则按 `POWER_AI_RELEASE_CRON=1` / `CI=true` 推断。
- 模板里的 hosted release job 还会额外要求 `POWER_AI_ENABLE_HOSTED_RELEASE=1`，避免 tag 一出现就默认露出发布入口。
- 当前 `P6-11` 第一版里，如果 runtime source 为 `ci`，wrapper 还会直接校验当前运行时是否带有 tag 证据；没有 tag 时会在 wrapper 层失败，而不是继续把这件事留给宿主 YAML 自己约束。
- 如果追加 `--require-manual-trigger`，wrapper 还会要求检测到手工触发证据；当前 GitLab 手工 job 场景主要依赖 `CI_JOB_MANUAL=true`。
- 默认会把这些状态直接视为流水线失败：
  - `hosted-runtime-source-required`
  - `hosted-runtime-evidence-missing`
  - `publish-failed`
  - `execution-locked`
- 这些状态默认只记录不失败：
  - `blocked`
  - `not-authorized`
  - `authorization-expired`
  - `follow-up-blocked`
- 如果你希望托管 job 只在“这次真的发布成功”时通过，应显式加：

```bash
pnpm release:hosted -- --strict
```

## Hosted 接线验证清单

推荐至少按这组顺序验一次，不要一上来就直接把 CI job 当成“默认自动发版”：

1. 先确认模板 job 仍带显式门：
   - `POWER_AI_ENABLE_HOSTED_RELEASE=1`
   - `--strict`
2. 先在 tag 手工 job 中验证 wrapper contract：
   - 当前运行时能暴露 tag 证据
   - 当前运行时能暴露手工触发证据
   - job artifact 至少保留 `manifest/release-unattended-hosted-record.json` 与 `manifest/version-record.json`
3. 再确认默认失败语义是否符合预期：
  - `hosted-schedule-contract-failed` 说明连 CI 调度前置条件都没满足
  - `hosted-runtime-contract-failed` 说明进入 wrapper 后，底层 hosted runtime evidence 仍不成立
  - `default-final-status-failed` 说明已进入治理 / publish 语义，但命中了 `publish-failed` 或 `execution-locked`
  - `hosted-wrapper-complete` 只说明 wrapper 没有失败；如未传 `--expect-status published`，仍需继续看最终状态
4. 如本次只想验证接线，不想把 `not-authorized` / `follow-up-blocked` 直接记成失败：
  - 去掉 `--expect-status published`
  - 保留 artifact，继续检查 `wrapper.scheduleContract`、`wrapper.finalStatusPolicy` 与 hosted / governance record

## Hosted 排障速查

- `hosted-schedule-contract-failed`
  - 先看 `wrapper.scheduleContract`
  - 先检查 `POWER_AI_ENABLE_HOSTED_RELEASE`
  - 再检查 tag 证据和手工触发证据是否真的出现在当前 CI 平台
- `hosted-runtime-contract-failed`
  - 先看 `manifest/release-unattended-hosted-record.json`
  - 确认 wrapper 透传的 `runtimeSource` 与底层 runtime evidence 是否一致
- `default-final-status-failed`
  - 如果 `finalStatusPolicy.status=execution-locked`，先看 `manifest/release-publish-record.json` 和 `manifest/release-publish-failure-summary.md`
  - 如果 `finalStatusPolicy.status=publish-failed`，直接按真实 publish 失败排障
- `hosted-wrapper-complete`
  - 如果最终状态是 `blocked` / `not-authorized` / `authorization-expired` / `follow-up-blocked`，说明当前 job 更适合继续看治理 blocker，而不是继续调 wrapper

## 产物建议

建议把这些文件作为 CI artifact 保存：

- `manifest/skills-manifest.json`
- `manifest/release-notes-<version>.md`
- `manifest/impact-report.json`
- `manifest/impact-tasks/*.md`

## 模板文件

参考模板见：

- `templates/ci/gitlab-ci.yml`

如果你们平台不是 GitLab，也可以直接复用同样的命令链路迁移到其他 CI。
