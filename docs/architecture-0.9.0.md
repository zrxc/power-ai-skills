# 0.9.0 顶层设计方案

## 背景

`power-ai-skills` 目前已经从单纯的 skill 仓库演进成一个同时负责：

- skill 治理
- 工具注册
- 模板渲染
- 项目初始化
- 入口适配
- 消费项目自检
- 升级自动化

的复合型工程。

当前版本已经具备可用性，但核心逻辑仍然集中在 `bin/power-ai-skills.mjs`，配置、模板、文档和命令之间的职责边界还不够清晰。随着工具数量、规则数量和模板渲染能力继续增加，后续迭代成本会快速上升。

`0.9.0` 的目标不是重写一套新系统，而是在保持现有外部行为基本稳定的前提下，完成一次“可扩展、可治理、可验证”的架构收口。

## 设计目标

### 目标

- 把 CLI 从单文件脚本拆分成清晰的领域模块
- 把配置、模板、渲染、入口适配、诊断、自检分层
- 让 `tool-registry.json` 成为工具元数据和读取优先级的单一事实来源
- 引入显式模板绑定关系，避免通过 `entrypoint.source` 反推模板归属
- 建立最小可持续测试体系，覆盖选择展开、模板渲染、消费侧 smoke
- 为后续新增工具、新增模板、新增命令保留稳定扩展点

### 非目标

- 不在 `0.9.0` 强制迁移到 TypeScript
- 不重写现有 skill 目录结构
- 不改变消费项目 `.power-ai/` 的核心目录协议
- 不在本次设计内引入远程配置中心或服务端平台

## 当前问题

### 1. CLI 逻辑过度集中

当前 `bin/power-ai-skills.mjs` 同时承担参数解析、selection 展开、模板渲染、文件同步、入口清理、doctor 输出和命令分发，后续任何改动都容易引起连锁回归。

### 2. 模板绑定关系是隐式的

当前模板渲染通过 `entrypoints.source` 反查归属工具。这种做法在“一个模板被多个工具复用”或“模板需要渲染但不属于入口文件”时不稳定。

### 3. 配置、模板、文档存在二次表达

虽然 `0.8.2` 已把读取优先级收敛到 `tool-registry.json`，但文档侧仍有手写描述，后续容易出现配置与文档漂移。

### 4. 缺少真正的回归测试分层

现有校验主要依赖：

- 配置治理校验
- 文档校验
- skill 结构校验
- 人工执行消费侧 smoke

但缺少面向核心领域模型的自动化测试。

### 5. 仓库内部缺少显式架构边界

当前 `scripts/` 既包含纯工具函数，也包含发布脚本、升级自动化、校验脚本和消费验证脚本，领域混杂。

## 目标架构

### 分层原则

按“配置层 -> 领域层 -> 渲染/文件层 -> 命令层 -> 验证层”拆分。

### 目标目录结构

```text
bin/
  power-ai-skills.mjs

src/
  registry/
    tool-registry.mjs
    team-defaults.mjs
    template-registry.mjs
    schema.mjs
  selection/
    parse-cli-args.mjs
    resolve-selection.mjs
    resolve-presets.mjs
    infer-legacy-tools.mjs
  rendering/
    template-engine.mjs
    render-instructions.mjs
    render-managed-template.mjs
  workspace/
    power-ai-paths.mjs
    sync-skills.mjs
    write-single-source-files.mjs
    apply-entrypoints.mjs
    cleanup-entrypoints.mjs
  doctor/
    collect-entrypoint-state.mjs
    doctor-report.mjs
  commands/
    init-command.mjs
    sync-command.mjs
    add-tool-command.mjs
    remove-tool-command.mjs
    doctor-command.mjs
    list-tools-command.mjs
    show-defaults-command.mjs
    version-command.mjs
  shared/
    fs.mjs
    output.mjs
    text.mjs

scripts/
  check-tooling-config.mjs
  check-docs.mjs
  validate-skills.mjs
  verify-consumer.mjs
  ...

config/
  tool-registry.json
  team-defaults.json
  template-registry.json
```

## 配置模型

### 1. `tool-registry.json`

职责：

- 定义工具元数据
- 定义工具依赖
- 定义 entrypoints
- 定义 instruction loading 规则
- 定义共享执行流程

保留现有字段，并继续承担工具事实源角色。

建议结构：

```json
{
  "schemaVersion": 3,
  "instructionRendering": {
    "sharedExecutionFlow": []
  },
  "tools": [
    {
      "name": "cursor",
      "displayName": "Cursor",
      "dependsOn": ["agents-md"],
      "entrypoints": [],
      "instructionLoading": {
        "roleLabel": "Cursor",
        "primarySourceType": "file",
        "primarySources": [".cursor/rules/skills.mdc"],
        "supplementalSources": ["AGENTS.md"],
        "routingPath": ".power-ai/skills/orchestration/entry-skill/",
        "projectLocalPath": ".power-ai/skills/project-local/",
        "conflictPriority": [
          "`skills.mdc`",
          "`AGENTS.md`",
          "`project-local`",
          "企业公共 skill"
        ]
      }
    }
  ]
}
```

### 2. `team-defaults.json`

职责：

- 维护团队推荐的 preset
- 定义默认选择
- 支撑 `init` 的默认行为

`0.9.0` 不建议继续扩张职责，保持只描述“团队默认选择”，不要引入模板或文档规则。

### 3. 新增 `template-registry.json`

职责：

- 显式描述模板与工具、输出路径、占位符的绑定关系
- 让渲染行为不再依赖 `entrypoint.source` 的隐式推断

建议结构：

```json
{
  "schemaVersion": 1,
  "templates": [
    {
      "name": "shared-agents",
      "source": "templates/project/shared/AGENTS.md",
      "output": ".power-ai/shared/AGENTS.md",
      "ownerTool": "agents-md",
      "placeholders": [
        "POWER_AI_EXECUTION_FLOW",
        "POWER_AI_READ_PRIORITY"
      ]
    },
    {
      "name": "cursor-rules",
      "source": "templates/project/adapters/cursor/skills.mdc",
      "output": ".power-ai/adapters/cursor/skills.mdc",
      "ownerTool": "cursor",
      "placeholders": [
        "POWER_AI_EXECUTION_FLOW",
        "POWER_AI_READ_PRIORITY"
      ]
    }
  ]
}
```

### 4. `selected-tools.json`

职责保持不变：

- 记录消费项目当前实际选择
- 记录 expanded tools
- 记录来源和更新时间

`0.9.0` 仅建议增加可选的调试字段，不建议再把更多规则塞进去。

## 模块边界

### `registry`

输入：

- `config/tool-registry.json`
- `config/team-defaults.json`
- `config/template-registry.json`

输出：

- 经过校验的 registry 对象
- 各类 map/index

边界规则：

- 不做文件生成
- 不做 CLI 参数解析
- 不做业务流程拼装

### `selection`

输入：

- CLI 参数
- registry
- 项目已有 `selected-tools.json`
- legacy 入口探测结果

输出：

- `SelectionResult`

建议数据结构：

```ts
interface SelectionResult {
  mode: "explicit" | "existing" | "legacy" | "team-default" | "interactive";
  selectedPresets: string[];
  selectedProfiles: string[];
  selectedTools: string[];
  expandedTools: string[];
  sourceDescription?: string;
}
```

### `rendering`

输入：

- 模板文件内容
- `tool-registry`
- `template-registry`

输出：

- 渲染后的模板文本

边界规则：

- 只负责文本生成
- 不直接写文件
- 不感知当前命令类型

### `workspace`

输入：

- `SelectionResult`
- 渲染产物
- 项目根目录

输出：

- `.power-ai/*`
- 链接或复制后的工具入口

边界规则：

- 只做文件系统写入和链接清理
- 不做业务规则拼接

### `doctor`

输入：

- registry
- workspace 实际状态
- selection 状态

输出：

- 结构化健康报告

### `commands`

输入：

- CLI 参数

输出：

- 调用对应领域模块
- 产生命令输出

边界规则：

- 命令层不直接操作配置细节和模板渲染细节

## 核心执行链路

### `init`

```text
parse args
  -> load registry
  -> resolve selection
  -> sync single source skills
  -> render templates
  -> write .power-ai files
  -> apply tool entrypoints
  -> output summary
```

### `sync`

```text
load registry
  -> load selected-tools.json
  -> sync single source skills
  -> render templates
  -> write .power-ai files
  -> apply tool entrypoints
```

### `doctor`

```text
load registry
  -> inspect workspace
  -> inspect selected entrypoints
  -> inspect manifest / docs / legacy references
  -> build structured report
  -> emit json / summary / markdown
```

## 测试与验证设计

### 单元测试

最小覆盖目标：

- `selection`: preset/profile/tool 展开
- `selection`: legacy 推断
- `rendering`: 执行流程和读取优先级渲染
- `doctor`: entrypoint state 判定

建议引入：

- Node 内置 test runner，或 Vitest

### 集成测试

至少准备 3 类样板项目：

1. 默认接入项目
2. 多工具接入项目
3. 旧目录迁移项目

每次发版前执行：

- `init`
- `sync`
- `doctor`

### 发布前门禁

建议把 `release:prepare` 升级为：

```bash
pnpm ci:check
pnpm release:notes
pnpm verify:consumer -- <fixture-projects>
```

## 迁移步骤

### 阶段 1：结构拆分，不改行为

目标：

- 把 `bin/power-ai-skills.mjs` 中的 selection、render、workspace、doctor 拆分到 `src/`
- 保持 CLI 命令和输出兼容

产出：

- 新模块目录
- CLI 主入口只做 command dispatch

### 阶段 2：模板绑定显式化

目标：

- 新增 `config/template-registry.json`
- 去掉模板归属的隐式推断

产出：

- `renderManagedTemplate` 改为读取 `template-registry`
- 校验脚本新增 template registry 校验

### 阶段 3：测试补齐

目标：

- 为 selection / rendering / doctor 建立可执行测试
- 将 smoke fixture 纳入 `verify-consumer`

产出：

- `tests/` 目录
- CI 中新增测试步骤

### 阶段 4：文档生成化

目标：

- 把工具读取优先级文档从手写改为自动生成
- README 只保留索引和入口说明

产出：

- 文档生成脚本
- 减少重复描述

### 阶段 5：收尾发布

目标：

- 清理临时目录和历史产物管理策略
- 发布 `0.9.0`

产出：

- 完整 changelog
- 新版 release notes
- 迁移说明

## 风险与控制

### 风险 1：拆分模块后命令行为漂移

控制：

- 阶段 1 不改 CLI 输出协议
- 用 fixture 项目跑 `init/sync/doctor`

### 风险 2：模板 registry 引入后旧模板渲染失效

控制：

- 在迁移期同时保留旧逻辑和新 registry 校验
- 所有模板先在本仓库内做一次全量渲染自检

### 风险 3：文档生成化后人工难以快速改文案

控制：

- 生成模板仍保留 markdown 源文件
- 只把重复段落配置化，不把所有文档机械生成

## 建议里程碑

### 0.8.x 收尾

- 保持现有功能稳定
- 只接收低风险修复

### 0.9.0-alpha

- 完成模块拆分
- 引入 `template-registry.json`

### 0.9.0-beta

- 完成测试接入
- 完成消费项目 smoke fixture

### 0.9.0

- 发布正式版
- 输出迁移说明
- 更新治理文档和发布流程

## 最终结论

`0.9.0` 的核心不是“再加功能”，而是建立一套清晰边界：

- 配置只描述事实
- 模板只描述结构
- 渲染只负责文本生成
- workspace 只负责文件落盘
- command 只负责流程编排
- 验证体系独立提供回归保障

只有完成这次收口，后续新增工具、扩展模板协议、增强 doctor 和升级自动化时，项目才不会继续沿着“单文件堆逻辑”的方向失控。
