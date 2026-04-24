import { defaultConversationMinerConfig } from "./setup.mjs";

const suppressedSceneTypes = defaultConversationMinerConfig.capture.suppressedSceneTypes;

export const conversationMinerStrategyTemplates = new Map([
  ["enterprise-vue", {
    projectType: "enterprise-vue",
    displayName: "Enterprise Vue",
    description: "Default strategy for Vue enterprise projects that want balanced capture and reusable project-local knowledge.",
    config: {
      capture: {
        mode: "balanced",
        askScoreThreshold: 6,
        ignoreDuplicates: true,
        ignoreCoveredBySkill: true,
        suppressedSceneTypes
      },
      autoCapture: {
        enabled: true,
        pollIntervalMs: 1500,
        maxBatchSize: 10
      }
    },
    guidance: [
      "Use this as the default when the project is already aligned with the enterprise Vue skill system.",
      "Keep auto capture enabled so confirmed implementation conversations can become reusable project knowledge."
    ]
  }],
  ["strict-governance", {
    projectType: "strict-governance",
    displayName: "Strict Governance",
    description: "Conservative strategy for projects that only want high-confidence implementation captures.",
    config: {
      capture: {
        mode: "strict",
        askScoreThreshold: 8,
        ignoreDuplicates: true,
        ignoreCoveredBySkill: true,
        suppressedSceneTypes: [...suppressedSceneTypes, "dependency-discussion", "environment-debugging"]
      },
      autoCapture: {
        enabled: true,
        pollIntervalMs: 2500,
        maxBatchSize: 5
      }
    },
    guidance: [
      "Use this for regulated or shared-platform projects where low-value captures create review noise.",
      "Expect fewer capture prompts and more deliberate pattern promotion."
    ]
  }],
  ["exploration", {
    projectType: "exploration",
    displayName: "Exploration",
    description: "High-signal discovery strategy for early-stage projects that want more conversation evidence.",
    config: {
      capture: {
        mode: "exploration",
        askScoreThreshold: 4,
        ignoreDuplicates: true,
        ignoreCoveredBySkill: false,
        suppressedSceneTypes
      },
      autoCapture: {
        enabled: true,
        pollIntervalMs: 1200,
        maxBatchSize: 20
      }
    },
    guidance: [
      "Use this while discovering project-specific implementation patterns.",
      "Review generated patterns more frequently because the strategy intentionally captures more candidates."
    ]
  }],
  ["manual-review", {
    projectType: "manual-review",
    displayName: "Manual Review",
    description: "Capture-light strategy for teams that want explicit human review before storing conversations.",
    config: {
      capture: {
        mode: "manual-review",
        askScoreThreshold: 7,
        ignoreDuplicates: true,
        ignoreCoveredBySkill: true,
        suppressedSceneTypes
      },
      autoCapture: {
        enabled: false,
        pollIntervalMs: 3000,
        maxBatchSize: 3
      }
    },
    guidance: [
      "Use this when the team prefers manual capture commands over runtime inbox automation.",
      "Auto-capture polling is disabled by default, but the config remains compatible with the runtime."
    ]
  }]
]);

export function normalizeConversationMinerProjectType(projectType) {
  const normalized = String(projectType || "").trim().toLowerCase() || "enterprise-vue";
  if (conversationMinerStrategyTemplates.has(normalized)) return normalized;
  throw new Error(`generate-conversation-miner-strategy supports --type ${[...conversationMinerStrategyTemplates.keys()].join("|")}.`);
}

function mergeConfig(template, generatedAt) {
  return {
    ...defaultConversationMinerConfig,
    version: defaultConversationMinerConfig.version,
    strategy: {
      projectType: template.projectType,
      displayName: template.displayName,
      description: template.description,
      generatedAt
    },
    capture: {
      ...defaultConversationMinerConfig.capture,
      ...template.config.capture
    },
    autoCapture: {
      ...defaultConversationMinerConfig.autoCapture,
      ...template.config.autoCapture
    }
  };
}

export function buildConversationMinerStrategyPayload({ projectType, generatedAt, previousConfig, dryRun }) {
  const normalizedType = normalizeConversationMinerProjectType(projectType);
  const template = conversationMinerStrategyTemplates.get(normalizedType);
  const nextConfig = mergeConfig(template, generatedAt);

  return {
    generatedAt,
    projectType: normalizedType,
    displayName: template.displayName,
    description: template.description,
    dryRun,
    changed: JSON.stringify(previousConfig || null) !== JSON.stringify(nextConfig),
    previousConfig: previousConfig || null,
    nextConfig,
    guidance: template.guidance,
    availableTypes: [...conversationMinerStrategyTemplates.keys()]
  };
}

export function buildConversationMinerStrategyMarkdown(payload) {
  const lines = [
    "# Conversation Miner Strategy",
    "",
    `- generatedAt: \`${payload.generatedAt}\``,
    `- projectType: \`${payload.projectType}\``,
    `- displayName: \`${payload.displayName}\``,
    `- dryRun: \`${payload.dryRun}\``,
    `- changed: \`${payload.changed}\``,
    "",
    "## Capture",
    "",
    `- mode: \`${payload.nextConfig.capture.mode}\``,
    `- askScoreThreshold: \`${payload.nextConfig.capture.askScoreThreshold}\``,
    `- ignoreDuplicates: \`${payload.nextConfig.capture.ignoreDuplicates}\``,
    `- ignoreCoveredBySkill: \`${payload.nextConfig.capture.ignoreCoveredBySkill}\``,
    `- suppressedSceneTypes: ${payload.nextConfig.capture.suppressedSceneTypes.map((item) => `\`${item}\``).join(", ")}`,
    "",
    "## Auto Capture",
    "",
    `- enabled: \`${payload.nextConfig.autoCapture.enabled}\``,
    `- pollIntervalMs: \`${payload.nextConfig.autoCapture.pollIntervalMs}\``,
    `- maxBatchSize: \`${payload.nextConfig.autoCapture.maxBatchSize}\``,
    "",
    "## Guidance",
    ""
  ];

  for (const item of payload.guidance) lines.push(`- ${item}`);
  lines.push("", "## Available Types", "");
  for (const item of payload.availableTypes) lines.push(`- \`${item}\``);
  lines.push("");

  return `${lines.join("\n")}\n`;
}
