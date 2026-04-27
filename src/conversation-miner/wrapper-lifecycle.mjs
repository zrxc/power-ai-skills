/**
 * 生命周期管理模块
 * 职责：
 * 管理包装器提案的完整生命周期，包括以下阶段：
 * 1. review - 审查提案（接受/拒绝/需要修改）
 * 2. materialize - 物化生成注册工件
 * 3. finalize - 完成后续工作确认
 * 4. register - 正式注册到项目
 * 5. archive - 归档已注册的包装器
 * 6. restore - 从归档恢复
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, readJson, removeDirIfExists, writeJson } from "../shared/fs.mjs";
import {
  buildWrapperPromotionReadme,
  buildWrapperRegistrationArtifacts,
  buildWrapperRegistrationReadme
} from "./wrapper-promotion-support.mjs";
import { sanitizeWrapperToolName } from "./wrapper-promotion-support.mjs";

/**
 * 创建包装器生命周期服务
 * @param {object} options - 服务配置
 * @param {object} options.paths - 路径对象
 * @param {Function} options.loadWrapperPromotion - 加载包装器提案的函数
 * @param {object} options.promotionTraceService - 追踪服务（可选）
 * @param {string} options.projectRoot - 项目根目录
 */
export function createWrapperLifecycleService({ getConversationPaths, loadWrapperPromotion, promotionTraceService, projectRoot }) {
  /**
   * 审查包装器提案
   * 将提案状态更新为 accepted/rejected/needs-work
   * 记录审查历史
   */
  function reviewWrapperPromotion({ toolName = "", status = "", note = "" } = {}) {
    const normalizedStatus = String(status || "").trim().toLowerCase();
    if (!["accepted", "rejected", "needs-work"].includes(normalizedStatus)) {
      throw new Error("review-wrapper-promotion requires --status accepted|rejected|needs-work.");
    }

    const { proposalPath, promotionRoot, proposal } = loadWrapperPromotion({ toolName });
    const reviewedAt = new Date().toISOString();
    const nextProposal = {
      ...proposal,
      status: normalizedStatus,
      reviewedAt,
      reviewNote: String(note || "").trim(),
      reviewHistory: [
        ...(proposal.reviewHistory || []),
        {
          status: normalizedStatus,
          note: String(note || "").trim(),
          reviewedAt
        }
      ]
    };

    writeJson(proposalPath, nextProposal);
    fs.writeFileSync(path.join(promotionRoot, "README.md"), buildWrapperPromotionReadme(nextProposal), "utf8");

    return {
      toolName: nextProposal.toolName,
      status: nextProposal.status,
      reviewedAt: nextProposal.reviewedAt,
      reviewNote: nextProposal.reviewNote,
      promotionRoot
    };
  }

  /**
   * 物化包装器提案
   * 生成注册工件包（bundle.json 和 patch.md）
   * 更新物化状态为 generated
   */
  function materializeWrapperPromotion({ toolName = "", force = false } = {}) {
    const { proposalPath, promotionRoot, proposal } = loadWrapperPromotion({ toolName });
    if ((proposal.status || "draft") !== "accepted") {
      throw new Error(`Wrapper promotion must be accepted before materialization: ${proposal.toolName}.`);
    }

    const artifactsRoot = path.join(promotionRoot, "registration-artifacts");
    if (fs.existsSync(artifactsRoot) && !force) {
      throw new Error(`Wrapper registration artifacts already exist: ${artifactsRoot}. Use --force to overwrite.`);
    }

    ensureDir(artifactsRoot);
    if (fs.existsSync(path.join(artifactsRoot, "wrapper-registration.bundle.json")) && force) {
      removeDirIfExists(artifactsRoot);
      ensureDir(artifactsRoot);
    }

    const generatedAt = new Date().toISOString();
    const artifacts = buildWrapperRegistrationArtifacts(proposal);
    writeJson(path.join(artifactsRoot, "wrapper-registration.bundle.json"), {
      toolName: proposal.toolName,
      displayName: proposal.displayName,
      integrationStyle: proposal.integrationStyle,
      generatedAt,
      artifacts
    });
    fs.writeFileSync(path.join(artifactsRoot, "wrapper-registration.patch.md"), buildWrapperRegistrationReadme({ proposal, artifacts, generatedAt }), "utf8");

    const nextProposal = {
      ...proposal,
      materializationStatus: "generated",
      materializedAt: generatedAt
    };
    writeJson(proposalPath, nextProposal);
    fs.writeFileSync(path.join(promotionRoot, "README.md"), buildWrapperPromotionReadme(nextProposal), "utf8");

    return {
      toolName: proposal.toolName,
      generatedAt,
      artifactsRoot,
      materializationStatus: nextProposal.materializationStatus
    };
  }

  /**
   * 完成包装器升级
   * 确认后续工作已完成，清除待办事项
   * 前提条件：已接受、已物化、已应用、文档已生成、有测试和文档脚手架
   */
  function finalizeWrapperPromotion({ toolName = "", note = "" } = {}) {
    const { proposalPath, promotionRoot, proposal } = loadWrapperPromotion({ toolName });
    if ((proposal.status || "draft") !== "accepted") {
      throw new Error(`Wrapper promotion must be accepted before finalize: ${proposal.toolName}.`);
    }
    if ((proposal.materializationStatus || "not-generated") !== "generated") {
      throw new Error(`Wrapper promotion must be materialized before finalize: ${proposal.toolName}.`);
    }
    if ((proposal.applicationStatus || "not-applied") !== "applied") {
      throw new Error(`Wrapper promotion must be applied before finalize: ${proposal.toolName}.`);
    }
    if ((proposal.followUpStatus || "not-started") !== "docs-generated") {
      throw new Error(`Wrapper promotion must reach docs-generated before finalize: ${proposal.toolName}.`);
    }
    if (!Array.isArray(proposal.testScaffoldFiles) || proposal.testScaffoldFiles.length === 0) {
      throw new Error(`Wrapper promotion is missing generated test scaffolds: ${proposal.toolName}.`);
    }
    if (!Array.isArray(proposal.docScaffoldFiles) || proposal.docScaffoldFiles.length === 0) {
      throw new Error(`Wrapper promotion is missing generated documentation scaffolds: ${proposal.toolName}.`);
    }

    const finalizedAt = new Date().toISOString();
    const nextProposal = {
      ...proposal,
      followUpStatus: "finalized",
      finalizedAt,
      finalizationNote: String(note || "").trim(),
      pendingFollowUps: []
    };
    writeJson(proposalPath, nextProposal);
    fs.writeFileSync(path.join(promotionRoot, "README.md"), buildWrapperPromotionReadme(nextProposal), "utf8");

    return {
      toolName: nextProposal.toolName,
      followUpStatus: nextProposal.followUpStatus,
      finalizedAt: nextProposal.finalizedAt,
      finalizationNote: nextProposal.finalizationNote,
      promotionRoot
    };
  }

  /**
   * 注册包装器
   * 将包装器正式注册到项目中
   * 前提条件：已接受、已物化、已应用、已完成
   * 验证：包装器已存在于项目注册源码中
   * 记录注册关系追踪（如果有模式来源）
   */
  function registerWrapperPromotion({ toolName = "", note = "" } = {}) {
    const { proposalPath, promotionRoot, proposal } = loadWrapperPromotion({ toolName });
    if ((proposal.status || "draft") !== "accepted") {
      throw new Error(`Wrapper promotion must be accepted before register: ${proposal.toolName}.`);
    }
    if ((proposal.materializationStatus || "not-generated") !== "generated") {
      throw new Error(`Wrapper promotion must be materialized before register: ${proposal.toolName}.`);
    }
    if ((proposal.applicationStatus || "not-applied") !== "applied") {
      throw new Error(`Wrapper promotion must be applied before register: ${proposal.toolName}.`);
    }
    if ((proposal.followUpStatus || "not-started") !== "finalized") {
      throw new Error(`Wrapper promotion must be finalized before register: ${proposal.toolName}.`);
    }
    if ((proposal.registrationStatus || "not-registered") === "registered") {
      throw new Error(`Wrapper promotion is already registered: ${proposal.toolName}.`);
    }

    const wrappersSourcePath = path.join(projectRoot, "src", "conversation-miner", "wrappers.mjs");
    const wrappersSource = fs.existsSync(wrappersSourcePath) ? fs.readFileSync(wrappersSourcePath, "utf8") : "";
    if (!wrappersSource.includes(`toolName: "${proposal.toolName}"`)) {
      throw new Error(`Wrapper promotion is not present in the project wrapper registry source: ${proposal.toolName}.`);
    }

    const registeredAt = new Date().toISOString();
    const nextProposal = {
      ...proposal,
      registrationStatus: "registered",
      registeredAt,
      registrationNote: String(note || "").trim()
    };
    writeJson(proposalPath, nextProposal);
    fs.writeFileSync(path.join(promotionRoot, "README.md"), buildWrapperPromotionReadme(nextProposal), "utf8");
    writeJson(path.join(promotionRoot, "registration-record.json"), {
      toolName: nextProposal.toolName,
      displayName: nextProposal.displayName,
      integrationStyle: nextProposal.integrationStyle,
      registeredAt: nextProposal.registeredAt,
      registrationNote: nextProposal.registrationNote,
      registrationStatus: nextProposal.registrationStatus
    });

    if (promotionTraceService && nextProposal.sourcePatternId) {
      const conversationRoots = typeof getConversationPaths === "function"
        ? getConversationPaths()
        : {};
      promotionTraceService.recordRelation({
        relationType: "pattern->wrapper-proposal",
        source: {
          type: "pattern",
          id: nextProposal.sourcePatternId,
          path: conversationRoots.conversationDecisionsPath || ""
        },
        target: {
          type: "wrapper-proposal",
          id: nextProposal.toolName,
          path: promotionRoot
        },
        metadata: {
          toolName: nextProposal.toolName,
          integrationStyle: nextProposal.integrationStyle,
          decisionPath: proposalPath,
          registrationStatus: nextProposal.registrationStatus,
          registeredAt: nextProposal.registeredAt,
          registrationNote: nextProposal.registrationNote,
          registrationRecordPath: path.join(promotionRoot, "registration-record.json")
        },
        recordedAt: nextProposal.registeredAt
      });
    }

    return {
      toolName: nextProposal.toolName,
      registrationStatus: nextProposal.registrationStatus,
      registeredAt: nextProposal.registeredAt,
      registrationNote: nextProposal.registrationNote,
      promotionRoot
    };
  }

  /**
   * 归档包装器
   * 将已注册的包装器移动到归档目录
   * 前提条件：已注册、未归档
   */
  function archiveWrapperPromotion({ toolName = "", note = "" } = {}) {
    const { paths: currentPaths, normalizedToolName, proposalPath, promotionRoot, proposal } = loadWrapperPromotion({ toolName });
    if ((proposal.registrationStatus || "not-registered") !== "registered") {
      throw new Error(`Wrapper promotion must be registered before archive: ${proposal.toolName}.`);
    }
    if ((proposal.archiveStatus || "active") === "archived") {
      throw new Error(`Wrapper promotion is already archived: ${proposal.toolName}.`);
    }

    ensureDir(currentPaths.wrapperPromotionsArchiveRoot);
    const archiveRoot = path.join(currentPaths.wrapperPromotionsArchiveRoot, normalizedToolName);
    if (fs.existsSync(archiveRoot)) {
      throw new Error(`Wrapper promotion archive target already exists: ${archiveRoot}.`);
    }

    const archivedAt = new Date().toISOString();
    const nextProposal = {
      ...proposal,
      archiveStatus: "archived",
      archivedAt,
      archiveNote: String(note || "").trim()
    };
    writeJson(proposalPath, nextProposal);
    fs.writeFileSync(path.join(promotionRoot, "README.md"), buildWrapperPromotionReadme(nextProposal), "utf8");
    writeJson(path.join(promotionRoot, "archive-record.json"), {
      toolName: nextProposal.toolName,
      displayName: nextProposal.displayName,
      archiveStatus: nextProposal.archiveStatus,
      archivedAt: nextProposal.archivedAt,
      archiveNote: nextProposal.archiveNote
    });
    fs.renameSync(promotionRoot, archiveRoot);

    return {
      toolName: nextProposal.toolName,
      archiveStatus: nextProposal.archiveStatus,
      archivedAt: nextProposal.archivedAt,
      archiveNote: nextProposal.archiveNote,
      archiveRoot
    };
  }

  /**
   * 恢复归档的包装器
   * 将归档的包装器移回活动目录
   * 前提条件：已归档、活动目录不存在同名
   */
  function restoreWrapperPromotion({ toolName = "", note = "" } = {}) {
    const normalizedToolName = sanitizeWrapperToolName(toolName);
    if (!normalizedToolName) throw new Error("restore-wrapper-promotion requires --tool <name>.");

    const currentPaths = typeof getConversationPaths === "function"
      ? getConversationPaths()
      : {};
    const archiveRoot = path.join(currentPaths.wrapperPromotionsArchiveRoot, normalizedToolName);
    const proposalPath = path.join(archiveRoot, "wrapper-promotion.json");
    if (!fs.existsSync(proposalPath)) {
      throw new Error(`Archived wrapper promotion proposal not found: ${normalizedToolName}.`);
    }

    const proposal = readJson(proposalPath);
    if ((proposal.archiveStatus || "active") !== "archived") {
      throw new Error(`Wrapper promotion is not archived: ${proposal.toolName}.`);
    }

    const activeRoot = path.join(currentPaths.wrapperPromotionsRoot, normalizedToolName);
    if (fs.existsSync(activeRoot)) {
      throw new Error(`Active wrapper promotion target already exists: ${activeRoot}.`);
    }

    const restoredAt = new Date().toISOString();
    const nextProposal = {
      ...proposal,
      archiveStatus: "active",
      restoredAt,
      restorationNote: String(note || "").trim()
    };
    writeJson(proposalPath, nextProposal);
    fs.writeFileSync(path.join(archiveRoot, "README.md"), buildWrapperPromotionReadme(nextProposal), "utf8");
    writeJson(path.join(archiveRoot, "restore-record.json"), {
      toolName: nextProposal.toolName,
      displayName: nextProposal.displayName,
      archiveStatus: nextProposal.archiveStatus,
      restoredAt: nextProposal.restoredAt,
      restorationNote: nextProposal.restorationNote
    });
    fs.renameSync(archiveRoot, activeRoot);

    return {
      toolName: nextProposal.toolName,
      archiveStatus: nextProposal.archiveStatus,
      restoredAt: nextProposal.restoredAt,
      restorationNote: nextProposal.restorationNote,
      promotionRoot: activeRoot
    };
  }

  return {
    reviewWrapperPromotion,
    materializeWrapperPromotion,
    finalizeWrapperPromotion,
    registerWrapperPromotion,
    archiveWrapperPromotion,
    restoreWrapperPromotion
  };
}
