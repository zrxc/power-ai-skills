import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "generate-command-registry-doc.mjs");
const sourceManualPath = path.join(root, "docs", "command-manual.md");

test("generate-command-registry-doc keeps command-manual registry section in sync", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-command-manual-doc-"));
  const tempManualPath = path.join(tempRoot, "command-manual.md");
  fs.copyFileSync(sourceManualPath, tempManualPath);
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const checkResult = spawnSync(
    process.execPath,
    [scriptPath, "--target", tempManualPath],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
  assert.equal(checkResult.status, 0, checkResult.stderr);

  const syncedCheckResult = spawnSync(
    process.execPath,
    [scriptPath, "--check", "--target", tempManualPath],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
  assert.equal(syncedCheckResult.status, 0, syncedCheckResult.stderr);

  const originalContent = fs.readFileSync(tempManualPath, "utf8");
  const driftedContent = originalContent.replace("`doctorCommand`", "`doctorCommand-drifted`");
  fs.writeFileSync(tempManualPath, driftedContent, "utf8");

  const driftCheckResult = spawnSync(
    process.execPath,
    [scriptPath, "--check", "--target", tempManualPath],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
  assert.equal(driftCheckResult.status, 1);
  assert.equal(driftCheckResult.stderr.includes("out of date"), true);

  const repairResult = spawnSync(
    process.execPath,
    [scriptPath, "--target", tempManualPath],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
  assert.equal(repairResult.status, 0, repairResult.stderr);

  const repairedCheckResult = spawnSync(
    process.execPath,
    [scriptPath, "--check", "--target", tempManualPath],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
  assert.equal(repairedCheckResult.status, 0, repairedCheckResult.stderr);
});
