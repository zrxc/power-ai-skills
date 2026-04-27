import fs from "node:fs";
import { ensureDir, readJson, writeJson } from "../shared/fs.mjs";
import {
  buildComponentGraphSummaryMarkdown,
  buildComponentPropagationSummaryMarkdown,
  buildScanDiffMarkdown,
  buildScanSummaryMarkdown
} from "./report-renderers.mjs";
import {
  buildPatternFeedbackMarkdown,
  createEmptyPatternFeedback,
  loadPatternFeedback
} from "./pattern-feedback.mjs";

export function loadAnalysisArtifacts(paths) {
  const requiredPaths = [
    paths.projectProfilePath,
    paths.patternsPath,
    paths.patternReviewPath,
    paths.patternDiffPath,
    paths.patternHistoryPath,
    paths.componentGraphPath,
    paths.componentPropagationPath
  ];
  if (requiredPaths.some((filePath) => !fs.existsSync(filePath))) {
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

export function writeProjectAnalysisArtifacts({ paths, result, patternReview, patternFeedback, patternDiff, patternHistory }) {
  ensureDir(paths.analysisRoot);
  ensureDir(paths.reportsRoot);

  writeJson(paths.projectProfilePath, result.projectProfile);
  writeJson(paths.patternsPath, result.patterns);
  writeJson(paths.patternReviewPath, patternReview);
  writeJson(paths.patternFeedbackPath, patternFeedback);
  writeJson(paths.patternDiffPath, patternDiff);
  writeJson(paths.patternHistoryPath, patternHistory);
  writeJson(paths.componentGraphPath, result.componentGraph);
  writeJson(paths.componentPropagationPath, result.componentPropagation);

  fs.writeFileSync(
    paths.summaryReportPath,
    buildScanSummaryMarkdown({ projectProfile: result.projectProfile, patternReview, patternDiff }),
    "utf8"
  );
  fs.writeFileSync(
    paths.diffReportPath,
    buildScanDiffMarkdown({ projectName: result.projectProfile.projectName, patternDiff }),
    "utf8"
  );
  fs.writeFileSync(
    paths.feedbackReportPath,
    buildPatternFeedbackMarkdown({
      projectName: result.projectProfile.projectName,
      patternFeedback,
      patternReview
    }),
    "utf8"
  );
  fs.writeFileSync(
    paths.componentGraphReportPath,
    buildComponentGraphSummaryMarkdown({ projectName: result.projectProfile.projectName, componentGraph: result.componentGraph }),
    "utf8"
  );
  fs.writeFileSync(
    paths.componentPropagationReportPath,
    buildComponentPropagationSummaryMarkdown({ projectName: result.projectProfile.projectName, componentPropagation: result.componentPropagation }),
    "utf8"
  );

  return {
    projectProfilePath: paths.projectProfilePath,
    patternsPath: paths.patternsPath,
    patternReviewPath: paths.patternReviewPath,
    patternFeedbackPath: paths.patternFeedbackPath,
    patternDiffPath: paths.patternDiffPath,
    patternHistoryPath: paths.patternHistoryPath,
    componentGraphPath: paths.componentGraphPath,
    componentPropagationPath: paths.componentPropagationPath,
    summaryReportPath: paths.summaryReportPath,
    diffReportPath: paths.diffReportPath,
    feedbackReportPath: paths.feedbackReportPath,
    componentGraphReportPath: paths.componentGraphReportPath,
    componentPropagationReportPath: paths.componentPropagationReportPath
  };
}
