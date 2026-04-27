import { baseParse, NodeTypes } from "@vue/compiler-dom";
import {
  createEmptyTemplateAnalysisResult,
  createTemplateState,
  dialogTags,
  normalizeTagName,
  readOnlyAttrNames,
  readOnlyTypeValues,
  trackedTagMap
} from "./shared.mjs";

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

export function analyzeTemplateAst(templateContent) {
  const state = createTemplateState();
  if (!templateContent.trim()) return createEmptyTemplateAnalysisResult(state);

  try {
    const ast = baseParse(templateContent);
    traverseTemplateNode(ast, state);
  } catch {
    return createEmptyTemplateAnalysisResult(state);
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
