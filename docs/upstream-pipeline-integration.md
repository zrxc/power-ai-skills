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

## 建议变量

- `UPGRADE_BASE_SHA`
- `UPGRADE_HEAD_SHA`
- `UPGRADE_REPO_PATH`
- `UPGRADE_CONSUMER_PROJECT`

## 模板文件

参考模板见：

- `templates/ci/upstream-gitlab-ci.yml`
