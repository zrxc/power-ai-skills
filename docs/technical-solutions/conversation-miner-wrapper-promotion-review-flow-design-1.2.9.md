# conversation-miner wrapper promotion review flow design 1.2.9

## Goal

`1.2.9` extends the wrapper promotion scaffold so proposals can move through a small review flow instead of staying as one-off draft directories.

## Delivered Commands

```bash
npx power-ai-skills scaffold-wrapper-promotion --tool my-new-tool --display-name "My New Tool" --style gui
npx power-ai-skills review-wrapper-promotion --tool my-new-tool --status accepted --note "ready for wrapper registration"
npx power-ai-skills list-wrapper-promotions --json
```

## State Model

Wrapper promotion proposals now support:

- `draft`
- `accepted`
- `rejected`
- `needs-work`

Stored fields:

- `status`
- `reviewedAt`
- `reviewNote`
- `reviewHistory`

## Design Notes

- This version still does not auto-edit `supportedCaptureWrappers`.
- The value is workflow clarity:
  - scaffold
  - review
  - list
  - then manually promote into first-class wrapper code
- Proposal README files are regenerated after review so the folder remains human-readable without opening raw JSON.

## Validation

`1.2.9` is complete when:

- proposal review updates JSON and README
- proposal list reports reviewed statuses
- cwd behavior is covered for the new commands
- docs describe the full draft -> accepted / needs-work / rejected flow
