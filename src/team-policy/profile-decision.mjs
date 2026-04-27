/**
 * Team Policy Profile Decision 模块
 * 
 * 负责：项目配置决策的加载、持久化、同步和审核
 */

import { writeJson } from "../shared/fs.mjs";
import { readJsonIfExists } from "./validation.mjs";
import {
  normalizeStringArray,
  normalizeIsoDate,
  normalizeReviewDate,
  resolveReviewDeadlineState,
  flattenRecommendationSignals,
  createProjectProfileDecisionHistory,
  appendProjectProfileDecisionHistory,
  resolveProjectProfileDriftStatus,
  buildProjectProfileDecisionRemediation,
  buildProjectProfileDecisionReviewRemediation,
  stableStringify
} from "./helpers.mjs";

const projectProfileDecisionStates = new Set(["auto-recommended", "accepted", "rejected", "deferred"]);

export function createProfileDecisionManager({ workspaceService, selectionService }) {
  function loadProjectProfileDecision() {
    const { projectProfileDecisionTarget } = workspaceService.getPowerAiPaths();
    return readJsonIfExists(projectProfileDecisionTarget);
  }

  function loadProjectProfileDecisionHistory() {
    const { projectProfileDecisionHistoryTarget } = workspaceService.getPowerAiPaths();
    const history = readJsonIfExists(projectProfileDecisionHistoryTarget);
    return history && typeof history === "object"
      ? {
        schemaVersion: history.schemaVersion || 1,
        entries: Array.isArray(history.entries) ? history.entries : []
      }
      : createProjectProfileDecisionHistory();
  }

  function buildProjectProfileDecisionState({
    selection = resolveCurrentSelection(selectionService).selection,
    recommendation = selectionService.detectProjectProfileRecommendation
      ? selectionService.detectProjectProfileRecommendation()
      : {
        recommendedProjectProfile: "",
        source: "none",
        reason: "",
        signals: {}
      },
    persistedDecision = loadProjectProfileDecision()
  } = {}) {
    const selectedProjectProfile = selection?.selectedProjectProfile || "";
    const recommendedProjectProfile = recommendation?.recommendedProjectProfile || "";
    const driftStatus = resolveProjectProfileDriftStatus({
      selectedProjectProfile,
      recommendedProjectProfile
    });
    const normalizedDecision = projectProfileDecisionStates.has(persistedDecision?.decision)
      ? persistedDecision.decision
      : "auto-recommended";
    const sourceSignals = flattenRecommendationSignals(recommendation);
    const state = {
      schemaVersion: 1,
      selectedProjectProfile,
      recommendedProjectProfile,
      decision: normalizedDecision,
      decisionReason: persistedDecision?.decisionReason || recommendation?.reason || "",
      decisionSource: persistedDecision?.decisionSource || "sync",
      decidedBy: persistedDecision?.decidedBy || "system",
      decidedAt: normalizeIsoDate(persistedDecision?.decidedAt) || new Date().toISOString(),
      sourceSignals,
      nextReviewAt: normalizeReviewDate(persistedDecision?.nextReviewAt || ""),
      recommendationSource: recommendation?.source || "none",
      recommendationReason: recommendation?.reason || "",
      driftStatus,
      exists: Boolean(persistedDecision),
      pendingReview: driftStatus === "drift" && normalizedDecision === "auto-recommended",
      pendingMigration: driftStatus === "drift" && normalizedDecision === "accepted",
      ...resolveReviewDeadlineState(normalizeReviewDate(persistedDecision?.nextReviewAt || ""))
    };

    return {
      ...state,
      remediation: buildProjectProfileDecisionRemediation(state),
      reviewRemediation: buildProjectProfileDecisionReviewRemediation(state)
    };
  }

  function persistProjectProfileDecision(decisionState, { trigger = "sync" } = {}) {
    const {
      projectProfileDecisionTarget,
      projectProfileDecisionHistoryTarget
    } = workspaceService.getPowerAiPaths();
    const history = appendProjectProfileDecisionHistory(loadProjectProfileDecisionHistory(), {
      recordedAt: new Date().toISOString(),
      trigger,
      snapshot: decisionState
    });

    writeJson(projectProfileDecisionTarget, {
      schemaVersion: 1,
      selectedProjectProfile: decisionState.selectedProjectProfile || "",
      recommendedProjectProfile: decisionState.recommendedProjectProfile || "",
      decision: decisionState.decision || "auto-recommended",
      decisionReason: decisionState.decisionReason || "",
      decisionSource: decisionState.decisionSource || "sync",
      decidedBy: decisionState.decidedBy || "system",
      decidedAt: decisionState.decidedAt || new Date().toISOString(),
      sourceSignals: normalizeStringArray(decisionState.sourceSignals || []),
      nextReviewAt: normalizeReviewDate(decisionState.nextReviewAt || ""),
      recommendationSource: decisionState.recommendationSource || "none",
      recommendationReason: decisionState.recommendationReason || ""
    });
    writeJson(projectProfileDecisionHistoryTarget, history);
    return {
      ...decisionState,
      decisionPath: projectProfileDecisionTarget,
      historyPath: projectProfileDecisionHistoryTarget,
      historyCount: history.entries.length
    };
  }

  function syncProjectProfileDecision({ selection = resolveCurrentSelection(selectionService).selection, trigger = "sync" } = {}) {
    const persistedDecision = loadProjectProfileDecision();
    const recommendation = selectionService.detectProjectProfileRecommendation
      ? selectionService.detectProjectProfileRecommendation()
      : {
        recommendedProjectProfile: "",
        source: "none",
        reason: "",
        signals: {}
      };
    const nextState = buildProjectProfileDecisionState({
      selection,
      recommendation,
      persistedDecision
    });
    const hasTrackedProfileChanged = Boolean(persistedDecision) && (
      (persistedDecision.selectedProjectProfile || "") !== nextState.selectedProjectProfile
      || (persistedDecision.recommendedProjectProfile || "") !== nextState.recommendedProjectProfile
      || stableStringify(normalizeStringArray(persistedDecision.sourceSignals || [])) !== stableStringify(nextState.sourceSignals)
      || (persistedDecision.recommendationSource || "none") !== nextState.recommendationSource
      || (persistedDecision.recommendationReason || "") !== nextState.recommendationReason
    );

    const normalizedState = hasTrackedProfileChanged
      ? {
        ...nextState,
        decision: "auto-recommended",
        decisionReason: nextState.recommendationReason || "Project profile recommendation changed after workspace re-evaluation.",
        decisionSource: "sync",
        decidedBy: "system",
        decidedAt: new Date().toISOString(),
        nextReviewAt: ""
      }
      : nextState;

    return persistProjectProfileDecision(normalizedState, { trigger });
  }

  function showProjectProfileDecision() {
    const currentSelection = resolveCurrentSelection(selectionService);
    const recommendation = selectionService.detectProjectProfileRecommendation
      ? selectionService.detectProjectProfileRecommendation()
      : {
        recommendedProjectProfile: "",
        source: "none",
        reason: "",
        signals: {}
      };
    const decisionState = buildProjectProfileDecisionState({
      selection: currentSelection.selection,
      recommendation,
      persistedDecision: loadProjectProfileDecision()
    });
    const { projectProfileDecisionTarget, projectProfileDecisionHistoryTarget } = workspaceService.getPowerAiPaths();
    const history = loadProjectProfileDecisionHistory();
    return {
      generatedAt: new Date().toISOString(),
      packageName: "",
      version: "",
      projectRoot: "",
      selectionMode: currentSelection.selection.mode,
      available: currentSelection.available,
      error: currentSelection.error,
      decision: {
        ...decisionState,
        decisionPath: projectProfileDecisionTarget
      },
      reviewDeadline: {
        reviewStatus: decisionState.reviewStatus,
        hasReviewDate: decisionState.hasReviewDate,
        reviewDue: decisionState.reviewDue,
        reviewOverdue: decisionState.reviewOverdue,
        daysUntilReview: decisionState.daysUntilReview,
        daysOverdue: decisionState.daysOverdue,
        remediation: decisionState.reviewRemediation
      },
      historyPath: projectProfileDecisionHistoryTarget,
      historyCount: history.entries.length,
      history: history.entries.slice(-10).reverse()
    };
  }

  function reviewProjectProfile({
    acceptedProjectProfile = "",
    acceptRecommended = false,
    applySelection = false,
    reject = false,
    defer = false,
    reason = "",
    nextReviewAt = ""
  } = {}) {
    const currentSelection = resolveCurrentSelection(selectionService);
    const recommendation = selectionService.detectProjectProfileRecommendation
      ? selectionService.detectProjectProfileRecommendation()
      : {
        recommendedProjectProfile: "",
        source: "none",
        reason: "",
        signals: {}
      };
    const currentState = buildProjectProfileDecisionState({
      selection: currentSelection.selection,
      recommendation,
      persistedDecision: loadProjectProfileDecision()
    });

    let nextDecision = "auto-recommended";
    let decisionReason = reason || currentState.decisionReason || recommendation.reason || "";
    let reviewDate = "";
    let nextSelectedProjectProfile = currentState.selectedProjectProfile || "";

    const resolvedAcceptedProjectProfile = acceptRecommended
      ? (currentState.recommendedProjectProfile || currentState.selectedProjectProfile || "")
      : acceptedProjectProfile;

    if (resolvedAcceptedProjectProfile) {
      if (currentState.recommendedProjectProfile && resolvedAcceptedProjectProfile !== currentState.recommendedProjectProfile) {
        throw new Error(`review-project-profile can only accept the current recommended project profile: ${currentState.recommendedProjectProfile}.`);
      }
      if (!currentState.recommendedProjectProfile && resolvedAcceptedProjectProfile !== currentState.selectedProjectProfile) {
        throw new Error(`review-project-profile cannot accept ${resolvedAcceptedProjectProfile} because no current recommendation is available. Use the currently selected profile or wait until a recommendation exists.`);
      }
      nextDecision = "accepted";
      decisionReason = reason || `Accepted project profile recommendation: ${resolvedAcceptedProjectProfile}.`;
      if (applySelection) {
        nextSelectedProjectProfile = resolvedAcceptedProjectProfile;
        const { selectedToolsTarget } = workspaceService.getPowerAiPaths();
        const selectedToolsConfig = readJsonIfExists(selectedToolsTarget) || {};
        writeJson(selectedToolsTarget, {
          ...selectedToolsConfig,
          selectedProjectProfile: resolvedAcceptedProjectProfile,
          requiredSkills: selectionService.resolveRequiredSkills(resolvedAcceptedProjectProfile),
          selectedPresets: Array.isArray(selectedToolsConfig.selectedPresets) ? selectedToolsConfig.selectedPresets : [],
          selectedProfiles: Array.isArray(selectedToolsConfig.selectedProfiles) ? selectedToolsConfig.selectedProfiles : [],
          selectedTools: Array.isArray(selectedToolsConfig.selectedTools) ? selectedToolsConfig.selectedTools : [],
          expandedTools: Array.isArray(selectedToolsConfig.expandedTools) ? selectedToolsConfig.expandedTools : []
        });
      }
    } else if (reject) {
      nextDecision = "rejected";
      decisionReason = reason || `Rejected project profile recommendation: ${currentState.recommendedProjectProfile || "none"}.`;
    } else if (defer) {
      nextDecision = "deferred";
      decisionReason = reason || `Deferred project profile recommendation: ${currentState.recommendedProjectProfile || "none"}.`;
      reviewDate = normalizeReviewDate(nextReviewAt);
    } else {
      throw new Error("review-project-profile requires one of --accept <profile>, --accept-recommended, --reject, or --defer.");
    }

    const persisted = persistProjectProfileDecision({
      ...currentState,
      selectedProjectProfile: nextSelectedProjectProfile,
      decision: nextDecision,
      decisionReason,
      decisionSource: "manual-cli",
      decidedBy: "manual-cli",
      decidedAt: new Date().toISOString(),
      nextReviewAt: reviewDate
    }, { trigger: "review-project-profile" });
    const refreshed = showProjectProfileDecision();

    return {
      ...refreshed.decision,
      decisionPath: refreshed.decision.decisionPath,
      historyPath: refreshed.historyPath,
      historyCount: refreshed.historyCount,
      acceptedProjectProfile: resolvedAcceptedProjectProfile,
      acceptRecommended,
      applySelection,
      status: refreshed.decision.driftStatus === "drift" ? "reviewed-drift" : "reviewed-aligned"
    };
  }

  return {
    loadProjectProfileDecision,
    loadProjectProfileDecisionHistory,
    buildProjectProfileDecisionState,
    persistProjectProfileDecision,
    syncProjectProfileDecision,
    showProjectProfileDecision,
    reviewProjectProfile
  };
}

function resolveCurrentSelection(selectionService) {
  try {
    const hasSelectedToolsConfig = Boolean(selectionService.loadSelectedToolsConfig());
    return {
      available: true,
      error: "",
      selection: hasSelectedToolsConfig
        ? selectionService.resolveSelection({ allowLegacyInference: false, ignoreExplicit: true })
        : selectionService.resolveSelection({ allowLegacyInference: true, ignoreExplicit: true })
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      selection: {
        mode: "unresolved",
        selectedPresets: [],
        selectedProfiles: [],
        selectedTools: [],
        expandedTools: []
      }
    };
  }
}
