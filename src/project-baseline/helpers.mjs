/**
 * Project Baseline Helpers 模块
 * 
 * 负责：
 * - 通用工具函数
 * - 检查对象创建
 * - 路径处理
 */

import fs from "node:fs";
import path from "node:path";
import { readJson } from "../../scripts/shared.mjs";

/**
 * 读取 JSON 文件（如果存在）
 */
export function readJsonIfExists(filePath) {
  return filePath && fs.existsSync(filePath) ? readJson(filePath) : null;
}

/**
 * 稳定化序列化，用于比较对象是否变化
 */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * 比较两个数组是否相等
 */
export function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * 计算左侧数组中不在右侧的元素
 */
export function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

/**
 * 规范化相对路径
 */
export function normalizeRelativePath(relativePath) {
  return relativePath.split(path.posix.sep).join(path.sep);
}

/**
 * 转换为项目相对路径
 */
export function toProjectRelative(projectRoot, targetPath) {
  return path.relative(projectRoot, targetPath) || ".";
}

/**
 * 创建检查项对象
 */
export function createCheck(code, name, ok, group, detail, remediation, severity = "error") {
  return {
    code,
    name,
    ok,
    group,
    severity,
    detail,
    remediation
  };
}

/**
 * 检查项分组
 */
export function buildCheckGroups(checks, groupOrder = ["preset", "knowledge", "adapters"]) {
  return groupOrder.map((groupName) => {
    const groupChecks = checks.filter((check) => check.group === groupName);
    return {
      name: groupName,
      ok: groupChecks.every((check) => check.ok || check.severity === "warning"),
      total: groupChecks.length,
      passed: groupChecks.filter((check) => check.ok).length,
      failed: groupChecks.filter((check) => !check.ok && check.severity !== "warning").length,
      warnings: groupChecks.filter((check) => !check.ok && check.severity === "warning").length,
      checks: groupChecks
    };
  });
}

/**
 * 构建推荐行动列表
 */
export function buildRecommendedActions(checks) {
  return [...new Set(checks
    .filter((check) => !check.ok)
    .map((check) => check.remediation)
    .filter(Boolean))];
}
