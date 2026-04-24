<!-- generated-by: @power/power-ai-skills -->

# 项目 AI 指南

本项目的企业公共 skill 统一来自 `.power-ai/skills/`，项目私有补充放在 `.power-ai/skills/project-local/`。

`@power/power-ai-skills` 会根据 `.power-ai/selected-tools.json` 自动生成 Claude Code 需要的入口文件，请优先维护 `.power-ai` 目录中的真实内容，而不是直接修改适配器文件。

## 执行流程

{{POWER_AI_EXECUTION_FLOW}}

## 读取优先级

{{POWER_AI_READ_PRIORITY}}

## Conversation Capture
{{POWER_AI_CONVERSATION_CAPTURE}}

## 默认语言

- 中文

## 注释约定

- 生成代码时默认补充详细中文注释
- 注释优先解释复杂逻辑、边界处理、组件联动和状态变化
- 避免写低信息量注释

## 默认技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- `@power/runtime-vue3`
- `@power/p-components`
- `@power/style`

## 优先模式

- 标准页优先 `PcContainer`
- 树表页优先 `CommonLayoutContainer`
- 列表优先 `pc-table-warp`
- 弹窗优先 `pc-dialog`
- 动态表单优先 `pc-form-designer`、`pc-form-render`
