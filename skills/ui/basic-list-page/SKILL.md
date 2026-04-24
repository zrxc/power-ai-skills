---
name: "basic-list-page"
description: "用于生成标准的可搜索 CRUD 列表页，优先基于企业组件知识中的列表页标准组合实现。适用于标准管理列表、分页表格、搜索表单，以及需要新增、编辑、删除和统一反馈流程的常规后台页面。"
---

# 基础列表页技能
用于生成符合项目约定的标准列表页。命中本 skill 后，优先按企业组件知识中的标准列表组合实现，不要按个人习惯自由拼装 `el-table`、`el-pagination` 和搜索表单。

## 适用场景

- 可搜索、可分页的 CRUD 列表页
- 标准管理台列表页
- 列表页内通过弹窗完成新增、编辑、删除
- 需要统一 loading、请求和反馈处理的页面

## 开始实现前必须读取

- 完整模板：`references/templates.md`
- 企业组件注册表：`../../foundation/power-component-library/references/generated/component-registry.json`
- 标准列表配方：`../../foundation/power-component-library/references/generated/page-recipes/basic-list-crud.json`
- 关键组件 guide：
  - `../../foundation/power-component-library/references/generated/component-guides/pc-container.md`
  - `../../foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
  - `../../foundation/power-component-library/references/generated/component-guides/pc-dialog.md`

## 默认组件组合

- 页面容器：`PcContainer`
- 列表主体：`pc-table-warp`
- 弹窗：`pc-dialog`

## 必须遵循的页面约束

### 布局

- 页面外层优先使用 `PcContainer`
- 列表优先使用 `pc-table-warp`
- 弹窗增删改优先使用 `pc-dialog`

### 状态

- 维护 `loading`、`tableData`、`total`、`pageValue`
- 搜索条件独立维护，例如 `searchFormDatas`
- 搜索条件变化时，把页码重置为 `1`

### 数据加载

- 列表请求优先使用 `src/api/modules` 下的类型化接口
- `total` 统一转成 `Number(...)`
- 请求过程通过 `try/finally` 确保 `loading` 正确关闭

### 操作流

- 通过 `settingAction` 统一处理新增、编辑、删除、查看等动作
- 删除等危险操作优先通过 `ElMessageBox.confirm` 二次确认
- 新增、编辑、删除成功后刷新列表

## 实现清单

1. 先确认主 skill 是 `basic-list-page`
2. 读取标准列表配方、企业组件注册表和相关组件 guide
3. 搭建 `PcContainer + pc-table-warp` 骨架
4. 定义 `searchList`、`columnList`、`settingColumnConfig`
5. 实现 `fetchList`、`onSearch`、`onSearchReset`、`handlePageChange`
6. 如包含弹窗 CRUD，再补 `pc-dialog`、提交逻辑和成功回刷

## 何时切换到其他技能

- 当主要复杂度已经从列表骨架转成弹窗状态流、查看模式或多步骤弹窗时，切换到 `dialog-skill`
- 当阻塞点变成字段联动、校验规则、表单分组或详情回显时，切换到 `form-skill`
- 当问题核心落在接口契约、请求封装、分页参数和类型定义时，切换到 `api-skill`
- 当页面不再是常规列表，而是配置式表单搭建与渲染时，切换到 `form-designer-skill`

## 注释要求

- 生成代码默认补充中文注释
- 注释重点说明：
  - 搜索条件与分页重置的关系
  - 列表请求流转
  - 弹窗开关和提交后的列表刷新
  - 列配置或危险操作确认的原因
- 不要写低信息量注释

## 禁止项

- 标准列表场景直接回退到 `el-table + el-pagination`
- 明明需要企业搜索和列设置能力，却绕开 `pc-table-warp`
