import { loadAnalysisArtifacts as loadArtifacts } from "./analysis-artifact-store/artifact-loader.mjs";
import { writeProjectAnalysisJsonArtifacts } from "./analysis-artifact-store/artifact-json-writer.mjs";
import { writeProjectAnalysisReports } from "./analysis-artifact-store/artifact-report-writer.mjs";

export function loadAnalysisArtifacts(paths) {
  return loadArtifacts(paths);
}

export function writeProjectAnalysisArtifacts({ paths, result, patternReview, patternFeedback, patternDiff, patternHistory }) {
  return {
    ...writeProjectAnalysisJsonArtifacts({
      paths,
      result,
      patternReview,
      patternFeedback,
      patternDiff,
      patternHistory
    }),
    ...writeProjectAnalysisReports({
      paths,
      result,
      patternReview,
      patternFeedback,
      patternDiff
    })
  };
}
