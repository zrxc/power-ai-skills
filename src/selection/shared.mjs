/**
 * 选择共享工具模块
 * 功能：提供工具名称规范化、选择输入解析等通用工具函数
 */

/**
 * 规范化工具名称数组
 * @param {string[]} values - 工具名称数组
 * @returns {string[]} 规范化后的工具名称数组（去重、过滤空值、排序）
 */
export function normalizeToolNames(values) {
  return [...new Set((values || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

/**
 * 规范化 Preset 名称数组
 * @param {string[]} values - Preset 名称数组
 * @returns {string[]} 规范化后的 Preset 名称数组（去重、过滤空值、排序）
 */
export function normalizePresetNames(values) {
  return [...new Set((values || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

/**
 * 规范化选择输入
 * @param {string|string[]} value - 选择输入（字符串或数组）
 * @returns {string[]} 规范化后的数组（过滤空值）
 */
export function normalizeSelectionInput(value) {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

/**
 * 将选择值分割为 token 数组
 * @param {string} value - 选择值字符串
 * @returns {string[]} token 数组（按 | 或 , 分割，去除空白）
 */
export function tokenizeSelectionValue(value) {
  return String(value || "").split(/[|,]/).map((item) => item.trim()).filter(Boolean);
}

/**
 * 去除选择前缀
 * @param {string} value - 带前缀的值
 * @returns {string} 去除前缀后的值
 */
export function stripSelectionPrefix(value) {
  return String(value || "").replace(/^(tool|profile|preset):/i, "").trim();
}

/**
 * 判断位置参数是否像路径
 * @param {string} value - 位置参数值
 * @returns {boolean} 是否像路径（包含路径分隔符、驱动器号或为 . 或 ..）
 */
export function isPathLikePositional(value) {
  return /[\\/]/.test(value) || /^[A-Za-z]:/.test(value) || value === "." || value === "..";
}

/**
 * 获取 Preset 映射表
 * @param {object} defaultsConfig - 默认配置对象
 * @returns {Map<string, object>} Preset 名称到 Preset 对象的映射表
 */
export function getPresetMap(defaultsConfig) {
  return new Map((defaultsConfig.presetSelections || []).map((preset) => [preset.name, preset]));
}
