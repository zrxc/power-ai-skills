import path from "node:path";
import { detectRecommendedTeamProjectProfile } from "../../team-policy/project-profile-detection.mjs";
import { buildProjectPagePatternSummary } from "./pattern-profile-summary.mjs";

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
    pagePatterns: buildProjectPagePatternSummary(patterns),
    fileSummary: { viewFileCount: viewFiles.length }
  };
}
