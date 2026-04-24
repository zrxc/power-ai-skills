/**
 * 对话挖掘器主入口协调器
 *
 * 职责：
 * - 初始化和协调各功能模块
 * - 提供服务初始化和方法协调
 * - 将具体实现委托给子模块
 *
 * 模块结构：
 * - conversation-capture.mjs - 对话捕获和录制相关
 * - conversation-patterns.mjs - 模式分析和识别相关
 * - conversation-decisions.mjs - 决策管理和审查相关
 * - conversation-generation.mjs - 技能生成和项目级skill生成相关
 * - conversation-reports.mjs - 报告生成相关
 */
import path from "node:path";
import { showAutoCaptureBridgeContract as showAutoCaptureBridgeContractImpl } from "./auto-capture-bridge-contract.mjs";
import { createAutoCaptureQueueService } from "./auto-capture-queue.mjs";
import { checkAutoCaptureRuntime as checkAutoCaptureRuntimeImpl, collectAutoCaptureRuntimeStatus as collectAutoCaptureRuntimeStatusImpl } from "./auto-capture-runtime-status.mjs";
import {
  collectCaptureSafetyPolicyStatus as collectCaptureSafetyPolicyStatusImpl,
  showCaptureSafetyPolicy as showCaptureSafetyPolicyImpl,
  validateCaptureSafetyPolicy as validateCaptureSafetyPolicyImpl
} from "./capture-safety-policy.mjs";
import {
  applyCaptureRetention as applyCaptureRetentionImpl,
  checkCaptureRetention as checkCaptureRetentionImpl,
  collectCaptureRetentionStatus as collectCaptureRetentionStatusImpl
} from "./capture-retention.mjs";
import { createCaptureEvaluationService } from "./capture-evaluation.mjs";
import {
  captureNormalizedRecords as captureNormalizedRecordsFunc,
  captureSession as captureSessionImpl,
  confirmSessionCapture as confirmSessionCaptureImpl
} from "./conversation-capture.mjs";
import {
  analyzePatterns as analyzePatternsImpl,
  archiveConversationPattern as archiveConversationPatternImpl,
  mergeConversationPattern as mergeConversationPatternImpl,
  restoreConversationPattern as restoreConversationPatternImpl,
  loadProjectPatterns as loadProjectPatternsImpl
} from "./conversation-patterns.mjs";
import {
  syncConversationDecisions as syncConversationDecisionsImpl,
  loadConversationDecisions as loadConversationDecisionsImpl,
  reviewConversationPattern as reviewConversationPatternImpl,
  reviewConversationPatternsBatch as reviewConversationPatternsBatchImpl,
  writeConversationDecisionLedgerArtifacts,
  loadConversationDecisionArtifacts,
  upsertConversationDecision
} from "./conversation-decisions.mjs";
import { generateProjectSkill as generateProjectSkillImpl } from "./conversation-generation.mjs";
import { generateConversationMinerStrategy as generateConversationMinerStrategyImpl, writePatternGovernanceReport } from "./conversation-reports.mjs";
import { createWrapperPromotionService } from "./wrapper-promotions.mjs";
import { createConversationMinerPaths, ensureConversationRoots as ensureConversationMinerRoots, readConversationMinerConfig } from "./setup.mjs";

export function createConversationMinerService({ context, projectRoot, workspaceService, promotionTraceService }) {
  function getPaths() {
    return createConversationMinerPaths({ workspaceService });
  }

  function ensureConversationRoots() {
    return ensureConversationMinerRoots({ workspaceService });
  }

  function loadConversationMinerConfig(paths = ensureConversationRoots()) {
    return readConversationMinerConfig(paths);
  }

  const captureEvaluationService = createCaptureEvaluationService({
    context,
    projectRoot,
    ensureConversationRoots
  });

  const autoCaptureQueueService = createAutoCaptureQueueService({
    projectRoot,
    ensureConversationRoots,
    loadConversationMinerConfig,
    evaluateSessionCapture: captureEvaluationService.evaluateSessionCapture,
    captureNormalizedRecords: (records) => captureNormalizedRecordsFunc(getPaths, records)
  });

  const wrapperPromotionService = createWrapperPromotionService({
    projectRoot,
    ensureConversationRoots,
    promotionTraceService
  });

  const projectName = path.basename(projectRoot);

  // 服务集合，用于模块间调用
  const services = {
    getPaths,
    ensureConversationRoots,
    readConversationMinerConfig,
    projectName,
    loadProjectPatterns: () => loadProjectPatternsImpl(ensureConversationRoots),
    loadConversationDecisionArtifacts,
    writeConversationDecisionLedgerArtifacts,
    upsertConversationDecision,
    promotionTraceService,
    analyzePatterns: (filters) => analyzePatternsImpl(filters, {
      loadConversationRecords: captureEvaluationService.loadConversationRecords,
      ensureConversationRoots,
      syncConversationDecisions: (opts) => syncConversationDecisionsImpl(opts),
      writePatternGovernanceReport,
      projectName
    })
  };

  return {
    getPaths,
    ensureConversationRoots,
    loadConversationMinerConfig,
    generateConversationMinerStrategy: (opts) => generateConversationMinerStrategyImpl(opts, {
      getPaths,
      ensureConversationRoots,
      readConversationMinerConfig
    }),
    collectAutoCaptureRuntimeStatus: (opts = {}) => collectAutoCaptureRuntimeStatusImpl({
      context,
      projectRoot,
      getPaths,
      loadConversationMinerConfig,
      staleMinutes: opts.staleMinutes
    }),
    checkAutoCaptureRuntime: (opts = {}) => checkAutoCaptureRuntimeImpl(opts, {
      context,
      projectRoot,
      getPaths,
      loadConversationMinerConfig
    }),
    showAutoCaptureBridgeContract: (opts = {}) => showAutoCaptureBridgeContractImpl(opts, {
      context,
      projectRoot,
      getPaths,
      loadConversationMinerConfig
    }),
    collectCaptureSafetyPolicyStatus: () => collectCaptureSafetyPolicyStatusImpl(getPaths(), context),
    collectCaptureRetentionStatus: () => collectCaptureRetentionStatusImpl(getPaths(), {}, context),
    showCaptureSafetyPolicy: (opts = {}) => showCaptureSafetyPolicyImpl(opts, {
      context,
      projectRoot,
      getPaths,
      loadConversationMinerConfig
    }),
    validateCaptureSafetyPolicy: (opts = {}) => validateCaptureSafetyPolicyImpl(opts, {
      context,
      projectRoot,
      getPaths,
      loadConversationMinerConfig
    }),
    checkCaptureRetention: (opts = {}) => checkCaptureRetentionImpl(opts, {
      context,
      projectRoot,
      getPaths,
      loadConversationMinerConfig
    }),
    applyCaptureRetention: (opts = {}) => applyCaptureRetentionImpl(opts, {
      context,
      projectRoot,
      getPaths,
      loadConversationMinerConfig
    }),
    evaluateSessionCapture: captureEvaluationService.evaluateSessionCapture,
    prepareSessionCapture: captureEvaluationService.prepareSessionCapture,
    captureSession: (opts) => captureSessionImpl(captureEvaluationService, getPaths, opts),
    confirmSessionCapture: (opts) => confirmSessionCaptureImpl(ensureConversationRoots, (records) => captureNormalizedRecordsFunc(getPaths, records), opts),
    loadConversationRecords: captureEvaluationService.loadConversationRecords,
    analyzePatterns: (opts) => analyzePatternsImpl(opts, {
      loadConversationRecords: captureEvaluationService.loadConversationRecords,
      ensureConversationRoots,
      syncConversationDecisions: (opts) => syncConversationDecisionsImpl(opts),
      writePatternGovernanceReport,
      projectName
    }),
    loadProjectPatterns: () => loadProjectPatternsImpl(ensureConversationRoots),
    loadConversationDecisions: () => loadConversationDecisionsImpl(
      () => loadProjectPatternsImpl(ensureConversationRoots),
      loadConversationDecisionArtifacts
    ),
    mergeConversationPattern: (opts) => mergeConversationPatternImpl(opts, services),
    archiveConversationPattern: (opts) => archiveConversationPatternImpl(opts, services),
    restoreConversationPattern: (opts) => restoreConversationPatternImpl(opts, services),
    reviewConversationPattern: (opts) => reviewConversationPatternImpl(opts, services),
    reviewConversationPatternsBatch: (opts) => reviewConversationPatternsBatchImpl(opts, services),
    generateProjectSkill: (opts) => generateProjectSkillImpl(opts, services),
    ...autoCaptureQueueService,
    ...wrapperPromotionService
  };
}
