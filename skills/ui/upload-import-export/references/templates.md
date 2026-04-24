# 模板示例

## 文件上传

```ts
const handleUpload = async (file: File) => {
  const res = await uploadFile(file);
  if (res?.code === 200) {
    ElMessage.success("上传成功");
  }
};
```

## 导入

```ts
const handleImport = async (file: File) => {
  const res = await batchImport(file);
  if (res?.code === 200) {
    ElMessage.success(`导入成功：${res.data.success} 条`);
  }
};
```

## 导出

```ts
const handleExport = async () => {
  const blob = await exportData(searchFormDatas.value);
  downloadBlob(blob, "导出结果.xlsx");
  ElMessage.success("导出成功");
};
```
