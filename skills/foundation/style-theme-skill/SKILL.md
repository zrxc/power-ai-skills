---
name: "style-theme-skill"
description: "用于扩展 `@power/style` 主题样式能力。适用于主题变量、色板、字体、滚动条、全局 reset、通用 mixin，以及需要先明确样式 token 和全局入口影响范围的场景。"
---

# 主题样式技能

## 适用场景

- 新增主题或调整主题变量
- 调整字体、滚动条、reset 和公共样式
- 统一组件库和业务项目的样式 token

## 按需读取的参考文件

- 包结构：`references/structure.md`
- 开发规则：`references/rules.md`

## 必须遵循的项目模式

- 主题样式放在 `packages/style/src/assets/styles`
- 主题变量通过 `themes/*.scss` 维护
- 全局入口通过 `src/entry/lib/main/index.ts` 注入

## 实现清单

1. 明确新增的是主题变量、公共样式还是 reset 能力
2. 在对应 `themes`、`common` 或入口文件中实现
3. 保持变量命名和现有 `--theme-*` 体系一致
4. 验证对组件库和业务项目的影响
5. 同步更新相关组件 skill 的参考规则

## 何时切换到其他技能

- 当问题是页面或组件选型规范调整，而不是主题 token 本身时，回看 `power-component-library`
- 当当前任务已经进入运行时主题切换、入口初始化或全局行为联动时，补充 `runtime-extension-skill`
- 当问题主要是插件式样式资源挂载，而不是主题变量设计时，补充 `plugin-extension-skill`
- 当阻塞点已经变成具体页面布局、卡片样式或图表主题消费时，切换到对应页面 skill

## 注意事项

- 主题变量优先增量扩展，不轻易改名
- 颜色、字体和 spacing 变更会影响全局消费方
- 通用样式不要覆盖业务页面特有布局
