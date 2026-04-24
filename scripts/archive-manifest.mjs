/**
 * manifest 目录归档脚本
 * 
 * 功能：将历史版本的运行时产物按版本号归档到子目录，保持 manifest 根目录整洁
 * 
 * 归档策略：
 * - release-notes 按主版本号归档（v0.x, v1.0.x, v1.1.x, v1.2.x, v1.3.x, v1.4.x）
 * - 运行时产物（notifications、impact-tasks）按日期归档
 * - 保留当前版本文件在根目录
 */

import fs from "node:fs";
import path from "node:path";

const manifestRoot = path.resolve("manifest");

// 获取所有 release-notes 文件
function getReleaseNotesFiles() {
  const files = fs.readdirSync(manifestRoot);
  return files
    .filter((f) => f.startsWith("release-notes-") && f.endsWith(".md"))
    .map((f) => {
      // 提取版本号，例如 release-notes-1.4.7.md -> 1.4.7
      const version = f.replace("release-notes-", "").replace(".md", "");
      return { filename: f, version, fullPath: path.join(manifestRoot, f) };
    });
}

// 根据版本号确定归档目录
function getArchiveDir(version) {
  const [major, minor] = version.split(".").map(Number);
  
  // v0.x 统一归档
  if (major === 0) return "archive/v0.x";
  
  // v1.0.x - v1.4.x 分别归档
  if (major === 1) {
    return `archive/v1.${minor}.x`;
  }
  
  // 其他版本按主版本归档
  return `archive/v${major}.x`;
}

// 移动文件到归档目录
function archiveFile(fileInfo) {
  const archiveDir = getArchiveDir(fileInfo.version);
  const targetDir = path.join(manifestRoot, archiveDir);
  
  // 确保归档目录存在
  fs.mkdirSync(targetDir, { recursive: true });
  
  const targetPath = path.join(targetDir, fileInfo.filename);
  fs.renameSync(fileInfo.fullPath, targetPath);
  
  console.log(`  ✓ 归档: ${fileInfo.filename} -> ${archiveDir}/`);
}

// 执行归档
function main() {
  console.log("📦 开始归档 manifest 目录...\n");
  
  const releaseNotes = getReleaseNotesFiles();
  console.log(`找到 ${releaseNotes.length} 个 release-notes 文件`);
  
  // 只保留最新版本在根目录
  const sorted = releaseNotes.sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.version.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.version.split(".").map(Number);
    
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  });
  
  const latest = sorted[sorted.length - 1];
  const toArchive = sorted.filter((f) => f.version !== latest.version);
  
  console.log(`保留最新版本: ${latest.version}`);
  console.log(`归档 ${toArchive.length} 个历史版本:\n`);
  
  toArchive.forEach(archiveFile);
  
  // 归档历史 notifications
  const notificationsDir = path.join(manifestRoot, "notifications");
  const archiveNotificationsDir = path.join(manifestRoot, "archive/notifications");
  
  if (fs.existsSync(notificationsDir) && fs.existsSync(archiveNotificationsDir)) {
    const oldNotifications = fs.readdirSync(notificationsDir)
      .filter((f) => f.includes("20260422-14") || f.includes("20260422-15"));
    
    if (oldNotifications.length > 0) {
      console.log(`\n📦 归档 ${oldNotifications.length} 个历史通知文件...`);
      oldNotifications.forEach((f) => {
        const src = path.join(notificationsDir, f);
        const dest = path.join(archiveNotificationsDir, f);
        fs.renameSync(src, dest);
        console.log(`  ✓ 归档: notifications/${f}`);
      });
    }
  }
  
  // 归档历史 impact-tasks
  const impactTasksDir = path.join(manifestRoot, "impact-tasks");
  const archiveImpactTasksDir = path.join(manifestRoot, "archive/impact-tasks");
  
  if (fs.existsSync(impactTasksDir) && fs.existsSync(archiveImpactTasksDir)) {
    const oldImpactTasks = fs.readdirSync(impactTasksDir)
      .filter((f) => f.startsWith("impact-task-20260422-14") || f.startsWith("impact-task-20260422-15"));
    
    if (oldImpactTasks.length > 0) {
      console.log(`\n📦 归档 ${oldImpactTasks.length} 个历史影响任务文件...`);
      oldImpactTasks.forEach((f) => {
        const src = path.join(impactTasksDir, f);
        const dest = path.join(archiveImpactTasksDir, f);
        fs.renameSync(src, dest);
        console.log(`  ✓ 归档: impact-tasks/${f}`);
      });
    }
  }
  
  console.log("\n✅ manifest 目录归档完成！\n");
  
  // 输出归档后的目录结构
  console.log("📁 当前 manifest 目录结构：");
  printDirectoryStructure(manifestRoot, 0);
}

// 打印目录结构
function printDirectoryStructure(dir, indent) {
  const indentStr = "  ".repeat(indent);
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  items.forEach((item) => {
    // 跳过 .npmignore
    if (item.name === ".npmignore") return;
    
    if (item.isDirectory()) {
      console.log(`${indentStr}📂 ${item.name}/`);
      printDirectoryStructure(path.join(dir, item.name), indent + 1);
    } else {
      console.log(`${indentStr}📄 ${item.name}`);
    }
  });
}

main();
