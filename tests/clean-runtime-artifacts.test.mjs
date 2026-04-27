import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "clean-runtime-artifacts.mjs");

test("clean-runtime-artifacts removes ignored manifest payloads and prunes empty runtime directories", (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-clean-runtime-"));
  const manifestRoot = path.join(tempRoot, "manifest");
  const runtimeRoot = path.join(tempRoot, ".power-ai");
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  fs.mkdirSync(path.join(manifestRoot, "notifications"), { recursive: true });
  fs.mkdirSync(path.join(manifestRoot, "impact-tasks"), { recursive: true });
  fs.mkdirSync(path.join(manifestRoot, "archive", "notifications"), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, "context"), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, "auto-capture", "failed"), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, "notifications"), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, "skills"), { recursive: true });
  fs.mkdirSync(path.join(runtimeRoot, "shared"), { recursive: true });

  fs.writeFileSync(path.join(manifestRoot, "notifications", ".npmignore"), "", "utf8");
  fs.writeFileSync(path.join(manifestRoot, "impact-tasks", ".npmignore"), "", "utf8");
  fs.writeFileSync(path.join(manifestRoot, "notifications", "upgrade-payload-20260424-010101.json"), "{}", "utf8");
  fs.writeFileSync(path.join(manifestRoot, "notifications", "upgrade-payload-20260424-010101.md"), "# payload\n", "utf8");
  fs.writeFileSync(path.join(manifestRoot, "impact-tasks", "impact-task-20260424-010101.md"), "# task\n", "utf8");
  fs.writeFileSync(path.join(manifestRoot, "archive", "notifications", "upgrade-payload-20260401-010101.json"), "{}", "utf8");
  fs.writeFileSync(path.join(manifestRoot, "archive", "notifications", "upgrade-payload-20260401-010101.md"), "# archived\n", "utf8");
  fs.writeFileSync(path.join(manifestRoot, "changed-files.txt"), "src/index.mjs\n", "utf8");
  fs.writeFileSync(path.join(runtimeRoot, "notifications", "README.md"), "keep\n", "utf8");

  const result = spawnSync(
    process.execPath,
    [
      scriptPath,
      "--manifest-root", manifestRoot,
      "--runtime-root", runtimeRoot,
      "--json"
    ],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, true);
  assert.equal(payload.totals.notifications, 2);
  assert.equal(payload.totals.impactTasks, 1);
  assert.equal(payload.totals.changedFiles, 1);
  assert.equal(payload.totals.archivedNotifications, 2);
  assert.equal(payload.totals.emptyRuntimeDirectories, 3);

  assert.equal(fs.existsSync(path.join(manifestRoot, "notifications", ".npmignore")), true);
  assert.equal(fs.existsSync(path.join(manifestRoot, "impact-tasks", ".npmignore")), true);
  assert.equal(fs.existsSync(path.join(manifestRoot, "notifications", "upgrade-payload-20260424-010101.json")), false);
  assert.equal(fs.existsSync(path.join(manifestRoot, "impact-tasks", "impact-task-20260424-010101.md")), false);
  assert.equal(fs.existsSync(path.join(manifestRoot, "changed-files.txt")), false);
  assert.equal(fs.existsSync(path.join(runtimeRoot, "context")), false);
  assert.equal(fs.existsSync(path.join(runtimeRoot, "auto-capture", "failed")), false);
  assert.equal(fs.existsSync(path.join(runtimeRoot, "auto-capture")), false);
  assert.equal(fs.existsSync(path.join(runtimeRoot, "notifications")), true);
  assert.equal(fs.existsSync(path.join(runtimeRoot, "skills")), true);
  assert.equal(fs.existsSync(path.join(runtimeRoot, "shared")), true);
});
