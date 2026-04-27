import { buildProjectProfileArtifact } from "./project-profile-builder.mjs";

export function buildProjectScanResult({
  context,
  projectRoot,
  generatedAt,
  packageJson,
  structure,
  frameworkSignals,
  componentUsage,
  componentGraph,
  componentPropagation,
  fileRoleSummary,
  patterns,
  viewFiles
}) {
  return {
    generatedAt,
    projectProfile: buildProjectProfileArtifact({
      context,
      projectRoot,
      generatedAt,
      packageJson,
      structure,
      frameworkSignals,
      componentUsage,
      componentGraph,
      componentPropagation,
      fileRoleSummary,
      patterns,
      viewFiles
    }),
    patterns: { generatedAt, patterns },
    componentGraph,
    componentPropagation
  };
}
