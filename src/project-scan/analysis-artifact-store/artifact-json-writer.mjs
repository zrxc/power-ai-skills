import { ensureDir, writeJson } from "../../shared/fs.mjs";

export function writeProjectAnalysisJsonArtifacts({ paths, result, patternReview, patternFeedback, patternDiff, patternHistory }) {
  ensureDir(paths.analysisRoot);

  writeJson(paths.projectProfilePath, result.projectProfile);
  writeJson(paths.patternsPath, result.patterns);
  writeJson(paths.patternReviewPath, patternReview);
  writeJson(paths.patternFeedbackPath, patternFeedback);
  writeJson(paths.patternDiffPath, patternDiff);
  writeJson(paths.patternHistoryPath, patternHistory);
  writeJson(paths.componentGraphPath, result.componentGraph);
  writeJson(paths.componentPropagationPath, result.componentPropagation);

  return {
    projectProfilePath: paths.projectProfilePath,
    patternsPath: paths.patternsPath,
    patternReviewPath: paths.patternReviewPath,
    patternFeedbackPath: paths.patternFeedbackPath,
    patternDiffPath: paths.patternDiffPath,
    patternHistoryPath: paths.patternHistoryPath,
    componentGraphPath: paths.componentGraphPath,
    componentPropagationPath: paths.componentPropagationPath
  };
}
