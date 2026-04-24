export function insertSnippetBeforeMarker(text, { marker, snippet, presenceCheck = snippet, label }) {
  if (text.includes(presenceCheck)) {
    return { text, changed: false };
  }

  const index = text.indexOf(marker);
  if (index === -1) {
    throw new Error(`Unable to apply wrapper promotion: missing marker in ${label}.`);
  }

  return {
    text: `${text.slice(0, index)}${snippet.trimEnd()}\n\n${text.slice(index)}`,
    changed: true
  };
}

export function insertArrayItemBeforeClosing(text, { closingMarker, itemSnippet, presenceCheck = itemSnippet, label }) {
  if (text.includes(presenceCheck)) {
    return { text, changed: false };
  }

  const index = text.lastIndexOf(closingMarker);
  if (index === -1) {
    throw new Error(`Unable to apply wrapper promotion: missing array closing marker in ${label}.`);
  }

  const before = text.slice(0, index);
  const separator = before.trimEnd().endsWith("[") ? "" : ",";
  return {
    text: `${before}${separator}\n${itemSnippet.trimEnd()}\n${text.slice(index)}`,
    changed: true
  };
}

export function insertSelectionCommand(text, commandName) {
  const quotedCommand = `"${commandName}"`;
  if (text.includes(quotedCommand)) {
    return { text, changed: false };
  }

  const marker = `"tool-capture-session"`;
  if (!text.includes(marker)) {
    throw new Error("Unable to apply wrapper promotion: missing tool-capture-session marker in src/selection/cli.mjs.");
  }

  return {
    text: text.replace(marker, `${quotedCommand}, ${marker}`),
    changed: true
  };
}

export function appendSnippetIfMissing(text, { snippet, presenceCheck = snippet }) {
  if (text.includes(presenceCheck)) {
    return { text, changed: false };
  }

  const trimmed = text.trimEnd();
  return {
    text: `${trimmed}\n\n${snippet.trimEnd()}\n`,
    changed: true
  };
}
