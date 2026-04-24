# 路由规则

## 使用原则

- 优先用 `intent-patterns.md` 判断页面骨架
- 优先用 `slot-extraction.md` 提取业务对象、字段、操作和表单模式
- 优先用 `default-combos.md` 自动补齐辅助 skill
- 命中页面 skill 时，要显式补充页面配方和组件知识入口

## 典型路由

### 标准列表页

- 主 skill：`basic-list-page`
- 辅助 skill：`dialog-skill`、`api-skill`、`message-skill`、`form-skill`
- 页面配方：
  - `skills/foundation/power-component-library/references/generated/page-recipes/basic-list-crud.json`
- 组件知识入口：
  - `skills/foundation/power-component-library/references/generated/component-registry.json`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-container.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-dialog.md`

### 树列表页

- 主 skill：`tree-list-page`
- 辅助 skill：`dialog-skill`、`api-skill`、`message-skill`、`form-skill`
- 页面配方：
  - `skills/foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json`
- 组件知识入口：
  - `skills/foundation/power-component-library/references/generated/component-registry.json`
  - `skills/foundation/power-component-library/references/generated/component-guides/common-layout-container.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-dialog.md`
  - 只有在内置树不满足需求时，再读 `skills/foundation/power-component-library/references/generated/component-guides/pc-tree.md`
  - 只有在确认本地没有 `CommonLayoutContainer` 导出时，再读 `skills/foundation/power-component-library/references/generated/component-guides/pc-layout-main-container.md`

## 输出模板

```text
主 skill：
- tree-list-page

辅助 skill：
- dialog-skill
- api-skill
- message-skill
- form-skill

页面配方：
- skills/foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json

组件知识入口：
- skills/foundation/power-component-library/references/generated/component-registry.json
- skills/foundation/power-component-library/references/generated/component-guides/common-layout-container.md
- skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md
```
