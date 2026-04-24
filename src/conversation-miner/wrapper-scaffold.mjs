/**
 * Wrapper Promotion Scaffold 模块
 * 
 * 负责：
 * - 创建包装提升脚手架
 * - 列出所有包装提升
 * - 获取时间线
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, removeDirIfExists, writeJson } from "../../scripts/shared.mjs";
import { supportedCaptureWrappers } from "./wrappers.mjs";
import { sanitizeWrapperToolName } from "./wrapper-promotion-support.mjs";
import { buildWrapperPromotionReadme } from "./wrapper-promotion-support.mjs";

/**
 * 创建包装提升脚手架
 */
export function scaffoldWrapperPromotion({ toolName = "", displayName = "", integrationStyle = "terminal", force = false, patternId = "", ensureConversationRoots, promotionTraceService }) {
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
 * 列出所有包装提升
 */
export function listWrapperPromotions({ includeArchived = false, ensureConversationRoots }) {
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

/**
 * 获取包装提升时间线
 */
export function getWrapperPromotionTimeline({ toolName = "", loadAnyWrapperPromotion }) {
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
