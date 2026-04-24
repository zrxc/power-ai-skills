# conversation-miner terminal direct auto capture design 1.2.6

## Goal

`1.2.6` formalizes the terminal-first capture path for tools that can usually hand the confirmed final response text directly to a local script without needing a GUI host bridge.

Target tools:

- `codex`
- `claude-code`
- `gemini-cli`
- `aider`

## Delivered Changes

The generated `<tool>-capture.example.ps1` wrapper now accepts:

- `-ResponsePath`
- `-ResponseText`
- `-UseClipboard`
- `-KeepTempFile`

This means terminal tools can now prefer:

```powershell
.\.power-ai\adapters\<tool>-capture.example.ps1 -ResponseText $response -Auto
```

instead of first writing a manual response file or pretending to be a GUI host bridge.

## Design Notes

- No new terminal-specific bridge script is introduced.
- The existing wrapper is extended so one script can support:
  - confirm/reject flow
  - direct auto-capture
  - response inbox queueing
- Temporary response files are created only when the source is `ResponseText` or `UseClipboard`, and are deleted automatically unless `-KeepTempFile` is passed.

## Validation

`1.2.6` is complete when:

- generated terminal wrappers support `-ResponseText -Auto`
- generated terminal wrappers support `-UseClipboard -Auto`
- end-to-end tests prove direct auto-capture for `codex`, `claude-code`, `gemini-cli`, and `aider`
- docs clearly distinguish terminal-first capture from GUI host bridge capture
