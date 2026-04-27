import fs from "node:fs";
import { readJson } from "../shared/fs.mjs";
import { buildPatternDiff, buildPatternHistory } from "./pattern-history.mjs";
import { buildPatternReview } from "./pattern-review.mjs";
import { writeProjectAnalysisArtifacts } from "./analysis-artifact-store.mjs";

const DEFAULT_HISTORY_LIMIT = 20;

export function buildProjectAnalysisOutputs({ paths, result, patternFeedback, historyLimit = DEFAULT_HISTORY_LIMIT }) {
  const previousPatterns = fs.existsSync(paths.patternsPath) ? readJson(paths.patternsPath) : { patterns: [] };
  const previousPatternReview = fs.existsSync(paths.patternReviewPath) ? readJson(paths.patternReviewPath) : { patterns: [] };
  const previousPatternHistory = fs.existsSync(paths.patternHistoryPath) ? readJson(paths.patternHistoryPath) : { snapshots: [] };
  const patternReview = buildPatternReview(result.patterns.patterns, { feedback: patternFeedback });
  const patternDiff = buildPatternDiff({
    previousPatterns,
    previousReview: previousPatternReview,
    currentPatterns: result.patterns,
    currentReview: patternReview,
    currentGeneratedAt: result.generatedAt
  });
  const patternHistory = buildPatternHistory({
    previousHistory: previousPatternHistory,
    projectName: result.projectProfile.projectName,
    generatedAt: result.generatedAt,
    patterns: result.patterns,
    patternReview,
    historyLimit
  });

  return {
    patternReview,
    patternDiff,
    patternHistory,
    outputs: writeProjectAnalysisArtifacts({
      paths,
      result,
      patternReview,
      patternFeedback,
      patternDiff,
      patternHistory
    })
  };
}
