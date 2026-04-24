# 1.3.5 Wrapper Promotion Finalization

## 目标

在 `1.3.4` 已经具备：

- 核心注册源码
- 测试样板
- 文档样板

之后，补上 wrapper promotion 的最终收尾命令，让 proposal 不再长期停留在 “docs-generated but still pending” 状态。

## 新增命令

```bash
npx power-ai-skills finalize-wrapper-promotion --tool my-new-tool --note "ready for registration"
```

## 前置条件

`finalize-wrapper-promotion` 只允许在 proposal 已满足以下条件时执行：

- `status === accepted`
- `materializationStatus === generated`
- `applicationStatus === applied`
- `followUpStatus === docs-generated`
- `testScaffoldFiles` 存在
- `docScaffoldFiles` 存在

如果任一条件不满足，命令直接拒绝。

## finalize 行为

命令成功后会：

- 把 `followUpStatus` 设置为 `finalized`
- 写入 `finalizedAt`
- 写入 `finalizationNote`
- 清空 `pendingFollowUps`
- 刷新 proposal README

## doctor 行为

`doctor` 对 wrapper promotion 的 warning 规则改为：

- `applicationStatus !== applied`：忽略
- `applicationStatus === applied && followUpStatus !== finalized && pendingFollowUps.length > 0`：给 warning
- `followUpStatus === finalized`：不再给 warning

## 结果

wrapper proposal 状态链路至此闭环：

`draft -> accepted -> materialized -> applied -> tests-generated -> docs-generated -> finalized`

这意味着 proposal 终于有了一个清晰的“完成态”，后续可以据此继续做正式注册、发布或审计流程。
