# 组件库结构
## 包分层

- `packages/p-components/src/components`：`pc-*` 公共基础组件
- `packages/p-components/src/p-components`：`pcp-*` 业务组件
- `packages/p-components/src/p-layout` / `layout`：布局与壳层
- `packages/p-components/src/plugins`：全局安装、资源和方法注册
- `packages/p-components/src/utils`：组件包内部公共工具与数据初始化
- `packages/p-components/src/entry/lib/main/index.ts`：统一导出入口

## 命名约定

- `pc-*`：公共基础组件
- `pcp-*`：业务组件

## 关联链路

- 公共组件能力优先从 `components/index.ts` 汇总
- 业务组件能力优先从 `p-components/index.ts` 汇总
- 布局能力优先从 `p-layout/index.ts` 汇总
- 插件能力优先从 `plugins/index.ts` 汇总
- 最终对外暴露走 `entry/lib/main/index.ts`

## 典型业务组件

- 组织选择器
- 角色选择器
- 资源选择器
- 同步弹窗
- 工作台首页组件
