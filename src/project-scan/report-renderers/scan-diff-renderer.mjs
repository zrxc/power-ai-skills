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
