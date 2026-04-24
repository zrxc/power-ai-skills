# 1.4.3 Wrapper Promotion Audit Export

## 目标

在 `1.4.2` 的筛选与排序能力基础上，为 `generate-wrapper-promotion-audit` 增加轻量导出能力，让 audit 结果可以直接被人工清单或自动流水线消费。

## 命令

```bash
npx power-ai-skills generate-wrapper-promotion-audit --fields toolName,status --format csv --output .power-ai/reports/wrapper-promotion-audit.export.csv --json
npx power-ai-skills generate-wrapper-promotion-audit --filter ready-for-registration --sort last-event-desc --fields toolName,displayName,registrationStatus,lastEvent --format json --json
```

## 支持项

- `--fields`
- `--format json|md|csv`
- `--output <path>`

## 规则

- 默认 Markdown/JSON audit 主报表仍然会正常生成，保持兼容。
- export 是额外产物，只针对当前筛选和排序后的 proposal 集合。
- `--filter` 先执行，`--sort` 后执行，`--fields` 最后决定导出的列。
- 只传 `--fields` 时，默认按 `json` 导出。
- 若只传 `--format`，默认输出到 `.power-ai/reports/wrapper-promotion-audit.export.<ext>`。
- 若只传 `--output`，会按扩展名推断导出格式，推断失败时默认 `json`。

## 验证

- 增加 `--fields + --format csv + --output` 端到端测试。
- 返回结构新增 `exportFormat`、`exportPath`、`exportFields`、`exportCount`。
