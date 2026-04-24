const generationThresholds = {
  minFrequencyToGenerate: 3,
  minConfidenceToGenerate: "high",
  minPurityScoreToGenerate: 70,
  minReuseScoreToGenerate: 68
};

const confidenceRank = { low: 1, medium: 2, high: 3 };

function buildFeedbackOverrideMap(feedback) {
  const byId = new Map();
  const byType = new Map();

  for (const override of feedback?.overrides || []) {
    if (override.patternId) byId.set(override.patternId, override);
    if (override.patternType) byType.set(override.patternType, override);
  }

  return { byId, byType };
}

function getAutoReview(pattern) {
  const reasons = [];
  let decision = "review";

  if (pattern.frequency < generationThresholds.minFrequencyToGenerate) {
    decision = "skip";
    reasons.push(`样本数 ${pattern.frequency} 低于生成门槛 ${generationThresholds.minFrequencyToGenerate}`);
  }
  if (confidenceRank[pattern.confidence] < confidenceRank[generationThresholds.minConfidenceToGenerate]) {
    if (decision !== "skip") decision = "review";
    reasons.push(`置信度 ${pattern.confidence} 未达到自动生成门槛 ${generationThresholds.minConfidenceToGenerate}`);
  }
  if (pattern.purityScore < generationThresholds.minPurityScoreToGenerate) {
    if (decision !== "skip") decision = "review";
    reasons.push(`纯度分 ${pattern.purityScore} 低于自动生成门槛 ${generationThresholds.minPurityScoreToGenerate}`);
  }
  if (pattern.reuseScore < generationThresholds.minReuseScoreToGenerate) {
    if (decision !== "skip") decision = "review";
    reasons.push(`复用分 ${pattern.reuseScore} 低于自动生成门槛 ${generationThresholds.minReuseScoreToGenerate}`);
  }
  if (pattern.fragmentFileCount > 0) reasons.push(`命中样本中包含 ${pattern.fragmentFileCount} 个 fragment，仅作为复核线索`);
  if (pattern.subpatterns.some((item) => item.name === "fragment-dialog-form")) reasons.push("包含 fragment-dialog-form 子模式，建议人工确认后再沉淀");
  if (pattern.subpatterns.length > 1) reasons.push(`当前模式存在 ${pattern.subpatterns.length} 个子模式，说明实现分化仍需复核`);
  if (!pattern.pageContainer && pattern.type !== "detail-page") reasons.push("未识别到稳定页面容器，生成后需要人工确认项目骨架");

  if (decision !== "skip" && reasons.length === 0) {
    decision = "generate";
    reasons.push("达到频次、置信度、纯度和复用分门槛，可自动生成草案");
  }

  return { decision, reasons };
}

export function buildPatternReview(patterns, { feedback } = {}) {
  const feedbackOverrideMap = buildFeedbackOverrideMap(feedback);
  let appliedFeedbackCount = 0;

  const reviewedPatterns = patterns.map((pattern) => {
    const autoReview = getAutoReview(pattern);
    const override = feedbackOverrideMap.byId.get(pattern.id) || feedbackOverrideMap.byType.get(pattern.type);
    const reasons = [...autoReview.reasons];
    let decision = autoReview.decision;
    let decisionSource = "heuristic";

    if (override) {
      appliedFeedbackCount += 1;
      decision = override.decision;
      decisionSource = "feedback";
      reasons.unshift(`manual review override: ${autoReview.decision} -> ${override.decision}`);
      if (override.note) reasons.push(`manual note: ${override.note}`);
    }

    return {
      id: pattern.id,
      type: pattern.type,
      baseSkill: pattern.baseSkill,
      frequency: pattern.frequency,
      confidence: pattern.confidence,
      averageScore: pattern.averageScore,
      dominantSubpattern: pattern.dominantSubpattern,
      structuralScore: pattern.structuralScore,
      purityScore: pattern.purityScore,
      reuseScore: pattern.reuseScore,
      autoDecision: autoReview.decision,
      decision,
      decisionSource,
      feedbackNote: override?.note || "",
      feedbackUpdatedAt: override?.updatedAt || "",
      reasons,
      matchedFiles: pattern.matchedFiles
    };
  });

  const overrideCount = feedback?.summary?.total || (feedback?.overrides || []).length || 0;

  return {
    generatedAt: new Date().toISOString(),
    thresholds: generationThresholds,
    feedbackSummary: {
      overrides: overrideCount,
      applied: appliedFeedbackCount,
      stale: Math.max(overrideCount - appliedFeedbackCount, 0)
    },
    summary: {
      generate: reviewedPatterns.filter((pattern) => pattern.decision === "generate").length,
      review: reviewedPatterns.filter((pattern) => pattern.decision === "review").length,
      skip: reviewedPatterns.filter((pattern) => pattern.decision === "skip").length
    },
    patterns: reviewedPatterns
  };
}
