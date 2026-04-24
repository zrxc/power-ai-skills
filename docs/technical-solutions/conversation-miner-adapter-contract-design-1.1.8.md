# conversation-miner adapter contract design 1.1.8

## Background

`1.1.4` to `1.1.7` proved that confirmed capture can run through wrapper commands, but new tools still had a high integration cost:

- wrapper users had to discover the marked block contract from scattered docs
- init/sync did not scaffold any adapter examples
- doctor could not verify whether capture guidance and wrapper examples were present
- entry templates did not include a stable capture policy for "when to ask"

`1.1.8` closes that gap by turning conversation capture into a first-class scaffolded contract.

## Goals

- scaffold capture guidance and adapter examples during `init` and `sync`
- make the marked block and wrapper contract explicit inside `.power-ai/`
- inject a shared capture policy into managed entry templates
- let `doctor` verify the capture chain before users hit runtime issues

## Generated Assets

After `init` or `sync`, the project now gets:

```text
.power-ai/
  shared/
    conversation-capture.md
  references/
    conversation-capture-contract.md
  adapters/
    codex-capture.example.ps1
    cursor-capture.example.ps1
    claude-code-capture.example.ps1
    custom-tool-capture.example.ps1
  conversations/
  pending-captures/
  patterns/
  conversation-miner-config.json
```

## Template Contract

Managed templates now include a shared capture rule block:

- ask for capture only when the task is complete and project-related
- skip capture for chat, explanation, incomplete work, and low-value one-off edits
- after user confirmation, output only one `POWER_AI_SESSION_SUMMARY_V1` marked block
- never write `.power-ai/conversations` directly from the model

This rule is rendered through the new placeholder:

```text
{{POWER_AI_CONVERSATION_CAPTURE}}
```

## Wrapper Guidance

Registered wrappers still use:

```bash
npx power-ai-skills tool-capture-session --tool <name> --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json
```

For unregistered tools, the generic fallback is:

```bash
npx power-ai-skills prepare-session-capture --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block
npx power-ai-skills confirm-session-capture --request capture_xxx --json
```

The example scripts under `.power-ai/adapters/` exist so teams can copy and adapt them instead of reverse-engineering the flow.

## Doctor Coverage

`doctor` now checks:

- conversation miner config
- shared capture guidance
- capture contract reference
- codex / cursor / claude-code example wrappers
- generic custom-tool example wrapper
- conversations / pending-captures / patterns directories

## Acceptance

`1.1.8` is complete when:

- `init` creates the capture scaffold without requiring a first capture run
- `sync` restores missing scaffold assets
- templates render capture rules without leaving raw placeholders
- `doctor` reports a dedicated conversation capture group
- tests cover rendering, scaffold generation, and doctor failure on missing capture assets
