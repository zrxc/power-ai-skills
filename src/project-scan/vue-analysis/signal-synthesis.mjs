import { hasAnySetValue } from "./shared.mjs";

export function buildScriptSignals(scriptState, templateState) {
  const values = new Set([
    ...scriptState.identifiers,
    ...scriptState.memberPaths,
    ...scriptState.stringLiterals,
    ...templateState.dialogEventNames
  ]);

  return {
    hasSearchForm: hasAnySetValue(values, ["searchForm", "searchList", "onSearch", "handleSearch", "queryParams", "resetSearch"]),
    hasCrudAction: hasAnySetValue(values, ["handleAdd", "onAdd", "handleEdit", "onEdit", "handleDelete", "onDelete", "settingAction", "removeById", "deleteById", "actionBtnsAction"]),
    hasFormModel: templateState.hasEditableForm || hasAnySetValue(values, ["formModel", "ruleForm", "formState", "formData", "dialogVal", "FormInstance"]),
    hasSubmitAction: hasAnySetValue(values, ["handleSubmit", "onSubmit", "submitForm", "saveForm", "confirmSubmit", "submit", "onSave", "on-confirm"]),
    hasTreeRefresh: hasAnySetValue(values, ["handleNodeClick", "onNodeClick", "currentNode", "fetchTree", "loadTree", "selectedTreeNodeId"]),
    hasDetailLoad: hasAnySetValue(values, ["fetchDetail", "getDetail", "loadDetail", "queryDetail", "detailInfo", "detailData", "getDetailItem"]),
    hasPaging: hasAnySetValue(values, ["pageValue", "pageNum", "pageSize", "handlePageChange", "pageChange", "total"]),
    hasListFetch: hasAnySetValue(values, ["getList", "fetchList", "loadList", "queryList", "tableData.value.loading", "tableData.loading"])
  };
}
