---
name: "power-ai-skills-codex"
description: "在修改 power-ai-skills 的 CLI、治理、演进、conversation-miner、维护者文档、技术方案或公共 skill 路由说明时使用；当任务涉及仓库维护规则、跨模块边界或文档治理时应激活本 skill。"
---

# Power AI Skills Maintainer Router

本 skill 只负责把维护者路由到正确的规则与参考文档，不承载整套细则。

## Always Read

- `./rules/project-rules.md`
- `./workflows/update-rules.md`

如果任务涉及阶段经验、历史坑点或方案审核，再补读：

- `./references/gotchas.md`

## Common Tasks

### 改 CLI、输出、schema、治理摘要

先读：

- `./rules/project-rules.md`
- `./references/gotchas.md`

再按需要进入仓库文档：

- `docs/command-manual.md`
- `docs/upgrade-roadmap.md`
- `docs/upgrade-roadmap-history.md`

### 改 evolution、proposal、project-local 自动进化、conversation-miner

先读：

- `./rules/project-rules.md`
- `./references/gotchas.md`
- `./workflows/update-rules.md`

重点确认：

- 不要模糊落盘结构和 CLI 投影的边界
- 不要默认扩张自动注册、自动发版、自动 promotion

### 改技术方案、审核 adoption、沉淀维护规则

先读：

- `./rules/project-rules.md`
- `./workflows/update-rules.md`
- `./references/gotchas.md`

要求：

- 先写适用对象
- 再写边界和非目标
- 最后写落地步骤与验收

### 改公共 skill 文档、用途说明或路由描述

先读：

- `./rules/project-rules.md`
- `./references/gotchas.md`

重点确认：

- `description` 更像触发条件，而不是摘要
- 不把维护者内部规则写进公开 skill 树

## Gotcha Preview

- applied draft 如果可见但没有清晰 handoff，治理视图会出现“知道要跟进，但不知道谁来收”的假闭环
- project-local candidate 一旦 materialized 后仍可能继续 refresh，不能默认“落过盘就不再变”
- 落盘 JSON 和 CLI `list/show` 投影如果不一致，后续 doctor 和 summary 会产生误判

## Boundaries

- `skills/` 是对外分发资产，不是维护者规则目录
- `.codex/` 是维护者规则层，不映射到消费项目运行时结构
- `.power-ai/` 是消费项目的真实源目录语义，不要和仓库内维护文档混用
- 自动注册、自动发版、自动 promotion 默认是高风险边界，没有明确阶段目标时不要碰
