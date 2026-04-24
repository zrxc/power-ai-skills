# 模板示例

## 目录

- 独立表单设计器页面
- 列表页集成方案
- 配置接口示例
- 常用组件类型

## 独立表单设计器页面

```vue
<!-- @format -->
<template>
  <div class="form-designer-page">
    <pc-form-designer
      ref="designerRef"
      :default-widget-datas="defaultWidgetDatas"
      :form-attribute="formAttribute"
      @on-save="handleSave"
    />
    <pc-dialog v-model="previewVisible" title="预览" width="800px">
      <pc-form-render
        v-model="previewData"
        :widget-datas="previewWidgetDatas"
        :form-attribute="formAttribute"
      />
    </pc-dialog>
  </div>
</template>
```

## 列表页集成方案

```vue
<pc-dialog v-model="dialogVisible" :title="dialogTitle" width="800px" destroy-on-close>
  <pc-form-designer
    v-if="!isViewMode"
    ref="designerRef"
    :default-widget-datas="defaultWidgetDatas"
    :form-attribute="formAttribute"
  />
  <pc-form-render
    v-else
    v-model="viewData"
    :widget-datas="viewWidgetDatas"
    :form-attribute="formAttribute"
    :readonly="true"
  />
</pc-dialog>
```

## 配置接口示例

```ts
export interface FormConfig {
  id?: string;
  name: string;
  widgetDatas: any[];
  formAttribute: {
    labelPosition: "left" | "right" | "top";
    labelWidth: string;
    size: "large" | "default" | "small";
  };
}

export const saveFormConfig = (data: FormConfig) => request({
  url: "/api/form-config/save",
  method: "post",
  data,
});

export const getFormConfig = (id?: string) => request({
  url: `/api/form-config/${id || "default"}`,
  method: "get",
});
```

## 常用组件类型

```ts
const commonWidgetTypes = [
  "input",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "date",
  "number",
  "switch",
  "upload",
  "grid",
];
```
