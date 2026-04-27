import { canAnalyzeRole, createCandidate } from "./shared.mjs";

export function detectDetailPagePattern(signals) {
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
    reasons.push("瀛樺湪鍙灞曠ず淇″彿");
  }
  if (signals.hasDetailLoad) {
    score += 2;
    reasons.push("瀛樺湪璇︽儏鍔犺浇娴?");
    dataFlowTraits.push("detail-fetch");
  }
  if (!signals.hasEditableForm) {
    score += 1;
    reasons.push("鏈瘑鍒嚭鍙紪杈戣〃鍗曠粨鏋?");
  }
  if (!signals.hasSubmitAction) {
    score += 1;
    reasons.push("鏈瘑鍒嚭鎻愪氦淇濆瓨娴佺▼");
  }
  if (hasDetailFileName) {
    score += 1;
    reasons.push("鏂囦欢鍚嶆帴杩戣鎯呴〉绾﹀畾");
  }
  if (signals.hasTabs) {
    score += 1;
    reasons.push("瀛樺湪 tabs 缁撴瀯");
    interactionTraits.push("tabs");
  }
  if (signals.hasPcTableWarp) {
    score += 1;
    reasons.push("璇︽儏椤靛唴鍖呭惈鍏宠仈琛ㄦ牸");
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
