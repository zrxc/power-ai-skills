---
name: "entry-skill"
description: "作为项目功能入口技能，用于根据自然语言需求识别页面骨架、槽位信息与配套能力，再路由到合适的专项 skill。适用于用户只描述功能目标、未显式点名 skill，或需要先判断主页面类型再补齐配套能力的场景。"
---

# 入口技能

用于接收自然语言需求，先识别“通用骨架 + 槽位 + 增强能力”，再分发到合适的专项 skill。

## 适用场景

- 用户只描述功能，不显式点名 skill
- 用户用口语表达需求，例如“左树右表”“做一个树列表”
- 一个功能需要组合多个专项 skill，例如“列表 + 弹窗 + API + 消息反馈”

## 按需读取的参考文件

- 场景类型：`references/generic-scenario-types.md`
- 别名归一：`references/aliases.md`
- 场景识别：`references/intent-patterns.md`
- 路由规则：`references/routes.md`
- 槽位提取：`references/slot-extraction.md`
- 默认组合：`references/default-combos.md`
- 注释规则：`references/comment-rules.md`
- 常见示例：`references/examples.md`

## 工作方式

1. 先识别页面骨架，不把业务名词直接当成页面类型
2. 再归一化口语表达，例如“左树右表”“左侧部门右侧用户”
3. 根据场景识别结果确定主 skill
4. 再根据操作、权限、表单模式补齐辅助 skill
5. 如命中企业组件场景，额外输出页面配方和组件知识入口
6. 生成代码前，默认要求中文输出和中文注释

## 路由后的附加要求

### 命中 `tree-list-page`

必须同时带出：

- 页面配方：`skills/foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json`
- 组件注册表：`skills/foundation/power-component-library/references/generated/component-registry.json`
- 关键组件 guide：
  - `skills/foundation/power-component-library/references/generated/component-guides/common-layout-container.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-dialog.md`
- 只有在内置树不满足需求时，再读取：
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-tree.md`
- 只有在确认本地没有 `CommonLayoutContainer` 导出时，再读取：
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-layout-main-container.md`

### 命中 `basic-list-page`

必须同时带出：

- 页面配方：`skills/foundation/power-component-library/references/generated/page-recipes/basic-list-crud.json`
- 组件注册表：`skills/foundation/power-component-library/references/generated/component-registry.json`
- 关键组件 guide：
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-container.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
  - `skills/foundation/power-component-library/references/generated/component-guides/pc-dialog.md`

## 输出要求

- 先说主 skill，再说辅助 skill
- 如命中页面 skill，同时说明页面配方和组件知识入口
- 默认中文输出
- 生成代码时默认补充有信息量的中文注释

## 何时切换到其他技能

- 当主页面类型已经明确时，尽快切换到命中的页面或能力 skill，不在入口层停留实现细节
- 当用户已经明确点名某个 skill 时，优先尊重用户指定，而不是重复做入口识别
- 当问题变成组件选型、框架边界或目录归档时，分别切换到对应的 foundation skill

## 注意事项

- 入口 skill 负责识别和路由，不负责承载具体模板细节
- 在没有判断页面形态前，不要直接开始编码
- 用户已显式点名 skill 时，优先尊重用户指定
