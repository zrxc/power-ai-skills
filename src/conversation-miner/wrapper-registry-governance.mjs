function parseStaleDays(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 14;
}

function daysBetween(left, right) {
  const leftTime = Date.parse(left || "");
  const rightTime = Date.parse(right || "");
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return null;
  return Math.floor(Math.max(0, rightTime - leftTime) / 86400000);
}

function classifyProposal(proposal) {
  if (proposal.archived) return "archived";
  if (proposal.registrationStatus === "registered") return "registered";
  if (proposal.followUpStatus === "finalized") return "ready-for-registration";
  if ((proposal.pendingFollowUps || []).length > 0) return "pending-follow-ups";
  if (["draft", "needs-work"].includes(proposal.status)) return "needs-review";
  return "in-progress";
}

export function buildWrapperRegistryGovernancePayload({ generatedAt, staleDays, registeredWrappers, proposals }) {
  const normalizedStaleDays = parseStaleDays(staleDays);
  const registeredWrapperNames = new Set(registeredWrappers.map((wrapper) => wrapper.toolName));
  const proposalRows = proposals.map((proposal) => {
    const lastEvent = proposal.lastEvent || null;
    const ageDays = daysBetween(lastEvent?.at || proposal.generatedAt || "", generatedAt);
    const governanceStatus = classifyProposal(proposal);
    const stalled = !proposal.archived &&
      proposal.registrationStatus !== "registered" &&
      ageDays !== null &&
      ageDays >= normalizedStaleDays &&
      ["needs-review", "in-progress", "pending-follow-ups"].includes(governanceStatus);

    return {
      toolName: proposal.toolName,
      displayName: proposal.displayName,
      integrationStyle: proposal.integrationStyle || "",
      archived: proposal.archived,
      registeredWrapper: registeredWrapperNames.has(proposal.toolName),
      governanceStatus,
      status: proposal.status,
      materializationStatus: proposal.materializationStatus,
      applicationStatus: proposal.applicationStatus,
      followUpStatus: proposal.followUpStatus,
      registrationStatus: proposal.registrationStatus,
      archiveStatus: proposal.archiveStatus,
      pendingFollowUps: proposal.pendingFollowUps || [],
      lastEvent,
      ageDays,
      stalled,
      promotionRoot: proposal.promotionRoot
    };
  });

  const readyForRegistration = proposalRows.filter((item) => item.governanceStatus === "ready-for-registration");
  const stalledProposals = proposalRows.filter((item) => item.stalled);
  const pendingFollowUps = proposalRows.filter((item) => item.governanceStatus === "pending-follow-ups");
  const registeredProposalNames = new Set(proposalRows.filter((item) => item.registrationStatus === "registered").map((item) => item.toolName));
  const registeredWrappersWithoutProposal = registeredWrappers.filter((wrapper) => !registeredProposalNames.has(wrapper.toolName));
  const recommendedActions = [
    ...readyForRegistration.map((item) => `Register finalized wrapper promotion \`${item.toolName}\` with \`npx power-ai-skills register-wrapper-promotion --tool ${item.toolName}\`.`),
    ...pendingFollowUps.map((item) => `Finish wrapper promotion follow-ups for \`${item.toolName}\`: ${item.pendingFollowUps.join("; ") || "pending checklist"}.`),
    ...stalledProposals.map((item) => `Review stalled wrapper promotion \`${item.toolName}\` currently in \`${item.governanceStatus}\` for ${item.ageDays} day(s).`)
  ];

  return {
    generatedAt,
    staleDays: normalizedStaleDays,
    summary: {
      registeredWrapperCount: registeredWrappers.length,
      proposalCount: proposalRows.length,
      activeProposalCount: proposalRows.filter((item) => !item.archived).length,
      archivedProposalCount: proposalRows.filter((item) => item.archived).length,
      registeredProposalCount: proposalRows.filter((item) => item.registrationStatus === "registered").length,
      readyForRegistration: readyForRegistration.length,
      pendingFollowUps: pendingFollowUps.length,
      stalledProposalCount: stalledProposals.length,
      registeredWrappersWithoutProposal: registeredWrappersWithoutProposal.length
    },
    registeredWrappers: registeredWrappers.map((wrapper) => ({
      toolName: wrapper.toolName,
      displayName: wrapper.displayName,
      commandName: wrapper.commandName,
      integrationStyle: wrapper.integrationStyle
    })),
    proposals: proposalRows,
    readyForRegistration,
    stalledProposals,
    pendingFollowUps,
    registeredWrappersWithoutProposal,
    recommendedActions: [...new Set(recommendedActions)]
  };
}

export function buildWrapperRegistryGovernanceMarkdown(payload) {
  const lines = [
    "# Wrapper Registry Governance",
    "",
    `- generatedAt: \`${payload.generatedAt}\``,
    `- staleDays: \`${payload.staleDays}\``,
    `- registered wrappers: ${payload.summary.registeredWrapperCount}`,
    `- proposals: ${payload.summary.proposalCount}`,
    `- active proposals: ${payload.summary.activeProposalCount}`,
    `- archived proposals: ${payload.summary.archivedProposalCount}`,
    `- ready for registration: ${payload.summary.readyForRegistration}`,
    `- stalled proposals: ${payload.summary.stalledProposalCount}`,
    "",
    "## Registered Wrappers",
    ""
  ];

  for (const wrapper of payload.registeredWrappers) {
    lines.push(`- \`${wrapper.toolName}\`: ${wrapper.displayName}, command \`${wrapper.commandName}\`, style \`${wrapper.integrationStyle}\``);
  }

  lines.push("", "## Proposal Governance", "");
  if (payload.proposals.length === 0) {
    lines.push("- none");
  } else {
    for (const proposal of payload.proposals) {
      const ageSuffix = proposal.ageDays === null ? "unknown age" : `${proposal.ageDays} day(s)`;
      lines.push(`- \`${proposal.toolName}\`: ${proposal.governanceStatus}, registeredWrapper: ${proposal.registeredWrapper}, archived: ${proposal.archived}, age: ${ageSuffix}`);
    }
  }

  lines.push("", "## Ready For Registration", "");
  if (payload.readyForRegistration.length === 0) {
    lines.push("- none");
  } else {
    for (const proposal of payload.readyForRegistration) lines.push(`- \`${proposal.toolName}\``);
  }

  lines.push("", "## Stalled Proposals", "");
  if (payload.stalledProposals.length === 0) {
    lines.push("- none");
  } else {
    for (const proposal of payload.stalledProposals) lines.push(`- \`${proposal.toolName}\`: ${proposal.governanceStatus}, age ${proposal.ageDays} day(s)`);
  }

  lines.push("", "## Recommended Actions", "");
  if (payload.recommendedActions.length === 0) {
    lines.push("- none");
  } else {
    for (const action of payload.recommendedActions) lines.push(`- ${action}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
