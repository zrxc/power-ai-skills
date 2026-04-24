export const patternDefinitions = new Map([
  ["basic-list-page", {
    skillName: "basic-list-page-project",
    displayName: "项目级基础列表页",
    baseSkill: "basic-list-page",
    tags: ["project-local", "project-scan", "basic-list-page"],
    description: "在当前项目里生成或修订基础列表页时使用，先沿用企业公共 basic-list-page，再补充当前项目的页面骨架、交互命名和字段组织约定。"
  }],
  ["tree-list-page", {
    skillName: "tree-list-page-project",
    displayName: "项目级左树右表页",
    baseSkill: "tree-list-page",
    tags: ["project-local", "project-scan", "tree-list-page"],
    description: "在当前项目里生成或修订左树右表页面时使用，先沿用企业公共 tree-list-page，再补充当前项目的树节点联动、表格刷新和弹窗处理习惯。"
  }],
  ["dialog-form", {
    skillName: "dialog-form-project",
    displayName: "项目级弹窗表单流程",
    baseSkill: "dialog-skill",
    tags: ["project-local", "project-scan", "dialog-form"],
    description: "在当前项目里生成或修订弹窗表单新增编辑流程时使用，先沿用企业公共 dialog-skill，再补充当前项目的表单模型、提交流转和回刷约定。"
  }],
  ["detail-page", {
    skillName: "detail-page-project",
    displayName: "项目级详情页",
    baseSkill: "detail-page-skill",
    tags: ["project-local", "project-scan", "detail-page"],
    description: "在当前项目里生成或修订详情页时使用，先沿用企业公共 detail-page-skill，再补充当前项目的详情加载、字段展示和只读布局习惯。"
  }]
]);
