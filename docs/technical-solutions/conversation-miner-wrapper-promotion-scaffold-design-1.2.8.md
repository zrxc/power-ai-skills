# conversation-miner wrapper promotion scaffold design 1.2.8

## Goal

`1.2.8` provides a minimal promotion path from:

- unregistered tool using `custom-tool-capture.example.ps1`

to:

- a future first-class wrapper entry in `supportedCaptureWrappers`

without directly editing the registry during the scaffold step.

## Delivered Command

```bash
npx power-ai-skills scaffold-wrapper-promotion --tool my-new-tool --display-name "My New Tool" --style gui
```

Generated output:

```text
.power-ai/proposals/wrapper-promotions/my-new-tool/wrapper-promotion.json
.power-ai/proposals/wrapper-promotions/my-new-tool/README.md
```

## Design Notes

- This command is intentionally non-destructive.
- It does not modify:
  - `src/conversation-miner/wrappers.mjs`
  - command routing
  - tests
  - docs
- Instead it produces a proposal package with:
  - normalized tool metadata
  - current recommended entry command
  - target files to edit next
  - validation checklist

## Validation

`1.2.8` is complete when:

- proposal files are generated for an unregistered tool
- registered tools are rejected
- cwd behavior is covered in CLI selection tests
- docs expose the new scaffold command
