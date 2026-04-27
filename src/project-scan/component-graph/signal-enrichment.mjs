import { toUniqueSortedList } from "./shared.mjs";

export function enrichSignalsWithComponentGraph(fileAnalyses, componentGraph, componentPropagation) {
  const nextAnalyses = new Map();
  const propagationMap = new Map(componentPropagation.files.map((item) => [item.path, item]));

  for (const [relativePath, analysis] of fileAnalyses.entries()) {
    const outgoingEdges = componentGraph.edges.filter((edge) => edge.from === relativePath && edge.usedInTemplate);
    const relatedComponentPaths = toUniqueSortedList(outgoingEdges.map((edge) => edge.to));
    const supportingAnalyses = relatedComponentPaths.map((targetPath) => fileAnalyses.get(targetPath)).filter(Boolean);
    const supportingFragments = supportingAnalyses.filter((item) => item.fileRole === "page-fragment" || item.fileRole === "dialog-fragment");
    const supportingDialogFragments = supportingAnalyses.filter((item) => item.fileRole === "dialog-fragment");
    const supportingPageFragments = supportingAnalyses.filter((item) => item.fileRole === "page-fragment");
    const propagationEntry = propagationMap.get(relativePath) || { reachableComponents: [], reachableFragments: [] };
    const transitiveRelatedComponentPaths = toUniqueSortedList(propagationEntry.reachableComponents.map((item) => item.path));
    const transitiveFragmentEntries = propagationEntry.reachableFragments;
    const transitiveFragmentPaths = toUniqueSortedList(transitiveFragmentEntries.map((item) => item.path));
    const transitiveDialogFragmentPaths = toUniqueSortedList(transitiveFragmentEntries.filter((item) => item.fileRole === "dialog-fragment").map((item) => item.path));
    const transitivePageFragmentPaths = toUniqueSortedList(transitiveFragmentEntries.filter((item) => item.fileRole === "page-fragment").map((item) => item.path));
    const transitiveAnalyses = transitiveRelatedComponentPaths.map((targetPath) => fileAnalyses.get(targetPath)).filter(Boolean);

    nextAnalyses.set(relativePath, {
      ...analysis,
      relatedComponentPaths,
      transitiveRelatedComponentPaths,
      supportingFragmentPaths: toUniqueSortedList(supportingFragments.map((item) => item.relativePath)),
      supportingDialogFragmentPaths: toUniqueSortedList(supportingDialogFragments.map((item) => item.relativePath)),
      supportingPageFragmentPaths: toUniqueSortedList(supportingPageFragments.map((item) => item.relativePath)),
      transitiveSupportingFragmentPaths: transitiveFragmentPaths,
      transitiveSupportingDialogFragmentPaths: transitiveDialogFragmentPaths,
      transitiveSupportingPageFragmentPaths: transitivePageFragmentPaths,
      linkedFragmentCount: supportingFragments.length,
      linkedDialogFragmentCount: supportingDialogFragments.length,
      linkedPageFragmentCount: supportingPageFragments.length,
      transitiveLinkedFragmentCount: transitiveFragmentPaths.length,
      transitiveLinkedDialogFragmentCount: transitiveDialogFragmentPaths.length,
      transitiveLinkedPageFragmentCount: transitivePageFragmentPaths.length,
      linkedHasPcDialog: supportingAnalyses.some((item) => item.hasPcDialog),
      linkedHasFormModel: supportingAnalyses.some((item) => item.hasFormModel),
      linkedHasSubmitAction: supportingAnalyses.some((item) => item.hasSubmitAction),
      linkedHasPcTableWarp: supportingAnalyses.some((item) => item.hasPcTableWarp),
      linkedHasCrudAction: supportingAnalyses.some((item) => item.hasCrudAction),
      linkedHasReadOnlyView: supportingAnalyses.some((item) => item.hasReadOnlyView),
      transitiveLinkedHasPcDialog: transitiveAnalyses.some((item) => item.hasPcDialog),
      transitiveLinkedHasFormModel: transitiveAnalyses.some((item) => item.hasFormModel),
      transitiveLinkedHasSubmitAction: transitiveAnalyses.some((item) => item.hasSubmitAction),
      transitiveLinkedHasPcTableWarp: transitiveAnalyses.some((item) => item.hasPcTableWarp),
      transitiveLinkedHasCrudAction: transitiveAnalyses.some((item) => item.hasCrudAction),
      transitiveLinkedHasReadOnlyView: transitiveAnalyses.some((item) => item.hasReadOnlyView)
    });
  }

  return nextAnalyses;
}
