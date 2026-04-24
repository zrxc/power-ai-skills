# conversation-miner custom tool dual mode design 1.2.7

## Goal

`1.2.7` formalizes `custom-tool-capture.example.ps1` as the default integration sample for tools that are not yet registered in the wrapper matrix.

The main requirement is to support both of these paths with one script:

- terminal-first direct auto-capture
- GUI / host-first response bridge capture

## Delivered Contract

The custom wrapper now serves as the documented sample for:

```powershell
.\.power-ai\adapters\custom-tool-capture.example.ps1 -ToolName my-cli -ResponseText $response -Auto
.\.power-ai\adapters\custom-tool-capture.example.ps1 -ToolName my-gui -ResponseText $response -QueueResponse -ConsumeNow
.\.power-ai\adapters\custom-tool-capture.example.ps1 -ToolName my-tool -ResponsePath .power-ai\tmp\assistant-response.txt -Yes
```

## Design Notes

- No new runtime behavior is added in `1.2.7`.
- The value of this version is contract clarity:
  - one fallback script
  - two recommended integration styles
  - end-to-end proof for both
- This makes it possible to onboard new tools before they are promoted into `supportedCaptureWrappers`.

## Validation

`1.2.7` is complete when:

- `custom-tool-capture.example.ps1` documents both integration styles
- one end-to-end test covers terminal-first custom auto-capture
- one end-to-end test covers GUI-style custom queue-response capture
- docs explain when to choose each mode
