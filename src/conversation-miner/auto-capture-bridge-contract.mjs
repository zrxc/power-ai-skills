import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../../scripts/shared.mjs";
import { supportedCaptureWrappers } from "./wrappers.mjs";

function toPowerAiRelative(projectRoot, targetPath) {
  const relativePath = path.relative(projectRoot, targetPath).split(path.sep).join("/");
  return relativePath.startsWith(".power-ai/") ? relativePath : `./${relativePath}`;
}

function buildToolContract(wrapper, projectRoot, paths) {
  const captureScriptPath = path.join(paths.adaptersTarget, `${wrapper.toolName}-capture.example.ps1`);
  const hostBridgePath = path.join(paths.adaptersTarget, `${wrapper.toolName}-host-bridge.example.ps1`);
  const captureScriptExists = fs.existsSync(captureScriptPath);
  const hostBridgeExists = wrapper.integrationStyle === "gui" ? fs.existsSync(hostBridgePath) : false;

  return {
    toolName: wrapper.toolName,
    displayName: wrapper.displayName,
    commandName: wrapper.commandName,
    integrationStyle: wrapper.integrationStyle,
    preferredMode: wrapper.integrationStyle === "terminal" ? "direct-auto" : "host-bridge",
    commands: {
      directCapture: `npx power-ai-skills tool-capture-session --tool ${wrapper.toolName} --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json`,
      autoCapture: `npx power-ai-skills submit-auto-capture --tool ${wrapper.toolName} --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --consume-now --json`,
      responseBridge: `npx power-ai-skills queue-auto-capture-response --tool ${wrapper.toolName} --from-file .power-ai/tmp/assistant-response.txt --consume-now --json`
    },
    scripts: {
      captureScriptPath: toPowerAiRelative(projectRoot, captureScriptPath),
      captureScriptExists,
      hostBridgePath: wrapper.integrationStyle === "gui" ? toPowerAiRelative(projectRoot, hostBridgePath) : "",
      hostBridgeExists
    },
    queues: {
      responseInboxPath: toPowerAiRelative(projectRoot, paths.autoCaptureResponseInboxRoot),
      captureInboxPath: toPowerAiRelative(projectRoot, paths.autoCaptureInboxRoot)
    }
  };
}

function buildAutoCaptureBridgeContractMarkdown(contract) {
  const lines = [
    "# Auto Capture Bridge Contract",
    "",
    `- Generated At: ${contract.generatedAt}`,
    `- Package: ${contract.packageName}@${contract.version}`,
    `- Project Root: ${contract.projectRoot}`,
    "",
    "## Runtime",
    "",
    `- Enabled: ${contract.runtime.enabled}`,
    `- Poll Interval Ms: ${contract.runtime.pollIntervalMs}`,
    `- Max Batch Size: ${contract.runtime.maxBatchSize}`,
    `- Runtime Script: ${contract.runtime.runtimeScriptPath}`,
    `- Runtime Command: \`${contract.runtime.watchCommand}\``,
    "",
    "## Shared Paths",
    "",
    `- Guidance: ${contract.sharedPaths.guidancePath}`,
    `- Contract Reference: ${contract.sharedPaths.contractReferencePath}`,
    `- Response Inbox: ${contract.sharedPaths.responseInboxPath}`,
    `- Capture Inbox: ${contract.sharedPaths.captureInboxPath}`,
    "",
    "## Integration Rules",
    "",
    "- Terminal tools should prefer `submit-auto-capture --consume-now` or `<tool>-capture.example.ps1 -Auto`.",
    "- GUI or IDE tools should prefer `<tool>-host-bridge.example.ps1` or `queue-auto-capture-response --consume-now`.",
    "- Host tools that cannot execute CLI directly may drop confirmed reply text into `.power-ai/auto-capture/response-inbox/` and keep one watcher running.",
    "",
    "## Tool Matrix",
    ""
  ];

  for (const tool of contract.tools) {
    lines.push(`### ${tool.displayName} (\`${tool.toolName}\`)`);
    lines.push("");
    lines.push(`- Integration Style: ${tool.integrationStyle}`);
    lines.push(`- Preferred Mode: ${tool.preferredMode}`);
    lines.push(`- Capture Wrapper: ${tool.scripts.captureScriptPath} (exists: ${tool.scripts.captureScriptExists})`);
    if (tool.scripts.hostBridgePath) {
      lines.push(`- Host Bridge: ${tool.scripts.hostBridgePath} (exists: ${tool.scripts.hostBridgeExists})`);
    }
    lines.push(`- Direct Capture: \`${tool.commands.directCapture}\``);
    lines.push(`- Auto Capture: \`${tool.commands.autoCapture}\``);
    lines.push(`- Response Bridge: \`${tool.commands.responseBridge}\``);
    lines.push("");
  }

  lines.push("## Custom Tool Fallback", "");
  lines.push(`- Wrapper: ${contract.customTool.captureScriptPath}`);
  lines.push(`- Auto Mode Example: \`${contract.customTool.autoCaptureExample}\``);
  lines.push(`- Response Bridge Example: \`${contract.customTool.responseBridgeExample}\``);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function buildAutoCaptureBridgeContract({ context, projectRoot, paths, config }) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    projectRoot,
    runtime: {
      enabled: Boolean(config?.autoCapture?.enabled),
      pollIntervalMs: Number(config?.autoCapture?.pollIntervalMs || 0),
      maxBatchSize: Number(config?.autoCapture?.maxBatchSize || 0),
      runtimeScriptPath: toPowerAiRelative(projectRoot, paths.autoCaptureRuntimeScriptPath),
      watchCommand: "npx power-ai-skills watch-auto-capture-inbox --poll-interval-ms 1500 --max-items 10"
    },
    sharedPaths: {
      guidancePath: toPowerAiRelative(projectRoot, paths.sharedCaptureGuidancePath),
      contractReferencePath: toPowerAiRelative(projectRoot, paths.conversationCaptureContractPath),
      responseInboxPath: toPowerAiRelative(projectRoot, paths.autoCaptureResponseInboxRoot),
      captureInboxPath: toPowerAiRelative(projectRoot, paths.autoCaptureInboxRoot)
    },
    tools: supportedCaptureWrappers.map((wrapper) => buildToolContract(wrapper, projectRoot, paths)),
    customTool: {
      captureScriptPath: toPowerAiRelative(projectRoot, path.join(paths.adaptersTarget, "custom-tool-capture.example.ps1")),
      autoCaptureExample: "npx power-ai-skills submit-auto-capture --tool <name> --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --consume-now --json",
      responseBridgeExample: "npx power-ai-skills queue-auto-capture-response --tool <name> --from-file .power-ai/tmp/assistant-response.txt --consume-now --json"
    }
  };
}

export function writeAutoCaptureBridgeContract({ context, projectRoot, paths, config }) {
  const contract = buildAutoCaptureBridgeContract({
    context,
    projectRoot,
    paths,
    config
  });
  ensureDir(paths.adaptersTarget);
  writeJson(paths.autoCaptureBridgeContractJsonPath, contract);
  fs.writeFileSync(paths.autoCaptureBridgeContractMarkdownPath, buildAutoCaptureBridgeContractMarkdown(contract), "utf8");
  return {
    ...contract,
    contractPath: paths.autoCaptureBridgeContractJsonPath,
    markdownPath: paths.autoCaptureBridgeContractMarkdownPath
  };
}

export function showAutoCaptureBridgeContract(options, services) {
  const paths = services.getPaths();
  const config = services.loadConversationMinerConfig(paths);
  return writeAutoCaptureBridgeContract({
    context: services.context,
    projectRoot: services.projectRoot,
    paths,
    config
  });
}
