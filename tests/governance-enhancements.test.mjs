import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "bin", "power-ai-skills.mjs");
const fixtureRoot = path.join(root, "tests", "fixtures", "consumer-basic");

function createTempConsumerProject(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "power-ai-skills-governance-"));
  const projectRoot = path.join(tempRoot, "consumer-basic");
  fs.cpSync(fixtureRoot, projectRoot, { recursive: true });
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return projectRoot;
}

function runCli(projectRoot, command, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [cliPath, command, "--project", projectRoot, ...extraArgs],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test("generate-wrapper-registry-governance reports registered wrappers ready proposals and stalled proposals", (t) => {
  const projectRoot = createTempConsumerProject(t);
  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", ["ready-governance-tool"]).status, 0);
  assert.equal(runCli(projectRoot, "scaffold-wrapper-promotion", ["stalled-governance-tool"]).status, 0);

  const readyProposalPath = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "ready-governance-tool", "wrapper-promotion.json");
  const readyProposal = readJson(readyProposalPath);
  writeJson(readyProposalPath, {
    ...readyProposal,
    status: "accepted",
    reviewedAt: "2026-01-01T00:00:00.000Z",
    materializationStatus: "generated",
    materializedAt: "2026-01-01T00:10:00.000Z",
    applicationStatus: "applied",
    appliedAt: "2026-01-01T00:20:00.000Z",
    followUpStatus: "finalized",
    finalizedAt: "2026-01-01T00:30:00.000Z",
    registrationStatus: "not-registered",
    pendingFollowUps: []
  });

  const stalledProposalPath = path.join(projectRoot, ".power-ai", "proposals", "wrapper-promotions", "stalled-governance-tool", "wrapper-promotion.json");
  const stalledProposal = readJson(stalledProposalPath);
  writeJson(stalledProposalPath, {
    ...stalledProposal,
    generatedAt: "2026-01-01T00:00:00.000Z",
    status: "needs-work",
    reviewedAt: "2026-01-01T00:05:00.000Z",
    reviewHistory: [
      {
        status: "needs-work",
        note: "missing adapter detail",
        reviewedAt: "2026-01-01T00:05:00.000Z"
      }
    ]
  });

  const result = runCli(projectRoot, "generate-wrapper-registry-governance", ["--stale-days", "0", "--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.registeredWrapperCount >= 9, true);
  assert.equal(payload.summary.proposalCount, 2);
  assert.equal(payload.summary.readyForRegistration, 1);
  assert.equal(payload.summary.stalledProposalCount, 1);
  assert.equal(payload.readyForRegistration[0].toolName, "ready-governance-tool");
  assert.equal(payload.stalledProposals[0].toolName, "stalled-governance-tool");
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);

  const markdown = fs.readFileSync(payload.reportPath, "utf8");
  const savedJson = readJson(payload.jsonPath);
  assert.equal(markdown.includes("## Registered Wrappers"), true);
  assert.equal(markdown.includes("ready-governance-tool"), true);
  assert.equal(savedJson.summary.readyForRegistration, 1);
});

test("generate-conversation-miner-strategy writes typed config and supports dry-run", (t) => {
  const projectRoot = createTempConsumerProject(t);

  const result = runCli(projectRoot, "generate-conversation-miner-strategy", ["--type", "strict-governance", "--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.projectType, "strict-governance");
  assert.equal(payload.dryRun, false);
  assert.equal(payload.nextConfig.capture.mode, "strict");
  assert.equal(payload.nextConfig.capture.askScoreThreshold, 8);
  assert.equal(fs.existsSync(payload.configPath), true);
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);

  const writtenConfig = readJson(payload.configPath);
  assert.equal(writtenConfig.strategy.projectType, "strict-governance");
  assert.equal(writtenConfig.capture.askScoreThreshold, 8);

  const dryRunResult = runCli(projectRoot, "generate-conversation-miner-strategy", ["--type", "exploration", "--dry-run", "--json"]);
  assert.equal(dryRunResult.status, 0, dryRunResult.stderr);
  const dryRunPayload = JSON.parse(dryRunResult.stdout);
  assert.equal(dryRunPayload.projectType, "exploration");
  assert.equal(dryRunPayload.dryRun, true);
  assert.equal(dryRunPayload.nextConfig.capture.askScoreThreshold, 4);

  const configAfterDryRun = readJson(payload.configPath);
  assert.equal(configAfterDryRun.strategy.projectType, "strict-governance");
  assert.equal(configAfterDryRun.capture.askScoreThreshold, 8);
});

test("generate-conversation-miner-strategy dry-run does not create config in a fresh project", (t) => {
  const projectRoot = createTempConsumerProject(t);
  const configPath = path.join(projectRoot, ".power-ai", "conversation-miner-config.json");

  const result = runCli(projectRoot, "generate-conversation-miner-strategy", ["--type", "manual-review", "--dry-run", "--json"]);
  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.projectType, "manual-review");
  assert.equal(payload.dryRun, true);
  assert.equal(fs.existsSync(payload.reportPath), true);
  assert.equal(fs.existsSync(payload.jsonPath), true);
  assert.equal(fs.existsSync(configPath), false);
});
