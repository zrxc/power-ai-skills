# 项目扫描与 Project Local Skill 设计 1.0.7

> 版本：1.0.7  
> 状态：已实现  
> 主题：组件引用图与跨文件 fragment 关联

## 1. 背景

`1.0.6` 已经把 Vue 页面扫描升级到 AST 层，但识别仍然主要停留在“单文件”。

真实项目里，很多页面模式并不是写在一个 `.vue` 里：

- 页面壳子在 `index.vue`
- 弹窗表单在 `components/*.vue`
- 详情展示块也可能拆成局部组件

如果只看单文件，扫描会漏掉大量“页面引用 fragment”的真实模式。

因此 `1.0.7` 的目标是：在 AST 扫描之上补一层组件引用图，把页面与本地 fragment 连接起来，并让这些关联真正参与 pattern 识别。

## 2. 目标

`1.0.7` 聚焦三件事：

1. 从 `script/script setup` 提取本地 Vue 组件导入
2. 从 template AST 提取组件标签使用
3. 构建页面到本地 fragment 的组件引用图，并把 fragment 信号回灌到页面识别

## 3. 新增产物

```text
.power-ai/
  analysis/
    component-graph.json
  reports/
    component-graph-summary.md
```

其中：

- `component-graph.json`：结构化组件图
- `component-graph-summary.md`：适合人工查看的组件图摘要

## 4. 扫描升级点

### 4.1 导入解析

在 `vue-analysis.mjs` 中，脚本 AST 现在会额外收集：

- 相对路径导入
- 默认导入名
- 命名导入名

只要是本地相对导入，且最终可解析到 `.vue` 文件，就会进入组件图候选。

### 4.2 模板标签匹配

模板 AST 现在不仅记录基础组件，还会记录：

- `templateTagNames`
- `templateCustomTagNames`

随后用导入名生成标签别名，例如：

- `OrdersDialog`
- `orders-dialog`
- `ordersdialog`

再与 template 中实际出现的标签匹配，确认该导入是否真的被模板使用。

### 4.3 组件图构建

组件图节点来自 `src/views/**/*.vue`。  
组件图边由以下条件成立：

1. 页面或 fragment 存在相对导入
2. 目标解析到本地 `.vue`
3. 导入组件确实在模板中被使用

边信息包含：

- `from`
- `to`
- `source`
- `localName`
- `importedName`
- `usedInTemplate`
- `targetFileRole`

## 5. fragment 反哺页面识别

这是 `1.0.7` 的核心，不只是“多输出一个 graph”。

扫描现在会把页面引用到的 fragment 信号回灌到页面本身，包括：

- `linkedFragmentCount`
- `linkedDialogFragmentCount`
- `linkedPageFragmentCount`
- `linkedHasPcDialog`
- `linkedHasFormModel`
- `linkedHasSubmitAction`
- `linkedHasPcTableWarp`
- `linkedHasCrudAction`
- `linkedHasReadOnlyView`

这些信号会直接参与 pattern 识别。

当前最重要的升级点是 `dialog-form`：

- 页面自己不写 `pc-dialog` 也没关系
- 只要它引用了 `dialog-fragment`
- 并且 fragment 内存在表单模型、提交流和弹窗壳

那么页面本身就可以被识别为 dialog-form 场景。

## 6. patterns.json 升级

`patterns.json` 现在额外输出：

- `relatedComponents`
- `supportingFragments`

这让每个 pattern 不再只是“命中了哪些页面文件”，还可以看到它依赖了哪些局部组件。

## 7. project-profile.json 升级

`project-profile.json` 现在新增：

- `componentGraphSummary`

包括：

- `nodeCount`
- `edgeCount`
- `usedEdgeCount`
- `referencedComponentCount`
- `pageToFragmentEdgeCount`

## 8. 验收标准

`1.0.7` 至少满足以下验收：

1. `scan-project` 后会生成 `component-graph.json`
2. `scan-project` 后会生成 `component-graph-summary.md`
3. 页面引用 `dialog-fragment` 时，dialog-form 识别可以命中页面文件本身
4. `patterns.json` 能看到 `relatedComponents` 与 `supportingFragments`
5. `1.0.6` 的 AST、diff、history、manual 晋升能力不回退

## 9. 不在本版本范围

以下内容仍不在 `1.0.7`：

- 跨目录全项目组件图
- TS 类型驱动的 props / emits 语义分析
- 多跳组件依赖传播
- 跨文件数据流追踪

## 10. 结论

`1.0.6` 解决了“单文件扫描准不准”。  
`1.0.7` 解决的是“真实项目里模式经常分散在多个文件，扫描还能不能识别出来”。

这让 `project-scan` 正式从“单文件 AST 分析器”进化成“页面 + 本地 fragment 关联分析器”。
