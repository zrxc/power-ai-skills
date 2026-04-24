function createPatternMap(patterns) {
  return new Map((patterns || []).map((pattern) => [pattern.type, pattern]));
}

export function buildPatternDiff({ previousPatterns, previousReview, currentPatterns, currentReview, currentGeneratedAt }) {
  const previousPatternMap = createPatternMap(previousPatterns?.patterns || previousPatterns || []);
  const previousReviewMap = new Map((previousReview?.patterns || previousReview || []).map((pattern) => [pattern.type, pattern]));
  const currentPatternMap = createPatternMap(currentPatterns.patterns || currentPatterns || []);
  const currentReviewMap = new Map((currentReview.patterns || currentReview || []).map((pattern) => [pattern.type, pattern]));
  const changes = [];

  for (const [type, currentPattern] of currentPatternMap) {
    const previousPattern = previousPatternMap.get(type);
    const currentPatternReview = currentReviewMap.get(type);
    const previousPatternReview = previousReviewMap.get(type);

    if (!previousPattern) {
      changes.push({
        type,
        changeType: "added",
        current: {
          frequency: currentPattern.frequency,
          confidence: currentPattern.confidence,
          decision: currentPatternReview?.decision || "",
          dominantSubpattern: currentPattern.dominantSubpattern
        },
        previous: null,
        fields: ["frequency", "confidence", "decision", "dominantSubpattern"]
      });
      continue;
    }

    const changedFields = [];
    const fieldPairs = [
      ["frequency", previousPattern.frequency, currentPattern.frequency],
      ["confidence", previousPattern.confidence, currentPattern.confidence],
      ["dominantSubpattern", previousPattern.dominantSubpattern, currentPattern.dominantSubpattern],
      ["structuralScore", previousPattern.structuralScore, currentPattern.structuralScore],
      ["purityScore", previousPattern.purityScore, currentPattern.purityScore],
      ["reuseScore", previousPattern.reuseScore, currentPattern.reuseScore],
      ["decision", previousPatternReview?.decision || "", currentPatternReview?.decision || ""]
    ];
    for (const [field, previousValue, currentValue] of fieldPairs) {
      if (previousValue !== currentValue) changedFields.push(field);
    }
    if (changedFields.length > 0) {
      changes.push({
        type,
        changeType: "changed",
        current: {
          frequency: currentPattern.frequency,
          confidence: currentPattern.confidence,
          decision: currentPatternReview?.decision || "",
          dominantSubpattern: currentPattern.dominantSubpattern
        },
        previous: {
          frequency: previousPattern.frequency,
          confidence: previousPattern.confidence,
          decision: previousPatternReview?.decision || "",
          dominantSubpattern: previousPattern.dominantSubpattern
        },
        fields: changedFields
      });
    }
  }

  for (const [type, previousPattern] of previousPatternMap) {
    if (currentPatternMap.has(type)) continue;
    const previousPatternReview = previousReviewMap.get(type);
    changes.push({
      type,
      changeType: "removed",
      current: null,
      previous: {
        frequency: previousPattern.frequency,
        confidence: previousPattern.confidence,
        decision: previousPatternReview?.decision || "",
        dominantSubpattern: previousPattern.dominantSubpattern
      },
      fields: ["removed"]
    });
  }

  return {
    generatedAt: currentGeneratedAt,
    hasPreviousSnapshot: previousPatternMap.size > 0,
    summary: {
      added: changes.filter((item) => item.changeType === "added").length,
      changed: changes.filter((item) => item.changeType === "changed").length,
      removed: changes.filter((item) => item.changeType === "removed").length,
      unchanged: currentPatternMap.size - changes.filter((item) => item.changeType !== "removed").length
    },
    changes: changes.sort((left, right) => left.type.localeCompare(right.type, "zh-CN"))
  };
}

export function buildPatternHistory({ previousHistory, projectName, generatedAt, patterns, patternReview, historyLimit }) {
  const snapshots = [...(previousHistory?.snapshots || [])];
  const reviewMap = new Map(patternReview.patterns.map((pattern) => [pattern.type, pattern]));
  snapshots.push({
    generatedAt,
    projectName,
    patterns: patterns.patterns.map((pattern) => ({
      type: pattern.type,
      frequency: pattern.frequency,
      confidence: pattern.confidence,
      dominantSubpattern: pattern.dominantSubpattern,
      structuralScore: pattern.structuralScore,
      purityScore: pattern.purityScore,
      reuseScore: pattern.reuseScore,
      decision: reviewMap.get(pattern.type)?.decision || ""
    }))
  });

  return {
    updatedAt: generatedAt,
    projectName,
    snapshots: snapshots.slice(-historyLimit)
  };
}
