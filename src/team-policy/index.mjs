/**
 * Team Policy Service 模块
 * 
 * 负责：团队策略服务、项目配置决策管理、漂移检查
 */

import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../shared/fs.mjs";
import {
  normalizeStringArray,
  stableStringify
} from "./helpers.mjs";
import {
  createCheck,
  resolveCurrentSelection,
  resolveSkillTarget,
  buildCheckGroups,
  buildRecommendedActions,
  readJsonIfExists,
  uniqueSorted,
  difference,
  validateTeamPolicyConfig,
  buildTeamPolicyDriftMarkdown,
  buildGovernanceReviewDeadlinesMarkdown
} from "./validation.mjs";
import { createProfileDecisionManager } from "./profile-decision.mjs";
import { normalizeCaptureSafetyPolicy } from "../conversation-miner/capture-safety-policy.mjs";

const rolloutStages = new Set(["general", "pilot", "compatible-only", "disabled"]);

export { validateTeamPolicyConfig } from "./validation.mjs";

export function createTeamPolicyService({ context, projectRoot, workspaceService, selectionService }) {
  const teamPolicyProjectProfileMap = new Map((context.teamPolicy.projectProfiles || []).map((profile) => [profile.name, profile]));
  const profileDecisionManager = createProfileDecisionManager({ workspaceService, selectionService });

  function collectObjectDifferencePaths(left, right, prefix = "") {
    const leftIsObject = left && typeof left === "object" && !Array.isArray(left);
    const rightIsObject = right && typeof right === "object" && !Array.isArray(right);

    if (Array.isArray(left) || Array.isArray(right)) {
      return stableStringify(left) === stableStringify(right)
        ? []
        : [prefix || "<root>"];
    }

    if (!leftIsObject || !rightIsObject) {
      return stableStringify(left) === stableStringify(right)
        ? []
        : [prefix || "<root>"];
    }

    const keys = uniqueSorted([...Object.keys(left), ...Object.keys(right)]);
    return keys.flatMap((key) => collectObjectDifferencePaths(left[key], right[key], prefix ? `${prefix}.${key}` : key));
  }

  function buildCaptureSafetyPolicyDriftState(paths) {
    const projectPolicySnapshot = readJsonIfExists(paths.captureSafetyPolicyPath);
    const teamBasePolicy = normalizeCaptureSafetyPolicy(context.teamPolicy.captureSafetyPolicy || {});
    if (!projectPolicySnapshot) {
      return {
        exists: false,
        teamBaseConfigured: Boolean(context.teamPolicy.captureSafetyPolicy),
        matchesTeamBaseline: true,
        differencePaths: [],
        differenceCount: 0,
        driftType: "inherited-from-team"
      };
    }

    const normalizedProjectPolicy = normalizeCaptureSafetyPolicy(projectPolicySnapshot);
    const differencePaths = collectObjectDifferencePaths(teamBasePolicy, normalizedProjectPolicy);
    const matchesTeamBaseline = differencePaths.length === 0;

    return {
      exists: true,
      teamBaseConfigured: Boolean(context.teamPolicy.captureSafetyPolicy),
      matchesTeamBaseline,
      differencePaths,
      differenceCount: differencePaths.length,
      driftType: matchesTeamBaseline ? "matched-team-baseline" : "project-override"
    };
  }

  function getProjectProfile(projectProfileName = "") {
    if (!projectProfileName) return null;
    const projectProfile = teamPolicyProjectProfileMap.get(projectProfileName);
    if (!projectProfile) throw new Error(`Unknown team project profile: ${projectProfileName}`);
    return projectProfile;
  }

  function getToolRolloutStage(toolName) {
    return context.teamPolicy.wrapperPolicies?.rolloutStages?.[toolName] || "general";
  }

  function evaluateToolSelection(toolNames = []) {
    const normalizedTools = uniqueSorted(toolNames);
    const disallowedTools = difference(normalizedTools, context.teamPolicy.allowedTools || []);
    const disabledTools = normalizedTools.filter((toolName) => getToolRolloutStage(toolName) === "disabled");
    const limitedRolloutTools = normalizedTools
      .map((toolName) => ({ toolName, stage: getToolRolloutStage(toolName) }))
      .filter((item) => item.stage === "pilot" || item.stage === "compatible-only");

    return {
      ok: disallowedTools.length === 0 && disabledTools.length === 0,
      selectedTools: normalizedTools,
      disallowedTools,
      disabledTools,
      limitedRolloutTools,
      warnings: [
        ...limitedRolloutTools.map((item) => `Tool \`${item.toolName}\` is in rollout stage \`${item.stage}\`.`)
      ]
    };
  }

  function assertToolSelectionAllowed(toolNames = [], commandName = "command") {
    const evaluation = evaluateToolSelection(toolNames);
    const errors = [];

    if (evaluation.disallowedTools.length > 0) {
      errors.push(`not allowed by team policy: ${evaluation.disallowedTools.join(", ")}`);
    }
    if (evaluation.disabledTools.length > 0) {
      errors.push(`disabled by rollout policy: ${evaluation.disabledTools.join(", ")}`);
    }

    if (errors.length > 0) {
      throw new Error(`${commandName} cannot enable these tools because they violate team policy (${errors.join("; ")}).`);
    }

    return evaluation;
  }

  function assertSelectionAllowed({ toolNames = [], projectProfileName = "", commandName = "command" } = {}) {
    const evaluation = assertToolSelectionAllowed(toolNames, commandName);
    const projectProfile = getProjectProfile(projectProfileName);

    if (!projectProfile) {
      return {
        ...evaluation,
        selectedProjectProfile: ""
      };
    }

    const disallowedByProjectProfile = difference(evaluation.selectedTools, projectProfile.allowedTools || []);
    if (disallowedByProjectProfile.length > 0) {
      throw new Error(
        `${commandName} cannot enable these tools because they are outside team project profile \`${projectProfile.name}\` (${disallowedByProjectProfile.join(", ")}).`
      );
    }

    return {
      ...evaluation,
      selectedProjectProfile: projectProfile.name,
      projectProfileAllowedTools: uniqueSorted(projectProfile.allowedTools || []),
      projectProfileRequiredSkills: uniqueSorted(projectProfile.requiredSkills || []),
      disallowedByProjectProfile
    };
  }

  function validateTeamPolicy({ policy = context.teamPolicy } = {}) {
    return validateTeamPolicyConfig({ context, projectRoot, policy });
  }

  function showTeamPolicy() {
    const paths = workspaceService.getPowerAiPaths();
    const validation = validateTeamPolicy();
    return {
      generatedAt: validation.generatedAt,
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      teamPolicy: context.teamPolicy,
      projectTeamPolicySnapshot: readJsonIfExists(paths.teamPolicyTarget),
      validation: {
        ok: validation.ok,
        errors: validation.errors,
        warnings: validation.warnings,
        summary: validation.summary
      }
    };
  }

  function buildTeamPolicyDriftReport() {
    const paths = workspaceService.getPowerAiPaths();
    const currentSelection = resolveCurrentSelection(selectionService);
    const packageValidation = validateTeamPolicy();
    const projectProfileRecommendation = selectionService.detectProjectProfileRecommendation
      ? selectionService.detectProjectProfileRecommendation()
      : {
        recommendedProjectProfile: "",
        source: "none",
        reason: ""
      };
    const policySnapshot = readJsonIfExists(paths.teamPolicyTarget);
    const selectedTools = currentSelection.selection.expandedTools || [];
    const effectiveRequiredSkills = currentSelection.selection.requiredSkills || context.teamPolicy.requiredSkills || [];
    const disallowedTools = difference(selectedTools, context.teamPolicy.allowedTools || []);
    const missingDefaultTools = difference(context.teamPolicy.defaultTools || [], selectedTools);
    const requiredSkillStates = effectiveRequiredSkills.map((skillPath) => ({
      skillPath,
      targetPath: resolveSkillTarget(paths.skillsTarget, skillPath),
      exists: fs.existsSync(resolveSkillTarget(paths.skillsTarget, skillPath))
    }));
    const missingRequiredSkills = requiredSkillStates
      .filter((item) => !item.exists)
      .map((item) => item.skillPath);
    const rolloutStates = selectedTools.map((toolName) => ({
      toolName,
      stage: context.teamPolicy.wrapperPolicies?.rolloutStages?.[toolName] || "general"
    }));
    const nonGeneralRollouts = rolloutStates.filter((item) => item.stage !== "general" && item.stage !== "disabled");
    const disabledSelectedTools = rolloutStates.filter((item) => item.stage === "disabled").map((item) => item.toolName);
    const selectedProjectProfile = currentSelection.selection.selectedProjectProfile || "";
    const recommendedProjectProfile = projectProfileRecommendation.recommendedProjectProfile || "";
    const projectProfileDecision = profileDecisionManager.buildProjectProfileDecisionState({
      selection: currentSelection.selection,
      recommendation: projectProfileRecommendation
    });
    const projectProfileDrift = projectProfileDecision.driftStatus === "drift";
    const captureSafetyPolicyDrift = buildCaptureSafetyPolicyDriftState(paths);

    const checks = [
      createCheck(
        "PAI-POLICY-001",
        ".power-ai/team-policy.json exists",
        Boolean(policySnapshot),
        "snapshot",
        {
          relativePath: path.relative(projectRoot, paths.teamPolicyTarget) || ".power-ai/team-policy.json"
        },
        "Run `npx power-ai-skills sync` to copy `.power-ai/team-policy.json` into the consumer project."
      ),
      createCheck(
        "PAI-POLICY-002",
        "project team policy snapshot matches package baseline",
        Boolean(policySnapshot) && stableStringify(policySnapshot) === stableStringify(context.teamPolicy),
        "snapshot",
        {
          relativePath: path.relative(projectRoot, paths.teamPolicyTarget) || ".power-ai/team-policy.json",
          exists: Boolean(policySnapshot)
        },
        "Run `npx power-ai-skills sync` to refresh `.power-ai/team-policy.json` from the installed package."
      ),
      createCheck(
        "PAI-POLICY-003",
        "selected tools are allowed by team policy",
        currentSelection.available && disallowedTools.length === 0,
        "selection",
        {
          selectedTools,
          disallowedTools
        },
        "Remove disallowed tools with `npx power-ai-skills remove-tool --tool <tool-name>`, or update `config/team-policy.json` if the policy should permit them."
      ),
      createCheck(
        "PAI-POLICY-004",
        "required team skills are present in .power-ai/skills",
        missingRequiredSkills.length === 0,
        "knowledge",
        {
          requiredSkills: effectiveRequiredSkills,
          missingRequiredSkills
        },
        "Run `npx power-ai-skills sync` to restore required team skills into `.power-ai/skills`."
      ),
      createCheck(
        "PAI-POLICY-005",
        "selected tools still cover the team default tool baseline",
        currentSelection.available && missingDefaultTools.length === 0,
        "selection",
        {
          defaultTools: context.teamPolicy.defaultTools || [],
          selectedTools,
          missingDefaultTools
        },
        "If this project should stay on the team default baseline, re-run `npx power-ai-skills init --preset enterprise-standard` or add the missing tools explicitly.",
        "warning"
      ),
      createCheck(
        "PAI-POLICY-006",
        "selected wrappers are in general rollout stage",
        disabledSelectedTools.length === 0 && nonGeneralRollouts.length === 0,
        "wrapper",
        {
          rolloutStates,
          nonGeneralRollouts,
          disabledSelectedTools
        },
        "Review `config/team-policy.json` rollout stages before enabling pilot or compatible-only wrappers in broad project baselines.",
        nonGeneralRollouts.length > 0 && disabledSelectedTools.length === 0 ? "warning" : "error"
      ),
      createCheck(
        "PAI-POLICY-007",
        "selected project profile matches the current recommendation",
        !projectProfileDrift,
        "selection",
        {
          selectedProjectProfile,
          recommendedProjectProfile,
          projectProfileDecision: projectProfileDecision.decision,
          projectProfileDecisionReason: projectProfileDecision.decisionReason,
          projectProfileDecisionSource: projectProfileDecision.decisionSource,
          projectProfileDecisionAt: projectProfileDecision.decidedAt,
          projectProfileDecisionReviewAt: projectProfileDecision.nextReviewAt,
          sourceSignals: projectProfileDecision.sourceSignals,
          recommendationSource: projectProfileRecommendation.source,
          recommendationReason: projectProfileRecommendation.reason
        },
        projectProfileDecision.remediation,
        "warning"
      ),
      createCheck(
        "PAI-POLICY-008",
        "governance review deadlines are not overdue",
        !projectProfileDecision.reviewOverdue,
        "selection",
        {
          projectProfileDecision: projectProfileDecision.decision,
          reviewStatus: projectProfileDecision.reviewStatus,
          nextReviewAt: projectProfileDecision.nextReviewAt,
          daysOverdue: projectProfileDecision.daysOverdue,
          today: projectProfileDecision.today
        },
        projectProfileDecision.reviewRemediation,
        "warning"
      ),
      createCheck(
        "PAI-POLICY-012",
        "project capture safety policy matches the team baseline",
        !captureSafetyPolicyDrift.exists || captureSafetyPolicyDrift.matchesTeamBaseline,
        "snapshot",
        {
          relativePath: path.relative(projectRoot, paths.captureSafetyPolicyPath) || ".power-ai/capture-safety-policy.json",
          exists: captureSafetyPolicyDrift.exists,
          teamBaseConfigured: captureSafetyPolicyDrift.teamBaseConfigured,
          driftType: captureSafetyPolicyDrift.driftType,
          differenceCount: captureSafetyPolicyDrift.differenceCount,
          differencePaths: captureSafetyPolicyDrift.differencePaths
        },
        "Run `npx power-ai-skills show-capture-safety-policy --json` to inspect the effective capture boundary, then update `.power-ai/capture-safety-policy.json` so it either matches the current team baseline or keeps only the project-specific overrides you still want.",
        "warning"
      )
    ];

    const checkGroups = buildCheckGroups(checks);
    const failedChecks = checks.filter((check) => !check.ok && check.severity !== "warning");
    const warningChecks = checks.filter((check) => !check.ok && check.severity === "warning");
    const recommendedActions = buildRecommendedActions(checks);
    const warnings = [...packageValidation.warnings];
    if (!packageValidation.ok) {
      warnings.push("Package team policy validation has errors. Run `npx power-ai-skills validate-team-policy --json` in the package root.");
    }

    return {
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
        selectedProjectProfile: currentSelection.selection.selectedProjectProfile || "",
        recommendedProjectProfile,
        recommendedProjectProfileReason: projectProfileRecommendation.reason,
        projectProfileDecision: projectProfileDecision.decision,
        projectProfileDecisionReason: projectProfileDecision.decisionReason,
        projectProfileDecisionReviewAt: projectProfileDecision.nextReviewAt,
        requiredSkills: effectiveRequiredSkills,
        selectedTools: currentSelection.selection.selectedTools || [],
        expandedTools: selectedTools
      },
      projectProfileDecision,
      captureSafetyPolicyDrift,
      teamPolicy: context.teamPolicy,
      policyValidation: {
        ok: packageValidation.ok,
        errors: packageValidation.errors,
        warnings: packageValidation.warnings,
        summary: packageValidation.summary
      },
      summary: {
        total: checks.length,
        passed: checks.filter((check) => check.ok).length,
        failed: failedChecks.length,
        warnings: warningChecks.length
      },
      checkGroups,
      checks,
      requiredSkillStates,
      rolloutStates,
      recommendedActions,
      warnings
    };
  }

  function checkTeamPolicyDrift() {
    const payload = buildTeamPolicyDriftReport();
    const reportsRoot = workspaceService.getReportsRoot();
    const reportPath = path.join(reportsRoot, "team-policy-drift.md");
    const jsonPath = path.join(reportsRoot, "team-policy-drift.json");

    ensureDir(reportsRoot);
    writeJson(jsonPath, payload);
    fs.writeFileSync(reportPath, buildTeamPolicyDriftMarkdown(payload), "utf8");

    return {
      ...payload,
      reportPath,
      jsonPath
    };
  }

  function buildGovernanceReviewDeadlineReport() {
    const currentSelection = resolveCurrentSelection(selectionService);
    const recommendation = selectionService.detectProjectProfileRecommendation
      ? selectionService.detectProjectProfileRecommendation()
      : {
        recommendedProjectProfile: "",
        source: "none",
        reason: "",
        signals: {}
      };
    const projectProfileDecision = profileDecisionManager.buildProjectProfileDecisionState({
      selection: currentSelection.selection,
      recommendation,
      persistedDecision: profileDecisionManager.loadProjectProfileDecision()
    });
    const trackedItems = [
      {
        reviewType: "project-profile-decision",
        label: "Project Profile Decision",
        decision: projectProfileDecision.decision,
        selectedProjectProfile: projectProfileDecision.selectedProjectProfile,
        recommendedProjectProfile: projectProfileDecision.recommendedProjectProfile,
        nextReviewAt: projectProfileDecision.nextReviewAt,
        reviewStatus: projectProfileDecision.reviewStatus,
        hasReviewDate: projectProfileDecision.hasReviewDate,
        reviewDue: projectProfileDecision.reviewDue,
        reviewOverdue: projectProfileDecision.reviewOverdue,
        daysUntilReview: projectProfileDecision.daysUntilReview,
        daysOverdue: projectProfileDecision.daysOverdue,
        remediation: projectProfileDecision.reviewRemediation
      }
    ];
    const scheduledItems = trackedItems.filter((item) => item.hasReviewDate);
    const overdueItems = scheduledItems.filter((item) => item.reviewOverdue);
    const dueTodayItems = scheduledItems.filter((item) => item.reviewDue);
    const upcomingItems = scheduledItems.filter((item) => item.reviewStatus === "scheduled");
    const nextReviewAt = scheduledItems
      .map((item) => item.nextReviewAt)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, "en"))[0] || "";
    const recommendedActions = [...new Set(overdueItems.map((item) => item.remediation).filter(Boolean))];

    return {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      today: projectProfileDecision.today,
      status: overdueItems.length > 0 ? "attention" : "ok",
      summary: {
        totalTrackedReviews: trackedItems.length,
        scheduledReviews: upcomingItems.length,
        dueTodayReviews: dueTodayItems.length,
        overdueReviews: overdueItems.length,
        nextReviewAt
      },
      items: trackedItems,
      recommendedActions
    };
  }

  function checkGovernanceReviewDeadlines() {
    const payload = buildGovernanceReviewDeadlineReport();
    const reportsRoot = workspaceService.getReportsRoot();
    const reportPath = path.join(reportsRoot, "governance-review-deadlines.md");
    const jsonPath = path.join(reportsRoot, "governance-review-deadlines.json");

    ensureDir(reportsRoot);
    writeJson(jsonPath, payload);
    fs.writeFileSync(reportPath, buildGovernanceReviewDeadlinesMarkdown(payload), "utf8");

    return {
      ...payload,
      reportPath,
      jsonPath
    };
  }

  return {
    getProjectProfile,
    getToolRolloutStage,
    evaluateToolSelection,
    assertToolSelectionAllowed,
    assertSelectionAllowed,
    showTeamPolicy,
    validateTeamPolicy,
    loadProjectProfileDecision: profileDecisionManager.loadProjectProfileDecision,
    loadProjectProfileDecisionHistory: profileDecisionManager.loadProjectProfileDecisionHistory,
    buildProjectProfileDecisionState: profileDecisionManager.buildProjectProfileDecisionState,
    syncProjectProfileDecision: profileDecisionManager.syncProjectProfileDecision,
    showProjectProfileDecision: profileDecisionManager.showProjectProfileDecision,
    reviewProjectProfile: profileDecisionManager.reviewProjectProfile,
    buildGovernanceReviewDeadlineReport,
    checkGovernanceReviewDeadlines,
    buildTeamPolicyDriftReport,
    checkTeamPolicyDrift
  };
}
