# 项目扫描与 Project Local Skill 设计 1.0.6

> 版本：1.0.6  
> 状态：已实现  
> 主题：Vue SFC AST 化扫描

## 1. 背景

`1.0.5` 已经具备：

- 子模式与质量分
- diff / history
- `manual/` 晋升链路

但扫描核心仍以字符串匹配为主，问题没有根治：

1. 页面骨架和局部组件仍可能因为文本出现而被混淆。
2. `PcTree`、`pc-dialog`、`pc-table-warp` 的上下文关系不够精确。
3. 对 script 部分的判断依旧偏“名字命中”，没有进入结构化解析。

因此 `1.0.6` 的目标非常明确：把项目扫描从“规则驱动文本识别”升级为“Vue SFC AST 驱动识别”。

## 2. 设计目标

`1.0.6` 聚焦三件事：

1. 使用 Vue SFC 解析器拆分 `template` 与 `script/script setup`
2. 使用模板 AST 判断页面级组件结构与上下文关系
3. 使用 script AST 判断变量、函数和静态成员路径

## 3. 新增依赖

为保证 AST 解析稳定，本版本新增运行时依赖：

- `@vue/compiler-sfc`
- `@vue/compiler-dom`
- `@babel/parser`

## 4. 实现结构

新增模块：

```text
src/project-scan/vue-analysis.mjs
```

职责拆分：

- `src/project-scan/vue-analysis.mjs`
  - 负责 SFC 解析
  - 负责 template AST 遍历
  - 负责 script AST 遍历
  - 输出结构化 signal
- `src/project-scan/index.mjs`
  - 保留 pattern 识别、review、diff、history、生成草案与 manual 晋升

## 5. Template AST 识别

模板侧不再通过正则查找标签，而是：

1. 用 `@vue/compiler-sfc` 解析 `.vue`
2. 读取 `descriptor.template.content`
3. 用 `@vue/compiler-dom` 构建 template AST
4. 深度遍历 element / if / for 节点

当前通过 AST 获取的关键信号包括：

- 顶层根节点标签
- 页面级 `PcTree`
- dialog 内部 `PcTree`
- `pc-table-warp`
- `pc-dialog`
- `el-form`
- `el-descriptions`
- `el-tabs`
- 顶层页面容器
- 指令与属性中的只读信号

这意味着：

- `PcTree` 在弹窗里出现，不再等同于页面级树布局
- 页面容器不再靠“字符串是否出现”，而是看根层级元素

## 6. Script AST 识别

脚本侧使用 `@babel/parser` 解析 `script + script setup` 合并后的源码，并收集：

- `Identifier`
- 静态 `MemberExpression` 路径
- `StringLiteral`
- `TemplateElement`

再基于 AST 结果判断：

- `searchForm`
- `handleAdd / handleEdit / handleDelete`
- `formModel / formData`
- `handleSubmit / onSave`
- `handleNodeClick`
- `fetchDetail / getDetail`
- `pageValue / pageNum / pageSize`
- `getList / fetchList / loadList`

## 7. 兼容策略

`1.0.6` 不改变 `1.0.5` 的外部产物契约：

- `patterns.json`
- `pattern-review.json`
- `pattern-diff.json`
- `pattern-history.json`
- `project-scan-summary.md`
- `project-scan-diff.md`
- `project-local/auto-generated`
- `project-local/manual`

也不改变现有命令：

- `scan-project`
- `diff-project-scan`
- `generate-project-local-skills`
- `list-project-local-skills`
- `promote-project-local-skill`

所以这是一次“扫描底座升级”，不是一次“命令契约重写”。

## 8. 验收点

`1.0.6` 至少满足以下验收：

1. AST 解析后现有扫描测试全部通过
2. `PcTree` 在 dialog fragment 中不会污染页面级树模式判断
3. 根页面容器识别来自 template AST，而不是字符串命中
4. script 侧关键信号来自 AST 遍历结果，而不是整段正则
5. `1.0.5` 的 diff / history / promote 链路不回退

## 9. 不在本版本范围

以下能力仍不在 `1.0.6` 中：

- Vue template AST 的语义级数据流推导
- TypeScript 类型信息参与判定
- 跨文件组件引用图分析
- 运行时行为分析

## 10. 结论

`1.0.6` 的核心价值不是“多识别几个关键词”，而是把项目扫描的判定基础从文本层提升到 AST 层。

这为后续版本继续做：

- 更精确的页面骨架识别
- 更细的弹窗/详情/树表组合分析
- 跨项目模式沉淀

提供了一个可靠底座。
