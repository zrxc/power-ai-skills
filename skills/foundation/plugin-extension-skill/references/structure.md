# 插件结构
## 主要目录

- `packages/p-components/src/plugins/assets.ts`
- `packages/p-components/src/plugins/customComponents.ts`
- `packages/p-components/src/plugins/globalMethods.ts`
- `packages/p-components/src/plugins/index.ts`

## 常见职责

- 注册全局组件
- 注册全局方法
- 挂载资源或全局配置
- 统一提供 `setup*` 入口给消费项目调用

## 相关导出链路

- `packages/p-components/src/entry/lib/main/index.ts`
- `packages/runtime-vue3/src/entry/lib/main/index.ts`
