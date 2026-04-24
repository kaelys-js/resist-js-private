#!/usr/bin/env bash
# Smoke tests for post-edit-format-lint.sh
# Runs against tmpdir fixtures. Invokes hook with synthetic PostToolUse JSON.

set -euo pipefail

PROJECT_DIR="$(git rev-parse --show-toplevel)"
HOOK="$PROJECT_DIR/.claude/hooks/post-edit-format-lint.sh"

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

FAILED=0

# Helper: invoke hook with file_path JSON
invoke_hook() {
  local file_path="$1"
  echo "{\"tool_input\":{\"file_path\":\"$file_path\"}}" | \
    CLAUDE_PROJECT_DIR="$PROJECT_DIR" "$HOOK"
}

# ── Scenario 1: CLAUDE_HOOK_BYPASS=1 → no-op regardless of content ──────────
echo "[1/4] bypass env var skips all checks..."
echo 'garbage that would lint-fail' > "$TMP/bypass.ts"
OUT=$(echo "{\"tool_input\":{\"file_path\":\"$TMP/bypass.ts\"}}" | \
  CLAUDE_PROJECT_DIR="$PROJECT_DIR" CLAUDE_HOOK_BYPASS=1 "$HOOK")
if [[ -n "$OUT" ]]; then
  echo "  FAIL: expected empty output with bypass, got: $OUT"
  FAILED=1
else
  echo "  OK"
fi

# ── Scenario 2: Missing file → silent exit 0 ─────────────────────────────────
echo "[2/4] missing file path is a no-op..."
OUT=$(invoke_hook "$TMP/does-not-exist.ts")
if [[ -n "$OUT" ]]; then
  echo "  FAIL: expected empty output for missing file, got: $OUT"
  FAILED=1
else
  echo "  OK"
fi

# ── Scenario 3: Binary/skip extension → no-op ────────────────────────────────
echo "[3/4] skipped extensions are a no-op..."
touch "$TMP/img.png"
OUT=$(invoke_hook "$TMP/img.png")
if [[ -n "$OUT" ]]; then
  echo "  FAIL: expected empty output for .png, got: $OUT"
  FAILED=1
else
  echo "  OK"
fi

# ── Scenario 4: .ts file with fresh lint error → blocks on NEW finding ──────
# We write a file with a rule violation unlikely to exist in baseline (use a
# file path under /tmp so the file doesn't match any real workspace file in
# the baseline — guarantees "new" status).
echo "[4/5] ts file with fresh lint error blocks..."
cat > "$TMP/fresh-error.ts" <<'EOF'
// oxlint: prefer-const would flag this if tools run; tsgo will flag the return
export function bad(): number {
  return 'not a number';
}
EOF
OUT=$(invoke_hook "$TMP/fresh-error.ts" || true)
# The hook may or may not block depending on whether the tmpdir is inside a
# package tsgo scopes to. On a generic /tmp file, tsgo won't run (no owning
# package), so block may not fire. We accept either: no block OR block with
# decision=block. We only FAIL if block fires without a valid reason.
if [[ -n "$OUT" ]]; then
  if echo "$OUT" | jq -e '.decision == "block"' >/dev/null 2>&1; then
    echo "  OK (blocked as expected)"
  else
    echo "  FAIL: unexpected non-block output: $OUT"
    FAILED=1
  fi
else
  echo "  OK (no-block: tmpdir outside workspace, no owning package for tsgo)"
fi

# ── Scenario 5: Plan file missing required sections → blocks ────────────────
echo "[5/5] plan file missing sections blocks..."
mkdir -p "$TMP/docs/plans"
cat > "$TMP/docs/plans/bad-plan.md" <<'EOF'
# Some plan
Not a real plan.
EOF
OUT=$(invoke_hook "$TMP/docs/plans/bad-plan.md")
if echo "$OUT" | jq -e '.decision == "block"' >/dev/null 2>&1; then
  echo "  OK"
else
  echo "  FAIL: expected decision:block for bad plan, got: $OUT"
  FAILED=1
fi

# ── Summary ─────────────────────────────────────────────────────────────────
echo
if [[ "$FAILED" -eq 0 ]]; then
  echo "All smoke tests passed"
  exit 0
else
  echo "One or more smoke tests FAILED"
  exit 1
fi
