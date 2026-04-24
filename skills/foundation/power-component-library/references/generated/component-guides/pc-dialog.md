# `pc-dialog`

## 用途

企业标准弹窗，统一标题区、扩展操作区、底部按钮和确认取消 loading 流程。

## 何时优先使用

- 新增 / 编辑弹窗
- 详情弹窗
- 树节点维护弹窗

## 最小接法

```vue
<pc-dialog
  v-model="dialogVisible"
  title="编辑用户"
  @on-confirm="handleConfirm"
  @on-cancel="handleCancel"
>
  <user-form />
</pc-dialog>
```

## 关键约定

- 可见性统一用 `v-model`
- `onConfirm` / `onCancel` 按组件回调约定释放按钮 loading
- 自定义标题区优先使用 `header` / `extra` 插槽

## 注释要求

- 中文注释要说明弹窗开关状态、提交中状态和关闭后的重置逻辑
- 如果提交成功后要刷新列表或树节点，必须在对应代码前加中文注释

## 不要这样用

- 直接回退到 `el-dialog`
- 手工重写确认取消按钮和 loading 流程

## 来源

- `packages/p-components/src/components/pc-dialog/index.vue`
- `apps/powerdoc/src/p-components/pc-dialog.md`
