import fs from "node:fs";
import path from "node:path";
import { ensureDir, readJson, writeJson } from "../shared/fs.mjs";
import {
  buildAutoCaptureRuntimeExampleScript,
  buildCaptureWrapperExampleScript,
  buildConversationCaptureContractMarkdown,
  buildConversationCaptureGuidanceMarkdown,
  buildCustomCaptureWrapperExampleScript,
  buildHostBridgeExampleScript
} from "./capture-scaffolding-renderers.mjs";
import { writeAutoCaptureBridgeContract } from "./auto-capture-bridge-contract.mjs";
import { ensureCaptureSafetyPolicy } from "./capture-safety-policy.mjs";
import { supportedCaptureWrappers } from "./wrappers.mjs";

export const conversationThresholds = {
  minFrequencyToGenerate: 3,
  minReuseScoreToGenerate: 70,
  minFrequencyToReview: 2,
  minReuseScoreToReview: 45
};

export const defaultConversationMinerConfig = {
  version: "1.4.7",
  capture: {
    mode: "balanced",
    askScoreThreshold: 6,
    ignoreDuplicates: true,
    ignoreCoveredBySkill: true,
    suppressedSceneTypes: ["chat", "general-discussion", "general-q-and-a", "plain-explanation", "small-talk"]
  },
  autoCapture: {
    enabled: true,
    pollIntervalMs: 1500,
    maxBatchSize: 10
  }
};

export const incompleteStatuses = new Set(["blocked", "in-progress", "partial", "todo", "incomplete"]);

export const sceneDefinitions = new Map([
  ["basic-list-page", {
    skillName: "basic-list-page-conversation-project",
    displayName: "Project Basic List Page Conversation Skill",
    baseSkill: "basic-list-page",
    description: "Use when the project repeatedly implements a basic list page through conversation-mined patterns.",
    tags: ["project-local", "conversation-miner", "basic-list-page"]
  }],
  ["tree-list-page", {
    skillName: "tree-list-page-conversation-project",
    displayName: "Project Tree List Page Conversation Skill",
    baseSkill: "tree-list-page",
    description: "Use when the project repeatedly implements a tree list page through conversation-mined patterns.",
    tags: ["project-local", "conversation-miner", "tree-list-page"]
  }],
  ["dialog-form", {
    skillName: "dialog-form-conversation-project",
    displayName: "Project Dialog Form Conversation Skill",
    baseSkill: "dialog-skill",
    description: "Use when the project repeatedly implements a dialog form flow through conversation-mined patterns.",
    tags: ["project-local", "conversation-miner", "dialog-form"]
  }],
  ["detail-page", {
    skillName: "detail-page-conversation-project",
    displayName: "Project Detail Page Conversation Skill",
    baseSkill: "detail-page-skill",
    description: "Use when the project repeatedly implements a detail page through conversation-mined patterns.",
    tags: ["project-local", "conversation-miner", "detail-page"]
  }]
]);

function writeTextIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) return;
  fs.writeFileSync(filePath, content, "utf8");
}

export function createConversationMinerPaths({ workspaceService }) {
  const {
    powerAiRoot,
    governanceRoot,
    skillsTarget,
    sharedTarget,
    adaptersTarget,
    contextRoot
  } = workspaceService.getPowerAiPaths();
  const reportsRoot = workspaceService.getReportsRoot();
  const overlayRoot = workspaceService.getOverlayTarget(skillsTarget);
  return {
    powerAiRoot,
    governanceRoot,
    contextRoot,
    reportsRoot,
    overlayRoot,
    sharedTarget,
    adaptersTarget,
    referencesRoot: path.join(powerAiRoot, "references"),
    conversationsRoot: path.join(powerAiRoot, "conversations"),
    conversationsArchiveRoot: path.join(powerAiRoot, "conversations-archive"),
    patternsRoot: path.join(powerAiRoot, "patterns"),
    proposalsRoot: path.join(powerAiRoot, "proposals"),
    wrapperPromotionsRoot: path.join(powerAiRoot, "proposals", "wrapper-promotions"),
    wrapperPromotionsArchiveRoot: path.join(powerAiRoot, "proposals", "wrapper-promotions-archive"),
    notificationsRoot: path.join(powerAiRoot, "notifications"),
    pendingCapturesRoot: path.join(powerAiRoot, "pending-captures"),
    autoCaptureRoot: path.join(powerAiRoot, "auto-capture"),
    autoCaptureResponseInboxRoot: path.join(powerAiRoot, "auto-capture", "response-inbox"),
    autoCaptureResponseProcessedRoot: path.join(powerAiRoot, "auto-capture", "response-processed"),
    autoCaptureResponseFailedRoot: path.join(powerAiRoot, "auto-capture", "response-failed"),
    autoCaptureInboxRoot: path.join(powerAiRoot, "auto-capture", "inbox"),
    autoCaptureProcessedRoot: path.join(powerAiRoot, "auto-capture", "processed"),
    autoCaptureFailedRoot: path.join(powerAiRoot, "auto-capture", "failed"),
    configPath: path.join(powerAiRoot, "conversation-miner-config.json"),
    projectPatternsPath: path.join(powerAiRoot, "patterns", "project-patterns.json"),
    patternGovernancePath: path.join(powerAiRoot, "patterns", "pattern-governance.json"),
    patternSummaryPath: path.join(reportsRoot, "conversation-patterns-summary.md"),
    patternGovernanceReportPath: path.join(reportsRoot, "conversation-pattern-governance.md"),
    conversationDecisionReportPath: path.join(reportsRoot, "conversation-decisions.md"),
    captureEvaluationReportPath: path.join(reportsRoot, "session-capture-evaluation.md"),
    wrapperPromotionAuditReportPath: path.join(reportsRoot, "wrapper-promotion-audit.md"),
    wrapperPromotionAuditJsonPath: path.join(reportsRoot, "wrapper-promotion-audit.json"),
    wrapperRegistryGovernanceReportPath: path.join(reportsRoot, "wrapper-registry-governance.md"),
    wrapperRegistryGovernanceJsonPath: path.join(reportsRoot, "wrapper-registry-governance.json"),
    conversationMinerStrategyReportPath: path.join(reportsRoot, "conversation-miner-strategy.md"),
    conversationMinerStrategyJsonPath: path.join(reportsRoot, "conversation-miner-strategy.json"),
    proposalsReadmePath: path.join(powerAiRoot, "proposals", "README.md"),
    notificationsReadmePath: path.join(powerAiRoot, "notifications", "README.md"),
    sharedCaptureGuidancePath: path.join(sharedTarget, "conversation-capture.md"),
    conversationCaptureContractPath: path.join(powerAiRoot, "references", "conversation-capture-contract.md"),
    autoCaptureRuntimeScriptPath: path.join(adaptersTarget, "start-auto-capture-runtime.example.ps1"),
    autoCaptureBridgeContractJsonPath: path.join(adaptersTarget, "auto-capture-bridge-contract.json"),
    autoCaptureBridgeContractMarkdownPath: path.join(adaptersTarget, "auto-capture-bridge-contract.md"),
    captureSafetyPolicyPath: path.join(powerAiRoot, "capture-safety-policy.json"),
    conversationDecisionsPath: path.join(governanceRoot, "conversation-decisions.json"),
    conversationDecisionHistoryPath: path.join(governanceRoot, "conversation-decision-history.json"),
    autoGeneratedRoot: path.join(overlayRoot, "auto-generated"),
    manualRoot: path.join(overlayRoot, "manual")
  };
}

export function ensureConversationRoots({ workspaceService }) {
  const paths = createConversationMinerPaths({ workspaceService });
  ensureDir(paths.powerAiRoot);
  ensureDir(paths.sharedTarget);
  ensureDir(paths.adaptersTarget);
  ensureDir(paths.governanceRoot);
  ensureDir(paths.contextRoot);
  ensureDir(paths.referencesRoot);
  ensureDir(paths.conversationsRoot);
  ensureDir(paths.conversationsArchiveRoot);
  ensureDir(paths.patternsRoot);
  ensureDir(paths.proposalsRoot);
  ensureDir(paths.wrapperPromotionsRoot);
  ensureDir(paths.wrapperPromotionsArchiveRoot);
  ensureDir(paths.notificationsRoot);
  ensureDir(paths.pendingCapturesRoot);
  ensureDir(paths.autoCaptureRoot);
  ensureDir(paths.autoCaptureResponseInboxRoot);
  ensureDir(paths.autoCaptureResponseProcessedRoot);
  ensureDir(paths.autoCaptureResponseFailedRoot);
  ensureDir(paths.autoCaptureInboxRoot);
  ensureDir(paths.autoCaptureProcessedRoot);
  ensureDir(paths.autoCaptureFailedRoot);
  ensureDir(paths.reportsRoot);

  if (!fs.existsSync(paths.proposalsReadmePath)) fs.writeFileSync(paths.proposalsReadmePath, "# Proposals\n\nReserved for future enterprise review flow.\n", "utf8");
  if (!fs.existsSync(paths.notificationsReadmePath)) fs.writeFileSync(paths.notificationsReadmePath, "# Notifications\n\nReserved for future notification flow.\n", "utf8");
  if (!fs.existsSync(paths.configPath)) writeJson(paths.configPath, defaultConversationMinerConfig);
  ensureCaptureSafetyPolicy(paths, workspaceService.context);
  const config = readConversationMinerConfig(paths);

  writeTextIfChanged(paths.sharedCaptureGuidancePath, buildConversationCaptureGuidanceMarkdown());
  writeTextIfChanged(paths.conversationCaptureContractPath, buildConversationCaptureContractMarkdown());
  for (const wrapper of supportedCaptureWrappers) {
    writeTextIfChanged(
      path.join(paths.adaptersTarget, `${wrapper.toolName}-capture.example.ps1`),
      buildCaptureWrapperExampleScript(wrapper)
    );
  }
  writeTextIfChanged(
    path.join(paths.adaptersTarget, "custom-tool-capture.example.ps1"),
    buildCustomCaptureWrapperExampleScript()
  );
  writeTextIfChanged(paths.autoCaptureRuntimeScriptPath, buildAutoCaptureRuntimeExampleScript());
  writeTextIfChanged(
    path.join(paths.adaptersTarget, "trae-host-bridge.example.ps1"),
    buildHostBridgeExampleScript({ toolName: "trae", displayName: "Trae" })
  );
  writeTextIfChanged(
    path.join(paths.adaptersTarget, "cursor-host-bridge.example.ps1"),
    buildHostBridgeExampleScript({ toolName: "cursor", displayName: "Cursor" })
  );
  writeTextIfChanged(
    path.join(paths.adaptersTarget, "windsurf-host-bridge.example.ps1"),
    buildHostBridgeExampleScript({ toolName: "windsurf", displayName: "Windsurf" })
  );
  writeTextIfChanged(
    path.join(paths.adaptersTarget, "cline-host-bridge.example.ps1"),
    buildHostBridgeExampleScript({ toolName: "cline", displayName: "Cline" })
  );
  writeTextIfChanged(
    path.join(paths.adaptersTarget, "github-copilot-host-bridge.example.ps1"),
    buildHostBridgeExampleScript({ toolName: "github-copilot", displayName: "GitHub Copilot" })
  );
  writeAutoCaptureBridgeContract({
    context: {
      packageJson: workspaceService.context.packageJson
    },
    projectRoot: workspaceService.projectRoot,
    paths,
    config
  });

  return paths;
}

export function readConversationMinerConfig(paths) {
  const stored = fs.existsSync(paths.configPath) ? readJson(paths.configPath) : defaultConversationMinerConfig;
  return {
    ...defaultConversationMinerConfig,
    ...stored,
    capture: {
      ...defaultConversationMinerConfig.capture,
      ...(stored.capture || {})
    },
    autoCapture: {
      ...defaultConversationMinerConfig.autoCapture,
      ...(stored.autoCapture || {})
    }
  };
}
