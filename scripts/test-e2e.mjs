#!/usr/bin/env node
// Discovers every tests/*-browser.mjs suite so new browser tests run in CI
// without editing package.json. Compatibility and comparison scripts are
// standalone tools and stay out of the end-to-end run.
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const excluded = new Set(["cifra-comparison.mjs", "compatibility-browser.mjs"]);
const suites = (await readdir(path.join(root, "tests")))
  .filter((file) => file.endsWith("-browser.mjs") && !excluded.has(file))
  .sort();

if (!suites.length) {
  console.error("No browser suites found in tests/");
  process.exit(1);
}

const results = [];
for (const suite of suites) {
  console.log(`\n▶ ${suite}`);
  const started = Date.now();
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join("tests", suite)], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });
    child.on("close", (status) => resolve(status ?? 1));
  });
  results.push({
    suite,
    code,
    seconds: ((Date.now() - started) / 1000).toFixed(1),
  });
}

console.log("\nBrowser suites summary:");
for (const { suite, code, seconds } of results)
  console.log(`${code === 0 ? "✓" : "✗"} ${suite} (${seconds}s)`);
const failed = results.filter((result) => result.code !== 0);
console.log(
  `${results.length - failed.length}/${results.length} suites passed`,
);
process.exit(failed.length ? 1 : 0);
