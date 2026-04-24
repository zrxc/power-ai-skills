# 模板示例

## 标准列表页骨架

```vue
<!-- @format -->
<template>
  <PcContainer>
    <pc-table-warp
      v-model:search-value="searchFormDatas"
      v-model:page-value="pageValue"
      v-loading="loading"
      :data="tableData"
      :search-list="searchList"
      :column-list="columnList"
      :setting-column-config="settingColumnConfig"
      :total="total"
      @on-search="onSearch"
      @on-search-reset="onSearchReset"
      @page-change="handlePageChange"
      @setting-action="settingAction"
    />
  </PcContainer>
</template>
```

## 搜索配置示例

```ts
const searchList = computed(() => [
  { code: "keyword", type: "input", pcProps: { placeholder: "请输入关键字" } },
  { code: "status", type: "select", pcProps: { params: statusOptions } },
  { code: "dateRange", type: "daterange" },
]);
```

## 列配置示例

```ts
const columnList = [
  { label: "名称", code: "name", type: "input" },
  { label: "状态", code: "status", type: "input", colProps: { width: 100 } },
  { label: "创建时间", code: "createTime", type: "input" },
];

const settingColumnConfig = [
  { label: "编辑", value: "edit" },
  { label: "删除", value: "del", prop: { type: "danger" } },
];
```

## 弹窗 CRUD 示例

```vue
<pc-dialog v-model="dialogVisible" :title="dialogTitle" width="900px" destroy-on-close>
  <user-form />
</pc-dialog>
```

## 注释要求

- 搜索提交、搜索重置、分页切换前补中文注释
- 弹窗提交成功后刷新列表的逻辑前补中文注释
- 如果列配置包含危险操作，说明确认原因
