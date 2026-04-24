---
name: "runtime-extension-skill"
description: "用于扩展 `@power/runtime-vue3` 运行时能力，适用于 router、store、hooks、全局请求、菜单权限、全局配置、入口初始化和通用运行时工具场景。适合在问题已经上升到框架层全局行为，而不是单个业务页面或组件实现时激活。"
---

# Runtime 扩展技能

## 适用场景

- 扩展 `runtime-vue3` 的 store、router、hooks
- 调整全局请求、权限、菜单和入口初始化
- 增加运行时公共模块

## 按需读取的参考文件

- 包结构：`references/structure.md`
- 开发规则：`references/rules.md`

## 必须遵循的项目模式

- 运行时扩展放在 `packages/runtime-vue3/src`
- store、router、hooks、utils 分层清晰
- 入口通过 `src/entry/lib/main/index.ts` 统一导出

## 实现清单

1. 确认能力应放在运行时，而不是业务项目
2. 按模块放到 `store`、`router`、`hooks`、`utils` 或 `api`
3. 补齐入口导出、类型和初始化逻辑
4. 验证对业务项目接入方式的影响
5. 更新相关 skill 和基线说明

## 何时切换到其他技能

- 当问题只是页面骨架、组件拼装或企业组件选型，而没有触及运行时全局行为时，回看 `power-component-library`
- 当改动主要落在主题变量、色板、样式入口或全局样式约束时，切换到 `style-theme-skill`
- 当需求本质是抽取通用工具函数，而不是扩展 router、store 或 runtime hooks 时，切换到 `utils-extension-skill`
- 当任务只是补单个业务接口模块，而不是改统一请求能力和入口初始化时，切换到 `api-skill`

## 注意事项

- 运行时层不要承接具体业务页面逻辑
- 路由、store、权限和请求改动都要考虑全局影响
- 入口导出变化需要同步检查消费侧兼容性
