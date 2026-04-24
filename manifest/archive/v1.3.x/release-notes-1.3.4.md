# Release Notes 1.3.4

## 包信息
- 包名：`@power/power-ai-skills`
- 版本：`1.3.4`
- 生成时间：`2026-03-25T07:27:08.134Z`

## Skill 统计

- 总 skill 数量：24
- engineering: 1 个 skill
- foundation: 9 个 skill
- orchestration: 1 个 skill
- ui: 11 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 1.3.4

- `apply-wrapper-promotion` 现在会在 proposal 目录下自动生成 `documentation-scaffolds/README.snippet.md`、`tool-adapters.snippet.md` 和 `command-manual.snippet.md`。
- proposal 新增 `docsGeneratedAt` 与 `docScaffoldFiles`，`followUpStatus` 进一步推进到 `docs-generated`，让“测试样板 + 文档样板”都进入可审阅状态。
- `doctor` 的 wrapper promotion warning 现在会带上当前 `followUpStatus`，方便区分是测试收尾还是文档收尾阶段。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init`、`pnpm exec power-ai-skills show-defaults` 或 `pnpm exec power-ai-skills sync`
