import path from "node:path";

function toUniqueSortedList(values) {
  return [...new Set((values || []).filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function toKebabCase(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function buildComponentTagAliases(localName) {
  const kebabName = toKebabCase(localName);
  const flatName = String(localName || "").replace(/[-_]/g, "").toLowerCase();
  return toUniqueSortedList([String(localName || "").toLowerCase(), kebabName, flatName]);
}

function resolveVueImportTarget(fromRelativePath, importSource, knownVueFiles) {
  if (!String(importSource || "").startsWith(".")) return "";
  const fromDir = path.posix.dirname(fromRelativePath.replace(/\\/g, "/"));
  const basePath = path.posix.normalize(path.posix.join(fromDir, importSource));
  const candidates = [basePath, `${basePath}.vue`, path.posix.join(basePath, "index.vue")];
  return candidates.find((candidate) => knownVueFiles.has(candidate)) || "";
}

export function buildComponentGraph(fileAnalyses) {
  const knownVueFiles = new Set(fileAnalyses.keys());
  const nodes = [];
  const edges = [];

  for (const [relativePath, analysis] of fileAnalyses.entries()) {
    nodes.push({
      path: relativePath,
      fileRole: analysis.fileRole,
      pageContainer: analysis.pageContainer,
      templateTags: analysis.templateCustomTagNames
    });

    for (const localImport of analysis.localImports || []) {
      const targetPath = resolveVueImportTarget(relativePath, localImport.source, knownVueFiles);
      if (!targetPath) continue;
      const targetAnalysis = fileAnalyses.get(targetPath);
      for (const specifier of localImport.specifiers || []) {
        const aliases = buildComponentTagAliases(specifier.localName);
        const usedInTemplate = aliases.some((alias) => analysis.templateTagNames.includes(alias));
        edges.push({
          from: relativePath,
          to: targetPath,
          source: localImport.source,
          localName: specifier.localName,
          importedName: specifier.importedName,
          usedInTemplate,
          targetFileRole: targetAnalysis?.fileRole || ""
        });
      }
    }
  }

  const referencedTargets = new Set(edges.filter((edge) => edge.usedInTemplate).map((edge) => edge.to));
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      usedEdgeCount: edges.filter((edge) => edge.usedInTemplate).length,
      referencedComponentCount: referencedTargets.size,
      pageToFragmentEdgeCount: edges.filter((edge) => edge.usedInTemplate && ["page", "page-candidate"].includes(fileAnalyses.get(edge.from)?.fileRole) && ["page-fragment", "dialog-fragment"].includes(edge.targetFileRole)).length
    },
    nodes: nodes.sort((left, right) => left.path.localeCompare(right.path, "zh-CN")),
    edges: edges.sort((left, right) => left.from.localeCompare(right.from, "zh-CN") || left.to.localeCompare(right.to, "zh-CN") || left.localName.localeCompare(right.localName, "zh-CN"))
  };
}

export function buildComponentPropagation(fileAnalyses, componentGraph) {
  const adjacency = new Map();
  for (const edge of componentGraph.edges.filter((item) => item.usedInTemplate)) {
    const next = adjacency.get(edge.from) || [];
    next.push(edge.to);
    adjacency.set(edge.from, next);
  }

  const fileEntries = [];
  let maxReachDepth = 0;
  let transitivePageToFragmentCount = 0;

  for (const [relativePath, analysis] of fileAnalyses.entries()) {
    const visited = new Set([relativePath]);
    const queue = [{ path: relativePath, depth: 0 }];
    const reachableComponents = [];
    const reachableFragments = [];

    while (queue.length > 0) {
      const current = queue.shift();
      const nextTargets = adjacency.get(current.path) || [];
      for (const nextPath of nextTargets) {
        if (visited.has(nextPath)) continue;
        visited.add(nextPath);
        const nextDepth = current.depth + 1;
        const nextAnalysis = fileAnalyses.get(nextPath);
        reachableComponents.push({
          path: nextPath,
          depth: nextDepth,
          fileRole: nextAnalysis?.fileRole || ""
        });
        if (nextAnalysis && ["page-fragment", "dialog-fragment"].includes(nextAnalysis.fileRole)) {
          reachableFragments.push({
            path: nextPath,
            depth: nextDepth,
            fileRole: nextAnalysis.fileRole
          });
          if (["page", "page-candidate"].includes(analysis.fileRole) && nextDepth > 1) transitivePageToFragmentCount += 1;
        }
        maxReachDepth = Math.max(maxReachDepth, nextDepth);
        queue.push({ path: nextPath, depth: nextDepth });
      }
    }

    fileEntries.push({
      path: relativePath,
      fileRole: analysis.fileRole,
      reachableComponents: reachableComponents.sort((left, right) => left.depth - right.depth || left.path.localeCompare(right.path, "zh-CN")),
      reachableFragments: reachableFragments.sort((left, right) => left.depth - right.depth || left.path.localeCompare(right.path, "zh-CN"))
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      fileCount: fileEntries.length,
      maxReachDepth,
      transitivePageToFragmentCount,
      filesWithReachableFragments: fileEntries.filter((item) => item.reachableFragments.length > 0).length
    },
    files: fileEntries.sort((left, right) => left.path.localeCompare(right.path, "zh-CN"))
  };
}

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
