# conversation-miner queue response bridge design 1.2.2

## Goal

`1.2.1` introduced the response inbox bridge, but host automation still had two styles:

- queue raw response
- then consume it

`1.2.2` makes the generated adapter examples easier to use by exposing a single bridge mode directly from each tool script.

## What Changed

Generated wrapper examples now support:

- `-Yes` / `-Reject` for confirmed wrapper flow
- `-Auto` for direct marked-block submit flow
- `-QueueResponse` for raw response bridge flow
- `-QueueResponse -ConsumeNow` for one-command bridge and consume

## Why It Matters

This is the most practical host integration shape for GUI tools:

1. user confirms capture inside the tool
2. host saves the final reply text
3. host runs:

```powershell
.\.power-ai\adapters\trae-capture.example.ps1 -ResponsePath .power-ai\tmp\assistant-response.txt -QueueResponse -ConsumeNow
```

At that point the host does not need to know:

- marked block extraction details
- capture gate details
- inbox directory layout

It just forwards the response text through a stable adapter entry.

## Scope

This applies to every registered wrapper:

- `codex`
- `trae`
- `cursor`
- `claude-code`
- `windsurf`
- `gemini-cli`
- `github-copilot`
- `cline`
- `aider`

and to `custom-tool-capture.example.ps1`.

## Acceptance

`1.2.2` is complete when:

- wrapper example scripts expose `-QueueResponse`
- `queue-auto-capture-response --consume-now` works in one command
- the end-to-end tests cover the one-command raw response bridge
