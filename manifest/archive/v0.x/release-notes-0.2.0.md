# Release Notes 0.2.0

## 包信息

- 包名：`@power/power-ai-skills`
- 版本：`0.2.0`
- 生成时间：`2026-03-11T07:05:44.293Z`

## Skill 统计

- 总 skill 数量：35
- engineering: 4 个 skill
- foundation: 13 个 skill
- orchestration: 1 个 skill
- ui: 15 个 skill
- workflow: 2 个 skill

## Changelog 摘要

## 0.2.0

- 强化 `entry-skill` 的自然语言入口规则，新增 `aliases.md` 和 `comment-rules.md`，支持更多口语化场景识别。
- 重写 `entry-skill` 的骨架识别、槽位抽取、默认组合和示例说明，进一步收敛成“通用骨架 + 槽位 + 增强能力”模式。
- CLI 的 `sync` 默认保留 `.trae/skills/project-local` 和 `.codex/skills/project-local`，降低业务项目维护成本。
- `init --with-overlay` 现在会初始化项目 overlay 目录与说明文件，便于项目私有 skill 落地。
- `doctor` 增加旧包名残留检测，并把 `project-local` 检查改成非阻塞 warning。
- 文档和项目模板补充 overlay 约定、注释规范和消费侧使用方式。

## 发布建议

1. 执行 `pnpm ci:check`
2. 确认 `CHANGELOG.md` 已更新
3. 如涉及基础依赖升级，执行 `pnpm check:dependencies`
4. 发布到私仓
5. 在消费项目执行 `pnpm exec power-ai-skills init` 或 `pnpm exec power-ai-skills sync`
