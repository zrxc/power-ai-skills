import { createInfoCommands } from "./info-commands.mjs";
import { createCommandHandlers } from "./registry.mjs";
import { createOutputHelpers } from "./output.mjs";
import { createProjectCommands } from "./project-commands.mjs";

export function createCommandRunner({
  context,
  cliArgs,
  projectRoot,
  selectionService,
  workspaceService,
  doctorService,
  projectBaselineService,
  teamPolicyService,
  governanceContextService,
  projectScanService,
  conversationMinerService,
  upgradeSummaryService,
  releasePublishPlannerService,
  releaseOrchestrationPlannerService,
  releasePublishExecutorService,
  releaseOrchestrationExecutorService,
  governanceSummaryService,
  governanceHistoryService,
  promotionTraceService,
  evolutionService
}) {
  const outputHelpers = createOutputHelpers({ projectRoot, selectionService });

  const infoCommands = createInfoCommands({
    context,
    selectionService,
    doctorService,
    governanceContextService,
    outputHelpers
  });

  const projectCommands = createProjectCommands({
    cliArgs,
    projectRoot,
    selectionService,
    workspaceService,
    projectBaselineService,
    teamPolicyService,
    governanceContextService,
    projectScanService,
    conversationMinerService,
    upgradeSummaryService,
    releasePublishPlannerService,
    releaseOrchestrationPlannerService,
    releasePublishExecutorService,
    releaseOrchestrationExecutorService,
    governanceSummaryService,
    governanceHistoryService,
    promotionTraceService,
    evolutionService
  });

  const commandHandlers = createCommandHandlers({ infoCommands, projectCommands });

  async function execute() {
    const handler = commandHandlers[cliArgs.command];
    if (!handler) {
      console.error(`Unsupported command: ${cliArgs.command}`);
      process.exit(1);
    }

    await handler();
  }

  return { execute };
}
