export const trackedTagMap = new Map([
  ["commonlayoutcontainer", "CommonLayoutContainer"],
  ["pc-table-warp", "pc-table-warp"],
  ["pc-dialog", "pc-dialog"],
  ["pccontainer", "PcContainer"],
  ["pc-tree", "PcTree"],
  ["pc-layout-page-common", "PcLayoutPageCommon"]
]);

export const dialogTags = new Set(["pc-dialog", "pcdialog"]);
export const readOnlyAttrNames = new Set(["readonly", "readOnly"]);
export const readOnlyTypeValues = new Set(["read", "'read'", "\"read\""]);

export function normalizeTagName(tag) {
  return String(tag || "").replace(/_/g, "-").toLowerCase();
}

export function createTemplateState() {
  return {
    topLevelTags: [],
    pageLevelTags: [],
    tagNames: new Set(),
    customTagNames: new Set(),
    componentPresence: Object.fromEntries([...trackedTagMap.values()].map((name) => [name, false])),
    hasPcTableWarp: false,
    hasPcDialog: false,
    hasEditableForm: false,
    hasReadOnlyView: false,
    hasTabs: false,
    hasPageLevelTree: false,
    treeInsideDialog: false,
    dialogEventNames: new Set()
  };
}

export function createEmptyTemplateAnalysisResult(state) {
  return {
    templateAstAvailable: false,
    ...state,
    pageContainer: "",
    rootFlags: {
      hasRootCommonLayout: false,
      hasRootPcContainer: false,
      hasRootPcLayoutPageCommon: false,
      hasPageLevelTree: false
    }
  };
}

export function createScriptState() {
  return {
    scriptAstAvailable: false,
    identifiers: new Set(),
    memberPaths: new Set(),
    stringLiterals: new Set(),
    imports: []
  };
}

export function getStaticPropertyName(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return node.value;
  return "";
}

export function getStaticMemberPath(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "ThisExpression") return "this";
  if (node.type === "MemberExpression" && !node.computed) {
    const objectPath = getStaticMemberPath(node.object);
    const propertyPath = getStaticPropertyName(node.property);
    return objectPath && propertyPath ? `${objectPath}.${propertyPath}` : "";
  }
  return "";
}

export function hasAnySetValue(values, candidates) {
  return candidates.some((candidate) => values.has(candidate));
}
