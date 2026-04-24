/**
 * 工作区入口点辅助工具模块
 * 功能：提供入口点创建、链接、状态检查和清理功能
 */

// 导入必要的模块
import fs from "node:fs";
import path from "node:path";
import { copyDir, ensureDir } from "../../scripts/shared.mjs";

/**
 * 创建工作区入口点辅助工具
 * @param {object} options - 配置选项
 * @param {object} options.context - 应用上下文
 * @param {string} options.projectRoot - 项目根目录路径
 * @param {function} options.getPowerAiPaths - 获取 Power AI 路径的函数
 * @param {function} options.readTextIfExists - 读取文本文件的函数
 * @param {function} options.removePathIfExists - 删除路径的函数
 * @param {function} options.cleanupEmptyParentDirectories - 清理空父目录的函数
 * @param {function} options.isGeneratedFile - 判断是否为生成文件的函数
 * @returns {object} 工作区入口点辅助工具对象
 */
export function createWorkspaceEntrypointHelpers({
  context,
  projectRoot,
  getPowerAiPaths,
  readTextIfExists,
  removePathIfExists,
  cleanupEmptyParentDirectories,
  isGeneratedFile
}) {
  /**
   * 创建目录链接
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   */
  function createDirectoryLink(sourcePath, targetPath) {
    // 检查是否已存在相同的链接
    try {
      if (fs.existsSync(targetPath) && fs.realpathSync(targetPath) === fs.realpathSync(sourcePath)) return;
    } catch {}
    
    // 删除现有目标
    removePathIfExists(targetPath);
    // 确保父目录存在
    ensureDir(path.dirname(targetPath));
    
    // 尝试创建符号链接，失败则复制目录
    try {
      fs.symlinkSync(sourcePath, targetPath, "junction");
    } catch {
      copyDir(sourcePath, targetPath);
    }
  }

  /**
   * 创建文件链接
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   */
  function createFileLink(sourcePath, targetPath) {
    // 检查是否已存在相同的链接
    try {
      if (fs.existsSync(targetPath)) {
        const sourceStat = fs.statSync(sourcePath);
        const targetStat = fs.statSync(targetPath);
        // 检查是否为同一个文件（硬链接）
        if (sourceStat.dev === targetStat.dev && sourceStat.ino === targetStat.ino) return;
        // 检查内容是否相同
        if (readTextIfExists(sourcePath) === readTextIfExists(targetPath)) return;
      }
    } catch {}
    
    // 删除现有目标
    removePathIfExists(targetPath);
    // 确保父目录存在
    ensureDir(path.dirname(targetPath));
    
    // 尝试创建硬链接，失败则复制文件
    try {
      fs.linkSync(sourcePath, targetPath);
    } catch {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  /**
   * 获取所有管理的目标路径
   * @returns {string[]} 所有管理的目标路径数组
   */
  function getAllManagedTargets() {
    return context.toolRegistry.tools.flatMap((tool) => tool.entrypoints || []).map((entrypoint) => path.resolve(projectRoot, entrypoint.target));
  }

  /**
   * 获取选中的入口点
   * @param {string[]} expandedTools - 扩展后的工具名称数组
   * @returns {object[]} 选中的入口点数组
   */
  function getSelectedEntrypoints(expandedTools) {
    return expandedTools.flatMap((toolName) => context.registryToolMap.get(toolName)?.entrypoints || []);
  }

  /**
   * 清理未选中的入口点
   * @param {object[]} selectedEntrypoints - 选中的入口点数组
   */
  function cleanupUnselectedEntrypoints(selectedEntrypoints) {
    const selectedTargets = new Set(selectedEntrypoints.map((entrypoint) => path.resolve(projectRoot, entrypoint.target)));
    for (const managedTarget of getAllManagedTargets()) {
      // 跳过选中的目标和不存在的目标
      if (selectedTargets.has(managedTarget) || !fs.existsSync(managedTarget)) continue;
      const stat = fs.lstatSync(managedTarget);
      // 删除目录、符号链接或生成文件
      if (stat.isDirectory() || stat.isSymbolicLink() || isGeneratedFile({ context, filePath: managedTarget })) removePathIfExists(managedTarget);
    }
  }

  /**
   * 查找残留的入口点
   * @param {object[]} selectedEntrypoints - 选中的入口点数组
   * @returns {string[]} 残留的入口点路径数组
   */
  function findResidualEntrypoints(selectedEntrypoints) {
    const selectedTargets = new Set(selectedEntrypoints.map((entrypoint) => path.resolve(projectRoot, entrypoint.target)));
    return getAllManagedTargets()
      .filter((managedTarget) => !selectedTargets.has(managedTarget) && fs.existsSync(managedTarget))
      .map((managedTarget) => path.relative(projectRoot, managedTarget));
  }

  /**
   * 移除指定工具的入口点
   * @param {string[]} toolNames - 工具名称数组
   */
  function removeEntrypointsForTools(toolNames) {
    for (const toolName of toolNames) {
      const tool = context.registryToolMap.get(toolName);
      if (!tool) continue;
      for (const entrypoint of tool.entrypoints || []) {
        const targetPath = path.resolve(projectRoot, entrypoint.target);
        removePathIfExists(targetPath);
        cleanupEmptyParentDirectories({ projectRoot, targetPath });
      }
    }
  }

  /**
   * 应用工具入口点
   * @param {object} selection - 选择配置对象
   */
  function applyToolEntrypoints(selection) {
    const { powerAiRoot } = getPowerAiPaths();
    const selectedEntrypoints = getSelectedEntrypoints(selection.expandedTools);
    // 清理未选中的入口点
    cleanupUnselectedEntrypoints(selectedEntrypoints);
    
    // 创建选中的入口点
    for (const entrypoint of selectedEntrypoints) {
      const sourcePath = path.join(powerAiRoot, entrypoint.source);
      const targetPath = path.resolve(projectRoot, entrypoint.target);
      if (!fs.existsSync(sourcePath)) throw new Error(`Missing adapter source: ${path.relative(projectRoot, sourcePath)}`);
      
      // 根据入口点类型创建对应的链接
      if (entrypoint.type === "directory-link") createDirectoryLink(sourcePath, targetPath);
      else if (entrypoint.type === "file-link") createFileLink(sourcePath, targetPath);
      else throw new Error(`Unsupported entrypoint.type: ${entrypoint.type}`);
    }
  }

  /**
   * 获取入口点状态
   * @param {object} entrypoint - 入口点对象
   * @returns {object} 入口点状态对象
   */
  function getEntrypointState(entrypoint) {
    const { powerAiRoot } = getPowerAiPaths();
    const sourcePath = path.join(powerAiRoot, entrypoint.source);
    const targetPath = path.resolve(projectRoot, entrypoint.target);
    
    // 检查目标是否存在
    if (!fs.existsSync(targetPath)) return { target: entrypoint.target, type: entrypoint.type, state: "missing", ok: false };

    const sourceRealPath = fs.existsSync(sourcePath) ? fs.realpathSync(sourcePath) : sourcePath;
    const targetRealPath = fs.realpathSync(targetPath);
    const targetStat = fs.lstatSync(targetPath);
    
    // 处理目录链接
    if (entrypoint.type === "directory-link") {
      if (targetStat.isSymbolicLink() && targetRealPath === sourceRealPath) return { target: entrypoint.target, type: entrypoint.type, state: "linked-directory", ok: true };
      if (targetStat.isDirectory()) return { target: entrypoint.target, type: entrypoint.type, state: targetRealPath === sourceRealPath ? "linked-directory" : "copied-directory", ok: true };
      return { target: entrypoint.target, type: entrypoint.type, state: "unexpected-file", ok: false };
    }

    // 处理文件链接
    const sourceStat = fs.statSync(sourcePath);
    const targetFileStat = fs.statSync(targetPath);
    if (targetStat.isSymbolicLink() && targetRealPath === sourceRealPath) return { target: entrypoint.target, type: entrypoint.type, state: "linked-file", ok: true };
    return { target: entrypoint.target, type: entrypoint.type, state: sourceStat.dev === targetFileStat.dev && sourceStat.ino === targetFileStat.ino ? "hard-link-file" : "copied-file", ok: true };
  }

  return {
    getSelectedEntrypoints,
    findResidualEntrypoints,
    removeEntrypointsForTools,
    applyToolEntrypoints,
    getEntrypointState
  };
}
