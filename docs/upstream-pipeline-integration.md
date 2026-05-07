# 上游仓库 / 发布流水线接入说明

## 目标

让组件库仓库、基础框架仓库或私仓发布流水线只调用一条总控命令，就能自动完成：

1. 收集变更文件
2. 生成 impact report
3. 生成升级任务
4. 验证消费项目
5. 生成通知载荷

## 推荐总控命令

```bash
node ./scripts/run-upgrade-automation.mjs --base <git-base> --head <git-head> --consumer D:/webCode/Myd/基础服务/powermonitor_front
```

## 产物

总控脚本会生成这些文件：

- `manifest/changed-files.txt`
- `manifest/impact-report.json`
- `manifest/impact-tasks/*.md`
- `manifest/automation-report.json`

如果还要给消息机器人或平台 API 发通知，再执行：

```bash
node ./scripts/generate-upgrade-payload.mjs
```

会继续生成：

- `manifest/notifications/*.json`
- `manifest/notifications/*.md`

## 典型流水线顺序

### 组件库仓库

1. 执行组件库本身的 lint / test / build
2. 调用 `run-upgrade-automation.mjs`
3. 保存 `manifest` 目录中的产物
4. 把 `upgrade-payload` 发给机器人、评论系统或 issue 系统

### 私仓发布流水线

1. 构建并发布组件库包
2. 收集本次发布对应的 changed files
3. 调用 `run-upgrade-automation.mjs`
4. 触发 skill 仓库或相关 owner 处理升级任务

## 托管发布调用壳

当上游流水线已经准备好从托管环境推进 skill 仓库自己的发布时，优先调用维护侧 wrapper，而不是直接在模板里散写 `execute-release-unattended-hosted`：

```bash
pnpm release:hosted -- --runtime-source ci --strict --trigger-id "$CI_PIPELINE_ID" --trigger-label "$CI_PIPELINE_SOURCE"
```

这条壳子的作用是：

1. 统一 `runtime source / trigger` 传参方式
2. 继续复用现有 hosted boundary -> unattended governance -> publish contract
3. 让流水线显式决定“只校验 hosted contract”还是“必须等到 published 才算成功”
4. 在需要时把“必须是手工触发的 tag release job”也收口为 wrapper contract，或直接统一收口为 `--strict`

如果只想把托管环境证据和 hosted record 落盘，而不是强制收口成 `published`，可以去掉 `--expect-status published`。在默认策略下，`blocked` / `not-authorized` / `authorization-expired` / `follow-up-blocked` 会按 record-only 结果返回；`publish-failed` / `execution-locked` 仍会直接让 job 失败。
模板里同时建议用 `POWER_AI_ENABLE_HOSTED_RELEASE=1` 做显式开关，避免 tag / release pipeline 默认露出 hosted publish job。
当前第一版 `ci` 接线还要求运行时存在 tag 证据；没有 tag 时，`release:hosted` 会直接在 wrapper 层返回失败。模板当前还显式加了 `--require-manual-trigger`，把“手工触发”也纳入推荐 contract。

推荐最小排障顺序：

1. 先看 wrapper 输出中的 `wrapperStatus`
2. 再看 `wrapper.finalStatusPolicy`
3. 然后按状态去看：
   - `hosted-schedule-contract-failed`：检查 CI 显式变量门、tag 证据、manual trigger 证据
   - `hosted-runtime-contract-failed`：检查 hosted record 和 runtime source / runtime evidence
   - `default-final-status-failed`：检查 publish record / failure summary
   - `hosted-wrapper-complete`：继续看 governance / authorization / orchestration record

## 建议变量

- `UPGRADE_BASE_SHA`
- `UPGRADE_HEAD_SHA`
- `UPGRADE_REPO_PATH`
- `UPGRADE_CONSUMER_PROJECT`
- `POWER_AI_RELEASE_RUNTIME_SOURCE`
- `POWER_AI_ENABLE_HOSTED_RELEASE`

## 模板文件

参考模板见：

- `templates/ci/upstream-gitlab-ci.yml`
