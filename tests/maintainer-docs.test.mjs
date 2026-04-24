import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { checkMaintainerDocs } from "../scripts/check-maintainer-docs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredCopies = [
  ".codex/SKILL.md",
  ".codex/rules/project-rules.md",
  ".codex/workflows/update-rules.md",
  ".codex/references/gotchas.md",
  "docs/technical-solutions/skill-based-architecture-adoption.md",
  "docs/command-manual.md",
  "docs/upgrade-roadmap.md",
  "docs/upgrade-roadmap-history.md"
];

function createTempMaintainerRepo(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-maintainer-docs-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  for (const relativePath of requiredCopies) {
    const sourcePath = path.join(root, relativePath);
    const targetPath = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }

  return tempRoot;
}

test("check-maintainer-docs passes for the current maintainer docs layout", (t) => {
  const tempRoot = createTempMaintainerRepo(t);
  const result = checkMaintainerDocs({ rootDir: tempRoot });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
});

test("check-maintainer-docs fails when the router points at a missing document", (t) => {
  const tempRoot = createTempMaintainerRepo(t);
  const routerPath = path.join(tempRoot, ".codex", "SKILL.md");
  const currentRouter = fs.readFileSync(routerPath, "utf8");
  fs.writeFileSync(
    routerPath,
    currentRouter.replace("docs/command-manual.md", "docs/missing-command-manual.md"),
    "utf8"
  );

  const result = checkMaintainerDocs({ rootDir: tempRoot });
  assert.equal(result.ok, false);
  assert.equal(
    result.errors.some((message) => message.includes(".codex/SKILL.md 引用了不存在的文档：docs/missing-command-manual.md")),
    true
  );
});

test("check-maintainer-docs fails when the adoption doc misses required sections", (t) => {
  const tempRoot = createTempMaintainerRepo(t);
  const adoptionPath = path.join(tempRoot, "docs", "technical-solutions", "skill-based-architecture-adoption.md");
  const currentDoc = fs.readFileSync(adoptionPath, "utf8");
  fs.writeFileSync(
    adoptionPath,
    currentDoc.replace("## 10. 非目标", "## 10. 其他说明"),
    "utf8"
  );

  const result = checkMaintainerDocs({ rootDir: tempRoot });
  assert.equal(result.ok, false);
  assert.equal(
    result.errors.some((message) => message.includes("skill-based-architecture-adoption.md 缺少必要章节：## 10. 非目标")),
    true
  );
});
