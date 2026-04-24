# 1.3.1 Wrapper Promotion Apply

## 目标

在 `1.3.0` 的 `materialize-wrapper-promotion` 基础上，再补一层真正的源码落地能力，让 wrapper proposal 不再停留在 registration bundle 和 patch 文档。

## 新增命令

```bash
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool
```

约束：

- proposal 必须已存在
- proposal 必须处于 `accepted`
- proposal 必须已经完成 `materialize-wrapper-promotion`
- 当前仓库源码中还不能已经注册同名 wrapper

## 应用范围

`apply-wrapper-promotion` 首版只落核心注册层，不自动补测试和文档。

会写回的目标文件：

- `src/conversation-miner/wrappers.mjs`
- `src/commands/project-commands.mjs`
- `src/commands/index.mjs`
- `src/selection/cli.mjs`
- `src/conversation-miner/index.mjs`（仅 GUI wrapper，需要补 host bridge 生成）

## 实现方式

`materialize-wrapper-promotion` 先生成：

- `wrapper-registration.bundle.json`
- `wrapper-registration.patch.md`

`apply-wrapper-promotion` 再读取 bundle 中的 artifact 片段，并按固定 marker 做幂等插入：

- wrapper registry：在 `supportedCaptureWrappers` 关闭前插入新条目
- project commands：在 `toolCaptureSessionCommand` 前插入专用命令函数
- command runner：在 `tool-capture-session` 前插入新的命令分发
- selection CLI：把新命令加入“保持 cwd”的命令集合
- GUI wrapper：在 `ensureConversationRoots()` 的 host bridge 生成区补充 dedicated host bridge 脚本

如果目标片段已存在，则跳过，不重复写入。

## Proposal 状态扩展

proposal 新增：

- `applicationStatus`
- `appliedAt`
- `appliedFiles`

并同步刷新 proposal README，形成：

`scaffold -> review -> materialize -> apply`

的完整状态链路。

## 测试范围

新增回归：

- accepted + materialized proposal 的 apply 正向链路
- 未 materialize proposal 的 apply 拒绝
- `apply-wrapper-promotion` 的 cwd 解析覆盖

## 边界

`1.3.1` 只自动落核心注册源码，不自动：

- 修改 README / tool-adapters / command manual
- 补充测试样例
- 自动注册到真实发布版本

这些仍然保留在后续人工 review 或更高阶自动化阶段处理。
