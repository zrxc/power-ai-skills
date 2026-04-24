/**
 * 影响范围分析工具
 * 目标：
 * 1. 根据基础框架、组件库、样式层和工具层的变更文件，识别受影响的 skill；
 * 2. 输出结构化的升级报告，帮助维护者知道“谁会受影响、该改哪里、建议发什么版本”；
 * 3. 把组件库 / 基础框架升级和 skill 维护动作串成闭环，而不是只做模糊的文件命中。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "manifest", "skills-manifest.json");
const baselinePath = path.join(root, "baseline", "current.json");

const packageJson = readJson(path.join(root, "package.json"));
const manifest = readJson(manifestPath);
const baseline = readJson(baselinePath);

/**
 * 版本建议按严重级别排序。
 * 后续多个规则同时命中时，会取最高级别作为 recommendedReleaseLevel。
 */
const releaseWeight = {
  patch: 1,
  minor: 2,
  major: 3
};

/**
 * 影响规则。
 * 每条规则都描述一类变更会影响哪些 skill，以及维护者应该重点检查什么。
 *
 * 字段说明：
 * - id: 规则唯一标识，便于在报告里追踪命中原因
 * - match: 用于匹配变更文件路径的正则
 * - domains: 影响域，用于汇总“这次升级主要碰到了哪些层”
 * - skills: 受影响 skill 列表
 * - reviewTargets: 维护者应该重点检查的文件或内容
 * - releaseHint: 推荐版本级别，只是建议值，不强制替代人工判断
 * - followUps: 规则命中后建议追加执行的动作
 */
const impactRules = [
  {
    id: "runtime-core",
    match: /(packages[\\/])?runtime-vue3|router|pinia|store|hooks|app-shell/i,
    domains: ["runtimeVue3"],
    skills: ["runtime-extension-skill", "power-foundation-app", "global-store-skill", "route-menu-skill", "entry-skill", "api-skill"],
    reviewTargets: [
      "检查 runtime 相关 skill 的 SKILL.md 是否仍符合最新基础框架约定",
      "检查 references 中与 router、store、hooks 相关的示例",
      "检查 skill.meta.json compatibility.runtimeVue3"
    ],
    releaseHint: "minor",
    followUps: [
      "更新 baseline/current.json 中的 @power/runtime-vue3 版本",
      "更新 docs/compatibility-matrix.md 的 runtime 兼容矩阵"
    ]
  },
  {
    id: "p-components-public",
    match: /packages[\\/]p-components[\\/]src[\\/]components|public-component|pc-table|pc-dialog|pc-form/i,
    domains: ["pComponents"],
    skills: ["power-component-library", "style-theme-skill", "basic-list-page", "dialog-skill", "form-skill", "form-designer-skill"],
    reviewTargets: [
      "检查组件级 references 是否需要同步新 props / slots / events",
      "检查页面 skill 的组件知识、模板和约束是否需要同步"
    ],
    releaseHint: "minor",
    followUps: [
      "补充组件变更对应的 demo、doc、test",
      "更新 docs/compatibility-matrix.md 的 p-components 兼容矩阵"
    ]
  },
  {
    id: "p-components-business",
    match: /packages[\\/]p-components[\\/]src[\\/](p-components|p-layout)|business-component|pcp-/i,
    domains: ["pComponents"],
    skills: ["power-component-library"],
    reviewTargets: [
      "检查组件知识层中的业务组件分类和选型说明",
      "检查页面配方与组件知识是否需要补充新的业务组件约定"
    ],
    releaseHint: "minor",
    followUps: [
      "同步更新 layout / business component demo",
      "回看 power-component-library 的组件归类说明"
    ]
  },
  {
    id: "layout-and-entry",
    match: /packages[\\/]p-components[\\/](src[\\/](layout|p-layout)|src[\\/]entry[\\/]lib[\\/]main[\\/]index\.ts)|layout-component|component-export/i,
    domains: ["pComponents", "entry"],
    skills: ["power-component-library", "runtime-extension-skill", "style-theme-skill"],
    reviewTargets: [
      "检查 layout、entry 导出链路和注册顺序",
      "检查 references 中的布局骨架模板"
    ],
    releaseHint: "minor",
    followUps: [
      "验证主入口导出是否仍完整",
      "检查消费项目是否需要重新执行 init / sync"
    ]
  },
  {
    id: "plugin-and-setup",
    match: /packages[\\/]p-components[\\/]src[\\/]plugins|plugin-extension|setupglobal|setupassets|setupcustom/i,
    domains: ["pComponents", "runtimeVue3"],
    skills: ["plugin-extension-skill", "power-component-library", "runtime-extension-skill"],
    reviewTargets: [
      "检查插件安装顺序和全局注册说明",
      "检查是否需要更新 plugin-extension-skill 的参考模板",
      "检查 runtime 侧对插件的依赖说明"
    ],
    releaseHint: "minor",
    followUps: [
      "验证新插件是否需要在项目模板中补初始化说明"
    ]
  },
  {
    id: "component-demo",
    match: /packages[\\/]p-components[\\/]src[\\/]views[\\/]aa-demo[\\/]p-components|demos-p-components|demos-mo-p-components|component-demo/i,
    domains: ["demo"],
    skills: ["power-component-library"],
    reviewTargets: [
      "检查组件知识引用的示例路径和展示方式",
      "检查 references 中的示例模板是否过期"
    ],
    releaseHint: "patch",
    followUps: [
      "验证新增或改动组件是否有对应 demo"
    ]
  },
  {
    id: "component-docs",
    match: /packages[\\/](p-components|runtime-vue3|style|utils)[\\/]README\.md|typedoc\.json|component-doc/i,
    domains: ["docs"],
    skills: ["power-component-library"],
    reviewTargets: [
      "检查 README、文档示例和导出说明",
      "检查 docs / references 中是否仍引用旧接口或旧目录"
    ],
    releaseHint: "patch",
    followUps: [
      "同步组件文档、演示、导出链路说明"
    ]
  },
  {
    id: "component-tests",
    match: /\.spec\.(ts|tsx|js)|component-test|richText\.spec/i,
    domains: ["test"],
    skills: ["utils-extension-skill"],
    reviewTargets: [
      "检查测试约定和断言是否需要同步新契约",
      "检查工具函数 skill 是否需要补边界说明"
    ],
    releaseHint: "patch",
    followUps: [
      "补齐受影响组件的 spec 或单测模板"
    ]
  },
  {
    id: "style-theme",
    match: /@power\/style|packages[\\/]style|theme|token|scss|css/i,
    domains: ["style"],
    skills: ["style-theme-skill", "power-component-library", "chart-dashboard"],
    reviewTargets: [
      "检查主题 token、样式变量、暗色/亮色或品牌色说明",
      "检查组件 references 中的样式用法和覆盖方式",
      "检查 skill.meta.json compatibility.style"
    ],
    releaseHint: "minor",
    followUps: [
      "更新 baseline/current.json 中的 @power/style 版本",
      "更新 docs/compatibility-matrix.md 的 style 兼容矩阵"
    ]
  },
  {
    id: "utils",
    match: /@power\/utils|packages[\\/]utils|utils-extension|storage|validate|url|date|document/i,
    domains: ["utils"],
    skills: ["utils-extension-skill", "runtime-extension-skill", "power-foundation-app"],
    reviewTargets: [
      "检查 utils 的输入输出契约和兼容处理说明",
      "检查 references 中是否仍依赖旧工具方法签名",
      "检查 skill.meta.json compatibility.utils"
    ],
    releaseHint: "minor",
    followUps: [
      "更新 baseline/current.json 中的 @power/utils 版本",
      "更新 docs/compatibility-matrix.md 的 utils 兼容矩阵"
    ]
  },
  {
    id: "baseline",
    match: /baseline[\\/]current\.json/i,
    domains: ["baseline"],
    skills: ["power-foundation-app", "power-component-library", "entry-skill"],
    reviewTargets: [
      "检查所有 skill.meta.json compatibility 字段是否与新基线一致",
      "检查 docs/compatibility-matrix.md 是否需要整体刷新"
    ],
    releaseHint: "major",
    followUps: [
      "执行 pnpm check:dependencies",
      "必要时执行 pnpm update:dependencies"
    ]
  }
];

function printUsageAndExit() {
  console.log("用法：node ./scripts/impact-check.mjs <changed-file-1> <changed-file-2> ...");
  console.log("也可以：node ./scripts/impact-check.mjs --from-file changed-files.txt");
  process.exit(0);
}

/**
 * 解析命令行参数。
 * 支持两种输入方式：
 * 1. 直接在命令行后面跟变更文件；
 * 2. 用 --from-file 读取文本文件中的变更文件列表，便于接 CI 或 git diff 结果。
 */
function parseChangedFiles(argv) {
  if (argv.length === 0) {
    printUsageAndExit();
  }

  const fromFileIndex = argv.indexOf("--from-file");
  if (fromFileIndex !== -1) {
    const filePath = argv[fromFileIndex + 1];
    if (!filePath) {
      console.error("[impact-check] --from-file 后缺少文件路径");
      process.exit(1);
    }

    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`[impact-check] 找不到变更文件列表：${absolutePath}`);
      process.exit(1);
    }

    return fs.readFileSync(absolutePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return argv.filter((arg) => !arg.startsWith("--"));
}

function normalizeChangedPath(rawPath) {
  return rawPath.replaceAll("\\", "/");
}

function getSkillMap() {
  return new Map(manifest.skills.map((skill) => [skill.name, skill]));
}

function mergeUnique(list, value) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function getHigherReleaseLevel(currentLevel, nextLevel) {
  return releaseWeight[nextLevel] > releaseWeight[currentLevel] ? nextLevel : currentLevel;
}

/**
 * 直接修改 skill 自己的文件时，需要把“直接命中”也纳入报告。
 * 这样即便变更文件路径没有命中某条基础规则，也不会漏掉 skill 本身的维护提醒。
 */
function collectDirectSkillImpact(changedPath, skillMap, impactStore) {
  const skillMatch = changedPath.match(/skills\/([^/]+\/)?([^/]+)\//);
  if (!skillMatch) return;

  const skillName = skillMatch[2];
  if (!skillMap.has(skillName)) return;

  const skill = skillMap.get(skillName);
  if (!impactStore.has(skillName)) {
    impactStore.set(skillName, {
      name: skill.name,
      displayName: skill.displayName,
      owners: [...skill.owners],
      skillPath: skill.skillPath,
      reasons: [],
      domains: [],
      reviewTargets: [],
      releaseHints: []
    });
  }

  const entry = impactStore.get(skillName);
  mergeUnique(entry.reasons, `直接修改了 skill 文件：${changedPath}`);
  mergeUnique(entry.domains, "skill");
  mergeUnique(entry.reviewTargets, "检查该 skill 的 SKILL.md、references、agents/openai.yaml 和 skill.meta.json 是否仍一致");
  mergeUnique(entry.releaseHints, "patch");
}

/**
 * 应用规则命中结果，把影响信息累积到 impactStore。
 * 一个 skill 可能被多条规则命中，所以这里统一做去重合并。
 */
function applyRuleImpact(rule, changedPath, skillMap, impactStore, reportContext) {
  for (const domain of rule.domains) {
    reportContext.affectedDomains.add(domain);
  }

  for (const action of rule.followUps) {
    reportContext.followUps.add(action);
  }

  reportContext.recommendedReleaseLevel = getHigherReleaseLevel(reportContext.recommendedReleaseLevel, rule.releaseHint);

  for (const skillName of rule.skills) {
    if (!skillMap.has(skillName)) continue;

    const skill = skillMap.get(skillName);
    if (!impactStore.has(skillName)) {
      impactStore.set(skillName, {
        name: skill.name,
        displayName: skill.displayName,
        owners: [...skill.owners],
        skillPath: skill.skillPath,
        reasons: [],
        domains: [],
        reviewTargets: [],
        releaseHints: []
      });
    }

    const entry = impactStore.get(skillName);
    mergeUnique(entry.reasons, `命中规则 ${rule.id}：${changedPath}`);
    for (const domain of rule.domains) {
      mergeUnique(entry.domains, domain);
    }
    for (const target of rule.reviewTargets) {
      mergeUnique(entry.reviewTargets, target);
    }
    mergeUnique(entry.releaseHints, rule.releaseHint);
  }
}

function buildSummaryByOwner(impacts) {
  const ownerCounter = new Map();

  for (const item of impacts) {
    for (const owner of item.owners) {
      ownerCounter.set(owner, (ownerCounter.get(owner) || 0) + 1);
    }
  }

  return [...ownerCounter.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "zh-CN"))
    .map(([owner, count]) => ({ owner, affectedSkillCount: count }));
}

const changedFiles = parseChangedFiles(process.argv.slice(2));
const skillMap = getSkillMap();
const impactStore = new Map();
const reportContext = {
  affectedDomains: new Set(),
  followUps: new Set(),
  recommendedReleaseLevel: "patch"
};

for (const rawPath of changedFiles) {
  const changedPath = normalizeChangedPath(rawPath);

  collectDirectSkillImpact(changedPath, skillMap, impactStore);

  for (const rule of impactRules) {
    if (!rule.match.test(changedPath)) continue;
    applyRuleImpact(rule, changedPath, skillMap, impactStore, reportContext);
  }
}

const impactedSkills = [...impactStore.values()]
  .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
  .map((item) => ({
    ...item,
    recommendedReleaseLevel: item.releaseHints.reduce(getHigherReleaseLevel, "patch")
  }));

const report = {
  packageName: packageJson.name,
  version: packageJson.version,
  baseline,
  changedFiles,
  affectedDomainCount: reportContext.affectedDomains.size,
  affectedDomains: [...reportContext.affectedDomains].sort((a, b) => a.localeCompare(b, "zh-CN")),
  affectedSkillCount: impactedSkills.length,
  recommendedReleaseLevel: reportContext.recommendedReleaseLevel,
  impactedSkills,
  ownerSummary: buildSummaryByOwner(impactedSkills),
  followUps: [...reportContext.followUps].sort((a, b) => a.localeCompare(b, "zh-CN"))
};

console.log(JSON.stringify(report, null, 2));
