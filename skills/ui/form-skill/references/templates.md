# 模板示例

## 目录

- 基础表单
- 动态表单
- 双列表单

## 基础表单

```vue
<el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
  <el-form-item label="名称" prop="name">
    <el-input v-model="formData.name" maxlength="50" />
  </el-form-item>
  <el-form-item label="状态" prop="status">
    <el-switch v-model="formData.status" :active-value="1" :inactive-value="0" />
  </el-form-item>
</el-form>
```

## 动态表单

```vue
<div v-for="(item, index) in formData.params" :key="index">
  <el-input v-model="item.name" placeholder="参数名" />
  <el-input v-model="item.value" placeholder="参数值" />
</div>
```

## 双列表单

```vue
<el-row :gutter="20">
  <el-col :span="12">
    <el-form-item label="名称" prop="name">
      <el-input v-model="formData.name" />
    </el-form-item>
  </el-col>
  <el-col :span="12">
    <el-form-item label="编码" prop="code">
      <el-input v-model="formData.code" />
    </el-form-item>
  </el-col>
</el-row>
```
