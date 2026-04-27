import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../shared/fs.mjs";
import {
  createEmptyEvolutionProposals,
  normalizeEvolutionProposal,
  summarizeEvolutionProposals,
  buildEvolutionProposalReadme
} from "./proposals.mjs";

export function loadEvolutionProposals(paths) {
  const proposals = fs.existsSync(paths.evolutionProposalsTarget)
    ? JSON.parse(fs.readFileSync(paths.evolutionProposalsTarget, "utf8"))
    : createEmptyEvolutionProposals();
  const history = fs.existsSync(paths.evolutionProposalHistoryTarget)
    ? JSON.parse(fs.readFileSync(paths.evolutionProposalHistoryTarget, "utf8"))
    : { schemaVersion: 1, entries: [] };
  return {
    proposals: {
      schemaVersion: proposals?.schemaVersion || 1,
      updatedAt: proposals?.updatedAt || "",
      proposals: Array.isArray(proposals?.proposals) ? proposals.proposals.map((item) => normalizeEvolutionProposal(item)) : []
    },
    history: {
      schemaVersion: history?.schemaVersion || 1,
      entries: Array.isArray(history?.entries) ? history.entries : []
    }
  };
}

export function buildEvolutionProposalArtifacts({ context, projectRoot, paths, generatedAt, proposals }) {
  const payload = { schemaVersion: 1, updatedAt: generatedAt, proposals };
  const summary = summarizeEvolutionProposals(payload);
  const report = {
    generatedAt,
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    projectRoot,
    summary,
    proposals,
    reportPath: paths.evolutionProposalReportPath,
    jsonPath: paths.evolutionProposalReportJsonPath,
    proposalsPath: paths.evolutionProposalsTarget,
    historyPath: paths.evolutionProposalHistoryTarget
  };
  const proposalLines = [
    "# Evolution Proposals",
    "",
    `- package: \`${report.packageName}@${report.version}\``,
    `- projectRoot: \`${report.projectRoot}\``,
    `- generatedAt: \`${report.generatedAt}\``,
    `- total proposals: ${summary.total}`,
    `- draft: ${summary.draft}`,
    `- review: ${summary.review}`,
    `- accepted: ${summary.accepted}`,
    `- rejected: ${summary.rejected}`,
    `- archived: ${summary.archived}`,
    `- high risk: ${summary.highRisk}`,
    `- stale review proposals: ${summary.staleReview}`,
    `- stale accepted proposals: ${summary.staleAcceptedPendingApply}`,
    `- review SLA days: ${summary.reviewSlaDays}`,
    `- accepted apply SLA days: ${summary.acceptedApplySlaDays}`,
    ""
  ];
  if (proposals.length === 0) {
    proposalLines.push("- none", "");
  } else {
    for (const proposal of proposals) {
      proposalLines.push(`- \`${proposal.proposalId}\`: ${proposal.proposalType}, status ${proposal.status}, risk ${proposal.riskLevel}`);
    }
    proposalLines.push("");
  }
  return { payload, summary, report, markdown: `${proposalLines.join("\n")}\n` };
}

export function persistEvolutionProposals({ context, projectRoot, paths, generatedAt, proposals, history }) {
  const nextProposals = proposals.map((item) => normalizeEvolutionProposal(item))
    .sort((left, right) => left.proposalId.localeCompare(right.proposalId, "zh-CN"));
  const nextHistory = {
    schemaVersion: history?.schemaVersion || 1,
    entries: Array.isArray(history?.entries) ? history.entries : []
  };
  const { payload, report, markdown } = buildEvolutionProposalArtifacts({
    context,
    projectRoot,
    paths,
    generatedAt,
    proposals: nextProposals
  });

  ensureDir(path.dirname(paths.evolutionProposalsTarget));
  ensureDir(paths.evolutionProposalsRoot);
  ensureDir(path.dirname(paths.evolutionProposalReportPath));

  writeJson(paths.evolutionProposalsTarget, payload);
  writeJson(paths.evolutionProposalHistoryTarget, nextHistory);
  writeJson(paths.evolutionProposalReportJsonPath, report);
  fs.writeFileSync(paths.evolutionProposalReportPath, markdown, "utf8");

  for (const proposal of nextProposals) {
    ensureDir(proposal.proposalRoot);
    writeJson(path.join(proposal.proposalRoot, "proposal.json"), proposal);
    fs.writeFileSync(path.join(proposal.proposalRoot, "README.md"), buildEvolutionProposalReadme(proposal), "utf8");
  }

  return report;
}

export function selectTargetProposals({
  proposals = [],
  proposalId = "",
  fromStatus = "",
  proposalType = "",
  includeArchived = false,
  limit = 0
} = {}) {
  if (proposalId) {
    const matched = proposals.find((item) => item.proposalId === proposalId);
    return matched ? [matched] : [];
  }

  let selected = proposals.filter((item) => {
    if (!includeArchived && item.status === "archived") return false;
    if (fromStatus && item.status !== fromStatus) return false;
    if (proposalType && item.proposalType !== proposalType) return false;
    return true;
  });

  selected = selected.sort((left, right) => {
    const leftTimestamp = Date.parse(left.statusUpdatedAt || left.generatedAt || "") || 0;
    const rightTimestamp = Date.parse(right.statusUpdatedAt || right.generatedAt || "") || 0;
    return leftTimestamp - rightTimestamp;
  });

  if (Number(limit) > 0) {
    return selected.slice(0, Number(limit));
  }
  return selected;
}
