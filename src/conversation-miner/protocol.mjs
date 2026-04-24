export const SESSION_SUMMARY_START_MARKER = "<<<POWER_AI_SESSION_SUMMARY_V1";
export const SESSION_SUMMARY_END_MARKER = ">>>";

function stripJsonCodeFence(text) {
  const fencedMatch = String(text || "").trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch) return fencedMatch[1].trim();
  return String(text || "").trim();
}

export function extractSessionSummaryBlock(text) {
  const sourceText = String(text || "");
  const startIndex = sourceText.indexOf(SESSION_SUMMARY_START_MARKER);
  if (startIndex < 0) {
    throw new Error(`Missing session summary marker: ${SESSION_SUMMARY_START_MARKER}`);
  }

  const afterStart = sourceText.slice(startIndex + SESSION_SUMMARY_START_MARKER.length);
  const endIndex = afterStart.indexOf(SESSION_SUMMARY_END_MARKER);
  if (endIndex < 0) {
    throw new Error(`Missing session summary end marker: ${SESSION_SUMMARY_END_MARKER}`);
  }

  const blockText = afterStart.slice(0, endIndex).trim();
  if (!blockText) throw new Error("Session summary block was empty.");

  const normalizedJsonText = stripJsonCodeFence(blockText);
  let payload;
  try {
    payload = JSON.parse(normalizedJsonText);
  } catch (error) {
    throw new Error(`Failed to parse session summary block JSON: ${error.message}`);
  }

  return {
    payload,
    markers: {
      start: SESSION_SUMMARY_START_MARKER,
      end: SESSION_SUMMARY_END_MARKER
    },
    rawBlock: blockText,
    normalizedJsonText
  };
}

export function stringifySessionSummaryBlock(payload) {
  return `${SESSION_SUMMARY_START_MARKER}
${JSON.stringify(payload, null, 2)}
${SESSION_SUMMARY_END_MARKER}
`;
}
