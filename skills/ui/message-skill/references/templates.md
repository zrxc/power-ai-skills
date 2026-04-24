# 模板示例

## 目录

- 成功失败提示
- 删除确认
- 批量操作

## 成功失败提示

```ts
try {
  const res = await saveItem(data);
  if (res?.code === 200) {
    ElMessage.success("保存成功");
  }
} catch (error) {
  ElMessage.error("保存失败");
}
```

## 删除确认

```ts
try {
  await ElMessageBox.confirm(`确认删除“${row.name}”吗？`, "提示", {
    type: "warning",
  });
  await deleteItem(row.id);
  ElMessage.success("删除成功");
} catch (error) {
  if (error !== "cancel") {
    ElMessage.error("删除失败");
  }
}
```

## 批量操作

```ts
if (selectedRows.value.length === 0) {
  ElMessage.warning("请先选择要操作的数据");
  return;
}
```
