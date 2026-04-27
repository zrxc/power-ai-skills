import fs from "node:fs";
import path from "node:path";
import { readJson } from "../shared/fs.mjs";

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

export function collectProjectScanInputs(projectRoot) {
  const packageJson = loadProjectPackageJson(projectRoot);
  const structure = resolveProjectStructure(projectRoot);
  const viewsRoot = structure.viewsRoot ? path.join(projectRoot, structure.viewsRoot) : "";
  const viewFiles = viewsRoot ? listFilesRecursively(viewsRoot, (filePath) => filePath.endsWith(".vue")) : [];
  const frameworkSignals = collectFrameworkSignals(projectRoot, packageJson, viewFiles);

  return {
    packageJson,
    structure,
    viewFiles,
    frameworkSignals
  };
}
