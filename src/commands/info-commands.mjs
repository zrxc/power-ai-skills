/**
 * 信息命令模块
 * 功能：提供工具列表、默认配置、诊断和版本信息相关的命令
 */

import { buildDoctorMarkdown, buildDoctorSummary } from "../doctor/reporting.mjs";

/**
 * 创建信息命令处理器
 * @param {object} options - 配置选项
 * @param {object} options.context - 应用上下文，包含包信息和配置
 * @param {object} options.selectionService - 工具选择服务
 * @param {object} options.doctorService - 诊断服务
 * @param {object} options.outputHelpers - 输出辅助工具
 * @returns {object} 信息命令处理器对象
 */
export function createInfoCommands({ context, selectionService, doctorService, governanceContextService, outputHelpers }) {
  /**
   * 打印工具列表摘要
   * @returns {string} 格式化的工具列表摘要
   */
  function printToolListSummary() {
    const lines = [`Package: ${context.packageJson.name}@${context.packageJson.version}`, "", "Tools:"];
    // 遍历所有工具
    for (const tool of context.toolRegistry.tools) {
      const scenarios = (tool.recommendedScenarios || []).join(" / ") || "-";
      lines.push(`- ${tool.name} [${tool.level}/${tool.status}]`);
      lines.push(`  tags: ${(tool.tags || []).join(", ") || "-"}`);
      lines.push(`  scenarios: ${scenarios}`);
    }

    // 添加 Profiles 信息
    lines.push("", "Profiles:");
    for (const profile of context.toolRegistry.profiles) {
      lines.push(`- ${profile.name} [${profile.status}] -> ${(profile.tools || []).join(", ")}`);
    }

    // 添加团队预设信息
    lines.push("", "Team presets:");
    for (const preset of context.teamDefaults.presetSelections || []) {
      const presetTools = selectionService.resolveSelectionConfig({
        defaultsConfig: context.teamDefaults,
        presetNames: [preset.name]
      }).selectedTools;
      lines.push(`- ${preset.name} [${preset.status}] -> ${presetTools.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * 打印默认配置摘要
   * @param {object} payload - 默认配置数据
   * @returns {string} 格式化的默认配置摘要
   */
  function printDefaultsSummary(payload) {
    const lines = [
      `Package: ${payload.packageName}@${payload.version}`,
      `Default selection: ${selectionService.getSelectionSummary(payload.effectiveSelection)}`,
      `Source: ${payload.effectiveSelection.sourceDescription || "manual"}`,
      `Requested project profile: ${payload.requestedProjectProfile || "none"}`,
      `Recommended project profile: ${payload.recommendedProjectProfile || "none"}`,
      payload.projectTeamDefaults ? "Project overrides: enabled" : "Project overrides: not set",
      "",
      "Preset details:"
    ];

    if (payload.teamProjectProfile) {
      lines.splice(4, 0, `Profile preset: ${payload.teamProjectProfile.defaultPreset}`);
      lines.splice(5, 0, `Profile required skills: ${(payload.effectiveSelection.requiredSkills || []).join(", ") || "none"}`);
    }

    // 遍历所有预设
    for (const preset of payload.effectiveTeamDefaults.presetSelections || []) {
      const presetTools = selectionService.resolveSelectionConfig({
        defaultsConfig: payload.effectiveTeamDefaults,
        presetNames: [preset.name]
      }).selectedTools;
      lines.push(`- ${preset.name} [${preset.status}] -> ${presetTools.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * 打印工具列表 Markdown 格式
   * @returns {string} Markdown 格式的工具列表
   */
  function printToolListMarkdown() {
    const lines = [`# ${context.packageJson.name}@${context.packageJson.version}`, "", "## Tools"];
    // 遍历所有工具
    for (const tool of context.toolRegistry.tools) {
      lines.push(`- \`${tool.name}\` [${tool.level}/${tool.status}]`);
      lines.push(`  tags: ${(tool.tags || []).join(", ") || "-"}`);
      lines.push(`  scenarios: ${(tool.recommendedScenarios || []).join(" / ") || "-"}`);
    }

    // 添加 Profiles 信息
    lines.push("", "## Profiles");
    for (const profile of context.toolRegistry.profiles) {
      lines.push(`- \`${profile.name}\` [${profile.status}] -> ${(profile.tools || []).join(", ")}`);
    }

    // 添加团队预设信息
    lines.push("", "## Team Presets");
    for (const preset of context.teamDefaults.presetSelections || []) {
      const presetTools = selectionService.resolveSelectionConfig({
        defaultsConfig: context.teamDefaults,
        presetNames: [preset.name]
      }).selectedTools;
      lines.push(`- \`${preset.name}\` [${preset.status}] -> ${presetTools.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * 打印默认配置 Markdown 格式
   * @param {object} payload - 默认配置数据
   * @returns {string} Markdown 格式的默认配置
   */
  function printDefaultsMarkdown(payload) {
    const lines = [
      `# ${payload.packageName}@${payload.version}`,
      "",
      "## Effective Selection",
      `- ${selectionService.getSelectionSummary(payload.effectiveSelection)}`,
      `- source: ${payload.effectiveSelection.sourceDescription || "manual"}`,
      `- requested project profile: ${payload.requestedProjectProfile || "none"}`,
      `- recommended project profile: ${payload.recommendedProjectProfile || "none"}`,
      `- project overrides: ${payload.projectTeamDefaults ? "enabled" : "not set"}`
    ];

    if (payload.teamProjectProfile) {
      lines.push(`- profile preset: ${payload.teamProjectProfile.defaultPreset}`);
      lines.push(`- profile required skills: ${(payload.effectiveSelection.requiredSkills || []).map((item) => `\`${item}\``).join(", ") || "none"}`);
    }

    lines.push("", "## Presets");

    // 遍历所有预设
    for (const preset of payload.effectiveTeamDefaults.presetSelections || []) {
      const presetTools = selectionService.resolveSelectionConfig({
        defaultsConfig: payload.effectiveTeamDefaults,
        presetNames: [preset.name]
      }).selectedTools;
      lines.push(`- \`${preset.name}\` [${preset.status}] -> ${presetTools.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * 列出工具命令
   * 显示所有可用工具、profiles 和团队预设
   */
  function listToolsCommand() {
    const payload = {
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      toolRegistry: context.toolRegistry,
      teamPresets: context.teamDefaults.presetSelections || []
    };

    // 根据输出格式选择对应的输出方式
    if (outputHelpers.getOutputFormat() === "summary") return outputHelpers.emitCommandOutput(printToolListSummary());
    if (outputHelpers.getOutputFormat() === "markdown") return outputHelpers.emitCommandOutput(printToolListMarkdown());
    outputHelpers.emitCommandOutput(JSON.stringify(payload, null, 2));
  }

  /**
   * 显示默认配置命令
   * 显示有效的默认配置和预设信息
   */
  function showDefaultsCommand() {
    const requestedProjectProfile = selectionService.getRequestedProjectProfileName();
    const projectProfileRecommendation = selectionService.detectProjectProfileRecommendation();
    const effectiveSelection = selectionService.resolveTeamDefaultSelection({
      projectProfileName: requestedProjectProfile
    });
    const payload = {
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      packageTeamDefaults: context.teamDefaults,
      projectTeamDefaults: selectionService.loadProjectTeamDefaults(),
      effectiveTeamDefaults: selectionService.getEffectiveTeamDefaults(),
      requestedProjectProfile,
      recommendedProjectProfile: projectProfileRecommendation.recommendedProjectProfile,
      recommendedProjectProfileReason: projectProfileRecommendation.reason,
      teamProjectProfile: selectionService.getTeamPolicyProjectProfile(
        requestedProjectProfile || effectiveSelection.selectedProjectProfile,
        { optional: true }
      ),
      effectiveSelection
    };

    // 根据输出格式选择对应的输出方式
    if (outputHelpers.getOutputFormat() === "summary") return outputHelpers.emitCommandOutput(printDefaultsSummary(payload));
    if (outputHelpers.getOutputFormat() === "markdown") return outputHelpers.emitCommandOutput(printDefaultsMarkdown(payload));
    outputHelpers.emitCommandOutput(JSON.stringify(payload, null, 2));
  }

  /**
   * 诊断命令
   * 检查项目配置和入口点状态
   */
  function doctorCommand() {
    const result = doctorService.collectDoctorReport();
    if (result.mode !== "package-maintenance") {
      governanceContextService?.refreshProjectGovernanceContext({
        trigger: "doctor",
        baselineStatus: governanceContextService.loadProjectGovernanceContext()?.baselineStatus || ""
      });
    }

    // 根据输出格式选择对应的输出方式
    if (outputHelpers.getOutputFormat() === "summary") outputHelpers.emitCommandOutput(buildDoctorSummary(result));
    else if (outputHelpers.getOutputFormat() === "markdown") outputHelpers.emitCommandOutput(buildDoctorMarkdown(result));
    else outputHelpers.emitCommandOutput(JSON.stringify(result, null, 2));

    // 如果诊断失败，设置退出码
    if (!result.ok) process.exitCode = 1;
  }

  /**
   * 版本命令
   * 显示包名和版本号
   */
  function versionCommand() {
    console.log(JSON.stringify({ packageName: context.packageJson.name, version: context.packageJson.version }, null, 2));
  }

  return {
    listToolsCommand,
    showDefaultsCommand,
    doctorCommand,
    versionCommand
  };
}
