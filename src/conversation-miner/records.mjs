import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readJson } from "../shared/fs.mjs";
import { extractSessionSummaryBlock } from "./protocol.mjs";

export function toUniqueSortedList(values) {
  return [...new Set((values || []).filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeSceneType(sceneType) {
  return String(sceneType || "").trim().replace(/_/g, "-").toLowerCase();
}

export function createPatternId(sceneType) {
  return `pattern_${normalizeSceneType(sceneType).replace(/[^a-z0-9]+/g, "_")}`;
}

export function createRecordId({ date, index }) {
  return `conv_${String(date || "").replace(/-/g, "")}_${String(index).padStart(3, "0")}`;
}

export function createPendingCaptureId(records) {
  const fingerprintSeed = (records || []).map((record) => record.fingerprint || "").join("|");
  const digest = createHash("sha1").update(`${Date.now()}|${fingerprintSeed}`).digest("hex").slice(0, 8);
  return `capture_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${digest}`;
}

export function createAutoCaptureRequestId(records) {
  const fingerprintSeed = (records || []).map((record) => record.fingerprint || "").join("|");
  const digest = createHash("sha1").update(`auto|${Date.now()}|${fingerprintSeed}`).digest("hex").slice(0, 8);
  return `auto_capture_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${digest}`;
}

export function createAutoCaptureResponseId(toolName = "") {
  const digest = createHash("sha1").update(`response|${toolName}|${Date.now()}`).digest("hex").slice(0, 8);
  return `auto_response_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${digest}`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeStringValue(value, { safetyPolicy = defaultSafetyPolicy(), projectRoot = "" } = {}) {
  let sanitized = String(value ?? "");
  const redaction = safetyPolicy.redaction || {};
  if (redaction.redactEmails) {
    sanitized = sanitized.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]");
  }
  if (redaction.redactBearerTokens) {
    sanitized = sanitized.replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [redacted-token]");
  }
  if (redaction.redactKnownSecrets) {
    sanitized = sanitized.replace(/\b(sk-[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16})\b/g, "[redacted-secret]");
  }
  if (redaction.redactSecretAssignments) {
    sanitized = sanitized.replace(/\b(password|token|secret|credential|api[_-]?key)\s*[:=]\s*([^\s,;]+)/gi, "$1=[redacted]");
  }
  if (redaction.redactAbsolutePaths) {
    const normalizedProjectRoot = String(projectRoot || "").replace(/\\/g, "/").toLowerCase();
    sanitized = sanitized.replace(/[A-Za-z]:(?:\\|\/)[^\\/\r\n\t"'<>|]+(?:(?:\\|\/)[^\\/\r\n\t"'<>|]+)*/g, (match) => {
      const normalized = match.replace(/\\/g, "/").toLowerCase();
      if (redaction.preserveProjectRelativePaths && normalizedProjectRoot && normalized.startsWith(normalizedProjectRoot)) {
        return match.replace(new RegExp(`^${String(projectRoot).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\\\|/)?`, "i"), "");
      }
      return "[redacted-path]";
    });
    sanitized = sanitized.replace(/\/(?:Users|home|var|opt|srv|private)\/[^\s"'`]+/g, "[redacted-path]");
  }
  return sanitized;
}

function defaultSafetyPolicy() {
  return {
    redaction: {
      redactEmails: true,
      redactBearerTokens: true,
      redactKnownSecrets: true,
      redactSecretAssignments: true,
      redactAbsolutePaths: true,
      preserveProjectRelativePaths: true
    }
  };
}

function sanitizeValue(value, options = {}) {
  if (typeof value === "string") {
    const sanitized = sanitizeStringValue(value, options);
    return { value: sanitized, changed: sanitized !== value };
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => sanitizeValue(item, options));
    return {
      value: items.map((item) => item.value),
      changed: items.some((item) => item.changed)
    };
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => {
      const sanitized = sanitizeValue(item, options);
      return [key, sanitized];
    });
    return {
      value: Object.fromEntries(entries.map(([key, item]) => [key, item.value])),
      changed: entries.some(([, item]) => item.changed)
    };
  }
  return { value, changed: false };
}

export function extractDatePart(timestamp) {
  const match = String(timestamp || "").match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return new Date().toISOString().slice(0, 10);
}

function normalizeRelativeFilePath(projectRoot, filePath) {
  const normalized = String(filePath || "").trim();
  if (!normalized) return "";
  const resolved = path.isAbsolute(normalized) ? normalized : path.resolve(projectRoot, normalized);
  if (resolved.startsWith(projectRoot)) return path.relative(projectRoot, resolved).replace(/\\/g, "/");
  return normalized.replace(/\\/g, "/");
}

export function incrementCount(countMap, value) {
  if (!value) return;
  countMap.set(value, (countMap.get(value) || 0) + 1);
}

export function topValues(countMap, { frequency, maxItems = 5, minRatio = 0.5, absoluteMin = 1 } = {}) {
  const threshold = Math.max(absoluteMin, Math.ceil((frequency || 0) * minRatio));
  const sorted = [...countMap.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"));
  const filtered = sorted.filter((item) => item[1] >= threshold);
  const picked = (filtered.length > 0 ? filtered : sorted).slice(0, maxItems);
  return picked.map(([value]) => value);
}

export function normalizeOperations(operations) {
  return toUniqueSortedList((operations || []).map((item) => String(item || "").trim()).filter(Boolean));
}

export function normalizeEntities(entities) {
  return {
    mainObject: String(entities?.mainObject || "").trim(),
    treeObject: String(entities?.treeObject || "").trim(),
    operations: normalizeOperations(entities?.operations || [])
  };
}

export function createRecordFingerprint(record) {
  const fingerprintPayload = {
    sceneType: normalizeSceneType(record.sceneType),
    skillsUsed: toUniqueSortedList(record.skillsUsed || []),
    entities: normalizeEntities(record.entities),
    customizations: toUniqueSortedList(record.customizations || []),
    generatedFiles: toUniqueSortedList(record.generatedFiles || [])
  };
  return createHash("sha1").update(JSON.stringify(fingerprintPayload)).digest("hex");
}

export function createCoverageSnapshot(meta) {
  return {
    source: meta.source || "",
    name: meta.name || "",
    sceneType: normalizeSceneType(meta.sceneType || meta.patternType || ""),
    operations: normalizeOperations(meta.operations || []),
    customizations: toUniqueSortedList(meta.customizations || []),
    mainObjects: toUniqueSortedList(meta.mainObjects || []),
    treeObjects: toUniqueSortedList(meta.treeObjects || [])
  };
}

export function normalizeInputRecords(inputPayload) {
  if (Array.isArray(inputPayload)) return inputPayload;
  if (Array.isArray(inputPayload?.records)) return inputPayload.records;
  return [inputPayload];
}

export function resolveSessionSummarySource({ inputPath = "", responsePath = "", stdinText = "", extractMarkedBlock = false }) {
  const providedSources = [
    inputPath ? "inputPath" : "",
    responsePath ? "responsePath" : "",
    stdinText ? "stdinText" : ""
  ].filter(Boolean);

  if (providedSources.length !== 1) {
    throw new Error("Provide exactly one session summary source: --input, --from-file, or --stdin.");
  }

  if (inputPath) {
    if (!fs.existsSync(inputPath)) throw new Error(`Session summary input not found: ${inputPath}`);
    return {
      sourceType: "input",
      sourcePath: inputPath,
      inputPayload: readJson(inputPath)
    };
  }

  const textPayload = responsePath
    ? fs.readFileSync(responsePath, "utf8")
    : String(stdinText || "");

  if (!textPayload.trim()) throw new Error("Session summary source was empty.");

  if (extractMarkedBlock) {
    const extracted = extractSessionSummaryBlock(textPayload);
    return {
      sourceType: responsePath ? "file" : "stdin",
      sourcePath: responsePath || "stdin",
      inputPayload: extracted.payload,
      extraction: {
        markers: extracted.markers,
        rawBlock: extracted.rawBlock
      }
    };
  }

  try {
    return {
      sourceType: responsePath ? "file" : "stdin",
      sourcePath: responsePath || "stdin",
      inputPayload: JSON.parse(textPayload)
    };
  } catch (error) {
    throw new Error(`Failed to parse session summary input as JSON. Use --extract-marked-block for AI response text. ${error.message}`);
  }
}

export function resolveAutoCaptureResponseSource({ responsePath = "", stdinText = "" } = {}) {
  const providedSources = [
    responsePath ? "responsePath" : "",
    stdinText ? "stdinText" : ""
  ].filter(Boolean);

  if (providedSources.length !== 1) {
    throw new Error("Provide exactly one raw response source: --from-file or --stdin.");
  }

  if (responsePath) {
    if (!fs.existsSync(responsePath)) throw new Error(`Assistant response input not found: ${responsePath}`);
    return {
      sourceType: "response",
      sourcePath: responsePath,
      responseText: fs.readFileSync(responsePath, "utf8")
    };
  }

  return {
    sourceType: "stdin",
    sourcePath: "stdin",
    responseText: String(stdinText || "")
  };
}

export function normalizeRecord({ rawRecord, projectRoot, toolName = "", date, index, safetyPolicy = defaultSafetyPolicy() }) {
  const timestamp = rawRecord.timestamp || new Date().toISOString();
  const recordDate = date || extractDatePart(timestamp);
  const taskStatus = String(rawRecord.taskStatus || (rawRecord.completed === false ? "incomplete" : "completed")).trim().toLowerCase();
  const sanitizedRecord = sanitizeValue({
    id: rawRecord.id || createRecordId({ date: recordDate, index }),
    timestamp,
    toolUsed: rawRecord.toolUsed || rawRecord.tool || toolName || "unknown",
    sceneType: normalizeSceneType(rawRecord.sceneType),
    userIntent: rawRecord.userIntent || "",
    skillsUsed: toUniqueSortedList(rawRecord.skillsUsed || []),
    entities: normalizeEntities(rawRecord.entities || {}),
    generatedFiles: toUniqueSortedList((rawRecord.generatedFiles || rawRecord.files || []).map((filePath) => normalizeRelativeFilePath(projectRoot, filePath))),
    customizations: toUniqueSortedList(rawRecord.customizations || []),
    complexity: ["low", "medium", "high"].includes(rawRecord.complexity) ? rawRecord.complexity : "medium",
    sensitiveDataFiltered: Boolean(rawRecord.sensitiveDataFiltered),
    source: rawRecord.source || "manual-summary",
    taskStatus
  }, { safetyPolicy, projectRoot });

  return {
    ...sanitizedRecord.value,
    sceneType: normalizeSceneType(sanitizedRecord.value.sceneType),
    entities: normalizeEntities(sanitizedRecord.value.entities),
    capturedAt: new Date().toISOString(),
    sensitiveDataFiltered: Boolean(sanitizedRecord.value.sensitiveDataFiltered || sanitizedRecord.changed),
    fingerprint: createRecordFingerprint(sanitizedRecord.value)
  };
}
