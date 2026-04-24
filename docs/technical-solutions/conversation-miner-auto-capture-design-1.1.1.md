# conversation-miner auto capture design 1.1.1

## 背景

`1.1.0` 已经提供了 `capture-session`、`analyze-patterns` 和 `generate-project-skill` 三段式能力，但会话摘要仍然需要人工整理并显式录入。直接对每次完成的任务都提示收集，会引入大量噪声：

- 普通问答、闲聊和解释性对话没有沉淀价值。
- 同一类任务可能被重复收集。
- 已经被现有项目级 skill 覆盖的内容继续收集，价值很低。

因此 `1.1.1` 的目标不是“无条件自动收集”，而是引入一层收集门禁，让 conversation-miner 只对值得沉淀的摘要给出 `ask_capture` 决策。

## 目标

- 在 `capture-session` 前增加显式评估步骤。
- 默认跳过无关、未完成、低价值、重复和已覆盖的摘要。
- 为后续“AI 完成后询问用户是否收集”的适配层提供稳定判定接口。
- 保留 `--force` 逃生口，避免门禁阻断人工回填。

## 非目标

- 不在 `1.1.1` 内实现编辑器插件或守护进程。
- 不要求 AI 自动写本地文件。
- 不自动执行 `analyze-patterns` 或 `generate-project-skill`。

## 用户流程

### 默认流程

1. AI 或用户生成 `session-summary.json`。
2. 执行 `evaluate-session-capture` 查看评估结果。
3. 只有返回 `ask_capture` 的记录，才会在默认模式下被 `capture-session` 落盘。
4. 用户后续按需执行 `analyze-patterns` 与 `generate-project-skill`。

### 强制流程

1. AI 或用户生成 `session-summary.json`。
2. 执行 `capture-session --force`。
3. 所有通过基础 schema 校验的记录都会被写入 conversations。

## 决策模型

`1.1.1` 对每条记录输出六类决策之一：

- `skip_irrelevant`
- `skip_incomplete`
- `skip_low_value`
- `skip_duplicate`
- `skip_already_covered`
- `ask_capture`

### 第一层：硬过滤

以下场景直接跳过：

- `sceneType` 明确属于非项目场景，例如 `general-discussion`、`casual-chat`、`explanation-only`。
- 缺失 `userIntent`、`skillsUsed`、`generatedFiles` 等关键字段，且无法证明任务已完成。
- `generatedFiles` 为空且没有可复用 customization。

### 第二层：价值评分

对未被硬过滤的记录做加权评分。默认维度：

- 项目相关性
- 完成度
- 产物存在性
- 可复用性
- 项目特征强度

当评分未达到阈值时，返回 `skip_low_value`。

### 第三层：重复判定

基于以下字段生成稳定指纹：

- `sceneType`
- `skillsUsed`
- `entities`
- `customizations`
- `generatedFiles`

如果当天或历史 conversations 已存在相同指纹，则返回 `skip_duplicate`。

### 第四层：覆盖判定

评估器会扫描：

- `.power-ai/skills/project-local/manual/*/skill.meta.json`
- `.power-ai/skills/project-local/auto-generated/*/skill.meta.json`

如果同类 `sceneType` 的项目级 skill 已覆盖当前记录的关键对象、操作和 customization，且本次没有新增差异，则返回 `skip_already_covered`。

## CLI 设计

### evaluate-session-capture

```bash
npx power-ai-skills evaluate-session-capture --input .power-ai/tmp/session-summary.json
```

职责：

- 读取并校验摘要文件
- 执行价值、重复和覆盖评估
- 输出结构化评估结果
- 写入 `.power-ai/reports/session-capture-evaluation.md`

### capture-session

```bash
npx power-ai-skills capture-session --input .power-ai/tmp/session-summary.json
npx power-ai-skills capture-session --input .power-ai/tmp/session-summary.json --force
```

行为：

- 默认仅写入 `ask_capture` 记录
- `--force` 时绕过门禁，但仍保留基础 schema 校验、脱敏和路径归一化

## 配置文件

`1.1.1` 新增项目级配置文件：

```text
.power-ai/conversation-miner-config.json
```

默认配置关注三类开关：

- `mode`
- `minScore`
- `enableDuplicateSuppression`
- `enableCoverageSuppression`

建议默认值：

```json
{
  "version": "1.1.1",
  "captureGate": {
    "mode": "balanced",
    "minScore": 6,
    "enableDuplicateSuppression": true,
    "enableCoverageSuppression": true
  }
}
```

## 输出与报告

`1.1.1` 继续复用原有会话和模式目录，同时新增：

```text
.power-ai/conversation-miner-config.json
.power-ai/reports/session-capture-evaluation.md
```

评估报告面向人工复核，至少包含：

- 输入文件
- 记录总数
- 各决策分类数量
- 每条记录的决策原因
- 已命中的重复指纹或覆盖 skill

## 与 1.1.0 的兼容性

- `analyze-patterns` 和 `generate-project-skill` 的输入格式不变。
- 已有 `.power-ai/conversations/*.json` 可继续被聚合。
- `capture-session` 的默认行为收紧，但可以通过 `--force` 保持旧流程。

## 验收标准

- 能输出 `evaluate-session-capture` 结果。
- 默认 `capture-session` 只写入 `ask_capture`。
- 能识别无关记录、重复记录和已覆盖记录。
- 能生成 `.power-ai/reports/session-capture-evaluation.md`。
- 保持 `analyze-patterns` 与 `generate-project-skill` 链路可用。
