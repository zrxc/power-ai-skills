import { supportedCaptureWrappers } from "./wrappers.mjs";

export function buildConversationCaptureGuidanceMarkdown() {
  return `<!-- generated-by: @power/power-ai-skills -->

# Conversation Capture Guidance

- Ask for capture only when the task is truly complete and project-related.
- Skip capture prompts for chat, general explanations, incomplete work, or low-value one-off edits.
- If the user confirms capture, output only one marked summary block using \`<<<POWER_AI_SESSION_SUMMARY_V1\` and \`>>>\`.
- Do not write conversations directly. Let the wrapper or CLI pass the block to \`submit-auto-capture\`, \`tool-capture-session\`, \`prepare-session-capture\`, or \`capture-session\`.
- Prefer automatic capture adapters that submit the confirmed marked block to the auto-capture runtime so the user does not need a second manual CLI step.
- If a host tool cannot execute the CLI directly, let it drop the confirmed response into \`.power-ai/auto-capture/response-inbox/\` and let the watcher process it.
- Use \`.power-ai/references/conversation-capture-contract.md\` as the source of truth for the block schema and wrapper contract.
`;
}

export function buildConversationCaptureContractMarkdown() {
  const supportedTools = supportedCaptureWrappers.map((wrapper) => `- \`${wrapper.toolName}\` -> \`${wrapper.commandName}\``).join("\n");

  return `<!-- generated-by: @power/power-ai-skills -->

# Conversation Capture Contract

## When To Ask

- The task is complete.
- The work is project-related.
- The result has reuse value for future project skill mining.
- The session is not already covered by an existing project skill.

## When Not To Ask

- Chat, brainstorming, and plain explanations.
- Incomplete or blocked tasks.
- Low-value one-off edits.
- Duplicate summaries or sessions already covered by project-local skills.

## Marked Block

\`\`\`text
<<<POWER_AI_SESSION_SUMMARY_V1
{
  "records": [
    {
      "timestamp": "2026-03-20T10:00:00+08:00",
      "toolUsed": "codex",
      "sceneType": "tree-list-page",
      "userIntent": "department member management page",
      "skillsUsed": ["tree-list-page", "dialog-skill", "api-skill"],
      "entities": {
        "mainObject": "member",
        "treeObject": "department",
        "operations": ["create", "edit", "delete"]
      },
      "generatedFiles": ["src/views/member/index.vue"],
      "customizations": ["refresh list after tree switch"],
      "complexity": "medium"
    }
  ]
}
>>>
\`\`\`

Rules:
- Output only one JSON object.
- Output only the marked block after the user confirms capture.
- Do not add extra explanation outside the block.

## Wrapper Entry

Preferred unified command:

\`\`\`bash
npx power-ai-skills tool-capture-session --tool <name> --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
\`\`\`

Preferred automatic runtime entry after the user has already confirmed capture inside the AI tool:

\`\`\`bash
npx power-ai-skills submit-auto-capture --tool <name> --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --consume-now --json
\`\`\`

Supported registered wrappers:
${supportedTools}

Fallback raw commands:

\`\`\`bash
npx power-ai-skills prepare-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills confirm-session-capture --request capture_xxx --json
\`\`\`

Auto-capture runtime commands:

\`\`\`bash
npx power-ai-skills submit-auto-capture --tool <name> --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --consume-now --json
npx power-ai-skills queue-auto-capture-response --tool <name> --from-file .power-ai/tmp/assistant-response.txt --json
npx power-ai-skills consume-auto-capture-response-inbox --max-items 10 --json
npx power-ai-skills watch-auto-capture-inbox --once --json
\`\`\`

Sample host bridge:

\`\`\`powershell
.\\.power-ai\\adapters\\trae-host-bridge.example.ps1 -ResponsePath .power-ai\\tmp\\assistant-response.txt
.\\.power-ai\\adapters\\cursor-host-bridge.example.ps1 -UseClipboard
.\\.power-ai\\adapters\\windsurf-host-bridge.example.ps1 -ResponseText $response
\`\`\`
`;
}

export function buildCaptureWrapperExampleScript({ toolName, displayName }) {
  return `# generated-by: @power/power-ai-skills
param(
  [string]$ResponsePath = "",
  [string]$ResponseText = "",
  [switch]$UseClipboard,
  [switch]$KeepTempFile,
  [switch]$Yes,
  [switch]$Reject,
  [switch]$Auto,
  [switch]$QueueResponse,
  [switch]$ConsumeNow
)

function Invoke-PowerAiSkills {
  param(
    [string[]]$CliArgs
  )

  $projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  $localCli = Join-Path $projectRoot "node_modules/.bin/power-ai-skills.cmd"
  if (Test-Path $localCli) {
    & $localCli @CliArgs
    return
  }

  npx power-ai-skills @CliArgs
}

$sourceCount = 0
if ($ResponsePath) { $sourceCount += 1 }
if ($ResponseText) { $sourceCount += 1 }
if ($UseClipboard) { $sourceCount += 1 }

if ($sourceCount -ne 1) {
  throw "Provide exactly one of -ResponsePath, -ResponseText, or -UseClipboard."
}

$resolvedResponsePath = $ResponsePath
$tempResponsePath = ""

if (-not $resolvedResponsePath) {
  $powerAiRoot = Split-Path -Parent $PSScriptRoot
  $tmpRoot = Join-Path $powerAiRoot "tmp"
  New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
  $tempResponsePath = Join-Path $tmpRoot "assistant-response.${toolName}.txt"

  if ($UseClipboard) {
    $content = Get-Clipboard
  } else {
    $content = $ResponseText
  }

  if (-not $content) {
    throw "${displayName} capture wrapper received empty response content."
  }

  Set-Content -Path $tempResponsePath -Value $content -Encoding UTF8
  $resolvedResponsePath = $tempResponsePath
}

try {
  if ($Auto) {
    $args = @(
      "submit-auto-capture",
      "--tool",
      "${toolName}",
      "--from-file",
      $resolvedResponsePath,
      "--extract-marked-block",
      "--consume-now",
      "--json"
    )
  } elseif ($QueueResponse) {
    $args = @(
      "queue-auto-capture-response",
      "--tool",
      "${toolName}",
      "--from-file",
      $resolvedResponsePath,
      "--json"
    )
    if ($ConsumeNow) {
      $args += "--consume-now"
    }
  } else {
    $args = @(
      "tool-capture-session",
      "--tool",
      "${toolName}",
      "--from-file",
      $resolvedResponsePath,
      "--extract-marked-block",
      "--json"
    )

    if ($Yes) {
      $args += "--yes"
    } elseif ($Reject) {
      $args += "--reject"
    }
  }

  Invoke-PowerAiSkills -CliArgs $args
} finally {
  if ($tempResponsePath -and -not $KeepTempFile) {
    Remove-Item -Path $tempResponsePath -Force -ErrorAction SilentlyContinue
  }
}

# Example:
# ./${toolName}-capture.example.ps1 -ResponsePath .power-ai/tmp/assistant-response.txt -Yes
# ./${toolName}-capture.example.ps1 -ResponseText $response -Auto
# ./${toolName}-capture.example.ps1 -UseClipboard -Auto
# ./${toolName}-capture.example.ps1 -ResponsePath .power-ai/tmp/assistant-response.txt -Auto
# ./${toolName}-capture.example.ps1 -ResponsePath .power-ai/tmp/assistant-response.txt -QueueResponse -ConsumeNow
# This sample wrapper is intended for ${displayName}.
`;
}

export function buildCustomCaptureWrapperExampleScript() {
  return `# generated-by: @power/power-ai-skills
param(
  [Parameter(Mandatory = $true)][string]$ToolName,
  [string]$ResponsePath = "",
  [string]$ResponseText = "",
  [switch]$UseClipboard,
  [switch]$KeepTempFile,
  [switch]$Yes,
  [switch]$Reject,
  [switch]$Auto,
  [switch]$QueueResponse,
  [switch]$ConsumeNow
)

function Invoke-PowerAiSkills {
  param(
    [string[]]$CliArgs
  )

  $projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  $localCli = Join-Path $projectRoot "node_modules/.bin/power-ai-skills.cmd"
  if (Test-Path $localCli) {
    & $localCli @CliArgs
    return
  }

  npx power-ai-skills @CliArgs
}

$sourceCount = 0
if ($ResponsePath) { $sourceCount += 1 }
if ($ResponseText) { $sourceCount += 1 }
if ($UseClipboard) { $sourceCount += 1 }

if ($sourceCount -ne 1) {
  throw "Provide exactly one of -ResponsePath, -ResponseText, or -UseClipboard."
}

$resolvedResponsePath = $ResponsePath
$tempResponsePath = ""

if (-not $resolvedResponsePath) {
  $powerAiRoot = Split-Path -Parent $PSScriptRoot
  $tmpRoot = Join-Path $powerAiRoot "tmp"
  New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
  $safeToolName = $ToolName -replace "[^A-Za-z0-9._-]", "-"
  $tempResponsePath = Join-Path $tmpRoot ("assistant-response." + $safeToolName + ".txt")

  if ($UseClipboard) {
    $content = Get-Clipboard
  } else {
    $content = $ResponseText
  }

  if (-not $content) {
    throw "Custom tool capture wrapper received empty response content."
  }

  Set-Content -Path $tempResponsePath -Value $content -Encoding UTF8
  $resolvedResponsePath = $tempResponsePath
}

try {
  if ($Auto) {
    Invoke-PowerAiSkills -CliArgs @("submit-auto-capture", "--tool", $ToolName, "--from-file", $resolvedResponsePath, "--extract-marked-block", "--consume-now", "--json")
    exit 0
  }

  if ($QueueResponse) {
    $args = @(
      "queue-auto-capture-response",
      "--tool",
      $ToolName,
      "--from-file",
      $resolvedResponsePath,
      "--json"
    )
    if ($ConsumeNow) {
      $args += "--consume-now"
    }
    Invoke-PowerAiSkills -CliArgs $args
    exit 0
  }

  $args = @(
    "prepare-session-capture",
    "--from-file",
    $resolvedResponsePath,
    "--extract-marked-block"
  )

  $prepared = Invoke-PowerAiSkills -CliArgs $args | ConvertFrom-Json

  if (-not $prepared.shouldPrompt) {
    $prepared | ConvertTo-Json -Depth 10
    exit 0
  }

  if ($Reject) {
    Invoke-PowerAiSkills -CliArgs @("confirm-session-capture", "--request", $prepared.requestId, "--reject", "--json")
    exit 0
  }

  if ($Yes) {
    Invoke-PowerAiSkills -CliArgs @("confirm-session-capture", "--request", $prepared.requestId, "--json")
    exit 0
  }

  Write-Host "[$ToolName] capture candidate detected. Re-run with -Yes or -Reject."
  $prepared | ConvertTo-Json -Depth 10
} finally {
  if ($tempResponsePath -and -not $KeepTempFile) {
    Remove-Item -Path $tempResponsePath -Force -ErrorAction SilentlyContinue
  }
}

# Example:
# ./custom-tool-capture.example.ps1 -ToolName my-cli -ResponseText $response -Auto
# ./custom-tool-capture.example.ps1 -ToolName my-gui -ResponseText $response -QueueResponse -ConsumeNow
# ./custom-tool-capture.example.ps1 -ToolName my-tool -ResponsePath .power-ai/tmp/assistant-response.txt -Yes
`;
}

export function buildAutoCaptureRuntimeExampleScript() {
  return `# generated-by: @power/power-ai-skills
param(
  [switch]$Once,
  [int]$PollIntervalMs = 1500,
  [int]$MaxBatchSize = 10
)

function Invoke-PowerAiSkills {
  param(
    [string[]]$CliArgs
  )

  $projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  $localCli = Join-Path $projectRoot "node_modules/.bin/power-ai-skills.cmd"
  if (Test-Path $localCli) {
    & $localCli @CliArgs
    return
  }

  npx power-ai-skills @CliArgs
}

$args = @(
  "watch-auto-capture-inbox",
  "--poll-interval-ms",
  $PollIntervalMs,
  "--max-items",
  $MaxBatchSize
)

if ($Once) {
  $args += "--once"
}

Invoke-PowerAiSkills -CliArgs $args

# Example:
# ./start-auto-capture-runtime.example.ps1
# ./start-auto-capture-runtime.example.ps1 -Once
`;
}

export function buildHostBridgeExampleScript({ toolName, displayName }) {
  return `# generated-by: @power/power-ai-skills
param(
  [string]$ResponsePath = "",
  [string]$ResponseText = "",
  [switch]$UseClipboard,
  [switch]$KeepTempFile
)

$sourceCount = 0
if ($ResponsePath) { $sourceCount += 1 }
if ($ResponseText) { $sourceCount += 1 }
if ($UseClipboard) { $sourceCount += 1 }

if ($sourceCount -ne 1) {
  throw "Provide exactly one of -ResponsePath, -ResponseText, or -UseClipboard."
}

$powerAiRoot = Split-Path -Parent $PSScriptRoot
$tmpRoot = Join-Path $powerAiRoot "tmp"
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
$tempResponsePath = Join-Path $tmpRoot "assistant-response.${toolName}.txt"

if ($ResponsePath) {
  if (-not (Test-Path $ResponsePath)) {
    throw "ResponsePath not found: $ResponsePath"
  }
  $content = Get-Content -Raw -Path $ResponsePath -Encoding UTF8
} elseif ($UseClipboard) {
  $content = Get-Clipboard
} else {
  $content = $ResponseText
}

if (-not $content) {
  throw "${displayName} host bridge received empty response content."
}

Set-Content -Path $tempResponsePath -Value $content -Encoding UTF8

try {
  & (Join-Path $PSScriptRoot "${toolName}-capture.example.ps1") -ResponsePath $tempResponsePath -QueueResponse -ConsumeNow
} finally {
  if (-not $KeepTempFile) {
    Remove-Item -Path $tempResponsePath -Force -ErrorAction SilentlyContinue
  }
}

# Example:
# .\\${toolName}-host-bridge.example.ps1 -ResponsePath .power-ai\\tmp\\assistant-response.txt
# .\\${toolName}-host-bridge.example.ps1 -UseClipboard
`;
}
