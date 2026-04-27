/**
 * Upgrade Summary Service 模块
 * 
 * 负责：
 * - 收集各个升级相关模块的信息
 * - 生成升级汇总报告和 Markdown 文档
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../shared/fs.mjs";
import {
  collectProjectScanSection,
  collectConversationSection,
  collectPromotionTraceSection,
  collectGovernanceContextSection,
  collectWrapperPromotionSection,
  collectReleaseSection
} from "./collectors.mjs";
import { buildUpgradeSummaryMarkdown, buildRecommendedActions } from "./markdown.mjs";

/**
 * 解析升级摘要路径
 */
function getReleaseManifestDir(context) {
  return path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(context.packageRoot, "manifest"));
}

function resolveUpgradeSummaryPaths({ context, workspaceService, packageMaintenance }) {
  if (packageMaintenance) {
    const manifestRoot = getReleaseManifestDir(context);
    return {
      reportPath: path.join(manifestRoot, "upgrade-summary.md"),
      jsonPath: path.join(manifestRoot, "upgrade-summary.json")
    };
  }

  const reportsRoot = workspaceService.getReportsRoot();
  return {
    reportPath: path.join(reportsRoot, "upgrade-summary.md"),
    jsonPath: path.join(reportsRoot, "upgrade-summary.json")
  };
}

/**
 * 创建升级汇总服务
 */
export function createUpgradeSummaryService({
  context,
  projectRoot,
  workspaceService,
  doctorService,
  projectScanService,
  conversationMinerService,
  promotionTraceService,
  governanceContextService
}) {
  
  /**
   * 生成升级汇总报告
   */
  function generateUpgradeSummary() {
    const doctorReport = doctorService.collectDoctorReport();
    const packageMaintenance = doctorReport.mode === "package-maintenance";
    
    // 收集各个升级模块的信息
    const projectScan = collectProjectScanSection(projectRoot, projectScanService);
    const conversation = collectConversationSection(conversationMinerService);
    const promotionTrace = collectPromotionTraceSection(promotionTraceService);
    const governanceContext = packageMaintenance
      ? {
        available: false,
        reason: "project governance context is only collected for consumer-project mode"
      }
      : collectGovernanceContextSection(governanceContextService);
    const wrapperPromotions = collectWrapperPromotionSection(projectRoot, conversationMinerService);
    const release = collectReleaseSection(context, doctorReport);
    
    // 构建推荐行动
    const recommendedActions = buildRecommendedActions({
      doctorReport,
      projectScan,
      conversation,
      promotionTrace,
      governanceContext,
      wrapperPromotions,
      release
    });

    // 生成报告
    const payload = {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      mode: doctorReport.mode,
      status: doctorReport.ok && (!release.available || release.ok) ? "ok" : "attention",
      doctor: {
        ok: doctorReport.ok,
        mode: doctorReport.mode,
        failureCodes: doctorReport.failureCodes || [],
        warnings: doctorReport.warnings || [],
        reportPath: doctorReport.reportPath,
        jsonPath: doctorReport.jsonPath,
        checkGroups: (doctorReport.checkGroups || []).map((group) => ({
          name: group.name,
          ok: group.ok,
          total: group.total,
          failed: group.failed
        }))
      },
      projectScan,
      conversation,
      promotionTrace,
      governanceContext,
      wrapperPromotions,
      release,
      recommendedActions
    };

    const artifactPaths = resolveUpgradeSummaryPaths({
      context,
      workspaceService,
      packageMaintenance
    });
    
    ensureDir(path.dirname(artifactPaths.reportPath));
    writeJson(artifactPaths.jsonPath, payload);
    fs.writeFileSync(artifactPaths.reportPath, buildUpgradeSummaryMarkdown(payload), "utf8");

    return {
      ...payload,
      reportPath: artifactPaths.reportPath,
      jsonPath: artifactPaths.jsonPath
    };
  }

  return {
    generateUpgradeSummary
  };
}
