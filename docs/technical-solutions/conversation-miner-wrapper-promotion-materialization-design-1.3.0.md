# conversation-miner wrapper promotion materialization design 1.3.0

## Goal

`1.3.0` extends the wrapper promotion flow one step beyond review.

Instead of stopping at:

- scaffolded proposal
- reviewed status

an accepted proposal can now generate a concrete registration bundle that is ready to be applied into the repository source.

## Delivered Command

```bash
npx power-ai-skills materialize-wrapper-promotion --tool my-new-tool
```

Generated output:

```text
.power-ai/proposals/wrapper-promotions/my-new-tool/registration-artifacts/wrapper-registration.bundle.json
.power-ai/proposals/wrapper-promotions/my-new-tool/registration-artifacts/wrapper-registration.patch.md
```

## Bundle Contents

The generated bundle includes snippets for:

- `src/conversation-miner/wrappers.mjs`
- `src/commands/project-commands.mjs`
- `src/commands/index.mjs`
- `src/selection/cli.mjs`
- optional GUI host bridge generation note

## Design Notes

- This version still avoids auto-editing repository source files.
- The goal is to generate deterministic, reviewable registration artifacts.
- Proposal state is updated with:
  - `materializationStatus`
  - `materializedAt`

## Validation

`1.3.0` is complete when:

- accepted proposals can generate registration artifacts
- draft proposals are rejected
- generated bundle includes command and function snippets
- docs expose the new materialization step
