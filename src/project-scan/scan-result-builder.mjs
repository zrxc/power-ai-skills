import path from "node:path";
import { detectRecommendedTeamProjectProfile } from "../team-policy/project-profile-detection.mjs";

export function buildProjectProfileArtifact({
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
  const teamProjectProfileRecommendation = detectRecommendedTeamProjectProfile({
    context,
    projectRoot,
    projectProfileArtifact: {
      frameworkSignals
    }
  });

  return {
    projectName: packageJson.name || path.basename(projectRoot),
    generatedAt,
    structure,
    frameworkSignals,
    teamProjectProfileRecommendation,
    componentUsage,
    componentGraphSummary: componentGraph.summary,
    componentPropagationSummary: componentPropagation.summary,
    fileRoleSummary,
    pagePatterns: {
      basicListPage: patterns.find((pattern) => pattern.type === "basic-list-page")?.frequency || 0,
      treeListPage: patterns.find((pattern) => pattern.type === "tree-list-page")?.frequency || 0,
      detailPage: patterns.find((pattern) => pattern.type === "detail-page")?.frequency || 0,
      dialogFormCrud: patterns.find((pattern) => pattern.type === "dialog-form")?.frequency || 0
    },
    fileSummary: { viewFileCount: viewFiles.length }
  };
}

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
