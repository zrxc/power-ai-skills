import fs from "node:fs";
import path from "node:path";
import { readJson } from "../../scripts/shared.mjs";

function readProjectPackageJson(projectRoot) {
  const packageJsonPath = path.join(projectRoot, "package.json");
  return fs.existsSync(packageJsonPath) ? readJson(packageJsonPath) : {};
}

function hasAnyDirectory(projectRoot, relativePaths = []) {
  return relativePaths.some((relativePath) => fs.existsSync(path.join(projectRoot, relativePath)));
}

function hasVueWorkspaceSignals(projectRoot) {
  const viewsRoot = path.join(projectRoot, "src", "views");
  if (!fs.existsSync(viewsRoot)) return false;
  const stack = [viewsRoot];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (entry.name.endsWith(".vue")) return true;
    }
  }
  return false;
}

function collectWorkspaceSignals(projectRoot, packageJson = readProjectPackageJson(projectRoot)) {
  const dependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {})
  };

  return {
    hasPackageJson: Object.keys(packageJson).length > 0,
    hasVueDependency: Boolean(dependencies.vue),
    hasPiniaDependency: Boolean(dependencies.pinia),
    hasPowerRuntimeDependency: Boolean(dependencies["@power/runtime-vue3"]),
    hasPowerComponentsDependency: Boolean(dependencies["@power/p-components"]),
    hasVueViews: hasVueWorkspaceSignals(projectRoot),
    hasTerminalWorkspace: hasAnyDirectory(projectRoot, ["bin", "scripts", "tests"])
      || Boolean(packageJson.bin)
      || Object.keys(packageJson.scripts || {}).length > 0
  };
}

export function detectRecommendedTeamProjectProfile({ context, projectRoot, projectProfileArtifact = null } = {}) {
  const projectProfiles = new Set((context.teamPolicy.projectProfiles || []).map((profile) => profile.name));
  const packageJson = readProjectPackageJson(projectRoot);
  const workspaceSignals = collectWorkspaceSignals(projectRoot, packageJson);
  const frameworkSignals = projectProfileArtifact?.frameworkSignals || {};
  const hasEnterpriseVueSignals = Boolean(
    frameworkSignals.vue
    || frameworkSignals.powerRuntime
    || frameworkSignals.powerComponents
    || workspaceSignals.hasVueDependency
    || workspaceSignals.hasPiniaDependency
    || workspaceSignals.hasPowerRuntimeDependency
    || workspaceSignals.hasPowerComponentsDependency
    || workspaceSignals.hasVueViews
  );

  if (projectProfiles.has("enterprise-vue") && hasEnterpriseVueSignals) {
    return {
      recommendedProjectProfile: "enterprise-vue",
      source: projectProfileArtifact ? "project-scan-analysis" : "workspace-signals",
      reason: "Detected Vue / Power component workspace signals.",
      signals: {
        frameworkSignals,
        workspaceSignals
      }
    };
  }

  const hasTerminalGovernanceSignals = Boolean(
    !hasEnterpriseVueSignals
    && workspaceSignals.hasPackageJson
    && workspaceSignals.hasTerminalWorkspace
  );

  if (projectProfiles.has("terminal-governance") && hasTerminalGovernanceSignals) {
    return {
      recommendedProjectProfile: "terminal-governance",
      source: projectProfileArtifact ? "project-scan-analysis" : "workspace-signals",
      reason: "Detected terminal-oriented repository structure without Vue workspace signals.",
      signals: {
        frameworkSignals,
        workspaceSignals
      }
    };
  }

  return {
    recommendedProjectProfile: "",
    source: "none",
    reason: "",
    signals: {
      frameworkSignals,
      workspaceSignals
    }
  };
}
