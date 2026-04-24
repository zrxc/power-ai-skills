# 组件知识库与页面配方实施方案

## 背景

当前 `power-ai-skills` 已经能把用户需求路由到正确的主 skill，但命中 skill 以后，AI 仍然经常会在企业组件的具体使用方式上漂移。根因不是单个页面 skill 写得不够长，而是企业组件知识缺少可被 AI 稳定消费的单一事实源。

在现状下，组件信息分散在 3 个位置：

- `p-components` 源码：包含真实 props、events、slots、expose 和内部组合关系
- `p-components` demo：包含使用示例，但偏展示页，不是最小接入契约
- `power-ai-skills`：包含场景路由和页面骨架 skill，但缺少组件级可执行契约

这会导致 AI 虽然命中了正确 skill，却仍然要靠搜索源码和经验推断完成落地，最终出现：

- 选对了场景，组件没选准
- 组件选对了，接法仍然半猜半写
- 仓库中存在多个相似模式时，被其他旧实现带偏
- skill 里的组件名和真实组件库导出名不一致时，无法闭环验证

## 目标

本方案的目标不是“补几段文档”，而是建立一套可验证、可同步、可被 skill 直接消费的企业组件知识层。

落地后要满足：

- AI 能先确定场景，再确定组件组合，而不是全仓库自由搜索
- 每个被引用的企业组件，都能找到唯一的源码、demo、最小接法和禁用场景
- 页面 skill 不再手写组件使用细节，而是引用“页面配方 + 组件契约”
- 如果 skill 使用了不存在或未登记的组件名，CI 能直接失败

## 结论先行

按这套方案改造后，可以系统性解决“命中 skill 但仍然不会正确使用企业组件”的问题。

它不能保证 AI 永不出错，但能把问题从“规范本身不清楚”收敛成“执行没有遵守明确规范”，并让错误能够被校验脚本识别。

## 总体设计

采用双仓职责分离：

- `p-components` 负责维护组件级单一事实源
- `power-ai-skills` 负责消费这些事实源，并把它们变成 skill 可执行约束

### 职责划分

`p-components`

- 维护组件注册表
- 维护组件最小接入文档
- 维护页面配方
- 维护组件别名和历史名映射
- 维护指向真实源码、demo、类型定义的路径

`power-ai-skills`

- 同步组件注册表和页面配方
- 让 `entry-skill` 和各场景 skill 使用这些结构化知识
- 对 skill 中引用的企业组件做一致性校验
- 在初始化后的消费项目里把这些知识分发到 `.power-ai/`

## 一、组件注册表设计

组件注册表是 AI 读取企业组件的唯一入口。它必须是结构化数据，而不是自然语言散文。

建议源文件放在 `p-components` 仓库，例如：

```text
packages/p-components/powerdoc/ai/
  component-registry.json
  component-guides/
    pc-tree.md
    pc-dialog.md
    pc-table-warp.md
  schemas/
    component-registry.schema.json
```

### 推荐结构

```json
{
  "$schema": "./schemas/component-registry.schema.json",
  "schemaVersion": 1,
  "components": [
    {
      "name": "pc-tree",
      "displayName": "PcTree",
      "aliases": ["PcTree"],
      "category": "tree",
      "priority": 100,
      "sourcePath": "src/components/pc-tree/index.vue",
      "demoPath": "src/views/aa-demo/p-components/pc-components/pc-tree/index.vue",
      "guidePath": "powerdoc/ai/component-guides/pc-tree.md",
      "imports": [
        {
          "from": "@power/p-components",
          "name": "PcTree"
        }
      ],
      "scenarios": [
        "tree-selector",
        "left-tree-filter"
      ],
      "replaces": ["el-tree"],
      "contract": {
        "props": [
          "data",
          "nodeKey",
          "isShowSearch",
          "showAddBtn",
          "showEditBtn",
          "showDeleteBtn"
        ],
        "emits": [
          "handleAddRootNode",
          "handleNodeBtn"
        ],
        "slots": [
          "root-node-btn",
          "node-label",
          "node-label-icon",
          "add-node",
          "edit-node",
          "delete-node"
        ],
        "expose": [
          "treeRef"
        ]
      },
      "antiPatterns": [
        "命中企业树组件场景时直接回退到 el-tree",
        "不声明 nodeKey 就直接渲染树结构"
      ]
    }
  ]
}
```

### 设计要求

- `name` 是稳定主键，用于 skill、recipe、校验脚本统一引用
- `aliases` 用来承接历史命名和大驼峰导出名
- `guidePath` 指向最小接入说明，不要求 AI 直接读完整源码
- `sourcePath`、`demoPath`、`guidePath` 缺一不可
- `antiPatterns` 必须显式存在，用来约束 AI 不要回退到原生组件或旧布局

### 为什么这一步是必要的

当前 `PcTree`、`PcDialog`、`pc-table-warp` 的契约都埋在源码里，见：

- `p-components/src/components/pc-tree/index.vue`
- `p-components/src/components/pc-dialog/index.vue`
- `p-components/src/components/pc-table/index.vue`

没有注册表时，AI 每次都在重新“读源码并猜”。有了注册表后，AI 先读组件契约，再决定是否需要深入源码。

## 二、组件最小接入文档设计

每个高频组件都要配一份固定格式的最小接入文档，而不是只保留 demo。

建议目录：

```text
packages/p-components/powerdoc/ai/component-guides/
  pc-tree.md
  pc-dialog.md
  pc-table-warp.md
  pc-tree-list.md
```

### 每份 guide 的固定结构

1. 组件用途
2. 何时优先使用
3. 何时不要使用
4. 最小可运行示例
5. 关键 props
6. 关键 emits
7. 关键 slots
8. 常见误用
9. 关联 demo
10. 关联源码

### 约束

- 不写泛泛介绍
- 不堆完整源码
- 每个字段都要围绕“AI 如何正确接入”来写
- 常见误用必须明确，例如：
  - “命中树表场景时不要直接用 `el-tree`”
  - “需要统一页头、搜索、表格能力时优先 `pc-table-warp`，不要自己拼装 `el-table + el-pagination`”

## 三、页面配方设计

页面配方解决的不是“某个组件怎么用”，而是“某类业务场景该用哪组组件组合”。

建议同样把单一事实源放在 `p-components` 仓库：

```text
packages/p-components/powerdoc/ai/page-recipes/
  tree-user-crud.json
  basic-list-crud.json
  dialog-form-crud.json
  detail-with-subtable.json
  README.md
  schemas/
    page-recipe.schema.json
```

### 推荐结构

```json
{
  "$schema": "./schemas/page-recipe.schema.json",
  "name": "tree-user-crud",
  "displayName": "部门树 + 用户 CRUD",
  "intents": [
    "树列表",
    "左树右表",
    "左侧部门右侧用户",
    "点击部门显示用户",
    "部门用户管理"
  ],
  "primarySkill": "tree-list-page",
  "secondarySkills": [
    "dialog-skill",
    "api-skill",
    "message-skill",
    "form-skill"
  ],
  "componentStack": {
    "page": "common-layout-container",
    "tree": "pc-tree",
    "table": "pc-table-warp",
    "dialog": "pc-dialog"
  },
  "dataContracts": {
    "treeNodeRequiredFields": ["id", "label", "children"],
    "listQueryRequiredFields": ["departmentId", "pageNum", "pageSize"]
  },
  "interactionContracts": [
    "点击树节点后重置 pageNum 为 1",
    "点击树节点后刷新右侧列表",
    "新增编辑删除成功后刷新当前节点下列表"
  ],
  "prohibitedPatterns": [
    "el-tree",
    "el-table",
    "pc-layout-page-common",
    "自定义左右分栏骨架"
  ],
  "validationAssertions": [
    "页面骨架必须包含 CommonLayoutContainer 或其登记别名",
    "右侧表格必须包含 pc-table-warp",
    "未命中例外条件时不得出现 el-tree"
  ]
}
```

### 页面配方的意义

它让 AI 不再只拿到一个模糊的 skill 名，而是直接拿到：

- 这类场景应该使用的标准组件组合
- 数据结构最低要求
- 事件联动最低要求
- 明确禁止的实现方式

## 四、历史名与真实组件名映射

这是当前最需要立即治理的问题。

你当前 skill 中使用的 `CommonLayoutContainer`，在提供的 `p-components` 代码里没有直接搜到。这意味着至少存在下面三种情况之一：

1. 它是另一个仓库的组件
2. 它是历史名，真实组件已经改名
3. 它是业务层别名，而不是组件库导出名

这件事如果不先收口，后面所有 skill 都会持续漂。

建议在组件注册表中增加别名映射层：

```json
{
  "name": "common-layout-container",
  "displayName": "CommonLayoutContainer",
  "aliases": [
    "CommonLayoutContainer",
    "PcLayoutMainContainer"
  ],
  "resolution": {
    "kind": "alias",
    "targetComponent": "pc-layout-main-container"
  }
}
```

如果它不是 `p-components` 内的组件，而是来自其他企业仓库，也必须在注册表中登记真实来源，不能继续让 skill 里直接写一个无法溯源的名字。

## 五、`power-ai-skills` 侧改造点

建议新增一层“企业组件知识”同步和校验能力。

### 新增目录

```text
config/
  component-knowledge-source.json

skills/foundation/power-component-library/references/generated/
  component-registry.json
  page-recipes/
    tree-user-crud.json
  component-guides/
    pc-tree.md
    pc-dialog.md
    pc-table-warp.md

scripts/
  sync-component-knowledge.mjs
  check-component-knowledge.mjs
```

### 具体职责

`sync-component-knowledge.mjs`

- 从 `p-components` 复制或拉取组件注册表、配方和 guide
- 生成 `power-ai-skills` 内部可引用副本

`check-component-knowledge.mjs`

- 校验每个 skill 中引用的企业组件都能在注册表找到
- 校验每个 recipe 中声明的组件都存在
- 校验别名最终都能解析到真实组件

### Skill 改造要求

`entry-skill`

- 不再只路由到 `tree-list-page`
- 路由后应能附带 `pageRecipe = tree-user-crud`

`tree-list-page`

- 不再手写大量组件说明
- 改为直接引用：
  - `generated/page-recipes/tree-user-crud.json`
  - `generated/component-guides/pc-tree.md`
  - `generated/component-guides/pc-table-warp.md`

这样技能文档会从“自己描述组件”变成“绑定到组件知识和页面配方”。

## 六、`p-components` 侧改造点

这是主战场。

### 建议新增目录

```text
packages/p-components/
  powerdoc/
    ai/
      component-registry.json
      page-recipes/
      component-guides/
      schemas/
  scripts/
    generate-component-registry.mjs
    check-ai-docs.mjs
```

### 推荐实施方式

第一批先手工维护高频组件，不追求一开始就全自动生成。

优先组件：

- `PcTree`
- `PcDialog`
- `pc-table-warp`
- `PcContainer`
- `PcTreeList`
- 常用表单组件

等结构跑通以后，再补自动抽取脚本：

- 从源码抽取 props / emits / expose
- 从 demo 提取示例路径
- 从导出入口校验 import name

## 七、落地步骤

### 第一阶段：收口命名与事实源

目标：先解决“skill 名字和真实组件库不一致”的问题。

- 确认 `CommonLayoutContainer` 的真实来源
- 建立组件别名映射
- 先登记 top 10 高频组件

验收标准：

- 所有高频 skill 中出现的组件名，都能在注册表解析到真实来源

### 第二阶段：补组件 guide

目标：让 AI 不再直接从源码猜最小接法。

- 为 top 10 高频组件补最小接入 guide
- 为每个组件绑定唯一 demo 和源码

验收标准：

- AI 读取 guide 即可完成最小接入，不依赖全仓搜索

### 第三阶段：补页面配方

目标：把场景路由和组件组合闭合。

- 先补 4 个高频配方：
  - 树表 CRUD
  - 标准列表 CRUD
  - 弹窗表单 CRUD
  - 详情 + 子表

验收标准：

- `entry-skill` 命中场景后，能给出明确组件栈和禁止项

### 第四阶段：接入 `power-ai-skills`

目标：让 skill 开始真正消费这些结构化知识。

- 同步 `component-registry`
- 同步 `page-recipes`
- 修改 `tree-list-page`、`basic-list-page`、`dialog-skill`
- 增加组件引用校验

验收标准：

- skill 中引用企业组件时，不再允许直接写未登记名字

## 八、风险与边界

### 风险

- 如果 `p-components` 内部本身就存在多套重叠组件，但没有产品级标准，这套方案只能把混乱显性化，不能替你做产品决策
- 如果历史别名很多，第一阶段会暴露大量旧债
- 如果组件 guide 和真实源码不同步，注册表反而会制造新的错误源

### 边界

- 本方案不负责重写组件库
- 本方案不负责替代完整组件文档站
- 本方案只聚焦“AI 开发时如何稳定选型和落地”

## 九、这套方案是否能解决当前问题

可以，但前提是按完整方案执行，而不是只补一两段自然语言描述。

它能解决的核心问题有：

- skill 命中后仍不会正确选企业组件
- 组件名、别名、真实源码之间不一致
- 同类组件和旧模式把 AI 带偏
- 企业组件契约只能靠读源码猜

它不能单独解决的问题有：

- 企业组件本身设计混乱
- 业务团队内部对标准组件选型没有统一结论

所以实施顺序必须是：

1. 先收口企业组件命名和来源
2. 再建立组件注册表
3. 再建立页面配方
4. 最后让 skill 全面消费这些结构化知识

## 十、建议的首批改造范围

建议不要一上来全量铺开，先做一条能闭环验证的主链路：

- 场景：部门树 + 用户 CRUD
- 主 skill：`tree-list-page`
- 组件：`PcTree` / `pc-table-warp` / `PcDialog`

只要这一条跑通，就能验证三件事：

- 结构化组件知识是否足够让 AI 正确实现
- 页面配方是否足够约束场景落地
- `power-ai-skills` 和 `p-components` 的职责划分是否合理

这条链路验证通过后，再复制到列表页、弹窗表单、详情页。
