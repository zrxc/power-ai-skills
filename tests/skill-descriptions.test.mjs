import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { checkSkillDescriptions } from "../scripts/check-skill-descriptions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredCopies = [
  "skills/orchestration/entry-skill/SKILL.md",
  "skills/foundation/power-component-library/SKILL.md",
  "skills/foundation/power-foundation-app/SKILL.md",
  "skills/foundation/project-structure-skill/SKILL.md"
];

function createTempSkillRepo(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-descriptions-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  for (const relativePath of requiredCopies) {
    const sourcePath = path.join(root, relativePath);
    const targetPath = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }

  return tempRoot;
}

test("check-skill-descriptions passes for the current focus skill set", (t) => {
  const tempRoot = createTempSkillRepo(t);
  const result = checkSkillDescriptions({ rootDir: tempRoot });
  assert.equal(result.ok, true, result.warnings.map((item) => `${item.skillName}:${item.code}`).join("\n"));
  assert.deepEqual(result.warnings, []);
});

test("check-skill-descriptions warns when description degrades into a short summary", (t) => {
  const tempRoot = createTempSkillRepo(t);
  const skillPath = path.join(tempRoot, "skills", "foundation", "power-component-library", "SKILL.md");
  const currentDoc = fs.readFileSync(skillPath, "utf8");
  fs.writeFileSync(
    skillPath,
    currentDoc.replace(
      /description: ".*"/,
      'description: "企业组件库说明。"'
    ),
    "utf8"
  );

  const result = checkSkillDescriptions({ rootDir: tempRoot });
  assert.equal(result.ok, false);
  assert.equal(
    result.warnings.some((item) => item.skillName === "power-component-library" && item.code === "missing-trigger-cue"),
    true
  );
  assert.equal(
    result.warnings.some((item) => item.skillName === "power-component-library" && item.code === "description-too-short"),
    true
  );
});

test("check-skill-descriptions warns when switch boundaries are missing", (t) => {
  const tempRoot = createTempSkillRepo(t);
  const skillPath = path.join(tempRoot, "skills", "foundation", "project-structure-skill", "SKILL.md");
  const currentDoc = fs.readFileSync(skillPath, "utf8");
  fs.writeFileSync(
    skillPath,
    currentDoc.replace(/##\s*何时切换到其他技能[\s\S]*?##\s*注意事项/u, "## 注意事项"),
    "utf8"
  );

  const result = checkSkillDescriptions({ rootDir: tempRoot });
  assert.equal(result.ok, false);
  assert.equal(
    result.warnings.some((item) => item.skillName === "project-structure-skill" && item.code === "missing-switch-boundary"),
    true
  );
});
