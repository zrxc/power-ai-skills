import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeVueSfc } from "../src/project-scan/vue-analysis.mjs";
import { analyzeScriptAst } from "../src/project-scan/vue-analysis/script-analysis.mjs";
import { buildScriptSignals } from "../src/project-scan/vue-analysis/signal-synthesis.mjs";
import { analyzeTemplateAst } from "../src/project-scan/vue-analysis/template-analysis.mjs";
import { analyzeProjectViewFiles, buildProjectScanAnalysis } from "../src/project-scan/scan-analysis.mjs";
import {
  buildComponentGraph,
  buildComponentPropagation,
  enrichSignalsWithComponentGraph
} from "../src/project-scan/component-graph.mjs";
import {
  buildAggregatedPatterns,
  collectPatternAggregates
} from "../src/project-scan/pattern-aggregation.mjs";
import { collectProjectScanInputs } from "../src/project-scan/scan-inputs.mjs";
import {
  buildProjectPagePatternSummary,
  buildProjectProfileArtifact,
  buildProjectScanResult
} from "../src/project-scan/scan-result-builder.mjs";
import {
  buildComponentGraphSummaryMarkdown,
  buildComponentPropagationSummaryMarkdown,
  buildScanDiffMarkdown,
  buildScanSummaryMarkdown
} from "../src/project-scan/report-renderers.mjs";
import {
  loadAnalysisArtifacts,
  writeProjectAnalysisArtifacts
} from "../src/project-scan/analysis-artifact-store.mjs";
import { createProjectScanPipelineService } from "../src/project-scan/project-scan-pipeline-service.mjs";
import { createProjectScanReviewService } from "../src/project-scan/project-scan-review-service.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "bin", "power-ai-skills.mjs");

test("vue template analysis keeps template-only signals inside the template layer", () => {
  const templateState = analyzeTemplateAst(`
<CommonLayoutContainer>
  <pc-tree />
  <pc-dialog @on-confirm="submit">
    <pc-tree />
  </pc-dialog>
  <pc-table-warp />
  <el-descriptions />
  <tabs />
</CommonLayoutContainer>
`);

  assert.equal(templateState.templateAstAvailable, true);
  assert.equal(templateState.pageContainer, "CommonLayoutContainer");
  assert.equal(templateState.hasPcDialog, true);
  assert.equal(templateState.hasPcTableWarp, true);
  assert.equal(templateState.hasReadOnlyView, true);
  assert.equal(templateState.hasTabs, true);
  assert.equal(templateState.hasPageLevelTree, true);
  assert.equal(templateState.treeInsideDialog, true);
  assert.equal(templateState.componentPresence.CommonLayoutContainer, true);
  assert.equal(templateState.componentPresence.PcTree, true);
  assert.equal(templateState.dialogEventNames.has("on-confirm"), true);
  assert.deepEqual(templateState.rootFlags, {
    hasRootCommonLayout: true,
    hasRootPcContainer: false,
    hasRootPcLayoutPageCommon: false,
    hasPageLevelTree: true
  });
});

test("vue script analysis keeps AST traversal and import collection inside the script layer", () => {
  const scriptState = analyzeScriptAst(`
import localHelper, { fetchList as loadListAlias } from "./api";
import { useUserStore } from "@/store/user";

const pageValue = { pageNum: 1, pageSize: 20 };
const currentNode = this.treeState.currentNode;
const detailPath = this.formModel.value;
const message = \`detail-\${pageValue.pageNum}\`;

function handleSearch() {
  return loadListAlias();
}
`);

  assert.equal(scriptState.scriptAstAvailable, true);
  assert.equal(scriptState.identifiers.has("pageValue"), true);
  assert.equal(scriptState.identifiers.has("handleSearch"), true);
  assert.equal(scriptState.memberPaths.has("pageValue.pageNum"), true);
  assert.equal(scriptState.memberPaths.has("this.treeState.currentNode"), true);
  assert.equal(scriptState.memberPaths.has("this.formModel.value"), true);
  assert.equal(scriptState.stringLiterals.has("./api"), true);
  assert.equal(scriptState.stringLiterals.has("detail-"), true);
  assert.deepEqual(scriptState.imports, [
    {
      source: "./api",
      specifiers: [
        { localName: "localHelper", importedName: "default" },
        { localName: "loadListAlias", importedName: "fetchList" }
      ]
    },
    {
      source: "@/store/user",
      specifiers: [
        { localName: "useUserStore", importedName: "useUserStore" }
      ]
    }
  ]);
});

test("vue signal synthesis combines template and script layers without leaking rule ownership", () => {
  const templateState = analyzeTemplateAst(`
<pc-layout-page-common>
  <pc-dialog @on-confirm="submitDialog" />
  <el-form />
</pc-layout-page-common>
`);
  const scriptState = analyzeScriptAst(`
import localHelper from "./helper";

const searchForm = {};
const pageValue = { pageNum: 1, pageSize: 20 };
const tableData = { value: { loading: true } };

function getList() {}
function handleAdd() {}
function handleNodeClick() {}
`);

  const scriptSignals = buildScriptSignals(scriptState, templateState);

  assert.equal(scriptSignals.hasSearchForm, true);
  assert.equal(scriptSignals.hasCrudAction, true);
  assert.equal(scriptSignals.hasFormModel, true);
  assert.equal(scriptSignals.hasSubmitAction, true);
  assert.equal(scriptSignals.hasTreeRefresh, true);
  assert.equal(scriptSignals.hasPaging, true);
  assert.equal(scriptSignals.hasListFetch, true);
  assert.equal(scriptSignals.hasDetailLoad, false);

  const sfcAnalysis = analyzeVueSfc(`
<template>
  <pc-layout-page-common>
    <pc-dialog @on-confirm="submitDialog" />
    <el-form />
  </pc-layout-page-common>
</template>
<script setup lang="ts">
import localHelper from "./helper";
import { useUserStore } from "@/store/user";

const searchForm = {};
const pageValue = { pageNum: 1, pageSize: 20 };
const tableData = { value: { loading: true } };

function getList() {}
function handleAdd() {}
function handleNodeClick() {}
</script>
`);

  assert.equal(sfcAnalysis.pageContainer, "PcLayoutPageCommon");
  assert.equal(sfcAnalysis.hasPcDialog, true);
  assert.equal(sfcAnalysis.hasEditableForm, true);
  assert.equal(sfcAnalysis.hasSearchForm, true);
  assert.equal(sfcAnalysis.hasCrudAction, true);
  assert.equal(sfcAnalysis.hasSubmitAction, true);
  assert.equal(sfcAnalysis.hasTreeRefresh, true);
  assert.equal(sfcAnalysis.hasPaging, true);
  assert.equal(sfcAnalysis.hasListFetch, true);
  assert.equal(sfcAnalysis.hasDetailLoad, false);
  assert.deepEqual(sfcAnalysis.localImports, [
    {
      source: "./helper",
      specifiers: [
        { localName: "localHelper", importedName: "default" }
      ]
    }
  ]);
});

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function createProjectScanFixture(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-project-scan-"));
  const projectRoot = path.join(tempRoot, "consumer-project-scan");
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  writeFile(
    path.join(projectRoot, "package.json"),
    JSON.stringify(
      {
        name: "consumer-project-scan",
        version: "1.0.0",
        private: true,
        dependencies: {
          vue: "^3.4.0",
          pinia: "^2.1.7",
          "@power/runtime-vue3": "^6.5.0",
          "@power/p-components": "^6.5.0"
        }
      },
      null,
      2
    )
  );

  const basicListPage = `<template>
  <pc-layout-page-common>
    <pc-table-warp />
    <pc-dialog />
  </pc-layout-page-common>
</template>
<script setup lang="ts">
const searchForm = {};
const pageValue = { pageNum: 1, pageSize: 20 };
const formModel = {};
function getList() {}
function handleAdd() {}
function handleDelete() {}
function handleSubmit() {}
</script>
`;

  writeFile(path.join(projectRoot, "src", "views", "user", "index.vue"), basicListPage);
  writeFile(path.join(projectRoot, "src", "views", "role", "index.vue"), basicListPage);
  writeFile(path.join(projectRoot, "src", "views", "catalog", "index.vue"), basicListPage);

  writeFile(
    path.join(projectRoot, "src", "views", "department-user", "index.vue"),
    `<template>
  <CommonLayoutContainer>
    <PcTree />
    <pc-table-warp />
    <pc-dialog />
  </CommonLayoutContainer>
</template>
<script setup lang="ts">
const formModel = {};
function handleNodeClick() {}
function handleSubmit() {}
</script>
`
  );

  const detailPage = `<template>
  <PcContainer>
    <el-descriptions />
  </PcContainer>
</template>
<script setup lang="ts">
function fetchDetail() {}
</script>
`;

  writeFile(path.join(projectRoot, "src", "views", "detail", "detail.vue"), detailPage);
  writeFile(path.join(projectRoot, "src", "views", "detail-two", "view.vue"), detailPage);
  writeFile(path.join(projectRoot, "src", "views", "detail-three", "read.vue"), detailPage);

  writeFile(
    path.join(projectRoot, "src", "views", "dataAccess", "add.vue"),
    `<template>
  <el-form>
    <el-form-item />
  </el-form>
</template>
<script setup lang="ts">
const formData = {};
function getDetailItem() {}
function onSave() {}
</script>
`
  );

  writeFile(
    path.join(projectRoot, "src", "views", "DataSubscription", "components", "resList.vue"),
    `<template>
  <div>
    <pc-table-warp />
    <pc-dialog>
      <pc-tree />
      <pc-table-warp />
    </pc-dialog>
  </div>
</template>
<script setup lang="ts">
const formModel = {};
function handleSubmit() {}
</script>
`
  );

  writeFile(path.join(projectRoot, "src", "api", "index.ts"), "export const api = {};\n");
  writeFile(path.join(projectRoot, "src", "router", "index.ts"), "export const router = [];\n");
  writeFile(path.join(projectRoot, "src", "store", "index.ts"), "export const store = {};\n");
  writeFile(path.join(projectRoot, "src", "utils", "index.ts"), "export const utils = {};\n");

  return projectRoot;
}

function runCli(projectRoot, command, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [cliPath, command, "--project", projectRoot, ...extraArgs],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
}

test("project scan orchestration keeps scan inputs, analysis, and result building on separate layers", (t) => {
  const projectRoot = createProjectScanFixture(t);
  const context = {
    teamPolicy: {
      projectProfiles: [
        { name: "enterprise-vue" },
        { name: "terminal-governance" }
      ]
    }
  };
  const generatedAt = "2026-04-27T00:00:00.000Z";
  const inputs = collectProjectScanInputs(projectRoot);

  assert.equal(inputs.packageJson.name, "consumer-project-scan");
  assert.equal(inputs.structure.viewsRoot, "src/views");
  assert.equal(inputs.viewFiles.length, 9);
  assert.equal(inputs.frameworkSignals.vue, true);
  assert.equal(inputs.frameworkSignals.powerComponents, true);

  const fileAnalysis = analyzeProjectViewFiles({ projectRoot, viewFiles: inputs.viewFiles });
  assert.equal(fileAnalysis.componentUsage["pc-table-warp"], 5);
  assert.deepEqual(fileAnalysis.fileRoleSummary, {
    page: 8,
    pageCandidate: 0,
    pageFragment: 0,
    dialogFragment: 1
  });
  assert.equal(fileAnalysis.fileAnalyses.get("src/views/department-user/index.vue")?.hasTreeRefresh, true);

  const projectScanAnalysis = buildProjectScanAnalysis(fileAnalysis.fileAnalyses);
  assert.equal(projectScanAnalysis.componentGraph.summary.nodeCount, 9);
  assert.equal(projectScanAnalysis.componentPropagation.summary.fileCount, 9);
  assert.equal(projectScanAnalysis.patterns.some((pattern) => pattern.type === "basic-list-page"), true);

  const result = buildProjectScanResult({
    context,
    projectRoot,
    generatedAt,
    packageJson: inputs.packageJson,
    structure: inputs.structure,
    frameworkSignals: inputs.frameworkSignals,
    componentUsage: fileAnalysis.componentUsage,
    componentGraph: projectScanAnalysis.componentGraph,
    componentPropagation: projectScanAnalysis.componentPropagation,
    fileRoleSummary: fileAnalysis.fileRoleSummary,
    patterns: projectScanAnalysis.patterns,
    viewFiles: inputs.viewFiles
  });

  assert.equal(result.generatedAt, generatedAt);
  assert.equal(result.projectProfile.projectName, "consumer-project-scan");
  assert.equal(result.projectProfile.teamProjectProfileRecommendation.recommendedProjectProfile, "enterprise-vue");
  assert.equal(result.projectProfile.pagePatterns.basicListPage, 3);
  assert.equal(result.projectProfile.pagePatterns.treeListPage, 1);
  assert.equal(result.projectProfile.pagePatterns.detailPage, 3);
  assert.equal(result.projectProfile.pagePatterns.dialogFormCrud, 4);
  assert.equal(result.projectProfile.fileSummary.viewFileCount, 9);
  assert.equal(result.patterns.patterns.length, 4);
});

test("component graph facade keeps graph building, propagation, and signal enrichment on dedicated layers", () => {
  const fileAnalyses = new Map([
    [
      "src/views/orders/index.vue",
      {
        relativePath: "src/views/orders/index.vue",
        fileRole: "page",
        pageContainer: "PcLayoutPageCommon",
        templateCustomTagNames: ["OrdersDialog"],
        templateTagNames: ["pc-layout-page-common", "orders-dialog"],
        localImports: [
          {
            source: "./components/OrdersDialog.vue",
            specifiers: [{ localName: "OrdersDialog", importedName: "default" }]
          }
        ]
      }
    ],
    [
      "src/views/orders/components/OrdersDialog.vue",
      {
        relativePath: "src/views/orders/components/OrdersDialog.vue",
        fileRole: "dialog-fragment",
        pageContainer: "",
        templateCustomTagNames: ["DialogShell"],
        templateTagNames: ["dialog-shell"],
        localImports: [
          {
            source: "./DialogShell.vue",
            specifiers: [{ localName: "DialogShell", importedName: "default" }]
          }
        ],
        hasPcDialog: true,
        hasFormModel: true,
        hasSubmitAction: true
      }
    ],
    [
      "src/views/orders/components/DialogShell.vue",
      {
        relativePath: "src/views/orders/components/DialogShell.vue",
        fileRole: "dialog-fragment",
        pageContainer: "",
        templateCustomTagNames: [],
        templateTagNames: [],
        localImports: [],
        hasPcDialog: true,
        hasFormModel: true,
        hasSubmitAction: true
      }
    ]
  ]);

  const componentGraph = buildComponentGraph(fileAnalyses);
  const componentPropagation = buildComponentPropagation(fileAnalyses, componentGraph);
  const enrichedFileAnalyses = enrichSignalsWithComponentGraph(fileAnalyses, componentGraph, componentPropagation);
  const orderPageSignals = enrichedFileAnalyses.get("src/views/orders/index.vue");

  assert.equal(componentGraph.summary.usedEdgeCount, 2);
  assert.equal(componentGraph.summary.pageToFragmentEdgeCount, 1);
  assert.equal(componentPropagation.summary.maxReachDepth, 2);
  assert.deepEqual(orderPageSignals.relatedComponentPaths, ["src/views/orders/components/OrdersDialog.vue"]);
  assert.deepEqual(orderPageSignals.transitiveRelatedComponentPaths, [
    "src/views/orders/components/DialogShell.vue",
    "src/views/orders/components/OrdersDialog.vue"
  ]);
  assert.deepEqual(orderPageSignals.transitiveSupportingFragmentPaths, [
    "src/views/orders/components/DialogShell.vue",
    "src/views/orders/components/OrdersDialog.vue"
  ]);
  assert.equal(orderPageSignals.transitiveLinkedHasPcDialog, true);
  assert.equal(orderPageSignals.transitiveLinkedHasSubmitAction, true);
});

test("pattern aggregation facade keeps aggregate collection and result building on dedicated layers", () => {
  const enrichedFileAnalyses = new Map([
    [
      "src/views/orders/index.vue",
      {
        relativePath: "src/views/orders/index.vue",
        relatedComponentPaths: ["src/views/orders/components/OrdersDialog.vue"],
        supportingFragmentPaths: ["src/views/orders/components/OrdersDialog.vue"],
        transitiveRelatedComponentPaths: ["src/views/orders/components/OrdersDialog.vue"],
        transitiveSupportingFragmentPaths: ["src/views/orders/components/OrdersDialog.vue"]
      }
    ],
    [
      "src/views/orders/components/OrdersDialog.vue",
      {
        relativePath: "src/views/orders/components/OrdersDialog.vue",
        relatedComponentPaths: [],
        supportingFragmentPaths: [],
        transitiveRelatedComponentPaths: [],
        transitiveSupportingFragmentPaths: []
      }
    ]
  ]);

  const detectFilePatterns = (signals) => {
    if (signals.relativePath === "src/views/orders/index.vue") {
      return [
        {
          type: "dialog-form",
          files: [signals.relativePath],
          entity: "orders",
          componentStack: { page: "PcLayoutPageCommon", dialog: "pc-dialog" },
          score: 92,
          structuralScore: 90,
          sceneType: "dialog-form",
          reasons: ["page-uses-dialog"],
          interactionTraits: ["submit"],
          dataFlowTraits: ["form-model"],
          subpattern: "page-dialog-form",
          fileRole: "page",
          confidence: "high"
        }
      ];
    }

    return [
      {
        type: "dialog-form",
        files: [signals.relativePath],
        entity: "orders",
        componentStack: { dialog: "pc-dialog" },
        score: 80,
        structuralScore: 82,
        sceneType: "dialog-form",
        reasons: ["fragment-provides-form"],
        interactionTraits: ["submit"],
        dataFlowTraits: ["form-model"],
        subpattern: "fragment-dialog-form",
        fileRole: "dialog-fragment",
        confidence: "medium"
      }
    ];
  };

  const aggregates = collectPatternAggregates(enrichedFileAnalyses, detectFilePatterns);
  const patterns = buildAggregatedPatterns({
    aggregates,
    patternDefinitions: new Map([["dialog-form", { baseSkill: "dialog-form" }]])
  });
  const dialogPattern = patterns[0];

  assert.equal(aggregates.get("dialog-form")?.matchedFiles.length, 2);
  assert.equal(dialogPattern.type, "dialog-form");
  assert.equal(dialogPattern.baseSkill, "dialog-form");
  assert.equal(dialogPattern.frequency, 1);
  assert.equal(dialogPattern.fileCount, 2);
  assert.equal(dialogPattern.fragmentFileCount, 1);
  assert.deepEqual(dialogPattern.sampleFiles, [
    "src/views/orders/index.vue",
    "src/views/orders/components/OrdersDialog.vue"
  ]);
  assert.deepEqual(dialogPattern.relatedComponents, ["src/views/orders/components/OrdersDialog.vue"]);
  assert.deepEqual(dialogPattern.supportingFragments, ["src/views/orders/components/OrdersDialog.vue"]);
  assert.equal(dialogPattern.subpatterns.some((item) => item.name === "page-dialog-form" && item.count === 1), true);
  assert.equal(
    dialogPattern.subpatterns.some((item) => item.name === "fragment-dialog-form" && item.count === 1),
    true
  );
  assert.equal(dialogPattern.matchedFiles[0]?.path, "src/views/orders/index.vue");
});

test("scan result facade keeps pattern summary, project profile, and result payload on dedicated layers", () => {
  const context = {
    teamPolicy: {
      projectProfiles: [{ name: "enterprise-vue" }]
    }
  };
  const patterns = [
    { type: "basic-list-page", frequency: 3 },
    { type: "tree-list-page", frequency: 1 },
    { type: "detail-page", frequency: 2 },
    { type: "dialog-form", frequency: 4 }
  ];

  const pagePatterns = buildProjectPagePatternSummary(patterns);
  const projectProfile = buildProjectProfileArtifact({
    context,
    projectRoot: "D:/fixtures/demo-project",
    generatedAt: "2026-04-27T00:00:00.000Z",
    packageJson: { name: "demo-project" },
    structure: { viewsRoot: "src/views" },
    frameworkSignals: { vue: true, powerComponents: true },
    componentUsage: { "pc-table-warp": 3 },
    componentGraph: { summary: { edgeCount: 2 } },
    componentPropagation: { summary: { maxReachDepth: 2 } },
    fileRoleSummary: { page: 4, pageCandidate: 0, pageFragment: 1, dialogFragment: 1 },
    patterns,
    viewFiles: ["a.vue", "b.vue", "c.vue"]
  });
  const result = buildProjectScanResult({
    context,
    projectRoot: "D:/fixtures/demo-project",
    generatedAt: "2026-04-27T00:00:00.000Z",
    packageJson: { name: "demo-project" },
    structure: { viewsRoot: "src/views" },
    frameworkSignals: { vue: true, powerComponents: true },
    componentUsage: { "pc-table-warp": 3 },
    componentGraph: { summary: { edgeCount: 2 } },
    componentPropagation: { summary: { maxReachDepth: 2 } },
    fileRoleSummary: { page: 4, pageCandidate: 0, pageFragment: 1, dialogFragment: 1 },
    patterns,
    viewFiles: ["a.vue", "b.vue", "c.vue"]
  });

  assert.deepEqual(pagePatterns, {
    basicListPage: 3,
    treeListPage: 1,
    detailPage: 2,
    dialogFormCrud: 4
  });
  assert.deepEqual(projectProfile.pagePatterns, pagePatterns);
  assert.equal(projectProfile.projectName, "demo-project");
  assert.equal(projectProfile.fileSummary.viewFileCount, 3);
  assert.equal(result.projectProfile.projectName, "demo-project");
  assert.equal(result.patterns.generatedAt, "2026-04-27T00:00:00.000Z");
  assert.deepEqual(result.patterns.patterns, patterns);
  assert.equal(result.componentGraph.summary.edgeCount, 2);
  assert.equal(result.componentPropagation.summary.maxReachDepth, 2);
});

test("report renderer facade keeps summary, diff, graph, and propagation markdown on dedicated layers", () => {
  const summaryMarkdown = buildScanSummaryMarkdown({
    projectProfile: {
      projectName: "demo-project",
      generatedAt: "2026-04-27T00:00:00.000Z",
      fileSummary: { viewFileCount: 3 },
      componentGraphSummary: { edgeCount: 2 },
      componentPropagationSummary: { maxReachDepth: 2, filesWithReachableFragments: 1 }
    },
    patternReview: {
      summary: { generate: 1, review: 1, skip: 0 },
      feedbackSummary: { overrides: 1, applied: 1, stale: 0 },
      patterns: [
        {
          type: "dialog-form",
          autoDecision: "review",
          decision: "generate",
          decisionSource: "manual",
          dominantSubpattern: "page-dialog-form",
          frequency: 2,
          confidence: "high",
          averageScore: 90,
          structuralScore: 88,
          purityScore: 80,
          reuseScore: 85,
          reasons: ["dialog pattern detected"],
          feedbackNote: "approved"
        }
      ]
    },
    patternDiff: {
      summary: { added: 1, changed: 0, removed: 0 }
    }
  });
  const diffMarkdown = buildScanDiffMarkdown({
    projectName: "demo-project",
    patternDiff: {
      generatedAt: "2026-04-27T00:00:00.000Z",
      hasPreviousSnapshot: true,
      summary: { added: 1, changed: 1, removed: 0, unchanged: 2 },
      changes: [
        {
          type: "dialog-form",
          changeType: "changed",
          previous: { frequency: 1, confidence: "medium", decision: "review", dominantSubpattern: "fragment-dialog-form" },
          current: { frequency: 2, confidence: "high", decision: "generate", dominantSubpattern: "page-dialog-form" },
          fields: ["frequency", "decision"]
        }
      ]
    }
  });
  const graphMarkdown = buildComponentGraphSummaryMarkdown({
    projectName: "demo-project",
    componentGraph: {
      generatedAt: "2026-04-27T00:00:00.000Z",
      summary: {
        nodeCount: 2,
        edgeCount: 1,
        usedEdgeCount: 1,
        referencedComponentCount: 1,
        pageToFragmentEdgeCount: 1
      },
      edges: [
        {
          from: "src/views/orders/index.vue",
          to: "src/views/orders/components/OrdersDialog.vue",
          localName: "OrdersDialog",
          usedInTemplate: true
        }
      ]
    }
  });
  const propagationMarkdown = buildComponentPropagationSummaryMarkdown({
    projectName: "demo-project",
    componentPropagation: {
      generatedAt: "2026-04-27T00:00:00.000Z",
      summary: {
        fileCount: 2,
        maxReachDepth: 2,
        transitivePageToFragmentCount: 1,
        filesWithReachableFragments: 1
      },
      files: [
        {
          path: "src/views/orders/index.vue",
          reachableFragments: [
            {
              path: "src/views/orders/components/OrdersDialog.vue",
              depth: 1,
              fileRole: "dialog-fragment"
            }
          ]
        }
      ]
    }
  });

  assert.equal(summaryMarkdown.includes("# Project Scan Summary"), true);
  assert.equal(summaryMarkdown.includes("dialog-form"), true);
  assert.equal(diffMarkdown.includes("# Project Scan Diff"), true);
  assert.equal(diffMarkdown.includes("changeType"), true);
  assert.equal(graphMarkdown.includes("# Component Graph Summary"), true);
  assert.equal(graphMarkdown.includes("OrdersDialog"), true);
  assert.equal(propagationMarkdown.includes("# Component Propagation Summary"), true);
  assert.equal(propagationMarkdown.includes("reachable fragments") || propagationMarkdown.includes("OrdersDialog.vue"), true);
});

test("analysis artifact store facade keeps load, json projection, and report writes on dedicated layers", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-analysis-artifacts-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  const paths = {
    analysisRoot: path.join(tempRoot, "analysis"),
    reportsRoot: path.join(tempRoot, "reports"),
    projectProfilePath: path.join(tempRoot, "analysis", "project-profile.json"),
    patternsPath: path.join(tempRoot, "analysis", "patterns.json"),
    patternReviewPath: path.join(tempRoot, "analysis", "pattern-review.json"),
    patternFeedbackPath: path.join(tempRoot, "analysis", "pattern-feedback.json"),
    patternDiffPath: path.join(tempRoot, "analysis", "pattern-diff.json"),
    patternHistoryPath: path.join(tempRoot, "analysis", "pattern-history.json"),
    componentGraphPath: path.join(tempRoot, "analysis", "component-graph.json"),
    componentPropagationPath: path.join(tempRoot, "analysis", "component-propagation.json"),
    summaryReportPath: path.join(tempRoot, "reports", "project-scan-summary.md"),
    diffReportPath: path.join(tempRoot, "reports", "project-scan-diff.md"),
    feedbackReportPath: path.join(tempRoot, "reports", "project-scan-feedback.md"),
    componentGraphReportPath: path.join(tempRoot, "reports", "component-graph-summary.md"),
    componentPropagationReportPath: path.join(tempRoot, "reports", "component-propagation-summary.md")
  };
  const result = {
    generatedAt: "2026-04-27T00:00:00.000Z",
    projectProfile: {
      projectName: "demo-project",
      generatedAt: "2026-04-27T00:00:00.000Z",
      fileSummary: { viewFileCount: 3 },
      componentGraphSummary: { edgeCount: 1 },
      componentPropagationSummary: { maxReachDepth: 1, filesWithReachableFragments: 1 }
    },
    patterns: {
      generatedAt: "2026-04-27T00:00:00.000Z",
      patterns: [{ type: "dialog-form", frequency: 1 }]
    },
    componentGraph: {
      generatedAt: "2026-04-27T00:00:00.000Z",
      summary: {
        nodeCount: 2,
        edgeCount: 1,
        usedEdgeCount: 1,
        referencedComponentCount: 1,
        pageToFragmentEdgeCount: 1
      },
      edges: [
        {
          from: "src/views/orders/index.vue",
          to: "src/views/orders/components/OrdersDialog.vue",
          localName: "OrdersDialog",
          usedInTemplate: true
        }
      ]
    },
    componentPropagation: {
      generatedAt: "2026-04-27T00:00:00.000Z",
      summary: {
        fileCount: 2,
        maxReachDepth: 1,
        transitivePageToFragmentCount: 0,
        filesWithReachableFragments: 1
      },
      files: [
        {
          path: "src/views/orders/index.vue",
          reachableFragments: [
            {
              path: "src/views/orders/components/OrdersDialog.vue",
              depth: 1,
              fileRole: "dialog-fragment"
            }
          ]
        }
      ]
    }
  };
  const patternReview = {
    summary: { generate: 1, review: 0, skip: 0 },
    feedbackSummary: { overrides: 0, applied: 0, stale: 0 },
    patterns: [
      {
        type: "dialog-form",
        autoDecision: "generate",
        decision: "generate",
        dominantSubpattern: "page-dialog-form",
        frequency: 1,
        confidence: "high",
        averageScore: 90,
        structuralScore: 88,
        purityScore: 80,
        reuseScore: 85,
        reasons: ["dialog pattern detected"]
      }
    ]
  };
  const patternFeedback = {
    overrides: [],
    summary: { total: 0, generate: 0, review: 0, skip: 0 }
  };
  const patternDiff = {
    generatedAt: "2026-04-27T00:00:00.000Z",
    hasPreviousSnapshot: false,
    summary: { added: 1, changed: 0, removed: 0, unchanged: 0 },
    changes: []
  };
  const patternHistory = {
    snapshots: [
      {
        generatedAt: "2026-04-27T00:00:00.000Z",
        projectName: "demo-project"
      }
    ]
  };

  const outputs = writeProjectAnalysisArtifacts({
    paths,
    result,
    patternReview,
    patternFeedback,
    patternDiff,
    patternHistory
  });
  const loadedArtifacts = loadAnalysisArtifacts(paths);

  assert.equal(fs.existsSync(outputs.projectProfilePath), true);
  assert.equal(fs.existsSync(outputs.summaryReportPath), true);
  assert.equal(fs.existsSync(outputs.componentPropagationReportPath), true);
  assert.equal(loadedArtifacts.projectProfile.projectName, "demo-project");
  assert.equal(loadedArtifacts.patterns.patterns[0]?.type, "dialog-form");
  assert.equal(loadedArtifacts.patternFeedback.summary.total, 0);
  assert.equal(
    fs.readFileSync(outputs.summaryReportPath, "utf8").includes("# Project Scan Summary"),
    true
  );
  assert.equal(
    fs.readFileSync(outputs.componentGraphReportPath, "utf8").includes("# Component Graph Summary"),
    true
  );
});

test("project scan review service owns feedback overrides without expanding service composition scope", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-project-scan-review-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  const paths = {
    patternFeedbackPath: path.join(tempRoot, "pattern-feedback.json"),
    feedbackReportPath: path.join(tempRoot, "project-scan-feedback.md")
  };
  const scanResult = {
    patterns: {
      patterns: [
        {
          id: "pattern_basic_list_page",
          type: "basic-list-page"
        }
      ]
    }
  };
  const reviewService = createProjectScanReviewService({
    getAnalysisPaths: () => paths,
    scanProject: () => scanResult,
    buildAnalysisOutputs: ({ patternFeedback }) => ({
      patternReview: {
        patterns: [
          {
            id: "pattern_basic_list_page",
            decision: patternFeedback.overrides[0]?.decision || "review",
            autoDecision: "review"
          }
        ]
      },
      outputs: {
        feedbackReportPath: paths.feedbackReportPath
      }
    })
  });

  const reviewResult = reviewService.reviewProjectPattern({
    patternId: "basic-list-page",
    decision: "generate",
    note: "manual allowlist"
  });

  assert.equal(reviewResult.patternId, "pattern_basic_list_page");
  assert.equal(reviewResult.patternType, "basic-list-page");
  assert.equal(reviewResult.currentReview?.decision, "generate");
  assert.equal(reviewResult.patternFeedback.summary.generate, 1);
  assert.equal(fs.existsSync(paths.patternFeedbackPath), true);

  const clearResult = reviewService.reviewProjectPattern({
    patternId: "pattern_basic_list_page",
    clear: true
  });

  assert.equal(clearResult.cleared, true);
  assert.equal(clearResult.patternFeedback.summary.total, 0);
});

test("project scan pipeline service owns scan plus generation handoff without re-expanding index composition", () => {
  const calls = [];
  const pipelineService = createProjectScanPipelineService({
    writeProjectAnalysis: () => {
      calls.push("scan");
      return { generatedAt: "scan" };
    },
    projectLocalSkillService: {
      generateProjectLocalSkills: ({ regenerate }) => {
        calls.push(`generate:${regenerate}`);
        return { generatedAt: "generate", regenerate };
      }
    }
  });

  const result = pipelineService.runProjectScanPipeline({ regenerate: true });

  assert.deepEqual(calls, ["scan", "generate:true"]);
  assert.deepEqual(result, {
    scanResult: { generatedAt: "scan" },
    generationResult: { generatedAt: "generate", regenerate: true }
  });
});

test("scan-project writes analysis artifacts and generate-project-local-skills emits draft skills", (t) => {
  const projectRoot = createProjectScanFixture(t);
  const scanResult = runCli(projectRoot, "scan-project");
  assert.equal(scanResult.status, 0, scanResult.stderr);

  const projectProfile = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "project-profile.json"), "utf8")
  );
  const patternsPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "patterns.json"), "utf8")
  );
  const patternReview = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-review.json"), "utf8")
  );
  const patternFeedback = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-feedback.json"), "utf8")
  );
  const patternDiff = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-diff.json"), "utf8")
  );
  const patternHistory = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-history.json"), "utf8")
  );
  const componentGraph = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "component-graph.json"), "utf8")
  );
  const componentPropagation = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "component-propagation.json"), "utf8")
  );
  const summaryReport = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "reports", "project-scan-summary.md"),
    "utf8"
  );
  const diffReport = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "reports", "project-scan-diff.md"),
    "utf8"
  );
  const feedbackReport = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "reports", "project-scan-feedback.md"),
    "utf8"
  );
  const componentGraphReport = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "reports", "component-graph-summary.md"),
    "utf8"
  );
  const componentPropagationReport = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "reports", "component-propagation-summary.md"),
    "utf8"
  );

  assert.equal(projectProfile.projectName, "consumer-project-scan");
  assert.equal(projectProfile.frameworkSignals.vue, true);
  assert.equal(projectProfile.frameworkSignals.pinia, true);
  assert.equal(projectProfile.frameworkSignals.powerRuntime, true);
  assert.equal(projectProfile.frameworkSignals.powerComponents, true);
  assert.equal(projectProfile.teamProjectProfileRecommendation.recommendedProjectProfile, "enterprise-vue");
  assert.equal(projectProfile.componentGraphSummary.edgeCount, 0);
  assert.equal(projectProfile.componentPropagationSummary.maxReachDepth, 0);
  assert.equal(projectProfile.pagePatterns.basicListPage, 3);
  assert.equal(projectProfile.pagePatterns.treeListPage, 1);
  assert.equal(projectProfile.pagePatterns.detailPage, 3);
  assert.equal(projectProfile.pagePatterns.dialogFormCrud, 4);
  assert.equal(projectProfile.fileRoleSummary.dialogFragment, 1);
  assert.deepEqual(
    patternsPayload.patterns.map((pattern) => pattern.type).sort((left, right) => left.localeCompare(right, "zh-CN")),
    ["basic-list-page", "detail-page", "dialog-form", "tree-list-page"]
  );
  assert.equal(
    patternsPayload.patterns.find((pattern) => pattern.type === "basic-list-page")?.componentStack.page,
    "PcLayoutPageCommon"
  );
  assert.equal(
    patternsPayload.patterns.find((pattern) => pattern.type === "basic-list-page")?.dominantSubpattern,
    "basic-list-with-dialog"
  );
  assert.equal(
    patternsPayload.patterns.find((pattern) => pattern.type === "dialog-form")?.subpatterns.some((item) => item.name === "fragment-dialog-form"),
    true
  );
  assert.equal(
    patternsPayload.patterns.find((pattern) => pattern.type === "basic-list-page")?.reuseScore >= 68,
    true
  );
  assert.equal(
    patternsPayload.patterns.find((pattern) => pattern.type === "detail-page")?.files.includes("src/views/dataAccess/add.vue"),
    false
  );
  assert.equal(patternDiff.summary.added, 4);
  assert.equal(patternDiff.summary.changed, 0);
  assert.equal(patternDiff.summary.removed, 0);
  assert.equal(patternHistory.snapshots.length, 1);
  assert.equal(componentGraph.summary.nodeCount, 9);
  assert.equal(componentGraph.summary.edgeCount, 0);
  assert.equal(componentPropagation.summary.fileCount, 9);
  assert.equal(componentPropagation.summary.maxReachDepth, 0);
  assert.equal(
    patternReview.patterns.find((pattern) => pattern.type === "tree-list-page")?.decision,
    "skip"
  );
  assert.equal(
    patternReview.patterns.find((pattern) => pattern.type === "basic-list-page")?.decision,
    "generate"
  );
  assert.equal(
    patternReview.patterns.find((pattern) => pattern.type === "dialog-form")?.decision,
    "review"
  );
  assert.deepEqual(patternReview.summary, { generate: 2, review: 1, skip: 1 });
  assert.deepEqual(patternFeedback.summary, { total: 0, generate: 0, review: 0, skip: 0 });
  assert.equal(patternReview.feedbackSummary.overrides, 0);
  assert.equal(patternReview.feedbackSummary.applied, 0);
  assert.deepEqual(patternReview.thresholds, {
    minFrequencyToGenerate: 3,
    minConfidenceToGenerate: "high",
    minPurityScoreToGenerate: 70,
    minReuseScoreToGenerate: 68
  });
  const reviewByType = new Map(patternReview.patterns.map((pattern) => [pattern.type, pattern]));
  assert.equal(reviewByType.get("basic-list-page")?.reasons.length, 1);
  assert.equal(reviewByType.get("tree-list-page")?.reasons.join("\n").includes("3"), true);
  assert.equal(reviewByType.get("dialog-form")?.reasons.some((reason) => reason.includes("fragment-dialog-form")), true);
  assert.equal(summaryReport.includes("tree-list-page"), true);
  assert.equal(diffReport.includes("basic-list-page"), true);
  assert.equal(feedbackReport.includes("No manual project scan feedback overrides."), true);
  assert.equal(componentGraphReport.includes("Component Graph Summary"), true);
  assert.equal(componentPropagationReport.includes("Component Propagation Summary"), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-diff.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-history.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-feedback.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "component-graph.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "component-propagation.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "project-scan-feedback.md")), true);

  const generateResult = runCli(projectRoot, "generate-project-local-skills");
  assert.equal(generateResult.status, 0, generateResult.stderr);

  const autoGeneratedRoot = path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated");
  assert.deepEqual(
    fs.readdirSync(autoGeneratedRoot).sort((left, right) => left.localeCompare(right, "zh-CN")),
    [
      "basic-list-page-project",
      "detail-page-project",
      "README.md"
    ]
  );

  const basicMeta = JSON.parse(
    fs.readFileSync(path.join(autoGeneratedRoot, "basic-list-page-project", "skill.meta.json"), "utf8")
  );
  assert.equal(basicMeta.baseSkill, "basic-list-page");
  assert.equal(basicMeta.status, "draft");
  assert.equal(basicMeta.source, "project-scan");
  assert.equal(basicMeta.reviewDecision, "generate");
  assert.equal(
    fs.existsSync(path.join(autoGeneratedRoot, "tree-list-page-project")),
    false
  );

  const basicSkillMd = fs.readFileSync(
    path.join(autoGeneratedRoot, "basic-list-page-project", "SKILL.md"),
    "utf8"
  );
  assert.equal(basicSkillMd.includes("../../../ui/basic-list-page/SKILL.md"), true);
  assert.equal(basicSkillMd.includes("promote-project-local-skill basic-list-page-project"), true);
});

test("generate-project-local-skills keeps drafts unchanged when only generatedAt changes", (t) => {
  const projectRoot = createProjectScanFixture(t);

  assert.equal(runCli(projectRoot, "scan-project").status, 0);
  const firstGenerate = runCli(projectRoot, "generate-project-local-skills");
  assert.equal(firstGenerate.status, 0, firstGenerate.stderr);

  const autoGeneratedRoot = path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated");
  const skillPath = path.join(autoGeneratedRoot, "basic-list-page-project", "SKILL.md");
  const metaPath = path.join(autoGeneratedRoot, "basic-list-page-project", "skill.meta.json");
  const skillBefore = fs.readFileSync(skillPath, "utf8");
  const metaBefore = JSON.parse(fs.readFileSync(metaPath, "utf8"));

  const patternsPath = path.join(projectRoot, ".power-ai", "analysis", "patterns.json");
  const patternsPayload = JSON.parse(fs.readFileSync(patternsPath, "utf8"));
  patternsPayload.generatedAt = "2099-01-01T00:00:00.000Z";
  fs.writeFileSync(patternsPath, `${JSON.stringify(patternsPayload, null, 2)}\n`, "utf8");

  const secondGenerate = runCli(projectRoot, "generate-project-local-skills");
  assert.equal(secondGenerate.status, 0, secondGenerate.stderr);
  assert.equal(secondGenerate.stdout.includes("created: 0"), true);
  assert.equal(secondGenerate.stdout.includes("updated: 0"), true);
  assert.equal(secondGenerate.stdout.includes("removed: 0"), true);
  assert.equal(secondGenerate.stdout.includes("project-local drafts already up to date"), true);

  const skillAfter = fs.readFileSync(skillPath, "utf8");
  const metaAfter = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  assert.equal(skillAfter, skillBefore);
  assert.deepEqual(metaAfter, metaBefore);
});

test("generate-project-local-skills incrementally updates changed drafts and removes stale ones", (t) => {
  const projectRoot = createProjectScanFixture(t);

  assert.equal(runCli(projectRoot, "scan-project").status, 0);
  assert.equal(runCli(projectRoot, "generate-project-local-skills").status, 0);

  const autoGeneratedRoot = path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated");
  const patternsPath = path.join(projectRoot, ".power-ai", "analysis", "patterns.json");
  const patternReviewPath = path.join(projectRoot, ".power-ai", "analysis", "pattern-review.json");

  const patternsPayload = JSON.parse(fs.readFileSync(patternsPath, "utf8"));
  const patternReview = JSON.parse(fs.readFileSync(patternReviewPath, "utf8"));

  const basicPattern = patternsPayload.patterns.find((pattern) => pattern.type === "basic-list-page");
  basicPattern.features = [...(basicPattern.features || []), "incremental-update-signal"];
  basicPattern.sampleFiles = [...(basicPattern.sampleFiles || []), "src/views/incremental/example.vue"];
  patternsPayload.generatedAt = "2099-02-02T00:00:00.000Z";
  patternsPayload.patterns = patternsPayload.patterns.filter((pattern) => pattern.type !== "detail-page");
  patternReview.patterns = patternReview.patterns.filter((pattern) => pattern.type !== "detail-page");
  patternReview.summary.generate = 1;

  fs.writeFileSync(patternsPath, `${JSON.stringify(patternsPayload, null, 2)}\n`, "utf8");
  fs.writeFileSync(patternReviewPath, `${JSON.stringify(patternReview, null, 2)}\n`, "utf8");

  const generateResult = runCli(projectRoot, "generate-project-local-skills");
  assert.equal(generateResult.status, 0, generateResult.stderr);
  assert.equal(generateResult.stdout.includes("created: 0"), true);
  assert.equal(generateResult.stdout.includes("updated: 1"), true);
  assert.equal(generateResult.stdout.includes("removed: 1"), true);
  assert.equal(generateResult.stdout.includes("unchanged: 0"), true);

  const basicSkillMd = fs.readFileSync(
    path.join(autoGeneratedRoot, "basic-list-page-project", "SKILL.md"),
    "utf8"
  );
  const basicMeta = JSON.parse(
    fs.readFileSync(path.join(autoGeneratedRoot, "basic-list-page-project", "skill.meta.json"), "utf8")
  );

  assert.equal(basicSkillMd.includes("incremental-update-signal"), true);
  assert.equal(basicMeta.features.includes("incremental-update-signal"), true);
  assert.equal(fs.existsSync(path.join(autoGeneratedRoot, "detail-page-project")), false);
});

test("init runs project scan by default and writes analysis plus auto-generated skills", (t) => {
  const projectRoot = createProjectScanFixture(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "selected-tools.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "project-profile.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "patterns.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-review.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-feedback.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "project-scan-summary.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "project-scan-feedback.md")), true);
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated", "basic-list-page-project", "SKILL.md")
    ),
    true
  );
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated", "tree-list-page-project")
    ),
    false
  );
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-diff.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-history.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "component-graph.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "component-propagation.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "project-scan-diff.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "component-graph-summary.md")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "reports", "component-propagation-summary.md")), true);
});

test("init auto-detects enterprise-vue project profile for vue workspace defaults", (t) => {
  const projectRoot = createProjectScanFixture(t);
  const initResult = runCli(projectRoot, "init", ["--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const selectedTools = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "selected-tools.json"), "utf8")
  );
  assert.equal(selectedTools.selectedProjectProfile, "enterprise-vue");
  assert.deepEqual(selectedTools.selectedPresets, ["enterprise-standard"]);
});

test("init respects --no-project-scan and keeps legacy behavior", (t) => {
  const projectRoot = createProjectScanFixture(t);
  const initResult = runCli(projectRoot, "init", ["--tool", "codex", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "selected-tools.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".power-ai", "analysis")), false);
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated")),
    false
  );
});

test("component graph links page to dialog fragment and enriches dialog-form detection", (t) => {
  const projectRoot = createProjectScanFixture(t);

  writeFile(
    path.join(projectRoot, "src", "views", "orders", "components", "OrdersDialog.vue"),
    `<template>
  <pc-dialog>
    <el-form>
      <el-form-item />
    </el-form>
  </pc-dialog>
</template>
<script setup lang="ts">
const formModel = {};
function handleSubmit() {}
</script>
`
  );

  writeFile(
    path.join(projectRoot, "src", "views", "orders", "index.vue"),
    `<template>
  <pc-layout-page-common>
    <OrdersDialog />
  </pc-layout-page-common>
</template>
<script setup lang="ts">
import OrdersDialog from "./components/OrdersDialog.vue";
function handleAdd() {}
</script>
`
  );

  const scanResult = runCli(projectRoot, "scan-project");
  assert.equal(scanResult.status, 0, scanResult.stderr);

  const patternsPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "patterns.json"), "utf8")
  );
  const componentGraph = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "component-graph.json"), "utf8")
  );

  const dialogPattern = patternsPayload.patterns.find((pattern) => pattern.type === "dialog-form");
  assert.equal(dialogPattern.files.includes("src/views/orders/index.vue"), true);
  assert.equal(dialogPattern.relatedComponents.includes("src/views/orders/components/OrdersDialog.vue"), true);
  assert.equal(dialogPattern.supportingFragments.includes("src/views/orders/components/OrdersDialog.vue"), true);
  assert.equal(
    componentGraph.edges.some((edge) => edge.from === "src/views/orders/index.vue" && edge.to === "src/views/orders/components/OrdersDialog.vue" && edge.usedInTemplate),
    true
  );
  assert.equal(componentGraph.summary.pageToFragmentEdgeCount >= 1, true);
});

test("component propagation reaches nested dialog fragments through multi-hop component chains", (t) => {
  const projectRoot = createProjectScanFixture(t);

  writeFile(
    path.join(projectRoot, "src", "views", "orders", "components", "DialogShell.vue"),
    `<template>
  <pc-dialog>
    <el-form>
      <el-form-item />
    </el-form>
  </pc-dialog>
</template>
<script setup lang="ts">
const formModel = {};
function handleSubmit() {}
</script>
`
  );

  writeFile(
    path.join(projectRoot, "src", "views", "orders", "components", "OrdersDialog.vue"),
    `<template>
  <DialogShell />
</template>
<script setup lang="ts">
import DialogShell from "./DialogShell.vue";
</script>
`
  );

  writeFile(
    path.join(projectRoot, "src", "views", "orders", "index.vue"),
    `<template>
  <pc-layout-page-common>
    <OrdersDialog />
  </pc-layout-page-common>
</template>
<script setup lang="ts">
import OrdersDialog from "./components/OrdersDialog.vue";
function handleAdd() {}
</script>
`
  );

  const scanResult = runCli(projectRoot, "scan-project");
  assert.equal(scanResult.status, 0, scanResult.stderr);

  const patternsPayload = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "patterns.json"), "utf8")
  );
  const componentPropagation = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "component-propagation.json"), "utf8")
  );
  const projectProfile = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "project-profile.json"), "utf8")
  );

  const dialogPattern = patternsPayload.patterns.find((pattern) => pattern.type === "dialog-form");
  const orderPageMatch = dialogPattern.matchedFiles.find((item) => item.path === "src/views/orders/index.vue");
  const propagationEntry = componentPropagation.files.find((item) => item.path === "src/views/orders/index.vue");

  assert.equal(dialogPattern.files.includes("src/views/orders/index.vue"), true);
  assert.equal(dialogPattern.transitiveRelatedComponents.includes("src/views/orders/components/DialogShell.vue"), true);
  assert.equal(dialogPattern.transitiveSupportingFragments.includes("src/views/orders/components/DialogShell.vue"), true);
  assert.equal(orderPageMatch.transitiveRelatedComponentPaths.includes("src/views/orders/components/DialogShell.vue"), true);
  assert.equal(orderPageMatch.transitiveSupportingFragmentPaths.includes("src/views/orders/components/DialogShell.vue"), true);
  assert.equal(
    propagationEntry.reachableFragments.some((item) => item.path === "src/views/orders/components/DialogShell.vue" && item.depth === 2),
    true
  );
  assert.equal(componentPropagation.summary.maxReachDepth >= 2, true);
  assert.equal(projectProfile.componentPropagationSummary.maxReachDepth >= 2, true);
});

test("scan-project tolerates malformed vue files during AST parsing", (t) => {
  const projectRoot = createProjectScanFixture(t);
  writeFile(
    path.join(projectRoot, "src", "views", "broken", "index.vue"),
    `<template>
  <pc-layout-page-common>
    <pc-dialog>
  </pc-layout-page-common>
</template>
<script setup lang="ts">
const = ;
</script>
`
  );

  const scanResult = runCli(projectRoot, "scan-project");
  assert.equal(scanResult.status, 0, scanResult.stderr);
  assert.equal(
    fs.existsSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-review.json")),
    true
  );
});

test("scan history diff, list-project-local-skills, and promote-project-local-skill work together", (t) => {
  const projectRoot = createProjectScanFixture(t);

  const firstScan = runCli(projectRoot, "scan-project");
  assert.equal(firstScan.status, 0, firstScan.stderr);

  writeFile(
    path.join(projectRoot, "src", "views", "catalog", "index.vue"),
    `<template>
  <pc-layout-page-common>
    <pc-table-warp />
  </pc-layout-page-common>
</template>
<script setup lang="ts">
const searchForm = {};
const pageValue = { pageNum: 1, pageSize: 20 };
function getList() {}
</script>
`
  );

  const secondScan = runCli(projectRoot, "scan-project");
  assert.equal(secondScan.status, 0, secondScan.stderr);

  const patternDiff = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-diff.json"), "utf8")
  );
  const patternHistory = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-history.json"), "utf8")
  );

  assert.equal(patternHistory.snapshots.length, 2);
  assert.equal(patternDiff.summary.changed >= 1, true);
  assert.equal(
    patternDiff.changes.some((item) => item.type === "basic-list-page" && item.changeType === "changed"),
    true
  );

  const generateResult = runCli(projectRoot, "generate-project-local-skills");
  assert.equal(generateResult.status, 0, generateResult.stderr);

  const listBeforePromote = runCli(projectRoot, "list-project-local-skills");
  assert.equal(listBeforePromote.status, 0, listBeforePromote.stderr);
  assert.equal(listBeforePromote.stdout.includes("detail-page-project"), true);
  assert.equal(listBeforePromote.stdout.includes("manual: 0"), true);

  const promoteResult = runCli(projectRoot, "promote-project-local-skill", ["detail-page-project"]);
  assert.equal(promoteResult.status, 0, promoteResult.stderr);

  const manualMeta = JSON.parse(
    fs.readFileSync(
      path.join(projectRoot, ".power-ai", "skills", "project-local", "manual", "detail-page-project", "skill.meta.json"),
      "utf8"
    )
  );
  assert.equal(manualMeta.status, "active");
  assert.equal(manualMeta.source, "manual-promoted");
  assert.equal(manualMeta.promotedFrom, "auto-generated/detail-page-project");

  const promotionTrace = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "governance", "promotion-trace.json"), "utf8")
  );
  const manualPromotionTrace = promotionTrace.relations.find((item) => item.relationType === "project-skill->manual-project-skill");
  assert.equal(manualPromotionTrace.source.id, "detail-page-project");
  assert.equal(manualPromotionTrace.target.id, "detail-page-project");

  const listAfterPromote = runCli(projectRoot, "list-project-local-skills");
  assert.equal(listAfterPromote.status, 0, listAfterPromote.stderr);
  assert.equal(listAfterPromote.stdout.includes("manual: 1"), true);

  const traceCommand = runCli(projectRoot, "show-promotion-trace", ["--skill", "detail-page-project", "--json"]);
  assert.equal(traceCommand.status, 0, traceCommand.stderr);
  const tracePayload = JSON.parse(traceCommand.stdout);
  assert.equal(tracePayload.matchCount >= 1, true);
  assert.equal(tracePayload.matches.some((item) => item.relationType === "project-skill->manual-project-skill"), true);

  const diffCommand = runCli(projectRoot, "diff-project-scan");
  assert.equal(diffCommand.status, 0, diffCommand.stderr);
  assert.equal(diffCommand.stdout.includes("added:"), true);
});

test("plan-project-local-promotions returns dry-run eligibility, blockers, and manual confirmation commands", (t) => {
  const projectRoot = createProjectScanFixture(t);

  assert.equal(runCli(projectRoot, "scan-project").status, 0);
  assert.equal(runCli(projectRoot, "generate-project-local-skills").status, 0);

  const eligiblePlan = runCli(projectRoot, "plan-project-local-promotions", ["--skill", "detail-page-project", "--json"]);
  assert.equal(eligiblePlan.status, 0, eligiblePlan.stderr);
  const eligiblePayload = JSON.parse(eligiblePlan.stdout);
  const eligibleCandidate = eligiblePayload.candidates[0];

  assert.equal(eligiblePayload.summary.evaluatedSkillCount, 1);
  assert.equal(eligiblePayload.summary.eligibleCount, 1);
  assert.equal(eligiblePayload.summary.blockedCount, 0);
  assert.deepEqual(eligiblePayload.criteria.allowedConfidence, ["high", "medium"]);
  assert.equal(eligiblePayload.manualConfirmation.commandTemplate, "npx power-ai-skills promote-project-local-skill <skill-name>");
  assert.equal(eligibleCandidate.skillName, "detail-page-project");
  assert.equal(eligibleCandidate.status, "eligible");
  assert.equal(eligibleCandidate.blockers.length, 0);
  assert.equal(
    eligibleCandidate.manualConfirmation.command,
    "npx power-ai-skills promote-project-local-skill detail-page-project"
  );

  const autoGeneratedRoot = path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated");
  const basicMetaPath = path.join(autoGeneratedRoot, "basic-list-page-project", "skill.meta.json");
  const basicMeta = JSON.parse(fs.readFileSync(basicMetaPath, "utf8"));
  basicMeta.reuseScore = 30;
  fs.writeFileSync(basicMetaPath, `${JSON.stringify(basicMeta, null, 2)}\n`, "utf8");

  const promoteResult = runCli(projectRoot, "promote-project-local-skill", ["detail-page-project"]);
  assert.equal(promoteResult.status, 0, promoteResult.stderr);

  const basicPlan = runCli(projectRoot, "plan-project-local-promotions", ["--skill", "basic-list-page-project", "--json"]);
  assert.equal(basicPlan.status, 0, basicPlan.stderr);
  const basicPayload = JSON.parse(basicPlan.stdout);
  const basicCandidate = basicPayload.candidates[0];

  assert.equal(basicCandidate.status, "blocked");
  assert.equal(
    basicCandidate.blockers.some((item) => item.code === "reuse-score-below-threshold"),
    true
  );

  const detailPlan = runCli(projectRoot, "plan-project-local-promotions", ["--skill", "detail-page-project", "--json"]);
  assert.equal(detailPlan.status, 0, detailPlan.stderr);
  const detailPayload = JSON.parse(detailPlan.stdout);
  const detailCandidate = detailPayload.candidates[0];

  assert.equal(detailCandidate.status, "blocked");
  assert.equal(
    detailCandidate.blockers.some((item) => item.code === "manual-skill-already-exists"),
    true
  );
  assert.equal(detailCandidate.evidence.existingManualSkill !== null, true);
});

test("review-project-pattern feedback overrides scan decisions and subsequent draft generation", (t) => {
  const projectRoot = createProjectScanFixture(t);

  const initialScan = runCli(projectRoot, "scan-project");
  assert.equal(initialScan.status, 0, initialScan.stderr);

  const initialReview = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-review.json"), "utf8")
  );
  assert.equal(
    initialReview.patterns.find((pattern) => pattern.type === "tree-list-page")?.decision,
    "skip"
  );

  const reviewResult = runCli(projectRoot, "review-project-pattern", [
    "pattern_tree_list_page",
    "--decision",
    "generate",
    "--note",
    "manual whitelist for a high-value pattern",
    "--json"
  ]);
  assert.equal(reviewResult.status, 0, reviewResult.stderr);

  const reviewPayload = JSON.parse(reviewResult.stdout);
  assert.equal(reviewPayload.patternType, "tree-list-page");
  assert.equal(reviewPayload.currentReview.decision, "generate");
  assert.equal(reviewPayload.currentReview.autoDecision, "skip");
  assert.equal(reviewPayload.currentReview.decisionSource, "feedback");

  const patternFeedback = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-feedback.json"), "utf8")
  );
  const updatedReview = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-review.json"), "utf8")
  );
  const feedbackReport = fs.readFileSync(
    path.join(projectRoot, ".power-ai", "reports", "project-scan-feedback.md"),
    "utf8"
  );

  assert.equal(patternFeedback.summary.total, 1);
  assert.equal(patternFeedback.overrides[0].patternId, "pattern_tree_list_page");
  assert.equal(patternFeedback.overrides[0].decision, "generate");
  assert.equal(patternFeedback.overrides[0].note, "manual whitelist for a high-value pattern");
  assert.equal(updatedReview.feedbackSummary.overrides, 1);
  assert.equal(updatedReview.feedbackSummary.applied, 1);
  assert.equal(
    updatedReview.patterns.find((pattern) => pattern.type === "tree-list-page")?.feedbackNote,
    "manual whitelist for a high-value pattern"
  );
  assert.equal(feedbackReport.includes("manual whitelist for a high-value pattern"), true);

  const generateWithFeedback = runCli(projectRoot, "generate-project-local-skills");
  assert.equal(generateWithFeedback.status, 0, generateWithFeedback.stderr);
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated", "tree-list-page-project", "SKILL.md")
    ),
    true
  );

  const clearResult = runCli(projectRoot, "review-project-pattern", [
    "tree-list-page",
    "--clear",
    "--json"
  ]);
  assert.equal(clearResult.status, 0, clearResult.stderr);

  const clearedPayload = JSON.parse(clearResult.stdout);
  assert.equal(clearedPayload.cleared, true);

  const clearedFeedback = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-feedback.json"), "utf8")
  );
  const clearedReview = JSON.parse(
    fs.readFileSync(path.join(projectRoot, ".power-ai", "analysis", "pattern-review.json"), "utf8")
  );
  assert.equal(clearedFeedback.summary.total, 0);
  assert.equal(clearedReview.feedbackSummary.overrides, 0);
  assert.equal(
    clearedReview.patterns.find((pattern) => pattern.type === "tree-list-page")?.decision,
    "skip"
  );

  const generateAfterClear = runCli(projectRoot, "generate-project-local-skills");
  assert.equal(generateAfterClear.status, 0, generateAfterClear.stderr);
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, ".power-ai", "skills", "project-local", "auto-generated", "tree-list-page-project")
    ),
    false
  );
});
