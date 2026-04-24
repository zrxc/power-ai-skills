/**
 * Evolution 服务主入口
 * 
 * 协调策略、候选项、行动、提案四个子模块，
 * 提供完整的演化周期管理。
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../../scripts/shared.mjs";
import {
  getDefaultEvolutionPolicy,
  normalizeEvolutionPolicy,
  validateEvolutionPolicyConfig
} from "./policy.mjs";
import { createEvolutionServiceCore } from "./service-core.mjs";
import {
  buildEvolutionProposalAgingSummary,
  summarizeAppliedEvolutionArtifacts,
  defaultEvolutionProposalReviewSlaDays,
  defaultEvolutionProposalAcceptedApplySlaDays
} from "./proposals.mjs";

export {
  getDefaultEvolutionPolicy,
  normalizeEvolutionPolicy,
  validateEvolutionPolicyConfig,
  buildEvolutionProposalAgingSummary,
  summarizeAppliedEvolutionArtifacts,
  defaultEvolutionProposalReviewSlaDays,
  defaultEvolutionProposalAcceptedApplySlaDays
};

function toTimestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function collectLastAnalyzedState(conversationMinerService) {
  try {
    const { payload, paths } = conversationMinerService.loadProjectPatterns();
    return {
      available: true,
      lastAnalyzedAt: payload.lastAnalyzed || "",
      projectPatternsPath: paths.projectPatternsPath,
      patternSummaryPath: paths.patternSummaryPath
    };
  } catch {
    return {
      available: false,
      lastAnalyzedAt: "",
      projectPatternsPath: "",
      patternSummaryPath: ""
    };
  }
}

function buildRecommendedActions({
  force,
  dryRun,
  totalConversationCount,
  newConversationCount,
  minNewConversations,
  shouldTrigger,
  skipReason
}) {
  const actions = [];

  if (dryRun && shouldTrigger) {
    actions.push("Run `npx power-ai-skills run-evolution-cycle --json` to execute this evolution cycle for real.");
  }

  if (!shouldTrigger && skipReason === "below-threshold") {
    actions.push(`Wait until at least ${minNewConversations} new conversations are available, or run \`npx power-ai-skills run-evolution-cycle --force --json\`.`);
  }

  if (!shouldTrigger && skipReason === "no-conversations") {
    actions.push("Capture project conversations first, then re-run `npx power-ai-skills run-evolution-cycle --json`.");
  }

  if (!shouldTrigger && skipReason === "auto-analyze-disabled") {
    actions.push("Run `npx power-ai-skills show-evolution-policy --json` to review the current policy, then enable `autoAnalyzeEnabled` or use `--force` for a manual cycle.");
  }

  if (shouldTrigger && !dryRun) {
    actions.push("Review `.power-ai/reports/evolution-cycle-report.md` and `.power-ai/reports/governance-summary.md` for the latest automated analysis result.");
  }

  if (force && totalConversationCount === 0) {
    actions.push("The cycle was forced without any captured conversations; future runs should rely on real project sessions.");
  }

  if (newConversationCount > 0 && !dryRun) {
    actions.push("If high-confidence patterns appear, continue with `review-conversation-pattern` or future candidate automation steps.");
  }

  return unique(actions);
}

function buildEvolutionCycleMarkdown(payload) {
  const lines = [
    "# Evolution Cycle Report",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- projectRoot: \`${payload.projectRoot}\``,
    `- status: \`${payload.status}\``,
    `- triggered: ${payload.triggered}`,
    `- dryRun: ${payload.dryRun}`,
    `- forced: ${payload.force}`,
    `- cycleStartedAt: \`${payload.cycleStartedAt}\``,
    `- cycleFinishedAt: \`${payload.cycleFinishedAt}\``,
    "",
    "## Evolution Policy",
    "",
    `- policy path: \`${payload.policy.policyPath}\``,
    `- policy source: \`${payload.policy.source}\``,
    `- validation ok: ${payload.policy.validation.ok}`,
    `- auto analyze enabled: ${payload.policy.autoAnalyzeEnabled}`,
    `- auto refresh governance context: ${payload.policy.autoRefreshGovernanceContext}`,
    `- auto refresh governance summary: ${payload.policy.autoRefreshGovernanceSummary}`,
    `- min conversation count to analyze: ${payload.policy.minConversationCountToAnalyze}`,
    "",
    "## Trigger",
    "",
    `- trigger reason: \`${payload.triggerReason}\``,
    `- skip reason: ${payload.skipReason ? `\`${payload.skipReason}\`` : "none"}`,
    `- min new conversations: ${payload.thresholds.minNewConversations}`,
    `- total conversations: ${payload.metrics.totalConversationCount}`,
    `- new conversations since last analyze: ${payload.metrics.newConversationCount}`,
    `- last analyzed at: ${payload.metrics.lastAnalyzedAt ? `\`${payload.metrics.lastAnalyzedAt}\`` : "never"}`,
    "",
    "## Actions",
    "",
    `- analyze-patterns executed: ${payload.actions.analyzePatternsExecuted}`,
    `- governance context refreshed: ${payload.actions.governanceContextRefreshed}`,
    `- governance summary executed: ${payload.actions.governanceSummaryExecuted}`,
    "",
    "## Outputs",
    "",
    `- evolution report json: \`${payload.jsonPath}\``,
    `- evolution report markdown: \`${payload.reportPath}\``,
    `- project patterns: ${payload.outputs.projectPatternsPath ? `\`${payload.outputs.projectPatternsPath}\`` : "none"}`,
    `- pattern summary: ${payload.outputs.patternSummaryPath ? `\`${payload.outputs.patternSummaryPath}\`` : "none"}`,
    `- governance context: ${payload.outputs.governanceContextPath ? `\`${payload.outputs.governanceContextPath}\`` : "none"}`,
    `- governance summary: ${payload.outputs.governanceSummaryPath ? `\`${payload.outputs.governanceSummaryPath}\`` : "none"}`,
    "",
    "## Recommended Actions",
    ""
  ];

  if ((payload.recommendedActions || []).length === 0) {
    lines.push("- none");
  } else {
    for (const action of payload.recommendedActions) {
      lines.push(`- ${action}`);
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function createEvolutionService({
  context,
  projectRoot,
  workspaceService,
  conversationMinerService,
  governanceContextService,
  governanceSummaryService,
  teamPolicyService
}) {
  const core = createEvolutionServiceCore({
    context, projectRoot, workspaceService, conversationMinerService,
    governanceContextService, governanceSummaryService, teamPolicyService
  });

  function runEvolutionCycle({
    force = false,
    dryRun = false,
    minNewConversations = 0
  } = {}) {
    const cycleStartedAt = new Date().toISOString();
    const paths = core.getEvolutionPaths();
    const { reportsRoot, reportPath, jsonPath } = {
      reportsRoot: paths.reportsRoot,
      reportPath: paths.evolutionReportPath,
      jsonPath: paths.evolutionReportJsonPath
    };
    const policyState = core.loadEvolutionPolicy({ ensureExists: true });
    const effectiveThreshold = Number(minNewConversations) > 0
      ? Number(minNewConversations)
      : policyState.normalizedPolicy.minConversationCountToAnalyze;
    const thresholds = { minNewConversations: effectiveThreshold };

    const { records } = conversationMinerService.loadConversationRecords();
    const lastAnalyzed = collectLastAnalyzedState(conversationMinerService);
    const lastAnalyzedTimestamp = toTimestamp(lastAnalyzed.lastAnalyzedAt);
    const newRecords = lastAnalyzedTimestamp > 0
      ? records.filter((record) => toTimestamp(record.timestamp) > lastAnalyzedTimestamp)
      : records;
    const totalConversationCount = records.length;
    const newConversationCount = newRecords.length;

    let triggerReason = "threshold-reached";
    let skipReason = "";
    let shouldTrigger = force;

    if (force) {
      triggerReason = "forced";
    } else if (!policyState.normalizedPolicy.autoAnalyzeEnabled) {
      shouldTrigger = false;
      triggerReason = "auto-analyze-disabled";
      skipReason = "auto-analyze-disabled";
    } else if (totalConversationCount === 0) {
      shouldTrigger = false;
      triggerReason = "no-conversations";
      skipReason = "no-conversations";
    } else if (newConversationCount >= thresholds.minNewConversations) {
      shouldTrigger = true;
      triggerReason = "threshold-reached";
    } else {
      shouldTrigger = false;
      triggerReason = "below-threshold";
      skipReason = "below-threshold";
    }

    let analyzeResult = null;
    let evolutionCandidatesResult = null;
    let evolutionActionsResult = null;
    let evolutionProposalsResult = null;
    let governanceContextResult = null;
    let governanceSummaryResult = null;

    if (shouldTrigger && !dryRun) {
      analyzeResult = conversationMinerService.analyzePatterns({});
      evolutionCandidatesResult = core.generateEvolutionCandidates({
        trigger: "run-evolution-cycle",
        patternsPayload: analyzeResult.payload
      });
      evolutionActionsResult = core.applyEvolutionActions({
        trigger: "run-evolution-cycle"
      });
      evolutionProposalsResult = core.generateEvolutionProposals({
        trigger: "run-evolution-cycle"
      });
      governanceContextResult = evolutionActionsResult.governanceContext || null;
      governanceSummaryResult = evolutionActionsResult.governanceSummary || null;
    }

    const cycleFinishedAt = new Date().toISOString();
    const payload = {
      generatedAt: cycleFinishedAt,
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      status: shouldTrigger ? (dryRun ? "dry-run" : "executed") : "skipped",
      triggered: shouldTrigger,
      triggerReason,
      skipReason,
      force,
      dryRun,
      policy: {
        policyPath: policyState.policyPath,
        source: policyState.source,
        exists: policyState.exists,
        validation: policyState.validation,
        ...policyState.normalizedPolicy
      },
      cycleStartedAt,
      cycleFinishedAt,
      thresholds,
      metrics: {
        totalConversationCount,
        newConversationCount,
        lastAnalyzedAt: lastAnalyzed.lastAnalyzedAt || "",
        lastAnalyzedAvailable: lastAnalyzed.available
      },
      actions: {
        analyzePatternsExecuted: Boolean(analyzeResult),
        evolutionCandidatesGenerated: Boolean(evolutionCandidatesResult),
        evolutionActionsApplied: Boolean(evolutionActionsResult),
        evolutionProposalsGenerated: Boolean(evolutionProposalsResult),
        governanceContextRefreshed: Boolean(governanceContextResult),
        governanceSummaryExecuted: Boolean(governanceSummaryResult)
      },
      outputs: {
        projectPatternsPath: analyzeResult?.projectPatternsPath || lastAnalyzed.projectPatternsPath || "",
        patternSummaryPath: analyzeResult?.patternSummaryPath || lastAnalyzed.patternSummaryPath || "",
        evolutionCandidatesPath: evolutionCandidatesResult?.candidatesPath || paths.evolutionCandidatesTarget,
        evolutionSummaryPath: evolutionCandidatesResult?.reportPath || paths.evolutionSummaryPath,
        evolutionActionsPath: evolutionActionsResult?.actionsPath || paths.evolutionActionsTarget,
        evolutionProposalsPath: evolutionProposalsResult?.proposalsPath || paths.evolutionProposalsTarget,
        governanceContextPath: governanceContextResult?.contextPath || governanceContextService.getContextPaths().projectGovernanceContextTarget,
        governanceSummaryPath: governanceSummaryResult?.reportPath || path.join(reportsRoot, "governance-summary.md")
      }
    };

    payload.recommendedActions = buildRecommendedActions({
      force, dryRun, totalConversationCount, newConversationCount,
      minNewConversations: thresholds.minNewConversations, shouldTrigger, skipReason
    });

    ensureDir(reportsRoot);
    writeJson(jsonPath, payload);
    fs.writeFileSync(reportPath, buildEvolutionCycleMarkdown({ ...payload, reportPath, jsonPath }), "utf8");

    return {
      ...payload, reportPath, jsonPath, analyzeResult,
      evolutionCandidates: evolutionCandidatesResult || null,
      evolutionActions: evolutionActionsResult || null,
      evolutionProposals: evolutionProposalsResult || null,
      governanceContext: governanceContextResult || null,
      governanceSummary: governanceSummaryResult || null
    };
  }

  return {
    ...core,
    runEvolutionCycle
  };
}
