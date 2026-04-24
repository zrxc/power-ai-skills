export function pickMostCommonValue(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))[0]?.[0] || "";
}

export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function toUniqueSortedList(values) {
  return [...new Set((values || []).filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function mergeComponentStacks(componentStacks) {
  return {
    page: pickMostCommonValue(componentStacks.map((item) => item.page)),
    tree: pickMostCommonValue(componentStacks.map((item) => item.tree)),
    table: pickMostCommonValue(componentStacks.map((item) => item.table)),
    dialog: pickMostCommonValue(componentStacks.map((item) => item.dialog))
  };
}

export function summarizeConfidence(matchedFiles) {
  const highestScore = Math.max(...matchedFiles.map((candidate) => candidate.score));
  if (highestScore >= 8) return "high";
  if (highestScore >= 5) return "medium";
  return "low";
}

export function computePurityScore({ frequency, fileCount, subpatterns }) {
  if (fileCount === 0) return 0;
  const pageRatio = frequency / fileCount;
  const fragmentRatio = 1 - pageRatio;
  const mixedSubpatternPenalty = Math.max(0, (subpatterns.length - 1) * 10);
  return clampScore((pageRatio * 100) - (fragmentRatio * 20) - mixedSubpatternPenalty);
}

export function computeReuseScore({ frequency, structuralScore, purityScore, hasPageContainer, dominantSubpattern }) {
  const frequencyScore = Math.min(100, frequency * 20);
  const containerBonus = hasPageContainer ? 10 : 0;
  const fragmentPenalty = dominantSubpattern === "fragment-dialog-form" ? 15 : 0;
  return clampScore((frequencyScore * 0.3) + (structuralScore * 0.35) + (purityScore * 0.35) + containerBonus - fragmentPenalty);
}

export function collectEntitySummary(entities) {
  const counts = new Map();
  for (const entity of entities.filter(Boolean)) counts.set(entity, (counts.get(entity) || 0) + 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .map(([name, count]) => ({ name, count }));
}
