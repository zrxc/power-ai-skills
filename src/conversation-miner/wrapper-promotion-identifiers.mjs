export function sanitizeWrapperToolName(toolName) {
  return String(toolName || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function toCamelCase(value) {
  const normalized = sanitizeWrapperToolName(value);
  const parts = normalized.split(/[-_.]+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts[0] + parts.slice(1).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}
