import fs from "node:fs";
import path from "node:path";
import { readJson } from "../shared/fs.mjs";
import { buildComponentGraph, buildComponentPropagation, enrichSignalsWithComponentGraph } from "./component-graph.mjs";
import { buildAggregatedPatterns, collectPatternAggregates } from "./pattern-aggregation.mjs";
import { patternDefinitions } from "./pattern-definitions.mjs";
import { detectFilePatterns } from "./pattern-detectors.mjs";
import { createEmptyComponentUsage, createSignals, incrementTrackedComponents } from "./signals.mjs";
import { detectRecommendedTeamProjectProfile } from "../team-policy/project-profile-detection.mjs";

export function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

export function listFilesRecursively(rootDir, predicate) {
  if (!fs.existsSync(rootDir)) return [];

  const results = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursively(entryPath, predicate));
      continue;
    }

    if (!predicate || predicate(entryPath)) results.push(entryPath);
  }

  return results;
}

export function loadProjectPackageJson(projectRoot) {
  const packageJsonPath = path.join(projectRoot, "package.json");
  return fs.existsSync(packageJsonPath) ? readJson(packageJsonPath) : {};
}

export function resolveProjectStructure(projectRoot) {
  const candidates = {
    viewsRoot: "src/views",
    apiRoot: "src/api",
    routerRoot: "src/router",
    componentsRoot: "src/components",
    storeRoot: "src/store",
    utilsRoot: "src/utils"
  };

  return Object.fromEntries(
    Object.entries(candidates).map(([key, relativePath]) => [key, fs.existsSync(path.join(projectRoot, relativePath)) ? relativePath : ""])
  );
}

export function collectFrameworkSignals(projectRoot, packageJson, viewFiles) {
  const dependencies = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {})
  };
  const joinedContent = viewFiles.map((filePath) => readTextIfExists(filePath)).join("\n");

  return {
    vue: Boolean(dependencies.vue) || viewFiles.length > 0,
    pinia: Boolean(dependencies.pinia) || fs.existsSync(path.join(projectRoot, "src", "store")),
    powerRuntime: Boolean(dependencies["@power/runtime-vue3"]) || /@power\/runtime-vue3/.test(joinedContent),
    powerComponents: Boolean(dependencies["@power/p-components"]) || /pc-table-warp|pc-dialog|PcContainer|CommonLayoutContainer|pc-layout-page-common/i.test(joinedContent)
  };
}

export function scanProjectArtifacts({ context, projectRoot }) {
  const generatedAt = new Date().toISOString();
  const packageJson = loadProjectPackageJson(projectRoot);
  const structure = resolveProjectStructure(projectRoot);
  const viewsRoot = structure.viewsRoot ? path.join(projectRoot, structure.viewsRoot) : "";
  const viewFiles = viewsRoot ? listFilesRecursively(viewsRoot, (filePath) => filePath.endsWith(".vue")) : [];
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

  const componentGraph = buildComponentGraph(fileAnalyses);
  const componentPropagation = buildComponentPropagation(fileAnalyses, componentGraph);
  const enrichedFileAnalyses = enrichSignalsWithComponentGraph(fileAnalyses, componentGraph, componentPropagation);
  const aggregates = collectPatternAggregates(enrichedFileAnalyses, detectFilePatterns);
  const patterns = buildAggregatedPatterns({ aggregates, patternDefinitions });
  const frameworkSignals = collectFrameworkSignals(projectRoot, packageJson, viewFiles);
  const teamProjectProfileRecommendation = detectRecommendedTeamProjectProfile({
    context,
    projectRoot,
    projectProfileArtifact: {
      frameworkSignals
    }
  });

  return {
    generatedAt,
    projectProfile: {
      projectName: packageJson.name || path.basename(projectRoot),
      generatedAt,
      structure,
      frameworkSignals,
      teamProjectProfileRecommendation,
      componentUsage,
      componentGraphSummary: componentGraph.summary,
      componentPropagationSummary: componentPropagation.summary,
      fileRoleSummary,
      pagePatterns: {
        basicListPage: patterns.find((pattern) => pattern.type === "basic-list-page")?.frequency || 0,
        treeListPage: patterns.find((pattern) => pattern.type === "tree-list-page")?.frequency || 0,
        detailPage: patterns.find((pattern) => pattern.type === "detail-page")?.frequency || 0,
        dialogFormCrud: patterns.find((pattern) => pattern.type === "dialog-form")?.frequency || 0
      },
      fileSummary: { viewFileCount: viewFiles.length }
    },
    patterns: { generatedAt, patterns },
    componentGraph,
    componentPropagation
  };
}
