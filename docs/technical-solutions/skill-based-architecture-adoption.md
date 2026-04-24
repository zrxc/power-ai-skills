# Skill-Based Architecture 借鉴落地方案

## 1. 结论

`skill-based-architecture` 项目里最值得借鉴的，不是把当前仓库整体迁成 `skills/<name>/` 的目录形状，而是它背后的维护机制：

- 用精简入口做任务路由
- 用 Task Closure Protocol 持续补规则
- 把高成本 gotcha 挂到任务路径上
- 让 `description` 更像触发条件，而不是被动摘要
- 用健康检查维持文档质量

对 `power-ai-skills` 来说，合理的落地方向是“增量借鉴”，不是“整仓迁移”。

## 2. 适用对象

这份方案只针对当前仓库自身的维护与演进流程，适用对象包括：

- `.codex/` 下的维护者规则入口
- 仓库级治理、演进、文档和技术方案沉淀
- 对外发布 skill 的说明质量治理

这份方案不针对消费项目初始化后的 `.power-ai/` 目录，也不针对某个单独下游项目的本地 skill 重构。

## 3. 为什么不做整仓迁移

### 3.1 当前仓库不是参考项目的同类对象

参考项目更接近“把单个项目的规则收束成一个 skill 目录”。`power-ai-skills` 本身已经是技能中心仓库，`skills/` 目录承载的是对外分发的真实 skill 资产，而不是仓库维护者内部规则。

如果把当前仓库整体迁成 `skills/power-ai-skills/`，会把两类内容混在一起：

- 面向消费项目分发的 skill 资产
- 面向维护者自身的工作规则

这种混用会让目录语义变得模糊，也会增加后续治理和发布时的理解成本。

### 3.2 参考项目最强的是机制，不是目录外形

参考项目真正值得借鉴的能力集中在：

- `Always Read` + `Common Tasks` 的轻量路由
- `description` 作为触发条件
- Task Closure Protocol
- gotcha 的集中激活

这些能力不依赖把当前仓库改造成同样的目录骨架，完全可以在现有结构上增量吸收。

### 3.3 当前仓库已有自己的真实源边界

当前仓库已经有清晰的分层：

- `skills/`：对外发布的 skill 内容
- `.power-ai/`：消费项目内的唯一真实源目录约定
- `.codex/`：仓库维护者入口

因此更合理的做法，是把借鉴结果沉到 `.codex/` 这层维护者规则命名空间，而不是再造一层新的 `skills/power-ai-skills/`。

## 4. 本次采纳范围

本轮只做两个落地动作：

1. 把现有 adoption 文档改写成适配当前仓库的“增量借鉴方案”
2. 在 `.codex/` 下建立轻量维护者规则层

本轮不做：

- 新建 `skills/power-ai-skills/`
- 根目录 thin shell 全量迁移
- 参考项目里的 `bash` / `sed` / `python3` hook 落地
- 对外 skill 目录的大规模重构
- 自动注册、自动发版、自动 promotion 等高风险自动化扩边

## 5. 值得借鉴并已经确定采纳的机制

### 5.1 维护者入口路由

把 `.codex/SKILL.md` 收敛成精简 router，只保留：

- 适用范围
- Always Read
- Common Tasks
- 边界提醒

这样可以避免维护者入口重新长成一份巨型规则堆积文档。

### 5.2 Task Closure Protocol

把“任务完成前做一次轻量收口复盘”的习惯固化下来。重点不是形式，而是回答 4 个问题：

1. 这次有没有新 gotcha
2. 这次有没有新 task route
3. 这次有没有已有规则不够显眼
4. 这次有没有过时规则

### 5.3 Gotcha 激活

把真正高成本、可重复、且不明显的坑集中记录，不再只散落在历史提交、阶段总结或口头记忆里。

### 5.4 Description 触发语义

后续对公共 skill 文档的优化，应优先把 `description` 写成“什么时候该触发这份 skill”，而不是只写“这份 skill 是干什么的”。

### 5.5 文档健康检查

后续可以补 Node 化检查脚本，验证维护者规则和 skill 描述的健康度，但这不是本轮交付范围。

## 6. 落地结构

本轮完成后的维护者规则层结构如下：

```text
.codex/
|- SKILL.md
|- rules/
|  \- project-rules.md
|- workflows/
|  \- update-rules.md
\- references/
   \- gotchas.md
```

各文件职责如下：

- `.codex/SKILL.md`
  - 维护者入口 router
  - 给常见任务指路
  - 强调高风险边界
- `.codex/rules/project-rules.md`
  - 长期稳定边界
  - 仓库对象语义
  - 不应被轻易打破的约束
- `.codex/workflows/update-rules.md`
  - 任务收口流程
  - 什么时候记录新规则或 gotcha
- `.codex/references/gotchas.md`
  - 已知高成本坑点
  - 需要被优先暴露给维护者的经验

## 7. 实施步骤

### 第 1 步：修订 adoption 文档

把当前文档从“整仓迁移提案”改成“增量借鉴方案”，明确：

- 适用对象
- 非目标
- 边界
- 采纳机制
- 验收标准

### 第 2 步：建立 `.codex/` 维护者规则层

调整 `.codex/SKILL.md` 为 router，并新增：

- `.codex/rules/project-rules.md`
- `.codex/workflows/update-rules.md`
- `.codex/references/gotchas.md`

后续如果继续推进，可在这层上叠加：

- `check-maintainer-docs.mjs`
- `check-skill-descriptions.mjs`

## 8. 验收标准

本轮完成后，应满足以下条件：

1. 仓库维护规则和对外 skill 资产不再混用命名空间
2. 维护者可以从 `.codex/SKILL.md` 快速路由到核心规则和 gotcha
3. 高成本经验不再只存在于 roadmap 或历史阶段文档里
4. adoption 方案不再默认推动整仓迁移
5. 当前对外发布结构和自动化边界不被扰动

## 9. 后续可选增强

如果后面继续做，可以按这个顺序推进：

1. 增加维护者文档健康检查
2. 增加公共 skill `description` 触发语义检查
3. 逐步修正关键 skill 的描述方式
4. 把阶段性高成本 lesson 更稳定地回灌到 `.codex/references/gotchas.md`

## 10. 非目标

为了避免误读，这里明确本方案的非目标：

- 不是把当前仓库改造成参考项目的同构副本
- 不是把维护者规则搬进对外分发的 `skills/` 目录
- 不是引入参考项目的全套 hook 与 shell 工具链
- 不是在本轮解决所有 skill 文档质量问题
- 不是在本轮扩展自动注册、自动发版或自动晋升边界

## 11. 当前落地状态

截至 2026-04-24，这份方案已经不再是纯提案，而是已经有实际落地结果的增量采纳方案。当前已完成的范围如下：

- 已将 `.codex/SKILL.md` 收敛为维护者 router
- 已新增 `.codex/rules/project-rules.md`
- 已新增 `.codex/workflows/update-rules.md`
- 已新增 `.codex/references/gotchas.md`
- 已新增 `scripts/check-maintainer-docs.mjs`
- 已新增 `scripts/check-skill-descriptions.mjs`
- 已新增 `tests/maintainer-docs.test.mjs`
- 已新增 `tests/skill-descriptions.test.mjs`

其中：

- `check:maintainer-docs` 已接入 `ci:check`
- `check:skill-descriptions` 当前保持独立运行，默认是 warning-only 检查，不作为当前 CI 的阻塞门
- `.codex/` 已成为维护者规则和 lesson 回灌的主要命名空间，不再和公开 `skills/` 资产混用

## 12. 公开 Skill Description 治理进度

在这份方案落地过程中，已经对公开 skill 文档做了一轮 `description` 触发语义和 router 边界治理。当前已纳入这一轮标准的公开 skill 包括：

- orchestration：`entry-skill`
- engineering：`api-skill`
- foundation：`global-store-skill`、`plugin-extension-skill`、`power-component-library`、`power-foundation-app`、`project-structure-skill`、`route-menu-skill`、`runtime-extension-skill`、`style-theme-skill`、`utils-extension-skill`
- ui：`advanced-search-skill`、`basic-list-page`、`chart-dashboard`、`detail-page-skill`、`dialog-skill`、`file-preview-skill`、`form-designer-skill`、`form-skill`、`message-skill`、`tree-list-page`、`upload-import-export`
- workflow：`approval-workflow-skill`、`permission-page`

这一轮治理的核心要求是：

- `description` 更像“什么时候应该激活这个 skill”，而不是被动摘要
- 每份公开 `SKILL.md` 都补齐“何时切换到其他技能”的路由边界
- 不在公开 skill 文档里混入维护者内部规则

## 13. 验证结果

本方案落地后，已经完成过一轮完整验证：

- `node ./scripts/check-maintainer-docs.mjs`
- `node ./scripts/check-skill-descriptions.mjs`
- `node --test tests/maintainer-docs.test.mjs`
- `node --test tests/skill-descriptions.test.mjs`
- `node ./scripts/validate-skills.mjs`
- `pnpm ci:check`

其中，2026-04-24 执行的 `pnpm ci:check` 已全部通过，共 `223` 项测试，`223` 通过，`0` 失败。

这表明，当前这条“借鉴 skill-based architecture 机制 + 公开 skill 路由治理”的改动，已经处于可合入、可暂停的稳定状态。

## 14. 下一步的建议

如果后续继续在这条线上推进，优先级可以是：

1. 把 `check-skill-descriptions` 的输出整理成报告，方便后续分批做 tail maintenance
2. 把新的 gotcha 回灌到 `.codex/references/gotchas.md`，形成更稳定的维护者知识层
3. 只在真有需要时，再考虑是否把 `check:skill-descriptions` 接入更严的 CI 门

在没有新的结构性需求前，不建议回到“整仓迁移”路线。
