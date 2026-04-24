# 1.4.2 Wrapper Promotion Audit Sort

## 目标

在 `1.4.1` 的筛选能力基础上，为 `generate-wrapper-promotion-audit` 增加排序能力，让 audit 结果更适合直接人工处理。

## 命令

```bash
npx power-ai-skills generate-wrapper-promotion-audit --sort tool-name --json
npx power-ai-skills generate-wrapper-promotion-audit --filter ready-for-registration --sort last-event-desc --json
```

## 支持的排序

- `tool-name`
- `last-event-desc`
- `last-event-asc`

## 规则

- `--filter` 先执行，`--sort` 后执行。
- JSON 与 Markdown 报表都会记录 `sort` 字段，便于区分导出的 audit 视图。
- 默认不传 `--sort` 时保持兼容行为。

## 验证

- 增加 audit 排序端到端测试，覆盖 `tool-name` 和 `last-event-desc`。
- 继续复用现有 `generate-wrapper-promotion-audit` 命令和报表输出路径。
