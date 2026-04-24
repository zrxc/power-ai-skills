import {
  clampScore,
  collectEntitySummary,
  computePurityScore,
  computeReuseScore,
  mergeComponentStacks,
  pickMostCommonValue,
  summarizeConfidence,
  toUniqueSortedList
} from "./pattern-scoring.mjs";

function normalizePatternType(type) {
  return type.replace(/-/g, "_");
}

function createEmptyAggregate(patternMatch) {
  return {
    type: patternMatch.type,
    files: [],
    features: new Set(),
    interactionTraits: new Set(),
    dataFlowTraits: new Set(),
    sceneTypes: new Set(),
    componentStacks: [],
    scores: [],
    structuralScores: [],
    matchedFiles: [],
    subpatternCounts: new Map(),
    entities: [],
    supportingFragments: new Set(),
    relatedComponents: new Set(),
    transitiveSupportingFragments: new Set(),
    transitiveRelatedComponents: new Set()
  };
}

export function collectPatternAggregates(enrichedFileAnalyses, detectFilePatterns) {
  const aggregates = new Map();

  for (const [relativePath, signals] of enrichedFileAnalyses.entries()) {
    for (const patternMatch of detectFilePatterns(signals)) {
      const current = aggregates.get(patternMatch.type) || createEmptyAggregate(patternMatch);
      current.files.push(...patternMatch.files);
      current.entities.push(patternMatch.entity);
      current.componentStacks.push(patternMatch.componentStack);
      current.scores.push(patternMatch.score);
      current.structuralScores.push(patternMatch.structuralScore);
      current.sceneTypes.add(patternMatch.sceneType);
      for (const reason of patternMatch.reasons) current.features.add(reason);
      for (const trait of patternMatch.interactionTraits) current.interactionTraits.add(trait);
      for (const trait of patternMatch.dataFlowTraits) current.dataFlowTraits.add(trait);
      for (const fragmentPath of signals.supportingFragmentPaths || []) current.supportingFragments.add(fragmentPath);
      for (const componentPath of signals.relatedComponentPaths || []) current.relatedComponents.add(componentPath);
      for (const fragmentPath of signals.transitiveSupportingFragmentPaths || []) current.transitiveSupportingFragments.add(fragmentPath);
      for (const componentPath of signals.transitiveRelatedComponentPaths || []) current.transitiveRelatedComponents.add(componentPath);
      current.subpatternCounts.set(patternMatch.subpattern, (current.subpatternCounts.get(patternMatch.subpattern) || 0) + 1);
      current.matchedFiles.push({
        path: relativePath,
        fileRole: patternMatch.fileRole,
        score: patternMatch.score,
        confidence: patternMatch.confidence,
        subpattern: patternMatch.subpattern,
        sceneType: patternMatch.sceneType,
        reasons: patternMatch.reasons,
        relatedComponentPaths: signals.relatedComponentPaths,
        supportingFragmentPaths: signals.supportingFragmentPaths,
        transitiveRelatedComponentPaths: signals.transitiveRelatedComponentPaths,
        transitiveSupportingFragmentPaths: signals.transitiveSupportingFragmentPaths
      });
      aggregates.set(patternMatch.type, current);
    }
  }

  return aggregates;
}

export function buildAggregatedPatterns({ aggregates, patternDefinitions }) {
  return [...aggregates.values()]
    .map((aggregate) => {
      const definition = patternDefinitions.get(aggregate.type);
      const frequency = aggregate.matchedFiles.filter((item) => item.fileRole === "page" || item.fileRole === "page-candidate").length;
      const averageScore = Number((aggregate.scores.reduce((sum, score) => sum + score, 0) / aggregate.scores.length).toFixed(2));
      const structuralScore = clampScore(aggregate.structuralScores.reduce((sum, score) => sum + score, 0) / aggregate.structuralScores.length);
      const componentStack = mergeComponentStacks(aggregate.componentStacks);
      const subpatterns = [...aggregate.subpatternCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-CN"));
      const dominantSubpattern = subpatterns[0]?.name || "";
      const fileCount = aggregate.matchedFiles.length;
      const fragmentFileCount = aggregate.matchedFiles.filter((item) => item.fileRole === "page-fragment" || item.fileRole === "dialog-fragment").length;
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
        sampleFiles: aggregate.matchedFiles.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path, "zh-CN")).slice(0, 5).map((item) => item.path),
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
        confidence: summarizeConfidence(aggregate.matchedFiles),
        dominantSubpattern,
        subpatterns,
        entities: collectEntitySummary(aggregate.entities),
        matchedFiles: aggregate.matchedFiles.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path, "zh-CN")),
        source: "project-scan"
      };
    })
    .sort((left, right) => right.frequency - left.frequency || right.averageScore - left.averageScore || left.type.localeCompare(right.type, "zh-CN"));
}
