/**
 * Evolution Policy 模块
 * 
 * 负责：
 * - 默认策略定义
 * - 策略规范化
 * - 策略配置验证
 */

const defaultEvolutionPolicy = {
  $schema: "./schemas/evolution-policy.schema.json",
  schemaVersion: 1,
  autoAnalyzeEnabled: true,
  autoGenerateProjectSkills: false,
  autoArchiveLowValuePatterns: false,
  autoRefreshGovernanceContext: true,
  autoRefreshGovernanceSummary: true,
  minConversationCountToAnalyze: 3,
  minPatternFrequencyToDraft: 3,
  highConfidencePromotionThreshold: 5,
  allowAutoProjectLocalSkillRefresh: false,
  allowAutoSharedSkillPromotion: false,
  allowAutoWrapperProposal: false,
  allowAutoReleaseActions: false
};

const booleanPolicyFields = [
  "autoAnalyzeEnabled",
  "autoGenerateProjectSkills",
  "autoArchiveLowValuePatterns",
  "autoRefreshGovernanceContext",
  "autoRefreshGovernanceSummary",
  "allowAutoProjectLocalSkillRefresh",
  "allowAutoSharedSkillPromotion",
  "allowAutoWrapperProposal",
  "allowAutoReleaseActions"
];

const positiveIntegerFields = [
  "minConversationCountToAnalyze",
  "minPatternFrequencyToDraft",
  "highConfidencePromotionThreshold"
];

function normalizePositiveInteger(value, fallback) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
}

/**
 * 获取默认演化策略
 */
export function getDefaultEvolutionPolicy() {
  return { ...defaultEvolutionPolicy };
}

/**
 * 规范化演化策略配置
 */
export function normalizeEvolutionPolicy(policy = {}) {
  const source = policy && typeof policy === "object" ? policy : {};
  return {
    $schema: defaultEvolutionPolicy.$schema,
    schemaVersion: 1,
    autoAnalyzeEnabled: typeof source.autoAnalyzeEnabled === "boolean"
      ? source.autoAnalyzeEnabled
      : defaultEvolutionPolicy.autoAnalyzeEnabled,
    autoGenerateProjectSkills: typeof source.autoGenerateProjectSkills === "boolean"
      ? source.autoGenerateProjectSkills
      : defaultEvolutionPolicy.autoGenerateProjectSkills,
    autoArchiveLowValuePatterns: typeof source.autoArchiveLowValuePatterns === "boolean"
      ? source.autoArchiveLowValuePatterns
      : defaultEvolutionPolicy.autoArchiveLowValuePatterns,
    autoRefreshGovernanceContext: typeof source.autoRefreshGovernanceContext === "boolean"
      ? source.autoRefreshGovernanceContext
      : defaultEvolutionPolicy.autoRefreshGovernanceContext,
    autoRefreshGovernanceSummary: typeof source.autoRefreshGovernanceSummary === "boolean"
      ? source.autoRefreshGovernanceSummary
      : defaultEvolutionPolicy.autoRefreshGovernanceSummary,
    minConversationCountToAnalyze: normalizePositiveInteger(
      source.minConversationCountToAnalyze,
      defaultEvolutionPolicy.minConversationCountToAnalyze
    ),
    minPatternFrequencyToDraft: normalizePositiveInteger(
      source.minPatternFrequencyToDraft,
      defaultEvolutionPolicy.minPatternFrequencyToDraft
    ),
    highConfidencePromotionThreshold: normalizePositiveInteger(
      source.highConfidencePromotionThreshold,
      defaultEvolutionPolicy.highConfidencePromotionThreshold
    ),
    allowAutoProjectLocalSkillRefresh: typeof source.allowAutoProjectLocalSkillRefresh === "boolean"
      ? source.allowAutoProjectLocalSkillRefresh
      : defaultEvolutionPolicy.allowAutoProjectLocalSkillRefresh,
    allowAutoSharedSkillPromotion: typeof source.allowAutoSharedSkillPromotion === "boolean"
      ? source.allowAutoSharedSkillPromotion
      : defaultEvolutionPolicy.allowAutoSharedSkillPromotion,
    allowAutoWrapperProposal: typeof source.allowAutoWrapperProposal === "boolean"
      ? source.allowAutoWrapperProposal
      : defaultEvolutionPolicy.allowAutoWrapperProposal,
    allowAutoReleaseActions: typeof source.allowAutoReleaseActions === "boolean"
      ? source.allowAutoReleaseActions
      : defaultEvolutionPolicy.allowAutoReleaseActions
  };
}

/**
 * 验证演化策略配置
 */
export function validateEvolutionPolicyConfig(policy = {}) {
  const errors = [];
  const warnings = [];
  const source = policy && typeof policy === "object" ? policy : {};

  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    errors.push("evolution policy must be an object.");
  }

  if (source.$schema !== defaultEvolutionPolicy.$schema) {
    errors.push(`evolution policy $schema must be ${defaultEvolutionPolicy.$schema}.`);
  }

  if (source.schemaVersion !== 1) {
    errors.push(`evolution policy schemaVersion must be 1, received ${source.schemaVersion ?? "<missing>"}.`);
  }

  for (const field of booleanPolicyFields) {
    if (typeof source[field] !== "boolean") {
      errors.push(`evolution policy ${field} must be boolean.`);
    }
  }

  for (const field of positiveIntegerFields) {
    if (!Number.isInteger(source[field]) || source[field] <= 0) {
      errors.push(`evolution policy ${field} must be a positive integer.`);
    }
  }

  if (source.allowAutoSharedSkillPromotion === true) {
    warnings.push("allowAutoSharedSkillPromotion enables high-risk automation; keep it disabled unless governance review is in place.");
  }

  if (source.allowAutoReleaseActions === true) {
    warnings.push("allowAutoReleaseActions enables high-risk automation; keep it disabled unless release governance is fully automated.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      autoAnalyzeEnabled: source.autoAnalyzeEnabled === true,
      minConversationCountToAnalyze: normalizePositiveInteger(
        source.minConversationCountToAnalyze,
        defaultEvolutionPolicy.minConversationCountToAnalyze
      )
    }
  };
}
