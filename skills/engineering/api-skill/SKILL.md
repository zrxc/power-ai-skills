---
name: "api-skill"
description: "用于生成项目标准的接口模块、请求封装调用方式以及 TypeScript 请求响应类型。适用于新增 CRUD 接口、列表查询接口、导入导出接口、批量操作接口，以及需要先补齐请求参数和返回类型约束的场景。"
---

# 接口技能
用于生成符合项目约定的 API 模块和类型定义，默认落在 `src/api/modules/`。

## 适用场景

- 新增某个模块的 CRUD 接口
- 列表查询接口与分页参数定义
- 导入、导出、上传、下载接口
- 批量操作接口
- 请求和响应类型定义补齐

## 按需读取的参考文件

- CRUD 接口模板：`references/templates.md`
- 分页接口模板：`references/templates.md`
- 文件上传下载模板：`references/templates.md`

## 必须遵循的项目模式

### 目录

- 接口文件放在 `src/api/modules/`
- 公共请求封装使用项目已有 `request` 模块
- 请求和响应类型使用 TypeScript 显式声明

### 接口设计

- 列表查询默认携带 `pageQuery`
- 响应结构统一包含 `code`、`data`、`msg`，分页列表包含 `total`
- 导入导出、上传下载场景明确 `responseType` 或 `multipart/form-data`

### 错误处理

- 优先通过项目统一请求拦截器处理共性错误
- 页面内只处理当前业务动作的成功或失败结果

## 实现清单

1. 确定接口模块名和文件路径
2. 定义请求参数和响应参数类型
3. 生成接口函数并接入 `request`
4. 如有列表能力，补充分页类型
5. 如有导入导出或上传下载，补充对应请求配置

## 常用类型约定

```ts
interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg?: string;
  total?: number | string;
}
```

```ts
interface PageQuery {
  pageNum: number;
  pageSize: number;
  orderByColumn?: string;
  isAsc?: "asc" | "desc";
}
```

## 何时切换到其他技能

- 当当前问题首先是页面骨架、列表编排或树表联动，而不是接口定义本身时，切换到 `basic-list-page` 或 `tree-list-page`
- 当主要复杂度已经转向表单字段组织、回显和校验规则时，切换到 `form-skill`
- 当任务重点是用户确认、成功失败提示或危险操作反馈，而不是请求封装时，切换到 `message-skill`
- 当问题上升到运行时全局请求能力、拦截器或统一配置层时，切换到 `runtime-extension-skill`

## 注意事项

- 不要只写接口函数而不写类型
- 不要绕开项目已有 `request` 封装直接写裸请求
- 模块名、函数名、类型名保持可读且与业务一致
- 生成接口和类型代码时补充中文注释，重点说明参数含义、分页结构、返回值约束和导入导出等特殊请求配置
