# 项目扫描与 Project Local Skill 设计 1.0.5

> 版本：1.0.5  
> 状态：已实现  
> 范围：`project-scan`、`project-local` 冷启动链路、人工接管链路、扫描差异追踪

## 1. 背景

`1.0.3` 解决了 `project-local` 冷启动为空的问题。  
`1.0.4` 解决了扫描误判过多的问题。  
`1.0.5` 继续往前走，目标不再只是“能扫出来”，而是让扫描结果能够持续演进、被人工接管，并为后续企业级沉淀提供稳定产物。

真实问题主要有四类：

1. 同一个模式下往往混有多种实现变体，只看顶层 pattern 不够。
2. 重跑扫描后缺少历史和 diff，团队无法快速判断变化是否可信。
3. 自动草案和人工确认规则之间没有正式晋升链路。
4. 扫描产物还不够“治理友好”，难以直接服务后续企业沉淀。

## 2. 1.0.5 目标

`1.0.5` 聚焦四件事：

1. 给每个 pattern 增加子模式、交互特征、数据流特征和质量分。
2. 给每次扫描增加 diff 与 history，避免重复扫描成为黑盒。
3. 给 `project-local` 增加 `manual/` 晋升路径。
4. 给 CLI 增加查看、对比、晋升三个管理命令。

## 3. 新增产物

```text
.power-ai/
  analysis/
    project-profile.json
    patterns.json
    pattern-review.json
    pattern-diff.json
    pattern-history.json
  reports/
    project-scan-summary.md
    project-scan-diff.md
  skills/
    project-local/
      auto-generated/
      manual/
```

新增产物含义：

- `pattern-diff.json`：当前扫描与上一次扫描的结构化差异
- `pattern-history.json`：最近扫描快照历史
- `project-scan-diff.md`：面向人工复核的 Markdown diff 摘要
- `project-local/manual/`：人工确认后的项目级 skill

## 4. 模式识别升级

`1.0.5` 继续保留 `1.0.4` 的文件角色分层与页面级识别约束，但在 pattern 结果中新增：

- `dominantSubpattern`
- `subpatterns`
- `sceneType`
- `sceneTypes`
- `interactionTraits`
- `dataFlowTraits`
- `structuralScore`
- `purityScore`
- `reuseScore`
- `entities`
- `sampleFiles`

当前内置子模式示例：

- `basic-list-page`
  - `basic-list-with-dialog`
  - `basic-list-crud`
  - `basic-list-readonly`
- `tree-list-page`
  - `tree-list-with-dialog`
  - `tree-list-basic`
- `dialog-form`
  - `page-dialog-form`
  - `dialog-form-with-table`
  - `fragment-dialog-form`
- `detail-page`
  - `readonly-detail`
  - `detail-with-tabs`
  - `detail-with-related-table`

## 5. 生成门槛升级

`1.0.4` 只有频次和置信度门槛。  
`1.0.5` 扩展为四个门槛：

- `minFrequencyToGenerate = 3`
- `minConfidenceToGenerate = high`
- `minPurityScoreToGenerate = 70`
- `minReuseScoreToGenerate = 68`

这意味着：

- 低频模式继续直接 `skip`
- 高频但混入 fragment 或实现分化过多的模式进入 `review`
- 只有高频、高置信、纯度和复用分也达标时才进入 `generate`

## 6. 扫描差异与历史

每次执行 `scan-project` 都会：

1. 读取上一次的 `patterns.json` 与 `pattern-review.json`
2. 计算模式层 diff
3. 生成 `pattern-diff.json`
4. 生成 `project-scan-diff.md`
5. 把当前快照追加到 `pattern-history.json`

Diff 关注的字段：

- `frequency`
- `confidence`
- `dominantSubpattern`
- `structuralScore`
- `purityScore`
- `reuseScore`
- `decision`

## 7. 人工接管链路

新增命令：

```bash
npx power-ai-skills list-project-local-skills
npx power-ai-skills promote-project-local-skill basic-list-page-project
```

行为约定：

- `list-project-local-skills` 同时列出 `auto-generated` 和 `manual`
- `promote-project-local-skill` 会把指定草案从 `auto-generated` 复制到 `manual`
- 晋升后会更新 `skill.meta.json`

晋升后的元数据变化：

- `status: "active"`
- `source: "manual-promoted"`
- `promotedAt`
- `promotedFrom`

后续重新执行 `generate-project-local-skills --regenerate-project-local` 时，只会重建 `auto-generated`，不会覆盖 `manual`。

## 8. CLI 合同

`1.0.5` 新增命令：

```bash
npx power-ai-skills diff-project-scan
npx power-ai-skills list-project-local-skills
npx power-ai-skills promote-project-local-skill <skill-name>
```

已有命令继续保留：

```bash
npx power-ai-skills scan-project
npx power-ai-skills generate-project-local-skills
npx power-ai-skills generate-project-local-skills --regenerate-project-local
```

## 9. 验收标准

`1.0.5` 至少满足以下验收条件：

1. 扫描后落盘 `pattern-diff.json`、`pattern-history.json` 和 `project-scan-diff.md`
2. `patterns.json` 中可看到 `dominantSubpattern`、质量分和特征字段
3. `list-project-local-skills` 能正确区分 `manual` 与 `auto-generated`
4. `promote-project-local-skill` 能把草案晋升到 `manual`
5. 重跑扫描后 `pattern-history.json` 快照数量增加，`pattern-diff.json` 出现变化记录

## 10. 不在 1.0.5 范围内

以下能力仍不在本版本内：

- Vue AST 级精确语义分析
- 自动把 `manual` 反向回灌为企业公共 skill proposal
- conversation miner 与 project scan 的统一治理后台
- 多项目横向聚合分析

## 11. 结论

`1.0.5` 的定位是把项目扫描从“可用分析器”升级成“可维护、可比对、可人工接管”的项目模式提取系统。

它没有改变 `project-local` 的单一真源设计，而是在现有链路上补齐了三个关键能力：

- 更细的模式表达
- 可审计的扫描演进
- 明确的人工晋升路径
