import test from "node:test";
import assert from "node:assert/strict";
import {
  createCommandHandlers,
  listCommandDefinitions,
  PROJECT_ROOT_STRATEGIES
} from "../src/commands/registry.mjs";

test("command registry keeps unique command names and known root strategies", () => {
  const definitions = listCommandDefinitions();
  const commandNames = definitions.map((item) => item.name);

  assert.equal(new Set(commandNames).size, commandNames.length);
  assert.equal(commandNames.includes("init"), true);
  assert.equal(commandNames.includes("doctor"), true);
  assert.equal(commandNames.includes("review-wrapper-promotion"), true);

  for (const definition of definitions) {
    assert.equal(typeof definition.method, "string");
    assert.equal(["info", "project"].includes(definition.scope), true);
    assert.equal(
      Object.values(PROJECT_ROOT_STRATEGIES).includes(definition.projectRootStrategy),
      true,
      `unknown project root strategy for ${definition.name}`
    );
  }
});

test("command registry dispatches to the declared command source", async () => {
  const called = [];
  const commandHandlers = createCommandHandlers({
    infoCommands: {
      versionCommand() {
        called.push("info:version");
      }
    },
    projectCommands: {
      initCommand() {
        called.push("project:init");
      }
    }
  });

  await commandHandlers.version();
  await commandHandlers.init();

  assert.deepEqual(called, ["info:version", "project:init"]);
});
