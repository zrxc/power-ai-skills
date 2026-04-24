/**
 * 技能脚手架生成工具
 * 功能：根据模板创建新的技能目录结构，并替换相关变量
 */

// 导入必要的模块
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyDir, ensureDir } from "./shared.mjs";

// 获取项目根目录
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 技能模板目录
const templateDir = path.join(root, "templates", "skill-template");
// 技能存放目录
const skillsDir = path.join(root, "skills");

// 从命令行参数获取技能名称和分组名称
const skillName = process.argv[2];
const groupName = process.argv[3] || "custom";

/**
 * 检查命令行参数
 * 确保提供了技能名称
 */
if (!skillName) {
  console.error("请传入 skill 名称，例如：node ./scripts/scaffold-skill.mjs permission-page workflow");
  process.exit(1);
}

/**
 * 验证技能名称格式
 * 技能名称只能使用小写字母、数字和连字符
 */
if (!/^[a-z0-9-]+$/.test(skillName)) {
  console.error("skill 名称只能使用小写字母、数字和连字符");
  process.exit(1);
}

/**
 * 验证分组名称格式
 * 分组名称只能使用小写字母、数字和连字符
 */
if (!/^[a-z0-9-]+$/.test(groupName)) {
  console.error("group 名称只能使用小写字母、数字和连字符");
  process.exit(1);
}

// 目标技能目录路径
const targetDir = path.join(skillsDir, groupName, skillName);

/**
 * 检查技能是否已存在
 * 如果技能目录已存在，显示错误信息并退出
 */
if (fs.existsSync(targetDir)) {
  console.error(`skill 已存在：${skillName}`);
  process.exit(1);
}

// 复制模板目录到目标位置
copyDir(templateDir, targetDir);

// 技能相关文件路径
const skillMdPath = path.join(targetDir, "SKILL.md");
const metaPath = path.join(targetDir, "skill.meta.json");
const openaiPath = path.join(targetDir, "agents", "openai.yaml");

/**
 * 文件内容替换函数
 * @param {string} filePath 文件路径
 * @param {string} from 要替换的文本
 * @param {string} to 替换后的文本
 */
const replaceInFile = (filePath, from, to) => {
  const content = fs.readFileSync(filePath, "utf8");
  fs.writeFileSync(filePath, content.replaceAll(from, to), "utf8");
};

// 替换文件中的变量
replaceInFile(skillMdPath, "your-skill-name", skillName);
replaceInFile(openaiPath, "your-skill-name", skillName);
replaceInFile(metaPath, "your-skill-name", skillName);

// 确保 references 目录存在
ensureDir(path.join(targetDir, "references"));

// 输出成功信息
console.log(`已创建 skill：${targetDir}`);
