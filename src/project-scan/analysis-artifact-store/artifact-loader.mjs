import fs from "node:fs";
import { readJson } from "../../shared/fs.mjs";
import {
  createEmptyPatternFeedback,
  loadPatternFeedback
} from "../pattern-feedback.mjs";

function getRequiredArtifactPaths(paths) {
  return [
    paths.projectProfilePath,
    paths.patternsPath,
    paths.patternReviewPath,
    paths.patternDiffPath,
    paths.patternHistoryPath,
    paths.componentGraphPath,
    paths.componentPropagationPath
  ];
}

export function loadAnalysisArtifacts(paths) {
  if (getRequiredArtifactPaths(paths).some((filePath) => !fs.existsSync(filePath))) {
    throw new Error("Missing project analysis artifacts. Run `npx power-ai-skills scan-project` first.");
  }

  return {
    projectProfile: readJson(paths.projectProfilePath),
    patterns: readJson(paths.patternsPath),
    patternReview: readJson(paths.patternReviewPath),
    patternFeedback: fs.existsSync(paths.patternFeedbackPath)
      ? loadPatternFeedback(paths.patternFeedbackPath)
      : createEmptyPatternFeedback(),
    patternDiff: readJson(paths.patternDiffPath),
    patternHistory: readJson(paths.patternHistoryPath),
    componentGraph: readJson(paths.componentGraphPath),
    componentPropagation: readJson(paths.componentPropagationPath)
  };
}
