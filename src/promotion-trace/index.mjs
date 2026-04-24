import fs from "node:fs";
import path from "node:path";
import { ensureDir, readJson, writeJson } from "../../scripts/shared.mjs";

function normalizeList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function toRelativePath(projectRoot, filePath = "") {
  if (!filePath || typeof filePath !== "string") return "";
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(projectRoot, filePath);
  return path.relative(projectRoot, resolved).replace(/\\/g, "/");
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

function normalizeNode(projectRoot, node = {}) {
  return {
    type: node.type || "",
    id: node.id || "",
    label: node.label || node.id || "",
    path: toRelativePath(projectRoot, node.path || "")
  };
}

function normalizeMetadata(projectRoot, metadata = {}) {
  const normalized = {
    ...metadata
  };

  if (normalized.path) normalized.path = toRelativePath(projectRoot, normalized.path);
  if (normalized.paths) normalized.paths = normalizeList(normalized.paths.map((item) => toRelativePath(projectRoot, item)));
  if (normalized.sourceConversationIds) normalized.sourceConversationIds = normalizeList(normalized.sourceConversationIds);
  return normalized;
}

function normalizeRelation(projectRoot, relation = {}) {
  const source = normalizeNode(projectRoot, relation.source || {});
  const target = normalizeNode(projectRoot, relation.target || {});
  return {
    traceKey: relation.traceKey || createTraceKey({ relationType: relation.relationType, source, target }),
    relationType: relation.relationType || "",
    source,
    target,
    metadata: normalizeMetadata(projectRoot, relation.metadata || {}),
    firstRecordedAt: relation.firstRecordedAt || "",
    lastRecordedAt: relation.lastRecordedAt || ""
  };
}

export function createEmptyPromotionTrace() {
  return {
    schemaVersion: 1,
    updatedAt: "",
    relations: []
  };
}

export function summarizePromotionTrace(trace) {
  const relations = Array.isArray(trace?.relations) ? trace.relations : [];
  const byRelationType = new Map();
  const summary = {
    total: relations.length,
    relationTypeCount: 0,
    patternToProjectSkill: 0,
    projectSkillToManualProjectSkill: 0,
    patternToWrapperProposal: 0
  };

  for (const relation of relations) {
    byRelationType.set(relation.relationType, (byRelationType.get(relation.relationType) || 0) + 1);
    if (relation.relationType === "pattern->project-skill") summary.patternToProjectSkill += 1;
    if (relation.relationType === "project-skill->manual-project-skill") summary.projectSkillToManualProjectSkill += 1;
    if (relation.relationType === "pattern->wrapper-proposal") summary.patternToWrapperProposal += 1;
  }

  summary.relationTypeCount = byRelationType.size;
  summary.relationTypes = [...byRelationType.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], "zh-CN"))
    .map(([relationType, count]) => ({ relationType, count }));
  return summary;
}

function buildPromotionTraceMarkdown(trace) {
  const summary = summarizePromotionTrace(trace);
  const lines = [
    "# Promotion Trace",
    "",
    `- updatedAt: \`${trace.updatedAt || "not-set"}\``,
    `- total relations: ${summary.total}`,
    `- relation types: ${summary.relationTypeCount}`,
    `- pattern -> project skill: ${summary.patternToProjectSkill}`,
    `- project skill -> manual project skill: ${summary.projectSkillToManualProjectSkill}`,
    `- pattern -> wrapper proposal: ${summary.patternToWrapperProposal}`,
    "",
    "## Relations",
    ""
  ];

  if ((trace.relations || []).length === 0) {
    lines.push("No promotion trace relations recorded yet.");
  } else {
    for (const relation of trace.relations) {
      lines.push(`- \`${relation.relationType}\`: \`${relation.source.id}\` -> \`${relation.target.id}\``);
      if (relation.source.path || relation.target.path) {
        lines.push(`  paths: ${relation.source.path || "n/a"} => ${relation.target.path || "n/a"}`);
      }
      if (relation.metadata?.toolName) lines.push(`  tool: ${relation.metadata.toolName}`);
      if (relation.metadata?.decision) lines.push(`  decision: ${relation.metadata.decision}`);
      if (relation.lastRecordedAt) lines.push(`  lastRecordedAt: ${relation.lastRecordedAt}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function queryTraceRelations(trace, { patternId = "", skillName = "", toolName = "", releaseVersion = "" } = {}) {
  const relations = Array.isArray(trace?.relations) ? trace.relations : [];
  if (patternId) {
    return relations.filter((relation) => relation.source.id === patternId || relation.target.id === patternId);
  }
  if (skillName) {
    return relations.filter((relation) => relation.source.id === skillName || relation.target.id === skillName);
  }
  if (toolName) {
    return relations.filter((relation) => relation.source.id === toolName || relation.target.id === toolName || relation.metadata?.toolName === toolName);
  }
  if (releaseVersion) {
    return relations.filter((relation) => relation.metadata?.releaseVersion === releaseVersion);
  }
  return relations;
}

export function createPromotionTraceService({ projectRoot, workspaceService }) {
  function getPaths() {
    const { promotionTraceTarget } = workspaceService.getPowerAiPaths();
    return {
      promotionTracePath: promotionTraceTarget,
      promotionTraceReportPath: path.join(workspaceService.getReportsRoot(), "promotion-trace.md")
    };
  }

  function ensurePromotionTraceRoot() {
    const paths = getPaths();
    ensureDir(path.dirname(paths.promotionTracePath));
    ensureDir(path.dirname(paths.promotionTraceReportPath));
    return paths;
  }

  function loadPromotionTrace() {
    const paths = ensurePromotionTraceRoot();
    if (!fs.existsSync(paths.promotionTracePath)) return createEmptyPromotionTrace();
    const stored = readJson(paths.promotionTracePath);
    return {
      schemaVersion: stored?.schemaVersion || 1,
      updatedAt: stored?.updatedAt || "",
      relations: Array.isArray(stored?.relations)
        ? stored.relations.map((relation) => normalizeRelation(projectRoot, relation))
        : []
    };
  }

  function writePromotionTrace(trace) {
    const paths = ensurePromotionTraceRoot();
    writeJson(paths.promotionTracePath, trace);
    fs.writeFileSync(paths.promotionTraceReportPath, buildPromotionTraceMarkdown(trace), "utf8");
    return {
      tracePath: paths.promotionTracePath,
      reportPath: paths.promotionTraceReportPath
    };
  }

  function recordRelation({ relationType, source, target, metadata = {}, recordedAt = new Date().toISOString() }) {
    const trace = loadPromotionTrace();
    const normalized = normalizeRelation(projectRoot, {
      relationType,
      source,
      target,
      metadata,
      firstRecordedAt: recordedAt,
      lastRecordedAt: recordedAt
    });
    const existingIndex = trace.relations.findIndex((item) => item.traceKey === normalized.traceKey);
    const existing = existingIndex >= 0 ? trace.relations[existingIndex] : null;
    const nextRelation = existing
      ? normalizeRelation(projectRoot, {
          ...existing,
          metadata: {
            ...(existing.metadata || {}),
            ...(metadata || {})
          },
          firstRecordedAt: existing.firstRecordedAt || recordedAt,
          lastRecordedAt: recordedAt
        })
      : normalized;

    if (existingIndex >= 0) trace.relations.splice(existingIndex, 1, nextRelation);
    else trace.relations.push(nextRelation);
    trace.relations.sort((left, right) => left.traceKey.localeCompare(right.traceKey, "zh-CN"));
    trace.updatedAt = recordedAt;
    const artifacts = writePromotionTrace(trace);
    return {
      relation: nextRelation,
      trace,
      ...artifacts
    };
  }

  function showPromotionTrace(query = {}) {
    const trace = loadPromotionTrace();
    const matches = queryTraceRelations(trace, query);
    const paths = getPaths();
    return {
      generatedAt: new Date().toISOString(),
      query: {
        patternId: query.patternId || "",
        skillName: query.skillName || "",
        toolName: query.toolName || "",
        releaseVersion: query.releaseVersion || ""
      },
      summary: summarizePromotionTrace(trace),
      matchCount: matches.length,
      matches,
      tracePath: paths.promotionTracePath,
      reportPath: paths.promotionTraceReportPath
    };
  }

  return {
    getPaths,
    ensurePromotionTraceRoot,
    loadPromotionTrace,
    writePromotionTrace,
    recordRelation,
    showPromotionTrace
  };
}
