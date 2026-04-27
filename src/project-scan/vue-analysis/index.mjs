import { parse as parseSfc } from "@vue/compiler-sfc";
import { analyzeScriptAst } from "./script-analysis.mjs";
import { buildScriptSignals } from "./signal-synthesis.mjs";
import { analyzeTemplateAst } from "./template-analysis.mjs";

export { analyzeTemplateAst } from "./template-analysis.mjs";
export { analyzeScriptAst } from "./script-analysis.mjs";
export { buildScriptSignals } from "./signal-synthesis.mjs";

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
