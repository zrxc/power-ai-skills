# 1.4.1 Wrapper Promotion Audit Filters

## Goal

在 `1.4.0` 的全量 audit 报表基础上，再补筛选能力，让批量审计直接产出聚焦视图，而不需要用户自行过滤 JSON。

## Command

```bash
npx power-ai-skills generate-wrapper-promotion-audit --filter ready-for-registration --json
```

## Supported filters

- `active`
- `archived`
- `ready-for-registration`
- `pending-follow-ups`

## Behavior

- filter 会同时作用到 `summary` 和 `proposals`
- Markdown 和 JSON 都会记录当前 `filter`
- 不传 `--filter` 时仍然输出全量报表

## Why it matters

`1.4.0` 解决了“有没有统一 audit 报表”，
`1.4.1` 解决了“怎么直接看到最值得处理的一组 proposal”。
