import fs from "node:fs";
import { readJson, writeJson } from "../../scripts/shared.mjs";

const governanceVersion = "1.4.7";

export function createEmptyConversationPatternGovernance() {
  return {
    version: governanceVersion,
    updatedAt: "",
    merges: [],
    archives: [],
    history: []
  };
}

export function loadConversationPatternGovernance(paths) {
  if (!fs.existsSync(paths.patternGovernancePath)) return createEmptyConversationPatternGovernance();
  const stored = readJson(paths.patternGovernancePath);
  return {
    ...createEmptyConversationPatternGovernance(),
    ...stored,
    merges: Array.isArray(stored?.merges) ? stored.merges : [],
    archives: Array.isArray(stored?.archives) ? stored.archives : [],
    history: Array.isArray(stored?.history) ? stored.history : []
  };
}

export function writeConversationPatternGovernance(paths, governance) {
  writeJson(paths.patternGovernancePath, governance);
}

export function buildConversationPatternGovernanceMarkdown({ projectName, governance, payload }) {
  const lines = [
    "# Conversation Pattern Governance",
    "",
    `- project: \`${projectName}\``,
    `- updatedAt: \`${governance.updatedAt || "not-set"}\``,
    `- active merges: ${governance.merges.length}`,
    `- active archives: ${governance.archives.length}`,
    `- history entries: ${governance.history.length}`,
    `- active patterns: ${(payload?.patterns || []).length}`,
    "",
    "## Active Merges",
    ""
  ];

  if (governance.merges.length === 0) {
    lines.push("No active merge rules.");
  } else {
    for (const merge of governance.merges) {
      lines.push(`- \`${merge.sourcePatternId}\` -> \`${merge.targetPatternId}\` (${merge.sourceSceneType} -> ${merge.targetSceneType})`);
      if (merge.note) lines.push(`  note: ${merge.note}`);
    }
  }

  lines.push("", "## Active Archives", "");
  if (governance.archives.length === 0) {
    lines.push("No archived patterns.");
  } else {
    for (const archive of governance.archives) {
      lines.push(`- \`${archive.patternId}\` (${archive.sceneType})`);
      if (archive.note) lines.push(`  note: ${archive.note}`);
    }
  }

  lines.push("", "## Recent History", "");
  const recentHistory = [...governance.history].slice(-10).reverse();
  if (recentHistory.length === 0) {
    lines.push("No governance history yet.");
  } else {
    for (const event of recentHistory) {
      if (event.type === "merge") {
        lines.push(`- \`${event.type}\` \`${event.sourcePatternId}\` -> \`${event.targetPatternId}\` at \`${event.at}\`${event.note ? ` (${event.note})` : ""}`);
      } else {
        lines.push(`- \`${event.type}\` \`${event.patternId}\` at \`${event.at}\`${event.note ? ` (${event.note})` : ""}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
}
