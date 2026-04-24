# 模板示例

## 预览弹窗

```vue
<pc-dialog v-model="previewVisible" title="文件预览" width="80%">
  <pc-file-preview :file-url="previewUrl" />
</pc-dialog>
```

## 文件列表

```vue
<el-link type="primary" @click="handlePreview(file)">{{ file.name }}</el-link>
```
