---
name: "form-skill"
description: "用于生成标准 Element Plus 表单及校验规则。适用于新增、编辑、详情回显、动态表单分组、字段校验，以及需要先明确 `el-form` 结构、rules 和表单提交流程的场景。"
---

# 表单技能
用于生成符合项目约定的 `el-form` 表单实现。

## 适用场景

- 新增 / 编辑表单
- 带校验规则的录入页
- 动态增删行表单
- 双列或分组表单布局

## 按需读取的参考文件

- 基础表单模板：`references/templates.md`
- 动态表单模板：`references/templates.md`
- 双列表单模板：`references/templates.md`

## 必须遵循的项目模式

### 组件

- 使用 `el-form`、`el-form-item` 组织字段
- 使用 `ref` 获取表单实例并执行校验
- 表单数据优先使用 `reactive` 或稳定结构的 `ref`

### 校验

- 必填、长度、格式校验显式声明
- 复杂校验使用自定义校验器
- 查看模式下跳过校验并禁用输入

### 提交

- 提交前调用 `formRef.validate()`
- 弹窗关闭时重置表单
- 必要时通过 `defineExpose` 暴露 `validate`、`resetForm`

## 实现清单

1. 定义 `formData` 和 `rules`
2. 创建 `el-form` 和字段结构
3. 实现 `validate` 与 `resetForm`
4. 接入提交逻辑和反馈提示
5. 如有动态字段，补充增删行逻辑

## 常见规则示例

```ts
const rules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  email: [{ type: "email", message: "请输入正确的邮箱地址", trigger: "blur" }],
};
```

## 何时切换到其他技能

- 当主要复杂度在弹窗状态、查看模式和打开关闭流程，而不是字段与规则本身时，切换到 `dialog-skill`
- 当页面核心变成可配置表单搭建与渲染，而不是静态表单实现时，切换到 `form-designer-skill`
- 当首先需要解决的是列表页骨架、搜索区和表格联动，而表单只是附属能力时，切换到 `basic-list-page`
- 当阻塞点已经转成接口契约、保存请求和字段回显数据来源时，补充 `api-skill`

## 注意事项

- 表单模型字段要与提交参数结构一致
- 校验提示文字保持业务可读
- 查看模式不要遗漏 disabled 或 readonly 控制
- 生成表单代码时补充中文注释，重点说明字段分组、校验规则、自定义校验器、动态字段和表单重置逻辑
