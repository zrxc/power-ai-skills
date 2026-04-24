# 默认 skill 组合

## 组合原则

- 页面骨架决定主 skill
- 操作、权限、表单模式决定辅助 skill
- 命中企业组件场景时，要额外带出页面配方和组件知识入口

## 标准列表页

- 主 skill：`basic-list-page`
- 出现 `新增 / 编辑 / 删除 / 增删改 / CRUD`
  - 补 `dialog-skill`
  - 补 `api-skill`
  - 补 `message-skill`
  - 默认补 `form-skill`
- 页面配方：
  - `skills/foundation/power-component-library/references/generated/page-recipes/basic-list-crud.json`
- 组件知识入口：
  - `skills/foundation/power-component-library/references/generated/component-registry.json`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-container.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-dialog.md`

## 树列表页

- 主 skill：`tree-list-page`
- 出现 `新增 / 编辑 / 删除 / 增删改 / CRUD`
  - 补 `dialog-skill`
  - 补 `api-skill`
  - 补 `message-skill`
  - 默认补 `form-skill`
- 页面配方：
  - `skills/foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json`
- 组件知识入口：
  - `skills/foundation/power-component-library/references/generated/component-registry.json`
  - `skills/foundation/power-component-library/references/generated/component-guides/common-layout-container.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-dialog.md`
  - 只有在内置树不满足需求时，再读 `skills/foundation/power-component-library/references/generated/component-guides/pc-tree.md`
  - 只有在确认本地没有 `CommonLayoutContainer` 导出时，再读 `skills/foundation/power-component-library/references/generated/component-guides/pc-layout-main-container.md`

## 输出约束

- 组合结论要先说主 skill，再说辅助 skill
- 命中页面 skill 时，要一起输出页面配方和组件知识入口
- 生成代码时默认补详细中文注释
