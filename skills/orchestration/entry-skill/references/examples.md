# 示例

## 输入

```text
帮我开发一个树列表，左侧部门右侧用户，点击部门显示用户信息，字段为名称、性别、电话、年龄，支持新增、编辑、删除
```

## 路由结果

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

## 实现提示

- 默认直接使用 `CommonLayoutContainer`
- 默认把左侧部门树视为 `CommonLayoutContainer` 内置能力
- 在 `content-main` 插槽承载右侧用户表
- 监听 `node-click` 做部门切换联动
- 代码默认补充中文注释
