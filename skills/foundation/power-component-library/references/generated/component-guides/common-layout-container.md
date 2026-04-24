# `CommonLayoutContainer`

## 定位

`CommonLayoutContainer` 是当前企业树列表场景的首选骨架组件。

和普通布局容器不同，它在实际落地中不是“外层分栏壳子 + 你自己再塞一棵 `pc-tree`”，而是已经封装了左侧树区域。外部通常只需要：

- 传当前选中节点主键
- 传默认展开节点
- 监听树节点点击事件
- 在 `content-main` 插槽里放右侧列表或详情内容

## 已确认的实际用法

根据下游项目的真实接入方式，当前至少可以确认这些能力：

- props
  - `current-node-key`
  - `default-expanded-keys`
- events
  - `node-click`
- slots
  - `content-main`

下游可验证用法：

- `D:/webCode/Myd/longjiang/powermodel-front/src/views/DepartmentUser/index.vue`
- `D:/webCode/Myd/longjiang/power-portal-front/src/plugins/custom-components.ts`

## 默认接法

```vue
<CommonLayoutContainer
  :current-node-key="selectedDepartmentId"
  :default-expanded-keys="defaultExpandedKeys"
  @node-click="handleNodeClick"
>
  <template #content-main>
    <pc-table-warp
      v-model:search-value="searchFormDatas"
      v-model:page-value="pageValue"
      :data="tableData"
      :column-list="columnList"
      :loading="loading"
      :total="total"
      @on-search="fetchList"
    />
  </template>
</CommonLayoutContainer>
```

## 联动约定

- `node-click` 回调里要读取当前部门节点并同步到右侧查询条件
- 切换部门后要把分页重置到第一页
- 新增、编辑、删除成功后，要刷新当前部门下的数据
- 如果当前项目还保留 `PcLayoutMainContainer / pc-layout-main-container` 的旧实现习惯，不要直接改回手工 `aside + pc-tree` 拼装

## 什么时候再看 `pc-tree`

只有在以下情况才额外读取 `pc-tree` guide：

- 明确确认 `CommonLayoutContainer` 不满足当前业务树交互
- 需要自定义节点按钮、节点插槽、拖拽等更细粒度树能力
- 消费项目本地确实没有 `CommonLayoutContainer`，只能退回到别名实现再手工补树

## 不要这样用

- 命中树列表场景后，默认继续手工拼 `pc-tree + pc-layout-main-container`
- 因为项目旧代码大量使用 `pc-layout-main-container`，就绕开 `CommonLayoutContainer`
- 回退到 `el-tree`、`el-container` 或自定义左右分栏
