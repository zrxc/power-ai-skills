import { canAnalyzeRole, createCandidate } from "./shared.mjs";

export function detectBasicListPattern(signals, treeScore) {
  if (!canAnalyzeRole(signals.fileRole)) return null;
  let score = 0;
  const reasons = [];
  const interactionTraits = [];
  const dataFlowTraits = [];

  if (signals.hasPcTableWarp) {
    score += 2;
    reasons.push("瀛樺湪 pc-table-warp");
    interactionTraits.push("table-view");
  }
  if (signals.hasSearchForm) {
    score += 2;
    reasons.push("瀛樺湪鎼滅储鏉′欢鎴?onSearch 淇″彿");
    interactionTraits.push("search-form");
  }
  if (signals.hasPaging) {
    score += 2;
    reasons.push("瀛樺湪鍒嗛〉鐘舵€佹垨 page-change 淇″彿");
    dataFlowTraits.push("pagination");
  }
  if (signals.hasCrudAction) {
    score += 2;
    reasons.push("瀛樺湪澧炲垹鏀瑰姩浣滀俊鍙?");
    interactionTraits.push("crud-actions");
  }
  if (signals.hasListFetch) {
    score += 1;
    reasons.push("瀛樺湪鍒楄〃鍔犺浇娴?");
    dataFlowTraits.push("list-fetch");
  }
  if (signals.pageContainer) reasons.push(`瀛樺湪椤甸潰瀹瑰櫒 ${signals.pageContainer}`);
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
    reasons.push("椤甸潰鏇存帴杩戞爲鍒楄〃鍦烘櫙锛岄檷浣庡熀纭€鍒楄〃寰楀垎");
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
