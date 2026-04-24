# 1.3.4 Wrapper Promotion Documentation Scaffolds

## 目标

在 `1.3.3` 已经能生成可运行测试样板的基础上，再补一层文档样板生成，让 wrapper proposal 在 apply 之后同时具备：

- 核心注册源码
- 可运行测试样板
- 可审阅文档样板

## 范围

`apply-wrapper-promotion` 继续增强为：

1. 生成 documentation scaffolds
2. 把 proposal 状态推进到 `docs-generated`
3. 让 doctor warning 能显示当前 follow-up 阶段

## 新增文档样板

当 proposal 已经：

- `accepted`
- `materialized`

并执行：

```bash
npx power-ai-skills apply-wrapper-promotion --tool my-new-tool
```

时，除了现有的源码和测试样板外，还会在 proposal 目录下新增：

```text
.power-ai/proposals/wrapper-promotions/<tool>/documentation-scaffolds/README.snippet.md
.power-ai/proposals/wrapper-promotions/<tool>/documentation-scaffolds/tool-adapters.snippet.md
.power-ai/proposals/wrapper-promotions/<tool>/documentation-scaffolds/command-manual.snippet.md
```

这些文件的目标不是直接覆盖正式文档，而是提供“可合并”的最小片段。

## proposal 元数据扩展

proposal 新增：

- `docsGeneratedAt`
- `docScaffoldFiles`

同时 `followUpStatus` 从：

- `tests-generated`

推进到：

- `docs-generated`

表示测试样板和文档样板都已经到位，剩余工作主要是人工 review 与收尾确认。

## doctor warning 调整

`doctor` 仍然不会把这类 wrapper proposal 判为失败，但 warning 会带上：

- `toolName`
- `followUpStatus`
- `pendingFollowUps`

这样可以区分当前 proposal 还处于：

- 测试收尾阶段
- 文档收尾阶段
- 最终 review 阶段

## 边界

`1.3.4` 生成的是文档样板，不会自动：

- 修改 README 正文
- 修改 `docs/tool-adapters.md` 正文
- 修改 `docs/command-manual.md` 正文

这些仍然需要人工 review 后再合并进正式文档。

## 结果

wrapper proposal 流程现在变成：

`scaffold -> review -> materialize -> apply -> tests generated -> docs generated`

这意味着新 wrapper 在 apply 之后，已经不再只停留在代码层，而是拥有了完整的“代码 + 测试 + 文档”收尾样板。 
