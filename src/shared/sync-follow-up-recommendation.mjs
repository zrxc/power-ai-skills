function sumFailedHistoryEntries(history) {
  if (!history?.available) return 0;
  const items = Array.isArray(history.summary?.statusBreakdown)
    ? history.summary.statusBreakdown
    : [];
  return items
    .filter((item) => item?.status === "failed")
    .reduce((total, item) => total + Number(item.count || 0), 0);
}

function buildRecommendation(level, summary, nextActions = [], { requiresAttention = false } = {}) {
  return {
    level,
    requiresAttention,
    summary,
    nextActions: (nextActions || []).filter((item) => typeof item === "string" && item.trim())
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
      "No silent sync follow-up result has been recorded yet, so there is nothing to review right now."
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
      { requiresAttention: true }
    );
  }

  if (status === "executed" && mode === "apply-evolution-actions" && executedActionCount > 0) {
    return buildRecommendation(
      "low-risk-follow-up-available",
      "The latest silent follow-up refreshed low-risk project-local or governance artifacts. A lightweight review is available, but nothing urgent is blocked.",
      [
        `Run \`${checkCommand}\` to inspect the refreshed consumer-side status in one view.`,
        "Run `npx power-ai-skills list-project-local-skills` if you want to inspect the refreshed project-local drafts."
      ]
    );
  }

  if (status === "executed" && mode === "run-evolution-cycle") {
    return buildRecommendation(
      "low-risk-follow-up-available",
      "The latest silent follow-up analyzed recent captured habits and refreshed low-risk evolution state. You can review the refreshed result when convenient.",
      [
        `Run \`${checkCommand}\` to inspect the refreshed habit-capture state in one view.`
      ]
    );
  }

  if (status === "skipped" && mode === "apply-evolution-actions" && skippedActionCount > 0) {
    return buildRecommendation(
      "info-only",
      "The latest silent follow-up found low-risk actions, but they were already up to date, so no extra review is required."
    );
  }

  if (status === "skipped" && mode === "gate-skip") {
    if (reason === "env-disabled") {
      return buildRecommendation(
        "info-only",
        "Silent follow-up was intentionally skipped because the explicit opt-out environment variable is enabled.",
        [
          `Unset \`${optOutEnvVar}\` if you want future sync or postinstall runs to resume silent habit follow-up.`
        ]
      );
    }

    if (reason === "policy-disabled" || reason === "auto-analyze-disabled") {
      return buildRecommendation(
        "info-only",
        "Silent follow-up did not run because the current low-risk evolution policy keeps this path disabled."
      );
    }

    if (reason === "no-conversations") {
      return buildRecommendation(
        "info-only",
        "Silent follow-up did not run because there are no captured habit records yet, so there is nothing to analyze."
      );
    }

    if (reason === "below-threshold") {
      return buildRecommendation(
        "info-only",
        `Silent follow-up is still collecting enough repeated habits before it can analyze them automatically (${Number(payload.newConversationCount || 0)}/${Number(payload.minNewConversations || 0)} new records).`
      );
    }
  }

  return buildRecommendation(
    "info-only",
    `The latest silent follow-up finished with status ${status} and mode ${mode}. No extra review is required unless you expected a different result.`
  );
}
