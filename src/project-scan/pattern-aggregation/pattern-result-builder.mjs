import {
  clampScore,
  collectEntitySummary,
  computePurityScore,
  computeReuseScore,
  mergeComponentStacks,
  pickMostCommonValue,
  summarizeConfidence,
  toUniqueSortedList
} from "../pattern-scoring.mjs";

function normalizePatternType(type) {
  return type.replace(/-/g, "_");
}

function buildSubpatterns(aggregate) {
  return [...aggregate.subpatternCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-CN"));
}

function buildSortedMatchedFiles(aggregate) {
  return [...aggregate.matchedFiles].sort(
    (left, right) => right.score - left.score || left.path.localeCompare(right.path, "zh-CN")
  );
}

export function buildAggregatedPatterns({ aggregates, patternDefinitions }) {
  return [...aggregates.values()]
    .map((aggregate) => {
      const definition = patternDefinitions.get(aggregate.type);
      const matchedFiles = buildSortedMatchedFiles(aggregate);
      const frequency = matchedFiles.filter((item) => item.fileRole === "page" || item.fileRole === "page-candidate").length;
      const averageScore = Number((aggregate.scores.reduce((sum, score) => sum + score, 0) / aggregate.scores.length).toFixed(2));
      const structuralScore = clampScore(
        aggregate.structuralScores.reduce((sum, score) => sum + score, 0) / aggregate.structuralScores.length
      );
      const componentStack = mergeComponentStacks(aggregate.componentStacks);
      const subpatterns = buildSubpatterns(aggregate);
      const dominantSubpattern = subpatterns[0]?.name || "";
      const fileCount = matchedFiles.length;
      const fragmentFileCount = matchedFiles.filter(
        (item) => item.fileRole === "page-fragment" || item.fileRole === "dialog-fragment"
      ).length;
      const purityScore = computePurityScore({ frequency, fileCount, subpatterns });
      const reuseScore = computeReuseScore({
        frequency,
        structuralScore,
        purityScore,
        hasPageContainer: Boolean(componentStack.page),
        dominantSubpattern
      });

      return {
        id: `pattern_${normalizePatternType(aggregate.type)}`,
        type: aggregate.type,
        baseSkill: definition?.baseSkill || "",
        frequency,
        fileCount,
        fragmentFileCount,
        files: toUniqueSortedList(aggregate.files),
        sampleFiles: matchedFiles.slice(0, 5).map((item) => item.path),
        componentStack,
        pageContainer: componentStack.page,
        features: toUniqueSortedList([...aggregate.features]),
        interactionTraits: toUniqueSortedList([...aggregate.interactionTraits]),
        dataFlowTraits: toUniqueSortedList([...aggregate.dataFlowTraits]),
        relatedComponents: toUniqueSortedList([...aggregate.relatedComponents]),
        transitiveRelatedComponents: toUniqueSortedList([...aggregate.transitiveRelatedComponents]),
        supportingFragments: toUniqueSortedList([...aggregate.supportingFragments]),
        transitiveSupportingFragments: toUniqueSortedList([...aggregate.transitiveSupportingFragments]),
        sceneTypes: toUniqueSortedList([...aggregate.sceneTypes]),
        sceneType: pickMostCommonValue([...aggregate.sceneTypes]),
        averageScore,
        structuralScore,
        purityScore,
        reuseScore,
        confidence: summarizeConfidence(matchedFiles),
        dominantSubpattern,
        subpatterns,
        entities: collectEntitySummary(aggregate.entities),
        matchedFiles,
        source: "project-scan"
      };
    })
    .sort(
      (left, right) =>
        right.frequency - left.frequency ||
        right.averageScore - left.averageScore ||
        left.type.localeCompare(right.type, "zh-CN")
    );
}
