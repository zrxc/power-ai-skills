export function buildScanSummaryMarkdown({ projectProfile, patternReview, patternDiff }) {
  const lines = [
    "# Project Scan Summary",
    "",
    `- project: \`${projectProfile.projectName}\``,
    `- generatedAt: \`${projectProfile.generatedAt}\``,
    `- view files: ${projectProfile.fileSummary.viewFileCount}`,
    `- generated patterns: ${patternReview.summary.generate}`,
    `- review patterns: ${patternReview.summary.review}`,
    `- skipped patterns: ${patternReview.summary.skip}`,
    `- component edges: ${projectProfile.componentGraphSummary?.edgeCount || 0}`,
    `- max component reach depth: ${projectProfile.componentPropagationSummary?.maxReachDepth || 0}`,
    `- files with reachable fragments: ${projectProfile.componentPropagationSummary?.filesWithReachableFragments || 0}`,
    `- feedback overrides: ${patternReview.feedbackSummary?.overrides || 0}`,
    `- applied feedback overrides: ${patternReview.feedbackSummary?.applied || 0}`,
    `- stale feedback overrides: ${patternReview.feedbackSummary?.stale || 0}`,
    `- diff summary: added ${patternDiff.summary.added}, changed ${patternDiff.summary.changed}, removed ${patternDiff.summary.removed}`,
    "",
    "## Pattern Decisions",
    ""
  ];

  for (const pattern of patternReview.patterns) {
    lines.push(`### ${pattern.type}`);
    lines.push("");
    lines.push(`- autoDecision: \`${pattern.autoDecision}\``);
    lines.push(`- decision: \`${pattern.decision}\``);
    lines.push(`- decisionSource: \`${pattern.decisionSource || "heuristic"}\``);
    lines.push(`- dominantSubpattern: \`${pattern.dominantSubpattern}\``);
    lines.push(`- frequency: ${pattern.frequency}`);
    lines.push(`- confidence: \`${pattern.confidence}\``);
    lines.push(`- averageScore: ${pattern.averageScore}`);
    lines.push(`- structuralScore: ${pattern.structuralScore}`);
    lines.push(`- purityScore: ${pattern.purityScore}`);
    lines.push(`- reuseScore: ${pattern.reuseScore}`);
    if (pattern.feedbackNote) lines.push(`- feedbackNote: ${pattern.feedbackNote}`);
    lines.push("- reasons:");
    for (const reason of pattern.reasons) lines.push(`  - ${reason}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
