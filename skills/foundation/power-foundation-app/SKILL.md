---
name: "power-foundation-app"
description: "用于确认企业前端基础框架的统一技术基线、项目约定和页面开发边界。适用于新建项目、梳理技术栈、判断目录结构、确认运行时能力，以及在进入具体页面 skill 之前先明确基础框架约束的场景。"
---

# Power 基础框架技能
用于说明企业前端基础框架的默认技术栈、目录约定、运行时能力和页面开发边界。

## 适用场景

- 初始化新前端项目
- 判断项目是否符合企业基线
- 页面开发前确认框架与运行时能力
- 为其他 skill 提供基础上下文

## 按需读取的参考文件

- 版本与依赖基线：`references/versions.md`
- 目录与职责边界：`references/project-structure.md`
- 运行时请求和状态能力：`references/runtime-capabilities.md`

## 基础结论

- 默认技术栈：Vue 3 + TypeScript + Vite
- 路由：Vue Router
- 状态管理：Pinia
- 运行时：`@power/runtime-vue3`
- 组件库：`@power/p-components`
- 样式基线：`@power/style`

## 使用原则

- 页面代码优先遵循企业组件模式，不直接绕过组件库自建重复能力
- 请求、下载、全局配置、用户信息优先复用运行时能力
- 列表、弹窗、树表、表单设计器优先用已有企业 skill
- 生成代码时默认补充有信息量的中文注释，重点解释复杂状态、数据流、关键分支和边界条件

## 何时切换到其他技能

- 当问题已经从“项目基线是什么”收敛到具体列表页实现时，切换到 `basic-list-page`
- 当页面属于树节点驱动右侧联动的结构时，切换到 `tree-list-page`
- 当当前阻塞点变成接口定义、请求参数和返回类型时，切换到 `api-skill`
- 当任务已经明确落在弹窗流程、组件选型或目录归档时，分别切换到 `dialog-skill`、`power-component-library`、`project-structure-skill`

## 注意事项

- 本 skill 是基础上下文 skill，不负责直接生成完整业务页面
- 组件库或运行时升级后优先更新本 skill 的参考文档
- 注释要求默认向下传递给页面 skill、组件 skill 和接口 skill
