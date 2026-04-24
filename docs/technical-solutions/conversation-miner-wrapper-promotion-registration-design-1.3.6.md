# 1.3.6 Wrapper Promotion Registration

## Goal

在 `scaffold -> review -> materialize -> apply -> finalize` 之后，再补一个正式注册确认动作，让 wrapper proposal 可以从“已收尾”推进到“已正式纳入支持矩阵”。

## Command

```bash
npx power-ai-skills register-wrapper-promotion --tool my-new-tool --note "officially supported"
```

## Preconditions

`register-wrapper-promotion` 只允许在 proposal 已满足以下条件时执行：

- `status === "accepted"`
- `materializationStatus === "generated"`
- `applicationStatus === "applied"`
- `followUpStatus === "finalized"`
- 当前工具已经出现在 capture wrapper registry 中

## Registration effects

执行 register 后会：

- 将 `registrationStatus` 写为 `registered`
- 写入 `registeredAt`
- 写入 `registrationNote`
- 在 proposal 目录下生成 `registration-record.json`
- 刷新 proposal README

## Doctor behavior

- 对 `finalized` 但尚未 register 的 proposal，`doctor` 给出 `ready for registration` warning
- 对已 `registered` 的 proposal，`doctor` 不再继续提示 wrapper promotion warning

## State chain

`draft -> accepted -> materialized -> applied -> finalized -> registered`
