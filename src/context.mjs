import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "../scripts/shared.mjs";

export function createRuntimeContext(importMetaUrl) {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "..");
  const packageJson = readJson(path.join(packageRoot, "package.json"));
  const skillsRoot = path.join(packageRoot, "skills");
  const templatesRoot = path.join(packageRoot, "templates", "project");
  const toolRegistry = readJson(path.join(packageRoot, "config", "tool-registry.json"));
  const teamDefaults = readJson(path.join(packageRoot, "config", "team-defaults.json"));
  const teamPolicy = readJson(path.join(packageRoot, "config", "team-policy.json"));
  const templateRegistry = readJson(path.join(packageRoot, "config", "template-registry.json"));
  const manifestPath = path.join(packageRoot, "manifest", "skills-manifest.json");

  return {
    packageRoot,
    packageJson,
    skillsRoot,
    templatesRoot,
    toolRegistry,
    teamDefaults,
    teamPolicy,
    templateRegistry,
    manifestPath,
    powerAiDirName: ".power-ai",
    overlayGroupName: "project-local",
    legacyPackageName: "@power/frontend-ai-skills",
    generatedMarker: "generated-by: @power/power-ai-skills",
    executionFlowPlaceholder: "{{POWER_AI_EXECUTION_FLOW}}",
    readPriorityPlaceholder: "{{POWER_AI_READ_PRIORITY}}",
    conversationCapturePlaceholder: "{{POWER_AI_CONVERSATION_CAPTURE}}",
    registryToolMap: new Map(toolRegistry.tools.map((tool) => [tool.name, tool])),
    registryProfileMap: new Map(toolRegistry.profiles.map((profile) => [profile.name, profile])),
    templateMap: new Map(templateRegistry.templates.map((template) => [template.name, template])),
    templateByOutputMap: new Map(templateRegistry.templates.map((template) => [template.output, template]))
  };
}
