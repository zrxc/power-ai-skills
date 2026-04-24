<!-- generated-by: @power/power-ai-skills -->

# 项目开发约定

## Skill 入口

- 企业公共 skill 目录：`.power-ai/skills/`
- 项目私有 overlay：`.power-ai/skills/project-local/`
- 工具选择配置：`.power-ai/selected-tools.json`

## 执行流程

{{POWER_AI_EXECUTION_FLOW}}

## 读取优先级

{{POWER_AI_READ_PRIORITY}}

## Conversation Capture
{{POWER_AI_CONVERSATION_CAPTURE}}

## 默认语言

- 中文

## 代码生成约定

- 生成代码时默认补充详细中文注释
- 注释重点解释复杂逻辑、状态同步、数据流和边界条件
- 不要添加低价值注释

## 前端基础栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- `@power/runtime-vue3`
- `@power/p-components`
- `@power/style`

## 页面与组件模式

- 标准页面优先 `PcContainer`
- 树表页面优先 `CommonLayoutContainer`
- 列表优先 `pc-table-warp`
- 弹窗优先 `pc-dialog`
- 动态表单优先 `pc-form-designer`、`pc-form-render`
