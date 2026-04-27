import { createProjectLocalGenerationService } from "./project-local-generation-service.mjs";
import { createProjectLocalLifecycleService } from "./project-local-lifecycle-service.mjs";

export function createProjectLocalSkillService({
  projectRoot,
  getAnalysisPaths,
  loadAnalysisArtifacts,
  ensureOverlayRoot,
  loadProjectPackageJson,
  promotionTraceService
}) {
  const generationService = createProjectLocalGenerationService({
    getAnalysisPaths,
    loadAnalysisArtifacts,
    ensureOverlayRoot
  });

  const lifecycleService = createProjectLocalLifecycleService({
    projectRoot,
    getAnalysisPaths,
    ensureOverlayRoot,
    loadProjectPackageJson,
    promotionTraceService
  });

  return {
    ...generationService,
    ...lifecycleService
  };
}
