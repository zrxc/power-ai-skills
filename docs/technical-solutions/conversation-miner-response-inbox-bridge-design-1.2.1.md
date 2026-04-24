# conversation-miner response inbox bridge design 1.2.1

## Goal

`1.2.0` completed the shared auto-capture runtime for tools that can invoke `power-ai-skills` directly after the user confirms capture.

`1.2.1` adds a second bridge for tools that cannot reliably execute the CLI at reply time but can still export or save the confirmed AI response text.

## Problem

Many GUI tools can:

- ask the user whether to collect
- output a confirmed `<<<POWER_AI_SESSION_SUMMARY_V1 ... >>>` block

But they may not be able to:

- run a local CLI immediately after that reply

Without a second bridge, those tools still fall back to manual copy and capture.

## Solution

Add a raw response inbox under `.power-ai/auto-capture/response-inbox/`.

The integration contract becomes:

1. Tool confirms the user wants capture
2. Tool outputs a valid marked block
3. Host automation writes that reply text into `response-inbox`
4. Runtime watcher converts the raw response into a normal auto-capture submission
5. Runtime consumes the queued request into `.power-ai/conversations/`

## New Directories

```text
.power-ai/
  auto-capture/
    response-inbox/
    response-processed/
    response-failed/
    inbox/
    processed/
    failed/
```

## New Commands

### `queue-auto-capture-response`

Use when you want to enqueue a raw confirmed AI reply instead of pre-parsed JSON.

Example:

```bash
npx power-ai-skills queue-auto-capture-response --tool trae --from-file .power-ai/tmp/assistant-response.txt --json
```

### `consume-auto-capture-response-inbox`

Reads raw response files from `response-inbox`, extracts marked blocks, reuses the existing gate, and then forwards valid captures into the standard auto-capture runtime.

### `watch-auto-capture-inbox`

Now processes both layers:

1. `response-inbox`
2. `inbox`

This means one watcher can serve both:

- tools that can call `submit-auto-capture` directly
- tools that can only drop a response file

## Why This Matters

This bridge is especially useful for tools such as:

- `trae`
- `cursor`
- `windsurf`
- `cline`
- `github-copilot`

because their final automation shape is often "extension or host writes a file" rather than "tool runs a local command inline".

## Acceptance

`1.2.1` is complete when:

- raw confirmed responses can be queued independently
- response inbox consumption moves successful requests to `response-processed`
- failed parses or invalid payloads move to `response-failed`
- watcher one-shot mode processes response inbox before capture inbox
