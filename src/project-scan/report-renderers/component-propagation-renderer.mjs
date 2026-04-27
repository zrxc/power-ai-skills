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
