#!/usr/bin/env node
import { createRuntimeContext } from "../src/context.mjs";
import { createCommandRunner } from "../src/commands/index.mjs";
import { createConversationMinerService } from "../src/conversation-miner/index.mjs";
import { createDoctorService } from "../src/doctor/index.mjs";
import { createEvolutionService } from "../src/evolution/index.mjs";
import { createGovernanceContextService } from "../src/governance-context/index.mjs";
import { createGovernanceHistoryService } from "../src/governance-history/index.mjs";
import { createGovernanceSummaryService } from "../src/governance-summary/index.mjs";
import { createProjectBaselineService } from "../src/project-baseline/index.mjs";
import { createProjectScanService } from "../src/project-scan/index.mjs";
import { createPromotionTraceService } from "../src/promotion-trace/index.mjs";
import { createRenderingService } from "../src/rendering/index.mjs";
import { createSelectionService, parseCliArgs, resolveProjectRoot } from "../src/selection/index.mjs";
import { createTeamPolicyService } from "../src/team-policy/index.mjs";
import { createUpgradeSummaryService } from "../src/upgrade-summary/index.mjs";
import { createWorkspaceService } from "../src/workspace/index.mjs";

const context = createRuntimeContext(import.meta.url);
const cliArgs = parseCliArgs(process.argv);
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
const commandRunner = createCommandRunner({
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
  governanceSummaryService,
  governanceHistoryService,
  promotionTraceService,
  evolutionService
});

try {
  await commandRunner.execute();
} catch (error) {
  console.error(`[power-ai-skills] ${error.message}`);
  process.exit(1);
}
