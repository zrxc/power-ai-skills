/**
 * 清理运行时产物脚本
 * 
 * 功能：清理 manifest 目录中按 .gitignore 应被忽略的运行时产物
 * 这些文件由脚本动态生成，不需要持久化在仓库中
 */

import fs from "node:fs";
import path from "node:path";

const manifestRoot = path.resolve("manifest");

function cleanDir(dirPath, pattern) {
  if (!fs.existsSync(dirPath)) return 0;
  
  const files = fs.readdirSync(dirPath);
  let count = 0;
  
  files.forEach((file) => {
    if (pattern.test(file)) {
      const filePath = path.join(dirPath, file);
      fs.rmSync(filePath, { force: true });
      console.log(`  ✓ 删除: ${path.relative(manifestRoot, filePath)}`);
      count++;
    }
  });
  
  return count;
}

function main() {
  console.log("🧹 开始清理运行时产物...\n");
  
  let total = 0;
  
  // 清理 notifications 中的历史文件（保留 .npmignore）
  const notificationsDir = path.join(manifestRoot, "notifications");
  total += cleanDir(notificationsDir, /^upgrade-payload-/);
  
  // 清理 impact-tasks 中的历史文件（保留 .npmignore）
  const impactTasksDir = path.join(manifestRoot, "impact-tasks");
  total += cleanDir(impactTasksDir, /^impact-task-/);
  
  // 清理 changed-files.txt
  const changedFiles = path.join(manifestRoot, "changed-files.txt");
  if (fs.existsSync(changedFiles)) {
    fs.rmSync(changedFiles, { force: true });
    console.log("  ✓ 删除: changed-files.txt");
    total++;
  }
  
  // 清理 archive 中的历史通知（已归档的旧文件）
  const archiveNotificationsDir = path.join(manifestRoot, "archive/notifications");
  total += cleanDir(archiveNotificationsDir, /^upgrade-payload-/);
  
  console.log(`\n✅ 清理完成！共删除 ${total} 个文件\n`);
  
  // 输出清理后的目录结构
  console.log("📁 清理后 manifest 目录结构：");
  printDirectoryStructure(manifestRoot, 0);
}

function printDirectoryStructure(dir, indent) {
  if (!fs.existsSync(dir)) return;
  
  const indentStr = "  ".repeat(indent);
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  items.forEach((item) => {
    if (item.isDirectory()) {
      console.log(`${indentStr}📂 ${item.name}/`);
      printDirectoryStructure(path.join(dir, item.name), indent + 1);
    } else {
      console.log(`${indentStr}📄 ${item.name}`);
    }
  });
}

main();
