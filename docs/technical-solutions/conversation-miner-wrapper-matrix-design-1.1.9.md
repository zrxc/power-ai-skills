# conversation-miner wrapper matrix design 1.1.9

## Background

By `1.1.8`, the capture contract and scaffold assets were already stable, but the real wrapper layer still only covered a subset of tools.

That left projects with mixed tool usage in an awkward state:

- some tools had first-class confirm/reject wrapper commands
- others had to fall back to custom scripts even though they were already registered in `tool-registry.json`

## Goal

Expand the wrapper matrix so the following tools all participate in the same confirmed capture flow:

- `codex`
- `trae`
- `cursor`
- `claude-code`
- `windsurf`
- `gemini-cli`
- `github-copilot`
- `cline`
- `aider`

## Scope

`1.1.9` adds or formalizes these wrapper commands:

```bash
npx power-ai-skills codex-capture-session
npx power-ai-skills trae-capture-session
npx power-ai-skills cursor-capture-session
npx power-ai-skills claude-code-capture-session
npx power-ai-skills windsurf-capture-session
npx power-ai-skills gemini-cli-capture-session
npx power-ai-skills github-copilot-capture-session
npx power-ai-skills cline-capture-session
npx power-ai-skills aider-capture-session
```

And all of them map to the unified entry:

```bash
npx power-ai-skills tool-capture-session --tool <name> --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
```

## Design

This version does not introduce nine separate capture implementations.

All wrappers still reuse the same shared flow:

1. `prepare-session-capture`
2. interactive confirm or explicit `--yes/--reject`
3. `confirm-session-capture`

That keeps:

- duplicate suppression
- already-covered checks
- project-value gating
- pending request handling

inside the existing `conversation-miner` core.

## Scaffold Impact

Because wrapper examples are generated from the shared registry, `.power-ai/adapters/` now includes:

- `codex-capture.example.ps1`
- `trae-capture.example.ps1`
- `cursor-capture.example.ps1`
- `claude-code-capture.example.ps1`
- `windsurf-capture.example.ps1`
- `gemini-cli-capture.example.ps1`
- `github-copilot-capture.example.ps1`
- `cline-capture.example.ps1`
- `aider-capture.example.ps1`
- `custom-tool-capture.example.ps1`

## Doctor Coverage

`doctor` now validates that the wrapper matrix scaffold is complete, including all generated example scripts listed above.

## Acceptance

`1.1.9` is complete when:

- every registered tool in the wrapper matrix can run `--yes` and write conversations
- every registered tool in the wrapper matrix can run `--reject` without leaving pending captures
- `tool-capture-session --tool <name>` works for all tools in the matrix
- `doctor` reports missing wrapper examples if any generated script is deleted
