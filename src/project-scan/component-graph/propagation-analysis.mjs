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
