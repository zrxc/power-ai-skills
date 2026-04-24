import { parse as parseScriptAst } from "@babel/parser";
import { baseParse, NodeTypes } from "@vue/compiler-dom";
import { parse as parseSfc } from "@vue/compiler-sfc";

const trackedTagMap = new Map([
  ["commonlayoutcontainer", "CommonLayoutContainer"],
  ["pc-table-warp", "pc-table-warp"],
  ["pc-dialog", "pc-dialog"],
  ["pccontainer", "PcContainer"],
  ["pc-tree", "PcTree"],
  ["pc-layout-page-common", "PcLayoutPageCommon"]
]);

const dialogTags = new Set(["pc-dialog", "pcdialog"]);
const readOnlyAttrNames = new Set(["readonly", "readOnly"]);
const readOnlyTypeValues = new Set(["read", "'read'", "\"read\""]);

function normalizeTagName(tag) {
  return String(tag || "").replace(/_/g, "-").toLowerCase();
}

function createTemplateState() {
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

function getStaticPropertyName(node) {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return node.value;
  return "";
}

function getStaticMemberPath(node) {
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

function traverseTemplateNode(node, state, ancestors = [], pageLevelDepth = 0) {
  if (!node) return;

  if (node.type === NodeTypes.ROOT) {
    for (const child of node.children || []) traverseTemplateNode(child, state, ancestors, pageLevelDepth);
    return;
  }

  if (node.type === NodeTypes.ELEMENT) {
    const tagName = normalizeTagName(node.tag);
    const trackedComponentName = trackedTagMap.get(tagName);
    const insideDialog = ancestors.some((ancestorTag) => dialogTags.has(ancestorTag));
    const nextAncestors = [...ancestors, tagName];
    const nextPageLevelDepth = pageLevelDepth + 1;

    state.tagNames.add(tagName);
    if (!trackedTagMap.has(tagName) && (tagName.includes("-") || /^[a-z]+$/.test(tagName))) state.customTagNames.add(tagName);

    if (trackedComponentName) state.componentPresence[trackedComponentName] = true;
    if (pageLevelDepth === 0) state.topLevelTags.push(tagName);
    if (!insideDialog) state.pageLevelTags.push(tagName);

    if (tagName === "pc-table-warp") state.hasPcTableWarp = true;
    if (dialogTags.has(tagName)) state.hasPcDialog = true;
    if (tagName === "el-form") state.hasEditableForm = true;
    if (tagName === "el-descriptions" || tagName === "descriptions") state.hasReadOnlyView = true;
    if (tagName === "el-tabs" || tagName === "tabs") state.hasTabs = true;
    if (tagName === "pc-tree" && insideDialog) state.treeInsideDialog = true;
    if (tagName === "pc-tree" && !insideDialog) state.hasPageLevelTree = true;

    for (const prop of node.props || []) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        if (readOnlyAttrNames.has(prop.name)) state.hasReadOnlyView = true;
        if (prop.name === "type" && readOnlyTypeValues.has(String(prop.value?.content || ""))) state.hasReadOnlyView = true;
      }
      if (prop.type === NodeTypes.DIRECTIVE) {
        const argName = prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION ? prop.arg.content : "";
        if (prop.name === "bind" && readOnlyAttrNames.has(argName)) state.hasReadOnlyView = true;
        if (prop.name === "bind" && argName === "type" && readOnlyTypeValues.has(String(prop.exp?.content || ""))) state.hasReadOnlyView = true;
        if (prop.name === "on" && argName) state.dialogEventNames.add(argName);
      }
    }

    for (const child of node.children || []) traverseTemplateNode(child, state, nextAncestors, nextPageLevelDepth);
    return;
  }

  if (node.type === NodeTypes.IF) {
    for (const branch of node.branches || []) {
      for (const child of branch.children || []) traverseTemplateNode(child, state, ancestors, pageLevelDepth);
    }
    return;
  }

  if (node.type === NodeTypes.FOR) {
    for (const child of node.children || []) traverseTemplateNode(child, state, ancestors, pageLevelDepth);
  }
}

function analyzeTemplateAst(templateContent) {
  const state = createTemplateState();
  if (!templateContent.trim()) {
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

  try {
    const ast = baseParse(templateContent);
    traverseTemplateNode(ast, state);
  } catch {
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

  const topLevelTag = state.topLevelTags[0] || "";
  const pageContainer = topLevelTag === "commonlayoutcontainer"
    ? "CommonLayoutContainer"
    : topLevelTag === "pccontainer"
      ? "PcContainer"
      : topLevelTag === "pc-layout-page-common"
        ? "PcLayoutPageCommon"
        : "";

  return {
    templateAstAvailable: true,
    ...state,
    pageContainer,
    rootFlags: {
      hasRootCommonLayout: topLevelTag === "commonlayoutcontainer",
      hasRootPcContainer: topLevelTag === "pccontainer",
      hasRootPcLayoutPageCommon: topLevelTag === "pc-layout-page-common",
      hasPageLevelTree: state.hasPageLevelTree
    }
  };
}

function createScriptState() {
  return {
    scriptAstAvailable: false,
    identifiers: new Set(),
    memberPaths: new Set(),
    stringLiterals: new Set(),
    imports: []
  };
}

function traverseScriptNode(node, state) {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) traverseScriptNode(item, state);
    return;
  }

  if (node.type === "Identifier") state.identifiers.add(node.name);
  if (node.type === "StringLiteral") state.stringLiterals.add(node.value);
  if (node.type === "TemplateElement") state.stringLiterals.add(node.value?.cooked || node.value?.raw || "");
  if (node.type === "ImportDeclaration" && typeof node.source?.value === "string") {
    state.imports.push({
      source: node.source.value,
      specifiers: (node.specifiers || []).map((specifier) => ({
        localName: specifier.local?.name || "",
        importedName: specifier.type === "ImportDefaultSpecifier"
          ? "default"
          : (specifier.imported?.name || "")
      }))
    });
  }

  if (node.type === "MemberExpression") {
    const memberPath = getStaticMemberPath(node);
    if (memberPath) state.memberPaths.add(memberPath);
  }

  for (const value of Object.values(node)) {
    if (!value || typeof value !== "object") continue;
    traverseScriptNode(value, state);
  }
}

function analyzeScriptAst(scriptContent) {
  const state = createScriptState();
  if (!scriptContent.trim()) return state;

  try {
    const ast = parseScriptAst(scriptContent, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy"]
    });
    state.scriptAstAvailable = true;
    traverseScriptNode(ast, state);
  } catch {
    return state;
  }
  return state;
}

function hasAnySetValue(values, candidates) {
  return candidates.some((candidate) => values.has(candidate));
}

function buildScriptSignals(scriptState, templateState) {
  const values = new Set([
    ...scriptState.identifiers,
    ...scriptState.memberPaths,
    ...scriptState.stringLiterals,
    ...templateState.dialogEventNames
  ]);

  return {
    hasSearchForm: hasAnySetValue(values, ["searchForm", "searchList", "onSearch", "handleSearch", "queryParams", "resetSearch"]),
    hasCrudAction: hasAnySetValue(values, ["handleAdd", "onAdd", "handleEdit", "onEdit", "handleDelete", "onDelete", "settingAction", "removeById", "deleteById", "actionBtnsAction"]),
    hasFormModel: templateState.hasEditableForm || hasAnySetValue(values, ["formModel", "ruleForm", "formState", "formData", "dialogVal", "FormInstance"]),
    hasSubmitAction: hasAnySetValue(values, ["handleSubmit", "onSubmit", "submitForm", "saveForm", "confirmSubmit", "submit", "onSave", "on-confirm"]),
    hasTreeRefresh: hasAnySetValue(values, ["handleNodeClick", "onNodeClick", "currentNode", "fetchTree", "loadTree", "selectedTreeNodeId"]),
    hasDetailLoad: hasAnySetValue(values, ["fetchDetail", "getDetail", "loadDetail", "queryDetail", "detailInfo", "detailData", "getDetailItem"]),
    hasPaging: hasAnySetValue(values, ["pageValue", "pageNum", "pageSize", "handlePageChange", "pageChange", "total"]),
    hasListFetch: hasAnySetValue(values, ["getList", "fetchList", "loadList", "queryList", "tableData.value.loading", "tableData.loading"])
  };
}

export function analyzeVueSfc(content) {
  const { descriptor } = parseSfc(content, { filename: "component.vue" });
  const templateContent = descriptor.template?.content || "";
  const scriptContent = [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join("\n");
  const templateState = analyzeTemplateAst(templateContent);
  const scriptState = analyzeScriptAst(scriptContent);
  const scriptSignals = buildScriptSignals(scriptState, templateState);

  return {
    templateContent,
    scriptContent,
    templateTagNames: [...templateState.tagNames],
    templateCustomTagNames: [...templateState.customTagNames],
    localImports: scriptState.imports.filter((item) => String(item.source || "").startsWith(".")),
    componentPresence: templateState.componentPresence,
    rootFlags: templateState.rootFlags,
    pageContainer: templateState.pageContainer,
    hasPcTableWarp: templateState.hasPcTableWarp,
    hasPcDialog: templateState.hasPcDialog,
    hasReadOnlyView: templateState.hasReadOnlyView,
    hasEditableForm: templateState.hasEditableForm,
    hasTabs: templateState.hasTabs,
    treeComponent: templateState.hasPageLevelTree ? "PcTree" : "",
    ...scriptSignals
  };
}
