import fs from "node:fs";
import { ensureDir } from "../../shared/fs.mjs";
import {
  buildComponentGraphSummaryMarkdown,
  buildComponentPropagationSummaryMarkdown,
  buildScanDiffMarkdown,
  buildScanSummaryMarkdown
} from "../report-renderers.mjs";
import { buildPatternFeedbackMarkdown } from "../pattern-feedback.mjs";

export function writeProjectAnalysisReports({ paths, result, patternReview, patternFeedback, patternDiff }) {
  ensureDir(paths.reportsRoot);

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
    buildComponentGraphSummaryMarkdown({
      projectName: result.projectProfile.projectName,
      componentGraph: result.componentGraph
    }),
    "utf8"
  );
  fs.writeFileSync(
    paths.componentPropagationReportPath,
    buildComponentPropagationSummaryMarkdown({
      projectName: result.projectProfile.projectName,
      componentPropagation: result.componentPropagation
    }),
    "utf8"
  );

  return {
    summaryReportPath: paths.summaryReportPath,
    diffReportPath: paths.diffReportPath,
    feedbackReportPath: paths.feedbackReportPath,
    componentGraphReportPath: paths.componentGraphReportPath,
    componentPropagationReportPath: paths.componentPropagationReportPath
  };
}
