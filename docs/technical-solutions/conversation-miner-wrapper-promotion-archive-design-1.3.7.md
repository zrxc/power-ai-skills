# 1.3.7 Wrapper Promotion Archive

## Goal

在 wrapper proposal 完成 `register` 之后，把它从活动 proposal 目录中移出，避免活动队列长期堆积已完成条目，同时保留完整审计记录。

## Commands

```bash
npx power-ai-skills archive-wrapper-promotion --tool my-new-tool --note "archived after official registration"
npx power-ai-skills list-wrapper-promotions --archived --json
```

## Preconditions

`archive-wrapper-promotion` 只允许在 proposal 已满足以下条件时执行：

- `registrationStatus === "registered"`
- `archiveStatus !== "archived"`

## Archive effects

执行 archive 后会：

- 将 `archiveStatus` 写为 `archived`
- 写入 `archivedAt`
- 写入 `archiveNote`
- 在 proposal 目录下生成 `archive-record.json`
- 将整个 proposal 目录移动到 `.power-ai/proposals/wrapper-promotions-archive/<tool>/`

## Listing behavior

- `list-wrapper-promotions` 默认只返回活动 proposal
- 传入 `--archived` 后，会一并返回归档 proposal，并带上 `archived: true`

## Doctor behavior

`doctor` 继续只检查活动 proposal 目录，不再扫描归档 proposal。

## State chain

`draft -> accepted -> materialized -> applied -> finalized -> registered -> archived`
