export function resolveRequestedToolSelection(selectionService) {
  return {
    ...selectionService.resolveSelectionConfig({
    defaultsConfig: selectionService.getEffectiveTeamDefaults(),
    presetNames: selectionService.getOptionValues("--preset"),
    profileNames: selectionService.getOptionValues("--profile"),
    toolNames: selectionService.getOptionValues("--tool")
    }),
    selectedProjectProfile: selectionService.getRequestedProjectProfileName(),
    requiredSkills: selectionService.resolveRequiredSkills(selectionService.getRequestedProjectProfileName())
  };
}

export function ensureRequestedTools(requestedSelection, commandName) {
  if (requestedSelection.selectedTools.length === 0) {
    throw new Error(`${commandName} requires at least one --tool, --profile, or --preset.`);
  }
}

function createManualToolSelection({ mode, selectedTools, selectionService, selectedProjectProfile = "" }) {
  return {
    mode,
    selectedPresets: [],
    selectedProfiles: [],
    selectedProjectProfile,
    requiredSkills: selectionService.resolveRequiredSkills(selectedProjectProfile),
    selectedTools,
    expandedTools: selectionService.expandToolSelection(selectedTools),
    sourceDescription: "manual"
  };
}

export function createAddToolSelection({ selectionService, requestedSelection }) {
  const baseSelection = selectionService.resolveSelection({ ignoreExplicit: true });
  const selectedTools = selectionService.normalizeToolNames([
    ...baseSelection.selectedTools,
    ...requestedSelection.selectedTools
  ]);
  return createManualToolSelection({
    mode: "add-tool",
    selectedTools,
    selectionService,
    selectedProjectProfile: baseSelection.selectedProjectProfile || requestedSelection.selectedProjectProfile || ""
  });
}

export function createRemoveToolSelection({ selectionService, requestedSelection }) {
  const baseSelection = selectionService.resolveSelection({
    allowLegacyInference: true,
    ignoreExplicit: true
  });
  const selectedTools = baseSelection.selectedTools.filter((toolName) => !requestedSelection.selectedTools.includes(toolName));
  if (selectedTools.length === 0) {
    throw new Error("Removing these tools would leave the project without any tool entrypoint. Keep at least one tool or switch to --profile minimal.");
  }
  return createManualToolSelection({
    mode: "remove-tool",
    selectedTools,
    selectionService,
    selectedProjectProfile: baseSelection.selectedProjectProfile || ""
  });
}

export function syncToolEntrypointSelection({ workspaceService, conversationMinerService, selection }) {
  workspaceService.syncProjectStructure(selection, { syncSkills: false });
  conversationMinerService.ensureConversationRoots();
}
