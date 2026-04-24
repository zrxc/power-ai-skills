/**
 * CLI 参数解析模块
 * 功能：解析命令行参数，提取命令、选项、标志和位置参数
 */

// 导入必要的模块
import path from "node:path";
import {
  getPresetMap,
  isPathLikePositional,
  normalizePresetNames,
  normalizeToolNames,
  stripSelectionPrefix,
  tokenizeSelectionValue
} from "./shared.mjs";

/**
 * 解析 CLI 参数
 * @param {string[]} argv - 命令行参数数组
 * @returns {object} 解析结果对象，包含 command、values、flags 和 positionals
 */
export function parseCliArgs(argv) {
  // 获取命令名称，默认为 "sync"
  const command = argv[2] || "sync";
  // 获取剩余参数
  const restArgs = argv.slice(3);
  // 存储选项值的映射表
  const values = new Map();
  // 存储标志的集合
  const flags = new Set();
  // 存储位置参数
  const positionals = [];

  /**
   * 遍历所有参数，分类存储
   */
  for (let index = 0; index < restArgs.length; index += 1) {
    const arg = restArgs[index];
    // 如果不是选项（不以 -- 开头），则作为位置参数
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    // 检查下一个参数是否为值（不以 -- 开头）
    const nextArg = restArgs[index + 1];
    const hasValue = nextArg && !nextArg.startsWith("--");
    if (hasValue) {
      // 将值添加到对应的选项
      const current = values.get(arg) || [];
      current.push(nextArg);
      values.set(arg, current);
      index += 1;
    } else {
      // 否则作为标志
      flags.add(arg);
    }
  }

  return { command, values, flags, positionals };
}

/**
 * 解析位置参数中的选择配置
 * @param {object} options - 配置选项
 * @param {object} options.context - 应用上下文
 * @param {string[]} options.positionals - 位置参数数组
 * @param {object} options.defaultsConfig - 默认配置
 * @returns {object} 选择配置对象，包含 selectedTools、selectedProfiles、selectedPresets 和 matched
 */
export function parsePositionalSelection({ context, positionals, defaultsConfig = context.teamDefaults }) {
  const selectedTools = [];
  const selectedProfiles = [];
  const selectedPresets = [];
  const presetMap = getPresetMap(defaultsConfig);

  // 如果没有位置参数，返回空选择
  if (!positionals.length) return { selectedTools, selectedProfiles, selectedPresets, matched: false };

  /**
   * 遍历所有位置参数，解析选择配置
   */
  for (const positional of positionals) {
    // 将位置参数分割为多个 token
    const tokens = tokenizeSelectionValue(positional);
    if (!tokens.length) return { selectedTools: [], selectedProfiles: [], selectedPresets: [], matched: false };

    /**
     * 解析每个 token
     */
    for (const token of tokens) {
      const lowerToken = token.toLowerCase();
      
      // 解析 tool: 前缀
      if (lowerToken.startsWith("tool:")) {
        const toolName = stripSelectionPrefix(token);
        if (!context.registryToolMap.has(toolName)) return { selectedTools: [], selectedProfiles: [], selectedPresets: [], matched: false };
        selectedTools.push(toolName);
        continue;
      }

      // 解析 profile: 前缀
      if (lowerToken.startsWith("profile:")) {
        const profileName = stripSelectionPrefix(token);
        if (!context.registryProfileMap.has(profileName)) return { selectedTools: [], selectedProfiles: [], selectedPresets: [], matched: false };
        selectedProfiles.push(profileName);
        continue;
      }

      // 解析 preset: 前缀
      if (lowerToken.startsWith("preset:")) {
        selectedPresets.push(stripSelectionPrefix(token));
        continue;
      }

      // 尝试匹配工具名称
      if (context.registryToolMap.has(token)) {
        selectedTools.push(token);
        continue;
      }

      // 尝试匹配 profile 名称
      if (context.registryProfileMap.has(token)) {
        selectedProfiles.push(token);
        continue;
      }

      // 尝试匹配 preset 名称
      if (presetMap.has(token)) {
        selectedPresets.push(token);
        continue;
      }

      // 无法识别的 token，返回失败
      return { selectedTools: [], selectedProfiles: [], selectedPresets: [], matched: false };
    }
  }

  return {
    selectedTools: normalizeToolNames(selectedTools),
    selectedProfiles: normalizeToolNames(selectedProfiles),
    selectedPresets: normalizePresetNames(selectedPresets),
    matched: true
  };
}

/**
 * 解析项目根目录
 * @param {object} options - 配置选项
 * @param {object} options.context - 应用上下文
 * @param {object} options.cliArgs - CLI 参数
 * @param {string} options.cwd - 当前工作目录
 * @returns {string} 项目根目录路径
 */
export function resolveProjectRoot({ context, cliArgs, cwd = process.cwd() }) {
  // 检查是否显式指定了项目路径
  const explicitProjectRoot = (cliArgs.values.get("--project") || [])[0];
  if (explicitProjectRoot) return path.resolve(explicitProjectRoot);

  // 解析位置参数中的选择配置
  const positionalSelection = parsePositionalSelection({ context, positionals: cliArgs.positionals });
  
  // 对于 init、add-tool、remove-tool 命令
  if (["init", "add-tool", "remove-tool"].includes(cliArgs.command)) {
    // 如果只有一个位置参数，且看起来像路径，且不是选择配置
    if (
      cliArgs.positionals.length === 1 &&
      isPathLikePositional(cliArgs.positionals[0]) &&
      !positionalSelection.selectedTools.length &&
      !positionalSelection.selectedProfiles.length &&
      !positionalSelection.selectedPresets.length
    ) {
      return path.resolve(cliArgs.positionals[0]);
    }
    return path.resolve(cwd);
  }

  if (["promote-project-local-skill", "review-project-pattern", "generate-project-skill", "capture-session", "queue-auto-capture-response", "submit-auto-capture", "evaluate-session-capture", "prepare-session-capture", "confirm-session-capture", "consume-auto-capture-response-inbox", "consume-auto-capture-inbox", "watch-auto-capture-inbox", "codex-capture-session", "trae-capture-session", "cursor-capture-session", "claude-code-capture-session", "windsurf-capture-session", "gemini-cli-capture-session", "github-copilot-capture-session", "cline-capture-session", "aider-capture-session", "tool-capture-session", "analyze-patterns", "review-conversation-pattern", "merge-conversation-pattern", "archive-conversation-pattern", "restore-conversation-pattern", "scaffold-wrapper-promotion", "list-wrapper-promotions", "show-wrapper-promotion-timeline", "generate-wrapper-promotion-audit", "generate-wrapper-registry-governance", "generate-upgrade-summary", "generate-governance-summary", "show-evolution-policy", "validate-evolution-policy", "generate-evolution-candidates", "apply-evolution-actions", "generate-evolution-proposals", "list-evolution-proposals", "list-evolution-drafts", "show-evolution-draft", "review-evolution-proposal", "apply-evolution-proposal", "run-evolution-cycle", "show-governance-history", "generate-conversation-miner-strategy", "check-auto-capture-runtime", "show-auto-capture-bridge-contract", "show-capture-safety-policy", "validate-capture-safety-policy", "check-capture-retention", "apply-capture-retention", "check-project-baseline", "show-team-policy", "validate-team-policy", "check-team-policy-drift", "check-governance-review-deadlines", "show-project-profile-decision", "review-project-profile", "show-project-governance-context", "show-promotion-trace", "review-wrapper-promotion", "materialize-wrapper-promotion", "apply-wrapper-promotion", "finalize-wrapper-promotion", "register-wrapper-promotion", "archive-wrapper-promotion", "restore-wrapper-promotion"].includes(cliArgs.command)) return path.resolve(cwd);

  // 其他命令，使用第一个位置参数或当前工作目录
  return path.resolve(cliArgs.positionals[0] || cwd);
}
