# 兼容矩阵

## 目标

用于记录企业基础框架、组件库与 `@power/power-ai-skills` 的主要兼容关系，帮助维护者在升级时快速判断需要关注哪些 skill。

## 当前基线

### 前端基础框架

- Vue：`3.4.x`
- TypeScript：`4.7.x`
- Vite：`4.x`
- Pinia：`2.1.7`
- Vue Router：`4.2.5`

### Power 包基线

- `@power/runtime-vue3`：`6.5.0`
- `@power/p-components`：`6.5.0`
- `@power/style`：`6.5.0`
- `@power/utils`：`6.5.0`

## 变更域与重点 skill

### runtimeVue3

重点 skill：

- `power-foundation-app`
- `runtime-extension-skill`
- `global-store-skill`
- `route-menu-skill`
- `entry-skill`

升级后重点检查：

- 路由、菜单、store、hooks、运行时初始化模板
- `skill.meta.json` 中的 `compatibility.runtimeVue3`

### pComponents

重点 skill：

- `power-component-library`
- `basic-list-page`
- `tree-list-page`
- `dialog-skill`
- `form-skill`
- `form-designer-skill`

升级后重点检查：

- 组件 props / emits / slots
- demo、doc、test 模板
- 页面骨架是否仍符合组件使用方式

### style

重点 skill：

- `style-theme-skill`
- `chart-dashboard`

升级后重点检查：

- token、主题变量、样式覆盖方式
- references 中的视觉和样式说明

### utils

重点 skill：

- `utils-extension-skill`
- `runtime-extension-skill`
- `power-foundation-app`

升级后重点检查：

- 工具函数签名
- 输入输出契约
- utils 在页面模板中的调用方式

## 推荐升级动作

1. 执行 `pnpm impact:check -- <changed-files>`。
2. 根据报告查看 `affectedDomains`、`impactedSkills`、`followUps`。
3. 更新对应 skill 的 `references/`、`SKILL.md`、`skill.meta.json`。
4. 如版本基线已变化，更新 `baseline/current.json`。
5. 执行 `pnpm release:prepare`。
