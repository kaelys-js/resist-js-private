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

# Extract the canonical finding set: sort by (file, ruleId, line, column, message)
# and drop mutable fields (timestamps, fix ranges) so the baseline is stable.
node -e "
  const fs = require('node:fs');
  const raw = JSON.parse(fs.readFileSync('$OUT.tmp', 'utf8'));
  const results = (raw.results ?? raw ?? []).map((r) => ({
    file: r.file,
    ruleId: r.ruleId,
    line: r.line,
    column: r.column,
    severity: r.severity,
    message: r.message,
  }));
  results.sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.ruleId.localeCompare(b.ruleId) ||
    a.line - b.line ||
    a.column - b.column ||
    a.message.localeCompare(b.message),
  );
  fs.writeFileSync('$OUT', JSON.stringify(results, null, 2) + '\n');
"

rm "$OUT.tmp"
COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$OUT','utf8')).length)")
echo "Baseline: $COUNT findings written to $OUT"
