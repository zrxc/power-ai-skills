# 项目扫描与 Project-Local Skill 冷启动升级方案

> 版本：1.0.4  
> 日期：2026-03-16  
> 状态：已落地

## 1. 背景

`1.0.3` 已经解决了 `project-local` 初始化后为空目录的问题，但在真实项目试跑中暴露出三个问题：

- `src/views/**/components/**` 里的局部组件会污染页面模式统计
- 只要出现 `PcTree`、`pc-dialog` 等组件，容易被误判成页面骨架
- `detail-page` 规则过宽，`add.vue` / `edit.vue` 这类编辑页也可能被归进详情页

因此 `1.0.4` 的目标不再是“生成更多草案”，而是“让自动生成的草案更可信，并且把未达门槛的模式明确暴露给人工复核”。

## 2. 目标

`1.0.4` 聚焦四件事：

1. 区分页面文件与页面内局部组件
2. 从简单关键词命中升级为结构化打分
3. 增加生成门槛，低频或低置信模式不自动生成
4. 输出复核产物，让扫描结果可解释、可审计

## 3. 目录产物

```text
.power-ai/
  analysis/
    project-profile.json
    patterns.json
    pattern-review.json
  reports/
    project-scan-summary.md
  skills/
    project-local/
      auto-generated/
        README.md
        <generated-skill>/
```

说明：

- `project-profile.json`：项目画像与文件角色摘要
- `patterns.json`：结构化模式识别结果
- `pattern-review.json`：模式级生成 / 复核 / 跳过决策
- `project-scan-summary.md`：面向人工验收的摘要

## 4. 核心升级点

### 4.1 文件角色分层

先对 `src/views/**/*.vue` 做角色识别：

- `page`
- `page-candidate`
- `page-fragment`
- `dialog-fragment`

默认规则：

- `src/views/**/components/**` 下的文件优先视为 fragment
- `index.vue`、`detail.vue`、`view.vue`、`read.vue`、`add.vue`、`edit.vue` 等优先视为 page

这样可以避免局部组件直接参与页面骨架判断。

### 4.2 结构化打分

模式识别不再只看“字符串出现”，而是组合这些信号：

- 页面根容器
- 页面级 `PcTree`
- 列表、分页、搜索、CRUD 流程
- 弹窗与表单模型
- 详情加载与只读展示
- 是否存在可编辑表单与提交保存逻辑

### 4.3 排除规则

首版明确增加这些排除：

- `add.vue` / `edit.vue` 不进入 `detail-page`
- fragment 只作为复核线索，不直接代表页面骨架
- 树列表强命中时，降低标准列表页得分

### 4.4 生成门槛

自动生成 project-local 草案的门槛：

- `frequency >= 3`
- `confidence >= high`

不满足门槛时：

- 保留在 `pattern-review.json`
- 写入 `project-scan-summary.md`
- 不自动生成 skill

## 5. 影响

`1.0.4` 之后：

- `tree-list-page` 这类低频模式不会再直接进入 `auto-generated`
- `detail-page` 误判到 `add/edit` 的情况显著下降
- `project-local` 不再等同于“所有命中的 pattern”，而是“通过门槛的高置信草案”

## 6. 验收标准

最小验收要求：

1. `components/**` 下文件不会污染页面主骨架识别
2. `add.vue` / `edit.vue` 不再被归为 `detail-page`
3. 自动生成结果能区分 `generate / review / skip`
4. `scan-project` 后能同时拿到 JSON 分析结果和 Markdown 摘要
