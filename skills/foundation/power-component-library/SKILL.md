---
name: "power-component-library"
description: "用于判断 `@power/p-components` 中应该选择哪些企业组件、布局壳层和导出链路。适用于页面或组件实现前需要先区分 `pc-*` 公共基础组件、`pcp-*` 业务组件、布局壳层、插件注册和组件消费入口的场景。"
---

# Power 组件库技能
用于说明 `@power/p-components` 的核心结构、组件分层和选型规则。

## 适用场景

- 判断页面或新组件应该使用哪些企业组件
- 区分公共基础组件、业务组件、布局壳层和插件能力的落位
- 在写页面或组件前先确认该复用哪类企业组件
- 总结组件库约定并服务其他 skill 的选型判断

## 按需读取的参考文件

- 核心组件清单：`references/core-components.md`
- 组件选型规则：`references/selection-guide.md`
- 组件库结构：`references/package-structure.md`

## 核心结论

- `src/components/pc-*`：公共基础组件
- `src/p-components/pcp-*`：业务组件
- `src/layout` / `src/p-layout`：布局壳层与布局子组件
- `src/plugins`：全局安装、资源注册、全局方法
- `src/entry/lib/main/index.ts`：组件库统一导出入口

## 使用原则

- 能用组件库解决的能力，不在业务项目重复实现
- 公共能力优先沉淀到 `pc-*`
- 业务共性能力优先沉淀到 `pcp-*`
- 布局壳层优先沉淀到 `layout` 或 `p-layout`
- 对外消费链路统一由 `index.ts` 和 `entry/lib/main/index.ts` 维护
- 选型不明确时，优先看现有组件目录和导出入口，而不是凭经验命名

## 何时切换到其他技能

- 当问题已经不是“用哪个企业组件”，而是“页面骨架该怎么搭”时，切换到 `basic-list-page` 或 `tree-list-page`
- 当任务核心落在插件注册、全局安装或组件库初始化副作用时，切换到 `plugin-extension-skill`
- 当问题主要是主题变量、色板和样式入口，而不是组件选型时，切换到 `style-theme-skill`
- 当阻塞点已经变成项目基础框架、运行时能力或目录边界，而不是组件消费时，切换到 `power-foundation-app`

## 注意事项

- 组件库版本升级后优先更新本 skill
- 新增核心组件时同步补结构和选型规则
- 修改导出入口时同步检查对业务项目的兼容性
