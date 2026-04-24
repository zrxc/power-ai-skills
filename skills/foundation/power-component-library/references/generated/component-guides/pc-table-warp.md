# `pc-table-warp`

## 用途

企业标准列表封装，集成搜索区、表格主体、分页、列设置、导入导出和操作按钮。

## 何时优先使用

- 标准 CRUD 列表页
- 左树右表页面的右侧主表
- 需要统一搜索、分页和列设置能力

## 最小接法

```vue
<pc-table-warp
  v-model:search-value="searchForm"
  v-model:page-value="pageValue"
  :search-list="searchList"
  :data="tableData"
  :column-list="columnList"
  :total="total"
  @on-search="fetchList"
/>
```

## 关键约定

- 搜索状态用 `v-model:search-value`
- 分页状态用 `v-model:page-value`
- 顶部操作和列设置优先通过 `action-btn-config`、`setting-column-config` 扩展

## 注释要求

- 中文注释要说明搜索表单、分页状态和列表刷新的关系
- 如果列表依赖左侧树节点，需要在 `fetchList` 或节点切换逻辑前补中文注释

## 不要这样用

- 标准列表场景退回 `el-table + el-pagination`
- 明明需要企业搜索和列设置能力，却绕开 `pc-table-warp`

## 来源

- `packages/p-components/src/components/pc-table/index.vue`
- `apps/powerdoc/src/p-components/pc-table.md`
