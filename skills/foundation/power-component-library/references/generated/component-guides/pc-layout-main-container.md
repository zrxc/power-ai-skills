# `pc-layout-main-container`

## 定位
`pc-layout-main-container` 是当前组件库源码里可直接检索到的底层布局实现名。

在企业 skill 语义里，它只能被视为 `CommonLayoutContainer` 的底层实现或本地别名，不应作为树列表页面的默认第一选择。

## 何时使用

- 消费项目确认没有 `CommonLayoutContainer` 导出
- 你已经命中 `tree-list-page`
- 需要按企业规则回退到底层别名实现

## 使用约束

- 语义上仍按 `CommonLayoutContainer` 处理
- 代码中要补一条中文注释，说明当前导入名映射到企业骨架 `CommonLayoutContainer`
- 如果只是标准部门树联动，不要默认自己再手工补树，优先先确认是否能直接使用 `CommonLayoutContainer`
- 左侧树确实需要手工实现时，再优先使用 `pc-tree`
- 右侧列表优先使用 `pc-table-warp`

## 最小接法
```vue
<!-- 本项目实际导出名是 PcLayoutMainContainer，这里按企业骨架 CommonLayoutContainer 的别名落地 -->
<pc-layout-main-container :gap-placement="['ltr']">
  <template #aside>
    <pc-tree :data="treeData" node-key="id" />
  </template>

  <template #content-main>
    <pc-table-warp
      v-model:search-value="searchForm"
      v-model:page-value="pageValue"
      :data="tableData"
      :column-list="columnList"
      :total="total"
      @on-search="fetchList"
    />
  </template>
</pc-layout-main-container>
```

## 不要这样用

- 因为项目里已有旧页面使用 `pc-layout-main-container`，就覆盖 `CommonLayoutContainer` 规则
- 把它和 `pc-layout-page-common` 视为同一类骨架
- 自己再包一层 `el-container` 重搭同样布局

## 来源

- `packages/p-components/src/layout/pc-layout-main-container/index.vue`
- `apps/powerdoc/src/p-components/pc-layout-main-container.md`
