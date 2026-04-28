import { spawnSync } from "node:child_process";
import { persistReleaseOrchestrationArtifacts } from "./release-orchestration-record.mjs";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function truncateOutput(value = "", maxLength = 4000) {
  const text = normalizeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n...[truncated ${text.length - maxLength} chars]`;
}

function getPnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function buildBlocker(code, message, stageId) {
  return {
    code,
    message,
    stageId
  };
}

function buildNextActionFromPlan(planResult) {
  return planResult?.nextAction || {
    kind: "review-orchestration-state",
    command: "",
    reason: "Review the latest release orchestration state before continuing."
  };
}

function buildCommandFailureNextAction(step) {
  return {
    kind: "review-orchestration-command-failure",
    command: "",
    reason: `Review the failed orchestration step \`${step.displayCommand}\`, resolve the issue, then re-run \`execute-release-orchestration\`.`
  };
}

const PREPARE_STEP_SPECS = [
  {
    id: "refresh-release-artifacts",
    stageId: "prepare-release-artifacts",
    command: () => getPnpmCommand(),
    args: ["refresh:release-artifacts"],
    displayCommand: "pnpm refresh:release-artifacts"
  },
  {
    id: "release-validate",
    stageId: "prepare-release-artifacts",
    command: () => getPnpmCommand(),
    args: ["release:validate"],
    displayCommand: "pnpm release:validate"
  },
  {
    id: "release-check",
    stageId: "prepare-release-artifacts",
    command: () => getPnpmCommand(),
    args: ["release:check"],
    displayCommand: "pnpm release:check"
  },
  {
    id: "release-generate",
    stageId: "prepare-release-artifacts",
    command: () => getPnpmCommand(),
    args: ["release:generate"],
    displayCommand: "pnpm release:generate"
  }
];

function runOrchestrationStep({ packageRoot, releaseManifestDir, step }) {
  const command = typeof step.command === "function" ? step.command() : step.command;
  const result = spawnSync(command, step.args || [], {
    cwd: packageRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      POWER_AI_RELEASE_MANIFEST_DIR: releaseManifestDir
    }
  });

  return {
    id: step.id,
    stageId: step.stageId,
    displayCommand: step.displayCommand,
    command,
    args: step.args || [],
    exitCode: typeof result.status === "number" ? result.status : (result.error ? 1 : 0),
    signal: normalizeText(result.signal),
    stdout: truncateOutput(result.stdout || ""),
    stderr: truncateOutput(result.stderr || ""),
    errorMessage: truncateOutput(result.error?.message || ""),
    ok: result.status === 0 && !result.error
  };
}

export function createReleaseOrchestrationExecutorService({
  context,
  projectRoot,
  releaseOrchestrationPlannerService,
  stepRunner = runOrchestrationStep
}) {
  const packageRoot = context.packageRoot;
  const releaseManifestDir = releaseOrchestrationPlannerService.getReleaseManifestDir();

  function executeReleaseOrchestration() {
    const initialPlan = releaseOrchestrationPlannerService.planReleaseOrchestration();
    const commandResults = [];
    let finalPlan = initialPlan;
    let status = initialPlan.status;
    let blockers = initialPlan.blockers || [];
    let nextAction = buildNextActionFromPlan(initialPlan);
    let notes = [];
    let executionSummary = {
      stoppedStageId: "",
      stoppedReason: ""
    };

    if (status === "published-awaiting-follow-up") {
      notes = [
        "The latest orchestration snapshot already shows publish completed and waiting on follow-up review.",
        "No pre-publish orchestration steps were re-run."
      ];
      executionSummary = {
        stoppedStageId: "post-publish-follow-up",
        stoppedReason: "latest-orchestration-already-published"
      };
    } else if (nextAction?.kind === "review-publish-failure") {
      notes = [
        "The latest orchestration snapshot is blocked by a failed real publish attempt.",
        "Pre-publish orchestration steps were not re-run because the latest publish failure must be reviewed first."
      ];
      executionSummary = {
        stoppedStageId: "execute-controlled-publish",
        stoppedReason: "review-latest-publish-failure"
      };
    } else {
      for (const step of PREPARE_STEP_SPECS) {
        const commandResult = stepRunner({
          packageRoot,
          releaseManifestDir,
          step
        });
        commandResults.push(commandResult);

        if (!commandResult.ok) {
          status = "prepare-failed";
          blockers = [
            buildBlocker(
              "orchestration-command-failed",
              `Release orchestration step \`${step.displayCommand}\` failed with exit code ${commandResult.exitCode ?? "unknown"}.`,
              step.stageId
            )
          ];
          nextAction = buildCommandFailureNextAction(step);
          notes = [
            "Pre-publish orchestration stopped because one of the prepare-stage commands failed.",
            `Review the captured stdout/stderr for \`${step.displayCommand}\` before retrying.`
          ];
          executionSummary = {
            stoppedStageId: step.stageId,
            stoppedReason: `command-failed:${step.id}`
          };
          break;
        }
      }

      if (status !== "prepare-failed") {
        finalPlan = releaseOrchestrationPlannerService.planReleaseOrchestration();
        status = finalPlan.status;
        blockers = finalPlan.blockers || [];
        nextAction = buildNextActionFromPlan(finalPlan);
        notes = status === "ready-for-controlled-publish"
          ? [
            "Pre-publish orchestration steps completed successfully.",
            "Execution stopped at the controlled publish human gate; continue with execute-release-publish when manual confirmation is ready."
          ]
          : status === "published-awaiting-follow-up"
            ? [
              "Pre-publish orchestration steps completed and the latest orchestration snapshot already shows publish completed.",
              "Continue with post-publish follow-up review instead of running another controlled publish."
            ]
            : [
              "Pre-publish orchestration steps completed, but the refreshed orchestration planner still reports blockers.",
              "Review the latest orchestration blockers before continuing."
            ];
        executionSummary = {
          stoppedStageId: status === "ready-for-controlled-publish"
            ? "execute-controlled-publish"
            : status === "published-awaiting-follow-up"
              ? "post-publish-follow-up"
              : "plan-controlled-publish",
          stoppedReason: status === "ready-for-controlled-publish"
            ? "awaiting-controlled-publish-human-gate"
            : status === "published-awaiting-follow-up"
              ? "post-publish-follow-up-pending"
              : "planner-still-blocked-after-prepare"
        };
      }
    }

    const result = {
      ...finalPlan,
      status,
      blockers,
      nextAction,
      notes,
      commandResults,
      executionSummary,
      executionMode: "prepare-through-human-gate"
    };
    const persisted = persistReleaseOrchestrationArtifacts({
      releaseManifestDir,
      packageRoot,
      projectRoot,
      result
    });

    return {
      ...result,
      orchestrationExecutionId: persisted.executionId,
      orchestrationRecordedAt: persisted.recordedAt,
      orchestrationManifestArtifacts: persisted.manifestArtifacts,
      releaseOrchestrationSummary: persisted.snapshot,
      orchestrationContract: {
        ...(result.orchestrationContract || {}),
        executionMode: "prepare-through-human-gate",
        orchestrationRecordPath: persisted.manifestArtifacts.recordPath,
        orchestrationRecordPathRelative: persisted.manifestArtifacts.recordPathRelative,
        orchestrationHistoryPath: persisted.manifestArtifacts.historicalRecordPath,
        orchestrationHistoryPathRelative: persisted.manifestArtifacts.historicalRecordPathRelative
      }
    };
  }

  return {
    executeReleaseOrchestration
  };
}
