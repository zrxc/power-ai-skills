---
name: "form-designer-skill"
description: "用于生成可配置的表单设计器和表单渲染流程。适用于拖拽式表单设计、表单配置持久化、预览流程，以及需要先明确设计态、预览态和提交态边界的动态表单场景。"
---

# 表单设计器技能
用于生成基于 `pc-form-designer` 和 `pc-form-render` 的动态表单工作流。

## 适用场景

- 拖拽式表单设计器页面
- 后端存储表单配置的可配置表单
- 表单预览流程
- 列表页中新增、编辑、查看弹窗使用表单设计器数据

## 按需读取的参考文件

- 独立表单设计器页面模板：`references/templates.md`
- 列表页集成表单设计器模板：`references/templates.md`
- 配置存储接口和数据结构示例：`references/templates.md`

## 必须遵循的项目模式

### 核心组件

- 使用 `pc-form-designer` 编辑组件配置
- 使用 `pc-form-render` 预览或渲染已保存的组件配置
- 预览流程或列表页弹窗流优先使用 `pc-dialog`

### 状态管理

- 维护 `defaultWidgetDatas` 和 `formAttribute`
- 预览模式维护 `previewVisible`、`previewData`、`previewWidgetDatas`
- 列表页集成场景中，显式维护 `create | edit | view` 等模式

### 保存和加载

- 从类型化 API 模块加载已保存的表单配置
- 保存时同时提交 `widgetDatas` 和 `formAttribute`
- 预览时从 `designerRef` 中读取最新配置
- 保存和提交流程需要显式 `loading` 状态

## 实现清单

1. 创建设计器页面或弹窗骨架
2. 绑定 `defaultWidgetDatas` 和 `formAttribute`
3. 在挂载时或弹窗打开时加载已保存配置
4. 通过类型化 API 保存 `widgetDatas` 和 `formAttribute`
5. 需要预览时，使用 `pc-form-render` 构建预览流
6. 列表页集成时，明确区分 `create`、`edit`、`view` 模式

## 最小数据结构

```ts
interface FormConfig {
  id?: string;
  name: string;
  widgetDatas: any[];
  formAttribute: {
    labelPosition: "left" | "right" | "top";
    labelWidth: string;
    size: "large" | "default" | "small";
  };
}
```

```ts
interface WidgetData {
  id: string;
  type: string;
  label: string;
  field: string;
  defaultValue?: any;
  required?: boolean;
  props?: Record<string, any>;
  children?: WidgetData[];
}
```

## 何时切换到其他技能

- 当主体问题其实是普通表单搭建，而不是可配置表单设计器时，切换到 `form-skill`
- 当列表页骨架、搜索区和表格流才是核心，而设计器只是一个弹窗能力时，切换到 `basic-list-page`
- 当弹窗打开关闭、模式切换和提交回刷逻辑更复杂时，补充 `dialog-skill`
- 当阻塞点变成配置存储接口、类型定义和保存协议时，切换到 `api-skill`
- 当重点落在保存成功、错误反馈和确认提示链路时，补充 `message-skill`

## 注意事项

- 表单配置应持久化到后端，不要只保存在前端内存中
- 设计器权限和最终表单使用权限应分离
- 渲染前校验保存下来的 `widgetDatas` 完整性
- 大量组件场景注意拖拽性能
- 生成设计器代码时补充中文注释，重点说明配置结构、设计态与预览态切换、配置持久化流程和设计器实例交互
