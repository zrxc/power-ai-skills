---
name: "plugin-extension-skill"
description: "用于生成或改造 `@power/p-components`、`@power/runtime-vue3` 中的插件注册与全局安装能力。适用于 `src/plugins` 下的资源注册、全局方法、全局组件安装、自定义扩展，以及需要先明确插件副作用和初始化顺序的场景。"
---

# 插件扩展技能

## 适用场景

- 扩展 `plugins/assets.ts`、`customComponents.ts`、`globalMethods.ts`
- 新增全局注册、全局方法和统一安装逻辑
- 调整插件初始化顺序和副作用边界

## 按需读取的参考文件

- 目录结构：`references/structure.md`
- 实现规则：`references/rules.md`

## 必须遵循的项目模式

- 插件逻辑优先放在 `packages/p-components/src/plugins`
- 保持 `setupXxx` 形式的初始化函数命名
- 插件入口统一从 `src/plugins/index.ts` 导出
- 插件副作用必须明确，不在导入阶段偷偷执行

## 实现清单

1. 确认需求属于全局注册、资源挂载还是全局方法扩展
2. 在插件目录新增或调整 `setup*` 文件
3. 明确接收的 `app`、配置项和副作用边界
4. 补齐 `plugins/index.ts` 和必要的包入口导出
5. 检查消费项目初始化顺序是否受影响

## 何时切换到其他技能

- 当核心问题落在运行时 store、router、hooks 或全局请求能力，而不是插件注册方式时，切换到 `runtime-extension-skill`
- 当当前任务主要是企业组件选型、组件消费入口或导出链路，而不是全局安装逻辑时，切换到 `power-component-library`
- 当核心问题是主题变量、样式资源挂载或样式入口组织时，补充 `style-theme-skill`
- 当阻塞点已经变成某个页面或业务模块的具体实现，而不是全局注册能力时，切换到对应页面 skill

## 注意事项

- 不要在插件里塞具体业务页面逻辑
- 插件新增全局能力时要考虑命名冲突和可回退性
- 涉及全局方法时要明确是否需要类型声明同步
