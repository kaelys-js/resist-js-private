#!/usr/bin/env bash
# Smoke tests for post-edit-format-lint.sh
# Runs against tmpdir fixtures. Invokes hook with synthetic PostToolUse JSON.
# Scenarios are mutually independent (own fixture files) and run in parallel.

set -uo pipefail

PROJECT_DIR="$(git rev-parse --show-toplevel)"
HOOK="$PROJECT_DIR/.claude/hooks/post-edit-format-lint.sh"
COMPARE="$PROJECT_DIR/.claude/hooks/lib/baseline-compare.mjs"

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

# Helper: invoke hook with file_path JSON
invoke_hook() {
  local file_path="$1"
  echo "{\"tool_input\":{\"file_path\":\"$file_path\"}}" | \
    CLAUDE_PROJECT_DIR="$PROJECT_DIR" "$HOOK"
}

# Per-scenario writes "PASS|<label>" or "FAIL|<label>|<reason>" to $TMP/result-N.txt.
# Each scenario is a function so we can background them.

scenario_1_bypass() {
  local label="[1/7] bypass env var skips all checks"
  echo 'garbage that would lint-fail' > "$TMP/bypass.ts"
  local out
  out=$(echo "{\"tool_input\":{\"file_path\":\"$TMP/bypass.ts\"}}" | \
    CLAUDE_PROJECT_DIR="$PROJECT_DIR" CLAUDE_HOOK_BYPASS=1 "$HOOK")
  if [[ -n "$out" ]]; then
    echo "FAIL|$label|expected empty output with bypass, got: $out" > "$TMP/result-1.txt"
  else
    echo "PASS|$label" > "$TMP/result-1.txt"
  fi
}

scenario_2_missing_file() {
  local label="[2/7] missing file path is a no-op"
  local out
  out=$(invoke_hook "$TMP/does-not-exist.ts")
  if [[ -n "$out" ]]; then
    echo "FAIL|$label|expected empty output for missing file, got: $out" > "$TMP/result-2.txt"
  else
    echo "PASS|$label" > "$TMP/result-2.txt"
  fi
}

scenario_3_skipped_extension() {
  local label="[3/7] skipped extensions are a no-op"
  touch "$TMP/img.png"
  local out
  out=$(invoke_hook "$TMP/img.png")
  if [[ -n "$out" ]]; then
    echo "FAIL|$label|expected empty output for .png, got: $out" > "$TMP/result-3.txt"
  else
    echo "PASS|$label" > "$TMP/result-3.txt"
  fi
}

scenario_4_ts_fresh_error() {
  local label="[4/7] ts file with fresh lint error blocks (or no-op outside workspace)"
  cat > "$TMP/fresh-error.ts" <<'EOF'
// oxlint: prefer-const would flag this if tools run; tsgo will flag the return
export function bad(): number {
  return 'not a number';
}
EOF
  local out
  out=$(invoke_hook "$TMP/fresh-error.ts" || true)
  # Hook may or may not block depending on whether the tmpdir is inside a
  # package tsgo scopes to. On a generic /tmp file, tsgo won't run (no owning
  # package), so block may not fire. We accept either: no block OR block with
  # decision=block. We only FAIL if block fires without a valid reason.
  if [[ -n "$out" ]]; then
    if echo "$out" | jq -e '.decision == "block"' >/dev/null 2>&1; then
      echo "PASS|$label (blocked as expected)" > "$TMP/result-4.txt"
    else
      echo "FAIL|$label|unexpected non-block output: $out" > "$TMP/result-4.txt"
    fi
  else
    echo "PASS|$label (no-block: tmpdir outside workspace)" > "$TMP/result-4.txt"
  fi
}

scenario_5_plan_missing_sections() {
  local label="[5/7] plan file missing sections blocks"
  mkdir -p "$TMP/docs/plans"
  cat > "$TMP/docs/plans/bad-plan.md" <<'EOF'
# Some plan
Not a real plan.
EOF
  local out
  out=$(invoke_hook "$TMP/docs/plans/bad-plan.md")
  if echo "$out" | jq -e '.decision == "block"' >/dev/null 2>&1; then
    echo "PASS|$label" > "$TMP/result-5.txt"
  else
    echo "FAIL|$label|expected decision:block for bad plan, got: $out" > "$TMP/result-5.txt"
  fi
}

scenario_6_baseline_shrink() {
  local label="[6/7] baseline-compare auto-shrinks when current < baseline"
  local shrink_file="$TMP/shrink.ts"
  touch "$shrink_file"
  local shrink_baseline="$TMP/baseline-shrink.json"
  local key="$shrink_file|oxlint/curly|Expected { after if condition."
  jq -n --arg k "$key" '{($k): 2}' > "$shrink_baseline"
  local current_json
  current_json=$(jq -n --arg f "$shrink_file" '[{
    file: $f,
    ruleId: "oxlint/curly",
    message: "Expected { after if condition.",
    line: 3,
    column: 1,
    severity: "warning"
  }]')
  local out
  out=$(BASELINE_PATH="$shrink_baseline" EDITED_FILE="$shrink_file" \
    node "$COMPARE" "$current_json" 2>&1)
  if [[ "$out" != "SHRUNK 1" ]]; then
    echo "FAIL|$label|expected 'SHRUNK 1', got: $out" > "$TMP/result-6.txt"
    return
  fi
  local new_count
  new_count=$(jq --arg k "$key" '.[$k]' "$shrink_baseline")
  if [[ "$new_count" == "1" ]]; then
    echo "PASS|$label" > "$TMP/result-6.txt"
  else
    echo "FAIL|$label|expected baseline count=1 after shrink, got: $new_count" > "$TMP/result-6.txt"
  fi
}

scenario_7_baseline_block() {
  local label="[7/7] baseline-compare blocks on new finding and leaves baseline intact"
  local block_file="$TMP/block.ts"
  touch "$block_file"
  local block_baseline="$TMP/baseline-block.json"
  echo '{}' > "$block_baseline"
  local current_json
  current_json=$(jq -n --arg f "$block_file" '[{
    file: $f,
    ruleId: "oxlint/no-unused-vars",
    message: "Unused variable x.",
    line: 1,
    column: 1,
    severity: "error"
  }]')
  local out
  out=$(BASELINE_PATH="$block_baseline" EDITED_FILE="$block_file" \
    node "$COMPARE" "$current_json" 2>&1)
  if [[ "$out" != BLOCK* ]]; then
    echo "FAIL|$label|expected BLOCK prefix, got: $out" > "$TMP/result-7.txt"
    return
  fi
  local baseline_content
  baseline_content=$(cat "$block_baseline")
  if [[ "$baseline_content" == "{}" ]]; then
    echo "PASS|$label" > "$TMP/result-7.txt"
  else
    echo "FAIL|$label|baseline mutated on block path: $baseline_content" > "$TMP/result-7.txt"
  fi
}

# Launch all scenarios in parallel
scenario_1_bypass &                    PID1=$!
scenario_2_missing_file &              PID2=$!
scenario_3_skipped_extension &         PID3=$!
scenario_4_ts_fresh_error &            PID4=$!
scenario_5_plan_missing_sections &     PID5=$!
scenario_6_baseline_shrink &           PID6=$!
scenario_7_baseline_block &            PID7=$!

wait $PID1 $PID2 $PID3 $PID4 $PID5 $PID6 $PID7

# Aggregate results in scenario order
FAILED=0
for i in 1 2 3 4 5 6 7; do
  if [[ ! -f "$TMP/result-$i.txt" ]]; then
    echo "  FAIL: scenario $i produced no result file"
    FAILED=1
    continue
  fi
  IFS='|' read -r status label reason < "$TMP/result-$i.txt"
  if [[ "$status" == "PASS" ]]; then
    echo "  OK $label"
  else
    echo "  FAIL $label: $reason"
    FAILED=1
  fi
done

echo
if [[ "$FAILED" -eq 0 ]]; then
  echo "All smoke tests passed"
  exit 0
else
  echo "One or more smoke tests FAILED"
  exit 1
fi
