# 模板示例

## 详情页骨架

```vue
<PcContainer>
  <section class="detail-base-info"></section>
  <section class="detail-extend-info"></section>
  <section class="detail-history"></section>
</PcContainer>
```

## 详情数据加载

```ts
const detailData = ref<Record<string, any>>({});

const fetchDetail = async (id: string) => {
  const res = await getDetail(id);
  if (res?.code === 200) {
    detailData.value = res.data || {};
  }
};
```
