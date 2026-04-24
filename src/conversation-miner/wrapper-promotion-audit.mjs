import path from "node:path";

function sortTimelineEntries(entries) {
  return [...entries]
    .filter((entry) => entry && entry.at)
    .sort((left, right) => String(left.at).localeCompare(String(right.at), "zh-CN"));
}

export function buildWrapperPromotionTimeline(proposal) {
  const entries = [
    proposal.generatedAt ? { type: "scaffolded", at: proposal.generatedAt, note: `initial proposal created for ${proposal.toolName}` } : null,
    ...((proposal.reviewHistory || []).map((item) => ({
      type: "reviewed",
      at: item.reviewedAt,
      status: item.status,
      note: item.note || ""
    }))),
    proposal.materializedAt ? { type: "materialized", at: proposal.materializedAt, status: proposal.materializationStatus || "generated", note: "" } : null,
    proposal.appliedAt ? { type: "applied", at: proposal.appliedAt, status: proposal.applicationStatus || "applied", note: "" } : null,
    proposal.finalizedAt ? { type: "finalized", at: proposal.finalizedAt, status: proposal.followUpStatus || "finalized", note: proposal.finalizationNote || "" } : null,
    proposal.registeredAt ? { type: "registered", at: proposal.registeredAt, status: proposal.registrationStatus || "registered", note: proposal.registrationNote || "" } : null,
    proposal.archivedAt ? { type: "archived", at: proposal.archivedAt, status: proposal.archiveStatus || "archived", note: proposal.archiveNote || "" } : null,
    proposal.restoredAt ? { type: "restored", at: proposal.restoredAt, status: proposal.archiveStatus || "active", note: proposal.restorationNote || "" } : null
  ];
  return sortTimelineEntries(entries);
}

export function buildWrapperPromotionAuditMarkdown(report) {
  const proposalLines = report.proposals.length > 0
    ? report.proposals.map((proposal) => {
      const lastEvent = proposal.lastEvent
        ? `\`${proposal.lastEvent.type}\` @ \`${proposal.lastEvent.at}\``
        : "`none`";
      const pendingFollowUps = proposal.pendingFollowUps.length > 0
        ? proposal.pendingFollowUps.map((item) => `\`${item}\``).join(", ")
        : "`none`";
      return [
        `### ${proposal.toolName}`,
        `- Display name: \`${proposal.displayName}\``,
        `- Archived: \`${proposal.archived}\``,
        `- Current status: \`${proposal.status}\` / materialize \`${proposal.materializationStatus}\` / apply \`${proposal.applicationStatus}\` / follow-up \`${proposal.followUpStatus}\` / register \`${proposal.registrationStatus}\` / archive \`${proposal.archiveStatus}\``,
        `- Last event: ${lastEvent}`,
        `- Pending follow-ups: ${pendingFollowUps}`
      ].join("\n");
    }).join("\n\n")
    : "_No wrapper promotions found._";

  return `# Wrapper Promotion Audit

- Generated at: \`${report.generatedAt}\`
- Filter: \`${report.filter || "all"}\`
- Sort: \`${report.sort || "default"}\`
- Total proposals: \`${report.summary.total}\`
- Active proposals: \`${report.summary.active}\`
- Archived proposals: \`${report.summary.archived}\`
- Ready for registration: \`${report.summary.readyForRegistration}\`
- Registered active proposals: \`${report.summary.registeredActive}\`
- Pending follow-up proposals: \`${report.summary.pendingFollowUps}\`
- Draft or needs-work proposals: \`${report.summary.draftOrNeedsWork}\`

## Proposals

${proposalLines}
`;
}

export function normalizeWrapperPromotionAuditFilter(filterValue) {
  const normalized = String(filterValue || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["active", "archived", "ready-for-registration", "pending-follow-ups"].includes(normalized)) return normalized;
  throw new Error("generate-wrapper-promotion-audit supports --filter active|archived|ready-for-registration|pending-follow-ups.");
}

export function applyWrapperPromotionAuditFilter(proposals, filterValue) {
  const normalizedFilter = normalizeWrapperPromotionAuditFilter(filterValue);
  if (!normalizedFilter) return proposals;
  if (normalizedFilter === "active") return proposals.filter((item) => !item.archived);
  if (normalizedFilter === "archived") return proposals.filter((item) => item.archived);
  if (normalizedFilter === "ready-for-registration") return proposals.filter((item) => !item.archived && item.followUpStatus === "finalized" && item.registrationStatus !== "registered");
  if (normalizedFilter === "pending-follow-ups") return proposals.filter((item) => (item.pendingFollowUps || []).length > 0);
  return proposals;
}

export function normalizeWrapperPromotionAuditSort(sortValue) {
  const normalized = String(sortValue || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["tool-name", "last-event-desc", "last-event-asc"].includes(normalized)) return normalized;
  throw new Error("generate-wrapper-promotion-audit supports --sort tool-name|last-event-desc|last-event-asc.");
}

export function applyWrapperPromotionAuditSort(proposals, sortValue) {
  const normalizedSort = normalizeWrapperPromotionAuditSort(sortValue);
  const items = [...proposals];
  if (!normalizedSort) return items;
  if (normalizedSort === "tool-name") {
    return items.sort((left, right) => String(left.toolName).localeCompare(String(right.toolName), "zh-CN"));
  }

  return items.sort((left, right) => {
    const leftEvent = String(left.lastEvent?.at || "");
    const rightEvent = String(right.lastEvent?.at || "");
    const compareResult = leftEvent.localeCompare(rightEvent, "zh-CN");
    if (compareResult === 0) {
      return String(left.toolName).localeCompare(String(right.toolName), "zh-CN");
    }
    return normalizedSort === "last-event-asc" ? compareResult : -compareResult;
  });
}

export const wrapperPromotionAuditExportFieldOrder = [
  "toolName",
  "displayName",
  "archived",
  "status",
  "materializationStatus",
  "applicationStatus",
  "followUpStatus",
  "registrationStatus",
  "archiveStatus",
  "promotionRoot",
  "lastEvent",
  "pendingFollowUps"
];

export function normalizeWrapperPromotionAuditFields(fieldsValue) {
  const normalized = String(fieldsValue || "").trim();
  if (!normalized) return [];
  const fields = normalized.split(",").map((item) => item.trim()).filter(Boolean);
  const unsupported = fields.filter((field) => !wrapperPromotionAuditExportFieldOrder.includes(field));
  if (unsupported.length > 0) {
    throw new Error(`generate-wrapper-promotion-audit supports --fields ${wrapperPromotionAuditExportFieldOrder.join(",")}. Unsupported: ${unsupported.join(",")}.`);
  }
  return fields;
}

function normalizeWrapperPromotionAuditFormat(formatValue) {
  const normalized = String(formatValue || "").trim().toLowerCase();
  if (!normalized) return "";
  if (["json", "md", "csv"].includes(normalized)) return normalized;
  throw new Error("generate-wrapper-promotion-audit supports --format json|md|csv.");
}

function serializeWrapperPromotionAuditField(fieldName, proposal) {
  if (fieldName === "lastEvent") {
    return proposal.lastEvent
      ? `${proposal.lastEvent.type}@${proposal.lastEvent.at}`
      : "";
  }
  if (fieldName === "pendingFollowUps") {
    return (proposal.pendingFollowUps || []).join("|");
  }
  return proposal[fieldName] ?? "";
}

export function buildWrapperPromotionAuditExportRows(proposals, fields) {
  const exportFields = fields.length > 0 ? fields : wrapperPromotionAuditExportFieldOrder;
  return proposals.map((proposal) => Object.fromEntries(
    exportFields.map((field) => [field, serializeWrapperPromotionAuditField(field, proposal)])
  ));
}

function escapeCsvValue(value) {
  const normalized = String(value ?? "");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }
  return normalized;
}

export function buildWrapperPromotionAuditExportMarkdown({ fields, rows }) {
  const header = `| ${fields.join(" | ")} |`;
  const separator = `| ${fields.map(() => "---").join(" | ")} |`;
  const body = rows.length > 0
    ? rows.map((row) => `| ${fields.map((field) => String(row[field] ?? "")).join(" | ")} |`).join("\n")
    : `| ${fields.map(() => "").join(" | ")} |`;
  return [header, separator, body, ""].join("\n");
}

export function buildWrapperPromotionAuditExportCsv({ fields, rows }) {
  const lines = [
    fields.map((field) => escapeCsvValue(field)).join(","),
    ...rows.map((row) => fields.map((field) => escapeCsvValue(row[field])).join(","))
  ];
  return `${lines.join("\n")}\n`;
}

export function resolveWrapperPromotionAuditExport({ projectRoot, format = "", output = "" } = {}) {
  const normalizedFormat = normalizeWrapperPromotionAuditFormat(format);
  const normalizedOutput = String(output || "").trim();
  const inferredFormat = !normalizedFormat && normalizedOutput.endsWith(".csv")
    ? "csv"
    : !normalizedFormat && normalizedOutput.endsWith(".md")
      ? "md"
      : !normalizedFormat && normalizedOutput.endsWith(".json")
        ? "json"
        : normalizedFormat;
  const exportFormat = inferredFormat || "";
  if (!exportFormat && !normalizedOutput) {
    return {
      exportFormat: "",
      exportPath: ""
    };
  }
  const exportPath = normalizedOutput
    ? path.resolve(projectRoot, normalizedOutput)
    : path.join(projectRoot, ".power-ai", "reports", `wrapper-promotion-audit.export.${exportFormat}`);
  return {
    exportFormat: exportFormat || "json",
    exportPath
  };
}
