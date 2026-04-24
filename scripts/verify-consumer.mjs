/**
 * 消费者验证脚本
 * 功能：验证业务项目接入 power-ai-skills 后的状态，确保所有必要的文件和配置都正确生成
 */

// 导入必要的模块
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildConsumerCompatibilityMarkdown, buildConsumerCompatibilityMatrix } from "../src/consumer-compatibility/index.mjs";
import { copyDir, readJson, removeDirIfExists, safeTrim } from "./shared.mjs";

// 获取项目根目录路径
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 读取 package.json 文件内容
const packageJson = readJson(path.join(root, "package.json"));
// CLI 工具路径
const cliPath = path.join(root, "bin", "power-ai-skills.mjs");
// 默认执行的命令列表
const defaultCommands = ["init", "sync", "doctor"];

/**
 * 项目必须存在的 artifacts 列表
 * 每个 artifact 包含：
 * - id: 唯一标识符
 * - code: 错误代码
 * - relativePath: 相对路径
 */
const requiredProjectArtifacts = [
  {
    id: "component-registry",
    code: "PAI-VERIFY-ARTIFACT-001",
    relativePath: ".power-ai/skills/foundation/power-component-library/references/generated/component-registry.json"
  },
  {
    id: "tree-user-crud-recipe",
    code: "PAI-VERIFY-ARTIFACT-002",
    relativePath: ".power-ai/skills/foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json"
  },
  {
    id: "basic-list-crud-recipe",
    code: "PAI-VERIFY-ARTIFACT-003",
    relativePath: ".power-ai/skills/foundation/power-component-library/references/generated/page-recipes/basic-list-crud.json"
  },
  {
    id: "pc-tree-guide",
    code: "PAI-VERIFY-ARTIFACT-004",
    relativePath: ".power-ai/skills/foundation/power-component-library/references/generated/component-guides/pc-tree.md"
  },
  {
    id: "pc-table-warp-guide",
    code: "PAI-VERIFY-ARTIFACT-005",
    relativePath: ".power-ai/skills/foundation/power-component-library/references/generated/component-guides/pc-table-warp.md"
  },
  {
    id: "pc-dialog-guide",
    code: "PAI-VERIFY-ARTIFACT-006",
    relativePath: ".power-ai/skills/foundation/power-component-library/references/generated/component-guides/pc-dialog.md"
  },
  {
    id: "pc-container-guide",
    code: "PAI-VERIFY-ARTIFACT-007",
    relativePath: ".power-ai/skills/foundation/power-component-library/references/generated/component-guides/pc-container.md"
  },
  {
    id: "tree-list-skill",
    code: "PAI-VERIFY-ARTIFACT-008",
    relativePath: ".power-ai/skills/ui/tree-list-page/SKILL.md"
  },
  {
    id: "basic-list-skill",
    code: "PAI-VERIFY-ARTIFACT-009",
    relativePath: ".power-ai/skills/ui/basic-list-page/SKILL.md"
  },
  {
    id: "entry-skill",
    code: "PAI-VERIFY-ARTIFACT-010",
    relativePath: ".power-ai/skills/orchestration/entry-skill/SKILL.md"
  }
];

/**
 * 测试夹具定义
 * 键为夹具名称，值为夹具目录路径
 */
const fixtureDefinitions = new Map([
  ["basic", path.join(root, "tests", "fixtures", "consumer-basic")]
]);

/**
 * 打印用法信息并退出
 */
function printUsageAndExit() {
  console.log("Usage: node ./scripts/verify-consumer.mjs <project-path-1> [project-path-2] ...");
  console.log("Optional: --commands init,sync,doctor");
  console.log("Optional: --profile <profile-name>");
  console.log("Optional: --tool <tool-name> (repeatable)");
  console.log("Optional: --fixture basic");
  console.log("Optional: --matrix-json <output-path>");
  console.log("Optional: --matrix-markdown <output-path>");
  process.exit(0);
}

/**
 * 解析命令行参数
 * @param {string[]} argv - 命令行参数数组
 * @returns {object} 解析后的参数对象
 */
function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) printUsageAndExit();

  const commandsIndex = argv.indexOf("--commands");
  const commands = commandsIndex === -1
    ? defaultCommands
    : argv[commandsIndex + 1]?.split(",").map((item) => item.trim()).filter(Boolean);
  const profileIndex = argv.indexOf("--profile");
  const profile = profileIndex === -1 ? "" : argv[profileIndex + 1];
  const matrixJsonIndex = argv.indexOf("--matrix-json");
  const matrixMarkdownIndex = argv.indexOf("--matrix-markdown");
  const requestedTools = [];
  const fixtures = [];

  if (!commands || commands.length === 0) {
    console.error("[verify-consumer] Missing command list after --commands");
    process.exit(1);
  }

  if (profileIndex !== -1 && !profile) {
    console.error("[verify-consumer] Missing profile name after --profile");
    process.exit(1);
  }

  const matrixJsonPath = matrixJsonIndex === -1 ? "" : path.resolve(argv[matrixJsonIndex + 1] || "");
  const matrixMarkdownPath = matrixMarkdownIndex === -1 ? "" : path.resolve(argv[matrixMarkdownIndex + 1] || "");

  if (matrixJsonIndex !== -1 && !matrixJsonPath) {
    console.error("[verify-consumer] Missing output path after --matrix-json");
    process.exit(1);
  }

  if (matrixMarkdownIndex !== -1 && !matrixMarkdownPath) {
    console.error("[verify-consumer] Missing output path after --matrix-markdown");
    process.exit(1);
  }

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--tool") {
      const toolName = argv[index + 1];
      if (!toolName || toolName.startsWith("--")) {
        console.error("[verify-consumer] Missing tool name after --tool");
        process.exit(1);
      }
      requestedTools.push(toolName);
      continue;
    }

    if (argv[index] === "--fixture") {
      const fixtureName = argv[index + 1];
      if (!fixtureName || fixtureName.startsWith("--")) {
        console.error("[verify-consumer] Missing fixture name after --fixture");
        process.exit(1);
      }
      fixtures.push(fixtureName);
    }
  }

  const projectPaths = argv.filter((arg, index) => {
    if (arg.startsWith("--")) return false;
    if (commandsIndex !== -1 && index === commandsIndex + 1) return false;
    if (profileIndex !== -1 && index === profileIndex + 1) return false;
    if (matrixJsonIndex !== -1 && index === matrixJsonIndex + 1) return false;
    if (matrixMarkdownIndex !== -1 && index === matrixMarkdownIndex + 1) return false;
    if (index > 0 && argv[index - 1] === "--tool") return false;
    if (index > 0 && argv[index - 1] === "--fixture") return false;
    return true;
  });

  if (projectPaths.length === 0 && fixtures.length === 0) fixtures.push("basic");

  return { commands, profile, requestedTools, projectPaths, fixtures, matrixJsonPath, matrixMarkdownPath };
}

/**
 * 运行 CLI 命令
 * @param {string} projectRoot - 项目根目录
 * @param {string} command - 要执行的命令
 * @param {object} options - 选项对象
 * @returns {object} 命令执行结果
 */
function runCliCommand(projectRoot, command, options) {
  const args = [cliPath, command, "--project", projectRoot];
  if (command === "init") {
    if (options.requestedTools.length > 0) {
      for (const toolName of options.requestedTools) args.push("--tool", toolName);
    } else if (options.profile) {
      args.push("--profile", options.profile);
    }
  }
  if (command === "doctor") args.push("--json");

  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8"
  });
}

/**
 * 验证项目路径
 * @param {string} projectPath - 项目路径
 * @returns {object} 验证结果
 */
function validateProjectPath(projectPath) {
  const absolutePath = path.resolve(projectPath);
  if (!fs.existsSync(absolutePath)) {
    return { ok: false, absolutePath, reason: "Project path does not exist" };
  }

  if (!fs.existsSync(path.join(absolutePath, "package.json"))) {
    return { ok: false, absolutePath, reason: "Project root is missing package.json" };
  }

  return { ok: true, absolutePath };
}

/**
 * 准备夹具项目
 * @param {string} fixtureName - 夹具名称
 * @returns {object} 准备结果
 */
function prepareFixtureProject(fixtureName) {
  const fixtureRoot = fixtureDefinitions.get(fixtureName);
  if (!fixtureRoot) {
    return { ok: false, reason: `Unknown fixture: ${fixtureName}` };
  }

  if (!fs.existsSync(fixtureRoot)) {
    return { ok: false, reason: `Fixture directory does not exist: ${fixtureRoot}` };
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `power-ai-skills-verify-${fixtureName}-`));
  const projectRoot = path.join(tempRoot, fixtureName);
  copyDir(fixtureRoot, projectRoot);
  return {
    ok: true,
    fixtureName,
    projectRoot,
    cleanup() {
      removeDirIfExists(tempRoot);
    }
  };
}

/**
 * 标准化命令报告
 * @param {object} commandReport - 命令报告
 * @returns {object} 标准化后的命令报告
 */
function normalizeCommandReport(commandReport) {
  if (commandReport.command !== "doctor") {
    return {
      ...commandReport,
      failureCodes: commandReport.ok ? [] : [`PAI-VERIFY-COMMAND-${commandReport.command.toUpperCase()}-FAILED`]
    };
  }

  try {
    const doctorPayload = JSON.parse(commandReport.stdout);
    if (!doctorPayload.ok) {
      return {
        ...commandReport,
        ok: false,
        exitCode: 1,
        stderr: commandReport.stderr || "doctor reported ok=false",
        doctorPayload,
        failureCodes: doctorPayload.failureCodes || ["PAI-VERIFY-COMMAND-DOCTOR-FAILED"]
      };
    }

    return {
      ...commandReport,
      doctorPayload,
      failureCodes: doctorPayload.failureCodes || []
    };
  } catch (error) {
    return {
      ...commandReport,
      ok: false,
      exitCode: 1,
      stderr: `${commandReport.stderr}\nFailed to parse doctor JSON: ${error.message}`.trim(),
      failureCodes: commandReport.ok
        ? ["PAI-VERIFY-COMMAND-DOCTOR-PARSE-FAILED"]
        : ["PAI-VERIFY-COMMAND-DOCTOR-FAILED", "PAI-VERIFY-COMMAND-DOCTOR-PARSE-FAILED"]
    };
  }
}

/**
 * 收集 artifact 报告
 * @param {string} projectRoot - 项目根目录
 * @returns {object} artifact 报告
 */
function collectArtifactReport(projectRoot) {
  const powerAiRoot = path.join(projectRoot, ".power-ai");
  if (!fs.existsSync(powerAiRoot)) {
    return {
      ok: false,
      skipped: false,
      reason: "Project is missing .power-ai after verification commands",
      failureCodes: ["PAI-VERIFY-ARTIFACT-000"],
      checks: []
    };
  }

  const checks = requiredProjectArtifacts.map((artifact) => {
    const absolutePath = path.join(projectRoot, ...artifact.relativePath.split("/"));
    return {
      id: artifact.id,
      code: artifact.code,
      relativePath: artifact.relativePath,
      absolutePath,
      ok: fs.existsSync(absolutePath)
    };
  });

  const missingChecks = checks.filter((item) => !item.ok);
  return {
    ok: missingChecks.length === 0,
    skipped: false,
    reason: missingChecks.length === 0
      ? ""
      : `Missing verified artifacts: ${missingChecks.map((item) => item.id).join(", ")}`,
    failureCodes: missingChecks.map((item) => item.code),
    checks
  };
}

function collectGovernanceContext(projectRoot) {
  const contextPath = path.join(projectRoot, ".power-ai", "context", "project-governance-context.json");
  if (!fs.existsSync(contextPath)) {
    return {
      available: false,
      contextPath,
      reason: "project governance context snapshot is missing"
    };
  }

  return {
    available: true,
    contextPath,
    payload: readJson(contextPath)
  };
}

/**
 * 收集报告失败代码
 * @param {array} commandReports - 命令报告数组
 * @param {object} artifactReport - artifact 报告
 * @param {string} reason - 失败原因
 * @returns {array} 失败代码数组
 */
function collectReportFailureCodes(commandReports, artifactReport, reason) {
  const failureCodes = [];

  for (const commandReport of commandReports) {
    if (commandReport.failureCodes) failureCodes.push(...commandReport.failureCodes);
  }

  if (artifactReport?.failureCodes) failureCodes.push(...artifactReport.failureCodes);
  if (reason) failureCodes.push("PAI-VERIFY-TARGET-001");

  return [...new Set(failureCodes)];
}

// 解析命令行参数
const {
  commands,
  profile,
  requestedTools,
  projectPaths,
  fixtures,
  matrixJsonPath,
  matrixMarkdownPath
} = parseArgs(process.argv.slice(2));
// 构建目标列表
const targets = [
  ...projectPaths.map((projectPath) => ({ type: "project", projectPath })),
  ...fixtures.map((fixtureName) => ({ type: "fixture", fixtureName }))
];
// 存储报告
const reports = [];
// 总体状态
let overallOk = true;

/**
 * 遍历所有目标，执行验证
 */
for (const target of targets) {
  // 准备目标
  const preparedTarget = target.type === "fixture"
    ? prepareFixtureProject(target.fixtureName)
    : validateProjectPath(target.projectPath);

  // 目标准备失败
  if (!preparedTarget.ok) {
    overallOk = false;
    reports.push({
      projectRoot: preparedTarget.absolutePath || null,
      fixtureName: target.fixtureName || null,
      ok: false,
      commands: [],
      reason: preparedTarget.reason,
      failureCodes: collectReportFailureCodes([], null, preparedTarget.reason)
    });
    continue;
  }

  // 获取项目根目录
  const projectRoot = target.type === "fixture" ? preparedTarget.projectRoot : preparedTarget.absolutePath;
  // 存储命令报告
  const commandReports = [];
  // 项目状态
  let projectOk = true;

  // 执行所有命令
  for (const command of commands) {
    const result = runCliCommand(projectRoot, command, { profile, requestedTools });
    const commandReport = normalizeCommandReport({
      command,
      ok: result.status === 0,
      exitCode: result.status,
      stdout: safeTrim(result.stdout),
      stderr: safeTrim(result.stderr) || result.error?.message || ""
    });

    if (!commandReport.ok) {
      projectOk = false;
      overallOk = false;
    }

    commandReports.push(commandReport);
  }

  // 收集 artifact 报告
  const artifactReport = collectArtifactReport(projectRoot);
  if (!artifactReport.ok) {
    projectOk = false;
    overallOk = false;
  }

  // 添加报告
  reports.push({
    projectRoot,
    fixtureName: target.type === "fixture" ? target.fixtureName : null,
    ok: projectOk,
    commands: commandReports,
    artifacts: artifactReport,
    governanceContext: collectGovernanceContext(projectRoot),
    failureCodes: collectReportFailureCodes(commandReports, artifactReport, "")
  });

  // 清理临时文件
  preparedTarget.cleanup?.();
}

// 输出验证结果
const matrix = buildConsumerCompatibilityMatrix({
  packageName: packageJson.name,
  version: packageJson.version,
  commands,
  profile,
  requestedTools,
  reports
});

if (matrixJsonPath) {
  fs.mkdirSync(path.dirname(matrixJsonPath), { recursive: true });
  fs.writeFileSync(matrixJsonPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
}

if (matrixMarkdownPath) {
  fs.mkdirSync(path.dirname(matrixMarkdownPath), { recursive: true });
  fs.writeFileSync(matrixMarkdownPath, buildConsumerCompatibilityMarkdown(matrix), "utf8");
}

console.log(JSON.stringify({
  packageName: packageJson.name,
  version: packageJson.version,
  commands,
  profile,
  requestedTools,
  fixtures,
  overallOk,
  overallFailureCodes: [...new Set(reports.flatMap((report) => report.failureCodes || []))],
  reports,
  matrix,
  matrixJsonPath,
  matrixMarkdownPath
}, null, 2));

// 设置退出码
if (!overallOk) process.exitCode = 1;
