export function createProjectScanPipelineService({
  writeProjectAnalysis,
  projectLocalSkillService
}) {
  function runProjectScanPipeline({ regenerate = false } = {}) {
    const scanResult = writeProjectAnalysis();
    const generationResult = projectLocalSkillService.generateProjectLocalSkills({ regenerate });
    return { scanResult, generationResult };
  }

  return {
    runProjectScanPipeline
  };
}
