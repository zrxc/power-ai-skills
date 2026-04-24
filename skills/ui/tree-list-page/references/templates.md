# 模板示例

## 使用说明

树列表场景优先使用企业标准组合：

- 页面骨架：`CommonLayoutContainer`
- 右侧列表：`pc-table-warp`
- 新增/编辑弹窗：`pc-dialog`

默认不要先手工塞一棵 `pc-tree` 到左侧。

如果消费项目经过确认后确实没有 `CommonLayoutContainer` 导出，才允许退回到本地别名 `PcLayoutMainContainer / pc-layout-main-container`；并且要在代码里补一条中文注释说明它对应企业骨架 `CommonLayoutContainer`。

## 标准部门树 + 用户表模板

```vue
<template>
  <CommonLayoutContainer
    :current-node-key="selectedDepartmentId"
    :default-expanded-keys="defaultExpandedKeys"
    @node-click="handleNodeClick"
  >
    <template #content-main>
      <pc-table-warp
        v-model:search-value="searchFormDatas"
        v-model:page-value="pageValue"
        :data="tableData"
        :column-list="columnList"
        :loading="loading"
        :total="total"
        :action-btn-config="actionBtnConfig"
        @on-search="fetchList"
        @on-search-reset="handleSearchReset"
      />
    </template>
  </CommonLayoutContainer>

  <pc-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    @on-confirm="handleSubmit"
    @on-cancel="handleCancel"
  >
    <user-form
      v-model="formData"
      :department-id="selectedDepartmentId"
    />
  </pc-dialog>
</template>
```

## 树节点点击联动

```ts
// CommonLayoutContainer 已内置左侧部门树，这里只处理节点切换后的右侧联动。
const handleNodeClick = (payload: { data?: { code?: string } }) => {
  const departmentCode = payload?.data?.code;
  if (!departmentCode) return;

  selectedDepartmentId.value = departmentCode;
  searchFormDatas.departmentId = departmentCode;

  // 切换部门后回到第一页，避免停留在旧分页导致列表为空。
  pageValue.pageNum = 1;
  fetchList();
};
```

## 默认状态

```ts
const selectedDepartmentId = ref("");
const defaultExpandedKeys = ref<string[]>([]);
const searchFormDatas = reactive({
  departmentId: "",
});
const pageValue = reactive({
  pageNum: 1,
  pageSize: 10,
});
```

## 列表示例字段

```ts
const columnList = [
  { label: "名称", code: "name", type: "text" },
  { label: "性别", code: "gender", type: "text" },
  { label: "电话", code: "phone", type: "text" },
  { label: "年龄", code: "age", type: "text" },
];
```

## 注释要求

- 树节点切换逻辑前补中文注释
- 分页重置、列表刷新、弹窗提交成功后的回刷逻辑前补中文注释
- 如果本地实际导入名不是 `CommonLayoutContainer`，补一条中文注释说明映射关系
