---
name: "tree-list-page"
description: "用于生成左树右表的联动管理页面，优先基于企业组件知识中的 CommonLayoutContainer 实现树节点切换与右侧列表联动。适用于部门树 + 用户列表、分类树 + 设备列表、组织树 + 资源列表，以及任何需要先选树节点再刷新右侧数据的场景。"
---

# 左树右表技能
用于生成符合项目约定的树列表页面。命中本 skill 后，不要只按经验拼页面，必须先读取企业组件知识和页面配方，再开始编码。

## 适用场景

- 左树右表
- 部门树驱动右侧用户列表
- 分类树驱动右侧设备列表
- 组织树驱动右侧资源列表
- 任何需要“先选树节点，再刷新右侧数据”的管理页面

## 开始实现前必须读取

- 标准模板：`references/templates.md`
- 企业组件注册表：`../../foundation/power-component-library/references/generated/component-registry.json`
- 树表页面配方：`../../foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json`
- 关键组件 guide：
  - `../../foundation/power-component-library/references/generated/component-guides/common-layout-container.md`
  - `../../foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
  - `../../foundation/power-component-library/references/generated/component-guides/pc-dialog.md`
- 只有在内置树能力不满足需求时，再补读：
  - `../../foundation/power-component-library/references/generated/component-guides/pc-tree.md`
- 只有在确认消费项目没有 `CommonLayoutContainer` 导出时，再补读：
  - `../../foundation/power-component-library/references/generated/component-guides/pc-layout-main-container.md`

## 默认组件组合

- 页面骨架：`CommonLayoutContainer`
- 左侧树区：`CommonLayoutContainer` 内置树区域
- 右侧列表：`pc-table-warp`
- 新增 / 编辑弹窗：`pc-dialog`

## 必须遵循的页面约束

### 布局

- 页面骨架优先使用 `CommonLayoutContainer`
- 默认不要手工再拼一棵 `pc-tree`
- 右侧列表优先使用 `pc-table-warp`
- 不要改用 `pc-layout-page-common`
- 不要手写自定义左右分栏骨架替代企业组件

### 状态

- 维护当前选中节点主键，优先与 `current-node-key` 对齐
- 维护默认展开节点，优先与 `default-expanded-keys` 对齐
- 维护右侧搜索条件、分页、总数和表格数据源
- 切换树节点时重置分页到第一页

### 联动

- 监听 `CommonLayoutContainer` 的 `node-click`
- 树节点切换后，把节点主键写入右侧查询条件
- 树节点切换后刷新右侧列表
- 新增、编辑、删除成功后刷新当前节点下的数据
- 未选中合法节点时，阻止新增或查询

## 实现清单

1. 先确认主 skill 是 `tree-list-page`，辅助 skill 是否包含 `dialog-skill + api-skill + message-skill + form-skill`
2. 读取企业组件注册表和 `tree-user-crud` 页面配方
3. 使用 `CommonLayoutContainer` 搭建页面，不要默认手工补树
4. 在 `content-main` 插槽接入 `pc-table-warp`
5. 实现节点切换、分页重置和列表刷新
6. 如包含增删改，再补 `pc-dialog`、表单提交逻辑和成功回刷

## 什么时候切换到其他技能

- 当页面实际上不需要树节点驱动右侧列表，而只是标准搜索表格时，切换到 `basic-list-page`
- 当新增、编辑、查看流程的主复杂度落在弹窗状态和表单交互上时，切换到 `dialog-skill`
- 当当前阻塞点变成接口契约、分页参数或树节点查询接口定义时，切换到 `api-skill`
- 当问题已经明确收敛为企业组件选型，尤其是是否需要 `pc-tree` 或其他布局壳层时，回看 `power-component-library`

## 注释要求

- 生成代码默认补充中文注释
- 注释重点说明：
  - 当前选中节点与默认展开节点的关系
  - 节点切换后右侧列表的联动链路
  - 为什么切换节点时要重置分页
  - 为什么弹窗提交成功后要回刷当前节点数据
- 不要写低信息量注释

## 禁止项

- `el-tree`
- `el-table`
- `pc-layout-page-common`
- 自定义左中右分栏骨架
- 命中该场景后默认手工拼 `pc-tree + pc-layout-main-container`
