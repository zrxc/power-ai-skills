import { clampScore, toUniqueSortedList } from "../pattern-scoring.mjs";

export function createCandidate({ type, subpattern, sceneType, score, reasons, interactionTraits, dataFlowTraits, componentStack, fileRole }) {
  const confidence = score >= 8 ? "high" : score >= 5 ? "medium" : "low";
  const structuralScore = clampScore((score / 10) * 100);
  return {
    type,
    subpattern,
    sceneType,
    score,
    structuralScore,
    reasons,
    confidence,
    interactionTraits: toUniqueSortedList(interactionTraits),
    dataFlowTraits: toUniqueSortedList(dataFlowTraits),
    componentStack,
    fileRole
  };
}

export function canAnalyzeRole(fileRole) {
  return fileRole === "page" || fileRole === "page-candidate";
}
