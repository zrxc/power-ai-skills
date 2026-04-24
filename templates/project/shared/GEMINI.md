<!-- generated-by: @power/power-ai-skills -->

# 项目 Gemini 指南

本项目统一使用 `.power-ai/skills/` 作为企业公共 skill 源目录，项目私有补充放在 `.power-ai/skills/project-local/`。

## 执行流程

{{POWER_AI_EXECUTION_FLOW}}

## 读取优先级

{{POWER_AI_READ_PRIORITY}}

## Conversation Capture
{{POWER_AI_CONVERSATION_CAPTURE}}

## 输出约定

- 默认中文
- 生成代码时补充详细中文注释
- 注释重点覆盖复杂逻辑、关键数据流和边界条件

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- `@power/runtime-vue3`
- `@power/p-components`
- `@power/style`

## UI 模式

- 标准页面：`PcContainer`
- 左树右表：`CommonLayoutContainer`
- 列表：`pc-table-warp`
- 弹窗：`pc-dialog`
- 动态表单：`pc-form-designer`、`pc-form-render`
