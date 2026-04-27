function findPatternFrequency(patterns, type) {
  return patterns.find((pattern) => pattern.type === type)?.frequency || 0;
}

export function buildProjectPagePatternSummary(patterns) {
  return {
    basicListPage: findPatternFrequency(patterns, "basic-list-page"),
    treeListPage: findPatternFrequency(patterns, "tree-list-page"),
    detailPage: findPatternFrequency(patterns, "detail-page"),
    dialogFormCrud: findPatternFrequency(patterns, "dialog-form")
  };
}
