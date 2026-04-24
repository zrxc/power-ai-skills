# conversation-miner marked block protocol design 1.1.2

## 背景

`1.1.1` 已经解决了“什么值得收集”的问题，但摘要输入仍然偏手工：用户需要先把 AI 总结整理为独立 `session-summary.json`，再交给 `capture-session`。这一步不适合继续堆 prompt，而应该补一个稳定的协议层。

`1.1.2` 的目标是让 AI 回复文本本身就能成为输入源。只要回复里包含标准摘要块，CLI 就能直接提取、评估并收集，为后续工具级 wrapper 铺路。

## 目标

- 定义稳定的 summary block 协议。
- 支持从普通文本文件和标准输入提取摘要块。
- 保持 `1.1.1` 的 capture gate 不变。
- 给未来的适配层提供机器可消费的命令输出。

## 协议

标准摘要块格式：

```text
<<<POWER_AI_SESSION_SUMMARY_V1
{
  "records": [
    {
      "timestamp": "2026-03-20T09:30:00+08:00",
      "toolUsed": "codex",
      "sceneType": "dialog-form"
    }
  ]
}
>>>
```

兼容形式：

- 摘要块前后允许有普通说明文本。
- 摘要块内部允许包一层 ```` ```json ```` 代码块。
- 只提取第一段合法标记块。

## 命令增强

### evaluate-session-capture

支持三种输入源：

```bash
npx power-ai-skills evaluate-session-capture --input .power-ai/tmp/session-summary.json
npx power-ai-skills evaluate-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
cat assistant-response.txt | npx power-ai-skills evaluate-session-capture --stdin --extract-marked-block
```

### capture-session

同样支持三种输入源：

```bash
npx power-ai-skills capture-session --input .power-ai/tmp/session-summary.json
npx power-ai-skills capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
cat assistant-response.txt | npx power-ai-skills capture-session --stdin --extract-marked-block --json
```

## 新增参数

- `--from-file <path>`
  从 AI 回复文本文件读取输入。
- `--stdin`
  从标准输入读取文本。
- `--extract-marked-block`
  表示输入源不是纯 JSON，而是需要先提取标记摘要块。
- `--save-extracted <path>`
  把提取后的 JSON 另存一份，便于调试或二次处理。
- `--json`
  让 `capture-session` 输出结构化 JSON，适合 wrapper/adapter 消费。

## 处理流程

1. CLI 读取输入源。
2. 如果指定 `--extract-marked-block`，先按协议提取摘要块。
3. 解析为 JSON 后交给 `1.1.1` 的 capture gate。
4. 通过门禁的记录进入 conversations。
5. 如果传了 `--save-extracted`，额外写出提取后的 JSON 文件。

## 与 1.1.1 的关系

`1.1.2` 不改变收集判定逻辑，只改变“摘要怎么进来”：

- `1.1.1` 解决 `should capture`
- `1.1.2` 解决 `how to feed summary into capture`

## 验收标准

- 能从普通 AI 回复文本中提取标记块。
- `evaluate-session-capture` 支持 `--from-file` 和 `--stdin`。
- `capture-session` 支持 `--from-file`、`--stdin` 和 `--json`。
- 标记块前后杂项文本不会污染 conversations。
- `--save-extracted` 会落盘提取后的 JSON。
