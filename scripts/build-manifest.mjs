/**
 * 构建技能清单文件
 * 功能：扫描所有技能目录，读取技能元数据，生成完整的技能清单
 */

// 导入必要的模块
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findSkillDirectories, readJson, writeJson } from "./shared.mjs";

// 获取项目根目录
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 技能目录路径
const skillsRoot = path.join(root, "skills");
// 技能清单文件路径
const manifestPath = path.join(root, "manifest", "skills-manifest.json");
const packageJsonPath = path.join(root, "package.json");
const packageJson = readJson(packageJsonPath);

// 存储技能信息的数组
const skills = [];

/**
 * 扫描技能目录并读取元数据
 * 遍历所有技能目录，读取每个技能的 meta.json 文件
 */
for (const skillDir of findSkillDirectories(skillsRoot)) {
  // 技能元数据文件路径
  const metaPath = path.join(skillDir, "skill.meta.json");
  // 读取元数据
  const meta = readJson(metaPath);
  // 添加技能信息到数组，包含相对路径
  skills.push({
    ...meta,
    skillPath: path.relative(skillsRoot, skillDir).replaceAll("\\", "/")
  });
}

/**
 * 按技能名称排序
 * 使用中文 locale 进行排序，确保排序结果符合中文习惯
 */
skills.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

/**
 * 生成技能清单文件
 * 包含包名、版本号、生成时间和技能列表
 */
writeJson(manifestPath, {
  packageName: packageJson.name,              // 包名
  version: packageJson.version,               // 版本号
  generatedAt: new Date().toISOString(),      // 生成时间
  skills                                     // 技能列表
});

// 输出成功信息
console.log(`已生成 manifest: ${manifestPath}`);
