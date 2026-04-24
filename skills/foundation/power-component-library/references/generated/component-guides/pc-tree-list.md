# `pc-tree-list`

## 用途

更高层的树业务组件，内置搜索、节点按钮和节点级增删改交互。

## 何时考虑使用

- 左侧区域本身就是一个树管理组件
- 希望树组件内部承担节点级 CRUD 交互

## 何时不要默认使用

- 标准左树右表业务页面
- 左侧树只是筛选器，右侧列表才是主业务区

## 树表页面默认组合

- 布局：`pc-layout-main-container`
- 左树：`pc-tree`
- 右表：`pc-table-warp`
- 弹窗：`pc-dialog`

## 注释要求

- 如果最终确认使用 `pc-tree-list`，需要用中文注释说明它为什么优于通用树组件
- 要注明它承担了哪些业务耦合能力，避免后续误用

## 来源

- `packages/p-components/src/components/pc-tree-list/index.vue`
- `packages/p-components/src/views/aa-demo/p-components/pc-components/pc-tree-list/index.vue`
