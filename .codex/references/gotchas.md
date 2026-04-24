# Gotchas

这里只记录高成本、可重复、且不明显的坑。

如果某个问题只是一次性实现细节，或只影响一个局部函数，不要放进这里。

## 1. Applied Draft 可见，不代表 Handoff 已闭环

### 现象

proposal apply 之后，draft 可能已经能在结果或落盘文件里看到，但这不代表后续跟进信息已经足够清晰。

### 风险

如果缺少统一的 handoff metadata，治理视图会出现一种假闭环：

- 大家知道还有 follow-up
- 但不知道谁接、何时看、下一步做什么

### 维护者提醒

凡是涉及 applied draft 展示、doctor、governance summary 或 upgrade summary，都要确认：

- handoff status 是否可见
- owner hint 是否可见
- checklist path 和 next action 是否可见

## 2. Project-Local Candidate 一旦 Materialized，不代表以后不会再变

### 现象

project-local candidate 曾经出现过“只要 materialized 过，就不再参与 refresh”的错误假设。

### 风险

source pattern 后续如果变化，draft 却不再刷新，会导致：

- 生成内容陈旧
- 维护者误以为自动进化正常
- 项目局部经验无法继续回灌

### 维护者提醒

任何涉及 `refresh-project-local-skill-draft`、candidate state 或 auto refresh 的改动，都要检查：

- `materialized` 状态是否仍能参与 refresh
- 内容没变时是否走 no-op / skipped
- 内容变了时是否真的重新落盘

## 3. 落盘结构和 CLI 投影必须同步演进

### 现象

仓库里经常同时存在三层事实：

- 真正落盘到 JSON 或目录里的结构
- manager / loader 读取出来的中间对象
- `list/show/doctor/summary` 面向用户的投影

### 风险

如果只改其中一层，治理视图就会产生误判。最典型的问题包括：

- `list/show` 看不到真正存在的字段
- doctor 判断失真
- summary 给出错误的闭环感

### 维护者提醒

只要涉及结构字段变更，就至少同时检查：

- 落盘文件
- `list/show`
- doctor
- governance summary / upgrade summary

## 4. Roadmap History 不是永久规则仓

### 现象

阶段推进中产生的重要 lesson 很容易只留在 roadmap 或 history 里。

### 风险

如果这些经验没有回灌到 `.codex/`，后续维护者即使看 roadmap，也不一定会在任务开始时命中它。

### 维护者提醒

阶段收口时，如果 lesson 满足“可重复 + 高成本 + 不明显”中的至少 2 条，应考虑同步回灌到：

- `.codex/SKILL.md`
- `.codex/rules/project-rules.md`
- `.codex/references/gotchas.md`
