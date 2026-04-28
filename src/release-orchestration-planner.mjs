import path from "node:path";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function buildBlocker(code, message, stageId) {
  return {
    code,
    message,
    stageId
  };
}

function buildNextAction({ status, publishPlan, latestPublishExecution, releaseManifestDir }) {
  const latestNextAction = latestPublishExecution?.nextAction || null;

  if (status === "blocked") {
    if (latestPublishExecution?.status === "publish-failed") {
      return {
        kind: "review-publish-failure",
        command: "",
        reason: "The controlled publish step already attempted real publication and failed; review the latest publish record and failure summary before retrying.",
        recordPath: latestPublishExecution.recordPath || path.join(releaseManifestDir, "release-publish-record.json")
      };
    }

    if ((publishPlan.blockers || []).some((item) => item.code.endsWith("-missing"))) {
      return {
        kind: "refresh-release-artifacts",
        command: "pnpm refresh:release-artifacts",
        reason: "Release orchestration is blocked by missing release artifacts; refresh artifacts and regenerate release evidence first.",
        recordPath: ""
      };
    }

    if (latestNextAction) {
      return {
        ...latestNextAction,
        recordPath: latestPublishExecution.recordPath || ""
      };
    }

    return {
      kind: "resolve-orchestration-blockers",
      command: "",
      reason: "Resolve the latest orchestration blockers before attempting controlled publish execution again.",
      recordPath: ""
    };
  }

  if (status === "ready-for-controlled-publish") {
    return {
      ...(latestNextAction || publishPlan.nextAction),
      recordPath: latestPublishExecution?.recordPath || ""
    };
  }

  return {
    kind: "post-publish-follow-up",
    command: "npx power-ai-skills generate-upgrade-summary --json",
    reason: "Controlled publish has completed; refresh release-facing summaries and review follow-up artifacts before broad rollout.",
    recordPath: latestPublishExecution?.recordPath || path.join(releaseManifestDir, "release-publish-record.json")
  };
}

function buildPrepareStage({ missingArtifactBlockers, publishPlan }) {
  return {
    id: "prepare-release-artifacts",
    kind: "prepare",
    title: "Refresh release artifacts and validation evidence",
    status: missingArtifactBlockers.length > 0 ? "blocked" : "completed",
    commands: [
      "pnpm refresh:release-artifacts",
      "pnpm release:validate",
      "pnpm release:check",
      "pnpm release:generate"
    ],
    blockers: missingArtifactBlockers,
    humanGate: false,
    summary: missingArtifactBlockers.length > 0
      ? "One or more required release artifacts are missing; refresh and regenerate release evidence first."
      : "Required release artifacts are present for orchestration planning.",
    evidence: publishPlan.evidence?.artifacts || {}
  };
}

function buildPlannerStage({ publishPlan }) {
  return {
    id: "plan-controlled-publish",
    kind: "plan",
    title: "Evaluate controlled publish eligibility",
    status: publishPlan.status === "eligible" ? "completed" : "blocked",
    commands: ["npx power-ai-skills plan-release-publish --json"],
    blockers: (publishPlan.blockers || []).map((item) => ({
      ...item,
      stageId: "plan-controlled-publish"
    })),
    humanGate: false,
    summary: publishPlan.status === "eligible"
      ? "The current release snapshot is eligible for controlled publish."
      : "The current release snapshot is blocked before controlled publish can proceed.",
    evidence: {
      publishReadiness: publishPlan.evidence?.publishReadiness || {},
      targetPublish: publishPlan.targetPublish
    }
  };
}

function buildPublishStage({ publishPlan, latestPublishExecution }) {
  const publishStatus = normalizeText(latestPublishExecution?.status);
  let status = "ready";
  let summary = "Controlled publish is ready to be triggered through the existing executor.";
  let blockers = [];

  if (publishPlan.status === "blocked") {
    status = "blocked";
    summary = "Controlled publish cannot start until planner blockers are resolved.";
  } else if (publishStatus === "published") {
    status = "completed";
    summary = "Controlled publish already completed successfully for the current release snapshot.";
  } else if (publishStatus === "publish-failed") {
    status = "blocked";
    blockers = [
      buildBlocker(
        "publish-command-failed",
        "The latest controlled publish attempt reached the real publish step but failed.",
        "execute-controlled-publish"
      )
    ];
    summary = "Review the failed controlled publish attempt before retrying the same version.";
  } else if (publishStatus === "confirmation-required" || publishStatus === "acknowledgement-required") {
    status = "ready";
    summary = "Controlled publish requires explicit maintainer confirmation before it can proceed.";
  }

  return {
    id: "execute-controlled-publish",
    kind: "publish",
    title: "Run controlled publish execution",
    status,
    commands: [
      "npx power-ai-skills execute-release-publish --confirm --json",
      "npx power-ai-skills execute-release-publish --confirm --acknowledge-warnings --json"
    ],
    blockers,
    humanGate: true,
    summary,
    evidence: {
      latestPublishExecutionStatus: publishStatus || "not-started",
      latestPublishExecution: latestPublishExecution || null,
      publishReadiness: publishPlan.evidence?.publishReadiness || {}
    }
  };
}

function buildPostPublishStage({ latestPublishExecution }) {
  const publishStatus = normalizeText(latestPublishExecution?.status);
  const completed = publishStatus === "published";
  return {
    id: "post-publish-follow-up",
    kind: "post-publish",
    title: "Review post-publish summaries and rollout follow-up",
    status: completed ? "ready" : "pending",
    commands: [
      "npx power-ai-skills generate-upgrade-summary --json",
      "npx power-ai-skills generate-governance-summary --json"
    ],
    blockers: [],
    humanGate: false,
    summary: completed
      ? "Controlled publish has finished; refresh summaries and complete rollout follow-up review."
      : "Post-publish follow-up stays pending until controlled publish succeeds.",
    evidence: {
      latestPublishExecutionStatus: publishStatus || "not-started"
    }
  };
}

export function createReleaseOrchestrationPlannerService({
  context,
  projectRoot,
  releasePublishPlannerService
}) {
  const packageRoot = context.packageRoot;
  const releaseManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(packageRoot, "manifest"));
  const missingArtifactCodes = new Set([
    "automation-report-missing",
    "version-record-missing",
    "release-gate-report-missing",
    "governance-operations-report-missing",
    "upgrade-advice-package-missing",
    "notification-payload-missing"
  ]);

  function planReleaseOrchestration() {
    if (path.resolve(projectRoot) !== path.resolve(packageRoot)) {
      throw new Error("plan-release-orchestration is only available in package-maintenance mode from the package root.");
    }

    const publishPlan = releasePublishPlannerService.planReleasePublish();
    const latestPublishExecution = publishPlan.evidence?.publishExecutionSummary || null;
    const missingArtifactBlockers = (publishPlan.blockers || [])
      .filter((item) => missingArtifactCodes.has(item.code))
      .map((item) => ({
        ...item,
        stageId: "prepare-release-artifacts"
      }));

    const stages = [
      buildPrepareStage({ missingArtifactBlockers, publishPlan }),
      buildPlannerStage({ publishPlan }),
      buildPublishStage({ publishPlan, latestPublishExecution }),
      buildPostPublishStage({ latestPublishExecution })
    ];

    const publishStatus = normalizeText(latestPublishExecution?.status);
    const status = publishStatus === "published"
      ? "published-awaiting-follow-up"
      : (publishPlan.status === "blocked" || publishStatus === "publish-failed")
        ? "blocked"
        : "ready-for-controlled-publish";

    const blockers = [
      ...missingArtifactBlockers,
      ...(publishStatus === "publish-failed"
        ? [buildBlocker(
          "publish-command-failed",
          "The latest controlled publish attempt failed; review publish stderr/stdout summary before retrying.",
          "execute-controlled-publish"
        )]
        : []),
      ...(publishPlan.status === "blocked"
        ? (publishPlan.blockers || []).map((item) => ({
          ...item,
          stageId: missingArtifactCodes.has(item.code) ? "prepare-release-artifacts" : "plan-controlled-publish"
        }))
        : [])
    ];

    return {
      packageRoot,
      manifestRoot: releaseManifestDir,
      status,
      blockers,
      stages,
      humanGates: stages
        .filter((item) => item.humanGate)
        .map((item) => ({
          stageId: item.id,
          title: item.title,
          summary: item.summary
        })),
      nextAction: buildNextAction({
        status,
        publishPlan,
        latestPublishExecution,
        releaseManifestDir
      }),
      evidence: {
        releasePublishPlanStatus: publishPlan.status,
        latestPublishExecutionStatus: publishStatus || "not-started",
        publishReadiness: publishPlan.evidence?.publishReadiness || {},
        targetPublish: publishPlan.targetPublish,
        latestPublishExecution: latestPublishExecution || null,
        artifacts: publishPlan.evidence?.artifacts || {}
      },
      orchestrationContract: {
        executionMode: "dry-run-plan-only",
        stageModelVersion: 1,
        publishRecordPath: latestPublishExecution?.recordPath || path.join(releaseManifestDir, "release-publish-record.json"),
        versionRecordPath: path.join(releaseManifestDir, "version-record.json"),
        notes: [
          "This orchestration planner is dry-run only; it does not execute release steps by itself.",
          "Controlled publish remains anchored on execute-release-publish so the existing publish record contract stays authoritative."
        ]
      }
    };
  }

  return {
    planReleaseOrchestration
  };
}
