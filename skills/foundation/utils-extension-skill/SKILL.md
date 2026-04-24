---
name: "utils-extension-skill"
description: "用于扩展 `@power/utils` 工具包能力。适用于数据处理、日期、URL、storage、document、validate、TSX helper、Vue helper，以及需要先判断某段逻辑是否值得抽成通用工具函数的场景。"
---

# Utils 扩展技能

## 适用场景

- 新增通用工具函数
- 抽取组件库或 runtime 的重复逻辑
- 整理工具包导出和类型

## 按需读取的参考文件

- 包结构：`references/structure.md`
- 开发规则：`references/rules.md`

## 必须遵循的项目模式

- 工具函数放在 `packages/utils/src/utils`
- 按领域拆分文件，例如 `date`、`url`、`storage`、`document`
- 统一通过 `src/utils/index.ts` 导出

## 实现清单

1. 确认逻辑是否真的属于公共工具层
2. 选择合适的 utils 文件或新增新文件
3. 保持纯函数或低副作用设计
4. 补齐入口导出和必要类型
5. 评估对 runtime 和组件库的复用价值

## 何时切换到其他技能

- 当问题涉及页面骨架、组件选型和企业组件接法时，切换到 `power-component-library`
- 当核心问题已经上升到全局运行时行为，而不是纯工具抽取时，补充 `runtime-extension-skill`
- 当当前任务主要是样式 token、主题变量或 SCSS 公共能力，而不是 JS/TS 工具函数时，切换到 `style-theme-skill`
- 当阻塞点只是业务模块内部复用，而不是跨项目公共能力时，优先留在业务模块，不强行提升到 utils

## 注意事项

- utils 不要依赖具体业务 API
- 谨慎引入浏览器副作用和 DOM 操作
- 命名和导出要稳定，避免破坏消费方
