import path from "node:path";

export function createWorkspacePathHelpers({ context, projectRoot }) {
  function getPowerAiPaths() {
    const powerAiRoot = path.join(projectRoot, context.powerAiDirName);
    const governanceRoot = path.join(powerAiRoot, "governance");
    const contextRoot = path.join(powerAiRoot, "context");
    return {
      powerAiRoot,
      governanceRoot,
      contextRoot,
      captureSafetyPolicyPath: path.join(powerAiRoot, "capture-safety-policy.json"),
      evolutionPolicyTarget: path.join(powerAiRoot, "evolution-policy.json"),
      skillsTarget: path.join(powerAiRoot, "skills"),
      sharedTarget: path.join(powerAiRoot, "shared"),
      adaptersTarget: path.join(powerAiRoot, "adapters"),
      registryTarget: path.join(powerAiRoot, "tool-registry.json"),
      teamDefaultsTarget: path.join(powerAiRoot, "team-defaults.json"),
      teamPolicyTarget: path.join(powerAiRoot, "team-policy.json"),
      templateRegistryTarget: path.join(powerAiRoot, "template-registry.json"),
      selectedToolsTarget: path.join(powerAiRoot, "selected-tools.json"),
      readmeTarget: path.join(powerAiRoot, "README.md"),
      projectProfileDecisionTarget: path.join(governanceRoot, "project-profile-decision.json"),
      projectProfileDecisionHistoryTarget: path.join(governanceRoot, "project-profile-decision-history.json"),
      evolutionCandidatesTarget: path.join(governanceRoot, "evolution-candidates.json"),
      evolutionCandidateHistoryTarget: path.join(governanceRoot, "evolution-candidate-history.json"),
      evolutionActionsTarget: path.join(governanceRoot, "evolution-actions.json"),
      evolutionProposalsTarget: path.join(governanceRoot, "evolution-proposals.json"),
      evolutionProposalHistoryTarget: path.join(governanceRoot, "evolution-proposal-history.json"),
      promotionTraceTarget: path.join(governanceRoot, "promotion-trace.json"),
      projectGovernanceContextTarget: path.join(contextRoot, "project-governance-context.json")
    };
  }

  function getReportsRoot() {
    return path.join(getPowerAiPaths().powerAiRoot, "reports");
  }

  function getOverlayTarget(skillTarget) {
    return path.join(skillTarget, context.overlayGroupName);
  }

  function normalizeGroupNames(groupNames) {
    return groupNames
      .filter((name) => name !== context.overlayGroupName)
      .sort((left, right) => left.localeCompare(right, "zh-CN"));
  }

  return {
    getPowerAiPaths,
    getReportsRoot,
    getOverlayTarget,
    normalizeGroupNames
  };
}
