/**
 * 组件知识校验脚本
 * 功能：检查组件注册表和页面配方的完整性和正确性
 */

// 导入必要的模块
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";

// 获取项目根目录路径
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 组件知识根目录路径
const knowledgeRoot = path.join(
  root,
  "skills",
  "foundation",
  "power-component-library",
  "references",
  "generated"
);
// 组件注册表文件路径
const registryPath = path.join(knowledgeRoot, "component-registry.json");
// 页面配方目录路径
const recipesDir = path.join(knowledgeRoot, "page-recipes");

/**
 * 失败处理函数
 * @param {string} message - 错误信息
 * 功能：打印错误信息并设置退出码为 1
 */
function fail(message) {
  console.error(`[check-component-knowledge] ${message}`);
  process.exitCode = 1;
}

/**
 * 断言字符串数组
 * @param {any} value - 要检查的值
 * @param {string} fieldPath - 字段路径
 * 功能：检查值是否为非空字符串数组
 */
function assertStringArray(value, fieldPath) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    fail(`${fieldPath} must be a non-empty string array`);
  }
}

/**
 * 检查组件注册表文件是否存在
 */
if (!fs.existsSync(registryPath)) {
  fail("missing component-registry.json");
  process.exit(process.exitCode || 1);
}

/**
 * 检查页面配方目录是否存在
 */
if (!fs.existsSync(recipesDir)) {
  fail("missing page-recipes directory");
  process.exit(process.exitCode || 1);
}

// 读取组件注册表
const registry = readJson(registryPath);

/**
 * 检查组件注册表版本
 */
if (registry.schemaVersion !== 1) {
  fail(`component-registry.schemaVersion must be 1, got ${registry.schemaVersion}`);
}

/**
 * 检查组件数组是否存在且非空
 */
if (!Array.isArray(registry.components) || registry.components.length === 0) {
  fail("component-registry.json must contain a non-empty components array");
}

// 存储组件名称的集合
const componentNames = new Set();
// 存储已知名称（组件名称和别名）的集合
const knownNames = new Set();

/**
 * 检查每个组件的完整性
 */
for (const component of registry.components) {
  // 检查组件名称
  if (!component?.name || typeof component.name !== "string") {
    fail("component entry missing name");
    continue;
  }

  // 检查组件名称是否重复
  if (componentNames.has(component.name)) {
    fail(`duplicate component name: ${component.name}`);
  }
  componentNames.add(component.name);
  knownNames.add(component.name);

  // 检查必填字段
  for (const field of ["displayName", "category", "status", "description", "guidePath"]) {
    if (typeof component[field] !== "string" || component[field].trim() === "") {
      fail(`component ${component.name} missing required field: ${field}`);
    }
  }

  // 检查字符串数组字段
  assertStringArray(component.aliases, `components.${component.name}.aliases`);
  assertStringArray(component.recommendedScenarios, `components.${component.name}.recommendedScenarios`);
  assertStringArray(component.antiPatterns, `components.${component.name}.antiPatterns`);

  // 检查导入配置
  if (!Array.isArray(component.imports) || component.imports.length === 0) {
    fail(`component ${component.name} must define imports`);
  }

  // 检查引用配置
  if (!component.references || typeof component.references !== "object") {
    fail(`component ${component.name} must define references`);
  }

  // 检查合约配置
  if (!component.contract || typeof component.contract !== "object") {
    fail(`component ${component.name} must define contract`);
  } else {
    assertStringArray(component.contract.props || [], `components.${component.name}.contract.props`);
    assertStringArray(component.contract.events || [], `components.${component.name}.contract.events`);
    assertStringArray(component.contract.slots || [], `components.${component.name}.contract.slots`);
    assertStringArray(component.contract.expose || [], `components.${component.name}.contract.expose`);
  }

  // 检查指南文件是否存在
  const guideAbsolutePath = path.join(root, component.guidePath);
  if (!fs.existsSync(guideAbsolutePath)) {
    fail(`guidePath does not exist for ${component.name}: ${component.guidePath}`);
  }

  // 检查别名是否重复
  for (const alias of component.aliases || []) {
    if (knownNames.has(alias)) {
      fail(`duplicate alias or alias conflicts with component name: ${alias}`);
      continue;
    }
    knownNames.add(alias);
  }
}

/**
 * 检查每个别名的完整性
 */
for (const alias of registry.aliases || []) {
  // 检查别名名称
  if (!alias?.name || typeof alias.name !== "string") {
    fail("alias entry missing name");
    continue;
  }

  // 检查别名是否重复
  if (knownNames.has(alias.name)) {
    fail(`duplicate alias name: ${alias.name}`);
  } else {
    knownNames.add(alias.name);
  }

  // 检查别名状态
  if (!["resolved", "candidate", "unresolved"].includes(alias.status)) {
    fail(`invalid alias status for ${alias.name}: ${alias.status}`);
  }

  // 检查未解析别名的候选组件
  if (alias.status !== "resolved") {
    if (!Array.isArray(alias.candidates) || alias.candidates.length === 0) {
      fail(`alias ${alias.name} must declare candidates when unresolved or candidate`);
    } else {
      for (const candidate of alias.candidates) {
        if (!componentNames.has(candidate)) {
          fail(`alias ${alias.name} references unknown candidate: ${candidate}`);
        }
      }
    }
  }
}

/**
 * 检查每个页面配方的完整性
 */
for (const entry of fs.readdirSync(recipesDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
  const recipe = readJson(path.join(recipesDir, entry.name));

  // 检查必填字段
  for (const field of ["name", "displayName", "primarySkill"]) {
    if (typeof recipe[field] !== "string" || recipe[field].trim() === "") {
      fail(`${entry.name} missing required field: ${field}`);
    }
  }

  // 检查字符串数组字段
  assertStringArray(recipe.intents || [], `${entry.name}.intents`);
  assertStringArray(recipe.secondarySkills || [], `${entry.name}.secondarySkills`);
  assertStringArray(recipe.aliasNotes || [], `${entry.name}.aliasNotes`);
  assertStringArray(recipe.interactionContracts || [], `${entry.name}.interactionContracts`);
  assertStringArray(recipe.prohibitedPatterns || [], `${entry.name}.prohibitedPatterns`);
  assertStringArray(recipe.validationAssertions || [], `${entry.name}.validationAssertions`);

  // 检查组件栈
  if (!recipe.componentStack || typeof recipe.componentStack !== "object") {
    fail(`${entry.name} must define componentStack`);
    continue;
  }

  // 检查组件栈中的组件引用
  for (const [slotName, componentName] of Object.entries(recipe.componentStack)) {
    if (typeof componentName !== "string" || componentName.trim() === "") {
      fail(`${entry.name}.componentStack.${slotName} must be a non-empty string`);
      continue;
    }
    if (!knownNames.has(componentName)) {
      fail(`${entry.name}.componentStack.${slotName} references unknown component: ${componentName}`);
    }
  }
}

/**
 * 检查是否有错误
 * 如果存在错误（exitCode 不为 0），则退出进程
 */
if (process.exitCode) {
  process.exit(process.exitCode);
}

// 组件知识检查通过
console.log("component knowledge check passed");
