/**
 * Project Baseline Markdown 报告生成模块
 * 
 * 负责：
 * - 将基线检查结果生成为 Markdown 格式报告
 */

/**
 * 构建基线检查 Markdown 报告
 */
export function buildBaselineMarkdown(payload) {
  const lines = [
    "# Project Baseline Check",
    "",
    `- package: \`${payload.packageName}@${payload.version}\``,
    `- root: \`${payload.projectRoot}\``,
    `- status: \`${payload.status}\``,
    `- generatedAt: \`${payload.generatedAt}\``,
    `- project profile: ${payload.currentSelection.selectedProjectProfile ? `\`${payload.currentSelection.selectedProjectProfile}\`` : "none"}`,
    `- recommended project profile: ${payload.currentSelection.recommendedProjectProfile ? `\`${payload.currentSelection.recommendedProjectProfile}\`` : "none"}`,
    `- profile decision: \`${payload.currentSelection.projectProfileDecision || "auto-recommended"}\``,
    `- profile decision reason: ${payload.currentSelection.projectProfileDecisionReason || "none"}`,
    `- next review: ${payload.currentSelection.projectProfileDecisionReviewAt ? `\`${payload.currentSelection.projectProfileDecisionReviewAt}\`` : "none"}`,
    `- review deadline status: \`${payload.currentSelection.projectProfileDecisionReviewStatus || "not-scheduled"}\``,
    `- current tools: ${payload.currentSelection.expandedTools.length ? payload.currentSelection.expandedTools.map((toolName) => `\`${toolName}\``).join(", ") : "none"}`,
    `- team default tools: ${payload.teamDefaultSelection.expandedTools.length ? payload.teamDefaultSelection.expandedTools.map((toolName) => `\`${toolName}\``).join(", ") : "none"}`,
    ""
  ];

  for (const group of payload.checkGroups) {
    lines.push(`## ${group.name}`);
    lines.push("");
    lines.push(`- status: ${group.ok ? "ok" : "attention"}`);
    lines.push(`- checks: ${group.passed}/${group.total}, failed: ${group.failed}, warnings: ${group.warnings}`);
    for (const check of group.checks) {
      const marker = check.ok ? "ok" : check.severity === "warning" ? "warn" : "fail";
      lines.push(`- ${marker} [${check.code}] ${check.name}`);
    }
    lines.push("");
  }

  lines.push("## Recommended Actions", "");
  if (payload.recommendedActions.length === 0) {
    lines.push("- none");
  } else {
    for (const action of payload.recommendedActions) lines.push(`- ${action}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
