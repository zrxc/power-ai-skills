import fs from "node:fs";
import { writeJson } from "../../scripts/shared.mjs";

const supportedReviewDecisions = new Set(["generate", "review", "skip"]);

function buildFeedbackSummary(overrides) {
  return {
    total: overrides.length,
    generate: overrides.filter((item) => item.decision === "generate").length,
    review: overrides.filter((item) => item.decision === "review").length,
    skip: overrides.filter((item) => item.decision === "skip").length
  };
}

export function listSupportedPatternReviewDecisions() {
  return [...supportedReviewDecisions];
}

export function isSupportedPatternReviewDecision(decision) {
  return supportedReviewDecisions.has(decision);
}

export function createEmptyPatternFeedback() {
  return {
    generatedAt: new Date().toISOString(),
    summary: buildFeedbackSummary([]),
    overrides: []
  };
}

export function normalizePatternFeedback(payload) {
  const overrides = (payload?.overrides || [])
    .filter((item) => item?.patternId && item?.decision && supportedReviewDecisions.has(item.decision))
    .map((item) => ({
      patternId: item.patternId,
      patternType: item.patternType || "",
      decision: item.decision,
      note: item.note || "",
      createdAt: item.createdAt || item.updatedAt || "",
      updatedAt: item.updatedAt || item.createdAt || ""
    }));

  return {
    generatedAt: payload?.generatedAt || new Date().toISOString(),
    summary: buildFeedbackSummary(overrides),
    overrides
  };
}

export function loadPatternFeedback(feedbackPath) {
  if (!fs.existsSync(feedbackPath)) return createEmptyPatternFeedback();
  return normalizePatternFeedback(JSON.parse(fs.readFileSync(feedbackPath, "utf8")));
}

export function writePatternFeedback(feedbackPath, payload) {
  const normalized = normalizePatternFeedback({
    ...payload,
    generatedAt: new Date().toISOString()
  });
  writeJson(feedbackPath, normalized);
  return normalized;
}

export function buildPatternFeedbackMarkdown({ projectName, patternFeedback, patternReview }) {
  const reviewPatternMap = new Map((patternReview?.patterns || []).map((pattern) => [pattern.id, pattern]));
  const lines = [
    "# Project Scan Feedback",
    "",
    `- project: \`${projectName}\``,
    `- generatedAt: \`${patternFeedback.generatedAt}\``,
    `- overrides: ${patternFeedback.summary.total}`,
    `- generate overrides: ${patternFeedback.summary.generate}`,
    `- review overrides: ${patternFeedback.summary.review}`,
    `- skip overrides: ${patternFeedback.summary.skip}`,
    `- applied overrides: ${patternReview?.feedbackSummary?.applied || 0}`,
    `- stale overrides: ${patternReview?.feedbackSummary?.stale || 0}`,
    "",
    "## Overrides",
    ""
  ];

  if ((patternFeedback.overrides || []).length === 0) {
    lines.push("No manual project scan feedback overrides.");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  for (const override of patternFeedback.overrides) {
    const reviewedPattern = reviewPatternMap.get(override.patternId);
    lines.push(`### ${override.patternType || override.patternId}`);
    lines.push("");
    lines.push(`- patternId: \`${override.patternId}\``);
    lines.push(`- decision: \`${override.decision}\``);
    lines.push(`- note: ${override.note || "none"}`);
    lines.push(`- updatedAt: \`${override.updatedAt || "unknown"}\``);
    lines.push(`- applied: ${reviewedPattern ? "yes" : "no"}`);
    if (reviewedPattern) {
      lines.push(`- currentDecision: \`${reviewedPattern.decision}\``);
      lines.push(`- autoDecision: \`${reviewedPattern.autoDecision}\``);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
