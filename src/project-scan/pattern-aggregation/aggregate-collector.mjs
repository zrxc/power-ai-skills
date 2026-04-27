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

function collectMatchedFileEntry(relativePath, patternMatch, signals) {
  return {
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
      current.matchedFiles.push(collectMatchedFileEntry(relativePath, patternMatch, signals));
      aggregates.set(patternMatch.type, current);
    }
  }

  return aggregates;
}
