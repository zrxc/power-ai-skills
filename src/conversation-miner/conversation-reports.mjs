/**
 * 报告生成模块
 * 
 * 职责：
 * - 生成对话挖掘器策略报告和配置
 * - 生成模式治理报告
 * - 生成决策ledger报告
 * 
 * 依赖外部服务：strategy-templates.mjs, pattern-governance.mjs, decision-ledger.mjs
 */
import fs from "node:fs";
import { ensureDir, writeJson } from "../../scripts/shared.mjs";
import { buildConversationMinerStrategyMarkdown, buildConversationMinerStrategyPayload } from "./strategy-templates.mjs";
import { buildConversationPatternGovernanceMarkdown } from "./pattern-governance.mjs";
import { buildConversationDecisionLedgerMarkdown } from "./decision-ledger.mjs";

/**
 * 生成对话挖掘器策略
 * 根据项目类型生成相应的配置和报告
 * 
 * @param {Object} options - 生成选项
 * @param {Function} ensureConversationRoots - 确保目录存在的函数
 * @param {Function} getPaths - 获取路径的函数
 * @param {Function} readConversationMinerConfig - 读取配置的函数
 * @returns {Object} 策略结果
 */
export function generateConversationMinerStrategy({ projectType = "enterprise-vue", dryRun = false }, services) {
  const paths = dryRun ? services.getPaths() : services.ensureConversationRoots();
  if (dryRun) ensureDir(paths.reportsRoot);
  const previousConfig = services.readConversationMinerConfig(paths);
  const payload = buildConversationMinerStrategyPayload({
    projectType,
    generatedAt: new Date().toISOString(),
    previousConfig,
    dryRun
  });

  if (!dryRun) writeJson(paths.configPath, payload.nextConfig);
  writeJson(paths.conversationMinerStrategyJsonPath, payload);
  fs.writeFileSync(paths.conversationMinerStrategyReportPath, buildConversationMinerStrategyMarkdown(payload), "utf8");

  return {
    ...payload,
    configPath: paths.configPath,
    reportPath: paths.conversationMinerStrategyReportPath,
    jsonPath: paths.conversationMinerStrategyJsonPath
  };
}

/**
 * 写入模式治理报告
 * 
 * @param {Object} options - 写入选项
 */
export function writePatternGovernanceReport({ paths, governance, payload }) {
  fs.writeFileSync(
    paths.patternGovernanceReportPath,
    buildConversationPatternGovernanceMarkdown({ projectName: payload.projectName, governance, payload }),
    "utf8"
  );
}
