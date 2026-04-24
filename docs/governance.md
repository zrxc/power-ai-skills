# Skill 治理规范

## 关联文档

- `README.md`
  用于快速了解仓库定位、消费项目接入方式和治理主线入口。
- `docs/command-manual.md`
  用于查询具体治理命令，包括 team policy、project profile、conversation decision、promotion trace 和 release governance。
- `docs/release-process.md`
  用于仓库维护者执行当前版本的 release artifacts 刷新、门禁检查和发包流程。

## 目标

- 把 `power-ai-skills` 从“个人可用”提升为“团队可维护”
- 统一 skill 生命周期、责任边界、评审方式和发布要求
- 让 skill 的新增、修改、弃用都有明确入口和约束

## 角色分工

### 架构组

- 维护 `orchestration` 和 `foundation` 分组
- 负责入口识别规则、基础框架基线、目录结构和公共规范
- 决定是否需要引入新的通用 skill 分组或淘汰旧模式

### UI / 组件组

- 维护 `ui` 分组
- 负责页面骨架、表单、弹窗、组件开发、demo 和交互模式
- 负责组件库升级后 UI skill 的跟进修订

### 流程与平台组

- 维护 `workflow` 和 `engineering` 分组
- 负责权限、审批、API、测试、治理脚本和发布工具
- 负责 `doctor`、`impact-check`、`generate-impact-task`、`verify-consumer`、`run-upgrade-automation`、`generate-upgrade-payload` 等仓库级工具的稳定性

## 生命周期

### stable

- 已在真实项目中重复验证
- 推荐在业务项目默认使用
- 兼容性和使用方式应尽量稳定

### beta

- 已有明确适用场景，但团队沉淀还不充分
- 可以试用，但修改频率可能较高
- 每次改动都应补充示例或验证记录

### deprecated

- 不再推荐新增使用
- 进入淘汰期，只做必要兼容修复
- 后续应在一个 `minor` 或 `major` 版本中明确移除

## 评审要求

每个 skill 变更至少回答以下问题：

1. 这次为什么改。
2. 改动影响哪些 skill。
3. 是否影响基础框架或组件库兼容性。
4. 是否需要更新 `CHANGELOG.md`。
5. 是否需要通知消费项目升级。

## 最小验证要求

提交前至少执行：

```bash
pnpm ci:check
pnpm release:notes
```

如果修改了同步、模板、CLI、影响分析、自动化联动或升级流程，还应追加：

```bash
node ./scripts/generate-impact-task.mjs --report manifest/impact-report.json
node ./scripts/verify-consumer.mjs <project-path>
```

如果改动是为上游仓库或私仓流水线服务，优先再补：

```bash
node ./scripts/run-upgrade-automation.mjs --base <git-base> --head <git-head> --repo <upstream-repo-path> --consumer <project-path>
node ./scripts/generate-upgrade-payload.mjs
```

## 注释要求

- 仓库内新增或改造脚本时，必须补充中文注释
- 注释重点说明：
  - 为什么这样做
  - 关键判断依据
  - 边界处理和失败路径
- 禁止只写低价值注释，例如“定义变量”“调用函数”
