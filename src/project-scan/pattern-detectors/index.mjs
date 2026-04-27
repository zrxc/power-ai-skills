import { detectBasicListPattern } from "./basic-list-detector.mjs";
import { detectDetailPagePattern } from "./detail-page-detector.mjs";
import { detectDialogFormPattern } from "./dialog-form-detector.mjs";
import { detectTreeListPattern } from "./tree-list-detector.mjs";

export { detectBasicListPattern } from "./basic-list-detector.mjs";
export { detectDetailPagePattern } from "./detail-page-detector.mjs";
export { detectDialogFormPattern } from "./dialog-form-detector.mjs";
export { detectTreeListPattern } from "./tree-list-detector.mjs";

export function detectFilePatterns(signals) {
  const treeCandidate = detectTreeListPattern(signals);
  return [
    treeCandidate,
    detectBasicListPattern(signals, treeCandidate?.score || 0),
    detectDialogFormPattern(signals),
    detectDetailPagePattern(signals)
  ]
    .filter(Boolean)
    .map((candidate) => ({ ...candidate, files: [signals.relativePath], entity: signals.entity }))
    .sort((left, right) => right.score - left.score || left.type.localeCompare(right.type, "zh-CN"));
}
