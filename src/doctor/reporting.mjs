const groupOrder = ["release", "workspace", "selection", "policy", "entrypoints", "conversation", "knowledge"];

const labelByGroup = {
  release: "release",
  workspace: "workspace",
  selection: "selection",
  policy: "policy",
  entrypoints: "entrypoints",
  conversation: "conversation",
  knowledge: "knowledge"
};

const codeByGroup = {
  release: "PAI-RELEASE",
  workspace: "PAI-WORKSPACE",
  selection: "PAI-SELECTION",
  policy: "PAI-POLICY",
  entrypoints: "PAI-ENTRYPOINT",
  conversation: "PAI-CONVERSATION",
  knowledge: "PAI-KNOWLEDGE"
};

export function buildCheckGroups(checks) {
  return groupOrder
    .map((groupName) => {
      const groupChecks = checks.filter((check) => check.group === groupName);
      if (groupChecks.length === 0) return null;
      return {
        name: groupName,
        label: labelByGroup[groupName],
        code: codeByGroup[groupName],
        ok: groupChecks.every((check) => check.ok || check.severity === "warning"),
        total: groupChecks.length,
        passed: groupChecks.filter((check) => check.ok).length,
        failed: groupChecks.filter((check) => !check.ok && check.severity !== "warning").length,
        warnings: groupChecks.filter((check) => !check.ok && check.severity === "warning").length,
        checks: groupChecks
      };
    })
    .filter(Boolean);
}

export function buildRemediationTips({ checks, checkGroups, selection, entrypointStates }) {
  const tips = [];
  const failedGroups = checkGroups.filter((group) => !group.ok).map((group) => group.name);
  const failedChecks = checks.filter((check) => !check.ok && check.severity !== "warning");

  if (failedGroups.includes("workspace")) {
    tips.push("Workspace checks failed. Run `npx power-ai-skills sync` to rebuild the `.power-ai` workspace files.");
  }

  if (failedGroups.includes("selection")) {
    const selectedToolArgs = (selection.selectedTools || []).map((toolName) => `--tool ${toolName}`).join(" ");
    const command = selectedToolArgs
      ? `npx power-ai-skills init ${selectedToolArgs}`
      : "npx power-ai-skills init --tool <tool-name>";
    tips.push(`Selection metadata is incomplete or polluted by legacy references. Re-run ${command} in the consumer project to persist a clean tool selection.`);
  }

  if (failedGroups.includes("entrypoints")) {
    const brokenEntrypoints = entrypointStates.filter((entrypointState) => !entrypointState.ok).map((entrypointState) => entrypointState.target);
    const suffix = brokenEntrypoints.length > 0
      ? ` Broken entrypoints: ${brokenEntrypoints.join(", ")}.`
      : "";
    tips.push(`Entrypoint links or copies are not healthy. Run \`npx power-ai-skills sync\` to repair them, and re-run \`init\` if the selected tools changed.${suffix}`);
  }

  if (failedGroups.includes("policy")) {
    tips.push("Team policy drift was detected. Run `npx power-ai-skills check-team-policy-drift --json` for the full report, then `npx power-ai-skills sync` to refresh `.power-ai/team-policy.json` and required team skills.");
  }

  if (failedGroups.includes("conversation")) {
    tips.push("Conversation capture scaffolding is incomplete. Run `npx power-ai-skills sync` to restore `.power-ai/shared/conversation-capture.md`, `.power-ai/references/conversation-capture-contract.md`, and the adapter example scripts.");
  }

  if (failedGroups.includes("release")) {
    tips.push("Release governance artifacts are stale or inconsistent. Run `pnpm refresh:release-artifacts` and then `pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-automation-report --require-notification-payload`.");
  }

  if (failedGroups.includes("knowledge")) {
    tips.push("Component knowledge artifacts are missing. Run `npx power-ai-skills sync` to re-copy generated component guides and page recipes. If the problem remains, verify the installed package version contains `skills/foundation/power-component-library/references/generated/`.");
  }

  for (const check of failedChecks) {
    if (!check.remediation) continue;
    const pathSuffix = check.detail?.relativePath ? ` Missing file: ${check.detail.relativePath}.` : "";
    tips.push(`${check.remediation}${pathSuffix}`);
  }

  return [...new Set(tips)];
}

function appendDoctorCheckGroups(lines, result, heading, { markdown = false } = {}) {
  lines.push("", heading);
  for (const group of result.checkGroups || []) {
    lines.push(`- ${group.ok ? "ok" : "fail"} ${group.label} [${group.code}] (${group.passed}/${group.total})`);
    for (const check of group.checks) {
      const marker = check.ok ? "ok" : check.severity === "warning" ? "warn" : "fail";
      lines.push(markdown
        ? `  - ${marker} [${check.code}] ${check.name}`
        : `  - ${marker} [${check.code}] ${check.name}`);
    }
  }
}

export function buildDoctorSummary(result) {
  const lines = [
    `Package: ${result.packageName}@${result.version}`,
    `Project: ${result.projectRoot}`,
    `Mode: ${result.mode}`,
    `Selection: ${result.selectedTools.join(", ")}`,
    `Status: ${result.ok ? "ok" : "failed"}`
  ];

  if (result.generatedAt) lines.push(`Generated At: ${result.generatedAt}`);
  if ((result.failureCodes || []).length > 0) lines.push(`Failure Codes: ${result.failureCodes.join(", ")}`);
  appendDoctorCheckGroups(lines, result, "Checks:");

  lines.push("", "Entrypoints:");
  for (const entrypointState of result.entrypointStates || []) {
    lines.push(`- ${entrypointState.target}: ${entrypointState.state}`);
  }

  if ((result.remediationTips || []).length > 0) {
    lines.push("", "Suggestions:");
    for (const tip of result.remediationTips) lines.push(`- ${tip}`);
  }

  if ((result.warnings || []).length > 0) {
    lines.push("", "Warnings:");
    for (const warning of result.warnings) lines.push(`- ${warning}`);
  }

  return lines.join("\n");
}

export function buildDoctorMarkdown(result) {
  const lines = [
    `# ${result.packageName}@${result.version}`,
    "",
    "## Summary",
    `- root: ${result.projectRoot}`,
    `- mode: ${result.mode}`,
    `- selection: ${result.selectedTools.join(", ") || "none"}`,
    `- status: ${result.ok ? "ok" : "failed"}`
  ];

  if (result.generatedAt) lines.push(`- generatedAt: ${result.generatedAt}`);
  if ((result.failureCodes || []).length > 0) lines.push(`- failure codes: ${result.failureCodes.join(", ")}`);
  appendDoctorCheckGroups(lines, result, "## Checks", { markdown: true });

  lines.push("", "## Entrypoints");
  for (const entrypointState of result.entrypointStates || []) {
    lines.push(`- \`${entrypointState.target}\`: ${entrypointState.state}`);
  }

  if ((result.remediationTips || []).length > 0) {
    lines.push("", "## Suggestions");
    for (const tip of result.remediationTips) lines.push(`- ${tip}`);
  }

  if ((result.warnings || []).length > 0) {
    lines.push("", "## Warnings");
    for (const warning of result.warnings) lines.push(`- ${warning}`);
  }

  return lines.join("\n");
}
