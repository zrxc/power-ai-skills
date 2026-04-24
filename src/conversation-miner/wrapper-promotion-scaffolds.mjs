import { toCamelCase } from "./wrapper-promotion-identifiers.mjs";

export function buildWrapperPromotionReadme(proposal) {
  const {
    toolName,
    displayName,
    integrationStyle,
    generatedAt,
    status = "draft",
    reviewedAt = "",
    reviewNote = "",
    reviewHistory = [],
    applicationStatus = "not-applied",
    appliedAt = "",
    appliedFiles = [],
    followUpStatus = "not-started",
    testsScaffoldedAt = "",
    testScaffoldFiles = [],
    docsGeneratedAt = "",
    docScaffoldFiles = [],
    finalizedAt = "",
    finalizationNote = "",
    registrationStatus = "not-registered",
    registeredAt = "",
    registrationNote = "",
    archiveStatus = "active",
    archivedAt = "",
    archiveNote = "",
    restoredAt = "",
    restorationNote = "",
    postApplyChecklistPath = "",
    pendingFollowUps = []
  } = proposal;
  const sampleCommand = integrationStyle === "gui"
    ? `powershell -ExecutionPolicy Bypass -File .power-ai/adapters/custom-tool-capture.example.ps1 -ToolName ${toolName} -ResponseText $response -QueueResponse -ConsumeNow`
    : `powershell -ExecutionPolicy Bypass -File .power-ai/adapters/custom-tool-capture.example.ps1 -ToolName ${toolName} -ResponseText $response -Auto`;
  const historyLines = reviewHistory.length > 0
    ? reviewHistory.map((item) => `- \`${item.reviewedAt}\` -> \`${item.status}\`${item.note ? `: ${item.note}` : ""}`).join("\n")
    : "- no review yet";

  return `# Wrapper Promotion Proposal

- Tool name: \`${toolName}\`
- Display name: \`${displayName}\`
- Integration style: \`${integrationStyle}\`
- Generated at: \`${generatedAt}\`
- Current status: \`${status}\`
- Last reviewed at: \`${reviewedAt || "not-reviewed"}\`
- Last review note: ${reviewNote ? `\`${reviewNote}\`` : "`none`"}
- Materialization status: \`${proposal.materializationStatus || "not-generated"}\`
- Materialized at: \`${proposal.materializedAt || "not-generated"}\`
- Application status: \`${applicationStatus}\`
- Applied at: \`${appliedAt || "not-applied"}\`
- Applied files: ${appliedFiles.length > 0 ? appliedFiles.map((item) => `\`${item}\``).join(", ") : "`none`"}
- Follow-up status: \`${followUpStatus}\`
- Tests scaffolded at: \`${testsScaffoldedAt || "not-scaffolded"}\`
- Test scaffold files: ${testScaffoldFiles.length > 0 ? testScaffoldFiles.map((item) => `\`${item}\``).join(", ") : "`none`"}
- Docs generated at: \`${docsGeneratedAt || "not-generated"}\`
- Doc scaffold files: ${docScaffoldFiles.length > 0 ? docScaffoldFiles.map((item) => `\`${item}\``).join(", ") : "`none`"}
- Finalized at: \`${finalizedAt || "not-finalized"}\`
- Finalization note: ${finalizationNote ? `\`${finalizationNote}\`` : "`none`"}
- Registration status: \`${registrationStatus}\`
- Registered at: \`${registeredAt || "not-registered"}\`
- Registration note: ${registrationNote ? `\`${registrationNote}\`` : "`none`"}
- Archive status: \`${archiveStatus}\`
- Archived at: \`${archivedAt || "not-archived"}\`
- Archive note: ${archiveNote ? `\`${archiveNote}\`` : "`none`"}
- Restored at: \`${restoredAt || "not-restored"}\`
- Restoration note: ${restorationNote ? `\`${restorationNote}\`` : "`none`"}
- Post-apply checklist: ${postApplyChecklistPath ? `\`${postApplyChecklistPath}\`` : "`none`"}
- Pending follow-ups: ${pendingFollowUps.length > 0 ? pendingFollowUps.map((item) => `\`${item}\``).join(", ") : "`none`"}

## Current recommended entry

\`\`\`powershell
${sampleCommand}
\`\`\`

## Promotion Checklist

1. Add the tool to \`src/conversation-miner/wrappers.mjs\` with \`toolName\`, \`displayName\`, \`commandName\`, and \`integrationStyle\`.
2. Add the dedicated command mapping in \`src/commands/project-commands.mjs\` and register it in \`src/commands/index.mjs\`.
3. Update \`src/selection/cli.mjs\` so the new command keeps the current cwd as project root.
4. If the tool is GUI / IDE style, decide whether a dedicated \`<tool>-host-bridge.example.ps1\` is necessary.
5. Add end-to-end tests covering the recommended capture path.
6. Update README, tool-adapters, command manual, and release notes.

## Validation Checklist

- [ ] wrapper registered
- [ ] command wired
- [ ] cwd behavior covered
- [ ] tests added
- [ ] docs added
- [ ] release notes updated

## Review History

${historyLines}
`;
}

export function buildWrapperRegistrationArtifacts(proposal) {
  const commandName = `${proposal.toolName}-capture-session`;
  const functionName = `${toCamelCase(proposal.toolName)}CaptureSessionCommand`;
  const hostBridgeSnippet = proposal.integrationStyle === "gui"
    ? `writeTextIfChanged(
  path.join(paths.adaptersTarget, "${proposal.toolName}-host-bridge.example.ps1"),
  buildHostBridgeExampleScript({ toolName: "${proposal.toolName}", displayName: "${proposal.displayName}" })
);`
    : "";

  return {
    wrapperEntry: `  {
    toolName: "${proposal.toolName}",
    displayName: "${proposal.displayName}",
    commandName: "${commandName}",
    integrationStyle: "${proposal.integrationStyle}"
  }`,
    projectCommandsSnippet: `  async function ${functionName}() {
    await runToolCaptureWrapper(getCaptureWrapper("${proposal.toolName}"));
  }`,
    commandHandlerEntry: `    "${commandName}": () => projectCommands.${functionName}(),`,
    commandRunnerSnippet: `    else if (cliArgs.command === "${commandName}") await projectCommands.${functionName}();`,
    selectionCliSnippet: `"${commandName}"`,
    hostBridgeSnippet: hostBridgeSnippet
      ? `    ${hostBridgeSnippet.replace(/\n/g, "\n    ")}`
      : "",
    commandName,
    functionName
  };
}

export function buildWrapperRegistrationReadme({ proposal, artifacts, generatedAt }) {
  return `# Wrapper Registration Bundle

- Tool name: \`${proposal.toolName}\`
- Display name: \`${proposal.displayName}\`
- Integration style: \`${proposal.integrationStyle}\`
- Generated at: \`${generatedAt}\`

## wrappers.mjs

\`\`\`js
${artifacts.wrapperEntry}
\`\`\`

## project-commands.mjs

\`\`\`js
${artifacts.projectCommandsSnippet}
\`\`\`

## commands/index.mjs

\`\`\`js
${artifacts.commandHandlerEntry}
\`\`\`

${artifacts.hostBridgeSnippet ? `## conversation-miner/index.mjs host bridge\n\n\`\`\`js\n${artifacts.hostBridgeSnippet}\n\`\`\`\n` : ""}
## Notes

- This bundle is generated only for proposals in \`accepted\` state.
- Run \`apply-wrapper-promotion --tool <name>\` to write the core registration snippets back into repository source files.
- The bundle is intended to accelerate the final promotion into a first-class wrapper.
`;
}

export function buildWrapperPromotionTestSnippets({ proposal, artifacts }) {
  const captureDate = proposal.integrationStyle === "gui" ? "2026-05-01" : "2026-05-02";
  const sceneType = proposal.integrationStyle === "gui" ? "dialog-form" : "basic-list-page";
  const generatedFile = proposal.integrationStyle === "gui"
    ? `src/views/${proposal.toolName}/host-dialog.vue`
    : `src/views/${proposal.toolName}/index.vue`;

  return {
    conversationMinerTestSnippet: proposal.integrationStyle === "gui"
      ? `test("${proposal.toolName}-host-bridge generated wrapper sample captures records end to end", (t) => {
  const { projectRoot } = createConversationProject(t);
  installLocalCliShim(projectRoot);
  const initResult = runCli(projectRoot, "init", ["--tool", "${proposal.toolName}", "--no-project-scan"]);
  assert.equal(initResult.status, 0, initResult.stderr);

  const bridgeScriptPath = path.join(projectRoot, ".power-ai", "adapters", "${proposal.toolName}-host-bridge.example.ps1");
  const responseText = buildWrapperResponse({
    timestamp: "${captureDate}T11:00:00+08:00",
    sceneType: "${sceneType}",
    userIntent: "${proposal.displayName} generated GUI wrapper sample",
    mainObject: "record",
    operations: ["create", "save"],
    generatedFile: "${generatedFile}",
    customizations: ["generated host bridge sample"]
  });

  const bridgeResult = runPowerShellScript(projectRoot, bridgeScriptPath, [
    "-ResponseText",
    responseText
  ]);
  assert.equal(bridgeResult.status, 0, bridgeResult.stderr);

  const bridgePayload = JSON.parse(bridgeResult.stdout);
  assert.equal(bridgePayload.queued, true);
  assert.equal(bridgePayload.consumed.processedCount, 1);
});`
      : `test("${artifacts.commandName} generated wrapper sample captures records end to end", (t) => {
  const { tempRoot, projectRoot } = createConversationProject(t);
  const responsePath = path.join(tempRoot, "${proposal.toolName}-wrapper-response.txt");
  writeFile(
    responsePath,
    buildWrapperResponse({
      timestamp: "${captureDate}T11:00:00+08:00",
      sceneType: "${sceneType}",
      userIntent: "${proposal.displayName} generated terminal wrapper sample",
      mainObject: "record",
      operations: ["create", "edit", "delete"],
      generatedFile: "${generatedFile}",
      customizations: ["generated wrapper sample"]
    })
  );

  const result = runCli(projectRoot, "${artifacts.commandName}", [
    "--from-file",
    responsePath,
    "--extract-marked-block",
    "--yes",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.tool, "${proposal.toolName}");
  assert.equal(payload.decision, "captured");
});`,
    selectionTestSnippet: `test("resolveProjectRoot keeps cwd for ${artifacts.commandName}", (t) => {
  const context = createRuntimeContext(import.meta.url);
  const cwd = createTempProject(t);
  const cliArgs = parseCliArgs(["node", "power-ai-skills", "${artifacts.commandName}", "--from-file", "assistant-response.txt"]);
  const projectRoot = resolveProjectRoot({ context, cliArgs, cwd });
  assert.equal(projectRoot, cwd);
});`
  };
}

export function buildWrapperPromotionPostApplyChecklist({ proposal }) {
  const styleSpecificItems = proposal.integrationStyle === "gui"
    ? [
        "- [ ] validate the generated host bridge sample against the real GUI host trigger path",
        `- [ ] verify \`.power-ai/adapters/${proposal.toolName}-host-bridge.example.ps1\` works in a real project`
      ]
    : [
        "- [ ] validate the terminal-first auto capture path against the real CLI host",
        `- [ ] verify \`.power-ai/adapters/${proposal.toolName}-capture.example.ps1 -Auto\` works in a real project`
      ];

  return `# Post-Apply Checklist

- tool: \`${proposal.toolName}\`
- displayName: \`${proposal.displayName}\`
- integrationStyle: \`${proposal.integrationStyle}\`

## Required Follow-ups

- [ ] run the generated wrapper tests and adjust fixture details if the real tool behavior differs
- [ ] review the generated doc snippets and merge them into README / tool-adapters / command manual if needed
- [ ] review doctor output after the wrapper is fully integrated
${styleSpecificItems.join("\n")}

## Suggested Validation

1. Run \`node --test .\\tests\\*.test.mjs\`
2. Run \`node .\\scripts\\check-docs.mjs\`
3. Run \`node .\\scripts\\check-package.mjs\`
4. Run \`node .\\scripts\\check-tooling-config.mjs\`
`;
}

export function buildWrapperPromotionDocScaffolds({ proposal, artifacts }) {
  const toolLabel = proposal.displayName;
  const commandLine = `npx power-ai-skills ${artifacts.commandName} --from-file .power-ai/tmp/assistant-response.txt --extract-marked-block --yes --json`;
  const wrapperUsage = proposal.integrationStyle === "gui"
    ? `.\\.power-ai\\adapters\\${proposal.toolName}-host-bridge.example.ps1 -ResponsePath .power-ai\\tmp\\assistant-response.txt`
    : `.\\.power-ai\\adapters\\${proposal.toolName}-capture.example.ps1 -ResponseText $response -Auto`;

  return {
    readme: `## ${toolLabel} Wrapper Sample

\`\`\`bash
${commandLine}
\`\`\`

- Generated from wrapper promotion proposal \`${proposal.toolName}\`.
- Recommended wrapper helper:
\`\`\`powershell
${wrapperUsage}
\`\`\`
`,
    toolAdapters: `### ${toolLabel}

- tool name: \`${proposal.toolName}\`
- command: \`${artifacts.commandName}\`
- integration style: \`${proposal.integrationStyle}\`
- recommended sample:
\`\`\`powershell
${wrapperUsage}
\`\`\`
`,
    commandManual: `## ${toolLabel} wrapper command

\`\`\`bash
${commandLine}
\`\`\`

- This snippet is generated by \`apply-wrapper-promotion\`.
- Review the final host behavior before publishing the wrapper as fully integrated.
`
  };
}
