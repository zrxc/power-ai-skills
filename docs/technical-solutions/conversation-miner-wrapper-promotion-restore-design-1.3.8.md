# 1.3.8 Wrapper Promotion Restore

## Goal

在 wrapper proposal 已经归档之后，提供一个显式恢复动作，把 proposal 移回活动目录，继续进行修订、验证或重新归档。

## Command

```bash
npx power-ai-skills restore-wrapper-promotion --tool my-new-tool --note "resume wrapper iteration"
```

## Preconditions

`restore-wrapper-promotion` 只允许在 proposal 已满足以下条件时执行：

- proposal 位于 `.power-ai/proposals/wrapper-promotions-archive/<tool>/`
- `archiveStatus === "archived"`
- 活动 proposal 目录中不存在同名条目

## Restore effects

执行 restore 后会：

- 将 `archiveStatus` 重新写为 `active`
- 写入 `restoredAt`
- 写入 `restorationNote`
- 在恢复后的活动目录中生成 `restore-record.json`
- 将目录从 archive root 移回活动 proposal root

## Listing behavior

- restore 后 proposal 会重新出现在默认 `list-wrapper-promotions` 结果中
- 已恢复 proposal 仍然保留 `archivedAt` / `archiveNote`，便于审计历史追踪

## State chain

`draft -> accepted -> materialized -> applied -> finalized -> registered -> archived -> active(restored)`
