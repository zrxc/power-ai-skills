import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const options = {
    manifestRoot: path.resolve("manifest"),
    runtimeRoot: path.resolve(".power-ai"),
    json: false
  };

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--manifest-root") {
      options.manifestRoot = path.resolve(argv[index + 1] || "manifest");
      index++;
      continue;
    }

    if (token === "--runtime-root") {
      options.runtimeRoot = path.resolve(argv[index + 1] || ".power-ai");
      index++;
      continue;
    }

    if (token === "--json") {
      options.json = true;
    }
  }

  return options;
}

function removeMatchingFiles(dirPath, pattern) {
  if (!fs.existsSync(dirPath)) return [];

  const removed = [];
  for (const fileName of fs.readdirSync(dirPath)) {
    if (!pattern.test(fileName)) continue;
    const filePath = path.join(dirPath, fileName);
    fs.rmSync(filePath, { force: true });
    removed.push(filePath);
  }

  return removed;
}

function removeFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return false;
  fs.rmSync(filePath, { force: true });
  return true;
}

function pruneEmptyDirectories(rootDir) {
  if (!fs.existsSync(rootDir)) return [];

  const removed = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      walk(path.join(currentDir, entry.name));
    }

    if (currentDir === rootDir) return;
    if (fs.readdirSync(currentDir).length > 0) return;

    fs.rmdirSync(currentDir);
    removed.push(currentDir);
  }

  walk(rootDir);
  return removed.sort((left, right) => left.localeCompare(right, "en"));
}

function buildSummary({ manifestRoot, runtimeRoot }) {
  const notificationsDir = path.join(manifestRoot, "notifications");
  const impactTasksDir = path.join(manifestRoot, "impact-tasks");
  const archiveNotificationsDir = path.join(manifestRoot, "archive", "notifications");
  const changedFilesPath = path.join(manifestRoot, "changed-files.txt");

  const removedNotificationPayloads = removeMatchingFiles(notificationsDir, /^upgrade-payload-/);
  const removedImpactTasks = removeMatchingFiles(impactTasksDir, /^impact-task-/);
  const removedArchivedNotificationPayloads = removeMatchingFiles(archiveNotificationsDir, /^upgrade-payload-/);
  const removedChangedFiles = removeFileIfExists(changedFilesPath) ? [changedFilesPath] : [];
  const removedEmptyRuntimeDirectories = pruneEmptyDirectories(runtimeRoot);

  return {
    ok: true,
    manifestRoot,
    runtimeRoot,
    removed: {
      notifications: removedNotificationPayloads,
      impactTasks: removedImpactTasks,
      changedFiles: removedChangedFiles,
      archivedNotifications: removedArchivedNotificationPayloads,
      emptyRuntimeDirectories: removedEmptyRuntimeDirectories
    },
    totals: {
      notifications: removedNotificationPayloads.length,
      impactTasks: removedImpactTasks.length,
      changedFiles: removedChangedFiles.length,
      archivedNotifications: removedArchivedNotificationPayloads.length,
      emptyRuntimeDirectories: removedEmptyRuntimeDirectories.length,
      total:
        removedNotificationPayloads.length +
        removedImpactTasks.length +
        removedChangedFiles.length +
        removedArchivedNotificationPayloads.length +
        removedEmptyRuntimeDirectories.length
    }
  };
}

function formatPath(baseDir, targetPath) {
  return path.relative(baseDir, targetPath) || ".";
}

function printHumanSummary(summary) {
  console.log("Cleaning runtime artifacts...");
  console.log(`manifest root: ${summary.manifestRoot}`);
  console.log(`runtime root: ${summary.runtimeRoot}`);

  const sections = [
    ["notifications", summary.removed.notifications, summary.manifestRoot],
    ["impact tasks", summary.removed.impactTasks, summary.manifestRoot],
    ["changed files", summary.removed.changedFiles, summary.manifestRoot],
    ["archived notifications", summary.removed.archivedNotifications, summary.manifestRoot],
    ["empty runtime directories", summary.removed.emptyRuntimeDirectories, summary.runtimeRoot]
  ];

  for (const [label, entries, baseDir] of sections) {
    console.log(`- ${label}: ${entries.length}`);
    for (const entry of entries) {
      console.log(`  removed ${formatPath(baseDir, entry)}`);
    }
  }

  console.log(`Total removed: ${summary.totals.total}`);
}

const options = parseArgs(process.argv.slice(2));
const summary = buildSummary(options);

if (options.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printHumanSummary(summary);
}
