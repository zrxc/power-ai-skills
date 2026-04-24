/**
 * 工作区服务模块
 * 功能：提供项目结构同步、入口点管理和报告清理功能
 */

// 导入必要的模块
import fs from "node:fs";
import path from "node:path";
import { createWorkspaceEntrypointHelpers } from "./entrypoints.mjs";
import { createWorkspacePathHelpers } from "./paths.mjs";
import { createWorkspaceSharedHelpers } from "./shared.mjs";
import { createWorkspaceSyncHelpers } from "./sync.mjs";

/**
 * 创建工作区服务
 * @param {object} options - 配置选项
 * @param {object} options.context - 应用上下文
 * @param {object} options.cliArgs - CLI 参数
 * @param {string} options.projectRoot - 项目根目录路径
 * @param {object} options.renderingService - 渲染服务
 * @returns {object} 工作区服务对象
 */
export function createWorkspaceService({ context, cliArgs, projectRoot, renderingService }) {
  // 创建路径辅助工具
  const pathHelpers = createWorkspacePathHelpers({ context, projectRoot });
  // 创建共享工具
  const sharedHelpers = createWorkspaceSharedHelpers({ context, projectRoot });
  // 创建同步辅助工具
  const syncHelpers = createWorkspaceSyncHelpers({
    context,
    projectRoot,
    cliArgs,
    renderManagedTemplate: renderingService.renderManagedTemplate,
    getPowerAiPaths: pathHelpers.getPowerAiPaths,
    getOverlayTarget: pathHelpers.getOverlayTarget,
    writeFileIfChanged: sharedHelpers.writeFileIfChanged
  });
  // 创建入口点辅助工具
  const entrypointHelpers = createWorkspaceEntrypointHelpers({
    context,
    projectRoot,
    getPowerAiPaths: pathHelpers.getPowerAiPaths,
    readTextIfExists: sharedHelpers.readTextIfExists,
    removePathIfExists: sharedHelpers.removePathIfExists,
    cleanupEmptyParentDirectories: sharedHelpers.cleanupEmptyParentDirectories,
    isGeneratedFile: sharedHelpers.isGeneratedFile
  });

  /**
   * 同步项目结构
   * @param {object} selection - 选择配置对象
   * @param {object} options - 配置选项
   * @param {boolean} options.syncSkills - 是否同步技能文件
   */
  function syncProjectStructure(selection, { syncSkills }) {
    // 同步技能目录
    if (syncSkills) syncHelpers.syncSingleSourceSkills();
    // 写入单源文件
    syncHelpers.writeSingleSourceFiles(selection);
    // 应用工具入口点
    entrypointHelpers.applyToolEntrypoints(selection);
  }

  /**
   * 清理报告目录
   * @returns {object} 清理结果对象
   */
  function cleanReports() {
    const reportsRoot = pathHelpers.getReportsRoot();
    if (fs.existsSync(reportsRoot)) {
      fs.rmSync(reportsRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      return { removed: true, reportsRoot };
    }
    return { removed: false, reportsRoot };
  }

  return {
    context,
    projectRoot,
    getPowerAiPaths: pathHelpers.getPowerAiPaths,
    getReportsRoot: pathHelpers.getReportsRoot,
    getOverlayTarget: pathHelpers.getOverlayTarget,
    normalizeGroupNames: pathHelpers.normalizeGroupNames,
    readTextIfExists: sharedHelpers.readTextIfExists,
    removePathIfExists: sharedHelpers.removePathIfExists,
    getSelectedEntrypoints: entrypointHelpers.getSelectedEntrypoints,
    findResidualEntrypoints: entrypointHelpers.findResidualEntrypoints,
    removeEntrypointsForTools: entrypointHelpers.removeEntrypointsForTools,
    getEntrypointState: entrypointHelpers.getEntrypointState,
    syncProjectStructure,
    cleanReports
  };
}
