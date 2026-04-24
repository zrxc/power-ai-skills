# 模板示例

## 目录

- 基础弹窗
- 多步骤弹窗
- 多模式弹窗

## 基础弹窗

```vue
<pc-dialog
  v-model="dialogVisible"
  title="弹窗标题"
  width="600px"
  :close-on-click-modal="false"
  destroy-on-close
>
  <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
    <el-form-item label="名称" prop="name">
      <el-input v-model="formData.name" />
    </el-form-item>
  </el-form>
</pc-dialog>
```

## 多步骤弹窗

```vue
<pc-dialog v-model="dialogVisible" :title="dialogTitle" width="800px" destroy-on-close>
  <el-steps :active="currentStep" simple>
    <el-step title="基础信息" />
    <el-step title="参数配置" />
    <el-step title="确认提交" />
  </el-steps>
</pc-dialog>
```

## 多模式弹窗

```ts
const dialogMode = ref<"create" | "edit" | "view">("create");

const dialogTitle = computed(() => {
  if (dialogMode.value === "edit") return "编辑";
  if (dialogMode.value === "view") return "查看";
  return "新增";
});
```
