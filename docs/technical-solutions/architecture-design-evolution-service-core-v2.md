# Evolution Service Core 模块拆分文档

**日期:** 2026-04-23  
**原始文件:** `src/evolution/service-core.mjs` (805行)  
**拆分后文件:** 4个模块，每个不超过500行

## 📋 拆分概述

将原有的 805 行 `service-core.mjs` 模块拆分为 4 个职责清晰的子模块，提高代码的可维护性和可读性。

## 📁 拆分结果

### 1. `service-core.mjs` (252行)
**职责:** 主入口和协调器

**核心功能:**
- ✅ 路径管理：获取和维护所有进化相关的文件路径
- ✅ 策略加载与同步：加载、验证和同步进化策略
- ✅ 协调逻辑：作为候选项管理器和提案管理器的协调入口
- ✅ 统一 API 导出：提供向后兼容的完整 API 接口

**导入模块:**
- `./evolution-candidate-manager.mjs` - 候选项管理器
- `./evolution-proposal-manager.mjs` - 提案管理器
- `./candidate-utils.mjs` - 候选项工具函数

---

### 2. `evolution-candidate-manager.mjs` (360行)
**职责:** 候选项的生命周期管理

**核心功能:**
- ✅ 候选项的加载和持久化
- ✅ 候选项状态更新
- ✅ 候选项的生成（协调工具函数完成）
- ✅ 进化行动的执行和应用（技能刷新、治理上下文更新等）

**导出方法:**
- `loadEvolutionCandidates()` - 加载候选项和历史
- `loadEvolutionActions()` - 加载行动列表
- `persistEvolutionCandidates()` - 持久化候选项
- `updateEvolutionCandidateStatus()` - 更新候选项状态
- `generateEvolutionCandidates()` - 生成候选项
- `applyEvolutionActions()` - 执行进化行动

---

### 3. `evolution-proposal-manager.mjs` (395行)
**职责:** 提案的完整生命周期管理

**核心功能:**
- ✅ 提案的生成（从候选项转换）
- ✅ 提案的评审（接受、拒绝、归档、重新评审）
- ✅ 提案的应用（执行已接受的提案）
- ✅ 提案列表查询和过滤

**导出方法:**
- `loadEvolutionProposals()` - 加载提案和历史
- `persistEvolutionProposals()` - 持久化提案
- `generateEvolutionProposals()` - 生成提案
- `listEvolutionProposals()` - 列出提案（支持过滤）
- `reviewEvolutionProposal()` - 评审提案
- `applyEvolutionProposal()` - 应用提案
- `buildProposalFromCandidate()` - 从候选项构建提案（内部工具）

---

### 4. `candidate-utils.mjs` (156行)
**职责:** 候选项生成的纯函数工具

**核心功能:**
- ✅ 置信度计算
- ✅ 基于模式分析构建候选项
- ✅ 项目配置调整候选项生成
- ✅ 推荐行动构建

**导出函数:**
- `resolveCandidateConfidence()` - 计算候选项置信度
- `buildPatternCandidates()` - 基于模式构建候选项
- `buildProfileAdjustmentCandidate()` - 构建配置调整候选项
- `buildEvolutionRecommendedActions()` - 构建推荐行动

---

## 🔄 模块依赖关系

```
service-core.mjs (协调器)
  ├── evolution-candidate-manager.mjs (候选项管理)
  │     └── candidate-utils.mjs (工具函数)
  └── evolution-proposal-manager.mjs (提案管理)
        └── candidate-utils.mjs (工具函数 - 通过 loadEvolutionCandidates 间接依赖)
```

---

## ✅ 向后兼容性

### API 完整性
所有原有的公开 API 都通过 `service-core.mjs` 重新导出，确保 `index.mjs` 和其他调用方无需修改：

```javascript
// 原有 API 完整保留
createEvolutionServiceCore()
  ├── getEvolutionPaths
  ├── loadEvolutionPolicy
  ├── syncEvolutionPolicy
  ├── showEvolutionPolicy
  ├── validateEvolutionPolicy
  ├── loadEvolutionCandidates
  ├── loadEvolutionActions
  ├── generateEvolutionCandidates
  ├── applyEvolutionActions
  ├── updateEvolutionCandidateStatus
  ├── loadEvolutionProposals
  ├── generateEvolutionProposals
  ├── listEvolutionProposals
  ├── reviewEvolutionProposal
  ├── applyEvolutionProposal
  ├── resolveCandidateConfidence (新增导出)
  ├── buildPatternCandidates (新增导出)
  ├── buildProfileAdjustmentCandidate (新增导出)
  └── buildEvolutionRecommendedActions (新增导出)
```

### 验证结果
- ✅ `service-core.mjs` 语法检查通过
- ✅ `index.mjs` 语法检查通过
- ✅ 模块加载测试通过
- ✅ 所有导入导出关系正确
- ✅ 未修改其他已存在文件（loader.mjs、candidates.mjs 等）

---

## 🎯 拆分收益

1. **代码可读性**: 每个模块职责单一，代码量控制在 500 行以内
2. **可维护性**: 功能模块化，修改特定功能只需关注对应文件
3. **可测试性**: 工具函数独立为纯函数，易于单元测试
4. **可扩展性**: 新功能可以添加到对应模块而不影响其他部分
5. **向后兼容**: 所有原有 API 完整保留，调用方无需修改

---

## 📝 中文注释说明

每个模块都添加了详细的中文注释，包括：
- 模块职责说明
- 函数功能描述
- 参数和返回值说明
- 关键业务逻辑注释
- 代码分段标记

---

## ⚠️ 注意事项

1. 所有文件都在 `src/evolution/` 目录下，保持原有目录结构
2. 仅修改了 `service-core.mjs`，未修改其他已存在文件
3. 新增 3 个文件：`evolution-candidate-manager.mjs`、`evolution-proposal-manager.mjs`、`candidate-utils.mjs`
4. 所有功能逻辑保持完整，没有遗漏或改变原有行为
