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
