/**
 * Project Baseline Service 模块
 * 
 * 负责：
 * - 检查项目基线配置是否符合包基线要求
 * - 协调各个检查模块
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../../scripts/shared.mjs";
import {
  readJsonIfExists,
  buildCheckGroups,
  buildRecommendedActions
} from "./helpers.mjs";
import {
  resolvePackageDefaultSelection,
  resolveCurrentSelection
} from "./selection.mjs";
import {
  collectPresetChecks,
  collectKnowledgeChecks,
  collectAdapterTemplateChecks,
  collectEntrypointChecks
} from "./checks.mjs";
import { buildBaselineMarkdown } from "./markdown.mjs";

/**
 * 创建项目基线检查服务
 */
export function createProjectBaselineService({ context, projectRoot, workspaceService, selectionService, teamPolicyService, governanceContextService }) {
  
  /**
   * 检查项目基线
   */
  function checkProjectBaseline() {
    const governanceContext = governanceContextService?.loadProjectGovernanceContext({ refreshIfMissing: true }) || null;
    const packageDefaultSelection = resolvePackageDefaultSelection({ context, selectionService });
    const currentSelection = resolveCurrentSelection(selectionService);
    
    const projectProfileRecommendation = selectionService.detectProjectProfileRecommendation
      ? selectionService.detectProjectProfileRecommendation()
      : {
        recommendedProjectProfile: "",
        source: "none",
        reason: ""
      };
      
    const projectProfileDecision = teamPolicyService?.buildProjectProfileDecisionState
      ? teamPolicyService.buildProjectProfileDecisionState({
        selection: currentSelection.selection,
        recommendation: projectProfileRecommendation
      })
      : null;

    const presetChecks = collectPresetChecks({
      context,
      projectRoot,
      workspaceService,
      selectionService,
      currentSelection,
      packageDefaultSelection,
      projectProfileDecision
    });
    
    const knowledgeChecks = collectKnowledgeChecks({ context, projectRoot, workspaceService });
    const adapterTemplateChecks = collectAdapterTemplateChecks({ context, projectRoot, workspaceService });
    const { entrypointStates, checks: entrypointChecks } = collectEntrypointChecks({ workspaceService, currentSelection });

    const checks = [
      ...presetChecks,
      ...knowledgeChecks,
      ...adapterTemplateChecks,
      ...entrypointChecks
    ];

    const checkGroups = buildCheckGroups(checks);
    const failedChecks = checks.filter((check) => !check.ok && check.severity !== "warning");
    const warningChecks = checks.filter((check) => !check.ok && check.severity === "warning");
    const recommendedActions = buildRecommendedActions(checks);
    
    const reportsRoot = workspaceService.getReportsRoot();
    const reportPath = path.join(reportsRoot, "project-baseline.md");
    const jsonPath = path.join(reportsRoot, "project-baseline.json");
    
    const payload = {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      status: failedChecks.length === 0 ? "ok" : "attention",
      currentSelection: {
        available: currentSelection.available,
        error: currentSelection.error,
        mode: currentSelection.selection.mode,
        selectedPresets: currentSelection.selection.selectedPresets || [],
        selectedProfiles: currentSelection.selection.selectedProfiles || [],
        selectedProjectProfile: governanceContext?.selectedProjectProfile || currentSelection.selection.selectedProjectProfile || "",
        recommendedProjectProfile: governanceContext?.recommendedProjectProfile || projectProfileRecommendation.recommendedProjectProfile || "",
        projectProfileDecision: governanceContext?.projectProfileDecision || projectProfileDecision?.decision || "auto-recommended",
        projectProfileDecisionReason: governanceContext?.projectProfileDecisionReason || projectProfileDecision?.decisionReason || "",
        projectProfileDecisionReviewAt: governanceContext?.projectProfileDecisionReviewAt || projectProfileDecision?.nextReviewAt || "",
        projectProfileDecisionReviewStatus: governanceContext?.projectProfileDecisionReviewStatus || projectProfileDecision?.reviewStatus || "not-scheduled",
        selectedTools: currentSelection.selection.selectedTools || [],
        expandedTools: currentSelection.selection.expandedTools || [],
        requiredSkills: governanceContext?.requiredSkills || currentSelection.selection.requiredSkills || []
      },
      governanceContext,
      projectProfileDecision,
      teamDefaultSelection: packageDefaultSelection,
      summary: {
        total: checks.length,
        passed: checks.filter((check) => check.ok).length,
        failed: failedChecks.length,
        warnings: warningChecks.length
      },
      checkGroups,
      checks,
      entrypointStates,
      recommendedActions
    };

    ensureDir(reportsRoot);
    writeJson(jsonPath, payload);
    fs.writeFileSync(reportPath, buildBaselineMarkdown(payload), "utf8");
    governanceContextService?.refreshProjectGovernanceContext({
      trigger: "check-project-baseline",
      baselineStatus: payload.status
    });

    return {
      ...payload,
      reportPath,
      jsonPath
    };
  }

  return {
    checkProjectBaseline
  };
}
