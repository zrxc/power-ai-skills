import fs from "node:fs";
import { readJson, writeJson } from "../../scripts/shared.mjs";

export const defaultCaptureSafetyPolicy = {
  schemaVersion: 1,
  enabled: true,
  redaction: {
    redactEmails: true,
    redactBearerTokens: true,
    redactKnownSecrets: true,
    redactSecretAssignments: true,
    redactAbsolutePaths: true,
    preserveProjectRelativePaths: true
  },
  admission: {
    allowedSceneTypes: [],
    blockedSceneTypes: [
      "chat",
      "small-talk",
      "general-discussion",
      "general-q-and-a",
      "plain-explanation"
    ],
    reviewSceneTypes: [
      "project-analysis",
      "implementation-planning",
      "architecture-review"
    ],
    blockedIntentKeywords: [
      "password",
      "token",
      "secret",
      "credential",
      "private key",
      "access key",
      "api key",
      "瀵嗙爜",
      "瀵嗛挜",
      "浠ょ墝",
      "鍑瘉"
    ],
    reviewIntentKeywords: [
      "how to use",
      "how should i use",
      "what skills should be used",
      "analyze current project",
      "usage guide",
      "project overview",
      "鎬庝箞浣跨敤",
      "濡備綍浣跨敤",
      "鍒嗘瀽褰撳墠椤圭洰",
      "椤圭洰涓殑skill鎬庝箞浣跨敤",
      "浣跨敤璇存槑"
    ],
    blockedGeneratedFilePatterns: [],
    reviewGeneratedFilePatterns: []
  },
  retention: {
    autoArchiveDays: 90,
    autoPruneDays: 0
  }
};

function normalizeStringList(values = []) {
  return [...new Set((values || [])
    .map((item) => String(item || "").trim())
    .filter(Boolean))];
}

export function normalizeCaptureSafetyPolicy(policy = {}) {
  return {
    ...defaultCaptureSafetyPolicy,
    ...policy,
    redaction: {
      ...defaultCaptureSafetyPolicy.redaction,
      ...(policy.redaction || {})
    },
    admission: {
      ...defaultCaptureSafetyPolicy.admission,
      ...(policy.admission || {}),
      allowedSceneTypes: normalizeStringList(policy.admission?.allowedSceneTypes || defaultCaptureSafetyPolicy.admission.allowedSceneTypes),
      blockedSceneTypes: normalizeStringList(policy.admission?.blockedSceneTypes || defaultCaptureSafetyPolicy.admission.blockedSceneTypes),
      reviewSceneTypes: normalizeStringList(policy.admission?.reviewSceneTypes || defaultCaptureSafetyPolicy.admission.reviewSceneTypes),
      blockedIntentKeywords: normalizeStringList(policy.admission?.blockedIntentKeywords || defaultCaptureSafetyPolicy.admission.blockedIntentKeywords),
      reviewIntentKeywords: normalizeStringList(policy.admission?.reviewIntentKeywords || defaultCaptureSafetyPolicy.admission.reviewIntentKeywords),
      blockedGeneratedFilePatterns: normalizeStringList(policy.admission?.blockedGeneratedFilePatterns || defaultCaptureSafetyPolicy.admission.blockedGeneratedFilePatterns),
      reviewGeneratedFilePatterns: normalizeStringList(policy.admission?.reviewGeneratedFilePatterns || defaultCaptureSafetyPolicy.admission.reviewGeneratedFilePatterns)
    },
    retention: {
      ...defaultCaptureSafetyPolicy.retention,
      ...(policy.retention || {})
    }
  };
}

function mergeCaptureSafetyPolicy(basePolicy = {}, overridePolicy = {}) {
  return normalizeCaptureSafetyPolicy({
    ...basePolicy,
    ...overridePolicy,
    redaction: {
      ...(basePolicy.redaction || {}),
      ...(overridePolicy.redaction || {})
    },
    admission: {
      ...(basePolicy.admission || {}),
      ...(overridePolicy.admission || {})
    },
    retention: {
      ...(basePolicy.retention || {}),
      ...(overridePolicy.retention || {})
    }
  });
}

export function validateCaptureSafetyPolicyConfig(policy = {}) {
  const normalized = normalizeCaptureSafetyPolicy(policy);
  const errors = [];
  const warnings = [];

  if (!Number.isInteger(Number(normalized.schemaVersion)) || Number(normalized.schemaVersion) < 1) {
    errors.push("schemaVersion must be a positive integer.");
  }
  if (!Array.isArray(normalized.admission.allowedSceneTypes)) {
    errors.push("admission.allowedSceneTypes must be an array.");
  }
  if (!Array.isArray(normalized.admission.blockedSceneTypes)) {
    errors.push("admission.blockedSceneTypes must be an array.");
  }
  if (!Array.isArray(normalized.admission.reviewSceneTypes)) {
    errors.push("admission.reviewSceneTypes must be an array.");
  }
  if (!Array.isArray(normalized.admission.blockedIntentKeywords)) {
    errors.push("admission.blockedIntentKeywords must be an array.");
  }
  if (!Array.isArray(normalized.admission.reviewIntentKeywords)) {
    errors.push("admission.reviewIntentKeywords must be an array.");
  }
  if (!Array.isArray(normalized.admission.blockedGeneratedFilePatterns)) {
    errors.push("admission.blockedGeneratedFilePatterns must be an array.");
  }
  if (!Array.isArray(normalized.admission.reviewGeneratedFilePatterns)) {
    errors.push("admission.reviewGeneratedFilePatterns must be an array.");
  }
  if (Number(normalized.retention.autoArchiveDays) < 0) {
    errors.push("retention.autoArchiveDays must be >= 0.");
  }
  if (Number(normalized.retention.autoPruneDays) < 0) {
    errors.push("retention.autoPruneDays must be >= 0.");
  }
  if (Number(normalized.retention.autoPruneDays) > 0 && Number(normalized.retention.autoPruneDays) < Number(normalized.retention.autoArchiveDays)) {
    warnings.push("retention.autoPruneDays is smaller than autoArchiveDays; archived records may be pruned very quickly.");
  }

  const overlapBlockedAllowed = normalized.admission.allowedSceneTypes.filter((item) => normalized.admission.blockedSceneTypes.includes(item));
  if (overlapBlockedAllowed.length > 0) {
    warnings.push(`admission.allowedSceneTypes overlaps with blockedSceneTypes: ${overlapBlockedAllowed.join(", ")}.`);
  }
  const overlapBlockedReview = normalized.admission.reviewSceneTypes.filter((item) => normalized.admission.blockedSceneTypes.includes(item));
  if (overlapBlockedReview.length > 0) {
    warnings.push(`admission.reviewSceneTypes overlaps with blockedSceneTypes: ${overlapBlockedReview.join(", ")}.`);
  }
  const overlapBlockedReviewFilePatterns = normalized.admission.reviewGeneratedFilePatterns.filter((item) => normalized.admission.blockedGeneratedFilePatterns.includes(item));
  if (overlapBlockedReviewFilePatterns.length > 0) {
    warnings.push(`admission.reviewGeneratedFilePatterns overlaps with blockedGeneratedFilePatterns: ${overlapBlockedReviewFilePatterns.join(", ")}.`);
  }

  if (!normalized.enabled) {
    warnings.push("capture safety policy is disabled; automatic capture will not redact or block sensitive records.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      allowedSceneTypeCount: normalized.admission.allowedSceneTypes.length,
      blockedSceneTypeCount: normalized.admission.blockedSceneTypes.length,
      reviewSceneTypeCount: normalized.admission.reviewSceneTypes.length,
      blockedKeywordCount: normalized.admission.blockedIntentKeywords.length,
      reviewKeywordCount: normalized.admission.reviewIntentKeywords.length,
      blockedFilePatternCount: normalized.admission.blockedGeneratedFilePatterns.length,
      reviewFilePatternCount: normalized.admission.reviewGeneratedFilePatterns.length
    }
  };
}

export function readCaptureSafetyPolicy(paths, context = null) {
  return resolveCaptureSafetyPolicy({ context, paths }).policy;
}

export function resolveCaptureSafetyPolicy({ context, paths }) {
  const teamBasePolicy = mergeCaptureSafetyPolicy(defaultCaptureSafetyPolicy, context?.teamPolicy?.captureSafetyPolicy || {});
  if (!fs.existsSync(paths.captureSafetyPolicyPath)) {
    return {
      policy: teamBasePolicy,
      source: "team-default",
      teamBasePolicy,
      projectOverrides: {}
    };
  }

  const projectOverrides = readJson(paths.captureSafetyPolicyPath);
  return {
    policy: mergeCaptureSafetyPolicy(teamBasePolicy, projectOverrides),
    source: "project-override",
    teamBasePolicy,
    projectOverrides
  };
}

export function ensureCaptureSafetyPolicy(paths, context = null) {
  if (!fs.existsSync(paths.captureSafetyPolicyPath)) {
    const initialPolicy = context?.teamPolicy?.captureSafetyPolicy
      ? mergeCaptureSafetyPolicy(defaultCaptureSafetyPolicy, context.teamPolicy.captureSafetyPolicy)
      : defaultCaptureSafetyPolicy;
    writeJson(paths.captureSafetyPolicyPath, initialPolicy);
  }
  return readCaptureSafetyPolicy(paths, context);
}

export function showCaptureSafetyPolicy(options, services) {
  const paths = services.getPaths();
  ensureCaptureSafetyPolicy(paths, services.context);
  const resolved = resolveCaptureSafetyPolicy({ context: services.context, paths });
  const validation = validateCaptureSafetyPolicyConfig(resolved.policy);
  return {
    generatedAt: new Date().toISOString(),
    policyPath: paths.captureSafetyPolicyPath,
    policy: resolved.policy,
    validation,
    source: resolved.source,
    teamBasePolicy: resolved.teamBasePolicy,
    projectOverrides: resolved.projectOverrides
  };
}

export function validateCaptureSafetyPolicy(options, services) {
  const paths = services.getPaths();
  const resolved = resolveCaptureSafetyPolicy({ context: services.context, paths });
  const validation = validateCaptureSafetyPolicyConfig(resolved.policy);
  return {
    generatedAt: new Date().toISOString(),
    policyPath: paths.captureSafetyPolicyPath,
    ok: validation.ok,
    errors: validation.errors,
    warnings: validation.warnings,
    summary: validation.summary,
    normalizedPolicy: validation.normalized,
    source: resolved.source,
    teamBasePolicy: resolved.teamBasePolicy,
    projectOverrides: resolved.projectOverrides
  };
}

export function collectCaptureSafetyPolicyStatus(paths, context = null) {
  const exists = fs.existsSync(paths.captureSafetyPolicyPath);
  const resolved = resolveCaptureSafetyPolicy({ context, paths });
  const validation = validateCaptureSafetyPolicyConfig(resolved.policy);
  return {
    exists,
    policyPath: paths.captureSafetyPolicyPath,
    ok: validation.ok,
    warningCount: validation.summary.warningCount,
    allowedSceneTypeCount: validation.summary.allowedSceneTypeCount,
    blockedSceneTypeCount: validation.summary.blockedSceneTypeCount,
    reviewSceneTypeCount: validation.summary.reviewSceneTypeCount,
    blockedKeywordCount: validation.summary.blockedKeywordCount,
    reviewKeywordCount: validation.summary.reviewKeywordCount,
    blockedFilePatternCount: validation.summary.blockedFilePatternCount,
    reviewFilePatternCount: validation.summary.reviewFilePatternCount,
    enabled: validation.normalized.enabled,
    source: resolved.source
  };
}
