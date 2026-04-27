import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCommandDefinitions } from "../src/commands/registry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultTargetPath = path.join(root, "docs", "command-manual.md");
const startMarker = "<!-- GENERATED:COMMAND_REGISTRY:START -->";
const endMarker = "<!-- GENERATED:COMMAND_REGISTRY:END -->";
const insertBeforeHeading = "## 仓库命令";

function parseArgs(argv) {
  const options = {
    check: false,
    targetPath: defaultTargetPath
  };

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--check") {
      options.check = true;
      continue;
    }

    if (token === "--target") {
      options.targetPath = path.resolve(argv[index + 1] || defaultTargetPath);
      index++;
    }
  }

  return options;
}

function formatCommandTable(commandDefinitions) {
  const lines = [
    "| Command | Handler | Project Root Strategy |",
    "| --- | --- | --- |"
  ];

  for (const definition of commandDefinitions) {
    lines.push(`| \`${definition.name}\` | \`${definition.method}\` | \`${definition.projectRootStrategy}\` |`);
  }

  return lines.join("\n");
}

function buildGeneratedSection() {
  const commandDefinitions = listCommandDefinitions();
  const infoCommands = commandDefinitions.filter((definition) => definition.scope === "info");
  const projectCommands = commandDefinitions.filter((definition) => definition.scope === "project");

  return [
    startMarker,
    "## 注册表命令清单",
    "",
    "> 此片段由 `node ./scripts/generate-command-registry-doc.mjs` 自动生成，请不要手工修改。",
    "> 它用于保证命令手册和 `src/commands/registry.mjs` 保持一致；下面的章节仍负责参数说明和典型示例。",
    "",
    "### project root strategy 对照",
    "",
    "- `cwd`：始终以当前工作目录作为 project root。",
    "- `first-positional-or-cwd`：优先使用第一个位置参数，否则退回当前工作目录。",
    "- `init-target-or-cwd`：优先使用 `init` / `add-tool` / `remove-tool` 的目标目录参数，否则退回当前工作目录。",
    "",
    `### info 命令（${infoCommands.length}）`,
    "",
    formatCommandTable(infoCommands),
    "",
    `### project 命令（${projectCommands.length}）`,
    "",
    formatCommandTable(projectCommands),
    endMarker
  ].join("\n");
}

function upsertGeneratedSection(documentContent, generatedSection) {
  if (documentContent.includes(startMarker) && documentContent.includes(endMarker)) {
    const pattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
    return documentContent.replace(pattern, generatedSection);
  }

  if (!documentContent.includes(insertBeforeHeading)) {
    throw new Error(`command manual is missing insertion anchor: ${insertBeforeHeading}`);
  }

  return documentContent.replace(insertBeforeHeading, `${generatedSection}\n\n${insertBeforeHeading}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const currentContent = fs.readFileSync(options.targetPath, "utf8");
  const nextContent = upsertGeneratedSection(currentContent, buildGeneratedSection());

  if (options.check) {
    if (currentContent !== nextContent) {
      console.error("[generate-command-registry-doc] docs/command-manual.md is out of date. Run: node ./scripts/generate-command-registry-doc.mjs");
      process.exit(1);
    }

    console.log("command-manual registry section is up to date");
    return;
  }

  fs.writeFileSync(options.targetPath, nextContent, "utf8");
  console.log(`updated ${path.relative(root, options.targetPath)}`);
}

main();
