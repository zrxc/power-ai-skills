/**
 * 工具选择服务模块
 * 功能：提供工具选择、配置解析和交互式提示功能
 */

// 导入必要的模块
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { readJson } from "../../scripts/shared.mjs";
import { detectRecommendedTeamProjectProfile } from "../team-policy/project-profile-detection.mjs";
import { parsePositionalSelection } from "./cli.mjs";
import {
  getPresetMap,
  normalizePresetNames,
  normalizeSelectionInput,
  normalizeToolNames
} from "./shared.mjs";

/**
 * 创建工具选择服务
 * @param {object} options - 配置选项
 * @param {object} options.context - 应用上下文
 * @param {object} options.cliArgs - CLI 参数
 * @param {string} options.projectRoot - 项目根目录路径
 * @returns {object} 工具选择服务对象
 */
export function createSelectionService({ context, cliArgs, projectRoot }) {
  const teamPolicyProjectProfileMap = new Map((context.teamPolicy.projectProfiles || []).map((profile) => [profile.name, profile]));

  /**
   * 获取选项值
   * @param {string} optionName - 选项名称
   * @returns {string[]} 选项值数组
   */
  function getOptionValues(optionName) {
    return cliArgs.values.get(optionName) || [];
  }

  /**
   * 检查是否有指定标志
   * @param {string} flagName - 标志名称
   * @returns {boolean} 是否存在标志
   */
  function hasFlag(flagName) {
    return cliArgs.flags.has(flagName);
  }

  function getRequestedProjectProfileName() {
    return getOptionValues("--project-profile")[0] || "";
  }

  function getTeamPolicyProjectProfile(projectProfileName = getRequestedProjectProfileName(), { optional = false } = {}) {
    if (!projectProfileName) return null;
    const projectProfile = teamPolicyProjectProfileMap.get(projectProfileName);
    if (!projectProfile && !optional) throw new Error(`Unknown team project profile: ${projectProfileName}`);
    return projectProfile || null;
  }

  function resolveRequiredSkills(projectProfileName = "") {
    const projectProfile = getTeamPolicyProjectProfile(projectProfileName, { optional: true });
    return projectProfile?.requiredSkills || context.teamPolicy.requiredSkills || [];
  }

  function detectProjectProfileRecommendation() {
    const projectProfilePath = path.join(projectRoot, context.powerAiDirName, "analysis", "project-profile.json");
    return detectRecommendedTeamProjectProfile({
      context,
      projectRoot,
      projectProfileArtifact: fs.existsSync(projectProfilePath) ? readJson(projectProfilePath) : null
    });
  }

  /**
   * 解析 Profile 包含的工具
   * @param {string[]} profileNames - Profile 名称数组
   * @returns {string[]} 工具名称数组
   */
  function resolveProfileTools(profileNames) {
    const result = [];
    for (const profileName of profileNames) {
      const profile = context.registryProfileMap.get(profileName);
      if (!profile) throw new Error(`Unknown profile: ${profileName}`);
      result.push(...profile.tools);
    }
    return result;
  }

  /**
   * 扩展工具选择（包含依赖）
   * @param {string[]} toolNames - 工具名称数组
   * @returns {string[]} 扩展后的工具名称数组
   */
  function expandToolSelection(toolNames) {
    const expanded = new Set();

    /**
     * 递归访问工具及其依赖
     * @param {string} toolName - 工具名称
     */
    function visit(toolName) {
      const tool = context.registryToolMap.get(toolName);
      if (!tool) throw new Error(`Unknown tool: ${toolName}`);
      if (expanded.has(toolName)) return;
      expanded.add(toolName);
      // 递归访问依赖的工具
      for (const dependencyName of tool.dependsOn || []) visit(dependencyName);
    }

    // 遍历所有工具，收集依赖
    for (const toolName of toolNames) visit(toolName);
    return normalizeToolNames([...expanded]);
  }

  /**
   * 解析选择配置
   * @param {object} options - 配置选项
   * @param {object} options.defaultsConfig - 默认配置
   * @param {string[]} options.presetNames - Preset 名称数组
   * @param {string[]} options.profileNames - Profile 名称数组
   * @param {string[]} options.toolNames - 工具名称数组
   * @returns {object} 选择配置对象
   */
  function resolveSelectionConfig({ defaultsConfig = context.teamDefaults, presetNames = [], profileNames = [], toolNames = [] } = {}) {
    const presetMap = getPresetMap(defaultsConfig);
    const selectedPresets = normalizePresetNames(presetNames);
    const selectedProfiles = normalizeToolNames(profileNames);
    const directTools = normalizeToolNames(toolNames);
    const presetProfiles = [];
    const presetTools = [];
    const presetExcludeTools = [];

    // 解析 Preset 中的配置
    for (const presetName of selectedPresets) {
      const preset = presetMap.get(presetName);
      if (!preset) throw new Error(`Unknown preset: ${presetName}`);
      presetProfiles.push(...normalizeSelectionInput(preset.profiles));
      presetTools.push(...normalizeSelectionInput(preset.tools));
      presetExcludeTools.push(...normalizeSelectionInput(preset.excludeTools));
    }

    // 合并 Profile 和工具
    const mergedProfiles = normalizeToolNames([...presetProfiles, ...selectedProfiles]);
    const expandedFromProfiles = resolveProfileTools(mergedProfiles);
    const beforeExclude = normalizeToolNames([...expandedFromProfiles, ...presetTools, ...directTools]);
    const excluded = new Set(normalizeToolNames(presetExcludeTools));

    return {
      selectedPresets,
      selectedProfiles: mergedProfiles,
      selectedTools: beforeExclude.filter((toolName) => !excluded.has(toolName))
    };
  }

  /**
   * 加载已选择的工具配置
   * @returns {object|null} 工具配置对象，如果不存在则返回 null
   */
  function loadSelectedToolsConfig() {
    const target = path.join(projectRoot, context.powerAiDirName, "selected-tools.json");
    return fs.existsSync(target) ? readJson(target) : null;
  }

  /**
   * 加载项目团队默认配置
   * @returns {object|null} 团队默认配置对象，如果不存在则返回 null
   */
  function loadProjectTeamDefaults() {
    const target = path.join(projectRoot, context.powerAiDirName, "team-defaults.json");
    return fs.existsSync(target) ? readJson(target) : null;
  }

  /**
   * 获取有效的团队默认配置
   * @returns {object} 团队默认配置对象
   */
  function getEffectiveTeamDefaults() {
    return loadProjectTeamDefaults() || context.teamDefaults;
  }

  /**
   * 解析团队默认选择
   * @returns {object} 选择配置对象
   */
  function resolveTeamDefaultSelection({ projectProfileName = getRequestedProjectProfileName() } = {}) {
    const projectTeamDefaults = loadProjectTeamDefaults();
    const effectiveDefaults = projectTeamDefaults || context.teamDefaults;
    const recommendedProjectProfile = projectProfileName ? null : detectProjectProfileRecommendation();
    const resolvedProjectProfileName = projectProfileName || recommendedProjectProfile?.recommendedProjectProfile || "";
    const projectProfile = getTeamPolicyProjectProfile(resolvedProjectProfileName, { optional: true });
    const defaultPresetNames = projectProfile
      ? [projectProfile.defaultPreset]
      : normalizeSelectionInput(effectiveDefaults.defaultSelection?.preset || effectiveDefaults.defaultSelection?.presets);
    const selection = resolveSelectionConfig({
      defaultsConfig: effectiveDefaults,
      presetNames: defaultPresetNames,
      profileNames: normalizeSelectionInput(effectiveDefaults.defaultSelection?.profile || effectiveDefaults.defaultSelection?.profiles),
      toolNames: normalizeSelectionInput(effectiveDefaults.defaultSelection?.tools)
    });
    const selectedTools = projectProfile
      ? selection.selectedTools.filter((toolName) => projectProfile.allowedTools.includes(toolName))
      : selection.selectedTools;

    if (selectedTools.length === 0) {
      throw new Error("Team defaults do not produce any tools. Check config/team-defaults.json.");
    }

    return {
      mode: "team-default",
      selectedPresets: projectProfile ? [projectProfile.defaultPreset] : selection.selectedPresets,
      selectedProfiles: selection.selectedProfiles,
      selectedProjectProfile: projectProfile?.name || "",
      recommendedProjectProfile: recommendedProjectProfile?.recommendedProjectProfile || "",
      recommendedProjectProfileReason: recommendedProjectProfile?.reason || "",
      requiredSkills: resolveRequiredSkills(projectProfile?.name || ""),
      selectedTools,
      expandedTools: expandToolSelection(selectedTools),
      sourceDescription: projectProfile
        ? recommendedProjectProfile?.recommendedProjectProfile
          ? `auto-team-project-profile:${projectProfile.name}`
          : `team-project-profile:${projectProfile.name}`
        : projectTeamDefaults
          ? "project-team-default"
          : "package-team-default"
    };
  }

  /**
   * 推断遗留工具
   * 通过检查项目中的遗留文件来推断已使用的工具
   * @returns {string[]} 推断的工具名称数组
   */
  function inferLegacyTools() {
    const inferred = [];
    // 检查各种工具的遗留文件
    if (fs.existsSync(path.join(projectRoot, ".codex", "skills"))) inferred.push("codex");
    if (fs.existsSync(path.join(projectRoot, ".trae", "skills"))) inferred.push("trae");
    if (fs.existsSync(path.join(projectRoot, ".cursor", "rules", "skills.mdc"))) inferred.push("cursor");
    if (fs.existsSync(path.join(projectRoot, "CLAUDE.md"))) inferred.push("claude-code");
    if (fs.existsSync(path.join(projectRoot, "GEMINI.md"))) inferred.push("gemini-cli");
    if (fs.existsSync(path.join(projectRoot, ".clinerules", "01-power-ai.md"))) inferred.push("cline");
    if (fs.existsSync(path.join(projectRoot, ".windsurf", "rules", "01-power-ai.md"))) inferred.push("windsurf");
    if (fs.existsSync(path.join(projectRoot, ".aider.conf.yml")) || fs.existsSync(path.join(projectRoot, "CONVENTIONS.md"))) inferred.push("aider");
    if (fs.existsSync(path.join(projectRoot, "AGENTS.md"))) inferred.push("agents-md");
    return normalizeToolNames(inferred);
  }

  /**
   * 解析工具选择
   * @param {object} options - 配置选项
   * @param {boolean} options.allowLegacyInference - 是否允许遗留推断
   * @param {boolean} options.ignoreExplicit - 是否忽略显式输入
   * @returns {object} 选择配置对象
   */
  function resolveSelection({ allowLegacyInference = true, ignoreExplicit = false } = {}) {
    const requestedProjectProfileName = getRequestedProjectProfileName();
    const positionalSelection = parsePositionalSelection({ context, positionals: cliArgs.positionals, defaultsConfig: getEffectiveTeamDefaults() });
    const explicitSelection = resolveSelectionConfig({
      defaultsConfig: getEffectiveTeamDefaults(),
      presetNames: [...getOptionValues("--preset"), ...positionalSelection.selectedPresets],
      profileNames: [...getOptionValues("--profile"), ...positionalSelection.selectedProfiles],
      toolNames: [...getOptionValues("--tool"), ...positionalSelection.selectedTools]
    });
    const existingConfig = loadSelectedToolsConfig();
    const inferredLegacyTools = allowLegacyInference ? inferLegacyTools() : [];

    // 优先使用显式选择
    if (!ignoreExplicit && explicitSelection.selectedTools.length > 0) {
      return {
        mode: "explicit",
        ...explicitSelection,
        selectedProjectProfile: requestedProjectProfileName,
        requiredSkills: resolveRequiredSkills(requestedProjectProfileName),
        expandedTools: expandToolSelection(explicitSelection.selectedTools),
        inferredLegacyTools
      };
    }

    // 使用现有配置
    if (existingConfig?.selectedTools?.length) {
      const selectedProjectProfile = existingConfig.selectedProjectProfile || "";
      return {
        mode: "existing",
        selectedPresets: existingConfig.selectedPresets || [],
        selectedProfiles: existingConfig.selectedProfiles || [],
        selectedProjectProfile,
        requiredSkills: resolveRequiredSkills(selectedProjectProfile),
        selectedTools: normalizeToolNames(existingConfig.selectedTools),
        expandedTools: expandToolSelection(existingConfig.selectedTools),
        inferredLegacyTools
      };
    }

    // 使用遗留推断
    if (inferredLegacyTools.length > 0) {
      const selectedTools = inferredLegacyTools.filter((toolName) => toolName !== "agents-md");
      return {
        mode: "legacy",
        selectedPresets: [],
        selectedProfiles: [],
        selectedProjectProfile: "",
        requiredSkills: resolveRequiredSkills(""),
        selectedTools: selectedTools.length ? selectedTools : inferredLegacyTools,
        expandedTools: expandToolSelection(inferredLegacyTools),
        inferredLegacyTools
      };
    }

    // 使用团队默认选择
    return resolveTeamDefaultSelection({ projectProfileName: requestedProjectProfileName });
  }

  /**
   * 获取可交互选择的工具列表
   * @returns {object[]} 可选择的工具数组
   */
  function getInteractiveSelectableTools() {
    return context.toolRegistry.tools.filter((tool) => tool.name !== "agents-md" && tool.status !== "deprecated");
  }

  /**
   * 解析交互式答案
   * @param {string} answer - 用户输入的答案
   * @param {object[]} selectableTools - 可选择的工具数组
   * @returns {string[]} 工具名称数组
   */
  function parseInteractiveAnswer(answer, selectableTools) {
    const indexMap = new Map(selectableTools.map((tool, index) => [String(index + 1), tool.name]));
    const tools = [];
    for (const token of String(answer || "").split(/[\s,|]+/).map((item) => item.trim()).filter(Boolean)) {
      const toolName = indexMap.get(token) || token;
      if (!context.registryToolMap.has(toolName)) throw new Error(`Unknown tool: ${toolName}`);
      tools.push(toolName);
    }
    return normalizeToolNames(tools);
  }

  /**
   * 提示用户进行初始化选择
   * @returns {Promise<object>} 选择配置对象
   */
  async function promptInitSelection() {
    const defaultsSelection = resolveTeamDefaultSelection({
      projectProfileName: getRequestedProjectProfileName()
    });
    const selectableTools = getInteractiveSelectableTools();
    
    // 显示可选工具列表
    console.log("Select the AI tools to initialize for this project:");
    for (const [index, tool] of selectableTools.entries()) {
      console.log(`${index + 1}. ${tool.name} (${tool.displayName}) [${tool.level}/${tool.status}]`);
    }
    console.log(`Press Enter to use the team defaults: ${defaultsSelection.selectedTools.join(", ")}`);
    console.log("Enter indexes or tool names, separated by spaces, commas, or pipes.");

    // 创建 readline 接口
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
      // 获取用户输入
      const rawSelection = (await readline.question("Tool selection: ")).trim();
      const selectedTools = rawSelection ? parseInteractiveAnswer(rawSelection, selectableTools) : defaultsSelection.selectedTools;
      if (!selectedTools.length) throw new Error("At least one tool must be selected.");
      
      // 确认选择
      const confirmation = (await readline.question(`Confirm initialization for ${selectedTools.join(", ")} [Y/n]: `)).trim().toLowerCase();
      if (confirmation === "n" || confirmation === "no") throw new Error("Initialization cancelled.");
      
      return {
        mode: rawSelection ? "interactive" : defaultsSelection.mode,
        selectedPresets: rawSelection ? [] : defaultsSelection.selectedPresets,
        selectedProfiles: rawSelection ? [] : defaultsSelection.selectedProfiles,
        selectedProjectProfile: rawSelection ? getRequestedProjectProfileName() : defaultsSelection.selectedProjectProfile,
        requiredSkills: rawSelection ? resolveRequiredSkills(getRequestedProjectProfileName()) : defaultsSelection.requiredSkills,
        selectedTools,
        expandedTools: expandToolSelection(selectedTools),
        sourceDescription: rawSelection ? "interactive-selection" : defaultsSelection.sourceDescription
      };
    } finally {
      readline.close();
    }
  }

  /**
   * 检查是否有显式选择输入
   * @returns {boolean} 是否有显式选择输入
   */
  function hasExplicitSelectionInput() {
    const positionalSelection = parsePositionalSelection({ context, positionals: cliArgs.positionals, defaultsConfig: getEffectiveTeamDefaults() });
    return Boolean(
      getOptionValues("--tool").length ||
      getOptionValues("--profile").length ||
      getOptionValues("--preset").length ||
      positionalSelection.selectedTools.length ||
      positionalSelection.selectedProfiles.length ||
      positionalSelection.selectedPresets.length
    );
  }

  /**
   * 获取选择摘要
   * @param {object} selection - 选择配置对象
   * @returns {string} 选择摘要字符串
   */
  function getSelectionSummary(selection) {
    const presetSummary = selection.selectedPresets?.length ? `, preset: ${selection.selectedPresets.join(", ")}` : "";
    const profileSummary = selection.selectedProfiles?.length ? `, profile: ${selection.selectedProfiles.join(", ")}` : "";
    const projectProfileSummary = selection.selectedProjectProfile ? `, project profile: ${selection.selectedProjectProfile}` : "";
    return `tools: ${selection.expandedTools.join(", ")}${presetSummary}${profileSummary}${projectProfileSummary}`;
  }

  return {
    getOptionValues,
    hasFlag,
    getRequestedProjectProfileName,
    getTeamPolicyProjectProfile,
    detectProjectProfileRecommendation,
    resolveRequiredSkills,
    normalizeToolNames,
    normalizePresetNames,
    normalizeSelectionInput,
    parsePositionalSelection: (positionals, defaultsConfig) => parsePositionalSelection({ context, positionals, defaultsConfig }),
    resolveSelectionConfig,
    loadSelectedToolsConfig,
    loadProjectTeamDefaults,
    getEffectiveTeamDefaults,
    resolveTeamDefaultSelection,
    inferLegacyTools,
    resolveSelection,
    getInteractiveSelectableTools,
    promptInitSelection,
    hasExplicitSelectionInput,
    getSelectionSummary,
    expandToolSelection
  };
}
