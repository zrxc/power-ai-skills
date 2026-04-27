export function toUniqueSortedList(values) {
  return [...new Set((values || []).filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
}
