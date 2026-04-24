/**
 * Team Policy Validation 模块
 *
 * 负责：
 * - 团队策略配置校验
 * - 检查项构建
 * - Markdown 报告生成
 */

import fs from "node:fs";
import path from "node:path";
import { validateCaptureSafetyPolicyConfig } from "../conversation-miner/capture-safety-policy.mjs";

const rolloutStages = new Set(["general", "pilot", "compatible-only", "disabled"]);

function uniqueSorted(items) {
  return [...new Set(items)].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function readJsonIfExists(filePath) {
  return filePath && fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : null;
}

function createCheck(code, name, ok, group, detail, remediation, severity = "error") {
  return { code, name, ok, group, severity, detail, remediation };
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

function resolveSkillTarget(skillsTarget, skillPath) {
  return path.join(skillsTarget, ...String(skillPath || "").split("/"));
}

function buildValidationPayload({ context, policy = context.teamPolicy }) {
  const errors = [];
  const warnings = [];
  const toolNames = new Set(context.toolRegistry.tools.map((tool) => tool.name));
  const presetNames = new Set((context.teamDefaults.presetSelections || []).map((preset) => preset.name));

  function pushError(message) { errors.push(message); }

  function assertStringArray(value, label, { required = true } = {}) {
    if (!Array.isArray(value) || (required && value.length === 0) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
      pushError(`${label} must be a non-empty string array.`);
      return false;
    }
    return true;
  }

  if (!policy || typeof policy !== "object") pushError("team policy must be an object.");
  if (policy?.$schema !== "./schemas/team-policy.schema.json") pushError("team policy $schema must be ./schemas/team-policy.schema.json.");
  if (policy?.schemaVersion !== 1) pushError(`team policy schemaVersion must be 1, received ${policy?.schemaVersion ?? "<missing>"}.`);

  if (assertStringArray(policy?.allowedTools, "team policy allowedTools")) {
    for (const toolName of policy.allowedTools) {
      if (!toolNames.has(toolName)) pushError(`team policy allowedTools references unknown tool: ${toolName}.`);
    }
  }

  if (assertStringArray(policy?.defaultTools, "team policy defaultTools")) {
    for (const toolName of policy.defaultTools) {
      if (!toolNames.has(toolName)) pushError(`team policy defaultTools references unknown tool: ${toolName}.`);
      if (!policy.allowedTools?.includes(toolName)) pushError(`team policy defaultTools must also exist in allowedTools: ${toolName}.`);
    }
  }

  if (assertStringArray(policy?.requiredSkills, "team policy requiredSkills")) {
    for (const skillPath of policy.requiredSkills) {
      if (!fs.existsSync(path.join(context.skillsRoot, ...skillPath.split("/")))) {
        pushError(`team policy requiredSkills references missing skill: ${skillPath}.`);
      }
    }
  }

  const rolloutMap = policy?.wrapperPolicies?.rolloutStages;
  if (!rolloutMap || typeof rolloutMap !== "object" || Array.isArray(rolloutMap)) {
    pushError("team policy wrapperPolicies.rolloutStages must be an object.");
  } else {
    for (const [toolName, stage] of Object.entries(rolloutMap)) {
      if (!toolNames.has(toolName)) pushError(`team policy wrapperPolicies.rolloutStages references unknown tool: ${toolName}.`);
      if (!rolloutStages.has(stage)) pushError(`team policy wrapperPolicies.rolloutStages has unsupported stage for ${toolName}: ${stage}.`);
      if (!policy.allowedTools?.includes(toolName) && stage !== "disabled") {
        warnings.push(`wrapper rollout stage is declared for non-allowed tool \`${toolName}\`; consider aligning allowedTools.`);
      }
    }
  }

  if (!Array.isArray(policy?.projectProfiles) || policy.projectProfiles.length === 0) {
    pushError("team policy projectProfiles must contain at least one profile.");
  } else {
    const profileNames = new Set();
    for (const profile of policy.projectProfiles) {
      if (!profile?.name || !/^[a-z0-9-]+$/.test(profile.name)) pushError(`team policy projectProfiles has invalid name: ${profile?.name || "<missing>"}.`);
      if (profileNames.has(profile?.name)) pushError(`team policy projectProfiles has duplicate name: ${profile.name}.`);
      profileNames.add(profile?.name);
      if (!profile?.displayName || typeof profile.displayName !== "string") pushError(`team policy projectProfiles.${profile?.name || "<unknown>"} is missing displayName.`);
      if (!profile?.defaultPreset || !presetNames.has(profile.defaultPreset)) pushError(`team policy projectProfiles.${profile?.name || "<unknown>"} references unknown defaultPreset: ${profile?.defaultPreset || "<missing>"}.`);
      if (assertStringArray(profile?.allowedTools, `team policy projectProfiles.${profile?.name || "<unknown>"}.allowedTools`)) {
        for (const toolName of profile.allowedTools) {
          if (!toolNames.has(toolName)) pushError(`team policy projectProfiles.${profile.name}.allowedTools references unknown tool: ${toolName}.`);
          if (!policy.allowedTools?.includes(toolName)) pushError(`team policy projectProfiles.${profile.name}.allowedTools must be included in allowedTools: ${toolName}.`);
        }
      }
      if (assertStringArray(profile?.requiredSkills, `team policy projectProfiles.${profile?.name || "<unknown>"}.requiredSkills`)) {
        for (const skillPath of profile.requiredSkills) {
          if (!fs.existsSync(path.join(context.skillsRoot, ...skillPath.split("/")))) {
            pushError(`team policy projectProfiles.${profile.name}.requiredSkills references missing skill: ${skillPath}.`);
          }
        }
      }
    }
  }

  const releasePolicies = policy?.releasePolicies;
  if (!releasePolicies || typeof releasePolicies !== "object" || Array.isArray(releasePolicies)) {
    pushError("team policy releasePolicies must be an object.");
  } else {
    assertStringArray(releasePolicies.requiredReports, "team policy releasePolicies.requiredReports");
    assertStringArray(releasePolicies.requiredChecks, "team policy releasePolicies.requiredChecks");
    if (typeof releasePolicies.enforceConsumerMatrix !== "boolean") pushError("team policy releasePolicies.enforceConsumerMatrix must be boolean.");
    if (typeof releasePolicies.enforceReleaseGates !== "boolean") pushError("team policy releasePolicies.enforceReleaseGates must be boolean.");
  }

  if (policy?.captureSafetyPolicy !== undefined) {
    if (!policy.captureSafetyPolicy || typeof policy.captureSafetyPolicy !== "object" || Array.isArray(policy.captureSafetyPolicy)) {
      pushError("team policy captureSafetyPolicy must be an object when provided.");
    } else {
      const captureSafetyValidation = validateCaptureSafetyPolicyConfig(policy.captureSafetyPolicy);
      for (const error of captureSafetyValidation.errors) {
        pushError(`team policy captureSafetyPolicy invalid: ${error}`);
      }
      for (const warning of captureSafetyValidation.warnings) {
        warnings.push(`capture safety policy warning: ${warning}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      allowedToolCount: uniqueSorted(policy?.allowedTools || []).length,
      defaultToolCount: uniqueSorted(policy?.defaultTools || []).length,
      requiredSkillCount: uniqueSorted(policy?.requiredSkills || []).length,
      projectProfileCount: Array.isArray(policy?.projectProfiles) ? policy.projectProfiles.length : 0,
      captureSafetyConfigured: Boolean(policy?.captureSafetyPolicy)
    }
  };
}

function buildCheckGroups(checks) {
  const reportGroupOrder = ["snapshot", "selection", "knowledge", "wrapper"];
  return reportGroupOrder.map((groupName) => {
    const groupChecks = checks.filter((check) => check.group === groupName);
    if (groupChecks.length === 0) return null;
    return {
      name: groupName,
      ok: groupChecks.every((check) => check.ok || check.severity === "warning"),
      total: groupChecks.length,
      passed: groupChecks.filter((check) => check.ok).length,
      failed: groupChecks.filter((check) => !check.ok && check.severity !== "warning").length,
      warnings: groupChecks.filter((check) => !check.ok && check.severity === "warning").length,
      checks: groupChecks
    };
  }).filter(Boolean);
}

function buildRecommendedActions(checks) {
  return [...new Set(checks
    .filter((check) => !check.ok)
    .map((check) => check.remediation)
    .filter(Boolean))];
}

export function buildTeamPolicyDriftMarkdown(payload) {
  const lines = [
    "# Team Policy Drift",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- root: \`${payload.projectRoot}\``,
    `- status: \`${payload.status}\``,
    `- generatedAt: \`${payload.generatedAt}\``,
    `- selectionMode: \`${payload.currentSelection.mode}\``,
    `- project profile: ${payload.currentSelection.selectedProjectProfile ? `\`${payload.currentSelection.selectedProjectProfile}\`` : "none"}`,
    `- recommended project profile: ${payload.currentSelection.recommendedProjectProfile ? `\`${payload.currentSelection.recommendedProjectProfile}\`` : "none"}`,
    `- profile decision: \`${payload.projectProfileDecision.decision}\``,
    `- profile decision reason: ${payload.projectProfileDecision.decisionReason || "none"}`,
    `- next review: ${payload.projectProfileDecision.nextReviewAt ? `\`${payload.projectProfileDecision.nextReviewAt}\`` : "none"}`,
    `- selected tools: ${payload.currentSelection.expandedTools.length ? payload.currentSelection.expandedTools.map((toolName) => `\`${toolName}\``).join(", ") : "none"}`,
    `- required skills: ${payload.currentSelection.requiredSkills.length ? payload.currentSelection.requiredSkills.map((skillPath) => `\`${skillPath}\``).join(", ") : "none"}`,
    `- default policy tools: ${payload.teamPolicy.defaultTools.length ? payload.teamPolicy.defaultTools.map((toolName) => `\`${toolName}\``).join(", ") : "none"}`,
    ""
  ];

  for (const group of payload.checkGroups) {
    lines.push(`## ${group.name}`);
    lines.push("");
    lines.push(`- status: ${group.ok ? "ok" : "attention"}`);
    lines.push(`- checks: ${group.passed}/${group.total}, failed: ${group.failed}, warnings: ${group.warnings}`);
    for (const check of group.checks) {
      const marker = check.ok ? "ok" : check.severity === "warning" ? "warn" : "fail";
      lines.push(`- ${marker} [${check.code}] ${check.name}`);
    }
    lines.push("");
  }

  lines.push("## Recommended Actions", "");
  if (payload.recommendedActions.length === 0) lines.push("- none");
  else for (const action of payload.recommendedActions) lines.push(`- ${action}`);

  if ((payload.warnings || []).length > 0) {
    lines.push("", "## Warnings", "");
    for (const warning of payload.warnings) lines.push(`- ${warning}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function buildGovernanceReviewDeadlinesMarkdown(payload) {
  const lines = [
    "# Governance Review Deadlines",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- root: \`${payload.projectRoot}\``,
    `- generatedAt: \`${payload.generatedAt}\``,
    `- today: \`${payload.today}\``,
    `- status: \`${payload.status}\``,
    `- tracked reviews: ${payload.summary.totalTrackedReviews}`,
    `- overdue reviews: ${payload.summary.overdueReviews}`,
    `- due today reviews: ${payload.summary.dueTodayReviews}`,
    `- scheduled future reviews: ${payload.summary.scheduledReviews}`,
    `- next governance review: ${payload.summary.nextReviewAt ? `\`${payload.summary.nextReviewAt}\`` : "none"}`,
    "",
    "## Items",
    ""
  ];

  if ((payload.items || []).length === 0) {
    lines.push("- none");
  } else {
    for (const item of payload.items) {
      lines.push(`- \`${item.reviewType}\`: status \`${item.reviewStatus}\`, decision \`${item.decision}\`, next review ${item.nextReviewAt ? `\`${item.nextReviewAt}\`` : "none"}`);
      lines.push(`  selected: ${item.selectedProjectProfile ? `\`${item.selectedProjectProfile}\`` : "none"}, recommended: ${item.recommendedProjectProfile ? `\`${item.recommendedProjectProfile}\`` : "none"}`);
      if (item.daysOverdue > 0) lines.push(`  days overdue: ${item.daysOverdue}`);
      if (typeof item.daysUntilReview === "number" && item.daysUntilReview > 0) lines.push(`  days until review: ${item.daysUntilReview}`);
    }
  }

  lines.push("", "## Recommended Actions", "");
  if ((payload.recommendedActions || []).length === 0) {
    lines.push("- none");
  } else {
    for (const action of payload.recommendedActions) lines.push(`- ${action}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function validateTeamPolicyConfig({ context, projectRoot, policy = context.teamPolicy }) {
  const validation = buildValidationPayload({ context, policy });
  return {
    generatedAt: new Date().toISOString(),
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    projectRoot,
    ...validation,
    teamPolicy: policy
  };
}

export { createCheck, resolveCurrentSelection, resolveSkillTarget, buildCheckGroups, buildRecommendedActions, readJsonIfExists, uniqueSorted, difference };
