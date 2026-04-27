import fs from "node:fs";
import path from "node:path";
import { ensureDir, readJson, writeJson } from "../shared/fs.mjs";
import { supportedCaptureWrappers } from "./wrappers.mjs";

const DEFAULT_STALE_MINUTES = 30;
const RECENT_ACTIVITY_MINUTES = 24 * 60;

function safeReadJson(filePath) {
  try {
    return readJson(filePath);
  } catch {
    return null;
  }
}

function resolveTimestamp(payload, fields) {
  for (const field of fields) {
    const value = payload?.[field];
    if (!value) continue;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return {
        value,
        parsed
      };
    }
  }
  return {
    value: "",
    parsed: Number.NaN
  };
}

function summarizeJsonDirectory(rootPath, timestampFields, staleMinutes) {
  if (!fs.existsSync(rootPath)) {
    return {
      exists: false,
      rootPath,
      count: 0,
      unreadableCount: 0,
      oldestAt: "",
      newestAt: "",
      oldestAgeMinutes: null,
      newestAgeMinutes: null,
      staleCount: 0
    };
  }

  const now = Date.now();
  const files = fs.readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(rootPath, entry.name));

  let unreadableCount = 0;
  let oldestParsed = Number.POSITIVE_INFINITY;
  let newestParsed = Number.NEGATIVE_INFINITY;
  let oldestAt = "";
  let newestAt = "";
  let staleCount = 0;

  for (const filePath of files) {
    const payload = safeReadJson(filePath);
    if (!payload) {
      unreadableCount += 1;
      continue;
    }

    const timestamp = resolveTimestamp(payload, timestampFields);
    if (!Number.isFinite(timestamp.parsed)) continue;

    if ((now - timestamp.parsed) / 60000 >= staleMinutes) {
      staleCount += 1;
    }

    if (timestamp.parsed < oldestParsed) {
      oldestParsed = timestamp.parsed;
      oldestAt = timestamp.value;
    }
    if (timestamp.parsed > newestParsed) {
      newestParsed = timestamp.parsed;
      newestAt = timestamp.value;
    }
  }

  return {
    exists: true,
    rootPath,
    count: files.length,
    unreadableCount,
    oldestAt,
    newestAt,
    oldestAgeMinutes: Number.isFinite(oldestParsed) ? Math.max(0, Math.floor((now - oldestParsed) / 60000)) : null,
    newestAgeMinutes: Number.isFinite(newestParsed) ? Math.max(0, Math.floor((now - newestParsed) / 60000)) : null,
    staleCount
  };
}

function buildBridgeCoverage(paths) {
  const wrapperScripts = supportedCaptureWrappers.map((wrapper) => {
    const scriptPath = path.join(paths.adaptersTarget, `${wrapper.toolName}-capture.example.ps1`);
    return {
      toolName: wrapper.toolName,
      displayName: wrapper.displayName,
      integrationStyle: wrapper.integrationStyle,
      scriptPath,
      exists: fs.existsSync(scriptPath)
    };
  });

  const hostBridgeScripts = supportedCaptureWrappers
    .filter((wrapper) => wrapper.integrationStyle === "gui")
    .map((wrapper) => {
      const scriptPath = path.join(paths.adaptersTarget, `${wrapper.toolName}-host-bridge.example.ps1`);
      return {
        toolName: wrapper.toolName,
        displayName: wrapper.displayName,
        scriptPath,
        exists: fs.existsSync(scriptPath)
      };
    });

  const runtimeScript = {
    scriptPath: paths.autoCaptureRuntimeScriptPath,
    exists: fs.existsSync(paths.autoCaptureRuntimeScriptPath)
  };

  const customWrapperScriptPath = path.join(paths.adaptersTarget, "custom-tool-capture.example.ps1");
  const customWrapperScript = {
    scriptPath: customWrapperScriptPath,
    exists: fs.existsSync(customWrapperScriptPath)
  };
  const bridgeContract = {
    jsonPath: paths.autoCaptureBridgeContractJsonPath,
    markdownPath: paths.autoCaptureBridgeContractMarkdownPath,
    jsonReady: fs.existsSync(paths.autoCaptureBridgeContractJsonPath),
    markdownReady: fs.existsSync(paths.autoCaptureBridgeContractMarkdownPath)
  };

  return {
    runtimeScript,
    customWrapperScript,
    bridgeContract,
    wrapperScripts,
    hostBridgeScripts,
    summary: {
      wrapperScriptCount: wrapperScripts.length,
      missingWrapperScripts: wrapperScripts.filter((item) => !item.exists).length,
      hostBridgeCount: hostBridgeScripts.length,
      missingHostBridgeScripts: hostBridgeScripts.filter((item) => !item.exists).length,
      runtimeScriptReady: runtimeScript.exists,
      customWrapperScriptReady: customWrapperScript.exists,
      bridgeContractReady: bridgeContract.jsonReady && bridgeContract.markdownReady
    }
  };
}

function buildRecommendedActions({
  autoCaptureEnabled,
  status,
  summary,
  bridgeCoverage,
  projectInitialized
}) {
  const actions = [];

  if (!projectInitialized) {
    actions.push("Run `npx power-ai-skills init` or `npx power-ai-skills sync` to scaffold the `.power-ai/auto-capture` workspace before enabling automatic capture.");
    return actions;
  }

  if (!autoCaptureEnabled) {
    actions.push("Enable `autoCapture.enabled` in `.power-ai/conversation-miner-config.json` if this project should collect sessions automatically.");
  }

  if (!bridgeCoverage.summary.runtimeScriptReady) {
    actions.push("Run `npx power-ai-skills sync` to restore the auto-capture runtime example script under `.power-ai/adapters`.");
  }

  if (!bridgeCoverage.summary.bridgeContractReady) {
    actions.push("Run `npx power-ai-skills sync` to restore the auto-capture bridge contract manifest under `.power-ai/adapters`.");
  }

  if (bridgeCoverage.summary.missingWrapperScripts > 0 || bridgeCoverage.summary.missingHostBridgeScripts > 0) {
    actions.push("Refresh adapter scaffolding with `npx power-ai-skills sync` so tool capture wrappers and host bridge examples are available.");
  }

  if (summary.responseBacklogCount > 0 || summary.captureBacklogCount > 0) {
    actions.push("Start the runtime watcher with `npx power-ai-skills watch-auto-capture-inbox` or consume pending queues manually to drain auto-capture backlog.");
  }

  if (summary.failedRequestCount > 0) {
    actions.push("Review `.power-ai/auto-capture/failed` and `.power-ai/auto-capture/response-failed` to clear failed auto-capture payloads before they pile up.");
  }

  if (status === "ok" && actions.length === 0) {
    actions.push("Auto-capture scaffolding and queues look healthy. Keep the host bridge and watcher running in consumer projects that require full automatic capture.");
  }

  return actions;
}

function buildAutoCaptureRuntimeMarkdown(payload) {
  const lines = [
    "# Auto Capture Runtime",
    "",
    `- Generated At: ${payload.generatedAt}`,
    `- Status: ${payload.status}`,
    `- Activity State: ${payload.summary.activityState}`,
    `- Auto Capture Enabled: ${payload.summary.autoCaptureEnabled}`,
    `- Capture Backlog: ${payload.summary.captureBacklogCount}`,
    `- Response Backlog: ${payload.summary.responseBacklogCount}`,
    `- Failed Requests: ${payload.summary.failedRequestCount}`,
    `- Stale Queued Capture Items: ${payload.summary.staleQueuedCaptureCount}`,
    `- Stale Queued Response Items: ${payload.summary.staleQueuedResponseCount}`,
    `- Last Activity At: ${payload.summary.lastActivityAt || "none"}`,
    "",
    "## Bridge Coverage",
    "",
    `- Runtime Script Ready: ${payload.bridgeCoverage.summary.runtimeScriptReady}`,
    `- Custom Wrapper Ready: ${payload.bridgeCoverage.summary.customWrapperScriptReady}`,
    `- Bridge Contract Ready: ${payload.bridgeCoverage.summary.bridgeContractReady}`,
    `- Missing Wrapper Scripts: ${payload.bridgeCoverage.summary.missingWrapperScripts}`,
    `- Missing Host Bridge Scripts: ${payload.bridgeCoverage.summary.missingHostBridgeScripts}`,
    `- Bridge Contract JSON: ${payload.bridgeCoverage.bridgeContract.jsonPath}`,
    `- Bridge Contract Markdown: ${payload.bridgeCoverage.bridgeContract.markdownPath}`,
    "",
    "## Recommended Actions",
    ""
  ];

  for (const action of payload.recommendedActions) {
    lines.push(`- ${action}`);
  }

  lines.push("", "## Queue Summary", "");
  for (const [key, queue] of Object.entries(payload.queues)) {
    lines.push(`### ${key}`);
    lines.push("");
    lines.push(`- Exists: ${queue.exists}`);
    lines.push(`- Count: ${queue.count}`);
    lines.push(`- Unreadable Count: ${queue.unreadableCount}`);
    lines.push(`- Oldest At: ${queue.oldestAt || "none"}`);
    lines.push(`- Oldest Age Minutes: ${queue.oldestAgeMinutes ?? "n/a"}`);
    lines.push(`- Newest At: ${queue.newestAt || "none"}`);
    lines.push(`- Newest Age Minutes: ${queue.newestAgeMinutes ?? "n/a"}`);
    lines.push(`- Stale Count: ${queue.staleCount}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function collectAutoCaptureRuntimeStatus({
  context,
  projectRoot,
  getPaths,
  loadConversationMinerConfig,
  staleMinutes = DEFAULT_STALE_MINUTES
}) {
  const resolvedStaleMinutes = Number(staleMinutes) > 0 ? Number(staleMinutes) : DEFAULT_STALE_MINUTES;
  const paths = getPaths();
  const projectInitialized = fs.existsSync(paths.powerAiRoot);
  const config = projectInitialized && fs.existsSync(paths.configPath)
    ? loadConversationMinerConfig(paths)
    : null;

  const captureInbox = summarizeJsonDirectory(paths.autoCaptureInboxRoot, ["queuedAt"], resolvedStaleMinutes);
  const responseInbox = summarizeJsonDirectory(paths.autoCaptureResponseInboxRoot, ["queuedAt"], resolvedStaleMinutes);
  const captureProcessed = summarizeJsonDirectory(paths.autoCaptureProcessedRoot, ["consumedAt", "processedAt"], resolvedStaleMinutes);
  const responseProcessed = summarizeJsonDirectory(paths.autoCaptureResponseProcessedRoot, ["processedAt", "submittedAt"], resolvedStaleMinutes);
  const captureFailed = summarizeJsonDirectory(paths.autoCaptureFailedRoot, ["failedAt"], resolvedStaleMinutes);
  const responseFailed = summarizeJsonDirectory(paths.autoCaptureResponseFailedRoot, ["failedAt"], resolvedStaleMinutes);
  const bridgeCoverage = buildBridgeCoverage(paths);

  const captureBacklogCount = captureInbox.count;
  const responseBacklogCount = responseInbox.count;
  const failedRequestCount = captureFailed.count + responseFailed.count;
  const staleQueuedCaptureCount = captureInbox.staleCount;
  const staleQueuedResponseCount = responseInbox.staleCount;
  const latestProcessedAgeMinutes = [captureProcessed.newestAgeMinutes, responseProcessed.newestAgeMinutes]
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)[0];
  const lastActivityAt = [captureProcessed.newestAt, responseProcessed.newestAt, captureInbox.newestAt, responseInbox.newestAt]
    .filter(Boolean)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] || "";

  let activityState = "idle";
  if (!projectInitialized) {
    activityState = "uninitialized";
  } else if (!config?.autoCapture?.enabled) {
    activityState = "disabled";
  } else if (failedRequestCount > 0) {
    activityState = "failing";
  } else if (captureBacklogCount > 0 || responseBacklogCount > 0) {
    activityState = "backlogged";
  } else if (Number.isFinite(latestProcessedAgeMinutes) && latestProcessedAgeMinutes <= RECENT_ACTIVITY_MINUTES) {
    activityState = "active";
  }

  const maxBatchSize = Number(config?.autoCapture?.maxBatchSize || 10);
  const backlogThreshold = Math.max(maxBatchSize * 2, 20);

  let status = "ok";
  if (!projectInitialized) {
    status = "attention";
  } else if (!config?.autoCapture?.enabled) {
    status = "disabled";
  } else if (failedRequestCount > 0) {
    status = "attention";
  } else if (
    staleQueuedCaptureCount > 0
    || staleQueuedResponseCount > 0
    || captureBacklogCount + responseBacklogCount >= backlogThreshold
    || !bridgeCoverage.summary.runtimeScriptReady
    || !bridgeCoverage.summary.bridgeContractReady
    || bridgeCoverage.summary.missingWrapperScripts > 0
    || bridgeCoverage.summary.missingHostBridgeScripts > 0
  ) {
    status = "warning";
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    packageName: context.packageJson.name,
    version: context.packageJson.version,
    projectRoot,
    status,
    summary: {
      autoCaptureEnabled: Boolean(config?.autoCapture?.enabled),
      activityState,
      staleMinutes: resolvedStaleMinutes,
      pollIntervalMs: Number(config?.autoCapture?.pollIntervalMs || 0),
      maxBatchSize,
      captureBacklogCount,
      responseBacklogCount,
      failedRequestCount,
      staleQueuedCaptureCount,
      staleQueuedResponseCount,
      lastActivityAt,
      lastProcessedAt: captureProcessed.newestAt || responseProcessed.newestAt || "",
      backlogThreshold
    },
    configuration: {
      exists: Boolean(config),
      configPath: paths.configPath,
      autoCapture: config?.autoCapture || null
    },
    queues: {
      captureInbox,
      responseInbox,
      captureProcessed,
      responseProcessed,
      captureFailed,
      responseFailed
    },
    bridgeCoverage,
    recommendedActions: buildRecommendedActions({
      autoCaptureEnabled: Boolean(config?.autoCapture?.enabled),
      status,
      summary: {
        captureBacklogCount,
        responseBacklogCount,
        failedRequestCount,
        staleQueuedCaptureCount,
        staleQueuedResponseCount
      },
      bridgeCoverage,
      projectInitialized
    })
  };

  return payload;
}

export function checkAutoCaptureRuntime(options, services) {
  const payload = collectAutoCaptureRuntimeStatus({
    context: services.context,
    projectRoot: services.projectRoot,
    getPaths: services.getPaths,
    loadConversationMinerConfig: services.loadConversationMinerConfig,
    staleMinutes: options?.staleMinutes
  });
  const reportPath = path.join(services.getPaths().reportsRoot, "auto-capture-runtime.md");
  const jsonPath = path.join(services.getPaths().reportsRoot, "auto-capture-runtime.json");
  ensureDir(path.dirname(reportPath));
  writeJson(jsonPath, payload);
  fs.writeFileSync(reportPath, buildAutoCaptureRuntimeMarkdown(payload), "utf8");
  return {
    ...payload,
    reportPath,
    jsonPath
  };
}
