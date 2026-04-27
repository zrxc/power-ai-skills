import { analyzeProjectViewFiles, buildProjectScanAnalysis } from "./scan-analysis.mjs";
import {
  collectFrameworkSignals,
  collectProjectScanInputs,
  listFilesRecursively,
  loadProjectPackageJson,
  readTextIfExists,
  resolveProjectStructure
} from "./scan-inputs.mjs";
import { buildProjectScanResult } from "./scan-result-builder.mjs";

export {
  collectFrameworkSignals,
  listFilesRecursively,
  loadProjectPackageJson,
  readTextIfExists,
  resolveProjectStructure
} from "./scan-inputs.mjs";

export function scanProjectArtifacts({ context, projectRoot }) {
  const generatedAt = new Date().toISOString();
  const {
    packageJson,
    structure,
    viewFiles,
    frameworkSignals
  } = collectProjectScanInputs(projectRoot);
  const {
    fileAnalyses,
    componentUsage,
    fileRoleSummary
  } = analyzeProjectViewFiles({ projectRoot, viewFiles });
  const {
    componentGraph,
    componentPropagation,
    patterns
  } = buildProjectScanAnalysis(fileAnalyses);

  return buildProjectScanResult({
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
  });
}
