import { clampScore, toUniqueSortedList } from "./pattern-scoring.mjs";

function createCandidate({ type, subpattern, sceneType, score, reasons, interactionTraits, dataFlowTraits, componentStack, fileRole }) {
  const confidence = score >= 8 ? "high" : score >= 5 ? "medium" : "low";
  const structuralScore = clampScore((score / 10) * 100);
  return {
    type,
    subpattern,
    sceneType,
    score,
    structuralScore,
    reasons,
    confidence,
    interactionTraits: toUniqueSortedList(interactionTraits),
    dataFlowTraits: toUniqueSortedList(dataFlowTraits),
    componentStack,
    fileRole
  };
}

function canAnalyzeRole(fileRole) {
  return fileRole === "page" || fileRole === "page-candidate";
}

function detectBasicListPattern(signals, treeScore) {
  if (!canAnalyzeRole(signals.fileRole)) return null;
  let score = 0;
  const reasons = [];
  const interactionTraits = [];
  const dataFlowTraits = [];

  if (signals.hasPcTableWarp) {
    score += 2;
    reasons.push("存在 pc-table-warp");
    interactionTraits.push("table-view");
  }
  if (signals.hasSearchForm) {
    score += 2;
    reasons.push("存在搜索条件或 onSearch 信号");
    interactionTraits.push("search-form");
  }
  if (signals.hasPaging) {
    score += 2;
    reasons.push("存在分页状态或 page-change 信号");
    dataFlowTraits.push("pagination");
  }
  if (signals.hasCrudAction) {
    score += 2;
    reasons.push("存在增删改动作信号");
    interactionTraits.push("crud-actions");
  }
  if (signals.hasListFetch) {
    score += 1;
    reasons.push("存在列表加载流");
    dataFlowTraits.push("list-fetch");
  }
  if (signals.pageContainer) reasons.push(`存在页面容器 ${signals.pageContainer}`);
  if (signals.pageContainer) score += 1;
  if (signals.hasPcDialog) interactionTraits.push("dialog-entry");
  if (signals.linkedFragmentCount > 0) {
    reasons.push(`uses ${signals.linkedFragmentCount} linked fragment components`);
    interactionTraits.push("uses-linked-fragments");
  }
  if (signals.transitiveLinkedFragmentCount > signals.linkedFragmentCount) {
    reasons.push(`reaches ${signals.transitiveLinkedFragmentCount} fragments through transitive components`);
    interactionTraits.push("uses-transitive-fragments");
  }
  if (treeScore >= 6) {
    score -= 3;
    reasons.push("页面更接近树列表场景，降低基础列表得分");
  }

  if (score < 5) return null;
  const subpattern = signals.hasPcDialog ? "basic-list-with-dialog" : (signals.hasCrudAction ? "basic-list-crud" : "basic-list-readonly");
  return createCandidate({
    type: "basic-list-page",
    subpattern,
    sceneType: "list-page",
    score,
    reasons,
    interactionTraits,
    dataFlowTraits,
    componentStack: {
      page: signals.pageContainer,
      tree: "",
      table: signals.hasPcTableWarp ? "pc-table-warp" : "",
      dialog: signals.hasPcDialog ? "pc-dialog" : ""
    },
    fileRole: signals.fileRole
  });
}

function detectTreeListPattern(signals) {
  if (!canAnalyzeRole(signals.fileRole)) return null;
  let score = 0;
  const reasons = [];
  const interactionTraits = [];
  const dataFlowTraits = [];

  if (signals.rootFlags.hasRootCommonLayout) {
    score += 3;
    reasons.push("存在 CommonLayoutContainer 页面骨架");
  }
  if (signals.rootFlags.hasPageLevelTree) {
    score += 3;
    reasons.push("存在页面级 PcTree");
    interactionTraits.push("tree-panel");
  }
  if (signals.hasPcTableWarp) {
    score += 2;
    reasons.push("存在 pc-table-warp");
    interactionTraits.push("list-table");
  }
  if (signals.hasTreeRefresh) {
    score += 2;
    reasons.push("存在树节点联动或刷新信号");
    dataFlowTraits.push("tree-driven-refresh");
  }
  if (signals.hasPcDialog) {
    score += 1;
    reasons.push("存在弹窗补充流程");
    interactionTraits.push("dialog-entry");
  }
  if (signals.linkedFragmentCount > 0) {
    reasons.push(`uses ${signals.linkedFragmentCount} linked fragment components`);
    interactionTraits.push("uses-linked-fragments");
  }
  if (signals.transitiveLinkedFragmentCount > signals.linkedFragmentCount) {
    reasons.push(`reaches ${signals.transitiveLinkedFragmentCount} fragments through transitive components`);
    interactionTraits.push("uses-transitive-fragments");
  }

  if (score < 6) return null;
  return createCandidate({
    type: "tree-list-page",
    subpattern: signals.hasPcDialog ? "tree-list-with-dialog" : "tree-list-basic",
    sceneType: "tree-list-page",
    score,
    reasons,
    interactionTraits,
    dataFlowTraits,
    componentStack: {
      page: signals.pageContainer,
      tree: signals.treeComponent || "PcTree",
      table: signals.hasPcTableWarp ? "pc-table-warp" : "",
      dialog: signals.hasPcDialog ? "pc-dialog" : ""
    },
    fileRole: signals.fileRole
  });
}

function detectDialogFormPattern(signals) {
  const allowedRoles = new Set(["page", "page-candidate", "dialog-fragment"]);
  if (!allowedRoles.has(signals.fileRole)) return null;
  let score = 0;
  const reasons = [];
  const interactionTraits = [];
  const dataFlowTraits = [];

  if (signals.hasPcDialog) {
    score += 3;
    reasons.push("存在 pc-dialog");
    interactionTraits.push("dialog-shell");
  }
  if (signals.hasFormModel) {
    score += 2;
    reasons.push("存在表单模型或 el-form");
    interactionTraits.push("form-model");
  }
  if (signals.hasSubmitAction) {
    score += 2;
    reasons.push("存在提交流转");
    dataFlowTraits.push("submit-flow");
  }
  if (signals.hasCrudAction) {
    score += 1;
    reasons.push("存在新增或编辑动作入口");
    interactionTraits.push("crud-actions");
  }
  if (signals.hasPcTableWarp) {
    score += 1;
    reasons.push("弹窗内伴随表格展示");
    interactionTraits.push("table-in-dialog");
  }
  if (signals.fileRole === "dialog-fragment") {
    score += 1;
    reasons.push("文件角色是 dialog-fragment");
  }

  if (signals.linkedDialogFragmentCount > 0) {
    score += 2;
    reasons.push(`uses ${signals.linkedDialogFragmentCount} linked dialog fragments`);
    interactionTraits.push("linked-dialog-fragment");
  }
  if (signals.transitiveLinkedDialogFragmentCount > signals.linkedDialogFragmentCount) {
    score += 2;
    reasons.push(`reaches ${signals.transitiveLinkedDialogFragmentCount} dialog fragments through transitive components`);
    interactionTraits.push("transitive-dialog-fragment");
  }
  if (!signals.hasPcDialog && signals.linkedHasPcDialog) {
    score += 1;
    reasons.push("dialog shell is provided by a linked fragment");
  }
  if (!signals.hasPcDialog && !signals.linkedHasPcDialog && signals.transitiveLinkedHasPcDialog) {
    score += 1;
    reasons.push("dialog shell is provided by a transitive linked fragment");
  }
  if (!signals.hasFormModel && signals.linkedHasFormModel) {
    score += 1;
    reasons.push("form model is provided by a linked fragment");
  }
  if (!signals.hasFormModel && !signals.linkedHasFormModel && signals.transitiveLinkedHasFormModel) {
    score += 1;
    reasons.push("form model is provided by a transitive linked fragment");
  }
  if (!signals.hasSubmitAction && signals.linkedHasSubmitAction) {
    score += 1;
    reasons.push("submit flow is provided by a linked fragment");
  }
  if (!signals.hasSubmitAction && !signals.linkedHasSubmitAction && signals.transitiveLinkedHasSubmitAction) {
    score += 1;
    reasons.push("submit flow is provided by a transitive linked fragment");
  }
  if (!signals.hasCrudAction && signals.linkedHasCrudAction) {
    score += 1;
    reasons.push("crud entry and dialog flow are split across linked fragments");
  }
  if (!signals.hasCrudAction && !signals.linkedHasCrudAction && signals.transitiveLinkedHasCrudAction) {
    score += 1;
    reasons.push("crud entry and dialog flow are split across transitive linked fragments");
  }
  if (signals.transitiveLinkedFragmentCount > signals.linkedFragmentCount) reasons.push(`reaches ${signals.transitiveLinkedFragmentCount} fragments through transitive components`);
  if (score < 5) return null;
  const subpattern = signals.fileRole === "dialog-fragment"
    ? "fragment-dialog-form"
    : (signals.hasPcTableWarp ? "dialog-form-with-table" : "page-dialog-form");
  return createCandidate({
    type: "dialog-form",
    subpattern,
    sceneType: signals.fileRole === "dialog-fragment" ? "dialog-fragment" : "page-dialog-flow",
    score,
    reasons,
    interactionTraits,
    dataFlowTraits,
    componentStack: {
      page: signals.pageContainer,
      tree: signals.treeComponent,
      table: signals.hasPcTableWarp ? "pc-table-warp" : "",
      dialog: "pc-dialog"
    },
    fileRole: signals.fileRole
  });
}

function detectDetailPagePattern(signals) {
  if (!canAnalyzeRole(signals.fileRole)) return null;
  if (signals.basename === "add.vue" || signals.basename === "edit.vue") return null;

  const hasDetailFileName = signals.basename === "detail.vue" || signals.basename === "view.vue" || signals.basename === "read.vue";
  if (!signals.hasReadOnlyView && !signals.hasDetailLoad && !hasDetailFileName) return null;
  if (signals.hasEditableForm || signals.hasSubmitAction) return null;

  let score = 0;
  const reasons = [];
  const interactionTraits = ["readonly-view"];
  const dataFlowTraits = [];

  if (signals.hasReadOnlyView) {
    score += 3;
    reasons.push("存在只读展示信号");
  }
  if (signals.hasDetailLoad) {
    score += 2;
    reasons.push("存在详情加载流");
    dataFlowTraits.push("detail-fetch");
  }
  if (!signals.hasEditableForm) {
    score += 1;
    reasons.push("未识别出可编辑表单结构");
  }
  if (!signals.hasSubmitAction) {
    score += 1;
    reasons.push("未识别出提交保存流程");
  }
  if (hasDetailFileName) {
    score += 1;
    reasons.push("文件名接近详情页约定");
  }
  if (signals.hasTabs) {
    score += 1;
    reasons.push("存在 tabs 结构");
    interactionTraits.push("tabs");
  }
  if (signals.hasPcTableWarp) {
    score += 1;
    reasons.push("详情页内包含关联表格");
    interactionTraits.push("related-table");
  }

  if (score < 5) return null;
  const subpattern = signals.hasTabs ? "detail-with-tabs" : (signals.hasPcTableWarp ? "detail-with-related-table" : "readonly-detail");
  return createCandidate({
    type: "detail-page",
    subpattern,
    sceneType: "detail-page",
    score,
    reasons,
    interactionTraits,
    dataFlowTraits,
    componentStack: {
      page: signals.pageContainer,
      tree: "",
      table: signals.hasPcTableWarp ? "pc-table-warp" : "",
      dialog: signals.hasPcDialog ? "pc-dialog" : ""
    },
    fileRole: signals.fileRole
  });
}

export function detectFilePatterns(signals) {
  const treeCandidate = detectTreeListPattern(signals);
  return [
    treeCandidate,
    detectBasicListPattern(signals, treeCandidate?.score || 0),
    detectDialogFormPattern(signals),
    detectDetailPagePattern(signals)
  ]
    .filter(Boolean)
    .map((candidate) => ({ ...candidate, files: [signals.relativePath], entity: signals.entity }))
    .sort((left, right) => right.score - left.score || left.type.localeCompare(right.type, "zh-CN"));
}
