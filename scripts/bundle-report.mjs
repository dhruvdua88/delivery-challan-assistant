#!/usr/bin/env node
// Post-build bundle report: raw + gzip size per chunk, and the initial-load
// total (entry JS/CSS that first paint pays for) vs lazy chunks loaded on
// demand. Run: `npm run report`. Fails (exit 1) if initial load exceeds budget.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const ASSETS = "dist/assets";
const INITIAL_BUDGET_KB = 320; // gzip budget for the entry payload

function kb(bytes) {
  return (bytes / 1024).toFixed(1).padStart(8) + " kB";
}

let files;
try {
  files = readdirSync(ASSETS).filter((f) => /\.(js|css)$/.test(f));
} catch {
  console.error(`No ${ASSETS} — run "npm run build" first.`);
  process.exit(1);
}

const rows = files.map((f) => {
  const buf = readFileSync(join(ASSETS, f));
  return { f, raw: statSync(join(ASSETS, f)).size, gz: gzipSync(buf).length };
}).sort((a, b) => b.gz - a.gz);

// The entry chunk is the one referenced by index.html; approximate as
// index-*.js + the single .css. Everything else is lazy (dynamic import).
const isInitial = (f) => /^index-.*\.js$/.test(f) || f.endsWith(".css");

let initialGz = 0, lazyGz = 0;
console.log("\n  Bundle report (gzip)\n  " + "-".repeat(52));
console.log("  " + "chunk".padEnd(30) + "raw".padStart(11) + "gzip".padStart(11));
for (const r of rows) {
  const tag = isInitial(r.f) ? "  ▶" : "   ";
  console.log(tag + " " + r.f.padEnd(28) + kb(r.raw) + kb(r.gz));
  if (isInitial(r.f)) initialGz += r.gz; else lazyGz += r.gz;
}
console.log("  " + "-".repeat(52));
console.log(`  Initial load (▶): ${(initialGz / 1024).toFixed(1)} kB gzip`);
console.log(`  Lazy chunks:      ${(lazyGz / 1024).toFixed(1)} kB gzip (loaded on demand)`);
console.log(`  Budget:           ${INITIAL_BUDGET_KB} kB gzip initial\n`);

if (initialGz / 1024 > INITIAL_BUDGET_KB) {
  console.error(`  ✗ Initial load over budget by ${((initialGz / 1024) - INITIAL_BUDGET_KB).toFixed(1)} kB`);
  process.exit(1);
}
console.log("  ✓ Initial load within budget\n");
