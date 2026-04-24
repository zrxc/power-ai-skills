import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "bin", "power-ai-skills.mjs");

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
