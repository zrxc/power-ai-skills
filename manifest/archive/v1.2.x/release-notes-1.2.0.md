# Release Notes 1.2.0

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.2.0`
- 生成时间：`2026-03-23T03:59:29.652Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.2.0

- 新增 auto-capture runtime，补齐 `submit-auto-capture`、`consume-auto-capture-inbox`、`watch-auto-capture-inbox` 三个命令，把“已确认的 marked block”提交、排队、消费并自动写入 `.power-ai/conversations/`。
- `.power-ai/auto-capture/inbox`、`.power-ai/auto-capture/processed`、`.power-ai/auto-capture/failed` 目录现在会随 `init` / `sync` 自动生成，支持后续外层工具适配脚本或后台 watcher 直接复用同一套收集底座。
- 所有 conversation capture 示例脚本新增 `-Auto` 模式，确认后的 AI 回复可以直接走 `submit-auto-capture --consume-now`，不再要求用户手动执行第二条收集命令。
- `doctor` 新增 auto-capture runtime 资产检查，覆盖 runtime example script 与 inbox/processed/failed 目录，补充 `1.2.0` 的会话自动收集链路自检。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
