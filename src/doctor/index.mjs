import fs from "node:fs";
import path from "node:path";
import { ensureDir, findSkillDirectories, readJson, writeJson } from "../shared/fs.mjs";
import { requiredConversationArtifacts, requiredKnowledgeArtifacts } from "./artifacts.mjs";
import { collectReleaseArtifactChecks, shouldCollectReleaseChecks } from "./release-checks.mjs";
import { buildCheckGroups, buildDoctorMarkdown, buildRemediationTips } from "./reporting.mjs";
import { summarizeAppliedEvolutionArtifacts } from "../evolution/proposals.mjs";

export function createDoctorService({ context, projectRoot, selectionService, workspaceService, teamPolicyService, governanceContextService, conversationMinerService }) {
  const releaseManifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(context.packageRoot, "manifest"));

  function resolveDoctorArtifactPaths({ packageMaintenance = false } = {}) {
    if (packageMaintenance) {
      return {
        reportPath: path.join(releaseManifestDir, "doctor-report.md"),
        jsonPath: path.join(releaseManifestDir, "doctor-report.json")
      };
    }

    const reportsRoot = workspaceService.getReportsRoot();
    return {
      reportPath: path.join(reportsRoot, "doctor-report.md"),
      jsonPath: path.join(reportsRoot, "doctor-report.json")
    };
  }

  function writeDoctorArtifacts(report, { packageMaintenance = false } = {}) {
    const { reportPath, jsonPath } = resolveDoctorArtifactPaths({ packageMaintenance });
    ensureDir(path.dirname(reportPath));
    writeJson(jsonPath, report);
    fs.writeFileSync(reportPath, buildDoctorMarkdown(report), "utf8");
    return {
      ...report,
      reportPath,
      jsonPath
    };
  }

  function createCheck(code, name, ok, detail, group, remediation, severity = "error") {
    return {
      code,
      name,
      ok,
      detail,
      group,
      remediation,
      severity
    };
  }
  function findLegacyPackageReferences() {
    return [
      path.join(projectRoot, "package.json"),
      path.join(projectRoot, "AGENTS.md"),
      path.join(projectRoot, "CLAUDE.md"),
      path.join(projectRoot, "GEMINI.md"),
      path.join(projectRoot, ".cursor", "rules", "skills.mdc"),
      path.join(projectRoot, ".clinerules", "01-power-ai.md"),
      path.join(projectRoot, ".windsurf", "rules", "01-power-ai.md")
    ]
      .filter((filePath) => workspaceService.readTextIfExists(filePath).includes(context.legacyPackageName))
      .map((filePath) => path.relative(projectRoot, filePath));
  }
  function collectKnowledgeArtifactChecks(skillsTarget) {
    return requiredKnowledgeArtifacts.map((artifact) => {
      const targetPath = path.join(skillsTarget, ...artifact.relativePath.split("/"));
      return createCheck(
        artifact.code,
        artifact.name,
        fs.existsSync(targetPath),
        {
          relativePath: path.join(context.powerAiDirName, "skills", ...artifact.relativePath.split(path.posix.sep))
        },
        "knowledge",
        artifact.remediation
      );
    });
  }

  function collectConversationArtifactChecks(powerAiRoot) {
    return requiredConversationArtifacts.map((artifact) => {
      const targetPath = path.join(powerAiRoot, ...artifact.relativePath.split("/"));
      return createCheck(
        artifact.code,
        artifact.name,
        artifact.directory ? fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() : fs.existsSync(targetPath),
        {
          relativePath: path.join(context.powerAiDirName, ...artifact.relativePath.split(path.posix.sep))
        },
        "conversation",
        artifact.remediation
      );
    });
  }

  function collectWrapperPromotionWarnings(powerAiRoot) {
    const proposalsRoot = path.join(powerAiRoot, "proposals", "wrapper-promotions");
    if (!fs.existsSync(proposalsRoot)) return [];

    return fs.readdirSync(proposalsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const proposalPath = path.join(proposalsRoot, entry.name, "wrapper-promotion.json");
        if (!fs.existsSync(proposalPath)) return null;
        const proposal = readJson(proposalPath);
        if ((proposal.applicationStatus || "not-applied") !== "applied") return null;
        if ((proposal.registrationStatus || "not-registered") === "registered") return null;
        if ((proposal.followUpStatus || "not-started") === "finalized") {
          return `Wrapper promotion \`${proposal.toolName}\` is finalized and ready for registration. Run \`npx power-ai-skills register-wrapper-promotion --tool ${proposal.toolName}\` when you want to mark it as officially registered.`;
        }
        const pendingFollowUps = Array.isArray(proposal.pendingFollowUps) ? proposal.pendingFollowUps : [];
        if (pendingFollowUps.length === 0) return null;
        return `Wrapper promotion \`${proposal.toolName}\` is applied with status \`${proposal.followUpStatus || "unknown"}\` but still has follow-ups: ${pendingFollowUps.join("; ")}.`;
      })
      .filter(Boolean);
  }

  function collectEvolutionAppliedProposalWarnings(powerAiRoot) {
    const proposalsPath = path.join(powerAiRoot, "governance", "evolution-proposals.json");
    if (!fs.existsSync(proposalsPath)) return [];
    const ledger = readJson(proposalsPath);
    const proposals = Array.isArray(ledger?.proposals) ? ledger.proposals : [];
    const appliedDraftsWithFollowUps = summarizeAppliedEvolutionArtifacts(proposals).followUpDrafts;

    return appliedDraftsWithFollowUps.map((item) => {
      const handoffParts = [];
      if (item.ownerHint) handoffParts.push(`owner \`${item.ownerHint}\``);
      if (item.checklistPath) handoffParts.push(`checklist \`${item.checklistPath}\``);
      if (item.nextAction) handoffParts.push(`next action \`${item.nextAction}\``);
      const handoffText = handoffParts.length > 0 ? ` handoff: ${handoffParts.join(", ")}.` : "";
      return `Evolution proposal \`${item.proposalId}\` is already applied as \`${item.artifactType || "draft-artifact"}\` but still has follow-up actions: ${item.nextActions.join("; ")}.${handoffText}`;
    });
  }

  function collectConversationDecisionChecks(powerAiRoot) {
    const decisionsPath = path.join(powerAiRoot, "governance", "conversation-decisions.json");
    if (!fs.existsSync(decisionsPath)) return [];
    const ledger = readJson(decisionsPath);
    const decisions = Array.isArray(ledger?.decisions) ? ledger.decisions : [];
    const reviewItems = decisions.filter((item) => item.decision === "review");
    return [
      createCheck(
        "PAI-CONVERSATION-029",
        "conversation review backlog is empty",
        reviewItems.length === 0,
        {
          decisionsPath: path.join(context.powerAiDirName, "governance", "conversation-decisions.json"),
          pendingReviewCount: reviewItems.length,
          pendingPatternIds: reviewItems.map((item) => item.patternId)
        },
        "conversation",
        "Run `npx power-ai-skills review-conversation-pattern --pattern <id> --accept --target <type>` or `--reject --reason \"...\"` to clear pending conversation review items.",
        "warning"
      )
    ];
  }

  function collectAutoCaptureRuntimeChecks() {
    if (!conversationMinerService?.collectAutoCaptureRuntimeStatus) return [];
    const runtime = conversationMinerService.collectAutoCaptureRuntimeStatus({});
    return [
      createCheck(
        "PAI-CONVERSATION-030",
        "auto-capture queues are within healthy backlog range",
        runtime.status !== "warning" && runtime.status !== "attention",
        {
          status: runtime.status,
          activityState: runtime.summary.activityState,
          autoCaptureEnabled: runtime.summary.autoCaptureEnabled,
          captureBacklogCount: runtime.summary.captureBacklogCount,
          responseBacklogCount: runtime.summary.responseBacklogCount,
          staleQueuedCaptureCount: runtime.summary.staleQueuedCaptureCount,
          staleQueuedResponseCount: runtime.summary.staleQueuedResponseCount
        },
        "conversation",
        "Run `npx power-ai-skills check-auto-capture-runtime --json` to inspect queue health, then start `npx power-ai-skills watch-auto-capture-inbox` or drain stale backlog manually.",
        "warning"
      ),
      createCheck(
        "PAI-CONVERSATION-031",
        "auto-capture failed queues are empty",
        runtime.summary.failedRequestCount === 0,
        {
          status: runtime.status,
          failedRequestCount: runtime.summary.failedRequestCount
        },
        "conversation",
        "Inspect `.power-ai/auto-capture/failed` and `.power-ai/auto-capture/response-failed`, then replay or clear failed payloads after fixing the bridge/runtime issue.",
        "warning"
      )
    ];
  }

  function collectCaptureSafetyPolicyChecks() {
    if (!conversationMinerService?.collectCaptureSafetyPolicyStatus) return [];
    const safetyPolicy = conversationMinerService.collectCaptureSafetyPolicyStatus();
    return [
      createCheck(
        "PAI-CONVERSATION-032",
        "capture safety policy exists",
        safetyPolicy.exists,
        {
          policyPath: path.join(context.powerAiDirName, "capture-safety-policy.json")
        },
        "conversation",
        "Run `npx power-ai-skills sync` to scaffold `.power-ai/capture-safety-policy.json` before enabling full automatic capture.",
        "warning"
      ),
      createCheck(
        "PAI-CONVERSATION-033",
        "capture safety policy is valid",
        safetyPolicy.ok,
        {
          policyPath: path.join(context.powerAiDirName, "capture-safety-policy.json"),
          warningCount: safetyPolicy.warningCount,
          blockedSceneTypeCount: safetyPolicy.blockedSceneTypeCount,
          blockedKeywordCount: safetyPolicy.blockedKeywordCount,
          blockedFilePatternCount: safetyPolicy.blockedFilePatternCount,
          reviewFilePatternCount: safetyPolicy.reviewFilePatternCount,
          enabled: safetyPolicy.enabled
        },
        "conversation",
        "Run `npx power-ai-skills validate-capture-safety-policy --json` and fix invalid or risky capture safety settings before relying on automatic intake.",
        "warning"
      )
    ];
  }

  function collectCaptureRetentionChecks() {
    if (!conversationMinerService?.collectCaptureRetentionStatus) return [];
    const retention = conversationMinerService.collectCaptureRetentionStatus();
    return [
      createCheck(
        "PAI-CONVERSATION-034",
        "capture retention backlog is within policy",
        (retention.summary.archiveCandidateCount || 0) === 0 && (retention.summary.pruneCandidateCount || 0) === 0,
        {
          policyPath: path.join(context.powerAiDirName, "capture-safety-policy.json"),
          reportPath: path.join(context.powerAiDirName, "reports", "capture-retention.json"),
          autoArchiveDays: retention.summary.autoArchiveDays,
          autoPruneDays: retention.summary.autoPruneDays,
          archiveCandidateCount: retention.summary.archiveCandidateCount,
          pruneCandidateCount: retention.summary.pruneCandidateCount
        },
        "conversation",
        "Run `npx power-ai-skills check-capture-retention --json` and `npx power-ai-skills apply-capture-retention --json` to archive or prune old conversation files that already exceeded the retention window.",
        "warning"
      )
    ];
  }

  function collectConversationCaptureAdmissionChecks(governanceContext) {
    const warningLevelConversationRecords = governanceContext?.warningLevelConversationRecords || 0;
    const reviewLevelConversationRecords = governanceContext?.reviewLevelConversationRecords || 0;
    return [
      createCheck(
        "PAI-CONVERSATION-035",
        "warning-level conversation captures are acknowledged",
        warningLevelConversationRecords === 0,
        {
          contextPath: path.join(context.powerAiDirName, "context", "project-governance-context.json"),
          totalConversationRecords: governanceContext?.conversationCaptureAdmissions?.totalConversationRecords || 0,
          recordsWithAdmissionMetadata: governanceContext?.recordsWithAdmissionMetadata || 0,
          recordsWithGovernanceMetadata: governanceContext?.recordsWithGovernanceMetadata || 0,
          warningLevelConversationRecords,
          reviewLevelConversationRecords,
          captureLevelConversationRecords: governanceContext?.captureLevelConversationRecords || 0
        },
        "conversation",
        "Acknowledge records marked with `captureSafetyGovernanceLevel=warning` before treating low-signal captures as strong self-evolution evidence.",
        "warning"
      ),
      createCheck(
        "PAI-CONVERSATION-036",
        "review-level conversation captures are triaged",
        reviewLevelConversationRecords === 0,
        {
          contextPath: path.join(context.powerAiDirName, "context", "project-governance-context.json"),
          totalConversationRecords: governanceContext?.conversationCaptureAdmissions?.totalConversationRecords || 0,
          recordsWithAdmissionMetadata: governanceContext?.recordsWithAdmissionMetadata || 0,
          recordsWithGovernanceMetadata: governanceContext?.recordsWithGovernanceMetadata || 0,
          warningLevelConversationRecords,
          reviewLevelConversationRecords,
          captureLevelConversationRecords: governanceContext?.captureLevelConversationRecords || 0,
          blockingLevelConversationRecords: governanceContext?.blockingLevelConversationRecords || 0
        },
        "conversation",
        "Review records marked with `captureAdmissionLevel=review`, then decide whether they should stay as captured context, become project-local skills, or be archived before self-evolution promotion.",
        "warning"
      )
    ];
  }

  function collectEvolutionProposalChecks(powerAiRoot) {
    const proposalsPath = path.join(powerAiRoot, "governance", "evolution-proposals.json");
    if (!fs.existsSync(proposalsPath)) return [];
    const ledger = readJson(proposalsPath);
    const proposals = Array.isArray(ledger?.proposals) ? ledger.proposals : [];
    const reviewItems = proposals.filter((item) => item.status === "review");
    const acceptedItems = proposals.filter((item) => item.status === "accepted");
    const staleReviewItems = reviewItems.filter((item) => {
      const ageFrom = item.statusUpdatedAt || item.generatedAt || "";
      const ageDays = Math.max(0, Math.floor((Date.now() - Date.parse(ageFrom || "")) / 86400000));
      return Number.isFinite(ageDays) && ageDays >= 7;
    });
    const staleAcceptedItems = acceptedItems.filter((item) => {
      const ageFrom = item.statusUpdatedAt || item.generatedAt || "";
      const ageDays = Math.max(0, Math.floor((Date.now() - Date.parse(ageFrom || "")) / 86400000));
      return Number.isFinite(ageDays) && ageDays >= 3;
    });
    const appliedDraftsWithFollowUps = summarizeAppliedEvolutionArtifacts(proposals).followUpDrafts;
    return [
      createCheck(
        "PAI-POLICY-009",
        "evolution proposal review backlog is empty",
        reviewItems.length === 0,
        {
          proposalsPath: path.join(context.powerAiDirName, "governance", "evolution-proposals.json"),
          pendingReviewCount: reviewItems.length,
          pendingProposalIds: reviewItems.map((item) => item.proposalId)
        },
        "policy",
        "Run `npx power-ai-skills list-evolution-proposals --json` and `npx power-ai-skills review-evolution-proposal --proposal <id> --accept|--reject|--archive` to clear proposal review backlog.",
        "warning"
      ),
      createCheck(
        "PAI-POLICY-010",
        "accepted evolution proposals are applied",
        acceptedItems.length === 0,
        {
          proposalsPath: path.join(context.powerAiDirName, "governance", "evolution-proposals.json"),
          acceptedProposalCount: acceptedItems.length,
          acceptedProposalIds: acceptedItems.map((item) => item.proposalId)
        },
        "policy",
        "Run `npx power-ai-skills apply-evolution-proposal --proposal <id>` for accepted proposals that are ready to land, or move them back to review/archive if they should not proceed.",
        "warning"
      ),
      createCheck(
        "PAI-POLICY-011",
        "evolution proposal backlog is within governance SLA",
        staleReviewItems.length === 0 && staleAcceptedItems.length === 0,
        {
          proposalsPath: path.join(context.powerAiDirName, "governance", "evolution-proposals.json"),
          staleReviewCount: staleReviewItems.length,
          staleReviewProposalIds: staleReviewItems.map((item) => item.proposalId),
          staleAcceptedCount: staleAcceptedItems.length,
          staleAcceptedProposalIds: staleAcceptedItems.map((item) => item.proposalId)
        },
        "policy",
        "Prioritize overdue proposal reviews and accepted-but-not-applied proposal items before the evolution governance backlog grows stale.",
        "warning"
      ),
      createCheck(
        "PAI-POLICY-013",
        "applied evolution proposal drafts have no pending follow-ups",
        appliedDraftsWithFollowUps.length === 0,
        {
          proposalsPath: path.join(context.powerAiDirName, "governance", "evolution-proposals.json"),
          appliedDraftFollowUpCount: appliedDraftsWithFollowUps.length,
          proposalIds: appliedDraftsWithFollowUps.map((item) => item.proposalId),
          artifactTypes: [...new Set(appliedDraftsWithFollowUps.map((item) => item.artifactType).filter(Boolean))],
          nextActionPreview: appliedDraftsWithFollowUps.flatMap((item) => item.nextActions).slice(0, 10),
          handoffPreview: appliedDraftsWithFollowUps.slice(0, 5).map((item) => ({
            proposalId: item.proposalId,
            artifactType: item.artifactType,
            ownerHint: item.ownerHint || "",
            handoffStatus: item.handoffStatus || "",
            checklistPath: item.checklistPath || "",
            nextAction: item.nextAction || ""
          }))
        },
        "policy",
        "Review applied evolution draft artifacts and continue the listed follow-up actions before treating shared-skill, wrapper, or release-impact outputs as fully governed.",
        "warning"
      )
    ];
  }
  function collectPackageMaintenanceReport() {
    const checks = collectReleaseArtifactChecks({ context, releaseManifestDir, createCheck });
    const checkGroups = buildCheckGroups(checks);
    const remediationTips = buildRemediationTips({
      checks,
      checkGroups,
      selection: { selectedTools: [] },
      entrypointStates: []
    });
    const failureCodes = checks.filter((check) => !check.ok && check.severity !== "warning").map((check) => check.code);
    const report = {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      mode: "package-maintenance",
      selectedPresets: [],
      selectedTools: [],
      expandedTools: [],
      selectionSource: "not-applicable",
      entrypointStates: [],
      ok: checks.every((check) => check.ok || check.severity === "warning"),
      checks,
      checkGroups,
      failureCodes,
      remediationTips,
      warnings: []
    };

    return writeDoctorArtifacts(report, { packageMaintenance: true });
  }

  function collectPolicyChecks({ skillsTarget, teamPolicyTarget, selection }) {
    if (!teamPolicyService) return [];

    const driftReport = teamPolicyService.buildTeamPolicyDriftReport();
    const selectedToolsCheck = driftReport.checks.find((check) => check.code === "PAI-POLICY-003");
    const requiredSkillsCheck = driftReport.checks.find((check) => check.code === "PAI-POLICY-004");
    const defaultCoverageCheck = driftReport.checks.find((check) => check.code === "PAI-POLICY-005");
    const rolloutStageCheck = driftReport.checks.find((check) => check.code === "PAI-POLICY-006");
    const projectProfileCheck = driftReport.checks.find((check) => check.code === "PAI-POLICY-007");
    const reviewDeadlineCheck = driftReport.checks.find((check) => check.code === "PAI-POLICY-008");
    const captureSafetyDriftCheck = driftReport.checks.find((check) => check.code === "PAI-POLICY-012");

    return [
      createCheck(
        "PAI-POLICY-001",
        ".power-ai/team-policy.json exists",
        fs.existsSync(teamPolicyTarget),
        {
          relativePath: path.join(context.powerAiDirName, "team-policy.json")
        },
        "policy",
        "Run `npx power-ai-skills sync` to copy `.power-ai/team-policy.json` into the consumer project."
      ),
      createCheck(
        "PAI-POLICY-002",
        ".power-ai/team-policy.json matches package policy baseline",
        fs.existsSync(teamPolicyTarget) && JSON.stringify(readJson(teamPolicyTarget)) === JSON.stringify(context.teamPolicy),
        {
          relativePath: path.join(context.powerAiDirName, "team-policy.json")
        },
        "policy",
        "Run `npx power-ai-skills sync` to refresh `.power-ai/team-policy.json` from the installed package."
      ),
      createCheck(
        "PAI-POLICY-003",
        "selected tools are allowed by team policy",
        Boolean(selectedToolsCheck?.ok),
        selectedToolsCheck?.detail,
        "policy",
        "Remove disallowed tools with `npx power-ai-skills remove-tool --tool <tool-name>`, or update `config/team-policy.json` if the policy should permit them."
      ),
      createCheck(
        "PAI-POLICY-004",
        "required team skills are present",
        Boolean(requiredSkillsCheck?.ok),
        {
          ...(requiredSkillsCheck?.detail || {}),
          relativePath: path.join(context.powerAiDirName, "skills"),
          skillsTarget
        },
        "policy",
        "Run `npx power-ai-skills sync` to restore required team skills into `.power-ai/skills`."
      ),
      createCheck(
        "PAI-POLICY-005",
        "selected tools still cover the team default tool baseline",
        Boolean(defaultCoverageCheck?.ok),
        defaultCoverageCheck?.detail,
        "policy",
        "If this project should stay on the team default baseline, re-run `npx power-ai-skills init --preset enterprise-standard` or add the missing tools explicitly.",
        "warning"
      ),
      createCheck(
        "PAI-POLICY-006",
        "selected wrappers are in general rollout stage",
        Boolean(rolloutStageCheck?.ok),
        rolloutStageCheck?.detail,
        "policy",
        "Review `config/team-policy.json` rollout stages before enabling pilot or compatible-only wrappers in broad project baselines.",
        rolloutStageCheck?.severity || "warning"
      ),
      createCheck(
        "PAI-POLICY-007",
        "selected project profile matches the current recommendation",
        Boolean(projectProfileCheck?.ok),
        projectProfileCheck?.detail,
        "policy",
        projectProfileCheck?.remediation
          || "Run `npx power-ai-skills show-defaults --format summary` to review the recommended project profile and re-initialize if needed.",
        projectProfileCheck?.severity || "warning"
      ),
      createCheck(
        "PAI-POLICY-008",
        "governance review deadlines are not overdue",
        Boolean(reviewDeadlineCheck?.ok),
        reviewDeadlineCheck?.detail,
        "policy",
        reviewDeadlineCheck?.remediation
          || "Run `npx power-ai-skills check-governance-review-deadlines --json` and refresh overdue project profile decisions.",
        reviewDeadlineCheck?.severity || "warning"
      ),
      createCheck(
        "PAI-POLICY-012",
        "project capture safety policy matches the team baseline",
        captureSafetyDriftCheck ? Boolean(captureSafetyDriftCheck.ok) : true,
        captureSafetyDriftCheck?.detail,
        "policy",
        captureSafetyDriftCheck?.remediation
          || "Run `npx power-ai-skills show-capture-safety-policy --json` to compare the effective policy with the team baseline, then update `.power-ai/capture-safety-policy.json` if the local snapshot is stale.",
        captureSafetyDriftCheck?.severity || "warning"
      )
    ];
  }

  function collectDoctorReport() {
    if (shouldCollectReleaseChecks({ context, projectRoot })) {
      return collectPackageMaintenanceReport();
    }

    const {
      powerAiRoot,
      skillsTarget,
      registryTarget,
      teamDefaultsTarget,
      teamPolicyTarget,
      templateRegistryTarget,
      selectedToolsTarget,
      projectGovernanceContextTarget
    } = workspaceService.getPowerAiPaths();
    const existingGovernanceContext = governanceContextService?.loadProjectGovernanceContext() || null;
    const governanceContext = governanceContextService?.refreshProjectGovernanceContext
      ? governanceContextService.refreshProjectGovernanceContext({
          trigger: "doctor",
          baselineStatus: existingGovernanceContext?.baselineStatus || ""
        })
      : existingGovernanceContext;
    
    const hasSelectedToolsConfig = Boolean(selectionService.loadSelectedToolsConfig());
    const selection = hasSelectedToolsConfig
      ? selectionService.resolveSelection({ allowLegacyInference: false })
      : selectionService.resolveSelection({ allowLegacyInference: true });
    
    const expectedGroups = fs.existsSync(context.skillsRoot)
      ? workspaceService.normalizeGroupNames(fs.readdirSync(context.skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name))
      : [];
    
    const actualGroups = fs.existsSync(skillsTarget)
      ? workspaceService.normalizeGroupNames(fs.readdirSync(skillsTarget, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name))
      : [];
    
    const expectedSkillCount = findSkillDirectories(context.skillsRoot).length;
    
    const manifest = fs.existsSync(context.manifestPath) ? readJson(context.manifestPath) : null;
    
    const legacyReferences = findLegacyPackageReferences();
    
    const selectedEntrypoints = workspaceService.getSelectedEntrypoints(selection.expandedTools);
    
    const residualEntrypoints = workspaceService.findResidualEntrypoints(selectedEntrypoints);
    
    const entrypointStates = selectedEntrypoints.map((entrypoint) => workspaceService.getEntrypointState(entrypoint));
    
    const checks = [
      createCheck("PAI-WORKSPACE-001", ".power-ai exists", fs.existsSync(path.join(projectRoot, context.powerAiDirName)), undefined, "workspace", "Run `npx power-ai-skills sync` to recreate the `.power-ai` workspace."),
      createCheck("PAI-WORKSPACE-002", ".power-ai/skills exists", fs.existsSync(skillsTarget), undefined, "workspace", "Run `npx power-ai-skills sync` to restore the `.power-ai/skills` directory."),
      createCheck("PAI-WORKSPACE-003", ".power-ai/skills groups match source", JSON.stringify(actualGroups) === JSON.stringify(expectedGroups), { expectedGroups, actualGroups }, "workspace", "Run `npx power-ai-skills sync` to refresh the copied skill groups from the package source."),
      createCheck("PAI-WORKSPACE-004", ".power-ai/tool-registry.json exists", fs.existsSync(registryTarget), undefined, "workspace", "Run `npx power-ai-skills sync` to restore `.power-ai/tool-registry.json`."),
      createCheck("PAI-WORKSPACE-005", ".power-ai/team-defaults.json exists", fs.existsSync(teamDefaultsTarget), undefined, "workspace", "Run `npx power-ai-skills sync` to restore `.power-ai/team-defaults.json`."),
      createCheck("PAI-WORKSPACE-006", ".power-ai/template-registry.json exists", fs.existsSync(templateRegistryTarget), undefined, "workspace", "Run `npx power-ai-skills sync` to restore `.power-ai/template-registry.json`."),
      createCheck("PAI-SELECTION-001", ".power-ai/selected-tools.json exists", fs.existsSync(selectedToolsTarget), undefined, "selection", "Run `npx power-ai-skills init --tool <tool-name>` again to recreate `.power-ai/selected-tools.json` with an explicit tool selection."),
      createCheck("PAI-WORKSPACE-007", ".power-ai/skills/project-local exists", fs.existsSync(workspaceService.getOverlayTarget(skillsTarget)), undefined, "workspace", "Run `npx power-ai-skills sync` to recreate the `.power-ai/skills/project-local` overlay directory."),
      createCheck("PAI-WORKSPACE-008", "manifest skill count matches", Boolean(manifest) && manifest.skills.length === expectedSkillCount, manifest ? { manifestSkillCount: manifest.skills.length, expectedSkillCount } : { manifestMissing: true, expectedSkillCount }, "workspace", "Reinstall or repack the current package version, then run `npx power-ai-skills sync` so the copied skills match the packaged manifest."),
      createCheck("PAI-WORKSPACE-009", ".power-ai/context/project-governance-context.json exists", fs.existsSync(projectGovernanceContextTarget), {
        relativePath: path.join(context.powerAiDirName, "context", "project-governance-context.json")
      }, "workspace", "Run `npx power-ai-skills sync` or `npx power-ai-skills show-project-governance-context --json` to refresh the project governance context snapshot.", "warning"),
      createCheck("PAI-SELECTION-002", "legacy package references cleared", legacyReferences.length === 0, legacyReferences.length ? { legacyReferences } : undefined, "selection", "Remove legacy package references from project entry files, then re-run `npx power-ai-skills init --tool <tool-name>` to persist the new selection."),
      ...collectPolicyChecks({ skillsTarget, teamPolicyTarget, selection }),
      createCheck("PAI-ENTRYPOINT-001", "unselected entrypoints cleared", residualEntrypoints.length === 0, residualEntrypoints.length ? { residualEntrypoints } : undefined, "entrypoints", "Run `npx power-ai-skills sync` to clear stale entrypoints for unselected tools."),
      createCheck("PAI-ENTRYPOINT-002", "selected entrypoints usable", entrypointStates.every((entrypointState) => entrypointState.ok), { entrypointStates }, "entrypoints", "Run `npx power-ai-skills sync` to repair broken entrypoints, and re-run `init` if the selected tools changed."),
      ...collectConversationArtifactChecks(powerAiRoot),
      ...collectAutoCaptureRuntimeChecks(),
      ...collectCaptureSafetyPolicyChecks(),
      ...collectCaptureRetentionChecks(),
      ...collectConversationCaptureAdmissionChecks(governanceContext),
      ...collectConversationDecisionChecks(powerAiRoot),
      ...collectEvolutionProposalChecks(powerAiRoot),
      ...collectKnowledgeArtifactChecks(skillsTarget)
    ];
    
    const checkGroups = buildCheckGroups(checks);
    
    const remediationTips = buildRemediationTips({ checks, checkGroups, selection, entrypointStates });
    
    const failureCodes = checks.filter((check) => !check.ok && check.severity !== "warning").map((check) => check.code);
    
    const warnings = [];
    if (selection.mode === "legacy") {
      warnings.push("Current project selection is inferred from legacy entrypoints. Run power-ai-skills init --preset ... or init --tool ... to persist the selection.");
    }
    const copiedEntrypoints = entrypointStates.filter((entrypointState) => entrypointState.state === "copied-directory" || entrypointState.state === "copied-file");
    if (copiedEntrypoints.length > 0) {
      warnings.push(`These entrypoints are using copy mode instead of link mode: ${copiedEntrypoints.map((entrypointState) => entrypointState.target).join(", ")}.`);
    }
    if (teamPolicyService) {
      const driftReport = teamPolicyService.buildTeamPolicyDriftReport();
      warnings.push(...(driftReport.warnings || []));
    }
    warnings.push(...collectWrapperPromotionWarnings(powerAiRoot));
    warnings.push(...collectEvolutionAppliedProposalWarnings(powerAiRoot));
    const report = {
      generatedAt: new Date().toISOString(),
      packageName: context.packageJson.name,
      version: context.packageJson.version,
      projectRoot,
      mode: hasSelectedToolsConfig ? "single-source" : "legacy-compatible",
      selectedPresets: selection.selectedPresets || [],
      selectedProjectProfile: governanceContext?.selectedProjectProfile || selection.selectedProjectProfile || "",
      selectedTools: selection.selectedTools,
      expandedTools: selection.expandedTools,
      selectionSource: selection.mode,
      governanceContext,
      entrypointStates,
      ok: checks.every((check) => check.ok || check.severity === "warning"),
      checks,
      checkGroups,
      failureCodes,
      remediationTips,
      warnings
    };

    return writeDoctorArtifacts(report);
  }

  return {
    findLegacyPackageReferences,
    collectDoctorReport
  };
}
