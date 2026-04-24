# 模板示例

## 页面级权限

```ts
const hasPagePermission = computed(() => permissionCodes.value.includes("monitor:object:view"));
```

```vue
<PcNoPermission v-if="!hasPagePermission" />
<template v-else>
  <!-- 页面内容 -->
</template>
```

## 按钮级权限

```vue
<el-button v-if="permissionCodes.includes('monitor:object:add')" type="primary" @click="handleAdd">
  新增
</el-button>
```

## 行内操作权限

```ts
const settingColumnConfig = computed(() => {
  const actions = [];
  if (permissionCodes.value.includes("monitor:object:edit")) actions.push({ label: "编辑", value: "edit" });
  if (permissionCodes.value.includes("monitor:object:delete")) actions.push({ label: "删除", value: "del", prop: { type: "danger" } });
  return actions;
});
```
