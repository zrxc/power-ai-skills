/**
 * 检查基线配置
 * 功能：读取并显示当前项目的基线配置信息
 */

// 导入必要的模块
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./shared.mjs";

// 获取项目根目录
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 基线配置文件路径
const baselinePath = path.join(root, "baseline", "current.json");

/**
 * 检查基线配置文件是否存在
 * 如果文件不存在，输出错误信息并退出进程
 */
if (!fs.existsSync(baselinePath)) {
  console.error("缺少 baseline/current.json");
  process.exit(1);
}

// 读取基线配置
const baseline = readJson(baselinePath);

// 输出基线配置信息
console.log("当前企业前端基线：");
console.log(JSON.stringify(baseline, null, 2));
