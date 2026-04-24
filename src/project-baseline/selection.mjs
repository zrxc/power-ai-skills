/**
 * Project Baseline Selection 模块
 * 
 * 负责：
 * - 包默认选择解析
 * - 当前项目选择状态获取
 */

/**
 * 解析包默认选择配置
 */
export function resolvePackageDefaultSelection({ context, selectionService }) {
  const defaultSelection = context.teamDefaults.defaultSelection || {};
  const selection = selectionService.resolveSelectionConfig({
    defaultsConfig: context.teamDefaults,
    presetNames: selectionService.normalizeSelectionInput(defaultSelection.preset || defaultSelection.presets),
    profileNames: selectionService.normalizeSelectionInput(defaultSelection.profile || defaultSelection.profiles),
    toolNames: selectionService.normalizeSelectionInput(defaultSelection.tools)
  });

  return {
    selectedPresets: selection.selectedPresets,
    selectedProfiles: selection.selectedProfiles,
    selectedTools: selection.selectedTools,
    expandedTools: selectionService.expandToolSelection(selection.selectedTools)
  };
}

/**
 * 获取当前项目选择状态
 */
export function resolveCurrentSelection(selectionService) {
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
