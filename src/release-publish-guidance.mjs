function normalizeText(value = "") {
  return String(value || "").trim();
}

export function buildExecuteReleasePublishCommand({
  confirm = false,
  acknowledgeWarnings = false,
  json = true
} = {}) {
  const flags = ["npx power-ai-skills execute-release-publish"];
  if (confirm) flags.push("--confirm");
  if (acknowledgeWarnings) flags.push("--acknowledge-warnings");
  if (json) flags.push("--json");
  return flags.join(" ");
}

export function buildPlannerNextAction({ status, publishReadiness, targetPublish }) {
  if (status === "blocked") {
    return {
      kind: "resolve-blockers",
      command: "",
      reason: "Resolve planner blockers and refresh release evidence before attempting controlled publish execution again.",
      manualPublishCommand: normalizeText(targetPublish?.publishCommand)
    };
  }

  if (publishReadiness?.requiresExplicitAcknowledgement) {
    return {
      kind: "run-controlled-executor",
      command: buildExecuteReleasePublishCommand({
        confirm: true,
        acknowledgeWarnings: true
      }),
      reason: "Current release readiness is warn-level; advance through the controlled executor only after explicitly acknowledging warnings.",
      manualPublishCommand: normalizeText(targetPublish?.publishCommand)
    };
  }

  return {
    kind: "run-controlled-executor",
    command: buildExecuteReleasePublishCommand({
      confirm: true
    }),
    reason: "Dry-run eligibility passed; use the controlled executor to re-check readiness immediately before any separate manual publish.",
    manualPublishCommand: normalizeText(targetPublish?.publishCommand)
  };
}

export function buildExecutorNextAction({ status, targetPublish }) {
  if (status === "confirmation-required") {
    return {
      kind: "run-controlled-executor",
      command: buildExecuteReleasePublishCommand({
        confirm: true
      }),
      reason: "Explicit confirmation is still required before this controlled execution can advance beyond the confirmation gate.",
      manualPublishCommand: normalizeText(targetPublish?.publishCommand)
    };
  }

  if (status === "acknowledgement-required") {
    return {
      kind: "run-controlled-executor",
      command: buildExecuteReleasePublishCommand({
        confirm: true,
        acknowledgeWarnings: true
      }),
      reason: "Warn-level release readiness requires explicit acknowledgement before this controlled execution can advance.",
      manualPublishCommand: normalizeText(targetPublish?.publishCommand)
    };
  }

  if (status === "ready-to-execute") {
    return {
      kind: "controlled-gate-satisfied",
      command: "",
      reason: "The controlled execution gate is satisfied and the real npm publish command completed successfully for this run.",
      manualPublishCommand: normalizeText(targetPublish?.publishCommand)
    };
  }

  if (status === "published") {
    return {
      kind: "publish-complete",
      command: "",
      reason: "The controlled execution gate is satisfied and the real npm publish command completed successfully for this run.",
      manualPublishCommand: normalizeText(targetPublish?.publishCommand)
    };
  }

  if (status === "publish-failed") {
    return {
      kind: "review-publish-failure",
      command: "",
      reason: "The controlled execution reached the real npm publish step, but the publish command failed and must be reviewed before retrying.",
      manualPublishCommand: normalizeText(targetPublish?.publishCommand)
    };
  }

  return {
    kind: "resolve-blockers",
    command: "",
    reason: "Resolve the latest planner blockers before retrying controlled publish execution.",
    manualPublishCommand: normalizeText(targetPublish?.publishCommand)
  };
}
