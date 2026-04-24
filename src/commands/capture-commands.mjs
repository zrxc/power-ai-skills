/**
 * 会话捕获命令模块
 * 职责：处理会话捕获、自动捕获、工具专用捕获相关命令
 * 包含：
 *   - 主捕获入口（captureSessionCommand）
 *   - 自动捕获提交/排队（submitAutoCaptureCommand、queueAutoCaptureResponseCommand）
 *   - 会话评估和准备（evaluateSessionCaptureCommand、prepareSessionCaptureCommand）
 *   - 确认和消费（confirmSessionCaptureCommand、consumeAutoCaptureInboxCommand 等）
 *   - 监视收件箱（watchAutoCaptureInboxCommand）
 *   - 工具捕获包装器（runToolCaptureWrapper）
 *   - 各工具专用捕获命令（codex、trae、cursor 等）
 */

import { createInterface } from "node:readline/promises";
import { getCaptureWrapper, supportedCaptureWrappers } from "../conversation-miner/wrappers.mjs";
import {
  formatAutoCaptureSkippedMessage,
  formatAutoCaptureSubmittedMessage,
  formatCaptureSessionMessage,
  formatConfirmSessionCaptureMessage,
  formatConsumeAutoCaptureInboxMessage,
  formatConsumeAutoCaptureResponseInboxMessage,
  formatQueuedAutoCaptureResponseMessage,
  formatToolCaptureDecisionMessage,
  formatToolCaptureSkippedMessage,
  formatWatchAutoCaptureInboxMessage
} from "./project-output.mjs";

/**
 * 创建会话捕获命令集
 * @param {Object} params - 依赖注入参数
 * @param {Object} params.cliArgs - CLI 参数对象
 * @param {Object} params.selectionService - 选择服务
 * @param {Object} params.conversationMinerService - 对话挖掘服务
 * @param {string} params.projectRoot - 项目根目录
 * @returns {Object} 会话捕获命令对象
 */
export function createCaptureCommands({
  cliArgs,
  selectionService,
  conversationMinerService,
  projectRoot
}) {
  /**
   * 获取单个选项值
   * @param {string} optionName - 选项名称
   * @param {string} fallback - 默认值
   * @returns {string} 选项值
   */
  function getSingleOption(optionName, fallback = "") {
    return (selectionService.getOptionValues(optionName) || [])[0] || fallback;
  }

  /**
   * 获取单个选项值（支持位置参数）
   * @param {string} optionName - 选项名称
   * @param {string} fallback - 默认值
   * @returns {string} 选项值
   */
  function getSingleOptionOrPositional(optionName, fallback = "") {
    return getSingleOption(optionName, cliArgs.positionals[0] || fallback);
  }

  /**
   * 获取数值型选项
   * @param {string} optionName - 选项名称
   * @returns {number} 数值
   */
  function getNumericOption(optionName) {
    return Number(getSingleOption(optionName, 0));
  }

  /**
   * JSON 输出辅助函数
   */
  function printJson(payload) {
    console.log(JSON.stringify(payload, null, 2));
  }

  function printJsonAndExit(payload) {
    if (!selectionService.hasFlag("--json")) return false;
    printJson(payload);
    return true;
  }

  /**
   * 读取标准输入文本
   * @returns {Promise<string>}
   */
  function readStdinText() {
    return new Promise((resolve, reject) => {
      const chunks = [];
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => chunks.push(chunk));
      process.stdin.on("end", () => resolve(chunks.join("")));
      process.stdin.on("error", reject);
    });
  }

  /**
   * 解析会话捕获参数
   * @returns {Promise<Object>} 捕获参数对象
   */
  async function resolveSessionCaptureArgs() {
    const useStdin = selectionService.hasFlag("--stdin");
    return {
      inputPath: getSingleOption("--input"),
      responsePath: getSingleOption("--from-file"),
      stdinText: useStdin ? await readStdinText() : "",
      extractMarkedBlock: selectionService.hasFlag("--extract-marked-block"),
      saveExtractedPath: getSingleOption("--save-extracted"),
      toolName: getSingleOption("--tool")
    };
  }

  /**
   * 提示用户确认
   * @param {string} message - 确认消息
   * @returns {Promise<boolean>} 用户是否确认
   */
  async function promptConfirmation(message) {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    try {
      const answer = (await readline.question(`${message} [Y/n]: `)).trim().toLowerCase();
      return !(answer === "n" || answer === "no" || answer === "reject");
    } finally {
      readline.close();
    }
  }

  /**
   * 捕获会话命令 - 主捕获入口
   */
  async function captureSessionCommand() {
    const captureArgs = await resolveSessionCaptureArgs();
    const result = conversationMinerService.captureSession({
      ...captureArgs,
      force: selectionService.hasFlag("--force")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatCaptureSessionMessage({ projectRoot, result }));
  }

  /**
   * 提交自动捕获命令
   */
  async function submitAutoCaptureCommand() {
    const captureArgs = await resolveSessionCaptureArgs();
    const result = conversationMinerService.submitAutoCapture({
      ...captureArgs,
      consumeNow: selectionService.hasFlag("--consume-now")
    });
    if (printJsonAndExit(result)) return;
    if (!result.submitted) {
      console.log(formatAutoCaptureSkippedMessage({ projectRoot, result }));
      return;
    }
    console.log(formatAutoCaptureSubmittedMessage(result));
  }

  /**
   * 排队自动捕获响应命令
   */
  async function queueAutoCaptureResponseCommand() {
    const captureArgs = await resolveSessionCaptureArgs();
    const result = conversationMinerService.queueAutoCaptureResponse({
      responsePath: captureArgs.responsePath,
      stdinText: captureArgs.stdinText,
      toolName: captureArgs.toolName,
      consumeNow: selectionService.hasFlag("--consume-now")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatQueuedAutoCaptureResponseMessage(result));
  }

  /**
   * 评估会话捕获命令 - 输出 JSON 格式的评估结果
   */
  async function evaluateSessionCaptureCommand() {
    const captureArgs = await resolveSessionCaptureArgs();
    const result = conversationMinerService.evaluateSessionCapture(captureArgs);
    printJson(result);
  }

  /**
   * 准备会话捕获命令 - 输出 JSON 格式的准备结果
   */
  async function prepareSessionCaptureCommand() {
    const captureArgs = await resolveSessionCaptureArgs();
    const result = conversationMinerService.prepareSessionCapture(captureArgs);
    printJson(result);
  }

  /**
   * 确认会话捕获命令
   */
  function confirmSessionCaptureCommand() {
    const requestId = getSingleOptionOrPositional("--request");
    const result = conversationMinerService.confirmSessionCapture({
      requestId,
      reject: selectionService.hasFlag("--reject")
    });
    if (printJsonAndExit(result)) return;
    console.log(formatConfirmSessionCaptureMessage(result));
  }

  /**
   * 消费自动捕获收件箱命令
   */
  function consumeAutoCaptureInboxCommand() {
    const requestId = getSingleOption("--request");
    const maxItems = getNumericOption("--max-items");
    const result = conversationMinerService.consumeAutoCaptureInbox({
      requestId,
      maxItems
    });
    if (printJsonAndExit(result)) return;
    console.log(formatConsumeAutoCaptureInboxMessage({ projectRoot, result, requestId }));
  }

  /**
   * 消费自动捕获响应收件箱命令
   */
  function consumeAutoCaptureResponseInboxCommand() {
    const requestId = getSingleOption("--request");
    const maxItems = getNumericOption("--max-items");
    const result = conversationMinerService.consumeAutoCaptureResponseInbox({
      requestId,
      maxItems
    });
    if (printJsonAndExit(result)) return;
    console.log(formatConsumeAutoCaptureResponseInboxMessage({ projectRoot, result, requestId }));
  }

  /**
   * 监视自动捕获收件箱命令
   */
  async function watchAutoCaptureInboxCommand() {
    const once = selectionService.hasFlag("--once");
    const pollIntervalMs = getNumericOption("--poll-interval-ms");
    const maxItems = getNumericOption("--max-items");
    if (!once && !selectionService.hasFlag("--json")) {
      console.log(formatWatchAutoCaptureInboxMessage({ projectRoot, pollIntervalMs, maxItems }));
    }
    const result = await conversationMinerService.watchAutoCaptureInbox({
      once,
      pollIntervalMs,
      maxItems
    });
    if (once || selectionService.hasFlag("--json")) {
      printJson(result);
    }
  }

  /**
   * 运行工具捕获包装器 - 各工具捕获的通用处理逻辑
   * @param {Object} wrapper - 包装器对象
   */
  async function runToolCaptureWrapper({ toolName, displayName, commandName }) {
    const captureArgs = await resolveSessionCaptureArgs();
    const prepared = conversationMinerService.prepareSessionCapture({
      ...captureArgs,
      toolName: captureArgs.toolName || toolName
    });

    let decision = "skipped";
    let resolved = null;

    if (prepared.shouldPrompt) {
      let shouldConfirm = false;
      if (selectionService.hasFlag("--yes")) shouldConfirm = true;
      else if (selectionService.hasFlag("--reject")) shouldConfirm = false;
      else if (process.stdin.isTTY && process.stdout.isTTY) shouldConfirm = await promptConfirmation(prepared.promptMessage);
      else throw new Error(`${commandName} requires interactive confirmation or one of --yes / --reject.`);

      resolved = conversationMinerService.confirmSessionCapture({
        requestId: prepared.requestId,
        reject: !shouldConfirm
      });
      decision = resolved.status;
    }

    const payload = {
      tool: toolName,
      prepared,
      resolved,
      decision
    };

    if (printJsonAndExit(payload)) return;

    if (!prepared.shouldPrompt) {
      console.log(formatToolCaptureSkippedMessage({ displayName, projectRoot, prepared }));
      return;
    }

    console.log(formatToolCaptureDecisionMessage({ displayName, decision, prepared, resolved }));
  }

  // ========== 各工具专用捕获命令 ==========

  async function codexCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("codex"));
  }

  async function traeCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("trae"));
  }

  async function cursorCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("cursor"));
  }

  async function claudeCodeCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("claude-code"));
  }

  async function windsurfCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("windsurf"));
  }

  async function geminiCliCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("gemini-cli"));
  }

  async function githubCopilotCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("github-copilot"));
  }

  async function clineCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("cline"));
  }

  async function aiderCaptureSessionCommand() {
    await runToolCaptureWrapper(getCaptureWrapper("aider"));
  }

  async function toolCaptureSessionCommand() {
    const toolName = getSingleOption("--tool");
    const wrapper = getCaptureWrapper(toolName);
    if (!wrapper) {
      const supportedTools = supportedCaptureWrappers.map((item) => item.toolName).join(", ");
      throw new Error(`tool-capture-session does not support tool: ${toolName || "unknown"}. Supported: ${supportedTools}.`);
    }
    await runToolCaptureWrapper(wrapper);
  }

  return {
    captureSessionCommand,
    submitAutoCaptureCommand,
    queueAutoCaptureResponseCommand,
    evaluateSessionCaptureCommand,
    prepareSessionCaptureCommand,
    confirmSessionCaptureCommand,
    consumeAutoCaptureInboxCommand,
    consumeAutoCaptureResponseInboxCommand,
    watchAutoCaptureInboxCommand,
    codexCaptureSessionCommand,
    traeCaptureSessionCommand,
    cursorCaptureSessionCommand,
    claudeCodeCaptureSessionCommand,
    windsurfCaptureSessionCommand,
    geminiCliCaptureSessionCommand,
    githubCopilotCaptureSessionCommand,
    clineCaptureSessionCommand,
    aiderCaptureSessionCommand,
    toolCaptureSessionCommand,
    // 导出内部辅助函数供主入口使用
    getSingleOption,
    resolveSessionCaptureArgs,
    readStdinText,
    promptConfirmation
  };
}
