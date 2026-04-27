import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyDir } from "../src/shared/fs.mjs";
import { runNpmPackJson } from "../scripts/shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(root, "tests", "fixtures", "consumer-basic");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...(options.env || {})
    }
  });
}

function createPackedPackageSnapshot(t) {
  const tempRoot = fs.mkdtempSync(path.join(root, ".tmp-package-boundary-"));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const packResult = runNpmPackJson(root, ["--pack-destination", tempRoot]);
  assert.equal(packResult.ok, true, packResult.error || packResult.stderr || packResult.stdout);

  const packPayload = packResult.payload[0];
  const tarballPath = path.join(tempRoot, packPayload.filename);
  const extractResult = runCommand("tar", ["-xf", tarballPath, "-C", tempRoot]);
  assert.equal(extractResult.status, 0, extractResult.stderr || extractResult.stdout);

  const unpackedPackageRoot = path.join(tempRoot, "package");
  assert.equal(fs.existsSync(unpackedPackageRoot), true);

  const sourceNodeModules = path.join(root, "node_modules");
  const unpackedNodeModules = path.join(unpackedPackageRoot, "node_modules");
  fs.symlinkSync(sourceNodeModules, unpackedNodeModules, "junction");

  return {
    tempRoot,
    packPayload,
    unpackedPackageRoot,
    binPath: path.join(unpackedPackageRoot, "bin", "power-ai-skills.mjs")
  };
}

function createTempConsumerProject(tempRoot) {
  const projectRoot = path.join(tempRoot, "consumer-basic");
  copyDir(fixtureRoot, projectRoot);
  fs.rmSync(path.join(projectRoot, ".power-ai"), { recursive: true, force: true });
  return projectRoot;
}

test("packed tarball keeps runtime assets and excludes maintainer-only files", (t) => {
  const { packPayload, unpackedPackageRoot } = createPackedPackageSnapshot(t);
  const packedPaths = packPayload.files.map((item) => item.path.replaceAll("\\", "/"));

  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "bin", "power-ai-skills.mjs")), true);
  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "src", "cli", "index.mjs")), true);
  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "config", "tool-registry.json")), true);
  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "manifest", "skills-manifest.json")), true);
  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "templates", "project", "shared", "AGENTS.md")), true);

  assert.equal(packedPaths.includes("bin/power-ai-skills.mjs"), true);
  assert.equal(packedPaths.includes("src/cli/index.mjs"), true);
  assert.equal(packedPaths.includes("manifest/skills-manifest.json"), true);
  assert.equal(packedPaths.includes("docs/command-manual.md"), true);

  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "scripts")), false);
  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "baseline")), false);
  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "manifest", "archive")), false);
  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "manifest", "notifications")), false);
  assert.equal(fs.existsSync(path.join(unpackedPackageRoot, "docs", "release-process.md")), false);

  assert.equal(packedPaths.some((packedPath) => packedPath.startsWith("scripts/")), false);
  assert.equal(packedPaths.some((packedPath) => packedPath.startsWith("baseline/")), false);
  assert.equal(packedPaths.some((packedPath) => packedPath.startsWith("manifest/archive/")), false);
  assert.equal(packedPaths.some((packedPath) => packedPath.startsWith("manifest/notifications/")), false);
  assert.equal(packedPaths.includes("docs/release-process.md"), false);
});

test("unpacked tarball can boot runtime entrypoints and initialize a consumer fixture", (t) => {
  const { tempRoot, unpackedPackageRoot, binPath } = createPackedPackageSnapshot(t);
  const consumerProjectRoot = createTempConsumerProject(tempRoot);

  const defaultsResult = runCommand(process.execPath, [
    binPath,
    "show-defaults",
    "--format",
    "summary"
  ], {
    cwd: unpackedPackageRoot
  });
  assert.equal(defaultsResult.status, 0, defaultsResult.stderr);
  assert.equal(
    defaultsResult.stdout.includes(`Package: ${packageJson.name}@${packageJson.version}`),
    true
  );

  const initResult = runCommand(process.execPath, [
    binPath,
    "init",
    "--project",
    consumerProjectRoot,
    "--tool",
    "codex",
    "--no-project-scan"
  ], {
    cwd: unpackedPackageRoot
  });
  assert.equal(initResult.status, 0, initResult.stderr);
  assert.equal(initResult.stdout.includes("Initialized project AI skills"), true);

  const doctorResult = runCommand(process.execPath, [
    binPath,
    "doctor",
    "--project",
    consumerProjectRoot,
    "--json"
  ], {
    cwd: unpackedPackageRoot
  });
  assert.equal(doctorResult.status, 0, doctorResult.stderr);

  const doctorPayload = JSON.parse(doctorResult.stdout);
  assert.equal(doctorPayload.ok, true);
  assert.equal(doctorPayload.packageName, packageJson.name);
  assert.equal(doctorPayload.version, packageJson.version);
  assert.deepEqual(doctorPayload.selectedTools, ["codex"]);
  assert.equal(
    doctorPayload.entrypointStates.some((entrypointState) => entrypointState.target === "AGENTS.md" && entrypointState.ok),
    true
  );
  assert.equal(fs.existsSync(doctorPayload.reportPath), true);
  assert.equal(fs.existsSync(doctorPayload.jsonPath), true);
  assert.equal(fs.existsSync(path.join(consumerProjectRoot, ".power-ai", "skills")), true);
});
