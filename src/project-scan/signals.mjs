import path from "node:path";
import { analyzeVueSfc } from "./vue-analysis.mjs";

const trackedComponents = [
  { name: "CommonLayoutContainer", patterns: [/CommonLayoutContainer/] },
  { name: "pc-table-warp", patterns: [/<pc-table-warp\b/i, /pc-table-warp/i] },
  { name: "pc-dialog", patterns: [/<pc-dialog\b/i, /<PcDialog\b/, /pc-dialog/i] },
  { name: "PcContainer", patterns: [/<PcContainer\b/, /PcContainer/] },
  { name: "PcTree", patterns: [/<pc-tree\b/i, /<PcTree\b/, /PcTree/] },
  { name: "PcLayoutPageCommon", patterns: [/<pc-layout-page-common\b/i, /<PcLayoutPageCommon\b/, /PcLayoutPageCommon/] }
];

const pageBasenames = new Set(["index.vue", "add.vue", "edit.vue", "detail.vue", "view.vue", "read.vue", "content.vue"]);

export function createEmptyComponentUsage() {
  return Object.fromEntries(trackedComponents.map((component) => [component.name, 0]));
}

export function incrementTrackedComponents(componentUsage, componentPresence) {
  for (const component of trackedComponents) {
    if (componentPresence?.[component.name]) componentUsage[component.name] += 1;
  }
}

export function normalizePatternType(type) {
  return type.replace(/-/g, "_");
}

function detectFileRole(relativePath, content) {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const lowerPath = normalizedPath.toLowerCase();
  const basename = path.basename(normalizedPath).toLowerCase();
  const hasDialog = /<pc-dialog\b|<PcDialog\b|pc-dialog/i.test(content);
  if (lowerPath.includes("/components/")) return hasDialog ? "dialog-fragment" : "page-fragment";
  if (pageBasenames.has(basename)) return "page";
  return "page-candidate";
}

function inferEntity(relativePath) {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const segments = normalizedPath.split("/");
  const viewsIndex = segments.findIndex((segment) => segment === "views");
  return segments[viewsIndex + 1] || "";
}

export function createSignals(relativePath, content) {
  const fileRole = detectFileRole(relativePath, content);
  const basename = path.basename(relativePath).toLowerCase();
  const astSignals = analyzeVueSfc(content);

  return {
    relativePath,
    entity: inferEntity(relativePath),
    fileRole,
    basename,
    localImports: astSignals.localImports || [],
    templateTagNames: astSignals.templateTagNames || [],
    templateCustomTagNames: astSignals.templateCustomTagNames || [],
    componentPresence: astSignals.componentPresence,
    rootFlags: astSignals.rootFlags,
    hasPcTableWarp: astSignals.hasPcTableWarp,
    hasPcDialog: astSignals.hasPcDialog,
    hasSearchForm: astSignals.hasSearchForm,
    hasCrudAction: astSignals.hasCrudAction,
    hasFormModel: astSignals.hasFormModel,
    hasSubmitAction: astSignals.hasSubmitAction,
    hasTreeRefresh: astSignals.hasTreeRefresh,
    hasDetailLoad: astSignals.hasDetailLoad,
    hasReadOnlyView: astSignals.hasReadOnlyView,
    hasPaging: astSignals.hasPaging,
    hasListFetch: astSignals.hasListFetch,
    hasEditableForm: astSignals.hasEditableForm,
    hasTabs: astSignals.hasTabs,
    pageContainer: ["page", "page-candidate"].includes(fileRole) ? astSignals.pageContainer : "",
    treeComponent: astSignals.treeComponent,
    relatedComponentPaths: [],
    transitiveRelatedComponentPaths: [],
    supportingFragmentPaths: [],
    supportingDialogFragmentPaths: [],
    supportingPageFragmentPaths: [],
    transitiveSupportingFragmentPaths: [],
    transitiveSupportingDialogFragmentPaths: [],
    transitiveSupportingPageFragmentPaths: [],
    linkedFragmentCount: 0,
    linkedDialogFragmentCount: 0,
    linkedPageFragmentCount: 0,
    transitiveLinkedFragmentCount: 0,
    transitiveLinkedDialogFragmentCount: 0,
    transitiveLinkedPageFragmentCount: 0,
    linkedHasPcDialog: false,
    linkedHasFormModel: false,
    linkedHasSubmitAction: false,
    linkedHasPcTableWarp: false,
    linkedHasCrudAction: false,
    linkedHasReadOnlyView: false,
    transitiveLinkedHasPcDialog: false,
    transitiveLinkedHasFormModel: false,
    transitiveLinkedHasSubmitAction: false,
    transitiveLinkedHasPcTableWarp: false,
    transitiveLinkedHasCrudAction: false,
    transitiveLinkedHasReadOnlyView: false
  };
}
