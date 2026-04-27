import { canAnalyzeRole, createCandidate } from "./shared.mjs";

export function detectTreeListPattern(signals) {
  if (!canAnalyzeRole(signals.fileRole)) return null;
  let score = 0;
  const reasons = [];
  const interactionTraits = [];
  const dataFlowTraits = [];

  if (signals.rootFlags.hasRootCommonLayout) {
    score += 3;
    reasons.push("瀛樺湪 CommonLayoutContainer 椤甸潰楠ㄦ灦");
  }
  if (signals.rootFlags.hasPageLevelTree) {
    score += 3;
    reasons.push("瀛樺湪椤甸潰绾?PcTree");
    interactionTraits.push("tree-panel");
  }
  if (signals.hasPcTableWarp) {
    score += 2;
    reasons.push("瀛樺湪 pc-table-warp");
    interactionTraits.push("list-table");
  }
  if (signals.hasTreeRefresh) {
    score += 2;
    reasons.push("瀛樺湪鏍戣妭鐐硅仈鍔ㄦ垨鍒锋柊淇″彿");
    dataFlowTraits.push("tree-driven-refresh");
  }
  if (signals.hasPcDialog) {
    score += 1;
    reasons.push("瀛樺湪寮圭獥琛ュ厖娴佺▼");
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
