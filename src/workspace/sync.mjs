import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { copyDir, ensureDir, removeDirIfExists, writeJson } from "../../scripts/shared.mjs";

export function createWorkspaceSyncHelpers({
  context,
  projectRoot,
  cliArgs,
  renderManagedTemplate,
  getPowerAiPaths,
  getOverlayTarget,
  writeFileIfChanged
}) {
  function hasFlag(flagName) {
    return cliArgs.flags.has(flagName);
  }

  function ensureOverlayDirectory(skillTarget) {
    ensureDir(getOverlayTarget(skillTarget));
    writeFileIfChanged(path.join(getOverlayTarget(skillTarget), "README.md"), "# Project Local Skill\n");
  }

  function backupOverlayDirectory(skillTarget) {
    const overlayTarget = getOverlayTarget(skillTarget);
    if (!fs.existsSync(overlayTarget)) return null;
    const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-overlay-"));
    copyDir(overlayTarget, path.join(backupRoot, context.overlayGroupName));
    return backupRoot;
  }

  function restoreOverlayDirectory(backupRoot, skillTarget) {
    if (!backupRoot) return;
    const backupTarget = path.join(backupRoot, context.overlayGroupName);
    if (fs.existsSync(backupTarget)) copyDir(backupTarget, getOverlayTarget(skillTarget));
  }

  function cleanupBackupDirectory(backupRoot) {
    if (backupRoot) removeDirIfExists(backupRoot);
  }

  function migrateLegacyOverlayIfNeeded(skillTarget) {
    for (const candidate of [
      path.join(projectRoot, ".trae", "skills", context.overlayGroupName),
      path.join(projectRoot, ".codex", "skills", context.overlayGroupName)
    ]) {
      if (!fs.existsSync(candidate)) continue;
      copyDir(candidate, getOverlayTarget(skillTarget));
      return;
    }
  }

  function syncSingleSourceSkills() {
    const { powerAiRoot, skillsTarget } = getPowerAiPaths();
    const shouldClean = !hasFlag("--no-clean");
    const preserveProjectLocal = !hasFlag("--drop-project-local");
    const overlayBackup = shouldClean && preserveProjectLocal ? backupOverlayDirectory(skillsTarget) : null;
    const tempSkillsTarget = path.join(powerAiRoot, `.tmp-skills-${Date.now()}`);

    try {
      removeDirIfExists(tempSkillsTarget);
      copyDir(context.skillsRoot, tempSkillsTarget);
      if (overlayBackup) restoreOverlayDirectory(overlayBackup, tempSkillsTarget);
      migrateLegacyOverlayIfNeeded(tempSkillsTarget);
      ensureOverlayDirectory(tempSkillsTarget);
      removeDirIfExists(skillsTarget);

      try {
        fs.renameSync(tempSkillsTarget, skillsTarget);
      } catch {
        removeDirIfExists(skillsTarget);
        copyDir(tempSkillsTarget, skillsTarget);
      }
    } finally {
      removeDirIfExists(tempSkillsTarget);
      cleanupBackupDirectory(overlayBackup);
    }
  }

  function getPowerAiReadmeContent(selection) {
    return `# Power AI Single Source

- package: ${context.packageJson.name}
- version: ${context.packageJson.version}
- tools: ${selection.expandedTools.join(", ")}
- project overlay: .power-ai/skills/${context.overlayGroupName}
`;
  }

  function writeSingleSourceFiles(selection) {
    const {
      powerAiRoot,
      sharedTarget,
      adaptersTarget,
      registryTarget,
      teamDefaultsTarget,
      teamPolicyTarget,
      templateRegistryTarget,
      selectedToolsTarget,
      readmeTarget
    } = getPowerAiPaths();

    ensureDir(powerAiRoot);
    ensureDir(sharedTarget);
    ensureDir(adaptersTarget);

    for (const templateDefinition of context.templateRegistry.templates) {
      const sourcePath = path.join(context.templatesRoot, ...templateDefinition.source.split("/"));
      const targetPath = path.join(powerAiRoot, ...templateDefinition.output.split("/"));
      const renderedContent = renderManagedTemplate(templateDefinition, fs.readFileSync(sourcePath, "utf8"));
      writeFileIfChanged(targetPath, renderedContent);
    }

    writeJson(registryTarget, context.toolRegistry);
    writeJson(teamDefaultsTarget, context.teamDefaults);
    writeJson(teamPolicyTarget, context.teamPolicy);
    writeJson(templateRegistryTarget, context.templateRegistry);
    writeJson(selectedToolsTarget, {
      selectedPresets: selection.selectedPresets || [],
      selectedProfiles: selection.selectedProfiles || [],
      selectedProjectProfile: selection.selectedProjectProfile || "",
      requiredSkills: selection.requiredSkills || [],
      selectedTools: selection.selectedTools,
      expandedTools: selection.expandedTools
    });
    writeFileIfChanged(readmeTarget, getPowerAiReadmeContent(selection));
  }

  return {
    syncSingleSourceSkills,
    writeSingleSourceFiles
  };
}
