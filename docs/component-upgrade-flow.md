# 组件库升级联动流程

## 目标

当 `@power/runtime-vue3`、`@power/p-components`、`@power/style` 等基础依赖升级时，快速识别受影响的 skill，并推动消费项目完成同步验证。

## 推荐流程

1. 在上游仓库整理变更文件列表。
2. 执行：

```bash
pnpm impact:check -- <changed-files>
```

或：

```bash
pnpm upgrade:automation -- --base <git-base> --head <git-head> --repo <upstream-repo-path> --consumer <project-path>
```

3. 查看 `manifest/impact-report.json`。
4. 如需任务文档，执行：

```bash
pnpm impact:task -- --report manifest/impact-report.json
```

5. 修改受影响的 skill、模板、兼容矩阵或说明文档。
6. 在消费项目执行：

```bash
npx power-ai-skills sync
npx power-ai-skills doctor
```

7. 发布新版本。
