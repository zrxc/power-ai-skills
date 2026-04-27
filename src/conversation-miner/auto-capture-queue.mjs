import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "../shared/fs.mjs";
import {
  createAutoCaptureRequestId,
  createAutoCaptureResponseId,
  resolveAutoCaptureResponseSource,
  sleep
} from "./records.mjs";
import { classifyAutoCaptureBoundary } from "./capture-review-boundary.mjs";

export function createAutoCaptureQueueService({
  projectRoot,
  ensureConversationRoots,
  loadConversationMinerConfig,
  evaluateSessionCapture,
  captureNormalizedRecords
}) {
  function queueAutoCaptureResponse({ responsePath = "", stdinText = "", toolName = "", consumeNow = false } = {}) {
    const paths = ensureConversationRoots();
    const source = resolveAutoCaptureResponseSource({ responsePath, stdinText });
    if (!String(source.responseText || "").trim()) throw new Error("Auto capture response source was empty.");

    const requestId = createAutoCaptureResponseId(toolName || "unknown");
    const queueFilePath = path.join(paths.autoCaptureResponseInboxRoot, `${requestId}.json`);
    const payload = {
      version: "1.2.1",
      requestId,
      status: "queued",
      queuedAt: new Date().toISOString(),
      projectName: path.basename(projectRoot),
      toolName: String(toolName || "").trim().toLowerCase(),
      source: {
        type: source.sourceType,
        path: source.sourcePath
      },
      responseText: source.responseText
    };
    writeJson(queueFilePath, payload);

    let consumed = null;
    if (consumeNow) {
      consumed = consumeAutoCaptureResponseInbox({
        maxItems: 1,
        requestId
      });
    }

    return {
      queuedAt: payload.queuedAt,
      queued: true,
      requestId,
      queueFilePath,
      toolName: payload.toolName,
      consumed
    };
  }

  function submitAutoCapture({
    inputPath = "",
    responsePath = "",
    stdinText = "",
    extractMarkedBlock = false,
    saveExtractedPath = "",
    toolName = "",
    consumeNow = false
  } = {}) {
    const paths = ensureConversationRoots();
    const evaluation = evaluateSessionCapture({
      inputPath,
      responsePath,
      stdinText,
      extractMarkedBlock,
      saveExtractedPath,
      toolName
    });
    const selectedEvaluations = evaluation.evaluations.filter((item) => item.decision === "ask_capture");
    const reviewBoundary = classifyAutoCaptureBoundary(selectedEvaluations);

    if (selectedEvaluations.length === 0) {
      return {
        submittedAt: new Date().toISOString(),
        submitted: false,
        autoCaptureDecision: reviewBoundary.autoCaptureDecision,
        requestId: "",
        queueFilePath: "",
        overallDecision: evaluation.overallDecision,
        summary: evaluation.summary,
        reviewBoundary,
        evaluation,
        consumed: null
      };
    }

    if (reviewBoundary.reviewRequiredCount > 0) {
      return {
        submittedAt: new Date().toISOString(),
        submitted: false,
        autoCaptureDecision: "review_required",
        requestId: "",
        queueFilePath: "",
        overallDecision: evaluation.overallDecision,
        summary: evaluation.summary,
        reviewBoundary,
        evaluation,
        consumed: null
      };
    }

    const requestId = createAutoCaptureRequestId(selectedEvaluations.map((item) => item.record));
    const queueFilePath = path.join(paths.autoCaptureInboxRoot, `${requestId}.json`);
    const payload = {
      version: "1.2.0",
      requestId,
      status: "queued",
      queuedAt: new Date().toISOString(),
      projectName: path.basename(projectRoot),
      toolName: toolName || selectedEvaluations[0]?.record?.toolUsed || "",
      source: evaluation.source,
      summary: evaluation.summary,
      records: selectedEvaluations.map((item) => item.record)
    };
    writeJson(queueFilePath, payload);

    let consumed = null;
    if (consumeNow) {
      consumed = consumeAutoCaptureInbox({
        maxItems: 1,
        requestId
      });
    }

    return {
      submittedAt: payload.queuedAt,
      submitted: true,
      autoCaptureDecision: reviewBoundary.autoCaptureDecision,
      requestId,
      queueFilePath,
      overallDecision: evaluation.overallDecision,
      summary: evaluation.summary,
      reviewBoundary,
      evaluation,
      consumed
    };
  }

  function consumeAutoCaptureResponseInbox({ maxItems = 0, requestId = "" } = {}) {
    const paths = ensureConversationRoots();
    const requestedMaxItems = Number(maxItems) > 0 ? Number(maxItems) : Infinity;
    const inboxFiles = fs.existsSync(paths.autoCaptureResponseInboxRoot)
      ? fs.readdirSync(paths.autoCaptureResponseInboxRoot)
        .filter((fileName) => fileName.endsWith(".json"))
        .sort((left, right) => left.localeCompare(right, "zh-CN"))
      : [];

    const processedRequests = [];
    const failedRequests = [];
    let processedItems = 0;

    for (const fileName of inboxFiles) {
      if (processedItems >= requestedMaxItems) break;
      const queueFilePath = path.join(paths.autoCaptureResponseInboxRoot, fileName);
      const payload = readJson(queueFilePath);
      if (requestId && payload.requestId !== requestId) continue;

      try {
        const submitted = submitAutoCapture({
          stdinText: payload.responseText || "",
          extractMarkedBlock: true,
          toolName: payload.toolName || "",
          consumeNow: true
        });

        const processedPayload = {
          ...payload,
          status: "processed",
          processedAt: new Date().toISOString(),
          submitted
        };
        writeJson(path.join(paths.autoCaptureResponseProcessedRoot, fileName), processedPayload);
        fs.rmSync(queueFilePath, { force: true });
        processedRequests.push({
          requestId: payload.requestId,
          queueFilePath,
          submitted
        });
      } catch (error) {
        const failedPayload = {
          ...payload,
          status: "failed",
          failedAt: new Date().toISOString(),
          error: {
            message: error instanceof Error ? error.message : String(error)
          }
        };
        writeJson(path.join(paths.autoCaptureResponseFailedRoot, fileName), failedPayload);
        fs.rmSync(queueFilePath, { force: true });
        failedRequests.push({
          requestId: payload.requestId,
          queueFilePath,
          error: failedPayload.error.message
        });
      }

      processedItems += 1;
      if (requestId) break;
    }

    return {
      consumedAt: new Date().toISOString(),
      requestId: requestId || "",
      processedCount: processedRequests.length,
      failedCount: failedRequests.length,
      processedRequests,
      failedRequests
    };
  }

  function consumeAutoCaptureInbox({ maxItems = 0, requestId = "" } = {}) {
    const paths = ensureConversationRoots();
    const requestedMaxItems = Number(maxItems) > 0 ? Number(maxItems) : Infinity;
    const inboxFiles = fs.existsSync(paths.autoCaptureInboxRoot)
      ? fs.readdirSync(paths.autoCaptureInboxRoot)
        .filter((fileName) => fileName.endsWith(".json"))
        .sort((left, right) => left.localeCompare(right, "zh-CN"))
      : [];

    const processedRequests = [];
    const failedRequests = [];
    let processedItems = 0;

    for (const fileName of inboxFiles) {
      if (processedItems >= requestedMaxItems) break;
      const queueFilePath = path.join(paths.autoCaptureInboxRoot, fileName);
      const payload = readJson(queueFilePath);
      if (requestId && payload.requestId !== requestId) continue;

      try {
        const captureResult = captureNormalizedRecords(payload.records || []);
        const processedPayload = {
          ...payload,
          status: "captured",
          consumedAt: new Date().toISOString(),
          captureResult: {
            recordsAdded: captureResult.recordsAdded,
            dates: captureResult.dates,
            filesTouched: captureResult.filesTouched
          }
        };
        writeJson(path.join(paths.autoCaptureProcessedRoot, fileName), processedPayload);
        fs.rmSync(queueFilePath, { force: true });
        processedRequests.push({
          requestId: payload.requestId,
          queueFilePath,
          recordsAdded: captureResult.recordsAdded,
          dates: captureResult.dates,
          filesTouched: captureResult.filesTouched
        });
      } catch (error) {
        const failedPayload = {
          ...payload,
          status: "failed",
          failedAt: new Date().toISOString(),
          error: {
            message: error instanceof Error ? error.message : String(error)
          }
        };
        writeJson(path.join(paths.autoCaptureFailedRoot, fileName), failedPayload);
        fs.rmSync(queueFilePath, { force: true });
        failedRequests.push({
          requestId: payload.requestId,
          queueFilePath,
          error: failedPayload.error.message
        });
      }

      processedItems += 1;
      if (requestId) break;
    }

    return {
      consumedAt: new Date().toISOString(),
      requestId: requestId || "",
      processedCount: processedRequests.length,
      failedCount: failedRequests.length,
      processedRequests,
      failedRequests
    };
  }

  async function watchAutoCaptureInbox({ once = false, pollIntervalMs = 0, maxItems = 0 } = {}) {
    const paths = ensureConversationRoots();
    const config = loadConversationMinerConfig(paths);
    const resolvedPollIntervalMs = Number(pollIntervalMs) > 0 ? Number(pollIntervalMs) : Number(config.autoCapture?.pollIntervalMs || 1500);
    const resolvedMaxItems = Number(maxItems) > 0 ? Number(maxItems) : Number(config.autoCapture?.maxBatchSize || 10);

    if (once) {
      const responses = consumeAutoCaptureResponseInbox({ maxItems: resolvedMaxItems });
      const queued = consumeAutoCaptureInbox({ maxItems: resolvedMaxItems });
      return {
        watchedAt: new Date().toISOString(),
        responseInbox: responses,
        captureInbox: queued
      };
    }

    while (true) {
      consumeAutoCaptureResponseInbox({ maxItems: resolvedMaxItems });
      consumeAutoCaptureInbox({ maxItems: resolvedMaxItems });
      await sleep(resolvedPollIntervalMs);
    }
  }

  return {
    queueAutoCaptureResponse,
    submitAutoCapture,
    consumeAutoCaptureResponseInbox,
    consumeAutoCaptureInbox,
    watchAutoCaptureInbox
  };
}
