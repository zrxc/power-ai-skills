/**
 * 共享工具函数
 * 功能：提供文件和目录操作的通用工具函数
 */

// 导入必要的模块
import fs from "node:fs";
import path from "node:path";

/**
 * 确保目录存在
 * 如果目录不存在，递归创建目录结构
 * @param {string} dirPath 目录路径
 */
export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * 复制目录
 * 递归复制源目录到目标目录
 * @param {string} src 源目录路径
 * @param {string} dest 目标目录路径
 */
export function copyDir(src, dest) {
  // 确保目标目录存在
  ensureDir(dest);
  
  // 遍历源目录中的所有条目
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // 如果是目录，递归复制
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
      continue;
    }
    
    // 如果是文件，直接复制
    fs.copyFileSync(srcPath, destPath);
  }
}

/**
 * 如果目录存在则删除
 * @param {string} target 要删除的目录路径
 */
export function removeDirIfExists(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

/**
 * 读取 JSON 文件
 * @param {string} filePath JSON 文件路径
 * @returns {Object} 解析后的 JSON 对象
 */
export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * 写入 JSON 文件
 * @param {string} filePath 要写入的文件路径
 * @param {Object} data 要写入的数据
 */
export function writeJson(filePath, data) {
  // 确保目标目录存在
  ensureDir(path.dirname(filePath));
  // 写入 JSON 数据，添加缩进和换行
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/**
 * 安全裁剪字符串
 * spawnSync 在系统错误时可能没有 stdout/stderr，统一兜底为空串。
 * @param {unknown} value 待裁剪的值
 * @returns {string} 裁剪后的字符串
 */
export function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 汇总子进程失败原因
 * @param {import("node:child_process").SpawnSyncReturns<string>} result 子进程结果
 * @param {string} fallback 默认错误信息
 * @returns {string} 可展示的错误摘要
 */
export function summarizeSpawnFailure(result, fallback) {
  return result?.error?.message || safeTrim(result?.stderr) || safeTrim(result?.stdout) || fallback;
}

/**
 * 遍历目录
 * 递归遍历指定目录及其子目录
 * @param {string} rootDir 根目录路径
 * @returns {string[]} 目录路径数组
 */
export function walkDirectories(rootDir) {
  const results = [];

  // 遍历根目录中的所有条目
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const entryPath = path.join(rootDir, entry.name);
    results.push(entryPath);
    // 递归遍历子目录
    results.push(...walkDirectories(entryPath));
  }

  return results;
}

/**
 * 查找技能目录
 * 遍历技能根目录，找出包含 SKILL.md 文件的目录
 * @param {string} skillsRoot 技能根目录路径
 * @returns {string[]} 技能目录路径数组
 */
export function findSkillDirectories(skillsRoot) {
  return walkDirectories(skillsRoot).filter((dirPath) => {
    return fs.existsSync(path.join(dirPath, "SKILL.md"));
  });
}
