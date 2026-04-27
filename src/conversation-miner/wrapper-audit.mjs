/**
 * 审计和报告生成模块
 * 职责：
 * 1. 生成包装器升级审计报告，包含过滤、排序和导出功能
 * 2. 生成注册治理视图，分析已注册的包装器和提案状态
 * 3. 提供审计数据导出为 JSON/Markdown/CSV 格式
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../shared/fs.mjs";
import {
  applyWrapperPromotionAuditFilter,
  applyWrapperPromotionAuditSort,
  buildWrapperPromotionAuditExportCsv,
  buildWrapperPromotionAuditExportMarkdown,
  buildWrapperPromotionAuditExportRows,
  buildWrapperPromotionAuditMarkdown,
  buildWrapperPromotionTimeline,
  normalizeWrapperPromotionAuditFields,
  normalizeWrapperPromotionAuditFilter,
  normalizeWrapperPromotionAuditSort,
  resolveWrapperPromotionAuditExport,
  wrapperPromotionAuditExportFieldOrder
} from "./wrapper-promotion-support.mjs";
import {
  buildWrapperRegistryGovernanceMarkdown,
  buildWrapperRegistryGovernancePayload
} from "./wrapper-registry-governance.mjs";
import { supportedCaptureWrappers } from "./wrappers.mjs";

/**
 * 创建包装器审计服务
 * @param {object} options - 服务配置
 * @param {string} options.projectRoot - 项目根目录
 * @param {Function} options.ensureConversationRoots - 获取对话根目录路径的函数
 * @param {object} options.listWrapperPromotions - 列出所有包装器提案的函数
 * @param {Function} options.getWrapperPromotionTimeline - 获取单个提案时间线的函数
 * @param {Function} options.loadAnyWrapperPromotion - 加载任意提案（含归档）的函数
 */
export function createWrapperAuditService({ projectRoot, ensureConversationRoots, listWrapperPromotions, getWrapperPromotionTimeline, loadAnyWrapperPromotion }) {
  /**
   * 生成包装器升级审计报告
   * 功能：
   * - 获取所有提案（含归档）
   * - 应用过滤和排序条件
   * - 生成统计摘要
   * - 支持导出为 JSON/Markdown/CSV
   * - 将报告写入项目目录
   */
  function generateWrapperPromotionAuditReport({ filter = "", sort = "", fields = "", format = "", output = "" } = {}) {
    const paths = ensureConversationRoots();
    const listing = listWrapperPromotions({ includeArchived: true });
    const allProposals = listing.proposals.map((item) => {
      const timelinePayload = getWrapperPromotionTimeline({ toolName: item.toolName });
      return {
        toolName: timelinePayload.toolName,
        displayName: timelinePayload.displayName,
        archived: timelinePayload.archived,
        promotionRoot: timelinePayload.promotionRoot,
        status: timelinePayload.status,
        materializationStatus: timelinePayload.materializationStatus,
        applicationStatus: timelinePayload.applicationStatus,
        followUpStatus: timelinePayload.followUpStatus,
        registrationStatus: timelinePayload.registrationStatus,
        archiveStatus: timelinePayload.archiveStatus,
        timeline: timelinePayload.timeline,
        lastEvent: timelinePayload.timeline[timelinePayload.timeline.length - 1] || null,
        pendingFollowUps: item.pendingFollowUps || []
      };
    });
    const proposals = applyWrapperPromotionAuditSort(applyWrapperPromotionAuditFilter(allProposals, filter), sort);

    const summary = {
      total: proposals.length,
      active: proposals.filter((item) => !item.archived).length,
      archived: proposals.filter((item) => item.archived).length,
      readyForRegistration: proposals.filter((item) => !item.archived && item.followUpStatus === "finalized" && item.registrationStatus !== "registered").length,
      registeredActive: proposals.filter((item) => !item.archived && item.registrationStatus === "registered").length,
      pendingFollowUps: proposals.filter((item) => (item.pendingFollowUps || []).length > 0).length,
      draftOrNeedsWork: proposals.filter((item) => ["draft", "needs-work"].includes(item.status)).length
    };

    const report = {
      generatedAt: new Date().toISOString(),
      filter: normalizeWrapperPromotionAuditFilter(filter),
      sort: normalizeWrapperPromotionAuditSort(sort),
      summary,
      proposals
    };

    const selectedFields = normalizeWrapperPromotionAuditFields(fields);
    const exportRows = buildWrapperPromotionAuditExportRows(proposals, selectedFields);
    const exportFields = selectedFields.length > 0 ? selectedFields : wrapperPromotionAuditExportFieldOrder;
    const { exportFormat, exportPath } = resolveWrapperPromotionAuditExport({
      projectRoot,
      format: format || (selectedFields.length > 0 ? "json" : ""),
      output
    });

    if (exportFormat) {
      ensureDir(path.dirname(exportPath));
      if (exportFormat === "json") {
        writeJson(exportPath, {
          generatedAt: report.generatedAt,
          filter: report.filter,
          sort: report.sort,
          fields: exportFields,
          rows: exportRows
        });
      } else if (exportFormat === "md") {
        fs.writeFileSync(exportPath, buildWrapperPromotionAuditExportMarkdown({ fields: exportFields, rows: exportRows }), "utf8");
      } else if (exportFormat === "csv") {
        fs.writeFileSync(exportPath, buildWrapperPromotionAuditExportCsv({ fields: exportFields, rows: exportRows }), "utf8");
      }
    }

    writeJson(paths.wrapperPromotionAuditJsonPath, report);
    fs.writeFileSync(paths.wrapperPromotionAuditReportPath, buildWrapperPromotionAuditMarkdown(report), "utf8");

    return {
      ...report,
      reportPath: paths.wrapperPromotionAuditReportPath,
      jsonPath: paths.wrapperPromotionAuditJsonPath,
      exportFormat,
      exportPath,
      exportFields,
      exportCount: exportRows.length
    };
  }

  /**
   * 生成包装器注册治理视图
   * 功能：
   * - 分析所有已注册包装器和提案
   * - 识别过期/待处理的提案
   * - 生成治理报告和 JSON 数据
   */
  function generateWrapperRegistryGovernanceView({ staleDays = 14 } = {}) {
    const paths = ensureConversationRoots();
    const listing = listWrapperPromotions({ includeArchived: true });
    const proposals = listing.proposals.map((item) => {
      const timelinePayload = getWrapperPromotionTimeline({ toolName: item.toolName });
      return {
        ...item,
        timeline: timelinePayload.timeline,
        lastEvent: timelinePayload.timeline[timelinePayload.timeline.length - 1] || null
      };
    });
    const payload = buildWrapperRegistryGovernancePayload({
      generatedAt: new Date().toISOString(),
      staleDays,
      registeredWrappers: supportedCaptureWrappers,
      proposals
    });

    writeJson(paths.wrapperRegistryGovernanceJsonPath, payload);
    fs.writeFileSync(paths.wrapperRegistryGovernanceReportPath, buildWrapperRegistryGovernanceMarkdown(payload), "utf8");

    return {
      ...payload,
      reportPath: paths.wrapperRegistryGovernanceReportPath,
      jsonPath: paths.wrapperRegistryGovernanceJsonPath
    };
  }

  /**
   * 获取单个提案的时间线
   */
  function getWrapperPromotionTimeline({ toolName = "" } = {}) {
    const { promotionRoot, proposal, archived } = loadAnyWrapperPromotion({ toolName });
    return {
      toolName: proposal.toolName,
      displayName: proposal.displayName,
      archived,
      promotionRoot,
      status: proposal.status || "draft",
      materializationStatus: proposal.materializationStatus || "not-generated",
      applicationStatus: proposal.applicationStatus || "not-applied",
      followUpStatus: proposal.followUpStatus || "not-started",
      registrationStatus: proposal.registrationStatus || "not-registered",
      archiveStatus: proposal.archiveStatus || (archived ? "archived" : "active"),
      timeline: buildWrapperPromotionTimeline(proposal)
    };
  }

  return {
    generateWrapperPromotionAuditReport,
    generateWrapperRegistryGovernanceView,
    getWrapperPromotionTimeline
  };
}
