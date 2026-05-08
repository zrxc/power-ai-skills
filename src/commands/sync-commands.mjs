/**
 * 同步和扫描相关命令模块
 * 职责：处理项目同步、扫描、本地技能管理、工具管理等命令
 * 涉及功能：
 *   - 项目同步（sync）
 *   - 项目扫描（scan、diff-scan）
 *   - 本地技能生成、列表、提升
 *   - 项目模式审查
 *   - 添加工具/移除工具
 *   - 清理报告
 */

import fs from "node:fs";
import path from "node:path";
import {
  formatAddToolMessage,
  formatDiffProjectScanMessage,
  formatGenerateProjectLocalSkillsMessage,
  formatListProjectLocalSkillsMessage,
  formatPlanProjectLocalPromotionsMessage,
  formatPromoteProjectLocalSkillMessage,
  formatRemoveToolMessage,
  formatReviewProjectPatternMessage,
  formatScanProjectMessage,
  formatSyncedProjectMessage,
  formatCleanReportsMessage
} from "./project-output.mjs";
import { ensureDir, readJson, writeJson } from "../shared/fs.mjs";
import {
  createAddToolSelection,
  createRemoveToolSelection,
  ensureRequestedTools,
  resolveRequestedToolSelection,
  syncToolEntrypointSelection
} from "./project-tool-selection.mjs";

function toTimestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function countActionableProjectLocalCandidates(evolutionService) {
  try {
    const payload = evolutionService.loadEvolutionCandidates()?.candidates?.candidates || [];
    return payload
      .filter((item) => item?.candidateType === "project-local-skill-draft")
      .filter((item) => item?.status === "generated" || item?.status === "review" || item?.status === "materialized")
      .length;
  } catch {
    return 0;
  }
}

function collectConversationThresholdState(conversationMinerService, minNewConversations) {
  let records = [];
  let lastAnalyzedAt = "";

  try {
    records = conversationMinerService.loadConversationRecords()?.records || [];
  } catch {
    records = [];
  }

  try {
    lastAnalyzedAt = conversationMinerService.loadProjectPatterns()?.payload?.lastAnalyzed || "";
  } catch {
    lastAnalyzedAt = "";
  }

  const lastAnalyzedTimestamp = toTimestamp(lastAnalyzedAt);
  const newConversationCount = lastAnalyzedTimestamp > 0
    ? records.filter((record) => toTimestamp(record?.timestamp) > lastAnalyzedTimestamp).length
    : records.length;

  return {
    totalConversationCount: records.length,
    newConversationCount,
    minNewConversations
  };
}

function buildSyncEvolutionFollowUpSummary(followUp) {
  if (!followUp || typeof followUp !== "object") return "No silent follow-up result was recorded.";
  if (followUp.status === "failed") {
    return `Silent evolution follow-up failed during ${followUp.mode || "unknown"}: ${followUp.error || "unknown error"}.`;
  }

  const reason = followUp.triggerReason || followUp.skipReason || "none";
  const actionSummary = [
    `status ${followUp.status || "unknown"}`,
    `mode ${followUp.mode || "unknown"}`,
    `reason ${reason}`,
    `new conversations ${followUp.newConversationCount || 0}/${followUp.minNewConversations || 0}`,
    `actionable candidates ${followUp.actionableCandidateCount || 0}`
  ];

  if (
    Number(followUp.executedActionCount || 0) > 0
    || Number(followUp.skippedActionCount || 0) > 0
    || Number(followUp.failedActionCount || 0) > 0
  ) {
    actionSummary.push(
      `actions ${followUp.executedActionCount || 0}/${followUp.skippedActionCount || 0}/${followUp.failedActionCount || 0}`
    );
  }

  return `Silent evolution follow-up ${actionSummary.join(", ")}.`;
}

function normalizeTriggerSourceType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "postinstall") return "postinstall";
  if (normalized === "manual" || normalized === "manual-sync" || normalized === "sync") return "manual-sync";
  if (normalized === "npm" || normalized === "npm-script") return "npm-script";
  return normalized || "manual-sync";
}

function formatTriggerSourceDisplay(triggerSource = {}) {
  const type = triggerSource?.type || "manual-sync";
  const label = triggerSource?.label || "";
  if (!label || label === type || (type === "manual-sync" && label === "manual sync")) {
    return type;
  }
  return `${type} (${label})`;
}

function detectSyncTriggerSource() {
  const explicitSource = String(process.env.POWER_AI_SYNC_TRIGGER_SOURCE || "").trim();
  const npmLifecycleEvent = String(process.env.npm_lifecycle_event || "").trim();
  const npmLifecycleScript = String(process.env.npm_lifecycle_script || "").trim();

  if (explicitSource) {
    const type = normalizeTriggerSourceType(explicitSource);
    return {
      type,
      label: type === "manual-sync" ? "manual sync" : explicitSource,
      detection: "env",
      npmLifecycleEvent,
      npmLifecycleScript
    };
  }

  if (npmLifecycleEvent.toLowerCase() === "postinstall") {
    return {
      type: "postinstall",
      label: "postinstall",
      detection: "npm-lifecycle",
      npmLifecycleEvent,
      npmLifecycleScript
    };
  }

  if (npmLifecycleEvent) {
    return {
      type: "npm-script",
      label: npmLifecycleEvent,
      detection: "npm-lifecycle",
      npmLifecycleEvent,
      npmLifecycleScript
    };
  }

  return {
    type: "manual-sync",
    label: "manual sync",
    detection: "default",
    npmLifecycleEvent: "",
    npmLifecycleScript: ""
  };
}

function createHistoryEntry(payload) {
  const followUp = payload.followUp || {};
  return {
    generatedAt: payload.generatedAt,
    trigger: payload.trigger,
    triggerSource: payload.triggerSource || {
      type: "manual-sync",
      label: "manual sync",
      detection: "default"
    },
    status: followUp.status || "unknown",
    mode: followUp.mode || "unknown",
    reason: followUp.triggerReason || followUp.skipReason || "none",
    summary: payload.summary || "",
    newConversationCount: Number(followUp.newConversationCount || 0),
    minNewConversations: Number(followUp.minNewConversations || 0),
    actionableCandidateCount: Number(followUp.actionableCandidateCount || 0),
    executedActionCount: Number(followUp.executedActionCount || 0),
    skippedActionCount: Number(followUp.skippedActionCount || 0),
    failedActionCount: Number(followUp.failedActionCount || 0)
  };
}

function summarizeSyncEvolutionFollowUpHistory(entries = []) {
  const sourceMap = new Map();
  const statusMap = new Map();

  for (const entry of entries) {
    const sourceType = entry?.triggerSource?.type || "manual-sync";
    const sourceLabel = entry?.triggerSource?.label || (sourceType === "manual-sync" ? "manual sync" : sourceType);
    const sourceKey = `${sourceType}::${sourceLabel}`;
    const existingSource = sourceMap.get(sourceKey) || {
      type: sourceType,
      label: sourceLabel,
      display: formatTriggerSourceDisplay({ type: sourceType, label: sourceLabel }),
      count: 0
    };
    existingSource.count += 1;
    sourceMap.set(sourceKey, existingSource);

    const statusKey = `${entry?.status || "unknown"}::${entry?.mode || "unknown"}`;
    const existingStatus = statusMap.get(statusKey) || {
      status: entry?.status || "unknown",
      mode: entry?.mode || "unknown",
      count: 0
    };
    existingStatus.count += 1;
    statusMap.set(statusKey, existingStatus);
  }

  return {
    totalEntries: entries.length,
    sourceBreakdown: [...sourceMap.values()].sort((left, right) => right.count - left.count || left.display.localeCompare(right.display, "zh-CN")),
    statusBreakdown: [...statusMap.values()].sort((left, right) => right.count - left.count || left.status.localeCompare(right.status, "zh-CN"))
  };
}

function readSyncEvolutionFollowUpHistory(historyJsonPath) {
  if (!fs.existsSync(historyJsonPath)) return [];
  try {
    const payload = readJson(historyJsonPath);
    return Array.isArray(payload?.entries) ? payload.entries : [];
  } catch {
    return [];
  }
}

function buildSyncEvolutionFollowUpHistoryMarkdown(historyPayload) {
  const lines = [
    "# Sync Evolution Follow-Up History",
    "",
    `- updated at: ${historyPayload.updatedAt}`,
    `- retained entries: ${historyPayload.entries.length}/${historyPayload.maxEntries}`,
    "",
    "## Recent Entries"
  ];

  if (historyPayload.entries.length === 0) {
    lines.push("- none");
    return `${lines.join("\n")}\n`;
  }

  for (const entry of historyPayload.entries) {
    lines.push(
      `- ${entry.generatedAt}: ${entry.status} / ${entry.mode} / ${formatTriggerSourceDisplay(entry.triggerSource)} / ${entry.reason}`
    );
    lines.push(`  summary: ${entry.summary || "none"}`);
  }

  if ((historyPayload.summary?.sourceBreakdown || []).length > 0) {
    lines.push("", "## Source Summary");
    for (const item of historyPayload.summary.sourceBreakdown) {
      lines.push(`- ${item.display}: ${item.count}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildSyncEvolutionFollowUpMarkdown(payload) {
  const followUp = payload.followUp || {};
  const lines = [
    "# Sync Evolution Follow-Up",
    "",
    `- generated at: ${payload.generatedAt}`,
    `- project: ${payload.projectRoot}`,
    `- trigger: ${payload.trigger}`,
    `- trigger source: ${payload.triggerSource?.type || "unknown"} (${payload.triggerSource?.label || "unknown"})`,
    `- status: ${followUp.status || "unknown"}`,
    `- mode: ${followUp.mode || "unknown"}`,
    `- reason: ${followUp.triggerReason || followUp.skipReason || "none"}`,
    `- new conversations: ${followUp.newConversationCount || 0}/${followUp.minNewConversations || 0}`,
    `- actionable candidates: ${followUp.actionableCandidateCount || 0}`,
    `- actions: executed ${followUp.executedActionCount || 0}, skipped ${followUp.skippedActionCount || 0}, failed ${followUp.failedActionCount || 0}`,
    `- opt-out: ${payload.optOutEnvVar}`,
    `- recommended check command: \`${payload.recommendedCheckCommand}\``,
    `- history report: \`${payload.artifactPaths?.historyReportPath || ""}\``,
    `- summary: ${payload.summary}`
  ];

  if (followUp.error) {
    lines.push(`- error: ${followUp.error}`);
  }

  return `${lines.join("\n")}\n`;
}

/**
 * 创建同步和扫描命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.workspaceService - 工作空间服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @param {Object} params.evolutionService - 进化服务
 * @param {Object} params.projectScanService - 项目扫描服务
 * @param {Object} params.teamPolicyService - 团队策略服务
 * @param {Object} params.governanceContextService - 治理上下文服务
 * @param {string} params.projectRoot - 项目根目录
 * @returns {Object} 同步和扫描命令对象
 */
export function createSyncCommands({
  cliArgs,
  selectionService,
  workspaceService,
  conversationMinerService,
  evolutionService,
  projectScanService,
  teamPolicyService,
  governanceContextService,
  projectRoot
}) {
  /**
   * 获取单个选项值
   * @param {string} optionName - 选项名称
   * @param {string} fallback - 默认值
   * @returns {string} 选项值
   */
  function getSingleOption(optionName, fallback = "") {
    return (selectionService.getOptionValues(optionName) || [])[0] || fallback;
  }

  /**
   * 获取单个选项值（支持位置参数）
   * @param {string} optionName - 选项名称
   * @param {string} fallback - 默认值
   * @returns {string} 选项值
   */
  function getSingleOptionOrPositional(optionName, fallback = "") {
    return getSingleOption(optionName, cliArgs.positionals[0] || fallback);
  }

  /**
   * 获取数值型选项
   * @param {string} optionName - 选项名称
   * @returns {number} 数值
   */
  function getNumericOption(optionName) {
    return Number(getSingleOption(optionName, 0));
  }

  /**
   * 判断是否应重新生成本地技能
   * @returns {boolean}
   */
  function shouldRegenerateProjectLocal() {
    return selectionService.hasFlag("--regenerate-project-local");
  }

  /**
   * 获取要提升的技能名称
   * @returns {string}
   */
  function getPromoteSkillName() {
    return getSingleOptionOrPositional("--skill");
  }

  /**
   * 获取模式ID
   * @returns {string}
   */
  function getPatternId() {
    return getSingleOptionOrPositional("--pattern");
  }

  /**
   * 刷新治理上下文
   * @param {string} trigger - 触发器
   * @param {Object} [options] - 选项
   * @param {string} [options.baselineStatus] - 基线状态
   */
  function refreshGovernanceContext(trigger, { baselineStatus = "" } = {}) {
    return governanceContextService?.refreshProjectGovernanceContext({
      trigger,
      baselineStatus
    });
  }

  /**
   * JSON 输出辅助函数
   */
  function printJson(payload) {
    console.log(JSON.stringify(payload, null, 2));
  }

  function printJsonAndExit(payload) {
    if (!selectionService.hasFlag("--json")) return false;
    printJson(payload);
    return true;
  }

  function getSyncEvolutionFollowUpArtifactPaths() {
    const reportsRoot = workspaceService.getReportsRoot();
    return {
      reportsRoot,
      jsonPath: path.join(reportsRoot, "sync-evolution-follow-up.json"),
      reportPath: path.join(reportsRoot, "sync-evolution-follow-up.md"),
      historyJsonPath: path.join(reportsRoot, "sync-evolution-follow-up-history.json"),
      historyReportPath: path.join(reportsRoot, "sync-evolution-follow-up-history.md")
    };
  }

  function persistSyncEvolutionFollowUpArtifact(followUp) {
    const {
      reportsRoot,
      jsonPath,
      reportPath,
      historyJsonPath,
      historyReportPath
    } = getSyncEvolutionFollowUpArtifactPaths();
    ensureDir(reportsRoot);
    const triggerSource = detectSyncTriggerSource();
    const payload = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      projectRoot,
      trigger: "sync",
      triggerSource,
      recommendedCheckCommand: "npx power-ai-skills status --format summary",
      optOutEnvVar: "POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP=1",
      summary: buildSyncEvolutionFollowUpSummary(followUp),
      followUp: {
        status: followUp?.status || "unknown",
        mode: followUp?.mode || "unknown",
        triggered: Boolean(followUp?.triggered),
        triggerReason: followUp?.triggerReason || "",
        skipReason: followUp?.skipReason || "",
        error: followUp?.error || "",
        newConversationCount: Number(followUp?.newConversationCount || 0),
        minNewConversations: Number(followUp?.minNewConversations || 0),
        actionableCandidateCount: Number(followUp?.actionableCandidateCount || 0),
        executedActionCount: Number(followUp?.executedActionCount || 0),
        skippedActionCount: Number(followUp?.skippedActionCount || 0),
        failedActionCount: Number(followUp?.failedActionCount || 0)
      },
      artifactPaths: {
        jsonPath,
        reportPath,
        historyJsonPath,
        historyReportPath
      }
    };
    const maxHistoryEntries = 5;
    const previousEntries = readSyncEvolutionFollowUpHistory(historyJsonPath);
    const historyPayload = {
      schemaVersion: 1,
      updatedAt: payload.generatedAt,
      projectRoot,
      maxEntries: maxHistoryEntries,
      entries: [
        createHistoryEntry(payload),
        ...previousEntries
      ].slice(0, maxHistoryEntries),
      summary: {},
      artifactPaths: {
        jsonPath: historyJsonPath,
        reportPath: historyReportPath,
        latestJsonPath: jsonPath,
        latestReportPath: reportPath
      }
    };
    historyPayload.summary = summarizeSyncEvolutionFollowUpHistory(historyPayload.entries);
    writeJson(jsonPath, payload);
    fs.writeFileSync(reportPath, buildSyncEvolutionFollowUpMarkdown(payload), "utf8");
    writeJson(historyJsonPath, historyPayload);
    fs.writeFileSync(historyReportPath, buildSyncEvolutionFollowUpHistoryMarkdown(historyPayload), "utf8");
    return payload;
  }

  function buildSyncEvolutionFollowUpGate() {
    if (process.env.POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP === "1") {
      return {
        status: "skipped",
        mode: "gate-skip",
        skipReason: "env-disabled",
        newConversationCount: 0,
        minNewConversations: 0,
        actionableCandidateCount: 0
      };
    }

    const policyResult = evolutionService.showEvolutionPolicy();
    const policy = policyResult.policy || {};
    const minNewConversations = Number(policy.minConversationCountToAnalyze || 3);
    const thresholdState = collectConversationThresholdState(conversationMinerService, minNewConversations);
    const actionableCandidateCount = countActionableProjectLocalCandidates(evolutionService);
    const automaticFollowUpEnabled = Boolean(
      policy.autoAnalyzeEnabled
      || policy.allowAutoProjectLocalSkillRefresh
      || policy.autoRefreshGovernanceContext
      || policy.autoRefreshGovernanceSummary
    );
    const canRunEvolutionCycle = Boolean(
      policy.autoAnalyzeEnabled
      && thresholdState.totalConversationCount > 0
      && thresholdState.newConversationCount >= minNewConversations
    );
    const canRunActionOnlyFollowUp = Boolean(
      policy.allowAutoProjectLocalSkillRefresh
      && actionableCandidateCount > 0
    );

    if (!automaticFollowUpEnabled) {
      return {
        status: "skipped",
        mode: "gate-skip",
        skipReason: "policy-disabled",
        ...thresholdState,
        actionableCandidateCount
      };
    }

    if (canRunEvolutionCycle) {
      return {
        status: "ready",
        mode: "run-evolution-cycle",
        triggerReason: "threshold-reached",
        ...thresholdState,
        actionableCandidateCount
      };
    }

    if (canRunActionOnlyFollowUp) {
      return {
        status: "ready",
        mode: "apply-evolution-actions",
        triggerReason: "actionable-candidates-available",
        ...thresholdState,
        actionableCandidateCount
      };
    }

    if (!policy.autoAnalyzeEnabled) {
      return {
        status: "skipped",
        mode: "gate-skip",
        skipReason: "auto-analyze-disabled",
        ...thresholdState,
        actionableCandidateCount
      };
    }

    if (thresholdState.totalConversationCount === 0) {
      return {
        status: "skipped",
        mode: "gate-skip",
        skipReason: "no-conversations",
        ...thresholdState,
        actionableCandidateCount
      };
    }

    return {
      status: "skipped",
      mode: "gate-skip",
      skipReason: "below-threshold",
      ...thresholdState,
      actionableCandidateCount
    };
  }

  function runSyncEvolutionFollowUp() {
    const gate = buildSyncEvolutionFollowUpGate();
    if (gate.mode === "gate-skip") {
      return gate;
    }

    if (gate.mode === "apply-evolution-actions") {
      const result = evolutionService.applyEvolutionActions({ trigger: "sync" });
      return {
        ...gate,
        status: result.summary.executed > 0 ? "executed" : "skipped",
        executedActionCount: Number(result.summary.executed || 0),
        skippedActionCount: Number(result.summary.skipped || 0),
        failedActionCount: Number(result.summary.failed || 0),
        governanceContext: result.governanceContext || null
      };
    }

    const result = evolutionService.runEvolutionCycle({});
    return {
      ...gate,
      status: result.status,
      triggered: result.triggered,
      triggerReason: result.triggerReason || gate.triggerReason,
      skipReason: result.skipReason || "",
      executedActionCount: Number(result.evolutionActions?.summary?.executed || 0),
      skippedActionCount: Number(result.evolutionActions?.summary?.skipped || 0),
      failedActionCount: Number(result.evolutionActions?.summary?.failed || 0),
      governanceContext: result.governanceContext || null
    };
  }

  /**
   * 同步命令 - 同步项目结构和配置
   * 保持项目结构与当前选择一致
   */
  function syncCommand() {
    const selection = selectionService.resolveSelection();
    workspaceService.syncProjectStructure(selection, { syncSkills: true });
    conversationMinerService.ensureConversationRoots();
    evolutionService.syncEvolutionPolicy({ trigger: "sync" });
    teamPolicyService.syncProjectProfileDecision({
      selection,
      trigger: "sync"
    });
    let evolutionFollowUp = null;
    let evolutionFollowUpResult = null;
    try {
      evolutionFollowUpResult = runSyncEvolutionFollowUp();
      evolutionFollowUp = {
        status: evolutionFollowUpResult.status,
        mode: evolutionFollowUpResult.mode,
        triggered: evolutionFollowUpResult.triggered,
        triggerReason: evolutionFollowUpResult.triggerReason,
        skipReason: evolutionFollowUpResult.skipReason,
        newConversationCount: evolutionFollowUpResult.newConversationCount || 0,
        minNewConversations: evolutionFollowUpResult.minNewConversations || 0,
        actionableCandidateCount: evolutionFollowUpResult.actionableCandidateCount || 0,
        executedActionCount: evolutionFollowUpResult.executedActionCount || 0,
        skippedActionCount: evolutionFollowUpResult.skippedActionCount || 0,
        failedActionCount: evolutionFollowUpResult.failedActionCount || 0
      };
    } catch (error) {
      evolutionFollowUp = {
        status: "failed",
        mode: "error",
        error: error?.message || String(error)
      };
    }
    try {
      persistSyncEvolutionFollowUpArtifact(evolutionFollowUp);
    } catch {
      // Keep sync non-blocking even if the lightweight follow-up artifact cannot be written.
    }
    if (!evolutionFollowUpResult?.governanceContext) refreshGovernanceContext("sync");
    console.log(formatSyncedProjectMessage({
      projectRoot,
      selectionSummary: selectionService.getSelectionSummary(selection),
      evolutionFollowUp
    }));
  }

  /**
   * 扫描项目命令 - 执行项目分析并写入结果
   */
  function scanProjectCommand() {
    const result = projectScanService.writeProjectAnalysis();
    console.log(formatScanProjectMessage({ projectRoot, result }));
  }

  /**
   * 差异扫描命令 - 加载并显示分析制品的差异
   */
  function diffProjectScanCommand() {
    const result = projectScanService.loadAnalysisArtifacts();
    console.log(formatDiffProjectScanMessage({ projectRoot, result }));
  }

  /**
   * 生成本地技能命令 - 基于项目扫描结果生成项目本地技能
   */
  function generateProjectLocalSkillsCommand() {
    const result = projectScanService.generateProjectLocalSkills({
      regenerate: shouldRegenerateProjectLocal()
    });
    console.log(formatGenerateProjectLocalSkillsMessage({ projectRoot, result }));
  }

  /**
   * 列出本地技能命令 - 显示项目本地技能列表
   */
  function listProjectLocalSkillsCommand() {
    const result = projectScanService.listProjectLocalSkills();
    console.log(formatListProjectLocalSkillsMessage({ projectRoot, result }));
  }

  /**
   * 提升本地技能命令 - 将项目本地技能提升为全局技能
   * 需要指定技能名称，支持 --force 强制提升
   */
  function planProjectLocalPromotionsCommand() {
    const result = projectScanService.planProjectLocalPromotions({
      skillName: getPromoteSkillName()
    });
    if (printJsonAndExit(result)) return;
    console.log(formatPlanProjectLocalPromotionsMessage({ projectRoot, result }));
  }

  function promoteProjectLocalSkillCommand() {
    const skillName = getPromoteSkillName();
    const result = projectScanService.promoteProjectLocalSkill({
      skillName,
      force: selectionService.hasFlag("--force")
    });
    console.log(formatPromoteProjectLocalSkillMessage(result));
  }

  /**
   * 审查项目模式命令 - 审查项目中的模式
   * 支持决策（accept/reject）、注释和清除操作
   */
  function reviewProjectPatternCommand() {
    const result = projectScanService.reviewProjectPattern({
      patternId: getPatternId(),
      decision: getSingleOption("--decision"),
      note: getSingleOption("--note"),
      clear: selectionService.hasFlag("--clear")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatReviewProjectPatternMessage(result));
  }

  /**
   * 添加工具命令
   * 将新工具添加到项目配置中
   */
  function addToolCommand() {
    const requestedSelection = resolveRequestedToolSelection(selectionService);
    ensureRequestedTools(requestedSelection, "add-tool");
    const selection = createAddToolSelection({ selectionService, requestedSelection });

    const requestedPolicyEvaluation = teamPolicyService.assertSelectionAllowed({
      toolNames: selection.selectedTools,
      projectProfileName: selection.selectedProjectProfile,
      commandName: "add-tool"
    });
    for (const warning of requestedPolicyEvaluation.warnings) {
      console.log(`[power-ai-skills] ${warning}`);
    }

    syncToolEntrypointSelection({ workspaceService, conversationMinerService, selection });
    teamPolicyService.syncProjectProfileDecision({
      selection,
      trigger: "add-tool"
    });
    refreshGovernanceContext("add-tool");
    console.log(formatAddToolMessage({
      requestedSelection,
      selectionSummary: selectionService.getSelectionSummary(selection)
    }));
  }

  /**
   * 移除工具命令
   * 从项目配置中移除指定的工具
   */
  function removeToolCommand() {
    const requestedSelection = resolveRequestedToolSelection(selectionService);
    ensureRequestedTools(requestedSelection, "remove-tool");
    const selection = createRemoveToolSelection({ selectionService, requestedSelection });

    syncToolEntrypointSelection({ workspaceService, conversationMinerService, selection });
    workspaceService.removeEntrypointsForTools(requestedSelection.selectedTools);
    teamPolicyService.syncProjectProfileDecision({
      selection,
      trigger: "remove-tool"
    });
    refreshGovernanceContext("remove-tool");
    console.log(formatRemoveToolMessage({
      requestedSelection,
      selectionSummary: selectionService.getSelectionSummary(selection)
    }));
  }

  /**
   * 清理报告命令 - 清理项目中的报告文件
   */
  function cleanReportsCommand() {
    const result = workspaceService.cleanReports();
    console.log(formatCleanReportsMessage(result));
  }

  return {
    syncCommand,
    scanProjectCommand,
    diffProjectScanCommand,
    generateProjectLocalSkillsCommand,
    listProjectLocalSkillsCommand,
    planProjectLocalPromotionsCommand,
    promoteProjectLocalSkillCommand,
    reviewProjectPatternCommand,
    addToolCommand,
    removeToolCommand,
    cleanReportsCommand
  };
}
