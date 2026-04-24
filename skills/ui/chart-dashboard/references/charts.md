# 图表组织方式

- `fetchChartData`：只负责请求数据
- `buildChartOptions`：只负责拼装 option
- `useChartResize`：负责 resize 和实例生命周期

建议每个图表模块拆成：

```text
components/
  cpu-trend.vue
  alarm-pie.vue
```
