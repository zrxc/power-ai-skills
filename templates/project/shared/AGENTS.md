<!-- generated-by: @power/power-ai-skills -->

## 项目技能

本项目的企业公共 skill 统一来自 `.power-ai/skills/`。

工具适配入口由 `@power/power-ai-skills` 根据 `.power-ai/selected-tools.json` 自动生成，请不要手动维护 `.codex`、`.trae`、`.cursor` 等目录下的公共内容。

本地结构：

- 公共 skill 源：`.power-ai/skills/`
- 项目私有 overlay：`.power-ai/skills/project-local/`
- 工具选择配置：`.power-ai/selected-tools.json`
- 工具注册表：`.power-ai/tool-registry.json`

说明：

- 企业公共 skill 通过 npm 包同步，不要在项目里复制一整套公共 skill。
- 项目独有规则、业务术语、补充约定放到 `.power-ai/skills/project-local/`。
- `power-ai-skills sync` 会保留 `project-local`，避免同步时误删项目私有 skill。

## 执行流程

{{POWER_AI_EXECUTION_FLOW}}

## 读取优先级

{{POWER_AI_READ_PRIORITY}}

## Conversation Capture
{{POWER_AI_CONVERSATION_CAPTURE}}

### 语言规则

- skill 默认使用中文
- 需求分析、模板、参考资料默认中文
- 除非用户明确要求英文，否则不要生成英文 skill

### 注释规则

- 使用 power-ai-skills 生成代码时，默认补充有信息量的中文注释
- 注释重点说明复杂状态、关键数据流、分支判断、组件联动、边界条件
- 不要写“变量赋值”“调用方法”这类低价值注释

### 企业基础框架

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- `@power/runtime-vue3`
- `@power/p-components`
- `@power/style`

### 核心组件模式

- 标准页面：`PcContainer`
- 左树右表：`CommonLayoutContainer`
- 列表页：`pc-table-warp`
- 弹窗：`pc-dialog`
- 动态表单：`pc-form-designer`、`pc-form-render`
- 反馈：`ElMessage`、`ElMessageBox`
