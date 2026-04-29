import { createRuntimeContext } from "../context.mjs";
import { createCommandRunner } from "../commands/index.mjs";
import { createConversationMinerService } from "../conversation-miner/index.mjs";
import { createDoctorService } from "../doctor/index.mjs";
import { createEvolutionService } from "../evolution/index.mjs";
import { createGovernanceContextService } from "../governance-context/index.mjs";
import { createGovernanceHistoryService } from "../governance-history/index.mjs";
import { createGovernanceSummaryService } from "../governance-summary/index.mjs";
import { createProjectBaselineService } from "../project-baseline/index.mjs";
import { createProjectScanService } from "../project-scan/index.mjs";
import { createPromotionTraceService } from "../promotion-trace/index.mjs";
import { createReleasePublishExecutorService } from "../release-publish-executor.mjs";
import { createReleaseOrchestrationExecutorService } from "../release-orchestration-executor.mjs";
import { createReleaseOrchestrationPlannerService } from "../release-orchestration-planner.mjs";
import { createReleasePublishPlannerService } from "../release-publish-planner.mjs";
import { createReleaseUnattendedAuthorizationService } from "../release-unattended-authorization-service.mjs";
import { createReleaseUnattendedGovernanceExecutorService } from "../release-unattended-governance-executor.mjs";
import { createReleaseUnattendedGovernancePlannerService } from "../release-unattended-governance-planner.mjs";
import { createRenderingService } from "../rendering/index.mjs";
import { createSelectionService, parseCliArgs, resolveProjectRoot } from "../selection/index.mjs";
import { createTeamPolicyService } from "../team-policy/index.mjs";
import { createUpgradeSummaryService } from "../upgrade-summary/index.mjs";
import { createWorkspaceService } from "../workspace/index.mjs";

export function createCliRuntime({ importMetaUrl, argv = process.argv } = {}) {
  const context = createRuntimeContext(importMetaUrl);
  const cliArgs = parseCliArgs(argv);
  const projectRoot = resolveProjectRoot({ context, cliArgs });
  const selectionService = createSelectionService({ context, cliArgs, projectRoot });
  const renderingService = createRenderingService({ context });
  const workspaceService = createWorkspaceService({
    context,
    projectRoot,
    cliArgs,
    renderingService
  });
  const teamPolicyService = createTeamPolicyService({
    context,
    projectRoot,
    workspaceService,
    selectionService
  });
  const promotionTraceService = createPromotionTraceService({
    projectRoot,
    workspaceService
  });
  const conversationMinerService = createConversationMinerService({
    context,
    projectRoot,
    workspaceService,
    promotionTraceService
  });
  const governanceContextService = createGovernanceContextService({
    context,
    projectRoot,
    workspaceService,
    selectionService,
    teamPolicyService,
    conversationMinerService
  });
  const doctorService = createDoctorService({
    context,
    projectRoot,
    selectionService,
    workspaceService,
    teamPolicyService,
    governanceContextService,
    conversationMinerService
  });
  const projectScanService = createProjectScanService({
    context,
    projectRoot,
    workspaceService,
    promotionTraceService
  });
  const projectBaselineService = createProjectBaselineService({
    context,
    projectRoot,
    workspaceService,
    selectionService,
    teamPolicyService,
    governanceContextService
  });
  const upgradeSummaryService = createUpgradeSummaryService({
    context,
    projectRoot,
    workspaceService,
    doctorService,
    projectScanService,
    conversationMinerService,
    promotionTraceService,
    governanceContextService
  });
  const releasePublishPlannerService = createReleasePublishPlannerService({
    context,
    projectRoot
  });
  const releaseOrchestrationPlannerService = createReleaseOrchestrationPlannerService({
    context,
    projectRoot,
    releasePublishPlannerService
  });
  const releasePublishExecutorService = createReleasePublishExecutorService({
    context,
    projectRoot,
    releasePublishPlannerService
  });
  const releaseOrchestrationExecutorService = createReleaseOrchestrationExecutorService({
    context,
    projectRoot,
    releaseOrchestrationPlannerService
  });
  const releaseUnattendedGovernancePlannerService = createReleaseUnattendedGovernancePlannerService({
    context,
    projectRoot,
    releasePublishPlannerService,
    releaseOrchestrationPlannerService
  });
  const releaseUnattendedAuthorizationService = createReleaseUnattendedAuthorizationService({
    context,
    projectRoot,
    releasePublishPlannerService,
    releaseUnattendedGovernancePlannerService
  });
  const releaseUnattendedGovernanceExecutorService = createReleaseUnattendedGovernanceExecutorService({
    context,
    projectRoot,
    releaseUnattendedGovernancePlannerService,
    releasePublishExecutorService
  });
  const governanceSummaryService = createGovernanceSummaryService({
    context,
    projectRoot,
    workspaceService,
    teamPolicyService,
    governanceContextService,
    conversationMinerService,
    promotionTraceService
  });
  const governanceHistoryService = createGovernanceHistoryService({
    context,
    projectRoot,
    workspaceService,
    teamPolicyService,
    conversationMinerService,
    promotionTraceService
  });
  const evolutionService = createEvolutionService({
    context,
    projectRoot,
    workspaceService,
    conversationMinerService,
    governanceContextService,
    governanceSummaryService,
    teamPolicyService
  });

  return {
    context,
    cliArgs,
    projectRoot,
    selectionService,
    renderingService,
    workspaceService,
    teamPolicyService,
    promotionTraceService,
    conversationMinerService,
    governanceContextService,
    doctorService,
    projectScanService,
    projectBaselineService,
    upgradeSummaryService,
    releasePublishPlannerService,
    releaseOrchestrationPlannerService,
    releasePublishExecutorService,
    releaseOrchestrationExecutorService,
    releaseUnattendedAuthorizationService,
    releaseUnattendedGovernancePlannerService,
    releaseUnattendedGovernanceExecutorService,
    governanceSummaryService,
    governanceHistoryService,
    evolutionService
  };
}

export async function runCli({ importMetaUrl, argv = process.argv } = {}) {
  const runtime = createCliRuntime({ importMetaUrl, argv });
  const commandRunner = createCommandRunner(runtime);
  return commandRunner.execute();
}
