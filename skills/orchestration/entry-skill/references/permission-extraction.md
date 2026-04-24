# 操作权限抽取
## 目标

从自然语言里抽取“页面操作”和“对应权限点”的映射关系，用于自动补齐按钮级权限控制。

## 适用句式

- `支持新增（user_add）、编辑（user_edit）、删除（user_delete）`
- `新增按钮权限是 user_add，编辑按钮权限是 user_edit`
- `删除权限：user_delete`

## 抽取结构

输出为：

- `新增 -> user_add`
- `编辑 -> user_edit`
- `删除 -> user_delete`

## 识别规则

### 括号模式

- `新增（user_add）`
- `编辑(user_edit)`
- `删除（user_delete）`

说明：

- 优先把括号前的中文动作识别为操作名
- 把括号内内容识别为权限标识

### 显式说明模式

- `新增按钮权限是 user_add`
- `编辑权限是 user_edit`
- `删除权限为 user_delete`

### 混合模式

- 一句话里有的用括号，有的单独说明，也要合并成统一映射

## 默认动作映射

- `新增` -> 新建按钮
- `编辑` -> 行编辑按钮
- `删除` -> 行删除按钮
- `查看` / `详情` -> 查看按钮
- `导出` -> 导出按钮
- `导入` -> 导入按钮

## 命中后的默认补充

- 自动补充 `permission-page`
- 同时保留原本页面骨架 skill
- 若页面已有增删改，也继续保留 `dialog-skill`、`api-skill`、`message-skill`

## 示例

输入：

```text
添加一个用户管理列表，字段有用户名、邮箱、手机号、状态，支持新增（user_add）、编辑（user_edit）、删除（user_delete）
```

抽取结果：

- 操作权限映射：
  - 新增 -> user_add
  - 编辑 -> user_edit
  - 删除 -> user_delete

- 自动补充：
  - `permission-page`
