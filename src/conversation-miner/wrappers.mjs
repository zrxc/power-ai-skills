export const supportedCaptureWrappers = [
  {
    toolName: "codex",
    displayName: "Codex",
    commandName: "codex-capture-session",
    integrationStyle: "terminal"
  },
  {
    toolName: "trae",
    displayName: "Trae",
    commandName: "trae-capture-session",
    integrationStyle: "gui"
  },
  {
    toolName: "cursor",
    displayName: "Cursor",
    commandName: "cursor-capture-session",
    integrationStyle: "gui"
  },
  {
    toolName: "claude-code",
    displayName: "Claude Code",
    commandName: "claude-code-capture-session",
    integrationStyle: "terminal"
  },
  {
    toolName: "windsurf",
    displayName: "Windsurf",
    commandName: "windsurf-capture-session",
    integrationStyle: "gui"
  },
  {
    toolName: "gemini-cli",
    displayName: "Gemini CLI",
    commandName: "gemini-cli-capture-session",
    integrationStyle: "terminal"
  },
  {
    toolName: "github-copilot",
    displayName: "GitHub Copilot",
    commandName: "github-copilot-capture-session",
    integrationStyle: "gui"
  },
  {
    toolName: "cline",
    displayName: "Cline",
    commandName: "cline-capture-session",
    integrationStyle: "gui"
  },
  {
    toolName: "aider",
    displayName: "Aider",
    commandName: "aider-capture-session",
    integrationStyle: "terminal"
  }
];

export function getCaptureWrapper(toolName) {
  return supportedCaptureWrappers.find((item) => item.toolName === String(toolName || "").trim().toLowerCase()) || null;
}
