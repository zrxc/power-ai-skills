# 模板示例

## 看板布局

```vue
<PcContainer>
  <section class="dashboard-filter"></section>
  <section class="dashboard-cards"></section>
  <section class="dashboard-charts"></section>
</PcContainer>
```

## 卡片模块

```vue
<status-card
  :title="'在线资源'"
  :value="overviewData.onlineCount"
  :loading="overviewLoading"
/>
```

## 图表详情弹窗

```vue
<pc-dialog v-model="detailVisible" title="趋势详情" width="900px">
  <chart-detail :options="detailOptions" />
</pc-dialog>
```
