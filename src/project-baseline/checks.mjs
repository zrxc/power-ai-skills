/**
 * Project Baseline Checks 模块
 * 
 * 负责：
 * - 预设检查收集
 * - 知识库检查收集
 * - 适配器模板检查收集
 * - 入口点检查收集
 */

import fs from "node:fs";
import path from "node:path";
import { findSkillDirectories, readJson } from "../../scripts/shared.mjs";
import {
  readJsonIfExists,
  stableStringify,
  arraysEqual,
  difference,
  toProjectRelative,
  normalizeRelativePath,
  createCheck
} from "./helpers.mjs";

/**
 * 列出技能组
 */
function listSkillGroups(skillsRoot, workspaceService) {
  if (!fs.existsSync(skillsRoot)) return [];
  return workspaceService.normalizeGroupNames(
    fs.readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  );
}

/**
 * 收集预设检查项
 */
export function collectPresetChecks({ context, projectRoot, workspaceService, selectionService, currentSelection, packageDefaultSelection, projectProfileDecision }) {
  const paths = workspaceService.getPowerAiPaths();
  const selectedToolsConfig = selectionService.loadSelectedToolsConfig();
  const projectTeamDefaults = readJsonIfExists(paths.teamDefaultsTarget);
  const projectToolRegistry = readJsonIfExists(paths.registryTarget);
  const expectedExpandedTools = packageDefaultSelection.expandedTools;
  const currentExpandedTools = currentSelection.selection.expandedTools || [];
  const missingDefaultTools = difference(expectedExpandedTools, currentExpandedTools);
  const extraTools = difference(currentExpandedTools, expectedExpandedTools);
  const unknownSelectedTools = (selectedToolsConfig?.selectedTools || [])
    .filter((toolName) => !context.registryToolMap.has(toolName));
  const projectPresets = selectedToolsConfig?.selectedPresets || [];
  const defaultPresets = packageDefaultSelection.selectedPresets || [];
  const missingDefaultPresets = difference(defaultPresets, projectPresets);
  const projectProfileRecommendation = selectionService.detectProjectProfileRecommendation
    ? selectionService.detectProjectProfileRecommendation()
    : {
      recommendedProjectProfile: "",
      source: "none",
      reason: ""
    };
  const selectedProjectProfile = currentSelection.selection.selectedProjectProfile || "";
  const recommendedProjectProfile = projectProfileRecommendation.recommendedProjectProfile || "";

  return [
    createCheck(
      "PAI-BASELINE-PRESET-001",
      ".power-ai/selected-tools.json exists",
      Boolean(selectedToolsConfig),
      "preset",
      {
        relativePath: toProjectRelative(projectRoot, paths.selectedToolsTarget),
        selectionMode: currentSelection.selection.mode
      },
      "Run `npx power-ai-skills init --preset enterprise-standard` or an explicit `init --tool ...` command to persist project selection metadata."
    ),
    createCheck(
      "PAI-BASELINE-PRESET-002",
      "selected tools cover package team default tools",
      currentSelection.available && missingDefaultTools.length === 0,
      "preset",
      {
        expectedTools: expectedExpandedTools,
        actualTools: currentExpandedTools,
        missingDefaultTools,
        extraTools
      },
      "Run `npx power-ai-skills add-tool --tool <missing-tool>` or re-run `npx power-ai-skills init --preset enterprise-standard` if this project should follow the team default baseline."
    ),
    createCheck(
      "PAI-BASELINE-PRESET-003",
      "default preset selection is preserved or intentionally expanded",
      Boolean(selectedToolsConfig) && missingDefaultPresets.length === 0,
      "preset",
      {
        expectedPresets: defaultPresets,
        actualPresets: projectPresets,
        missingDefaultPresets
      },
      "If the project still follows the team preset, re-run `npx power-ai-skills init --preset enterprise-standard` so preset metadata remains visible. If it intentionally uses explicit tools, review this item as accepted drift.",
      "warning"
    ),
    createCheck(
      "PAI-BASELINE-PRESET-004",
      "project team-defaults snapshot matches package baseline",
      Boolean(projectTeamDefaults) && stableStringify(projectTeamDefaults) === stableStringify(context.teamDefaults),
      "preset",
      {
        relativePath: toProjectRelative(projectRoot, paths.teamDefaultsTarget),
        exists: Boolean(projectTeamDefaults)
      },
      "Run `npx power-ai-skills sync` to refresh `.power-ai/team-defaults.json` from the installed package."
    ),
    createCheck(
      "PAI-BASELINE-PRESET-005",
      "project tool registry snapshot matches package baseline",
      Boolean(projectToolRegistry) && stableStringify(projectToolRegistry) === stableStringify(context.toolRegistry),
      "preset",
      {
        relativePath: toProjectRelative(projectRoot, paths.registryTarget),
        exists: Boolean(projectToolRegistry)
      },
      "Run `npx power-ai-skills sync` to refresh `.power-ai/tool-registry.json` from the installed package."
    ),
    createCheck(
      "PAI-BASELINE-PRESET-006",
      "selected tools are registered in package registry",
      unknownSelectedTools.length === 0,
      "preset",
      {
        unknownSelectedTools
      },
      "Remove unknown tools from `.power-ai/selected-tools.json`, or register the tool before using it in project selection."
    ),
    createCheck(
      "PAI-BASELINE-PRESET-007",
      "selected project profile matches the current recommendation",
      !recommendedProjectProfile || selectedProjectProfile === recommendedProjectProfile,
      "preset",
      {
        selectedProjectProfile,
        recommendedProjectProfile,
        projectProfileDecision: projectProfileDecision?.decision || "auto-recommended",
        projectProfileDecisionReason: projectProfileDecision?.decisionReason || "",
        projectProfileDecisionSource: projectProfileDecision?.decisionSource || "sync",
        projectProfileDecisionAt: projectProfileDecision?.decidedAt || "",
        projectProfileDecisionReviewAt: projectProfileDecision?.nextReviewAt || "",
        recommendationSource: projectProfileRecommendation.source,
        recommendationReason: projectProfileRecommendation.reason
      },
      projectProfileDecision?.remediation
        || (recommendedProjectProfile
          ? `Run \`npx power-ai-skills show-defaults --format summary\` to review the current recommendation, then re-run \`npx power-ai-skills init --project-profile ${recommendedProjectProfile}\` if the project should align with the detected baseline.`
          : "No recommended project profile is currently detected for this project."),
      "warning"
    ),
    createCheck(
      "PAI-BASELINE-PRESET-008",
      "governance review deadlines are not overdue",
      !projectProfileDecision?.reviewOverdue,
      "preset",
      {
        projectProfileDecision: projectProfileDecision?.decision || "auto-recommended",
        reviewStatus: projectProfileDecision?.reviewStatus || "not-scheduled",
        nextReviewAt: projectProfileDecision?.nextReviewAt || "",
        daysOverdue: projectProfileDecision?.daysOverdue || 0,
        today: projectProfileDecision?.today || ""
      },
      projectProfileDecision?.reviewRemediation || "Run `npx power-ai-skills check-governance-review-deadlines --json` to inspect overdue governance review items.",
      "warning"
    )
  ];
}

/**
 * 收集知识库检查项
 */
export function collectKnowledgeChecks({ context, projectRoot, workspaceService }) {
  const paths = workspaceService.getPowerAiPaths();
  const expectedGroups = listSkillGroups(context.skillsRoot, workspaceService);
  const actualGroups = listSkillGroups(paths.skillsTarget, workspaceService);
  const expectedSkillCount = fs.existsSync(context.skillsRoot) ? findSkillDirectories(context.skillsRoot).length : 0;
  const actualSkillCount = fs.existsSync(paths.skillsTarget) ? findSkillDirectories(paths.skillsTarget).length : 0;
  const missingGroups = difference(expectedGroups, actualGroups);
  const extraGroups = difference(actualGroups, expectedGroups);
  const overlayRoot = workspaceService.getOverlayTarget(paths.skillsTarget);

  return [
    createCheck(
      "PAI-BASELINE-KNOWLEDGE-001",
      ".power-ai/skills exists",
      fs.existsSync(paths.skillsTarget),
      "knowledge",
      {
        relativePath: toProjectRelative(projectRoot, paths.skillsTarget)
      },
      "Run `npx power-ai-skills sync` to copy the package skill baseline into `.power-ai/skills`."
    ),
    createCheck(
      "PAI-BASELINE-KNOWLEDGE-002",
      "skill groups match package baseline",
      arraysEqual(actualGroups, expectedGroups),
      "knowledge",
      {
        expectedGroups,
        actualGroups,
        missingGroups,
        extraGroups
      },
      "Run `npx power-ai-skills sync` to refresh public skill groups while preserving `project-local` overlays."
    ),
    createCheck(
      "PAI-BASELINE-KNOWLEDGE-003",
      "skill count matches package baseline",
      actualSkillCount === expectedSkillCount,
      "knowledge",
      {
        expectedSkillCount,
        actualSkillCount
      },
      "Run `npx power-ai-skills sync`; if the count still differs, verify the installed package contains the full `skills/` tree."
    ),
    createCheck(
      "PAI-BASELINE-KNOWLEDGE-004",
      "project-local overlay is present",
      fs.existsSync(overlayRoot),
      "knowledge",
      {
        relativePath: toProjectRelative(projectRoot, overlayRoot)
      },
      "Run `npx power-ai-skills sync` to recreate `.power-ai/skills/project-local` without dropping existing manual overlays."
    )
  ];
}

/**
 * 收集适配器模板检查项
 */
export function collectAdapterTemplateChecks({ context, projectRoot, workspaceService }) {
  const paths = workspaceService.getPowerAiPaths();
  const missingTemplateOutputs = context.templateRegistry.templates
    .map((templateDefinition) => path.join(paths.powerAiRoot, normalizeRelativePath(templateDefinition.output)))
    .filter((targetPath) => !fs.existsSync(targetPath))
    .map((targetPath) => toProjectRelative(projectRoot, targetPath));
  const projectTemplateRegistry = readJsonIfExists(paths.templateRegistryTarget);

  return [
    createCheck(
      "PAI-BASELINE-ADAPTER-001",
      "managed adapter/shared template outputs exist",
      missingTemplateOutputs.length === 0,
      "adapters",
      {
        missingTemplateOutputs
      },
      "Run `npx power-ai-skills sync` to regenerate managed `.power-ai/shared` and `.power-ai/adapters` files."
    ),
    createCheck(
      "PAI-BASELINE-ADAPTER-002",
      "project template registry snapshot matches package baseline",
      Boolean(projectTemplateRegistry) && stableStringify(projectTemplateRegistry) === stableStringify(context.templateRegistry),
      "adapters",
      {
        relativePath: toProjectRelative(projectRoot, paths.templateRegistryTarget),
        exists: Boolean(projectTemplateRegistry)
      },
      "Run `npx power-ai-skills sync` to refresh `.power-ai/template-registry.json` from the installed package."
    )
  ];
}

/**
 * 收集入口点检查项
 */
export function collectEntrypointChecks({ workspaceService, currentSelection }) {
  const selectedEntrypoints = workspaceService.getSelectedEntrypoints(currentSelection.selection.expandedTools || []);
  const entrypointStates = selectedEntrypoints.map((entrypoint) => workspaceService.getEntrypointState(entrypoint));
  const brokenEntrypoints = entrypointStates.filter((entrypointState) => !entrypointState.ok);
  const copiedEntrypoints = entrypointStates.filter((entrypointState) => entrypointState.state === "copied-directory" || entrypointState.state === "copied-file");

  return {
    entrypointStates,
    checks: [
      createCheck(
        "PAI-BASELINE-ADAPTER-003",
        "selected tool entrypoints are usable",
        currentSelection.available && brokenEntrypoints.length === 0,
        "adapters",
        {
          entrypointStates
        },
        "Run `npx power-ai-skills sync` to repair broken entrypoint links or copies."
      ),
      createCheck(
        "PAI-BASELINE-ADAPTER-004",
        "selected tool entrypoints prefer link mode",
        copiedEntrypoints.length === 0,
        "adapters",
        {
          copiedEntrypoints: copiedEntrypoints.map((entrypointState) => entrypointState.target)
        },
        "Copy mode is usable, but link mode is easier to keep fresh. Re-run `npx power-ai-skills sync` in an environment that allows links if you want stricter baseline parity.",
        "warning"
      )
    ]
  };
}
