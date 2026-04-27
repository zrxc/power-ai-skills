#!/usr/bin/env node
import { runCli } from "../src/cli/index.mjs";

try {
  await runCli({ importMetaUrl: import.meta.url });
} catch (error) {
  console.error(`[power-ai-skills] ${error.message}`);
  process.exit(1);
}
