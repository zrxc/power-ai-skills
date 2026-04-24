# 1.3.9 Wrapper Promotion Timeline

## Goal

给 wrapper proposal 增加统一的 timeline/history 输出能力，避免状态分散在多个时间字段里难以快速阅读。

## Command

```bash
npx power-ai-skills show-wrapper-promotion-timeline --tool my-new-tool --json
```

## Lookup behavior

- 先查活动 proposal root
- 找不到时自动查 archive root

## Timeline events

timeline 会统一聚合这些事件：

- `scaffolded`
- `reviewed`
- `materialized`
- `applied`
- `finalized`
- `registered`
- `archived`
- `restored`

## Output shape

返回结果会包含：

- `toolName`
- `displayName`
- `archived`
- `promotionRoot`
- 当前各阶段状态摘要
- `timeline[]`

## Why it matters

在 proposal 经过 archive / restore 之后，单看字段已经不够直观。timeline 提供了一个稳定的审计视图，方便继续排查和维护。
