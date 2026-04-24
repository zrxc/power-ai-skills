---
name: "dialog-skill"
description: "用于生成项目标准的弹窗流程，基于 pc-dialog 组织新增、编辑、查看和多步骤弹窗。适用于弹窗承载表单、列表内 CRUD 弹窗，以及需要明确 dialog mode、打开关闭和提交回刷逻辑的场景。"
---

# 弹窗技能
用于生成符合项目约定的 `pc-dialog` 弹窗流程。

## 适用场景

- 新增 / 编辑 / 查看弹窗
- 弹窗内承载表单
- 多步骤弹窗流程
- 列表页中的弹窗 CRUD

## 按需读取的参考文件

- 基础弹窗模板：`references/templates.md`
- 多步骤弹窗模板：`references/templates.md`
- 多模式弹窗模板：`references/templates.md`

## 必须遵循的项目模式

### 组件

- 弹窗统一使用 `pc-dialog`
- 表单弹窗通常配合 `el-form`
- 查看模式下跳过表单校验并禁用交互

### 状态

- 维护 `dialogVisible`
- 显式维护 `dialogMode`，例如 `create | edit | view`
- 关闭弹窗时重置表单和临时状态

### 行为

- 新增时使用默认表单值
- 编辑和查看时基于当前行数据初始化
- 提交成功后关闭弹窗并刷新列表

## 实现清单

1. 创建 `pc-dialog` 骨架
2. 定义 `dialogVisible`、`dialogMode`、`dialogTitle`
3. 补充 `handleAdd`、`handleEdit`、`handleView`、`handleClose`
4. 如弹窗中是表单，接入 `formRef.validate()`
5. 提交成功后关闭弹窗并刷新外层数据

## 何时切换到其他技能

- 当主要复杂度落在表单字段设计、校验规则和字段联动，而不是弹窗壳层本身时，切换到 `form-skill`
- 当问题首先是列表页骨架、搜索区和表格组织方式，而弹窗只是附属能力时，切换到 `basic-list-page`
- 当当前任务的关键不是弹窗，而是成功、失败、确认和警告反馈流程时，切换到 `message-skill`
- 当阻塞点变成接口契约、保存请求和提交后数据同步时，补充 `api-skill`

## 注意事项

- 表单弹窗建议设置 `close-on-click-modal` 为 `false`
- 需要彻底重置时使用 `destroy-on-close`
- 查看模式不要走提交校验逻辑
- 生成弹窗代码时补充中文注释，重点说明弹窗模式切换、默认值初始化、关闭重置和提交后的外层刷新逻辑
