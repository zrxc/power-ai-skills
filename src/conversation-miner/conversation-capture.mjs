/**
 * 对话捕获和录制模块
 * 
 * 职责：
 * - 对话记录的日常文件写入和管理
 * - 会话捕获评估和记录
 * - 待确认捕获请求的处理
 * 
 * 依赖外部服务：captureEvaluationService
 */
import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "../../scripts/shared.mjs";
import { extractDatePart, toUniqueSortedList } from "./records.mjs";

/**
 * 将记录追加到每日文件中
 * 如果记录已存在则更新，否则新增，并按时间戳和ID排序
 * 
 * @param {string} filePath - 每日记录文件路径
 * @param {string} date - 日期字符串
 * @param {Object} record - 记录对象
 */
function appendRecordToDailyFile(filePath, date, record) {
  const payload = fs.existsSync(filePath) ? readJson(filePath) : { date, records: [] };
  const existingIndex = payload.records.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) payload.records.splice(existingIndex, 1, record);
  else payload.records.push(record);
  payload.records.sort(
    (left, right) => String(left.timestamp).localeCompare(String(right.timestamp), "zh-CN")
    || String(left.id).localeCompare(String(right.id), "zh-CN")
  );
  writeJson(filePath, payload);
}

/**
 * 捕获标准化记录到每日文件
 * 
 * @param {Function} getPaths - 获取路径的函数
 * @param {Array} records - 记录数组
 * @returns {Object} 捕获结果
 */
export function captureNormalizedRecords(getPaths, records) {
  const filesTouched = new Set();
  const capturedRecords = [];

  for (const record of records) {
    const date = extractDatePart(record.timestamp);
    const dailyFilePath = path.join(getPaths().conversationsRoot, `${date}.json`);
    appendRecordToDailyFile(dailyFilePath, date, record);
    filesTouched.add(dailyFilePath);
    capturedRecords.push(record);
  }

  return {
    recordsAdded: capturedRecords.length,
    dates: toUniqueSortedList(capturedRecords.map((record) => extractDatePart(record.timestamp))),
    filesTouched: [...filesTouched].sort((left, right) => left.localeCompare(right, "zh-CN")),
    records: capturedRecords
  };
}

/**
 * 捕获会话记录
 * 评估会话捕获并根据强制标志决定是否捕获
 * 
 * @param {Object} captureEvaluationService - 捕获评估服务
 * @param {Function} getPaths - 获取路径的函数
 * @param {Object} options - 会话选项
 * @returns {Object} 捕获结果
 */
export function captureSession(captureEvaluationService, getPaths, {
  inputPath = "",
  responsePath = "",
  stdinText = "",
  extractMarkedBlock = false,
  saveExtractedPath = "",
  toolName = "",
  force = false
} = {}) {
  const evaluation = captureEvaluationService.evaluateSessionCapture({
    inputPath,
    responsePath,
    stdinText,
    extractMarkedBlock,
    saveExtractedPath,
    toolName
  });
  const selectedEvaluations = force
    ? evaluation.evaluations.filter((item) => item.captureSafetyGovernanceLevel !== "blocking")
    : evaluation.evaluations.filter((item) => item.decision === "ask_capture");
  const captureResult = captureNormalizedRecords(getPaths, selectedEvaluations.map((item) => item.record));
  const blockedBySafety = evaluation.evaluations.filter((item) => item.captureSafetyGovernanceLevel === "blocking").length;

  return {
    capturedAt: new Date().toISOString(),
    forced: force,
    recordsAdded: captureResult.recordsAdded,
    skippedRecords: evaluation.evaluations.length - captureResult.recordsAdded,
    blockedBySafety,
    dates: captureResult.dates,
    filesTouched: captureResult.filesTouched,
    records: captureResult.records,
    evaluation
  };
}

/**
 * 确认会话捕获
 * 处理待确认的捕获请求，根据reject标志决定是拒绝还是捕获
 * 
 * @param {Function} ensureConversationRoots - 确保目录存在的函数
 * @param {Function} captureNormalizedRecordsFunc - 捕获记录函数
 * @param {Object} options - 确认选项
 * @returns {Object} 确认结果
 */
export function confirmSessionCapture(ensureConversationRoots, captureNormalizedRecordsFunc, { requestId = "", reject = false } = {}) {
  if (!requestId) throw new Error("confirm-session-capture requires --request <id>.");
  const paths = ensureConversationRoots();
  const pendingFilePath = path.join(paths.pendingCapturesRoot, `${requestId}.json`);
  if (!fs.existsSync(pendingFilePath)) throw new Error(`Pending capture request not found: ${requestId}`);

  const pendingPayload = readJson(pendingFilePath);
  const pendingRecords = pendingPayload.askCaptureRecords || [];

  if (reject) {
    fs.rmSync(pendingFilePath, { force: true });
    return {
      requestId,
      resolvedAt: new Date().toISOString(),
      status: "rejected",
      recordsAdded: 0,
      filesTouched: [],
      pendingFilePath
    };
  }

  const captureResult = captureNormalizedRecordsFunc(pendingRecords);
  fs.rmSync(pendingFilePath, { force: true });
  return {
    requestId,
    resolvedAt: new Date().toISOString(),
    status: "captured",
    recordsAdded: captureResult.recordsAdded,
    dates: captureResult.dates,
    filesTouched: captureResult.filesTouched,
    records: captureResult.records,
    pendingFilePath
  };
}
