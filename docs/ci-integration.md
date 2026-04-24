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
