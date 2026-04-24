/**
 * 工具配置治理校验脚本
 * 目标：
 * 1. 把工具注册表、profile 元数据和团队默认 preset 提升为正式治理配置；
 * 2. 在发版前校验工具、profile、preset、依赖和入口目标是否自洽，避免坏配置直接进入 npm 包；
 * 3. 保证团队默认组合和预设组合都能真实展开成已注册工具，消费项目首次 init 不会卡在无效配置上。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolRegistry = readJson(path.join(root, "config", "tool-registry.json"));
const teamDefaults = readJson(path.join(root, "config", "team-defaults.json"));
const teamPolicy = readJson(path.join(root, "config", "team-policy.json"));
const templateRegistry = readJson(path.join(root, "config", "template-registry.json"));

function fail(message) {
  console.error(`[check-tooling-config] ${message}`);
  process.exitCode = 1;
}

function validateSchemaReference(filePath, payload, expectedRelativeSchemaPath) {
  if (payload.$schema !== expectedRelativeSchemaPath) {
    fail(`${path.relative(root, filePath)} 的 $schema 必须为 ${expectedRelativeSchemaPath}，当前为 ${payload.$schema || "<missing>"}`);
    return;
  }

  const schemaPath = path.resolve(path.dirname(filePath), payload.$schema);
  if (!fs.existsSync(schemaPath)) {
    fail(`${path.relative(root, filePath)} 引用的 schema 文件不存在：${payload.$schema}`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    fail(`${label} 必须是非空字符串数组`);
  }
}

function assertOptionalStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    fail(`${label} 必须是字符串数组`);
  }
}

function validateToolRegistry() {
  validateSchemaReference(path.join(root, "config", "tool-registry.json"), toolRegistry, "./schemas/tool-registry.schema.json");

  if (toolRegistry.schemaVersion !== 2) {
    fail(`tool-registry.json 的 schemaVersion 必须为 2，当前为 ${toolRegistry.schemaVersion}`);
  }

  if (!toolRegistry.instructionRendering || typeof toolRegistry.instructionRendering !== "object") {
    fail("tool-registry.json 缺少 instructionRendering 配置");
  } else {
    assertStringArray(toolRegistry.instructionRendering.sharedExecutionFlow, "tool-registry.json 的 instructionRendering.sharedExecutionFlow");
  }

  if (!Array.isArray(toolRegistry.tools) || toolRegistry.tools.length === 0) {
    fail("tool-registry.json 必须包含至少一个工具定义");
    return;
  }

  if (!Array.isArray(toolRegistry.profiles) || toolRegistry.profiles.length === 0) {
    fail("tool-registry.json 必须包含至少一个 profile 定义");
    return;
  }

  const toolNames = new Set();
  const entryTargets = new Set();

  for (const tool of toolRegistry.tools) {
    if (!tool.name || !/^[a-z0-9-]+$/.test(tool.name)) {
      fail(`工具名称不合法：${tool.name || "<empty>"}`);
    }

    if (toolNames.has(tool.name)) {
      fail(`工具名称重复：${tool.name}`);
    }
    toolNames.add(tool.name);

    if (!tool.displayName || !tool.description) {
      fail(`工具 ${tool.name} 缺少 displayName 或 description`);
    }

    if (!["native", "compatible", "experimental"].includes(tool.level)) {
      fail(`工具 ${tool.name} 的 level 不合法：${tool.level}`);
    }

    if (!["stable", "beta", "deprecated"].includes(tool.status)) {
      fail(`工具 ${tool.name} 的 status 不合法：${tool.status}`);
    }

    assertStringArray(tool.tags, `工具 ${tool.name} 的 tags`);
    assertStringArray(tool.recommendedScenarios, `工具 ${tool.name} 的 recommendedScenarios`);

    if (!Array.isArray(tool.dependsOn)) {
      fail(`工具 ${tool.name} 的 dependsOn 必须是数组`);
    }

    for (const dependencyName of tool.dependsOn || []) {
      if (!toolRegistry.tools.some((candidate) => candidate.name === dependencyName)) {
        fail(`工具 ${tool.name} 依赖了未注册工具：${dependencyName}`);
      }
    }

    if (!tool.instructionLoading || typeof tool.instructionLoading !== "object") {
      fail(`工具 ${tool.name} 缺少 instructionLoading 配置`);
    } else {
      if (tool.instructionLoading.executionFlowIntro !== undefined) {
        assertOptionalStringArray(tool.instructionLoading.executionFlowIntro, `工具 ${tool.name} 的 instructionLoading.executionFlowIntro`);
      }

      if (!tool.instructionLoading.roleLabel || typeof tool.instructionLoading.roleLabel !== "string") {
        fail(`工具 ${tool.name} 的 instructionLoading.roleLabel 必须是非空字符串`);
      }

      if (!["file", "directory", "mixed"].includes(tool.instructionLoading.primarySourceType)) {
        fail(`工具 ${tool.name} 的 instructionLoading.primarySourceType 不合法：${tool.instructionLoading.primarySourceType}`);
      }

      assertStringArray(tool.instructionLoading.primarySources, `工具 ${tool.name} 的 instructionLoading.primarySources`);
      assertOptionalStringArray(tool.instructionLoading.supplementalSources || [], `工具 ${tool.name} 的 instructionLoading.supplementalSources`);

      if (!tool.instructionLoading.routingPath || typeof tool.instructionLoading.routingPath !== "string") {
        fail(`工具 ${tool.name} 的 instructionLoading.routingPath 必须是非空字符串`);
      }

      if (!tool.instructionLoading.projectLocalPath || typeof tool.instructionLoading.projectLocalPath !== "string") {
        fail(`工具 ${tool.name} 的 instructionLoading.projectLocalPath 必须是非空字符串`);
      }

      assertStringArray(tool.instructionLoading.conflictPriority, `工具 ${tool.name} 的 instructionLoading.conflictPriority`);

      if (tool.instructionLoading.overrideNote !== undefined && typeof tool.instructionLoading.overrideNote !== "string") {
        fail(`工具 ${tool.name} 的 instructionLoading.overrideNote 必须是字符串`);
      }
    }

    if (!Array.isArray(tool.entrypoints)) {
      fail(`工具 ${tool.name} 的 entrypoints 必须是数组`);
      continue;
    }

    for (const entrypoint of tool.entrypoints) {
      if (!["file-link", "directory-link"].includes(entrypoint.type)) {
        fail(`工具 ${tool.name} 的 entrypoint.type 不合法：${entrypoint.type}`);
      }

      if (!entrypoint.source || !entrypoint.target) {
        fail(`工具 ${tool.name} 的 entrypoint 缺少 source 或 target`);
      }

      if (entryTargets.has(entrypoint.target)) {
        fail(`多个工具使用了相同的入口目标：${entrypoint.target}`);
      }
      entryTargets.add(entrypoint.target);
    }
  }

  const profileNames = new Set();
  for (const profile of toolRegistry.profiles) {
    if (!profile.name || !/^[a-z0-9-]+$/.test(profile.name)) {
      fail(`profile 名称不合法：${profile.name || "<empty>"}`);
    }

    if (profileNames.has(profile.name)) {
      fail(`profile 名称重复：${profile.name}`);
    }
    profileNames.add(profile.name);

    if (!profile.displayName || !profile.description) {
      fail(`profile ${profile.name} 缺少 displayName 或 description`);
    }

    if (!["stable", "beta", "deprecated"].includes(profile.status)) {
      fail(`profile ${profile.name} 的 status 不合法：${profile.status}`);
    }

    assertStringArray(profile.tags, `profile ${profile.name} 的 tags`);
    assertStringArray(profile.recommendedScenarios, `profile ${profile.name} 的 recommendedScenarios`);

    if (!Array.isArray(profile.tools) || profile.tools.length === 0) {
      fail(`profile ${profile.name} 至少需要一个工具`);
      continue;
    }

    for (const toolName of profile.tools) {
      if (!toolNames.has(toolName)) {
        fail(`profile ${profile.name} 引用了未注册工具：${toolName}`);
      }
    }
  }
}

function validateTemplateRegistry() {
  validateSchemaReference(path.join(root, "config", "template-registry.json"), templateRegistry, "./schemas/template-registry.schema.json");

  if (templateRegistry.schemaVersion !== 1) {
    fail(`template-registry.json 的 schemaVersion 必须为 1，当前为 ${templateRegistry.schemaVersion}`);
  }

  if (!Array.isArray(templateRegistry.templates) || templateRegistry.templates.length === 0) {
    fail("template-registry.json 必须包含至少一个 templates 定义");
    return;
  }

  const toolNames = new Set(toolRegistry.tools.map((tool) => tool.name));
  const templateNames = new Set();
  const templateSources = new Set();
  const templateOutputs = new Set();
  const allowedPlaceholders = new Set(["POWER_AI_EXECUTION_FLOW", "POWER_AI_READ_PRIORITY", "POWER_AI_CONVERSATION_CAPTURE"]);

  for (const template of templateRegistry.templates) {
    if (!template.name || !/^[a-z0-9-]+$/.test(template.name)) {
      fail(`template 名称不合法：${template.name || "<empty>"}`);
    }

    if (templateNames.has(template.name)) {
      fail(`template 名称重复：${template.name}`);
    }
    templateNames.add(template.name);

    if (!template.source || typeof template.source !== "string") {
      fail(`template ${template.name} 缺少 source`);
    }

    if (!template.output || typeof template.output !== "string") {
      fail(`template ${template.name} 缺少 output`);
    }

    if (templateSources.has(template.source)) {
      fail(`template source 重复：${template.source}`);
    }
    templateSources.add(template.source);

    if (templateOutputs.has(template.output)) {
      fail(`template output 重复：${template.output}`);
    }
    templateOutputs.add(template.output);

    if (!template.ownerTool || !toolNames.has(template.ownerTool)) {
      fail(`template ${template.name} 的 ownerTool 未注册：${template.ownerTool || "<empty>"}`);
    }

    if (!Array.isArray(template.placeholders) || template.placeholders.some((item) => typeof item !== "string")) {
      fail(`template ${template.name} 的 placeholders 必须是字符串数组`);
    } else {
      for (const placeholder of template.placeholders) {
        if (!allowedPlaceholders.has(placeholder)) {
          fail(`template ${template.name} 使用了未支持的 placeholder：${placeholder}`);
        }
      }
    }

    const templateSourcePath = path.join(root, "templates", "project", ...template.source.split("/"));
    if (!template.source.includes("/")) {
      fail(`template ${template.name} 的 source 必须是相对 templates/project 的子路径：${template.source}`);
    }

    if (!template.output.includes("/")) {
      fail(`template ${template.name} 的 output 必须是相对 .power-ai 的子路径：${template.output}`);
    }

    if (!fs.existsSync(templateSourcePath)) {
      fail(`template ${template.name} 的 source 文件不存在：${template.source}`);
    }
  }

  for (const tool of toolRegistry.tools) {
    for (const entrypoint of tool.entrypoints || []) {
      if (entrypoint.type !== "file-link") continue;
      if (!templateOutputs.has(entrypoint.source)) {
        fail(`工具 ${tool.name} 的 file-link 入口未在 template-registry.json 中声明：${entrypoint.source}`);
      }
    }
  }
}

function validatePresetSelection(selection, label, presetNames, profileNames, toolNames) {
  if (!selection || typeof selection !== "object") {
    fail(`${label} 必须是对象`);
    return;
  }

  const profileList = [
    ...(selection.profile ? [selection.profile] : []),
    ...(selection.profiles || [])
  ];
  const toolList = selection.tools || [];
  const excludeTools = selection.excludeTools || [];

  if (!selection.preset && profileList.length === 0 && toolList.length === 0) {
    fail(`${label} 至少需要 preset、profile/profiles 或 tools 之一`);
  }

  if (selection.preset && !presetNames.has(selection.preset)) {
    fail(`${label} 引用了未注册 preset：${selection.preset}`);
  }

  if (selection.profile && typeof selection.profile !== "string") {
    fail(`${label} 的 profile 必须是字符串`);
  }

  if (selection.profiles && (!Array.isArray(selection.profiles) || selection.profiles.some((item) => typeof item !== "string"))) {
    fail(`${label} 的 profiles 必须是字符串数组`);
  }

  if (selection.tools && (!Array.isArray(selection.tools) || selection.tools.some((item) => typeof item !== "string"))) {
    fail(`${label} 的 tools 必须是字符串数组`);
  }

  if (selection.excludeTools && (!Array.isArray(selection.excludeTools) || selection.excludeTools.some((item) => typeof item !== "string"))) {
    fail(`${label} 的 excludeTools 必须是字符串数组`);
  }

  for (const profileName of profileList) {
    if (!profileNames.has(profileName)) {
      fail(`${label} 引用了未注册 profile：${profileName}`);
    }
  }

  for (const toolName of [...toolList, ...excludeTools]) {
    if (!toolNames.has(toolName)) {
      fail(`${label} 引用了未注册工具：${toolName}`);
    }
  }
}

function validateTeamDefaults() {
  validateSchemaReference(path.join(root, "config", "team-defaults.json"), teamDefaults, "./schemas/team-defaults.schema.json");

  if (teamDefaults.schemaVersion !== 2) {
    fail(`team-defaults.json 的 schemaVersion 必须为 2，当前为 ${teamDefaults.schemaVersion}`);
  }

  const toolNames = new Set(toolRegistry.tools.map((tool) => tool.name));
  const profileNames = new Set(toolRegistry.profiles.map((profile) => profile.name));

  if (!Array.isArray(teamDefaults.presetSelections) || teamDefaults.presetSelections.length === 0) {
    fail("team-defaults.json 必须包含至少一个 presetSelections 定义");
    return;
  }

  const presetNames = new Set();
  for (const preset of teamDefaults.presetSelections) {
    if (!preset.name || !/^[a-z0-9-]+$/.test(preset.name)) {
      fail(`preset 名称不合法：${preset.name || "<empty>"}`);
    }

    if (presetNames.has(preset.name)) {
      fail(`preset 名称重复：${preset.name}`);
    }
    presetNames.add(preset.name);

    if (!preset.displayName || !preset.description) {
      fail(`preset ${preset.name} 缺少 displayName 或 description`);
    }

    if (!["stable", "beta", "deprecated"].includes(preset.status)) {
      fail(`preset ${preset.name} 的 status 不合法：${preset.status}`);
    }

    assertStringArray(preset.tags, `preset ${preset.name} 的 tags`);
    assertStringArray(preset.recommendedScenarios, `preset ${preset.name} 的 recommendedScenarios`);
  }

  for (const preset of teamDefaults.presetSelections) {
    validatePresetSelection(preset, `preset ${preset.name}`, presetNames, profileNames, toolNames);
  }

  if (!teamDefaults.defaultSelection) {
    fail("team-defaults.json 缺少 defaultSelection");
    return;
  }

  validatePresetSelection(teamDefaults.defaultSelection, "defaultSelection", presetNames, profileNames, toolNames);
}

function validateTeamPolicy() {
  validateSchemaReference(path.join(root, "config", "team-policy.json"), teamPolicy, "./schemas/team-policy.schema.json");

  if (teamPolicy.schemaVersion !== 1) {
    fail(`team-policy.json 的 schemaVersion 必须为 1，当前为 ${teamPolicy.schemaVersion}`);
  }

  const toolNames = new Set(toolRegistry.tools.map((tool) => tool.name));
  const presetNames = new Set(teamDefaults.presetSelections.map((preset) => preset.name));
  const knownSkillPaths = new Set();
  for (const groupEntry of fs.readdirSync(path.join(root, "skills"), { withFileTypes: true })) {
    if (!groupEntry.isDirectory()) continue;
    const groupRoot = path.join(root, "skills", groupEntry.name);
    for (const skillEntry of fs.readdirSync(groupRoot, { withFileTypes: true })) {
      if (!skillEntry.isDirectory()) continue;
      knownSkillPaths.add(`${groupEntry.name}/${skillEntry.name}`);
    }
  }

  assertStringArray(teamPolicy.allowedTools, "team-policy.json 的 allowedTools");
  assertStringArray(teamPolicy.defaultTools, "team-policy.json 的 defaultTools");
  assertStringArray(teamPolicy.requiredSkills, "team-policy.json 的 requiredSkills");

  for (const toolName of teamPolicy.allowedTools || []) {
    if (!toolNames.has(toolName)) {
      fail(`team-policy.json allowedTools 引用了未注册工具：${toolName}`);
    }
  }

  for (const toolName of teamPolicy.defaultTools || []) {
    if (!toolNames.has(toolName)) {
      fail(`team-policy.json defaultTools 引用了未注册工具：${toolName}`);
    }
    if (!(teamPolicy.allowedTools || []).includes(toolName)) {
      fail(`team-policy.json defaultTools 必须同时包含在 allowedTools 中：${toolName}`);
    }
  }

  for (const skillPath of teamPolicy.requiredSkills || []) {
    if (!knownSkillPaths.has(skillPath)) {
      fail(`team-policy.json requiredSkills 引用了不存在的 skill：${skillPath}`);
    }
  }

  if (!teamPolicy.wrapperPolicies || typeof teamPolicy.wrapperPolicies !== "object") {
    fail("team-policy.json 缺少 wrapperPolicies 配置");
  } else if (!teamPolicy.wrapperPolicies.rolloutStages || typeof teamPolicy.wrapperPolicies.rolloutStages !== "object") {
    fail("team-policy.json 的 wrapperPolicies.rolloutStages 必须是对象");
  } else {
    for (const [toolName, stage] of Object.entries(teamPolicy.wrapperPolicies.rolloutStages)) {
      if (!toolNames.has(toolName)) {
        fail(`team-policy.json wrapperPolicies.rolloutStages 引用了未注册工具：${toolName}`);
      }
      if (!["general", "pilot", "compatible-only", "disabled"].includes(stage)) {
        fail(`team-policy.json wrapperPolicies.rolloutStages 的阶段不合法：${toolName} -> ${stage}`);
      }
    }
  }

  if (!Array.isArray(teamPolicy.projectProfiles) || teamPolicy.projectProfiles.length === 0) {
    fail("team-policy.json 必须包含至少一个 projectProfiles 定义");
  } else {
    const profileNames = new Set();
    for (const profile of teamPolicy.projectProfiles) {
      if (!profile.name || !/^[a-z0-9-]+$/.test(profile.name)) {
        fail(`team-policy.json projectProfiles 名称不合法：${profile.name || "<empty>"}`);
      }
      if (profileNames.has(profile.name)) {
        fail(`team-policy.json projectProfiles 名称重复：${profile.name}`);
      }
      profileNames.add(profile.name);

      if (!profile.displayName || typeof profile.displayName !== "string") {
        fail(`team-policy.json projectProfiles.${profile.name} 缺少 displayName`);
      }
      if (!profile.defaultPreset || !presetNames.has(profile.defaultPreset)) {
        fail(`team-policy.json projectProfiles.${profile.name} 引用了未注册 preset：${profile.defaultPreset || "<empty>"}`);
      }
      assertStringArray(profile.allowedTools, `team-policy.json projectProfiles.${profile.name}.allowedTools`);
      assertStringArray(profile.requiredSkills, `team-policy.json projectProfiles.${profile.name}.requiredSkills`);

      for (const toolName of profile.allowedTools || []) {
        if (!toolNames.has(toolName)) {
          fail(`team-policy.json projectProfiles.${profile.name}.allowedTools 引用了未注册工具：${toolName}`);
        }
        if (!(teamPolicy.allowedTools || []).includes(toolName)) {
          fail(`team-policy.json projectProfiles.${profile.name}.allowedTools 必须同时包含在 allowedTools 中：${toolName}`);
        }
      }

      for (const skillPath of profile.requiredSkills || []) {
        if (!knownSkillPaths.has(skillPath)) {
          fail(`team-policy.json projectProfiles.${profile.name}.requiredSkills 引用了不存在的 skill：${skillPath}`);
        }
      }
    }
  }

  if (!teamPolicy.releasePolicies || typeof teamPolicy.releasePolicies !== "object") {
    fail("team-policy.json 缺少 releasePolicies 配置");
  } else {
    assertStringArray(teamPolicy.releasePolicies.requiredReports, "team-policy.json releasePolicies.requiredReports");
    assertStringArray(teamPolicy.releasePolicies.requiredChecks, "team-policy.json releasePolicies.requiredChecks");
    if (typeof teamPolicy.releasePolicies.enforceConsumerMatrix !== "boolean") {
      fail("team-policy.json releasePolicies.enforceConsumerMatrix 必须是布尔值");
    }
    if (typeof teamPolicy.releasePolicies.enforceReleaseGates !== "boolean") {
      fail("team-policy.json releasePolicies.enforceReleaseGates 必须是布尔值");
    }
  }
}

validateToolRegistry();
validateTemplateRegistry();
validateTeamDefaults();
validateTeamPolicy();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("工具配置校验通过");
