/**
 * 文档治理校验脚本
 * 目标：
 * 1. 确保关键文档和模板存在；
 * 2. 防止仓库在升级后仍残留旧包名；
 * 3. 保证入口规则、兼容矩阵、CI 接入说明和上游流水线说明不会丢失。
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { summarizeSpawnFailure } from "./shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredDocs = [
  "README.md",
  "CHANGELOG.md",
  "docs/maintenance-guide.md",
  "docs/ci-integration.md",
  "docs/upstream-pipeline-integration.md",
  "docs/component-upgrade-flow.md",
  "docs/compatibility-matrix.md",
  "docs/release-process.md",
  "docs/skill-expansion-guide.md",
  "docs/governance.md",
  "docs/versioning-policy.md",
  "docs/architecture-0.9.0.md",
  "docs/component-knowledge-plan.md",
  "docs/troubleshooting-consumer.md",
  "docs/doctor-error-codes.md",
  "docs/tool-adapters.md",
  "docs/command-manual.md",
  "config/tool-registry.json",
  "config/team-defaults.json",
  "config/template-registry.json",
  "config/schemas/tool-registry.schema.json",
  "config/schemas/team-defaults.schema.json",
  "config/schemas/template-registry.schema.json",
  "templates/project/shared/AGENTS.md",
  "templates/project/shared/CLAUDE.md",
  "templates/project/shared/GEMINI.md",
  "templates/project/shared/CONVENTIONS.md",
  "templates/project/shared/aider.conf.yml",
  "templates/project/adapters/cursor/skills.mdc",
  "templates/project/adapters/cline/01-power-ai.md",
  "templates/project/adapters/windsurf/01-power-ai.md",
  "templates/ci/gitlab-ci.yml",
  "templates/ci/upstream-gitlab-ci.yml",
  "skills/orchestration/entry-skill/references/aliases.md",
  "skills/orchestration/entry-skill/references/comment-rules.md"
];

const filesToScan = [
  "README.md",
  "docs/maintenance-guide.md",
  "docs/ci-integration.md",
  "docs/upstream-pipeline-integration.md",
  "docs/component-upgrade-flow.md",
  "docs/compatibility-matrix.md",
  "docs/release-process.md",
  "docs/skill-expansion-guide.md",
  "docs/governance.md",
  "docs/versioning-policy.md",
  "docs/architecture-0.9.0.md",
  "docs/component-knowledge-plan.md",
  "docs/troubleshooting-consumer.md",
  "docs/doctor-error-codes.md",
  "docs/tool-adapters.md",
  "docs/command-manual.md",
  "config/tool-registry.json",
  "config/team-defaults.json",
  "templates/project/shared/AGENTS.md",
  "templates/project/shared/CLAUDE.md",
  "templates/project/shared/GEMINI.md",
  "templates/project/shared/CONVENTIONS.md",
  "templates/project/adapters/cursor/skills.mdc",
  "templates/project/adapters/cline/01-power-ai.md",
  "templates/project/adapters/windsurf/01-power-ai.md"
];

function fail(message) {
  console.error(`[check-docs] ${message}`);
  process.exitCode = 1;
}

for (const relativePath of requiredDocs) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`缺少关键文档：${relativePath}`);
  }
}

for (const relativePath of filesToScan) {
  const absolutePath = path.join(root, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8");

  if (content.includes("@power/frontend-ai-skills")) {
    fail(`${relativePath} 仍然包含旧包名 @power/frontend-ai-skills`);
  }
}

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
for (const docName of [
  "docs/governance.md",
  "docs/versioning-policy.md",
  "CHANGELOG.md",
  "aliases.md",
  "comment-rules.md",
  "compatibility-matrix.md",
  "ci-integration.md",
  "upstream-pipeline-integration.md",
  "architecture-0.9.0.md",
  "component-knowledge-plan.md",
  "troubleshooting-consumer.md",
  "doctor-error-codes.md",
  "tool-adapters.md",
  "command-manual.md"
]) {
  const shortName = docName.replace("docs/", "");
  if (!readme.includes(docName) && !readme.includes(shortName)) {
    fail(`README.md 未提及 ${docName}`);
  }
}

const toolAdaptersCheck = spawnSync(process.execPath, ["./scripts/generate-tool-adapters-doc.mjs", "--check"], {
  cwd: root,
  encoding: "utf8"
});

if (toolAdaptersCheck.status !== 0) {
  fail(summarizeSpawnFailure(toolAdaptersCheck, "tool-adapters 文档校验失败"));
}

const readmeCheck = spawnSync(process.execPath, ["./scripts/generate-readme.mjs", "--check"], {
  cwd: root,
  encoding: "utf8"
});

if (readmeCheck.status !== 0) {
  fail(summarizeSpawnFailure(readmeCheck, "README 文档校验失败"));
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("文档校验通过");
