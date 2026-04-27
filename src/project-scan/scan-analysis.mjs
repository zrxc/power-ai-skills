import path from "node:path";
import { buildComponentGraph, buildComponentPropagation, enrichSignalsWithComponentGraph } from "./component-graph.mjs";
import { collectPatternAggregates, buildAggregatedPatterns } from "./pattern-aggregation.mjs";
import { patternDefinitions } from "./pattern-definitions.mjs";
import { detectFilePatterns } from "./pattern-detectors.mjs";
import { createEmptyComponentUsage, createSignals, incrementTrackedComponents } from "./signals.mjs";
import { readTextIfExists } from "./scan-inputs.mjs";

export function analyzeProjectViewFiles({ projectRoot, viewFiles }) {
  const componentUsage = createEmptyComponentUsage();
  const fileRoleSummary = { page: 0, pageCandidate: 0, pageFragment: 0, dialogFragment: 0 };
  const fileAnalyses = new Map();

  for (const viewFile of viewFiles) {
    const content = readTextIfExists(viewFile);
    const relativePath = path.relative(projectRoot, viewFile).replace(/\\/g, "/");
    const signals = createSignals(relativePath, content);
    fileAnalyses.set(relativePath, signals);
    incrementTrackedComponents(componentUsage, signals.componentPresence);

    if (signals.fileRole === "page") fileRoleSummary.page += 1;
    else if (signals.fileRole === "page-candidate") fileRoleSummary.pageCandidate += 1;
    else if (signals.fileRole === "page-fragment") fileRoleSummary.pageFragment += 1;
    else if (signals.fileRole === "dialog-fragment") fileRoleSummary.dialogFragment += 1;
  }

  return {
    fileAnalyses,
    componentUsage,
    fileRoleSummary
  };
}

export function buildProjectScanAnalysis(fileAnalyses) {
  const componentGraph = buildComponentGraph(fileAnalyses);
  const componentPropagation = buildComponentPropagation(fileAnalyses, componentGraph);
  const enrichedFileAnalyses = enrichSignalsWithComponentGraph(fileAnalyses, componentGraph, componentPropagation);
  const aggregates = collectPatternAggregates(enrichedFileAnalyses, detectFilePatterns);
  const patterns = buildAggregatedPatterns({ aggregates, patternDefinitions });

  return {
    componentGraph,
    componentPropagation,
    patterns
  };
}
