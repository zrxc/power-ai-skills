const riskWeight = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const releaseWeight = {
  patch: 1,
  minor: 2,
  major: 3
};

const categoryDefinitions = [
  {
    id: "docs",
    label: "docs",
    title: "文档变更",
    riskLevel: "low",
    releaseHint: "patch",
    matchers: [
      /^docs\//,
      /^README\.md$/i,
      /^CHANGELOG\.md$/i,
      /^manifest\/release-notes-/i
    ],
    recommendedChecks: [
      "确认 README、命令手册、发布文档和路线图与当前行为一致。",
      "补跑 `pnpm check:docs`，避免生成文档与仓库内容漂移。"
    ]
  },
  {
    id: "skill-content",
    label: "skill-content",
    title: "Skill 内容变更",
    riskLevel: "medium",
    releaseHint: "minor",
    matchers: [
      /^skills\//,
      /^manifest\/skills-manifest\.json$/i
    ],
    recommendedChecks: [
      "检查受影响 skill 的 `SKILL.md`、`references/` 与 `skill.meta.json` 是否保持一致。",
      "补跑 `node ./scripts/validate-skills.mjs` 与消费项目 smoke，确认消费者读取路径没有回归。"
    ]
  },
  {
    id: "adapter-behavior",
    label: "adapter-behavior",
    title: "Adapter 行为变更",
    riskLevel: "high",
    releaseHint: "minor",
    matchers: [
      /^templates\/project\//,
      /^src\/workspace\//,
      /^src\/rendering\//,
      /^src\/selection\//,
      /^src\/commands\//,
      /^config\/(tool-registry|team-defaults|template-registry)\.json$/i
    ],
    recommendedChecks: [
      "补跑 `node ./scripts/verify-consumer.mjs --fixture basic`，确认初始化、同步和 doctor 行为没有回归。",
      "检查 `.power-ai/` 入口、模板渲染、registry 快照与 team defaults 是否仍保持兼容。"
    ]
  },
  {
    id: "wrapper-protocol",
    label: "wrapper-protocol",
    title: "Wrapper 协议变更",
    riskLevel: "high",
    releaseHint: "minor",
    matchers: [
      /^src\/conversation-miner\/(protocol|wrappers)\.mjs$/i,
      /^src\/conversation-miner\/auto-capture-/i,
      /^src\/conversation-miner\/capture-/i,
      /^src\/conversation-miner\/wrapper-/i,
      /^src\/conversation-miner\/wrapper-promotions\.mjs$/i,
      /^src\/conversation-miner\/setup\.mjs$/i
    ],
    recommendedChecks: [
      "补跑 wrapper capture、auto-capture inbox、wrapper promotion 生命周期相关测试。",
      "确认宿主桥接脚本、capture 协议和 proposal 状态流没有破坏既有工具集成。"
    ]
  },
  {
    id: "dependency-baseline",
    label: "dependency-baseline",
    title: "基础依赖/基线变更",
    riskLevel: "high",
    releaseHint: "minor",
    matchers: [
      /^packages\//,
      /^baseline\/current\.json$/i,
      /^docs\/compatibility-matrix\.md$/i,
      /^docs\/component-upgrade-flow\.md$/i
    ],
    recommendedChecks: [
      "检查 `manifest/impact-report.json` 与兼容矩阵是否同步更新。",
      "至少补跑一次消费项目验证，确认基础框架和组件升级没有破坏现有技能约束。"
    ]
  },
  {
    id: "release-governance",
    label: "release-governance",
    title: "发布治理产物变更",
    riskLevel: "medium",
    releaseHint: "minor",
    matchers: [
      /^scripts\/(impact-check|run-upgrade-automation|generate-impact-task|generate-upgrade-payload|refresh-release-artifacts|clean-release-artifacts|check-release-consistency|generate-release-notes|generate-upgrade-risk-report)\.mjs$/i,
      /^src\/upgrade-summary\//,
      /^src\/doctor\/release-checks\.mjs$/i,
      /^src\/upgrade-risk\//,
      /^manifest\/(impact-report|automation-report|version-record|upgrade-risk-report)\.(json|md)$/i
    ],
    recommendedChecks: [
      "补跑 `pnpm refresh:release-artifacts` 与 `pnpm check:release-consistency -- --require-release-notes --require-impact-report --require-automation-report --require-notification-payload --require-risk-report`。",
      "检查通知载荷、version-record 和 upgrade summary 是否都能读取最新发布产物。"
    ]
  }
];

function normalizeChangedPath(filePath) {
  return String(filePath || "").trim().replaceAll("\\", "/");
}

function mergeUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function getHigherRiskLevel(currentLevel, nextLevel) {
  return riskWeight[nextLevel] > riskWeight[currentLevel] ? nextLevel : currentLevel;
}

function getHigherReleaseLevel(currentLevel, nextLevel) {
  return releaseWeight[nextLevel] > releaseWeight[currentLevel] ? nextLevel : currentLevel;
}

function createCategoryEntry(definition) {
  return {
    id: definition.id,
    label: definition.label,
    title: definition.title,
    riskLevel: definition.riskLevel,
    releaseHint: definition.releaseHint,
    matchedFiles: [],
    recommendedChecks: [...definition.recommendedChecks]
  };
}

function buildImpactContext(impactReport) {
  if (!impactReport) {
    return {
      recommendedReleaseLevel: "patch",
      affectedDomains: [],
      affectedSkillCount: 0
    };
  }

  return {
    recommendedReleaseLevel: impactReport.recommendedReleaseLevel || "patch",
    affectedDomains: impactReport.affectedDomains || [],
    affectedSkillCount: impactReport.affectedSkillCount || 0
  };
}

export function buildUpgradeRiskReport({ packageName, version, changedFiles = [], impactReport = null, generatedAt = new Date().toISOString() } = {}) {
  const normalizedChangedFiles = changedFiles.map((item) => normalizeChangedPath(item)).filter(Boolean);
  const impactContext = buildImpactContext(impactReport);
  const categoryMap = new Map(categoryDefinitions.map((definition) => [definition.id, createCategoryEntry(definition)]));
  const uncategorizedFiles = [];
  let overallRiskLevel = "low";
  let overallReleaseHint = impactContext.recommendedReleaseLevel || "patch";

  for (const changedFile of normalizedChangedFiles) {
    const matchedDefinitions = categoryDefinitions.filter((definition) => definition.matchers.some((matcher) => matcher.test(changedFile)));
    if (matchedDefinitions.length === 0) {
      uncategorizedFiles.push(changedFile);
      continue;
    }

    for (const definition of matchedDefinitions) {
      const entry = categoryMap.get(definition.id);
      mergeUnique(entry.matchedFiles, changedFile);
      overallRiskLevel = getHigherRiskLevel(overallRiskLevel, definition.riskLevel);
      overallReleaseHint = getHigherReleaseLevel(overallReleaseHint, definition.releaseHint);
    }
  }

  const categories = [...categoryMap.values()]
    .filter((entry) => entry.matchedFiles.length > 0)
    .sort((left, right) => riskWeight[right.riskLevel] - riskWeight[left.riskLevel] || left.id.localeCompare(right.id, "zh-CN"));

  const derivedRiskLevel = impactContext.recommendedReleaseLevel === "major"
    ? "critical"
    : impactContext.recommendedReleaseLevel === "minor"
      ? "medium"
      : "low";
  overallRiskLevel = getHigherRiskLevel(overallRiskLevel, derivedRiskLevel);

  const recommendedActions = [];
  for (const category of categories) {
    for (const check of category.recommendedChecks) mergeUnique(recommendedActions, check);
  }
  if (impactContext.affectedDomains.length > 0) {
    mergeUnique(recommendedActions, `重点复核受影响域：${impactContext.affectedDomains.join(", ")}。`);
  }
  if (impactContext.affectedSkillCount > 0) {
    mergeUnique(recommendedActions, `检查 ${impactContext.affectedSkillCount} 个受影响 skill 的示例、兼容字段与升级说明。`);
  }
  if (uncategorizedFiles.length > 0) {
    mergeUnique(recommendedActions, "人工复核未命中风险分类的文件，避免遗漏新的治理面。");
  }

  return {
    generatedAt,
    packageName,
    version,
    overallRiskLevel,
    overallReleaseHint,
    summary: {
      totalChangedFiles: normalizedChangedFiles.length,
      categorizedFileCount: normalizedChangedFiles.length - uncategorizedFiles.length,
      uncategorizedFileCount: uncategorizedFiles.length,
      categoryCount: categories.length,
      highRiskCategoryCount: categories.filter((category) => riskWeight[category.riskLevel] >= riskWeight.high).length
    },
    impactContext,
    categories,
    uncategorizedFiles,
    recommendedActions
  };
}

export function buildUpgradeRiskMarkdown(report) {
  const lines = [
    "# Upgrade Risk Report",
    "",
    `- package: \`${report.packageName}@${report.version}\``,
    `- generatedAt: \`${report.generatedAt}\``,
    `- overall risk: \`${report.overallRiskLevel}\``,
    `- overall release hint: \`${report.overallReleaseHint}\``,
    `- changed files: ${report.summary.totalChangedFiles}`,
    `- categorized files: ${report.summary.categorizedFileCount}`,
    `- uncategorized files: ${report.summary.uncategorizedFileCount}`,
    ""
  ];

  lines.push("## Categories", "");
  if (report.categories.length === 0) {
    lines.push("- none");
  } else {
    for (const category of report.categories) {
      lines.push(`### ${category.title}`);
      lines.push(`- id: \`${category.id}\``);
      lines.push(`- risk: \`${category.riskLevel}\``);
      lines.push(`- release hint: \`${category.releaseHint}\``);
      lines.push(`- matched files: ${category.matchedFiles.length}`);
      for (const filePath of category.matchedFiles) lines.push(`- file: \`${filePath}\``);
      lines.push("- recommended checks:");
      for (const check of category.recommendedChecks) lines.push(`  - ${check}`);
      lines.push("");
    }
  }

  lines.push("## Uncategorized Files", "");
  if (report.uncategorizedFiles.length === 0) {
    lines.push("- none");
  } else {
    for (const filePath of report.uncategorizedFiles) lines.push(`- \`${filePath}\``);
  }

  lines.push("", "## Recommended Actions", "");
  if (report.recommendedActions.length === 0) {
    lines.push("- none");
  } else {
    for (const action of report.recommendedActions) lines.push(`- ${action}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}
