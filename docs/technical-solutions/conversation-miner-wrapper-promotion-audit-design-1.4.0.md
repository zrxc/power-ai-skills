# 1.4.0 Wrapper Promotion Audit

## Goal

把单条 proposal timeline 能力升级成正式 audit 产物，支持一次性查看所有活动和归档 proposal 的当前状态与审计摘要。

## Command

```bash
npx power-ai-skills generate-wrapper-promotion-audit --json
```

## Outputs

命令会写出两个文件：

- `.power-ai/reports/wrapper-promotion-audit.md`
- `.power-ai/reports/wrapper-promotion-audit.json`

## Summary fields

audit 会输出：

- `total`
- `active`
- `archived`
- `readyForRegistration`
- `registeredActive`
- `pendingFollowUps`
- `draftOrNeedsWork`

## Proposal details

每个 proposal 会带上：

- 当前状态摘要
- `lastEvent`
- `pendingFollowUps`
- `timeline`

## Why it matters

到 `1.4.0` 为止，wrapper promotion 已具备完整状态流。audit 报表负责把这些分散状态汇总成版本级审计视图，方便做批量 review、release checklist 和后续治理。
