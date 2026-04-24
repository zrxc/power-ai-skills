# 模板示例

## 审批布局

```vue
<PcContainer>
  <section class="approval-detail"></section>
  <section class="approval-flow"></section>
  <section class="approval-actions"></section>
</PcContainer>
```

## 审批动作

```ts
const handleApprove = async () => {
  await ElMessageBox.confirm("确认通过当前审批吗？", "提示");
  const res = await approveTask({ id: taskId.value, comment: approveComment.value });
  if (res?.code === 200) ElMessage.success("审批成功");
};
```
