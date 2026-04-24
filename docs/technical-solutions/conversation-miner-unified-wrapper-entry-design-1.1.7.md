# conversation-miner unified wrapper entry design 1.1.7

## 背景

`1.1.4` 到 `1.1.6` 已经分别落了 `codex`、`cursor`、`claude-code` 三个 wrapper，但外部适配层如果继续直接依赖专用命令名，仍然需要自己维护工具到命令的映射。

`1.1.7` 的目标是补一个统一入口，让集成方既能继续用专用 wrapper，也能改走同一个通用命令。

## 目标

- 提供统一 wrapper 命令 `tool-capture-session --tool <name>`
- 保留现有专用 wrapper，避免破坏兼容性
- 用一份共享的 wrapper 定义驱动命令层和适配文档

## 命令

```bash
npx power-ai-skills tool-capture-session --tool codex --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
npx power-ai-skills tool-capture-session --tool cursor --stdin --extract-marked-block --reject --json
npx power-ai-skills tool-capture-session --tool claude-code --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
```

## 设计

`1.1.7` 新增一个共享 wrapper 注册表，记录：

- `toolName`
- `displayName`
- `commandName`

命令层行为：

- `tool-capture-session --tool <name>` 从注册表解析 wrapper
- 复用已有共享 wrapper 执行逻辑
- 如果工具未注册，直接报错而不是静默降级

## 为什么需要统一入口

如果后续还有更多工具：

- 只靠专用命令，外部适配层必须自己维护映射
- 有统一入口后，适配层可以始终只调用 `tool-capture-session --tool <name>`
- 专用命令仍然保留，便于人工直接调试

## 验收标准

- `tool-capture-session --tool claude-code` 能成功走完整 capture 流
- 不支持的工具会明确报错
- `codex` / `cursor` / `claude-code` 原有专用命令仍然保持可用
- `tool-adapters.md` 能展示统一入口与已支持 wrapper 列表
