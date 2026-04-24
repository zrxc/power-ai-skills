# `PcContainer`

## 用途

企业标准页面容器，用于承载普通列表页、表单页和详情页的页面级外壳。

## 何时优先使用

- 标准列表页
- 普通表单页
- 不需要左右分栏的页面

## 最小接法

```vue
<template>
  <PcContainer>
    <pc-table-warp
      v-model:search-value="searchFormDatas"
      v-model:page-value="pageValue"
      :data="tableData"
      :column-list="columnList"
      :total="total"
      @on-search="fetchList"
    />
  </PcContainer>
</template>
```

## 关键约定

- 它是普通页面的默认容器，不是左树右表骨架
- 标准列表页中优先与 `pc-table-warp` 组合使用

## 注释要求

- 如果容器内承载搜索、列表和弹窗联动，中文注释要说明页面级职责

## 不要这样用

- 左树右表页面继续沿用 `PcContainer`，却绕开分栏容器
- 把它当成列表、树、弹窗等业务能力的替代品

## 来源

- 当前来自企业前端基线约定
- 后续建议补充到 `p-components` 的 powerdoc 与注册表同步链路
