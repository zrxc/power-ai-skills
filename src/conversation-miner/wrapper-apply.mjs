/**
 * 应用和目标分析模块
 * 职责：
 * 1. 分析包装器升级应用目标文件
 * 2. 构建应用写入路径
 * 3. 执行应用操作（含 dry-run 模式）
 * 4. 处理文档脚手架和检查清单生成
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, readJson, writeJson } from "../shared/fs.mjs";
import { buildWrapperPromotionApplyTargets } from "./wrapper-promotion-apply-targets.mjs";
import {
  buildWrapperPromotionDocScaffolds,
  buildWrapperPromotionPostApplyChecklist,
  buildWrapperPromotionReadme
} from "./wrapper-promotion-support.mjs";
import { supportedCaptureWrappers } from "./wrappers.mjs";

/**
 * 创建包装器应用服务
 * @param {object} options - 服务配置
 * @param {string} options.projectRoot - 项目根目录
 * @param {Function} options.loadWrapperPromotion - 加载包装器提案的函数
 */
export function createWrapperApplyService({ projectRoot, loadWrapperPromotion }) {
  /**
   * 获取文档脚手架文件路径
   */
  function getWrapperPromotionDocScaffoldFiles(toolName) {
    return [
      path.join(".power-ai", "proposals", "wrapper-promotions", toolName, "documentation-scaffolds", "README.snippet.md").replace(/\\/g, "/"),
      path.join(".power-ai", "proposals", "wrapper-promotions", toolName, "documentation-scaffolds", "tool-adapters.snippet.md").replace(/\\/g, "/"),
      path.join(".power-ai", "proposals", "wrapper-promotions", toolName, "documentation-scaffolds", "command-manual.snippet.md").replace(/\\/g, "/")
    ];
  }

  /**
   * 获取应用后检查清单路径
   */
  function getWrapperPromotionChecklistPath(toolName) {
    return path.join(".power-ai", "proposals", "wrapper-promotions", toolName, "post-apply-checklist.md").replace(/\\/g, "/");
  }

  /**
   * 分析应用目标
   * 检查目标文件是否存在，应用修改并返回变更分析结果
   */
  function analyzeWrapperPromotionApplyTargets({ targets, force = false } = {}) {
    const sourceChanges = [];
    for (const target of targets) {
      const targetPath = path.join(projectRoot, target.relativePath);
      if (!fs.existsSync(targetPath)) {
        throw new Error(`Unable to apply wrapper promotion because target file is missing: ${target.relativePath}.`);
      }

      const current = fs.readFileSync(targetPath, "utf8");
      const next = target.apply(current);
      const relativePath = target.relativePath.replace(/\\/g, "/");
      sourceChanges.push({
        path: relativePath,
        changed: Boolean(next.changed),
        willWrite: next.text !== current && (next.changed || force)
      });
    }

    return {
      sourceChanges,
      changedFiles: sourceChanges.filter((item) => item.willWrite).map((item) => item.path)
    };
  }

  /**
   * 构建应用写入路径
   * 合并变更文件、文档脚手架、检查清单和提案文件路径
   */
  function buildWrapperPromotionApplyWritePaths({ proposal, changedFiles }) {
    return [
      ...new Set([
        ...changedFiles,
        ...getWrapperPromotionDocScaffoldFiles(proposal.toolName),
        getWrapperPromotionChecklistPath(proposal.toolName),
        path.join(".power-ai", "proposals", "wrapper-promotions", proposal.toolName, "wrapper-promotion.json").replace(/\\/g, "/"),
        path.join(".power-ai", "proposals", "wrapper-promotions", proposal.toolName, "README.md").replace(/\\/g, "/")
      ])
    ];
  }

  /**
   * 应用包装器升级到项目
   * 功能：
   * - 验证提案状态（必须已接受和物化）
   * - 读取注册工件包
   * - 构建文档脚手架和检查清单
   * - 应用目标文件修改
   * - 支持 dry-run 预览模式
   * - 更新提案状态为已应用
   */
  function applyWrapperPromotion({ toolName = "", force = false, dryRun = false } = {}) {
    const { proposalPath, promotionRoot, proposal } = loadWrapperPromotion({ toolName });
    if ((proposal.status || "draft") !== "accepted") {
      throw new Error(`Wrapper promotion must be accepted before apply: ${proposal.toolName}.`);
    }
    if ((proposal.materializationStatus || "not-generated") !== "generated") {
      throw new Error(`Wrapper promotion must be materialized before apply: ${proposal.toolName}.`);
    }
    if (supportedCaptureWrappers.some((wrapper) => wrapper.toolName === proposal.toolName)) {
      throw new Error(`Tool is already registered as a capture wrapper: ${proposal.toolName}.`);
    }

    const bundlePath = path.join(promotionRoot, "registration-artifacts", "wrapper-registration.bundle.json");
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Wrapper registration bundle not found: ${bundlePath}.`);
    }

    const { artifacts } = readJson(bundlePath);
    const docScaffolds = buildWrapperPromotionDocScaffolds({ proposal, artifacts });
    const targets = buildWrapperPromotionApplyTargets({ proposal, artifacts });
    const appliedFiles = targets.map((target) => target.relativePath.replace(/\\/g, "/"));
    const docScaffoldFiles = getWrapperPromotionDocScaffoldFiles(proposal.toolName);
    const checklistRelativePath = getWrapperPromotionChecklistPath(proposal.toolName);
    const { sourceChanges, changedFiles } = analyzeWrapperPromotionApplyTargets({ targets, force });
    const wouldWriteFiles = buildWrapperPromotionApplyWritePaths({ proposal, changedFiles });

    if (dryRun) {
      return {
        toolName: proposal.toolName,
        dryRun: true,
        applicationStatus: proposal.applicationStatus || "not-applied",
        followUpStatus: proposal.followUpStatus || "not-started",
        appliedFiles,
        docScaffoldFiles,
        postApplyChecklistPath: checklistRelativePath,
        changedFiles,
        sourceChanges,
        wouldWriteFiles
      };
    }

    const docScaffoldRoot = path.join(promotionRoot, "documentation-scaffolds");
    ensureDir(docScaffoldRoot);
    fs.writeFileSync(path.join(docScaffoldRoot, "README.snippet.md"), docScaffolds.readme, "utf8");
    fs.writeFileSync(path.join(docScaffoldRoot, "tool-adapters.snippet.md"), docScaffolds.toolAdapters, "utf8");
    fs.writeFileSync(path.join(docScaffoldRoot, "command-manual.snippet.md"), docScaffolds.commandManual, "utf8");
    fs.writeFileSync(path.join(promotionRoot, "post-apply-checklist.md"), buildWrapperPromotionPostApplyChecklist({ proposal }), "utf8");

    for (const target of targets) {
      const targetPath = path.join(projectRoot, target.relativePath);
      const current = fs.readFileSync(targetPath, "utf8");
      const next = target.apply(current);
      if (next.changed || force) {
        if (next.text !== current) {
          fs.writeFileSync(targetPath, next.text, "utf8");
        }
      }
    }

    const appliedAt = new Date().toISOString();
    const nextProposal = {
      ...proposal,
      applicationStatus: "applied",
      appliedAt,
      appliedFiles,
      testsScaffoldedAt: appliedAt,
      testScaffoldFiles: ["tests/conversation-miner.test.mjs", "tests/selection.test.mjs"],
      docsGeneratedAt: appliedAt,
      docScaffoldFiles,
      postApplyChecklistPath: checklistRelativePath,
      pendingFollowUps: [
        "run generated wrapper tests and adjust fixture details if needed",
        "review generated documentation snippets and merge them if needed",
        "re-run doctor after full wrapper integration"
      ],
      followUpStatus: "docs-generated"
    };
    writeJson(proposalPath, nextProposal);
    fs.writeFileSync(path.join(promotionRoot, "README.md"), buildWrapperPromotionReadme(nextProposal), "utf8");

    return {
      toolName: proposal.toolName,
      dryRun: false,
      applicationStatus: nextProposal.applicationStatus,
      followUpStatus: nextProposal.followUpStatus,
      appliedAt,
      appliedFiles: nextProposal.appliedFiles,
      docScaffoldFiles: nextProposal.docScaffoldFiles,
      changedFiles
    };
  }

  return {
    applyWrapperPromotion,
    analyzeWrapperPromotionApplyTargets,
    buildWrapperPromotionApplyWritePaths,
    getWrapperPromotionDocScaffoldFiles,
    getWrapperPromotionChecklistPath
  };
}
