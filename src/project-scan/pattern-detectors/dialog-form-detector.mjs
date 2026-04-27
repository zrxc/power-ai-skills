import { createCandidate } from "./shared.mjs";

export function detectDialogFormPattern(signals) {
  const allowedRoles = new Set(["page", "page-candidate", "dialog-fragment"]);
  if (!allowedRoles.has(signals.fileRole)) return null;
  let score = 0;
  const reasons = [];
  const interactionTraits = [];
  const dataFlowTraits = [];

  if (signals.hasPcDialog) {
    score += 3;
    reasons.push("瀛樺湪 pc-dialog");
    interactionTraits.push("dialog-shell");
  }
  if (signals.hasFormModel) {
    score += 2;
    reasons.push("瀛樺湪琛ㄥ崟妯″瀷鎴?el-form");
    interactionTraits.push("form-model");
  }
  if (signals.hasSubmitAction) {
    score += 2;
    reasons.push("瀛樺湪鎻愪氦娴佽浆");
    dataFlowTraits.push("submit-flow");
  }
  if (signals.hasCrudAction) {
    score += 1;
    reasons.push("瀛樺湪鏂板鎴栫紪杈戝姩浣滃叆鍙?");
    interactionTraits.push("crud-actions");
  }
  if (signals.hasPcTableWarp) {
    score += 1;
    reasons.push("寮圭獥鍐呬即闅忚〃鏍煎睍绀?");
    interactionTraits.push("table-in-dialog");
  }
  if (signals.fileRole === "dialog-fragment") {
    score += 1;
    reasons.push("鏂囦欢瑙掕壊鏄?dialog-fragment");
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
