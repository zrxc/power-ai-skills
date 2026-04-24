import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const manifestDir = path.resolve(process.env.POWER_AI_RELEASE_MANIFEST_DIR || path.join(root, "manifest"));

function parseArgs(argv) {
  const getValue = (flag, fallback = "") => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] || fallback : fallback;
  };

  return {
    changedFilesPath: getValue("--changed-files", path.join(manifestDir, "changed-files.txt")),
    tracePath: getValue("--trace", process.env.POWER_AI_PROMOTION_TRACE_PATH || path.join(root, ".power-ai", "governance", "promotion-trace.json")),
    outputPath: getValue("--output", path.join(manifestDir, "promotion-trace-report.json")),
    markdownPath: getValue("--markdown", path.join(manifestDir, "promotion-trace-report.md"))
  };
}

function normalizePath(filePath = "") {
  return String(filePath || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function loadChangedFiles(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .map((line) => normalizePath(line))
    .filter(Boolean);
}

function relationPaths(relation = {}) {
  const metadataPaths = Array.isArray(relation.metadata?.paths) ? relation.metadata.paths : [];
  return [
    normalizePath(relation.source?.path || ""),
    normalizePath(relation.target?.path || ""),
    normalizePath(relation.metadata?.path || ""),
    ...metadataPaths.map((item) => normalizePath(item))
  ].filter(Boolean);
}

function createTraceKey({ relationType, source, target }) {
  return [
    relationType || "",
    source?.type || "",
    source?.id || "",
    target?.type || "",
    target?.id || ""
  ].join("::");
}

function appendReleaseRelations(trace, matchedRelations) {
  if (!trace || !Array.isArray(trace.relations)) return trace;
  const recordedAt = new Date().toISOString();
  const releaseTarget = {
    type: "release",
    id: packageJson.version,
    label: packageJson.version,
    path: path.relative(root, manifestDir).replace(/\\/g, "/")
  };

  for (const relation of matchedRelations) {
    const source = {
      type: "decision",
      id: `${relation.source?.type || "source"}:${relation.source?.id || "unknown"}`,
      label: relation.source?.id || "unknown",
      path: normalizePath(relation.metadata?.decisionPath || relation.source?.path || "")
    };
    const nextRelation = {
      traceKey: createTraceKey({ relationType: "decision->release", source, target: releaseTarget }),
      relationType: "decision->release",
      source,
      target: releaseTarget,
      metadata: {
        releaseVersion: packageJson.version,
        derivedFromRelationType: relation.relationType || "",
        sourceTraceKey: relation.traceKey || "",
        matchedPaths: relation.matchedPaths || []
      },
      firstRecordedAt: recordedAt,
      lastRecordedAt: recordedAt
    };
    const existingIndex = trace.relations.findIndex((item) => item.traceKey === nextRelation.traceKey);
    if (existingIndex >= 0) {
      trace.relations.splice(existingIndex, 1, {
        ...trace.relations[existingIndex],
        metadata: {
          ...(trace.relations[existingIndex].metadata || {}),
          ...nextRelation.metadata
        },
        lastRecordedAt: recordedAt
      });
    } else {
      trace.relations.push(nextRelation);
    }
  }

  trace.updatedAt = recordedAt;
  trace.relations.sort((left, right) => String(left.traceKey).localeCompare(String(right.traceKey), "zh-CN"));
  return trace;
}

function pathMatchesChangedFiles(candidatePath, changedFiles) {
  if (!candidatePath) return false;
  return changedFiles.some((changedFile) => changedFile === candidatePath || changedFile.startsWith(`${candidatePath}/`));
}

function buildMarkdown(report) {
  const lines = [
    "# Promotion Trace Release Report",
    "",
    `- package: \`${report.packageName}@${report.version}\``,
    `- generatedAt: \`${report.generatedAt}\``,
    `- available: ${report.available}`,
    `- changed files: ${report.summary.changedFileCount}`,
    `- total relations: ${report.summary.totalRelations}`,
    `- matched relations: ${report.summary.matchedRelations}`,
    "",
    "## Matched Relations",
    ""
  ];

  if ((report.matchedRelations || []).length === 0) {
    lines.push("No promotion trace relations matched the current changed files.");
  } else {
    for (const relation of report.matchedRelations) {
      lines.push(`- \`${relation.relationType}\`: \`${relation.source.id}\` -> \`${relation.target.id}\``);
      if ((relation.matchedPaths || []).length > 0) {
        lines.push(`  matched paths: ${(relation.matchedPaths || []).join(", ")}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

const args = parseArgs(process.argv.slice(2));
const changedFiles = loadChangedFiles(args.changedFilesPath);
const trace = fs.existsSync(args.tracePath) ? readJson(args.tracePath) : null;
const relations = Array.isArray(trace?.relations) ? trace.relations : [];
const matchedRelations = relations
  .map((relation) => {
    const matchedPaths = relationPaths(relation).filter((candidatePath) => pathMatchesChangedFiles(candidatePath, changedFiles));
    return matchedPaths.length > 0
      ? {
          traceKey: relation.traceKey || "",
          relationType: relation.relationType || "",
          source: relation.source || {},
          target: relation.target || {},
          metadata: relation.metadata || {},
          matchedPaths
        }
      : null;
  })
  .filter(Boolean);

if (trace) {
  writeJson(args.tracePath, appendReleaseRelations(trace, matchedRelations));
}

const report = {
  packageName: packageJson.name,
  version: packageJson.version,
  generatedAt: new Date().toISOString(),
  available: Boolean(trace),
  tracePath: args.tracePath,
  changedFilesPath: args.changedFilesPath,
  summary: {
    changedFileCount: changedFiles.length,
    totalRelations: relations.length,
    matchedRelations: matchedRelations.length
  },
  matchedRelations
};

writeJson(args.outputPath, report);
fs.writeFileSync(args.markdownPath, buildMarkdown(report), "utf8");

console.log(JSON.stringify({
  ...report,
  outputPath: args.outputPath,
  markdownPath: args.markdownPath
}, null, 2));
