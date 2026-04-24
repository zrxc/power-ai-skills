# 项目扫描与 Project Local Skill 设计 1.0.8

> 版本：1.0.8  
> 范围：`project-scan` 多跳组件传播、传播产物落盘、dialog-form 跨文件识别增强

## 背景

`1.0.7` 已经把单跳组件图接进了页面识别，但真实项目里常见的实现不是：

- 页面直接引入 `dialog-fragment`

而是：

- 页面引入一个 `page-fragment`
- `page-fragment` 再引入 `dialog-fragment`
- dialog shell、form model、submit flow 被拆散在不同文件里

这种情况下，单跳组件图还不够，页面能看到第一层 fragment，却看不到第二层 dialog fragment。

## 1.0.8 目标

`1.0.8` 聚焦三件事：

1. 在组件图基础上增加多跳传播计算
2. 把传播结果显式落盘，而不是只在识别时临时使用
3. 让 pattern 结果能区分“直接命中”与“多跳传播命中”

## 产物结构

扫描后新增：

```text
.power-ai/
  analysis/
    component-graph.json
    component-propagation.json
  reports/
    component-graph-summary.md
    component-propagation-summary.md
```

其中：

- `component-propagation.json`：记录每个 Vue 文件通过模板使用链路可达的组件和 fragment
- `component-propagation-summary.md`：面向人工复核的多跳传播摘要

## 核心设计

### 1. 多跳传播模型

基于 `component-graph.json` 中 `usedInTemplate = true` 的边构建有向图。

对每个文件执行 BFS，得到：

- `reachableComponents`
- `reachableFragments`
- `depth`

其中 `depth = 1` 表示直接引用，`depth >= 2` 表示多跳传播。

### 2. 信号回灌

在 `enrichSignalsWithComponentGraph(...)` 阶段，不再只合并直接引用组件的信号，还会额外计算：

- `transitiveRelatedComponentPaths`
- `transitiveSupportingFragmentPaths`
- `transitiveSupportingDialogFragmentPaths`
- `transitiveSupportingPageFragmentPaths`
- `transitiveLinkedHasPcDialog`
- `transitiveLinkedHasFormModel`
- `transitiveLinkedHasSubmitAction`
- `transitiveLinkedHasCrudAction`

这些字段只描述“通过多跳链路得到的补充上下文”。

### 3. Pattern 识别增强

`dialog-form` 在 `1.0.8` 中新增以下命中来源：

- 多跳 dialog fragment 数量
- 多跳 dialog shell
- 多跳 form model
- 多跳 submit flow
- 多跳 CRUD 入口拆分

`basic-list-page`、`tree-list-page`、`detail-page` 也会记录“通过多跳组件触达了 fragment”，用于解释模式是如何被识别出来的。

## Schema 变化

### project-profile.json

新增：

- `componentPropagationSummary`

### patterns.json

新增：

- `transitiveRelatedComponents`
- `transitiveSupportingFragments`

`matchedFiles` 中也会补充：

- `transitiveRelatedComponentPaths`
- `transitiveSupportingFragmentPaths`

## 设计边界

`1.0.8` 仍然有明确边界：

- 只分析项目内本地 `.vue` 导入
- 只沿模板中真实使用的组件边传播
- 仍然不做跨文件数据流求值
- 仍然不处理运行时动态组件解析

因此它解决的是“多跳静态结构识别”，不是“完整语义执行”。

## 验收标准

`1.0.8` 至少满足以下验收：

1. `scan-project` 后会生成 `component-propagation.json`
2. `scan-project` 后会生成 `component-propagation-summary.md`
3. `project-profile.json` 中会出现 `componentPropagationSummary`
4. `dialog-form` 可以识别 `page -> page-fragment -> dialog-fragment` 的多跳场景
5. `patterns.json` 能区分 direct 与 transitive 的组件/fragment 支撑信息

## 总结

`1.0.7` 解决的是“页面能不能看到第一层 fragment”。  
`1.0.8` 解决的是“页面能不能穿过中间壳组件，看到真正承载交互的 dialog fragment”。

这让 `project-scan` 从“单跳组件关联分析”继续升级成“多跳组件传播分析”。
