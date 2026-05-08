function sumFailedHistoryEntries(history) {
  if (!history?.available) return 0;
  const items = Array.isArray(history.summary?.statusBreakdown)
    ? history.summary.statusBreakdown
    : [];
  return items
    .filter((item) => item?.status === "failed")
    .reduce((total, item) => total + Number(item.count || 0), 0);
}

function extractPrimaryActionCommand(nextActions = []) {
  const firstAction = (nextActions || []).find((item) => typeof item === "string" && item.trim());
  if (!firstAction) return "";
  const commandMatch = firstAction.match(/`([^`]+)`/);
  return commandMatch?.[1] || "";
}

function buildFinalStatus(resolutionLevel) {
  if (resolutionLevel === "still-needs-action") {
    return {
      code: "handle-now",
      summary: "Handle this result before treating the silent follow-up as settled."
    };
  }

  if (resolutionLevel === "review-when-convenient") {
    return {
      code: "review-later",
      summary: "Nothing is blocked, but this result is still worth reviewing later."
    };
  }

  return {
    code: "ignore",
    summary: "This result can be ignored for now."
  };
}

function buildHeadline(finalStatus) {
  if (finalStatus?.code === "handle-now") {
    return {
      tone: "attention",
      label: "Needs action now",
      summary: "Silent follow-up needs user attention now."
    };
  }

  if (finalStatus?.code === "review-later") {
    return {
      tone: "notice",
      label: "Review later",
      summary: "Silent follow-up is fine for now, but worth reviewing later."
    };
  }

  return {
    tone: "quiet",
    label: "No action needed",
    summary: "Silent follow-up can be ignored for now."
  };
}

function buildRecommendation(level, summary, nextActions = [], {
  requiresAttention = false,
  primaryActionSummary = "",
  resolutionLevel = "can-ignore",
  resolutionSummary = "This result can be ignored for now."
} = {}) {
  const normalizedActions = (nextActions || []).filter((item) => typeof item === "string" && item.trim());
  const primaryAction = primaryActionSummary
    ? {
        summary: primaryActionSummary,
        command: extractPrimaryActionCommand(normalizedActions)
      }
    : null;
  const finalStatus = buildFinalStatus(resolutionLevel);
  return {
    level,
    requiresAttention,
    summary,
    nextActions: normalizedActions,
    primaryAction,
    resolutionSignal: {
      level: resolutionLevel,
      summary: resolutionSummary
    },
    finalStatus,
    headline: buildHeadline(finalStatus)
  };
}

export function buildSyncFollowUpRecommendation(payload = {}) {
  const checkCommand = payload.recommendedCheckCommand || "npx power-ai-skills status --format summary";
  const reportPath = payload.reportPath || ".power-ai/reports/sync-evolution-follow-up.md";
  const optOutEnvVar = payload.optOutEnvVar || "POWER_AI_SKIP_SYNC_EVOLUTION_FOLLOW_UP=1";
  const status = payload.status || "unknown";
  const mode = payload.mode || "unknown";
  const reason = payload.triggerReason || payload.skipReason || "none";
  const failedActionCount = Number(payload.failedActionCount || 0);
  const executedActionCount = Number(payload.executedActionCount || 0);
  const skippedActionCount = Number(payload.skippedActionCount || 0);
  const failedHistoryCount = sumFailedHistoryEntries(payload.history);

  if (!payload.available) {
    return buildRecommendation(
      "info-only",
      "No silent sync follow-up result has been recorded yet, so there is nothing to review right now.",
      [],
      {
        resolutionLevel: "can-ignore",
        resolutionSummary: "There is no recorded silent follow-up yet, so there is nothing to handle."
      }
    );
  }

  if (status === "failed" || failedActionCount > 0) {
    const repeatedFailureNote = failedHistoryCount > 1
      ? " Recent silent follow-ups have failed more than once, so this is no longer a one-off signal."
      : "";
    return buildRecommendation(
      "review-needed",
      `The latest silent follow-up needs attention because ${mode === "error" ? "the sync follow-up itself failed" : `mode ${mode} reported failures`}.${repeatedFailureNote}`,
      [
        `Run \`${checkCommand}\` to confirm the latest workspace and habit-capture state.`,
        `Review \`${reportPath}\` for the latest silent follow-up details.`,
        "Run `npx power-ai-skills doctor` if the same failure keeps appearing after the next sync."
      ],
      {
        requiresAttention: true,
        primaryActionSummary: "Review the latest silent follow-up result before continuing with normal usage.",
        resolutionLevel: "still-needs-action",
        resolutionSummary: "This result still needs user attention before it should be treated as settled."
      }
    );
  }

  if (status === "executed" && mode === "apply-evolution-actions" && executedActionCount > 0) {
    return buildRecommendation(
      "low-risk-follow-up-available",
      "The latest silent follow-up refreshed low-risk project-local or governance artifacts. A lightweight review is available, but nothing urgent is blocked.",
      [
        `Run \`${checkCommand}\` to inspect the refreshed consumer-side status in one view.`,
        "Run `npx power-ai-skills list-project-local-skills` if you want to inspect the refreshed project-local drafts."
      ],
      {
        primaryActionSummary: "Inspect the refreshed low-risk habit output when convenient.",
        resolutionLevel: "review-when-convenient",
        resolutionSummary: "Nothing is blocked, but a lightweight review is still worth doing when convenient."
      }
    );
  }

  if (status === "executed" && mode === "run-evolution-cycle") {
    return buildRecommendation(
      "low-risk-follow-up-available",
      "The latest silent follow-up analyzed recent captured habits and refreshed low-risk evolution state. You can review the refreshed result when convenient.",
      [
        `Run \`${checkCommand}\` to inspect the refreshed habit-capture state in one view.`
      ],
      {
        primaryActionSummary: "Inspect the refreshed habit-capture output when convenient.",
        resolutionLevel: "review-when-convenient",
        resolutionSummary: "Nothing is blocked, but the refreshed habit output is still worth checking when convenient."
      }
    );
  }

  if (status === "skipped" && mode === "apply-evolution-actions" && skippedActionCount > 0) {
    return buildRecommendation(
      "info-only",
      "The latest silent follow-up found low-risk actions, but they were already up to date, so no extra review is required.",
      [],
      {
        resolutionLevel: "can-ignore",
        resolutionSummary: "The latest low-risk follow-up was already up to date, so you can ignore this result."
      }
    );
  }

  if (status === "skipped" && mode === "gate-skip") {
    if (reason === "env-disabled") {
      return buildRecommendation(
        "info-only",
        "Silent follow-up was intentionally skipped because the explicit opt-out environment variable is enabled.",
        [
          `Unset \`${optOutEnvVar}\` if you want future sync or postinstall runs to resume silent habit follow-up.`
        ],
        {
          resolutionLevel: "can-ignore",
          resolutionSummary: "This result was intentionally skipped, so it can be ignored unless you want to re-enable silent follow-up."
        }
      );
    }

    if (reason === "policy-disabled" || reason === "auto-analyze-disabled") {
      return buildRecommendation(
        "info-only",
        "Silent follow-up did not run because the current low-risk evolution policy keeps this path disabled.",
        [],
        {
          resolutionLevel: "can-ignore",
          resolutionSummary: "This path is currently disabled by policy, so there is nothing to handle right now."
        }
      );
    }

    if (reason === "no-conversations") {
      return buildRecommendation(
        "info-only",
        "Silent follow-up did not run because there are no captured habit records yet, so there is nothing to analyze.",
        [],
        {
          resolutionLevel: "can-ignore",
          resolutionSummary: "There are no captured habit records yet, so this result can be ignored."
        }
      );
    }

    if (reason === "below-threshold") {
      return buildRecommendation(
        "info-only",
        `Silent follow-up is still collecting enough repeated habits before it can analyze them automatically (${Number(payload.newConversationCount || 0)}/${Number(payload.minNewConversations || 0)} new records).`,
        [],
        {
          resolutionLevel: "can-ignore",
          resolutionSummary: "The silent follow-up is still collecting enough signal, so you can ignore this intermediate result."
        }
      );
    }
  }

  return buildRecommendation(
    "info-only",
    `The latest silent follow-up finished with status ${status} and mode ${mode}. No extra review is required unless you expected a different result.`,
    [],
    {
      resolutionLevel: "can-ignore",
      resolutionSummary: "No further action is expected for this result unless you were checking for something specific."
    }
  );
}
