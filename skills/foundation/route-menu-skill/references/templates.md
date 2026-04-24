# 模板示例

## 路由定义

```ts
{
  path: "/monitor-settings/metrics",
  name: "monitor-settings-metrics",
  component: () => import("@/views/monitor-settings/metrics/index.vue"),
  meta: {
    title: "指标管理"
  }
}
```

## 菜单元信息

```ts
meta: {
  title: "指标管理",
  icon: "table",
  orderNo: 10
}
```
