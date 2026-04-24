# conversation-miner claude-code wrapper design 1.1.6

## 背景

`1.1.5` 已经证明 wrapper contract 可以在 `codex` 和 `cursor` 之间复用。`1.1.6` 继续把同一套流程扩展到 `claude-code`，让终端类主流入口形成三点验证。

## 目标

- 为 Claude Code 提供与 Codex / Cursor 一致的 capture wrapper。
- 继续验证共享 wrapper 执行逻辑的稳定性。
- 保持 `conversation-miner` 核心只关注 prepare / confirm / capture 原语。

## 命令

```bash
npx power-ai-skills claude-code-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills claude-code-capture-session --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills claude-code-capture-session --stdin --extract-marked-block --reject --json
```

## 行为

- 交互式终端中会直接提示用户确认。
- 非交互式环境必须显式传 `--yes` 或 `--reject`。
- `--json` 输出继续保持 `tool / prepared / resolved / decision` 结构。

## 实现边界

`1.1.6` 仍然只是 CLI wrapper，不是 Claude Code 的原生插件或扩展。它的职责是让后续适配层在“拿到 AI 最终回复文本”之后，可以直接把回复送进同一套收集闭环。

## 验收标准

- `claude-code-capture-session --yes` 能完成 conversations 落盘
- `claude-code-capture-session --reject` 不会写 conversations
- `codex` / `cursor` wrapper 保持可用
- 共享 wrapper 逻辑没有引入回归
