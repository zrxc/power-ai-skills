# conversation-miner codex wrapper design 1.1.4

## 背景

`1.1.3` 已经提供了 `prepare-session-capture` 和 `confirm-session-capture`，但适配层仍然需要自己串联两次命令调用。`1.1.4` 选择先落一个最小可用 wrapper，把这段流程对 `codex` 先收口。

## 目标

- 提供一个单命令入口给 Codex 适配层使用。
- 在交互式终端下直接提示用户确认。
- 在非交互式场景下支持 `--yes` / `--reject` 自动决策。
- 复用 `1.1.1` gate、`1.1.2` marked block 和 `1.1.3` pending capture，不重复实现核心逻辑。

## 命令

```bash
npx power-ai-skills codex-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills codex-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills codex-capture-session --stdin --extract-marked-block --reject --json
```

## 行为

### 交互模式

如果检测到 TTY 且没有显式传 `--yes` / `--reject`：

1. 调用 `prepare-session-capture`
2. 如果 `shouldPrompt: false`，直接返回 `skipped`
3. 如果 `shouldPrompt: true`，在终端中提示用户确认
4. 用户确认后调用 `confirm-session-capture`
5. 用户拒绝后调用 `confirm-session-capture --reject`

### 非交互模式

如果没有 TTY：

- 必须显式传 `--yes` 或 `--reject`
- 否则命令报错，避免 wrapper 在 CI 或后台任务中误收集

## 输出

`--json` 时输出统一结构：

- `tool`
- `prepared`
- `resolved`
- `decision`

其中：

- `decision = skipped`
- `decision = captured`
- `decision = rejected`

## 为什么先做 Codex

Codex 已经是当前仓库内最自然的终端型工具入口，先落 `codex-capture-session` 有两个好处：

- 能验证 wrapper 这套接口设计是否顺手
- 后续 Cursor / Claude Code 可以复用同一套 prepare/confirm contract，仅替换适配层入口

## 验收标准

- `codex-capture-session --yes` 能直接完成会话落盘
- `codex-capture-session --reject` 不会写 conversations
- 非交互场景下若未传 `--yes` / `--reject` 会明确报错
- 继续复用 `.power-ai/pending-captures/` 和已有 capture gate 行为
