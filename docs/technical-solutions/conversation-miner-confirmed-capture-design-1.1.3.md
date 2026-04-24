# conversation-miner confirmed capture design 1.1.3

## 背景

`1.1.1` 解决了 capture gate，`1.1.2` 解决了 AI 回复文本如何进入 capture 流程，但 wrapper 仍然要自己处理“是否值得提示用户”“如何保存待确认结果”“确认后如何自动 capture”这几步。

`1.1.3` 的目标是把这段确认式闭环沉到 CLI 本身，让工具适配层只负责两件事：

1. 把 AI 最终回复交给 `prepare-session-capture`
2. 在用户确认后调用 `confirm-session-capture`

## 目标

- 为 wrapper 提供稳定的两段式确认接口。
- 把待确认状态存到项目内，而不是要求 wrapper 自己持久化。
- 在确认后直接完成会话收集。
- 在拒绝时正确清理待确认请求。

## 核心流程

### Prepare

```bash
npx power-ai-skills prepare-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
```

行为：

- 提取 AI 回复中的 summary block
- 执行 `1.1.1` 的 capture gate
- 如果没有 `ask_capture`，直接返回 `shouldPrompt: false`
- 如果存在 `ask_capture`，生成待确认请求并返回 `requestId`、`promptMessage`、确认/拒绝命令

### Confirm

```bash
npx power-ai-skills confirm-session-capture --request capture_xxx
npx power-ai-skills confirm-session-capture --request capture_xxx --reject
```

行为：

- 确认时：直接将待确认记录写入 `.power-ai/conversations/*.json`
- 拒绝时：删除待确认请求，不写入 conversations

## 新增目录

```text
.power-ai/pending-captures/
```

该目录用于保存 wrapper 还未获得用户确认的请求。每个请求都是独立 JSON 文件，包含：

- `requestId`
- `createdAt`
- `promptMessage`
- `summary`
- `source`
- `askCaptureRecords`

## 命令契约

### prepare-session-capture

输入：

- 支持 `--input`
- 支持 `--from-file`
- 支持 `--stdin`
- 支持 `--extract-marked-block`

输出：

- 默认输出 JSON
- 关键字段：
  - `shouldPrompt`
  - `requestId`
  - `pendingFilePath`
  - `promptMessage`
  - `confirmationCommand`
  - `rejectionCommand`

### confirm-session-capture

输入：

- `--request <id>`
- 可选 `--reject`
- 可选 `--json`

输出：

- `captured` 或 `rejected`
- `recordsAdded`
- `filesTouched`

## 为什么不是 wrapper 自己做

如果让每个 wrapper 自己处理待确认请求，会出现三类问题：

- 各工具状态格式不一致
- 清理逻辑容易漏
- 用户确认后的真正 capture 逻辑会重复实现

因此 `1.1.3` 选择把确认态持久化和确认后 capture 统一沉到 CLI。

## 与 1.1.2 的关系

- `1.1.2` 负责让 AI 回复文本成为合法输入源
- `1.1.3` 负责让 wrapper 获得完整确认闭环

## 验收标准

- `prepare-session-capture` 能返回 `shouldPrompt`
- 有 `ask_capture` 时会生成 `.power-ai/pending-captures/*.json`
- `confirm-session-capture` 确认后会写入 conversations
- `confirm-session-capture --reject` 不会写入 conversations
- 待确认请求在确认或拒绝后会被清理
