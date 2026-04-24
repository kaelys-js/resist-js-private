#!/usr/bin/env bash
# Regenerate .claude/lint-baseline.json from current workspace state.
# Run manually after intentional cleanup to shrink the baseline.
# Uses resist-lint (NOT oxlint directly) so all 112 tools + custom rules count.

set -euo pipefail

eval "$(/opt/homebrew/bin/mise activate bash --shims)" 2>/dev/null || true

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
OUT="$PROJECT_DIR/.claude/lint-baseline.json"

echo "Generating lint baseline (this takes ~30-60s for full workspace)..."
cd "$PROJECT_DIR"

# Full workspace run with --tools so tsgo/svelte-check/oxlint/custom all contribute.
# --json gives structured output; --severity stays default (real errors + warnings).
pnpm exec resist-lint --tools --json > "$OUT.tmp" 2>/dev/null || true

# Emit count-map format: {"file|ruleId|message": count}.
# Line/column intentionally omitted — line shifts from edits would otherwise
# invalidate stable baseline entries. Multiplicity is preserved via count.
node -e "
  const fs = require('node:fs');
  const raw = JSON.parse(fs.readFileSync('$OUT.tmp', 'utf8'));
  const results = raw.results ?? raw ?? [];
  const counts = {};
  for (const r of results) {
    const key = r.file + '|' + r.ruleId + '|' + r.message;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const sorted = {};
  for (const k of Object.keys(counts).sort()) {
    sorted[k] = counts[k];
  }
  fs.writeFileSync('$OUT', JSON.stringify(sorted, null, 2) + '\n');
"

rm "$OUT.tmp"
TOTAL=$(node -e "
  const b = JSON.parse(require('fs').readFileSync('$OUT','utf8'));
  let total = 0;
  for (const v of Object.values(b)) total += v;
  console.log(Object.keys(b).length + ' unique keys, ' + total + ' total findings');
")
echo "Baseline: $TOTAL written to $OUT"
