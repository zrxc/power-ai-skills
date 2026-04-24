import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeContext } from "../src/context.mjs";
import { createRenderingService } from "../src/rendering/index.mjs";

function createRenderingTestContext() {
  const context = createRuntimeContext(import.meta.url);
  const renderingService = createRenderingService({ context });
  return { context, renderingService };
}

test("renderManagedTemplate replaces placeholders for shared AGENTS template", () => {
  const { context, renderingService } = createRenderingTestContext();
  const templateDefinition = context.templateMap.get("shared-agents");
  const templatePath = path.join(context.templatesRoot, ...templateDefinition.source.split("/"));
  const templateContent = fs.readFileSync(templatePath, "utf8");
  const rendered = renderingService.renderManagedTemplate(templateDefinition, templateContent);

  assert.equal(rendered.includes(context.executionFlowPlaceholder), false);
  assert.equal(rendered.includes(context.readPriorityPlaceholder), false);
  assert.equal(rendered.includes(context.conversationCapturePlaceholder), false);
  assert.match(rendered, /AGENTS\.md/);
  assert.match(rendered, /\.power-ai\/skills\/orchestration\/entry-skill\//);
  assert.match(rendered, /POWER_AI_SESSION_SUMMARY_V1/);
});

test("renderManagedTemplate resolves definitions by output path", () => {
  const { renderingService } = createRenderingTestContext();
  const rendered = renderingService.renderManagedTemplate(
    "adapters/cursor/skills.mdc",
    "Execution:\n{{POWER_AI_EXECUTION_FLOW}}\nPriority:\n{{POWER_AI_READ_PRIORITY}}\nCapture:\n{{POWER_AI_CONVERSATION_CAPTURE}}\n"
  );

  assert.equal(rendered.includes("{{POWER_AI_EXECUTION_FLOW}}"), false);
  assert.equal(rendered.includes("{{POWER_AI_READ_PRIORITY}}"), false);
  assert.equal(rendered.includes("{{POWER_AI_CONVERSATION_CAPTURE}}"), false);
  assert.match(rendered, /\.cursor\/rules\/skills\.mdc/);
  assert.match(rendered, /AGENTS\.md/);
  assert.match(rendered, /conversation-capture-contract\.md/);
});

test("renderManagedTemplate rejects unknown placeholders", () => {
  const { renderingService } = createRenderingTestContext();
  assert.throws(
    () =>
      renderingService.renderManagedTemplate(
        {
          name: "invalid-template",
          output: "shared/invalid.md",
          ownerTool: "agents-md",
          placeholders: ["POWER_AI_UNKNOWN"]
        },
        "{{POWER_AI_UNKNOWN}}"
      ),
    /Unsupported placeholder/
  );
});
