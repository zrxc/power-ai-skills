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

export function buildScanDiffMarkdown({ projectName, patternDiff }) {
  const lines = [
    "# Project Scan Diff",
    "",
    `- project: \`${projectName}\``,
    `- generatedAt: \`${patternDiff.generatedAt}\``,
    `- hasPreviousSnapshot: ${patternDiff.hasPreviousSnapshot}`,
    `- added: ${patternDiff.summary.added}`,
    `- changed: ${patternDiff.summary.changed}`,
    `- removed: ${patternDiff.summary.removed}`,
    `- unchanged: ${patternDiff.summary.unchanged}`,
    ""
  ];

  if (patternDiff.changes.length === 0) {
    lines.push("No pattern changes detected.");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  lines.push("## Changes");
  lines.push("");
  for (const change of patternDiff.changes) {
    lines.push(`### ${change.type}`);
    lines.push("");
    lines.push(`- changeType: \`${change.changeType}\``);
    if (change.previous) lines.push(`- previous: frequency=${change.previous.frequency}, confidence=${change.previous.confidence}, decision=${change.previous.decision}, dominantSubpattern=${change.previous.dominantSubpattern}`);
    if (change.current) lines.push(`- current: frequency=${change.current.frequency}, confidence=${change.current.confidence}, decision=${change.current.decision}, dominantSubpattern=${change.current.dominantSubpattern}`);
    lines.push(`- fields: ${change.fields.map((field) => `\`${field}\``).join(", ")}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function buildComponentGraphSummaryMarkdown({ projectName, componentGraph }) {
  const lines = [
    "# Component Graph Summary",
    "",
    `- project: \`${projectName}\``,
    `- generatedAt: \`${componentGraph.generatedAt}\``,
    `- nodes: ${componentGraph.summary.nodeCount}`,
    `- edges: ${componentGraph.summary.edgeCount}`,
    `- used edges: ${componentGraph.summary.usedEdgeCount}`,
    `- referenced components: ${componentGraph.summary.referencedComponentCount}`,
    `- page to fragment edges: ${componentGraph.summary.pageToFragmentEdgeCount}`,
    "",
    "## Edges",
    ""
  ];

  if (componentGraph.edges.length === 0) {
    lines.push("No component edges detected.");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  for (const edge of componentGraph.edges.filter((item) => item.usedInTemplate)) {
    lines.push(`- \`${edge.from}\` -> \`${edge.to}\` via \`${edge.localName}\``);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function buildComponentPropagationSummaryMarkdown({ projectName, componentPropagation }) {
  const lines = [
    "# Component Propagation Summary",
    "",
    `- project: \`${projectName}\``,
    `- generatedAt: \`${componentPropagation.generatedAt}\``,
    `- files: ${componentPropagation.summary.fileCount}`,
    `- max reach depth: ${componentPropagation.summary.maxReachDepth}`,
    `- transitive page to fragment links: ${componentPropagation.summary.transitivePageToFragmentCount}`,
    `- files with reachable fragments: ${componentPropagation.summary.filesWithReachableFragments}`,
    "",
    "## Reachable Fragments",
    ""
  ];

  const filesWithFragments = componentPropagation.files.filter((item) => item.reachableFragments.length > 0);
  if (filesWithFragments.length === 0) {
    lines.push("No transitive fragment propagation detected.");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  for (const file of filesWithFragments) {
    const fragmentSummary = file.reachableFragments
      .map((fragment) => `\`${fragment.path}\`(depth=${fragment.depth}, role=${fragment.fileRole})`)
      .join(", ");
    lines.push(`- \`${file.path}\` -> ${fragmentSummary}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
