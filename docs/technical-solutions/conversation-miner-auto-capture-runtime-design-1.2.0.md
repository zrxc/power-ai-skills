# conversation-miner auto capture runtime design 1.2.0

## Goal

`1.2.0` upgrades conversation capture from "AI outputs a marked block and the user still runs a second CLI command" to "confirmed summaries can be auto-submitted into a shared runtime and land in `.power-ai/conversations/` without a second manual capture step."

This version does not pretend every AI tool has the same runtime hook. Instead it standardizes a single backend runtime that all current wrappers can target.

## Scope

- Add a shared auto-capture inbox runtime under `.power-ai/auto-capture/`
- Add CLI entrypoints for submit, consume, and watch
- Keep the existing gated capture flow for manual and fallback usage
- Upgrade all generated wrapper example scripts with `-Auto`
- Extend `doctor` so projects can verify that the runtime assets exist

## New Runtime Layout

```text
.power-ai/
  auto-capture/
    inbox/
    processed/
    failed/
  adapters/
    start-auto-capture-runtime.example.ps1
    <tool>-capture.example.ps1
```

## Command Contract

### `submit-auto-capture`

Responsibilities:

- Read a session summary source
- Optionally extract `<<<POWER_AI_SESSION_SUMMARY_V1 ... >>>`
- Reuse the existing `evaluate-session-capture` gate
- Queue only `ask_capture` records into `.power-ai/auto-capture/inbox/`
- Optionally consume immediately with `--consume-now`

Typical usage:

```bash
npx power-ai-skills submit-auto-capture --tool trae --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --consume-now --json
```

### `consume-auto-capture-inbox`

Responsibilities:

- Read queued requests from `.power-ai/auto-capture/inbox/`
- Append records into `.power-ai/conversations/YYYY-MM-DD.json`
- Move successful requests to `.power-ai/auto-capture/processed/`
- Move failed requests to `.power-ai/auto-capture/failed/`

### `watch-auto-capture-inbox`

Responsibilities:

- Poll the inbox continuously for background runtime scenarios
- Reuse config defaults from `.power-ai/conversation-miner-config.json`
- Support `--once` for one-shot processing and testability

## Tool Integration Model

All current supported tools share the same target runtime:

- `codex`
- `trae`
- `cursor`
- `claude-code`
- `windsurf`
- `gemini-cli`
- `github-copilot`
- `cline`
- `aider`

The wrapper side only needs to do one of these:

1. After the user confirms capture, call `submit-auto-capture --consume-now`
2. Or write the response file and let a background `watch-auto-capture-inbox` process it

This keeps tool-specific work thin and prevents the capture logic from being duplicated per tool.

## Example Script Upgrade

Generated `.power-ai/adapters/<tool>-capture.example.ps1` scripts now support:

- interactive/manual confirm flow
- `-Auto` for direct runtime submission

Example:

```powershell
.\.power-ai\adapters\trae-capture.example.ps1 -ResponsePath .power-ai\tmp\assistant-response.txt -Auto
```

## Remaining Boundary

`1.2.0` provides the shared runtime and the generated adapter examples. It still does not guarantee that every GUI or hosted AI tool can execute local scripts automatically on reply. That final bridge depends on the host tool's own extension, wrapper, or automation capability.

In other words:

- runtime auto-capture: complete
- per-tool host-trigger automation: enabled by contract, but still tool-dependent

## Acceptance

`1.2.0` is complete when:

- `submit-auto-capture` can queue confirmed summaries
- `consume-auto-capture-inbox` can process queued requests into conversations
- `watch-auto-capture-inbox --once` is testable and idempotent
- generated adapter examples include `-Auto`
- `doctor` verifies auto-capture runtime assets
