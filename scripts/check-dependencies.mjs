#!/usr/bin/env node
/**
 * 依赖检查脚本
 * 用于检查 @power 命名空间下的基础依赖包版本更新情况
 * 并更新相关 skill 的兼容性版本信息
 */

import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findSkillDirectories, readJson, writeJson } from "./shared.mjs";

// 获取项目根目录路径
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 基线文件路径，用于存储当前依赖版本
const baselinePath = path.join(root, "baseline", "current.json");
// 报告文件路径，用于生成更新报告
const reportPath = path.join(root, "deps-updates.json");
// skills 目录路径
const skillsRoot = path.join(root, "skills");
// 解析命令行参数
const args = new Set(process.argv.slice(2));
// 是否启用写回模式
const shouldWrite = args.has("--write");
// 是否生成报告文件；--write 会隐式生成报告
const shouldReport = shouldWrite || args.has("--report");
const npmViewTimeoutMs = Number(process.env.POWER_AI_DEPENDENCY_CHECK_TIMEOUT_MS || 5000);

// 需要检查的基础依赖包列表
const basePackages = [
  "@power/runtime-vue3",
  "@power/p-components",
  "@power/style",
  "@power/utils"
];

// 包名到兼容性键的映射
const packageToCompatibilityKey = {
  "@power/runtime-vue3": "runtimeVue3",
  "@power/p-components": "pComponents",
  "@power/style": "style",
  "@power/utils": "utils"
};

function resolveNpmViewCommand() {
  const npmCliCandidates = [
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(root, "node_modules", "npm", "bin", "npm-cli.js")
  ];
  const npmCliPath = npmCliCandidates.find((candidate) => fs.existsSync(candidate));
  if (npmCliPath) return { command: process.execPath, baseArgs: [npmCliPath] };

  return { command: process.platform === "win32" ? "npm.cmd" : "npm", baseArgs: [] };
}

/**
 * 解析基础 semver 版本号
 * @param {string|null} version 版本号
 * @returns {number[]|null} 主版本、次版本、修订号
 */
function parseSemver(version) {
  if (!version) return null;
  const match = String(version).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * 比较两个基础 semver 版本号
 * @param {string|null} currentVersion 当前版本
 * @param {string|null} latestVersion registry 返回版本
 * @returns {-1|0|1|null} -1 表示 current 更低，1 表示 current 更高，null 表示无法比较
 */
function compareSemver(currentVersion, latestVersion) {
  const current = parseSemver(currentVersion);
  const latest = parseSemver(latestVersion);
  if (!current || !latest) return null;

  for (let index = 0; index < current.length; index += 1) {
    if (current[index] < latest[index]) return -1;
    if (current[index] > latest[index]) return 1;
  }

  return 0;
}

/**
 * 判断版本变化类型
 * @param {string|null} currentVersion 当前版本
 * @param {string|null} latestVersion registry 返回版本
 * @returns {"new"|"same"|"upgrade"|"downgrade"|"unknown"} 变化类型
 */
function resolveVersionChangeType(currentVersion, latestVersion) {
  if (!currentVersion && latestVersion) return "new";
  if (currentVersion === latestVersion) return "same";

  const comparison = compareSemver(currentVersion, latestVersion);
  if (comparison === -1) return "upgrade";
  if (comparison === 1) return "downgrade";
  if (comparison === 0) return "same";

  return "unknown";
}

function isActionableChange(changeType) {
  return ["new", "upgrade"].includes(changeType);
}

function formatChangeMarker(changeType) {
  const markers = {
    new: "新增记录",
    same: "无变化",
    upgrade: "可更新",
    downgrade: "检测到降级，需人工复核",
    unknown: "版本变化，需人工复核"
  };
  return markers[changeType] || markers.unknown;
}

/**
 * 获取指定包的最新版本
 * @param {string} packageName - 包名
 * @returns {string|null} - 最新版本号或 null（获取失败时）
 */
function getLatestVersion(packageName) {
  const npmViewCommand = resolveNpmViewCommand();
  // 执行 npm view 命令获取最新版本；设置超时避免私服网络异常时卡住 CI。
  const result = spawnSync(
    npmViewCommand.command,
    [
      ...npmViewCommand.baseArgs,
      "view",
      packageName,
      "version",
      "--registry=http://192.168.140.17:8081/nexus/repository/npm-private/"
    ],
    {
      encoding: "utf8",
      timeout: npmViewTimeoutMs
    }
  );

  if (result.status !== 0) {
    const message = result.error?.message
      || (typeof result.stderr === "string" ? result.stderr.trim() : "")
      || (typeof result.stdout === "string" ? result.stdout.trim() : "")
      || `npm view exited with status ${result.status}`;
    console.error(`获取 ${packageName} 版本失败: ${message}`);
    return null;
  }

  return result.stdout.trim();
}

/**
 * 收集依赖包的更新信息
 * @returns {Object} - 包含基线信息和更新信息的对象
 */
function collectUpdates() {
  // 读取基线文件
  const baseline = readJson(baselinePath);
  // 存储更新信息
  const updates = {};
  const failedPackages = [];

  console.log("检查基础依赖包版本更新...");
  // 遍历检查每个基础依赖包
  for (const packageName of basePackages) {
    // 获取最新版本
    const latestVersion = getLatestVersion(packageName);
    if (!latestVersion) {
      failedPackages.push(packageName);
      continue;
    }

    // 获取当前版本（如果存在）
    const currentVersion = baseline.powerPackages?.[packageName] ?? null;
    const changeType = resolveVersionChangeType(currentVersion, latestVersion);
    // 存储更新信息
    updates[packageName] = {
      currentVersion,
      latestVersion,
      changeType,
      changed: isActionableChange(changeType),
      needsReview: ["downgrade", "unknown"].includes(changeType)
    };

    // 输出检查结果
    const marker = formatChangeMarker(changeType);
    console.log(`- ${packageName}: 当前 ${currentVersion ?? "未记录"}，最新 ${latestVersion}（${marker}）`);
  }

  return { baseline, updates, failedPackages };
}

/**
 * 构建依赖更新对技能的影响
 * @param {Object} updates - 更新信息
 * @returns {Array} - 受影响的技能列表
 */
function buildImpact(updates) {
  const impactedSkills = [];

  // 遍历所有技能目录
  for (const skillDir of findSkillDirectories(skillsRoot)) {
    // 技能元数据文件路径
    const metaPath = path.join(skillDir, "skill.meta.json");
    // 读取技能元数据
    const meta = readJson(metaPath);
    // 存储变更的兼容性信息
    const changedCompatibilities = [];

    // 遍历每个更新的包
    for (const [packageName, detail] of Object.entries(updates)) {
      // 如果包版本没有变化，跳过
      if (!detail.changed) continue;
      // 获取对应的兼容性键
      const compatibilityKey = packageToCompatibilityKey[packageName];
      // 获取当前兼容性版本
      const currentCompatibility = meta.compatibility?.[compatibilityKey];
      // 如果技能没有配置该兼容性，跳过
      if (!currentCompatibility) continue;

      // 提取版本前缀（如 ^, ~ 等）
      const prefix = currentCompatibility.match(/^([^0-9]+)/)?.[0] || "^";
      // 计算新的兼容性版本
      const nextCompatibility = `${prefix}${detail.latestVersion}`;
      // 如果兼容性版本没有变化，跳过
      if (currentCompatibility === nextCompatibility) continue;

      // 添加变更的兼容性信息
      changedCompatibilities.push({
        packageName,
        compatibilityKey,
        currentCompatibility,
        nextCompatibility
      });
    }

    // 如果有变更的兼容性信息，添加到受影响的技能列表
    if (changedCompatibilities.length > 0) {
      impactedSkills.push({
        name: meta.name,
        skillPath: path.relative(skillsRoot, skillDir).replaceAll("\\", "/"),
        changedCompatibilities
      });
    }
  }

  return impactedSkills;
}

/**
 * 写回更新信息到基线和技能元数据
 * @param {Object} baseline - 基线信息
 * @param {Object} updates - 更新信息
 * @param {Array} impactedSkills - 受影响的技能列表
 */
function writeUpdates(baseline, updates, impactedSkills) {
  let baselineChanged = false;

  // 更新基线文件中的依赖版本
  for (const [packageName, detail] of Object.entries(updates)) {
    if (!detail.changed) continue;
    baseline.powerPackages[packageName] = detail.latestVersion;
    baselineChanged = true;
  }

  // 如果基线有变化，写回基线文件
  if (baselineChanged) {
    writeJson(baselinePath, baseline);
    console.log(`已更新基线文件: ${baselinePath}`);
  }

  // 更新受影响的技能元数据
  for (const skill of impactedSkills) {
    const metaPath = path.join(skillsRoot, skill.skillPath, "skill.meta.json");
    const meta = readJson(metaPath);

    // 更新技能的兼容性版本
    for (const compatibility of skill.changedCompatibilities) {
      meta.compatibility[compatibility.compatibilityKey] = compatibility.nextCompatibility;
    }

    // 写回技能元数据文件
    writeJson(metaPath, meta);
    console.log(`已更新 skill 兼容版本: ${skill.name}`);
  }
}

/**
 * 生成更新报告
 * @param {Object} updates - 更新信息
 * @param {Array} impactedSkills - 受影响的技能列表
 * @param {boolean} wroteChanges - 是否写入了变更
 * @param {string[]} failedPackages - 未成功获取版本的包
 */
function writeReport(updates, impactedSkills, wroteChanges, failedPackages = []) {
  // 构建报告对象
  const report = {
    timestamp: new Date().toISOString(),
    writeMode: wroteChanges,
    packageUpdates: updates,
    failedPackageCount: failedPackages.length,
    failedPackages,
    impactedSkillCount: impactedSkills.length,
    impactedSkills
  };

  // 写回报告文件
  writeJson(reportPath, report);
  console.log(`更新报告已生成: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  // 收集依赖更新信息
  const { baseline, updates, failedPackages } = collectUpdates();
  // 构建依赖更新对技能的影响
  const impactedSkills = buildImpact(updates);

  // 筛选出有变化的包
  const changedPackages = Object.entries(updates)
    .filter(([, detail]) => detail.changed)
    .map(([packageName, detail]) => ({ packageName, ...detail }));

  // 输出检查结果
  console.log("\n检查结果:");
  if (Object.keys(updates).length === 0) {
    console.log("未成功获取任何依赖版本，未进行升级判断。");
  } else if (changedPackages.length === 0) {
    console.log("基础依赖没有可自动写回的升级。");
  } else {
    for (const detail of changedPackages) {
      console.log(`- ${detail.packageName}: ${detail.currentVersion} -> ${detail.latestVersion}（${formatChangeMarker(detail.changeType)}）`);
    }
    console.log(`受影响 skill 数量: ${impactedSkills.length}`);
  }

  if (failedPackages.length > 0) {
    console.log(`\n未成功获取版本的包数量: ${failedPackages.length}`);
    for (const packageName of failedPackages) {
      console.log(`- ${packageName}`);
    }
  }

  const reviewPackages = Object.entries(updates)
    .filter(([, detail]) => detail.needsReview)
    .map(([packageName, detail]) => ({ packageName, ...detail }));
  if (reviewPackages.length > 0) {
    console.log("\n需要人工复核的版本变化:");
    for (const detail of reviewPackages) {
      console.log(`- ${detail.packageName}: ${detail.currentVersion} -> ${detail.latestVersion}（${formatChangeMarker(detail.changeType)}）`);
    }
  }

  // 如果启用了写回模式且有变化，写回更新信息
  if (shouldWrite && changedPackages.length > 0) {
    console.log("\n开始写回基线和 skill 元数据...");
    writeUpdates(baseline, updates, impactedSkills);
  } else if (shouldWrite) {
    console.log("\n没有需要写回的版本变化。");
  } else {
    console.log("\n当前为只读检查模式，未修改任何文件。");
  }

  if (shouldReport) {
    // 生成更新报告
    writeReport(updates, impactedSkills, shouldWrite && changedPackages.length > 0, failedPackages);
  } else {
    console.log("如需生成 deps-updates.json，请执行 `pnpm check:dependencies -- --report`。");
  }
}

// 执行主函数
main();

// 导出函数供其他模块使用
export { buildImpact, collectUpdates, compareSemver, resolveVersionChangeType };
