/**
 * 包装器升级主入口模块
 * 职责：
 * 1. 提供创建包装器升级服务的工厂函数
 * 2. 组合审计、应用和生命周期三个子模块
 * 3. 提供脚手架和列表功能
 * 4. 协调各子模块之间的依赖关系
 *
 * 模块架构：
 * - wrapper-audit.mjs: 审计和报告生成
 * - wrapper-apply.mjs: 应用和目标分析
 * - wrapper-lifecycle.mjs: 生命周期管理
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, readJson, removeDirIfExists, writeJson } from "../../scripts/shared.mjs";
import { supportedCaptureWrappers } from "./wrappers.mjs";
import { sanitizeWrapperToolName, buildWrapperPromotionReadme, buildWrapperPromotionTimeline } from "./wrapper-promotion-support.mjs";
import { createWrapperAuditService } from "./wrapper-audit.mjs";
import { createWrapperApplyService } from "./wrapper-apply.mjs";
import { createWrapperLifecycleService } from "./wrapper-lifecycle.mjs";

/**
 * 创建包装器升级服务
 * @param {object} options - 服务配置
 * @param {string} options.projectRoot - 项目根目录
 * @param {Function} options.ensureConversationRoots - 获取对话根目录路径的函数
 * @param {object} options.promotionTraceService - 追踪服务（可选）
 * @returns {object} 包含所有包装器升级操作的函数对象
 */
export function createWrapperPromotionService({ projectRoot, ensureConversationRoots, promotionTraceService }) {
  /**
   * 获取包装器升级根目录
   */
  function getWrapperPromotionRoot(paths, toolName) {
    return path.join(paths.wrapperPromotionsRoot, sanitizeWrapperToolName(toolName));
  }

  /**
   * 加载包装器提案（仅限活动目录）
   */
  function loadWrapperPromotion({ toolName = "" } = {}) {
    const paths = ensureConversationRoots();
    const normalizedToolName = sanitizeWrapperToolName(toolName);
    if (!normalizedToolName) throw new Error("Wrapper promotion requires --tool <name>.");
    const promotionRoot = getWrapperPromotionRoot(paths, normalizedToolName);
    const proposalPath = path.join(promotionRoot, "wrapper-promotion.json");
    if (!fs.existsSync(proposalPath)) throw new Error(`Wrapper promotion proposal not found: ${normalizedToolName}.`);
    return {
      paths,
      normalizedToolName,
      promotionRoot,
      proposalPath,
      proposal: readJson(proposalPath)
    };
  }

  /**
   * 加载任意包装器提案（含归档目录）
   */
  function loadAnyWrapperPromotion({ toolName = "" } = {}) {
    const paths = ensureConversationRoots();
    const normalizedToolName = sanitizeWrapperToolName(toolName);
    if (!normalizedToolName) throw new Error("Wrapper promotion requires --tool <name>.");

    const candidateRoots = [
      { root: path.join(paths.wrapperPromotionsRoot, normalizedToolName), archived: false },
      { root: path.join(paths.wrapperPromotionsArchiveRoot, normalizedToolName), archived: true }
    ];

    for (const candidate of candidateRoots) {
      const proposalPath = path.join(candidate.root, "wrapper-promotion.json");
      if (!fs.existsSync(proposalPath)) continue;
      return {
        paths,
        normalizedToolName,
        promotionRoot: candidate.root,
        proposalPath,
        archived: candidate.archived,
        proposal: readJson(proposalPath)
      };
    }

    throw new Error(`Wrapper promotion proposal not found in active or archived roots: ${normalizedToolName}.`);
  }

  /**
   * 脚手架化包装器提案
   * 创建新的包装器升级提案，包含初始状态和目标文件列表
   * 如果指定了 sourcePatternId，会记录模式到提案的关系追踪
   */
  function scaffoldWrapperPromotion({ toolName = "", displayName = "", integrationStyle = "terminal", force = false, patternId = "" } = {}) {
    const paths = ensureConversationRoots();
    const normalizedToolName = sanitizeWrapperToolName(toolName);
    if (!normalizedToolName) throw new Error("scaffold-wrapper-promotion requires --tool <name>.");
    if (supportedCaptureWrappers.some((wrapper) => wrapper.toolName === normalizedToolName)) {
      throw new Error(`Tool is already registered as a capture wrapper: ${normalizedToolName}.`);
    }

    const resolvedStyle = integrationStyle === "gui" ? "gui" : "terminal";
    const resolvedDisplayName = String(displayName || "")
      .trim() || normalizedToolName.split(/[-_.]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    const promotionRoot = path.join(paths.wrapperPromotionsRoot, normalizedToolName);
    if (fs.existsSync(promotionRoot) && !force) {
      throw new Error(`Wrapper promotion proposal already exists: ${promotionRoot}. Use --force to overwrite.`);
    }

    ensureDir(paths.wrapperPromotionsRoot);
    if (fs.existsSync(promotionRoot)) removeDirIfExists(promotionRoot);
    ensureDir(promotionRoot);

    const generatedAt = new Date().toISOString();
    const proposal = {
      toolName: normalizedToolName,
      displayName: resolvedDisplayName,
      integrationStyle: resolvedStyle,
      sourcePatternId: String(patternId || "").trim(),
      generatedAt,
      status: "draft",
      reviewedAt: "",
      reviewNote: "",
      reviewHistory: [],
      materializationStatus: "not-generated",
      materializedAt: "",
      applicationStatus: "not-applied",
      appliedAt: "",
      appliedFiles: [],
      followUpStatus: "not-started",
      testsScaffoldedAt: "",
      testScaffoldFiles: [],
      docsGeneratedAt: "",
      docScaffoldFiles: [],
      finalizedAt: "",
      finalizationNote: "",
      registrationStatus: "not-registered",
      registeredAt: "",
      registrationNote: "",
      archiveStatus: "active",
      archivedAt: "",
      archiveNote: "",
      restoredAt: "",
      restorationNote: "",
      postApplyChecklistPath: "",
      pendingFollowUps: [],
      currentEntry: resolvedStyle === "gui"
        ? {
            mode: "host-first",
            command: `.power-ai/adapters/custom-tool-capture.example.ps1 -ToolName ${normalizedToolName} -ResponseText $response -QueueResponse -ConsumeNow`
          }
        : {
            mode: "terminal-first",
            command: `.power-ai/adapters/custom-tool-capture.example.ps1 -ToolName ${normalizedToolName} -ResponseText $response -Auto`
          },
      targetFiles: [
        "src/conversation-miner/wrappers.mjs",
        "src/commands/project-commands.mjs",
        "src/commands/index.mjs",
        "src/selection/cli.mjs",
        "tests/conversation-miner.test.mjs",
        "tests/selection.test.mjs",
        "README.md",
        "docs/tool-adapters.md",
        "docs/command-manual.md"
      ]
    };

    writeJson(path.join(promotionRoot, "wrapper-promotion.json"), proposal);
    fs.writeFileSync(path.join(promotionRoot, "README.md"), buildWrapperPromotionReadme(proposal), "utf8");

    if (proposal.sourcePatternId) {
      const decisionPath = paths.conversationDecisionsPath;
      promotionTraceService?.recordRelation({
        relationType: "pattern->wrapper-proposal",
        source: {
          type: "pattern",
          id: proposal.sourcePatternId,
          path: paths.projectPatternsPath
        },
        target: {
          type: "wrapper-proposal",
          id: normalizedToolName,
          path: promotionRoot
        },
        metadata: {
          toolName: normalizedToolName,
          integrationStyle: resolvedStyle,
          decisionPath: fs.existsSync(decisionPath) ? decisionPath : ""
        },
        recordedAt: generatedAt
      });
    }

    return {
      toolName: normalizedToolName,
      displayName: resolvedDisplayName,
      integrationStyle: resolvedStyle,
      generatedAt,
      promotionRoot,
      sourcePatternId: proposal.sourcePatternId
    };
  }

  /**
   * 列出所有包装器提案
   * 支持包含/排除归档提案
   */
  function listWrapperPromotions({ includeArchived = false } = {}) {
    const paths = ensureConversationRoots();
    const roots = [
      { root: paths.wrapperPromotionsRoot, archived: false },
      ...(includeArchived ? [{ root: paths.wrapperPromotionsArchiveRoot, archived: true }] : [])
    ].filter((item) => fs.existsSync(item.root));
    if (roots.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        count: 0,
        proposals: []
      };
    }

    const proposals = roots.flatMap(({ root, archived }) => fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const proposalPath = path.join(root, entry.name, "wrapper-promotion.json");
        if (!fs.existsSync(proposalPath)) return null;
        const proposal = readJson(proposalPath);
        return {
          toolName: proposal.toolName,
          displayName: proposal.displayName,
          integrationStyle: proposal.integrationStyle,
          status: proposal.status || "draft",
          reviewedAt: proposal.reviewedAt || "",
          materializationStatus: proposal.materializationStatus || "not-generated",
          materializedAt: proposal.materializedAt || "",
          applicationStatus: proposal.applicationStatus || "not-applied",
          appliedAt: proposal.appliedAt || "",
          followUpStatus: proposal.followUpStatus || "not-started",
          docsGeneratedAt: proposal.docsGeneratedAt || "",
          finalizedAt: proposal.finalizedAt || "",
          registrationStatus: proposal.registrationStatus || "not-registered",
          registeredAt: proposal.registeredAt || "",
          archiveStatus: proposal.archiveStatus || (archived ? "archived" : "active"),
          archivedAt: proposal.archivedAt || "",
          restoredAt: proposal.restoredAt || "",
          pendingFollowUps: proposal.pendingFollowUps || [],
          promotionRoot: path.join(root, entry.name),
          archived
        };
      })
      .filter(Boolean))
      .sort((left, right) => left.toolName.localeCompare(right.toolName, "zh-CN"));

    return {
      generatedAt: new Date().toISOString(),
      count: proposals.length,
      proposals
    };
  }

  // ========== 创建子模块服务 ==========

  // 创建审计服务
  const auditService = createWrapperAuditService({
    projectRoot,
    ensureConversationRoots,
    listWrapperPromotions,
    loadAnyWrapperPromotion
  });

  // 绑定审计服务中的 getWrapperPromotionTimeline
  auditService.getWrapperPromotionTimeline = function ({ toolName = "" } = {}) {
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
  };

  // 创建应用服务
  const applyService = createWrapperApplyService({
    projectRoot,
    loadWrapperPromotion
  });

  // 创建生命周期服务
  const lifecycleService = createWrapperLifecycleService({
    getConversationPaths: ensureConversationRoots,
    loadWrapperPromotion,
    promotionTraceService,
    projectRoot
  });

  // ========== 导出统一接口 ==========
  return {
    // 脚手架和列表
    scaffoldWrapperPromotion,
    listWrapperPromotions,

    // 审计功能
    getWrapperPromotionTimeline: auditService.getWrapperPromotionTimeline.bind(auditService),
    generateWrapperPromotionAuditReport: auditService.generateWrapperPromotionAuditReport.bind(auditService),
    generateWrapperRegistryGovernanceView: auditService.generateWrapperRegistryGovernanceView.bind(auditService),

    // 生命周期管理
    reviewWrapperPromotion: lifecycleService.reviewWrapperPromotion.bind(lifecycleService),
    materializeWrapperPromotion: lifecycleService.materializeWrapperPromotion.bind(lifecycleService),
    finalizeWrapperPromotion: lifecycleService.finalizeWrapperPromotion.bind(lifecycleService),
    registerWrapperPromotion: lifecycleService.registerWrapperPromotion.bind(lifecycleService),
    archiveWrapperPromotion: lifecycleService.archiveWrapperPromotion.bind(lifecycleService),
    restoreWrapperPromotion: lifecycleService.restoreWrapperPromotion.bind(lifecycleService),

    // 应用功能
    applyWrapperPromotion: applyService.applyWrapperPromotion.bind(applyService)
  };
}
