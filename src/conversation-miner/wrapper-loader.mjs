/**
 * Wrapper Promotion Loader 模块
 * 
 * 负责：
 * - 包装提升根目录路径管理
 * - 加载包装提升提案
 * - 通用工具函数
 */

import fs from "node:fs";
import path from "node:path";
import { readJson } from "../shared/fs.mjs";
import { sanitizeWrapperToolName } from "./wrapper-promotion-support.mjs";

/**
 * 获取包装提升根目录
 */
export function getWrapperPromotionRoot(paths, toolName) {
  return path.join(paths.wrapperPromotionsRoot, sanitizeWrapperToolName(toolName));
}

/**
 * 加载包装提升提案（仅活跃）
 */
export function loadWrapperPromotion({ toolName = "", ensureConversationRoots }) {
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
 * 加载包装提升提案（含归档）
 */
export function loadAnyWrapperPromotion({ toolName = "", ensureConversationRoots }) {
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
 * 获取包装提升文档脚手架文件路径
 */
export function getWrapperPromotionDocScaffoldFiles(toolName) {
  return [
    path.join(".power-ai", "proposals", "wrapper-promotions", toolName, "documentation-scaffolds", "README.snippet.md").replace(/\\/g, "/"),
    path.join(".power-ai", "proposals", "wrapper-promotions", toolName, "documentation-scaffolds", "tool-adapters.snippet.md").replace(/\\/g, "/"),
    path.join(".power-ai", "proposals", "wrapper-promotions", toolName, "documentation-scaffolds", "command-manual.snippet.md").replace(/\\/g, "/")
  ];
}

/**
 * 获取包装提升应用后检查清单路径
 */
export function getWrapperPromotionChecklistPath(toolName) {
  return path.join(".power-ai", "proposals", "wrapper-promotions", toolName, "post-apply-checklist.md").replace(/\\/g, "/");
}
