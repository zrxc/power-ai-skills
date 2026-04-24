# conversation-miner cursor wrapper design 1.1.5

## 背景

`1.1.4` 已经用 `codex-capture-session` 验证了 wrapper 方向可行。下一步最自然的是把同一 contract 扩展到第二个工具，确认接口设计不是只对 Codex 成立。

`1.1.5` 选择补 `cursor-capture-session`，并顺手把 wrapper 执行逻辑抽成共享流程。

## 目标

- 为 Cursor 提供和 Codex 一致的 capture wrapper。
- 证明 `prepare -> confirm/reject` contract 具备跨工具复用性。
- 避免后续每加一个工具都复制一整套 wrapper 代码。

## 命令

```bash
npx power-ai-skills cursor-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills cursor-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills cursor-capture-session --stdin --extract-marked-block --reject --json
```

## 行为

- 默认行为与 `codex-capture-session` 一致。
- 在交互式终端中，会直接向用户确认是否收集。
- 在非交互式场景中，必须显式传 `--yes` 或 `--reject`。
- `--json` 输出继续保持 `tool / prepared / resolved / decision` 结构。

## 设计取舍

`1.1.5` 没有继续往 `conversation-miner` 核心里堆更多逻辑，而是把 wrapper 抽象放在命令层：

- `conversation-miner` 继续只负责 prepare / confirm / capture 原语
- wrapper 层只负责“用哪个工具名”和“怎么与用户交互”

这样后续再补 `claude-code` 或其它工具时，主要只是增加一个轻量入口。

## 验收标准

- `cursor-capture-session --yes` 能直接完成收集
- `cursor-capture-session --reject` 不会写 conversations
- Codex wrapper 仍然保持可用
- 共享 wrapper 执行逻辑不会破坏现有 tests
