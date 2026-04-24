export const requiredKnowledgeArtifacts = [
  {
    code: "PAI-KNOWLEDGE-001",
    name: "generated component registry exists",
    relativePath: "foundation/power-component-library/references/generated/component-registry.json",
    remediation: "Run `npx power-ai-skills sync` to restore the generated component registry."
  },
  {
    code: "PAI-KNOWLEDGE-002",
    name: "generated tree-user-crud recipe exists",
    relativePath: "foundation/power-component-library/references/generated/page-recipes/tree-user-crud.json",
    remediation: "Run `npx power-ai-skills sync` to restore the generated tree-user-crud page recipe."
  },
  {
    code: "PAI-KNOWLEDGE-003",
    name: "generated basic-list-crud recipe exists",
    relativePath: "foundation/power-component-library/references/generated/page-recipes/basic-list-crud.json",
    remediation: "Run `npx power-ai-skills sync` to restore the generated basic-list-crud page recipe."
  },
  {
    code: "PAI-KNOWLEDGE-004",
    name: "generated pc-tree guide exists",
    relativePath: "foundation/power-component-library/references/generated/component-guides/pc-tree.md",
    remediation: "Run `npx power-ai-skills sync` to restore the generated pc-tree component guide."
  },
  {
    code: "PAI-KNOWLEDGE-005",
    name: "generated pc-table-warp guide exists",
    relativePath: "foundation/power-component-library/references/generated/component-guides/pc-table-warp.md",
    remediation: "Run `npx power-ai-skills sync` to restore the generated pc-table-warp component guide."
  },
  {
    code: "PAI-KNOWLEDGE-006",
    name: "generated pc-dialog guide exists",
    relativePath: "foundation/power-component-library/references/generated/component-guides/pc-dialog.md",
    remediation: "Run `npx power-ai-skills sync` to restore the generated pc-dialog component guide."
  },
  {
    code: "PAI-KNOWLEDGE-007",
    name: "generated pc-container guide exists",
    relativePath: "foundation/power-component-library/references/generated/component-guides/pc-container.md",
    remediation: "Run `npx power-ai-skills sync` to restore the generated pc-container component guide."
  },
  {
    code: "PAI-KNOWLEDGE-008",
    name: "tree-list-page skill exists",
    relativePath: "ui/tree-list-page/SKILL.md",
    remediation: "Run `npx power-ai-skills sync` to restore the tree-list-page skill files."
  },
  {
    code: "PAI-KNOWLEDGE-009",
    name: "basic-list-page skill exists",
    relativePath: "ui/basic-list-page/SKILL.md",
    remediation: "Run `npx power-ai-skills sync` to restore the basic-list-page skill files."
  },
  {
    code: "PAI-KNOWLEDGE-010",
    name: "entry-skill exists",
    relativePath: "orchestration/entry-skill/SKILL.md",
    remediation: "Run `npx power-ai-skills sync` to restore the entry-skill files."
  }
];

export const requiredConversationArtifacts = [
  {
    code: "PAI-CONVERSATION-001",
    name: "conversation miner config exists",
    relativePath: "conversation-miner-config.json",
    remediation: "Run `npx power-ai-skills sync` to restore `.power-ai/conversation-miner-config.json`."
  },
  {
    code: "PAI-CONVERSATION-002",
    name: "conversation guidance exists",
    relativePath: "shared/conversation-capture.md",
    remediation: "Run `npx power-ai-skills sync` to restore the shared conversation capture guidance."
  },
  {
    code: "PAI-CONVERSATION-003",
    name: "conversation capture contract exists",
    relativePath: "references/conversation-capture-contract.md",
    remediation: "Run `npx power-ai-skills sync` to restore the conversation capture contract."
  },
  {
    code: "PAI-CONVERSATION-004",
    name: "codex capture example exists",
    relativePath: "adapters/codex-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Codex capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-005",
    name: "trae capture example exists",
    relativePath: "adapters/trae-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Trae capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-006",
    name: "cursor capture example exists",
    relativePath: "adapters/cursor-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Cursor capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-007",
    name: "claude-code capture example exists",
    relativePath: "adapters/claude-code-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Claude Code capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-008",
    name: "windsurf capture example exists",
    relativePath: "adapters/windsurf-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Windsurf capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-009",
    name: "gemini-cli capture example exists",
    relativePath: "adapters/gemini-cli-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Gemini CLI capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-010",
    name: "github-copilot capture example exists",
    relativePath: "adapters/github-copilot-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the GitHub Copilot capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-011",
    name: "cline capture example exists",
    relativePath: "adapters/cline-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Cline capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-012",
    name: "aider capture example exists",
    relativePath: "adapters/aider-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Aider capture wrapper example."
  },
  {
    code: "PAI-CONVERSATION-013",
    name: "custom tool capture example exists",
    relativePath: "adapters/custom-tool-capture.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the generic custom tool capture example."
  },
  {
    code: "PAI-CONVERSATION-014",
    name: "conversation directories exist",
    relativePath: "conversations",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the conversation capture directories."
  },
  {
    code: "PAI-CONVERSATION-015",
    name: "pending capture directory exists",
    relativePath: "pending-captures",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the pending capture directory."
  },
  {
    code: "PAI-CONVERSATION-016",
    name: "conversation pattern directory exists",
    relativePath: "patterns",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the conversation pattern directory."
  },
  {
    code: "PAI-CONVERSATION-017",
    name: "auto capture runtime example exists",
    relativePath: "adapters/start-auto-capture-runtime.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the auto capture runtime example script."
  },
  {
    code: "PAI-CONVERSATION-018",
    name: "auto capture inbox directory exists",
    relativePath: "auto-capture/inbox",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the auto capture inbox directory."
  },
  {
    code: "PAI-CONVERSATION-019",
    name: "auto capture processed directory exists",
    relativePath: "auto-capture/processed",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the auto capture processed directory."
  },
  {
    code: "PAI-CONVERSATION-020",
    name: "auto capture failed directory exists",
    relativePath: "auto-capture/failed",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the auto capture failed directory."
  },
  {
    code: "PAI-CONVERSATION-021",
    name: "auto capture response inbox directory exists",
    relativePath: "auto-capture/response-inbox",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the auto capture response inbox directory."
  },
  {
    code: "PAI-CONVERSATION-022",
    name: "auto capture response processed directory exists",
    relativePath: "auto-capture/response-processed",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the auto capture response processed directory."
  },
  {
    code: "PAI-CONVERSATION-023",
    name: "auto capture response failed directory exists",
    relativePath: "auto-capture/response-failed",
    directory: true,
    remediation: "Run `npx power-ai-skills sync` to recreate the auto capture response failed directory."
  },
  {
    code: "PAI-CONVERSATION-024",
    name: "trae host bridge example exists",
    relativePath: "adapters/trae-host-bridge.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Trae host bridge example script."
  },
  {
    code: "PAI-CONVERSATION-025",
    name: "cursor host bridge example exists",
    relativePath: "adapters/cursor-host-bridge.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Cursor host bridge example script."
  },
  {
    code: "PAI-CONVERSATION-026",
    name: "windsurf host bridge example exists",
    relativePath: "adapters/windsurf-host-bridge.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Windsurf host bridge example script."
  },
  {
    code: "PAI-CONVERSATION-027",
    name: "cline host bridge example exists",
    relativePath: "adapters/cline-host-bridge.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the Cline host bridge example script."
  },
  {
    code: "PAI-CONVERSATION-028",
    name: "github copilot host bridge example exists",
    relativePath: "adapters/github-copilot-host-bridge.example.ps1",
    remediation: "Run `npx power-ai-skills sync` to restore the GitHub Copilot host bridge example script."
  }
];
