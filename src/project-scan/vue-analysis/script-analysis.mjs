import { parse as parseScriptAst } from "@babel/parser";
import { createScriptState, getStaticMemberPath } from "./shared.mjs";

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

export function analyzeScriptAst(scriptContent) {
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
