import path from "node:path";
import { toUniqueSortedList } from "./shared.mjs";

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
