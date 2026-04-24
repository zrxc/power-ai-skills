import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "../../scripts/shared.mjs";
import { readCaptureSafetyPolicy } from "./capture-safety-policy.mjs";

function parseDateOnly(value = "") {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function calculateAgeDays(dateString = "", now = new Date()) {
  const parsed = parseDateOnly(dateString);
  if (!parsed) return null;
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((nowUtc - parsed.getTime()) / 86400000));
}

function listConversationDailyFiles(root, now = new Date()) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right, "zh-CN"))
    .map((fileName) => {
      const filePath = path.join(root, fileName);
      const payload = readJson(filePath);
      const date = String(payload?.date || fileName.replace(/\.json$/i, ""));
      const records = Array.isArray(payload?.records) ? payload.records : [];
      return {
        fileName,
        filePath,
        date,
        ageDays: calculateAgeDays(date, now),
        recordCount: records.length
      };
    });
}

function createRetentionSummary({ policy, activeFiles, archivedFiles, archiveCandidates, pruneCandidates }) {
  const activeAges = activeFiles.map((item) => item.ageDays).filter((value) => Number.isFinite(value));
  const archivedAges = archivedFiles.map((item) => item.ageDays).filter((value) => Number.isFinite(value));
  return {
    autoArchiveDays: Number(policy.retention?.autoArchiveDays || 0),
    autoPruneDays: Number(policy.retention?.autoPruneDays || 0),
    activeFileCount: activeFiles.length,
    activeRecordCount: activeFiles.reduce((sum, item) => sum + item.recordCount, 0),
    archivedFileCount: archivedFiles.length,
    archivedRecordCount: archivedFiles.reduce((sum, item) => sum + item.recordCount, 0),
    oldestActiveAgeDays: activeAges.length > 0 ? Math.max(...activeAges) : null,
    oldestArchivedAgeDays: archivedAges.length > 0 ? Math.max(...archivedAges) : null,
    archiveCandidateCount: archiveCandidates.length,
    pruneCandidateCount: pruneCandidates.length
  };
}

function buildRetentionStatus({ summary, policyEnabled }) {
  if (!policyEnabled) return "warning";
  if (summary.archiveCandidateCount > 0 || summary.pruneCandidateCount > 0) return "warning";
  return "ok";
}

function buildRecommendedActions({ summary, policyEnabled }) {
  const actions = [];
  if (!policyEnabled) {
    actions.push("Enable `.power-ai/capture-safety-policy.json` before relying on automatic capture retention.");
  }
  if (summary.archiveCandidateCount > 0 || summary.pruneCandidateCount > 0) {
    actions.push("Run `npx power-ai-skills apply-capture-retention --json` to archive or prune conversation files that already exceeded retention policy.");
  }
  if (summary.autoArchiveDays <= 0 && summary.autoPruneDays <= 0) {
    actions.push("Set `retention.autoArchiveDays` or `retention.autoPruneDays` in `.power-ai/capture-safety-policy.json` if you want conversation data to self-trim over time.");
  }
  return actions;
}

function buildCaptureRetentionMarkdown(report) {
  const lines = [
    "# Capture Retention",
    "",
    `- generatedAt: \`${report.generatedAt}\``,
    `- status: \`${report.status}\``,
    `- policy path: \`${report.policyPath}\``,
    `- auto archive days: ${report.summary.autoArchiveDays}`,
    `- auto prune days: ${report.summary.autoPruneDays}`,
    `- active files: ${report.summary.activeFileCount}`,
    `- archived files: ${report.summary.archivedFileCount}`,
    `- archive candidates: ${report.summary.archiveCandidateCount}`,
    `- prune candidates: ${report.summary.pruneCandidateCount}`,
    "",
    "## Active Candidates",
    ""
  ];

  if (report.archiveCandidates.length === 0) {
    lines.push("- none");
  } else {
    for (const item of report.archiveCandidates) {
      lines.push(`- \`${item.fileName}\`: age ${item.ageDays}d, records ${item.recordCount}`);
    }
  }

  lines.push("", "## Archived Candidates", "");
  if (report.pruneCandidates.length === 0) {
    lines.push("- none");
  } else {
    for (const item of report.pruneCandidates) {
      lines.push(`- \`${item.fileName}\`: age ${item.ageDays}d, records ${item.recordCount}`);
    }
  }

  lines.push("", "## Recommended Actions", "");
  if (report.recommendedActions.length === 0) {
    lines.push("- none");
  } else {
    for (const action of report.recommendedActions) lines.push(`- ${action}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildCaptureRetentionApplyMarkdown(result) {
  const lines = [
    "# Capture Retention Apply",
    "",
    `- generatedAt: \`${result.generatedAt}\``,
    `- dryRun: ${result.dryRun}`,
    `- archived files: ${result.summary.archivedFiles}`,
    `- pruned files: ${result.summary.prunedFiles}`,
    `- skipped files: ${result.summary.skippedFiles}`,
    "",
    "## Actions",
    ""
  ];

  if (result.actions.length === 0) {
    lines.push("- none");
  } else {
    for (const action of result.actions) {
      lines.push(`- \`${action.action}\` ${path.basename(action.sourcePath || action.targetPath || action.filePath || "")}: ${action.status}`);
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function mergeDailyConversationFile(sourcePath, targetPath) {
  const sourcePayload = readJson(sourcePath);
  const targetPayload = fs.existsSync(targetPath)
    ? readJson(targetPath)
    : { date: sourcePayload?.date || path.basename(sourcePath, ".json"), records: [] };
  const mergedMap = new Map();
  for (const record of targetPayload.records || []) mergedMap.set(record.id, record);
  for (const record of sourcePayload.records || []) mergedMap.set(record.id, record);
  const records = [...mergedMap.values()].sort(
    (left, right) => String(left.timestamp).localeCompare(String(right.timestamp), "zh-CN")
      || String(left.id).localeCompare(String(right.id), "zh-CN")
  );
  writeJson(targetPath, {
    date: targetPayload.date || sourcePayload.date,
    records
  });
}

export function collectCaptureRetentionStatus(paths, options = {}, context = null) {
  const now = options.now instanceof Date ? options.now : new Date();
  const policy = readCaptureSafetyPolicy(paths, context);
  const activeFiles = listConversationDailyFiles(paths.conversationsRoot, now);
  const archivedFiles = listConversationDailyFiles(paths.conversationsArchiveRoot, now);
  const autoArchiveDays = Number(policy.retention?.autoArchiveDays || 0);
  const autoPruneDays = Number(policy.retention?.autoPruneDays || 0);
  const archiveCandidates = autoArchiveDays > 0
    ? activeFiles.filter((item) => Number.isFinite(item.ageDays) && item.ageDays >= autoArchiveDays)
    : [];
  const pruneCandidates = autoPruneDays > 0
    ? archivedFiles.filter((item) => Number.isFinite(item.ageDays) && item.ageDays >= autoPruneDays)
    : [];
  const summary = createRetentionSummary({
    policy,
    activeFiles,
    archivedFiles,
    archiveCandidates,
    pruneCandidates
  });
  const status = buildRetentionStatus({
    summary,
    policyEnabled: Boolean(policy.enabled)
  });
  return {
    generatedAt: new Date().toISOString(),
    status,
    policyPath: paths.captureSafetyPolicyPath,
    policyEnabled: Boolean(policy.enabled),
    summary,
    activeFiles,
    archivedFiles,
    archiveCandidates,
    pruneCandidates,
    recommendedActions: buildRecommendedActions({
      summary,
      policyEnabled: Boolean(policy.enabled)
    }),
    reportPath: path.join(paths.reportsRoot, "capture-retention.md"),
    jsonPath: path.join(paths.reportsRoot, "capture-retention.json")
  };
}

export function checkCaptureRetention(options, services) {
  const paths = services.getPaths();
  const report = collectCaptureRetentionStatus(paths, options, services.context);
  writeJson(report.jsonPath, report);
  fs.writeFileSync(report.reportPath, buildCaptureRetentionMarkdown(report), "utf8");
  return report;
}

export function applyCaptureRetention({ dryRun = false } = {}, services) {
  const paths = services.getPaths();
  const status = collectCaptureRetentionStatus(paths, {}, services.context);
  const actions = [];

  for (const candidate of status.archiveCandidates) {
    const targetPath = path.join(paths.conversationsArchiveRoot, candidate.fileName);
    if (dryRun) {
      actions.push({
        action: "archive",
        status: "planned",
        sourcePath: candidate.filePath,
        targetPath,
        recordCount: candidate.recordCount
      });
      continue;
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    if (fs.existsSync(targetPath)) {
      mergeDailyConversationFile(candidate.filePath, targetPath);
      fs.rmSync(candidate.filePath, { force: true });
    } else {
      fs.renameSync(candidate.filePath, targetPath);
    }
    actions.push({
      action: "archive",
      status: "executed",
      sourcePath: candidate.filePath,
      targetPath,
      recordCount: candidate.recordCount
    });
  }

  for (const candidate of status.pruneCandidates) {
    if (dryRun) {
      actions.push({
        action: "prune",
        status: "planned",
        filePath: candidate.filePath,
        recordCount: candidate.recordCount
      });
      continue;
    }
    fs.rmSync(candidate.filePath, { force: true });
    actions.push({
      action: "prune",
      status: "executed",
      filePath: candidate.filePath,
      recordCount: candidate.recordCount
    });
  }

  const result = {
    generatedAt: new Date().toISOString(),
    dryRun,
    policyPath: paths.captureSafetyPolicyPath,
    sourceReportPath: status.reportPath,
    sourceJsonPath: status.jsonPath,
    actions,
    summary: {
      archivedFiles: actions.filter((item) => item.action === "archive" && item.status !== "skipped").length,
      prunedFiles: actions.filter((item) => item.action === "prune" && item.status !== "skipped").length,
      skippedFiles: actions.filter((item) => item.status === "skipped").length
    },
    reportPath: path.join(paths.reportsRoot, "capture-retention-apply.md"),
    jsonPath: path.join(paths.reportsRoot, "capture-retention-apply.json")
  };
  writeJson(result.jsonPath, result);
  fs.writeFileSync(result.reportPath, buildCaptureRetentionApplyMarkdown(result), "utf8");
  return result;
}
