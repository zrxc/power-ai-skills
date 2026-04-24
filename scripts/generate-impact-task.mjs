/**
 * 升级任务生成脚本
 * 目标：
 * 1. 根据 impact-check 的报告生成一份可直接投放到 issue / MR 的任务清单；
 * 2. 把“看 JSON 报告”转换成“谁来改、改什么、先做什么”的协作文本；
 * 3. 支持直接传 changed files，也支持复用已生成的 impact report。
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ensureDir, readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson(path.join(root, "package.json"));
const impactScriptPath = path.join(root, "scripts", "impact-check.mjs");
const outputDir = path.join(root, "manifest", "impact-tasks");

function printUsageAndExit() {
  console.log("用法：node ./scripts/generate-impact-task.mjs <changed-file-1> <changed-file-2> ...");
  console.log("或者：node ./scripts/generate-impact-task.mjs --report manifest/impact-report.json");
  process.exit(0);
}

function parseArgs(argv) {
  if (argv.length === 0) {
    printUsageAndExit();
  }

  const reportIndex = argv.indexOf("--report");
  if (reportIndex !== -1) {
    const reportPath = argv[reportIndex + 1];
    if (!reportPath) {
      console.error("[generate-impact-task] --report 后缺少报告路径");
      process.exit(1);
    }

    return {
      mode: "report",
      reportPath: path.resolve(reportPath)
    };
  }

  return {
    mode: "files",
    changedFiles: argv.filter((arg) => !arg.startsWith("--"))
  };
}

/**
 * 优先复用已有 impact 报告，避免同一批 changed files 被重复分析。
 * 如果直接传的是 changed files，则内部调用 impact-check 得到统一格式的 JSON。
 */
function loadImpactReport(args) {
  if (args.mode === "report") {
    if (!fs.existsSync(args.reportPath)) {
      console.error(`[generate-impact-task] 找不到影响报告：${args.reportPath}`);
      process.exit(1);
    }
    return readJson(args.reportPath);
  }

  const result = spawnSync(process.execPath, [impactScriptPath, ...args.changedFiles], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  return JSON.parse(result.stdout);
}

function getTimestampTag() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function renderOwnerSection(report) {
  if (!report.ownerSummary?.length) {
    return "- 暂未识别到 owner，请手动补充";
  }

  return report.ownerSummary
    .map((item) => `- ${item.owner}：${item.affectedSkillCount} 个 skill`)
    .join("\n");
}

function renderSkillSection(report) {
  if (!report.impactedSkills?.length) {
    return "- 本次未命中任何 skill，请人工确认规则是否需要补充";
  }

  return report.impactedSkills
    .map((skill) => {
      const reasons = skill.reasons.map((reason) => `  - 原因：${reason}`).join("\n");
      const reviewTargets = skill.reviewTargets.map((target) => `  - 检查点：${target}`).join("\n");
      const owners = skill.owners.join("、");
      return `- ${skill.name}（${skill.skillPath}，owner：${owners}，建议级别：${skill.recommendedReleaseLevel}）\n${reasons}\n${reviewTargets}`;
    })
    .join("\n");
}

function renderFollowUps(report) {
  if (!report.followUps?.length) {
    return "- 无额外 follow-up，按常规流程处理";
  }

  return report.followUps.map((item) => `- ${item}`).join("\n");
}

function buildMarkdown(report) {
  return `# 升级影响任务

## 基本信息

- 包名：\`${report.packageName}\`
- 目标版本：\`${report.version}\`
- 建议发版级别：\`${report.recommendedReleaseLevel}\`
- 影响域：${report.affectedDomains?.join("、") || "无"}

## 变更文件

${report.changedFiles.map((file) => `- \`${file}\``).join("\n")}

## Owner 汇总

${renderOwnerSection(report)}

## 受影响 Skill

${renderSkillSection(report)}

## 后续动作

${renderFollowUps(report)}

## 推荐执行顺序

1. 先按 owner 认领受影响 skill。
2. 更新 skill 的 \`references/\`、\`SKILL.md\`、\`skill.meta.json\`。
3. 如涉及基础版本变化，同步更新 \`baseline/current.json\` 和 \`docs/compatibility-matrix.md\`。
4. 执行 \`pnpm release:prepare\`。
5. 在消费项目执行 \`node ./scripts/verify-consumer.mjs <project-path>\`。
`;
}

const args = parseArgs(process.argv.slice(2));
const report = loadImpactReport(args);
const markdown = buildMarkdown(report);

ensureDir(outputDir);
const outputPath = path.join(outputDir, `impact-task-${getTimestampTag()}.md`);
fs.writeFileSync(outputPath, markdown, "utf8");

console.log(JSON.stringify({
  packageName: packageJson.name,
  version: packageJson.version,
  outputPath
}, null, 2));
