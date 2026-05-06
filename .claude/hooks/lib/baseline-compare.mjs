#!/usr/bin/env node
/**
 * Baseline-compare helper for post-edit-format-lint.sh.
 *
 * Input (via process.argv[2]): JSON string containing resist-lint --json output.
 *
 * Required env vars:
 *   BASELINE_PATH — path to lint-baseline.json (count-map format)
 *   EDITED_FILE   — absolute path of the file that was just edited
 *
 * Output on stdout (first line = decision):
 *   BLOCK\n<human-readable findings…>  — new findings detected
 *   SHRUNK <N>                          — baseline auto-shrunk by N
 *   NOOP                                — no findings, nothing to shrink
 *
 * Side effect: on SHRUNK, overwrites BASELINE_PATH with reduced counts.
 * Only touches keys owned by EDITED_FILE. Never increases counts.
 *
 * @module
 */

import fs from 'node:fs';

const baselinePath = process.env.BASELINE_PATH;
const editedFile = process.env.EDITED_FILE;

if (!baselinePath || !editedFile) {
  process.stderr.write('BASELINE_PATH and EDITED_FILE env vars required\n');
  process.exit(2);
}

/** @returns {Array<{file:string,ruleId:string,line:number,column:number,severity:string,message:string}>} */
function parseCurrent() {
  const input = process.argv[2] ?? '[]';

  try {
    const parsed = JSON.parse(input);
    const results = parsed.results ?? parsed;

    return Array.isArray(results) ? results : [];
  } catch {
    return [];
  }
}

/** @returns {Record<string, number>} */
function parseBaseline() {
  try {
    const loaded = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

    /* Reject legacy array format — treat as empty to force regeneration. */
    return Array.isArray(loaded) ? {} : loaded;
  } catch {
    return {};
  }
}

const current = parseCurrent();
const baseline = parseBaseline();

const mkKey = (r) => `${r.file}|${r.ruleId}|${r.message}`;

/* Count current findings across ALL files — cross-file cascade errors
 * (e.g. a signature change in one file breaking 500 callers) MUST block,
 * not slip through because they aren't in the edited file. */
const currentCounts = {};
const samples = {};

for (const r of current) {
  const k = mkKey(r);

  currentCounts[k] = (currentCounts[k] ?? 0) + 1;
  if (!samples[k]) {
    samples[k] = r;
  }
}

/* Detect NEW findings: current_count > baseline_count. */
const newFindings = [];

for (const [k, cnt] of Object.entries(currentCounts)) {
  const base = baseline[k] ?? 0;

  if (cnt > base) {
    newFindings.push({ key: k, excess: cnt - base, sample: samples[k] });
  }
}

if (newFindings.length > 0) {
  const msg = newFindings
    .slice(0, 20)
    .map((f) => {
      const r = f.sample;
      const suffix = f.excess > 1 ? ` (×${f.excess} new)` : '';

      return `${r.file}:${r.line}:${r.column} ${r.severity} ${r.ruleId} — ${r.message}${suffix}`;
    })
    .join('\n');

  process.stdout.write(`BLOCK\n${msg}\n`);
  process.exit(0);
}

/* APPROVE — auto-shrink baseline for edited file only. */
const prefix = `${editedFile}|`;
let shrunk = 0;
const nextBaseline = { ...baseline };

for (const k of Object.keys(nextBaseline)) {
  if (!k.startsWith(prefix)) {
    continue;
  }

  const cur = currentCounts[k] ?? 0;

  if (cur < nextBaseline[k]) {
    shrunk += nextBaseline[k] - cur;
    if (cur === 0) {
      nextBaseline[k] = undefined;
    } else {
      nextBaseline[k] = cur;
    }
  }
}

if (shrunk > 0) {
  const sorted = {};

  for (const k of Object.keys(nextBaseline).toSorted()) {
    if (nextBaseline[k] !== undefined) {
      sorted[k] = nextBaseline[k];
    }
  }
  fs.writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 2)}\n`);
  process.stdout.write(`SHRUNK ${shrunk}\n`);
} else {
  process.stdout.write('NOOP\n');
}
