# power-ai-skills 部署与接入说明

## 目标

让业务项目通过私有 npm 安装 `@power/power-ai-skills`，并在项目内使用 `.power-ai/` 作为唯一真实 skill 源目录。

## 安装

```bash
pnpm add -D @power/power-ai-skills
```

## 初始化

首次接入直接走团队默认：

```bash
npx power-ai-skills init
```

按工具选择接入：

```bash
npx power-ai-skills init --tool codex --tool trae --tool cursor
```

按 profile 接入：

```bash
npx power-ai-skills init --profile openai
```

## 同步

```bash
npx power-ai-skills sync
```

## 推荐脚本

```json
{
  "scripts": {
    "skills:init": "power-ai-skills init",
    "skills:sync": "power-ai-skills sync"
  }
}
```

## 目录说明

```text
.power-ai/
  skills/
    project-local/
  shared/
  adapters/
  tool-registry.json
  team-defaults.json
  selected-tools.json
```

说明：

- `.power-ai/skills` 是企业公共 skill 的真实源目录
- `.power-ai/skills/project-local` 是项目私有补充
- `.codex`、`.trae`、`.cursor`、`CLAUDE.md` 等只是生成出来的工具入口

## 常用命令

```bash
npx power-ai-skills list-tools
npx power-ai-skills show-defaults
npx power-ai-skills add-tool --tool claude-code
npx power-ai-skills remove-tool --tool trae
npx power-ai-skills doctor
npx power-ai-skills version
```
