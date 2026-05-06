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
  - `pnpm release:hosted -- --expect-status published`

## Hosted 调用壳

如果你们已经准备把仓库维护侧发布挂到托管运行时，但还不想直接把“自动触发默认开启”写死到仓库里，优先接这一层：

```bash
pnpm release:hosted -- --expect-status published
```

说明：

- `release:hosted` 是维护侧 wrapper，会代理到 `execute-release-unattended-hosted --json`。
- 未显式传 `--runtime-source` 时，它会优先读 `POWER_AI_RELEASE_RUNTIME_SOURCE`，否则按 `POWER_AI_RELEASE_CRON=1` / `CI=true` 推断。
- 模板里的 hosted release job 还会额外要求 `POWER_AI_ENABLE_HOSTED_RELEASE=1`，避免 tag 一出现就默认露出发布入口。
- 默认只把 hosted runtime contract 失败视为流水线失败：
  - `hosted-runtime-source-required`
  - `hosted-runtime-evidence-missing`
- 如果你希望托管 job 只在“这次真的发布成功”时通过，应显式加：

```bash
pnpm release:hosted -- --expect-status published
```

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
