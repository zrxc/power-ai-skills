# `pc-tree`

## 用途

企业标准树组件，封装树搜索、节点标签、节点图标和节点操作按钮。

## 何时优先使用

- 左侧树筛选
- 分类树、部门树、组织树
- 树节点需要增删改操作

## 最小接法

```vue
<pc-tree
  title="部门"
  :data="treeData"
  node-key="id"
  :is-show-search="true"
/>
```

节点按钮：

```vue
<pc-tree
  :data="treeData"
  node-key="id"
  :show-add-btn="() => true"
  :show-edit-btn="() => true"
  :show-delete-btn="() => true"
  @handle-node-btn="handleNodeBtn"
/>
```

## 关键约定

- 必须显式传 `node-key`
- 优先通过插槽扩展节点内容，不要复制内部 `el-tree`
- 搜索优先复用 `is-show-search` 和 `remote-search-method`

## 注释要求

- 需要用中文注释说明树节点主键字段
- 树节点点击、搜索、按钮操作等联动逻辑前补中文注释
- 如果节点切换会重置列表筛选或分页，要明确写出来

## 不要这样用

- 直接回退到 `el-tree`
- 不传 `node-key`
- 只为加一个按钮就整体复制树组件源码

## 来源

- `packages/p-components/src/components/pc-tree/index.vue`
- `apps/powerdoc/src/p-components/pc-tree.md`
