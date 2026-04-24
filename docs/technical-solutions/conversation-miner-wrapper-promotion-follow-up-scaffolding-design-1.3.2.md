# 1.3.2 Wrapper Promotion Follow-up Scaffolding

## 目标

在 `1.3.1` 的 `apply-wrapper-promotion` 基础上，再补一层“收尾脚手架”，避免 wrapper proposal 在核心源码落地后被误判为已经完全集成。

## 范围

`apply-wrapper-promotion` 在 `1.3.2` 中继续做三件事：

1. 追加最小测试占位
2. 生成 post-apply checklist
3. 把 follow-up 状态写回 proposal 元数据

## 新增 proposal 字段

- `followUpStatus`
- `testsScaffoldedAt`
- `testScaffoldFiles`
- `postApplyChecklistPath`
- `pendingFollowUps`

这些字段用于表达：

- 核心注册源码是否已经落地
- 测试是否已经有最小占位
- 还有哪些人工收尾工作没有完成

## apply 行为增强

当 proposal 已经：

- `accepted`
- `materialized`

时，`apply-wrapper-promotion` 现在会：

### 1. 保持 `1.3.1` 的核心源码应用

- `src/conversation-miner/wrappers.mjs`
- `src/commands/project-commands.mjs`
- `src/commands/index.mjs`
- `src/selection/cli.mjs`
- `src/conversation-miner/index.mjs`（仅 GUI wrapper）

### 2. 为测试文件追加最小占位

- `tests/conversation-miner.test.mjs`
- `tests/selection.test.mjs`

占位形式使用 `test.todo(...)`，保证：

- 不会破坏现有测试
- 后续人工补全时有明确入口
- `doctor` 和 proposal review 可以知道这一步已经被脚手架化

### 3. 生成 checklist

在 proposal 目录下新增：

- `.power-ai/proposals/wrapper-promotions/<tool>/post-apply-checklist.md`

用于列出：

- 测试补齐
- README / tool-adapters 文档复核
- GUI / terminal 真实接入验证
- doctor 复跑

## doctor 提示

`doctor` 不会把这类 proposal 当成失败项，但会在 warning 中提示：

- 哪个 wrapper proposal 已经 `applied`
- 仍有哪些 `pendingFollowUps`

这样可以避免“核心代码已落地”被误解成“wrapper 已完全接入并可发布”。

## 边界

`1.3.2` 仍然不会自动：

- 把 `test.todo` 变成真实端到端测试
- 自动更新 README / tool-adapters 的最终正式说明
- 自动完成 wrapper 发布

这些依然需要人工 review 或后续自动化继续推进。
