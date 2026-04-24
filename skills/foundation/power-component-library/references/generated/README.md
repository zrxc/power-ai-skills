# 企业组件知识

这组文件是给 AI 工具读取的企业组件知识入口，用来避免每次都去全仓库搜索源码、demo 和历史实现。

## 文件说明

- `component-registry.json`
  - 组件注册表
  - 记录组件名、别名、导入方式、源码路径、powerdoc 路径、demo 路径、最小契约和反模式
- `component-guides/`
  - 高频组件的最小接入说明
  - 优先回答“什么时候用、怎么接、不要怎么接”
- `page-recipes/`
  - 业务场景到组件组合的标准配方
  - 用来约束左树右表、标准列表、弹窗表单等高频页面

## 当前范围

第一批组件：

- `PcContainer`
- `CommonLayoutContainer`
- `pc-layout-main-container`
- `pc-tree`
- `pc-table-warp`
- `pc-dialog`
- `pc-tree-list`

说明：
- `CommonLayoutContainer` 是企业 tree-list 场景的首选骨架名称
- `CommonLayoutContainer` 在真实落地中默认承载左侧树区域
- `pc-layout-main-container` 是部分项目仍在使用的底层实现名或别名，不应覆盖 `CommonLayoutContainer` 规则

当前页面配方：

- `tree-user-crud`
- `basic-list-crud`

## 读取顺序

1. 先读 `component-registry.json`
2. 再读命中组件的 `component-guides/*.md`
3. 命中明确业务场景时，再读对应 `page-recipes/*.json`
4. 如果注册表中存在企业首选名称和本地实现别名，优先按企业首选名称理解，再按别名映射到项目本地代码

## 注释要求

- 生成代码时默认补充中文注释
- 注释重点说明复杂状态、树表联动、分页重置、弹窗提交和兜底分支
- 不写“变量赋值”“调用方法”这类低信息量注释
