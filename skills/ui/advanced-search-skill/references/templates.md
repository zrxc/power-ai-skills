# 模板示例

## 搜索区骨架

```vue
<pc-advanced-search
  v-model="searchFormDatas"
  :search-list="searchList"
  @on-search="onSearch"
  @on-reset="onSearchReset"
/>
```

## 搜索联动

```ts
const onSearch = (params: any) => {
  searchFormDatas.value = params || {};
  pageValue.value.pageNum = 1;
  fetchList();
};
```
