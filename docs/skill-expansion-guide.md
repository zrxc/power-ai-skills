# Skill 扩展指南

## 新增一个 skill

1. 先确定 skill 所属分组。
2. 执行脚手架命令。

```bash
node ./scripts/scaffold-skill.mjs your-skill-name ui
```

3. 补齐以下文件：

- `skills/<group>/<skill-name>/SKILL.md`
- `skills/<group>/<skill-name>/agents/openai.yaml`
- `skills/<group>/<skill-name>/skill.meta.json`
- `skills/<group>/<skill-name>/references/templates.md`
- `skills/<group>/<skill-name>/references/rules.md`

4. 执行：

```bash
pnpm ci:check
```

## 命名建议

- 统一使用小写英文加 `-`
- 名称尽量体现页面或能力，例如 `alarm-page`、`route-menu-skill`
- 文本内容默认中文
- 一个 skill 只解决一类稳定问题

## 内容设计建议

- 高频、稳定、可复用场景优先沉淀
- 先提炼项目共性，再抽成 skill
- 复杂业务先拆成多个 skill，再通过 `entry-skill` 组合
- `SKILL.md` 保持短小，参考内容放到 `references/`
- skill 默认要补充有信息量的中文注释要求，尤其是生成代码、脚本和复杂流程类 skill

## 元数据要求

每个 `skill.meta.json` 至少包含：

- `name`
- `displayName`
- `owners`
- `tags`
- `status`
- `compatibility`
- `dependsOn`

其中：

- `status` 只能是 `stable`、`beta`、`deprecated`
- `dependsOn` 中的 skill 必须真实存在

## 新增后的验证清单

- frontmatter 正确
- `agents/openai.yaml` 存在且有 `default_prompt`
- `references/` 不为空
- `skill.meta.json.name` 与目录名一致
- `skill.meta.json` 字段完整并通过治理校验
- 能被 `entry-skill` 正确路由
- 在一个真实消费项目中能指导 AI 完成任务
