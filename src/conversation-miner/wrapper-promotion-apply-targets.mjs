import path from "node:path";
import { buildWrapperPromotionTestSnippets } from "./wrapper-promotion-scaffolds.mjs";
import {
  appendSnippetIfMissing,
  insertArrayItemBeforeClosing,
  insertSelectionCommand,
  insertSnippetBeforeMarker
} from "./wrapper-promotion-text-edits.mjs";

function insertCommandRunnerRegistration(text, artifacts) {
  const presenceCheck = `projectCommands.${artifacts.functionName}`;
  if (text.includes(presenceCheck)) {
    return { text, changed: false };
  }

  const registryMarker = '    "tool-capture-session": () => projectCommands.toolCaptureSessionCommand(),';
  if (text.includes(registryMarker)) {
    return insertSnippetBeforeMarker(text, {
      marker: registryMarker,
      snippet: artifacts.commandHandlerEntry,
      presenceCheck,
      label: "src/commands/index.mjs"
    });
  }

  const legacyMarker = '    else if (cliArgs.command === "tool-capture-session")';
  if (text.includes(legacyMarker)) {
    return insertSnippetBeforeMarker(text, {
      marker: legacyMarker,
      snippet: artifacts.commandRunnerSnippet,
      presenceCheck,
      label: "src/commands/index.mjs"
    });
  }

  throw new Error("Unable to apply wrapper promotion: missing command runner marker in src/commands/index.mjs.");
}

export function buildWrapperPromotionApplyTargets({ proposal, artifacts }) {
  const testSnippets = buildWrapperPromotionTestSnippets({ proposal, artifacts });
  const conversationMinerTestPresence = proposal.integrationStyle === "gui"
    ? `${proposal.toolName}-host-bridge generated wrapper sample captures records end to end`
    : `${artifacts.commandName} generated wrapper sample captures records end to end`;
  const targets = [
    {
      relativePath: path.join("src", "conversation-miner", "wrappers.mjs"),
      apply(text) {
        return insertArrayItemBeforeClosing(text, {
          closingMarker: "];",
          itemSnippet: artifacts.wrapperEntry,
          presenceCheck: `toolName: "${proposal.toolName}"`,
          label: "src/conversation-miner/wrappers.mjs"
        });
      }
    },
    {
      relativePath: path.join("src", "commands", "project-commands.mjs"),
      apply(text) {
        return insertSnippetBeforeMarker(text, {
          marker: "  async function toolCaptureSessionCommand() {",
          snippet: artifacts.projectCommandsSnippet,
          presenceCheck: `async function ${artifacts.functionName}() {`,
          label: "src/commands/project-commands.mjs"
        });
      }
    },
    {
      relativePath: path.join("src", "commands", "index.mjs"),
      apply(text) {
        return insertCommandRunnerRegistration(text, artifacts);
      }
    },
    {
      relativePath: path.join("src", "selection", "cli.mjs"),
      apply(text) {
        return insertSelectionCommand(text, artifacts.commandName);
      }
    },
    {
      relativePath: path.join("tests", "conversation-miner.test.mjs"),
      apply(text) {
        return appendSnippetIfMissing(text, {
          snippet: testSnippets.conversationMinerTestSnippet,
          presenceCheck: conversationMinerTestPresence
        });
      }
    },
    {
      relativePath: path.join("tests", "selection.test.mjs"),
      apply(text) {
        return appendSnippetIfMissing(text, {
          snippet: testSnippets.selectionTestSnippet,
          presenceCheck: `resolveProjectRoot keeps cwd for ${artifacts.commandName}`
        });
      }
    }
  ];

  if (proposal.integrationStyle === "gui" && artifacts.hostBridgeSnippet) {
    targets.push({
      relativePath: path.join("src", "conversation-miner", "index.mjs"),
      apply(text) {
        return insertSnippetBeforeMarker(text, {
          marker: "    return paths;",
          snippet: artifacts.hostBridgeSnippet,
          presenceCheck: `${proposal.toolName}-host-bridge.example.ps1`,
          label: "src/conversation-miner/index.mjs"
        });
      }
    });
  }

  return targets;
}
