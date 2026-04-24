# 消费侧排障指南

面向已经接入 `@power/power-ai-skills` 的业务项目。

目标：
- 快速判断问题出在入口层、同步层还是组件知识层
- 优先用 `doctor` 给出的结果定位问题
- 明确每类问题对应的修复命令

## 推荐排障顺序

1. 先在消费项目根目录执行：

```bash
npx power-ai-skills doctor --format summary
```

2. 看 `Checks` 分组结果：
- `workspace` 失败：`.power-ai` 工作区文件不完整或未同步
- `selection` 失败：当前工具选择元数据缺失，或仍残留旧入口/旧包名
- `entrypoints` 失败：`AGENTS.md`、`.codex/skills`、`.cursor/rules/skills.mdc` 等入口未正确修复
- `knowledge` 失败：组件注册表、组件 guide、页面配方或关键 skill 文件缺失

同时看错误码：
- `PAI-WORKSPACE-*`：工作区同步问题
- `PAI-SELECTION-*`：工具选择元数据问题
- `PAI-ENTRYPOINT-*`：入口链接或复制问题
- `PAI-KNOWLEDGE-*`：组件知识层或关键 skill 文件问题

3. 再看 `Suggestions`：
- 先执行 `doctor` 输出的修复建议
- 修复后重新执行一次 `doctor`

如果需要查看完整错误码对照表，参考：
- `docs/doctor-error-codes.md`

## 高频问题

### 1. 树列表场景命中了 skill，但还是没有按公司组件开发

典型现象：
- 开发结果用了 `el-tree`、`el-table`
- 外层骨架不是企业标准页面骨架
- 树列表页面没有读取组件注册表或页面配方

优先检查：
- `knowledge` 分组是否失败
- `entry-skill exists`
- `tree-list-page skill exists`
- `generated component registry exists`
- `generated tree-user-crud recipe exists`
- `generated pc-tree guide exists`
- `generated pc-table-warp guide exists`
- `generated pc-dialog guide exists`

修复命令：

```bash
npx power-ai-skills sync
npx power-ai-skills doctor --format summary
```

如果还是有问题，再确认消费项目里以下文件是否存在：
- `.power-ai/skills/orchestration/entry-skill/SKILL.md`
- `.power-ai/skills/ui/tree-list-page/SKILL.md`
- `.power-ai/skills/foundation/power-component-library/references/generated/component-registry.json`
- `.power-ai/skills/foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json`

### 2. `doctor` 显示 `knowledge` 失败

说明：
- 组件知识层没有被正确同步到消费项目
- AI 即使命中 skill，也可能因为缺 guide / recipe 而回退到自我理解

优先修复：

```bash
npx power-ai-skills sync
```

如果仍失败，继续检查：
- 当前安装的包版本是否包含 `skills/foundation/power-component-library/references/generated/`
- 是否手动删除了 `.power-ai/skills/foundation/power-component-library/references/generated/` 下的文件

### 3. `doctor` 显示 `entrypoints` 失败

说明：
- 工具入口没有正确落到消费项目
- 例如 `AGENTS.md`、`.codex/skills`、`.cursor/rules/skills.mdc` 未正确链接或复制

优先修复：

```bash
npx power-ai-skills sync
```

如果最近修改过启用工具，再执行：

```bash
npx power-ai-skills init --tool codex --tool cursor
```

把命令里的工具替换成项目实际使用的工具组合。

### 4. `doctor` 显示 `selection` 失败

说明：
- `.power-ai/selected-tools.json` 缺失
- 项目里还有旧包名或旧入口残留

优先修复：

```bash
npx power-ai-skills init --tool codex --tool cursor
```

然后再执行：

```bash
npx power-ai-skills doctor --format summary
```

### 5. `doctor` 显示 `workspace` 失败

说明：
- `.power-ai` 根目录或关键配置文件不完整
- 包括 `tool-registry.json`、`team-defaults.json`、`template-registry.json`

优先修复：

```bash
npx power-ai-skills sync
```

如果失败仍存在，建议重新安装当前版本包后再执行一次 `sync`。

## 典型修复组合

### 场景 A：升级包版本后，AI 仍然按旧规则开发

执行：

```bash
pnpm add -D @power/power-ai-skills@latest
npx power-ai-skills sync
npx power-ai-skills doctor --format summary
```

### 场景 B：更换了工具组合，例如从 `codex` 切到 `codex + cursor`

执行：

```bash
npx power-ai-skills init --tool codex --tool cursor
npx power-ai-skills doctor --format summary
```

### 场景 C：树列表和标准列表都生成不稳定

先检查这两组文件是否存在：
- `.power-ai/skills/foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json`
- `.power-ai/skills/foundation/power-component-library/references/generated/page-recipes/basic-list-crud.json`
- `.power-ai/skills/foundation/power-component-library/references/generated/component-guides/pc-tree.md`
- `.power-ai/skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md`
- `.power-ai/skills/foundation/power-component-library/references/generated/component-guides/pc-dialog.md`
- `.power-ai/skills/foundation/power-component-library/references/generated/component-guides/pc-container.md`

如果缺失，直接执行：

```bash
npx power-ai-skills sync
```

## 什么时候要怀疑不是消费项目问题

如果消费项目已经满足以下条件：
- `doctor` 四个分组全部通过
- `knowledge` 里 recipe / guide / registry 全部存在
- 仍然持续生成错误页面

这时应优先回到本仓库排查：
- 对应 `SKILL.md` 是否约束不够硬
- 页面配方是否缺少关键组合
- 组件 guide 是否缺少最小接法、禁止项和常见反例
- `entry-skill` 是否没有把 recipe 和 guide 一起路由给 AI

## 建议

- 升级包版本后，始终执行一次 `npx power-ai-skills sync`
- 切换工具组合后，始终重新执行一次 `npx power-ai-skills init ...`
- 遇到生成偏差时，先看 `doctor`，不要先靠人工猜测入口或 skill 是否生效
