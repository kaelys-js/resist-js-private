#!/usr/bin/env bash
# Comprehensive smoke tests for haiku-fix-worker.sh.
#
# Uses a fake `claude` binary (controlled via FAKE_BEHAVIOR env var) instead
# of calling real Haiku. Each test asserts the worker's filesystem effects
# and log output match expectations.
#
# Run from repo root: bash .claude/hooks/lib/haiku-fix-worker.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WORKER="$REPO_ROOT/.claude/hooks/lib/haiku-fix-worker.sh"

if [[ ! -x "$WORKER" ]]; then
  echo "FAIL: worker script not executable at $WORKER"
  exit 1
fi

PASS=0
FAIL=0
SKIP=0

# ── Test infrastructure ────────────────────────────────────────────────────

# Build fake `claude` binary in a temp dir. Behavior controlled by
# FAKE_BEHAVIOR env var (read at test time): success | empty | error |
# fenced | hang | shrink | identical | huge-diff
FAKE_DIR=$(mktemp -d)
FAKE_CLAUDE="$FAKE_DIR/claude"
cat >"$FAKE_CLAUDE" <<'EOF'
#!/usr/bin/env bash
# Fake Claude CLI used by haiku-fix-worker.test.sh.
# Reads FAKE_BEHAVIOR + FAKE_FIX_FILE from env.
# Last argument is the user prompt; we pluck the file content from <FILE> tags.
case "${FAKE_BEHAVIOR:-success}" in
  empty)
    exit 0
    ;;
  error)
    echo "fake claude error" >&2
    exit 1
    ;;
  hang)
    sleep 60
    exit 0
    ;;
  fenced)
    # Output the fix wrapped in markdown fences (worker should strip them)
    echo '```ts'
    cat "${FAKE_FIX_FILE}"
    echo '```'
    ;;
  shrink)
    # Output content much smaller than original (worker should reject)
    echo "x"
    ;;
  identical)
    # Output the original file unchanged (worker should reject: no improvement)
    PROMPT="${@: -1}"
    echo "$PROMPT" | sed -n '/^<FILE>$/,/^<\/FILE>$/p' | sed '1d;$d'
    ;;
  huge-diff)
    # Add 100 unrelated comment lines (worker should reject diff size)
    PROMPT="${@: -1}"
    echo "$PROMPT" | sed -n '/^<FILE>$/,/^<\/FILE>$/p' | sed '1d;$d'
    for i in $(seq 1 100); do
      echo "// junk line $i"
    done
    ;;
  success|*)
    # Read the prepared fix content from FAKE_FIX_FILE, output it raw.
    cat "${FAKE_FIX_FILE:-/dev/null}"
    ;;
esac
EOF
chmod +x "$FAKE_CLAUDE"

# Per-test isolation: scratch directory + queue
make_scratch() {
  local d
  d=$(mktemp -d)
  mkdir -p "$d/.claude/.haiku-queue"
  echo "$d"
}

assert() {
  local label="$1"
  local cond="$2"
  if [[ "$cond" == "true" ]]; then
    echo "  OK [$label]"
    PASS=$((PASS + 1))
  else
    echo "  FAIL [$label]"
    FAIL=$((FAIL + 1))
  fi
}

# Run worker with overridden PROJECT_DIR + fake claude.
# Args: $1 file path, $2 mtime, $3 fake-behavior, [$4 fake-fix-file]
run_worker() {
  local file="$1"
  local mtime="$2"
  local behavior="$3"
  local fix_file="${4:-}"
  CLAUDE_PROJECT_DIR="$SCRATCH" \
  CLAUDE_HAIKU_FAKE="$FAKE_CLAUDE" \
  FAKE_BEHAVIOR="$behavior" \
  FAKE_FIX_FILE="$fix_file" \
  bash "$WORKER" "$file" "$mtime" 2>&1 || true
}

# Stub resist-lint with a JSON file we control.
# When the worker runs `resist-lint --tools --json $FILE`, the stub returns
# the contents of $LINT_OUTPUT_FILE (or an empty array if not set).
setup_stub_resist_lint() {
  mkdir -p "$SCRATCH/node_modules/.bin"
  cat >"$SCRATCH/node_modules/.bin/resist-lint" <<EOF
#!/usr/bin/env bash
# Stub resist-lint for tests.
# Reads from \$LINT_OUTPUT_FILE based on whether file has been modified
# (different output before vs after fix application).
ARGS="\$*"
TARGET_FILE=""
for a in "\$@"; do
  case "\$a" in
    --*|-*) ;;
    *) TARGET_FILE="\$a" ;;
  esac
done
HASH=\$(shasum -a 256 "\$TARGET_FILE" 2>/dev/null | cut -c1-16)
SPECIFIC="${SCRATCH}/lint-by-hash/\$HASH.json"
if [[ -f "\$SPECIFIC" ]]; then
  cat "\$SPECIFIC"
else
  cat "\${LINT_OUTPUT_FILE:-/dev/null}" 2>/dev/null || echo '[]'
fi
EOF
  chmod +x "$SCRATCH/node_modules/.bin/resist-lint"
}

# Set the lint JSON returned for files of a particular hash (so we can model
# "before fix" vs "after fix" diagnostic counts). All hashing goes through
# real file bytes — never through `$(cat file)` which strips trailing newlines.
set_lint_for_content() {
  local content="$1"
  local json="$2"
  local tmp
  tmp=$(mktemp)
  # Mirror the byte-exact write the worker uses for fix application.
  printf '%s' "$content" >"$tmp"
  set_lint_for_file "$tmp" "$json"
  rm -f "$tmp"
}

set_lint_for_file() {
  local file="$1"
  local json="$2"
  local hash
  hash=$(shasum -a 256 "$file" | cut -c1-16)
  mkdir -p "$SCRATCH/lint-by-hash"
  echo "$json" >"$SCRATCH/lint-by-hash/$hash.json"
}

get_log() {
  cat "$SCRATCH/.claude/.haiku-queue/log" 2>/dev/null || echo ""
}

mtime_of() {
  stat -f '%m' "$1" 2>/dev/null || stat -c '%Y' "$1"
}

# ───────────────────────────────────────────────────────────────────────────
# Test 1: Happy path — Haiku fix improves diagnostics, file gets updated
# ───────────────────────────────────────────────────────────────────────────
echo "Test 1: happy path"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test1.ts"
ORIGINAL=$'export const x = 1;\nconst y = x!\n'
FIXED=$'export const x = 1;\nconst y = x ?? 0;\n'
printf '%s' "$ORIGINAL" >"$TARGET"
# Original has a diagnostic; fixed has none
set_lint_for_content "$ORIGINAL" '[{"file":"'$TARGET'","line":2,"column":15,"ruleId":"oxlint/no-non-null-assertion","message":"Forbidden non-null assertion."}]'
set_lint_for_content "$FIXED" '[]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
FIX_FILE="$SCRATCH/fix1.txt"
printf '%s' "$FIXED" >"$FIX_FILE"
run_worker "$TARGET" "$(mtime_of "$TARGET")" success "$FIX_FILE"
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" != "$POST_HASH" ]] && [[ "$LOG" == *"FIXED"* ]] && assert "happy-path-applies-fix" true || assert "happy-path-applies-fix" false

# ───────────────────────────────────────────────────────────────────────────
# Test 2: Already clean file — no-op, no Haiku call
# ───────────────────────────────────────────────────────────────────────────
echo "Test 2: noop on clean file"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test2.ts"
echo "export const x = 1;" >"$TARGET"
set_lint_for_file "$TARGET" '[]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
run_worker "$TARGET" "$(mtime_of "$TARGET")" success "" 2>&1 >/dev/null || true
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"noop"* ]] && assert "noop-on-clean-file" true || assert "noop-on-clean-file" false

# ───────────────────────────────────────────────────────────────────────────
# Test 3: Cross-file cascade — must skip (escalate to user)
# ───────────────────────────────────────────────────────────────────────────
echo "Test 3: skip on cross-file cascade"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test3.ts"
echo "export const x = 1;" >"$TARGET"
# Diagnostic in DIFFERENT file (cross-file cascade scenario)
set_lint_for_file "$TARGET" '[{"file":"'$SCRATCH'/other.ts","line":1,"column":1,"ruleId":"tsgo/TS2322","message":"Type error."}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
run_worker "$TARGET" "$(mtime_of "$TARGET")" success "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"cross-file-cascade"* ]] && assert "skip-cross-file-cascade" true || assert "skip-cross-file-cascade" false

# ───────────────────────────────────────────────────────────────────────────
# Test 4: Haiku returns empty — no fix applied
# ───────────────────────────────────────────────────────────────────────────
echo "Test 4: haiku empty output"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test4.ts"
echo "export const x = 1;" >"$TARGET"
set_lint_for_file "$TARGET" '[{"file":"'$TARGET'","line":1,"column":1,"ruleId":"foo","message":"bar"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
run_worker "$TARGET" "$(mtime_of "$TARGET")" empty "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"haiku-empty-output"* ]] && assert "haiku-empty-output-no-fix" true || assert "haiku-empty-output-no-fix" false

# ───────────────────────────────────────────────────────────────────────────
# Test 5: Haiku returns error — no fix applied
# ───────────────────────────────────────────────────────────────────────────
echo "Test 5: haiku error exit"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test5.ts"
echo "export const x = 1;" >"$TARGET"
set_lint_for_file "$TARGET" '[{"file":"'$TARGET'","line":1,"column":1,"ruleId":"foo","message":"bar"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
run_worker "$TARGET" "$(mtime_of "$TARGET")" error "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"haiku-exit="* ]] && assert "haiku-error-exit-no-fix" true || assert "haiku-error-exit-no-fix" false

# ───────────────────────────────────────────────────────────────────────────
# Test 6: Markdown fences in output — stripped before validation
# ───────────────────────────────────────────────────────────────────────────
echo "Test 6: strip markdown fences"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test6.ts"
ORIGINAL=$'export const x = 1;\nconst y = x!\n'
FIXED=$'export const x = 1;\nconst y = x ?? 0;\n'
printf '%s' "$ORIGINAL" >"$TARGET"
set_lint_for_content "$ORIGINAL" '[{"file":"'$TARGET'","line":2,"column":15,"ruleId":"oxlint/no-non-null-assertion","message":"X"}]'
set_lint_for_content "$FIXED" '[]'
FIX_FILE="$SCRATCH/fix6.txt"
printf '%s' "$FIXED" >"$FIX_FILE"
run_worker "$TARGET" "$(mtime_of "$TARGET")" fenced "$FIX_FILE" >/dev/null
POST=$(cat "$TARGET")
# Should match FIXED content with fences stripped, NOT contain ```
[[ "$POST" != *'```'* ]] && [[ "$POST" == *"x ?? 0"* ]] && assert "strip-markdown-fences" true || assert "strip-markdown-fences" false

# ───────────────────────────────────────────────────────────────────────────
# Test 7: Output too short — rejected (<50% of original size)
# ───────────────────────────────────────────────────────────────────────────
echo "Test 7: reject too-short output"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test7.ts"
LARGE=$(printf 'export const x = 1;\n%.0s' $(seq 1 50))
printf '%s' "$LARGE" >"$TARGET"
set_lint_for_file "$TARGET" '[{"file":"'$TARGET'","line":1,"column":1,"ruleId":"foo","message":"bar"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
run_worker "$TARGET" "$(mtime_of "$TARGET")" shrink "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"too-short"* ]] && assert "reject-too-short-output" true || assert "reject-too-short-output" false

# ───────────────────────────────────────────────────────────────────────────
# Test 8: No improvement — fix reverted
# ───────────────────────────────────────────────────────────────────────────
echo "Test 8: revert when no improvement"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test8.ts"
ORIGINAL=$'export const x = 1;\nconst y = x!\n'
printf '%s' "$ORIGINAL" >"$TARGET"
# Both before and after have the same diagnostic count
set_lint_for_content "$ORIGINAL" '[{"file":"'$TARGET'","line":2,"column":15,"ruleId":"foo","message":"X"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
run_worker "$TARGET" "$(mtime_of "$TARGET")" identical "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"no-improvement"* || "$LOG" == *"revert"* ]] && assert "revert-when-no-improvement" true || assert "revert-when-no-improvement" false

# ───────────────────────────────────────────────────────────────────────────
# Test 9: Diff too big — rejected (>6 lines per diagnostic)
# ───────────────────────────────────────────────────────────────────────────
echo "Test 9: reject too-big diff"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test9.ts"
ORIGINAL=$'export const x = 1;\nconst y = x!\n'
printf '%s' "$ORIGINAL" >"$TARGET"
set_lint_for_content "$ORIGINAL" '[{"file":"'$TARGET'","line":2,"column":15,"ruleId":"foo","message":"X"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
run_worker "$TARGET" "$(mtime_of "$TARGET")" huge-diff "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"diff-too-big"* ]] && assert "reject-diff-too-big" true || assert "reject-diff-too-big" false

# ───────────────────────────────────────────────────────────────────────────
# Test 10: mtime changed mid-fix — abandon
# ───────────────────────────────────────────────────────────────────────────
echo "Test 10: abandon on mtime change mid-fix"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test10.ts"
ORIGINAL=$'export const x = 1;\nconst y = x!\n'
printf '%s' "$ORIGINAL" >"$TARGET"
set_lint_for_content "$ORIGINAL" '[{"file":"'$TARGET'","line":2,"column":15,"ruleId":"foo","message":"X"}]'
# Use a slow fake claude that gives us time to bump mtime.
SLOW_CLAUDE="$SCRATCH/slow-claude"
cat >"$SLOW_CLAUDE" <<EOF
#!/usr/bin/env bash
sleep 2
echo "export const x = 999;"
EOF
chmod +x "$SLOW_CLAUDE"
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
# Run worker in background; bump mtime mid-call.
(CLAUDE_PROJECT_DIR="$SCRATCH" CLAUDE_HAIKU_FAKE="$SLOW_CLAUDE" \
  bash "$WORKER" "$TARGET" "$(mtime_of "$TARGET")" >/dev/null 2>&1) &
WORKER_PID=$!
sleep 1
touch "$TARGET"  # bump mtime — simulates user editing again
wait "$WORKER_PID"
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"mtime-changed-mid-fix"* ]] && assert "abandon-mtime-change-mid-fix" true || assert "abandon-mtime-change-mid-fix" false

# ───────────────────────────────────────────────────────────────────────────
# Test 11: Two concurrent workers same file — one wins, other waits
# ───────────────────────────────────────────────────────────────────────────
echo "Test 11: concurrent workers on same file"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test11.ts"
ORIGINAL="export const x = 1;"
echo "$ORIGINAL" >"$TARGET"
set_lint_for_file "$TARGET" '[]'
SLOW_CLAUDE="$SCRATCH/slow-claude"
cat >"$SLOW_CLAUDE" <<EOF
#!/usr/bin/env bash
sleep 2
echo "fixed"
EOF
chmod +x "$SLOW_CLAUDE"
# Launch two workers simultaneously
(CLAUDE_PROJECT_DIR="$SCRATCH" CLAUDE_HAIKU_FAKE="$SLOW_CLAUDE" \
  bash "$WORKER" "$TARGET" "$(mtime_of "$TARGET")" >/dev/null 2>&1) &
PID_A=$!
(CLAUDE_PROJECT_DIR="$SCRATCH" CLAUDE_HAIKU_FAKE="$SLOW_CLAUDE" \
  bash "$WORKER" "$TARGET" "$(mtime_of "$TARGET")" >/dev/null 2>&1) &
PID_B=$!
wait "$PID_A" "$PID_B"
LOG=$(get_log)
# Both should complete (one waits up to 15s for lock, the other runs first).
# Both observe lint clean (we set empty array), so both end with noop.
NOOP_COUNT=$(echo "$LOG" | grep -c "noop" || true)
[[ "$NOOP_COUNT" -ge 1 ]] && assert "concurrent-workers-no-corruption" true || assert "concurrent-workers-no-corruption" false

# ───────────────────────────────────────────────────────────────────────────
# Test 12: CLAUDE_HOOK_BYPASS=1 — worker exits silently
# ───────────────────────────────────────────────────────────────────────────
echo "Test 12: bypass env var"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test12.ts"
echo "x" >"$TARGET"
set_lint_for_file "$TARGET" '[{"file":"'$TARGET'","line":1,"column":1,"ruleId":"foo","message":"bar"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
CLAUDE_HOOK_BYPASS=1 run_worker "$TARGET" "$(mtime_of "$TARGET")" success "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ -z "$LOG" ]] && assert "bypass-env-skips-everything" true || assert "bypass-env-skips-everything" false

# ───────────────────────────────────────────────────────────────────────────
# Test 13: CLAUDE_NO_HAIKU=1 — worker exits silently
# ───────────────────────────────────────────────────────────────────────────
echo "Test 13: no-haiku env var"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test13.ts"
echo "x" >"$TARGET"
set_lint_for_file "$TARGET" '[{"file":"'$TARGET'","line":1,"column":1,"ruleId":"foo","message":"bar"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
CLAUDE_NO_HAIKU=1 run_worker "$TARGET" "$(mtime_of "$TARGET")" success "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
[[ "$PRE_HASH" == "$POST_HASH" ]] && assert "no-haiku-env-skips" true || assert "no-haiku-env-skips" false

# ───────────────────────────────────────────────────────────────────────────
# Test 14: Missing claude binary — worker exits gracefully
# ───────────────────────────────────────────────────────────────────────────
echo "Test 14: missing claude binary"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test14.ts"
echo "x" >"$TARGET"
set_lint_for_file "$TARGET" '[{"file":"'$TARGET'","line":1,"column":1,"ruleId":"foo","message":"bar"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
CLAUDE_PROJECT_DIR="$SCRATCH" \
CLAUDE_HAIKU_FAKE="/nonexistent/claude" \
bash "$WORKER" "$TARGET" "$(mtime_of "$TARGET")" >/dev/null 2>&1
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"no-claude-cli"* ]] && assert "missing-claude-binary" true || assert "missing-claude-binary" false

# ───────────────────────────────────────────────────────────────────────────
# Test 15: Missing resist-lint — worker exits gracefully
# ───────────────────────────────────────────────────────────────────────────
echo "Test 15: missing resist-lint"
SCRATCH=$(make_scratch)
TARGET="$SCRATCH/test15.ts"
echo "x" >"$TARGET"
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
run_worker "$TARGET" "$(mtime_of "$TARGET")" success "" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"no-resist-lint"* ]] && assert "missing-resist-lint" true || assert "missing-resist-lint" false

# ───────────────────────────────────────────────────────────────────────────
# Test 16: Missing args — worker exits silently
# ───────────────────────────────────────────────────────────────────────────
echo "Test 16: missing args"
bash "$WORKER" >/dev/null 2>&1
RC=$?
bash "$WORKER" "/some/file" >/dev/null 2>&1
RC2=$?
[[ "$RC" -eq 0 ]] && [[ "$RC2" -eq 0 ]] && assert "missing-args-no-crash" true || assert "missing-args-no-crash" false

# ───────────────────────────────────────────────────────────────────────────
# Test 17: Deleted file — worker exits gracefully (no crash)
# ───────────────────────────────────────────────────────────────────────────
echo "Test 17: file deleted before worker runs"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test17.ts"
echo "x" >"$TARGET"
MTIME=$(mtime_of "$TARGET")
rm "$TARGET"
run_worker "$TARGET" "$MTIME" success "" >/dev/null 2>&1
RC=$?
LOG=$(get_log)
[[ "$RC" -eq 0 ]] && [[ "$LOG" == *"file-deleted"* || "$LOG" == *"skip"* ]] && assert "file-deleted-no-crash" true || assert "file-deleted-no-crash" false

# ───────────────────────────────────────────────────────────────────────────
# Test 18: Worker introduces NEW diagnostics — revert
# ───────────────────────────────────────────────────────────────────────────
echo "Test 18: revert when new diagnostics introduced"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test18.ts"
ORIGINAL=$'export const x = 1;\nconst y = x!\n'
BAD_FIX=$'export const x = 1;\nconst y = x;\nconst z = a!;\nconst w = b!;\n'
printf '%s' "$ORIGINAL" >"$TARGET"
# Original: 1 diagnostic; "fix": 2 diagnostics (worse!)
set_lint_for_content "$ORIGINAL" '[{"file":"'$TARGET'","line":2,"column":15,"ruleId":"foo","message":"X"}]'
set_lint_for_content "$BAD_FIX" '[{"file":"'$TARGET'","line":3,"column":15,"ruleId":"foo","message":"Y"},{"file":"'$TARGET'","line":4,"column":15,"ruleId":"foo","message":"Z"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
FIX_FILE="$SCRATCH/fix18.txt"
printf '%s' "$BAD_FIX" >"$FIX_FILE"
run_worker "$TARGET" "$(mtime_of "$TARGET")" success "$FIX_FILE" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" == "$POST_HASH" ]] && [[ "$LOG" == *"no-improvement"* || "$LOG" == *"revert"* ]] && assert "revert-when-new-diagnostics" true || assert "revert-when-new-diagnostics" false

# ───────────────────────────────────────────────────────────────────────────
# Test 19: Partial fix (improvement but residual remains) — keep, don't revert
# ───────────────────────────────────────────────────────────────────────────
echo "Test 19: keep partial fix"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test19.ts"
ORIGINAL=$'export const x = 1;\nconst a = b!;\nconst c = d!;\nconst e = f!;\n'
PARTIAL=$'export const x = 1;\nconst a = b;\nconst c = d;\nconst e = f!;\n'
printf '%s' "$ORIGINAL" >"$TARGET"
set_lint_for_content "$ORIGINAL" '[{"file":"'$TARGET'","line":2,"column":15,"ruleId":"foo","message":"X"},{"file":"'$TARGET'","line":3,"column":15,"ruleId":"foo","message":"Y"},{"file":"'$TARGET'","line":4,"column":15,"ruleId":"foo","message":"Z"}]'
set_lint_for_content "$PARTIAL" '[{"file":"'$TARGET'","line":4,"column":15,"ruleId":"foo","message":"Z"}]'
PRE_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
FIX_FILE="$SCRATCH/fix19.txt"
printf '%s' "$PARTIAL" >"$FIX_FILE"
run_worker "$TARGET" "$(mtime_of "$TARGET")" success "$FIX_FILE" >/dev/null
POST_HASH=$(shasum -a 256 "$TARGET" | cut -c1-16)
LOG=$(get_log)
[[ "$PRE_HASH" != "$POST_HASH" ]] && [[ "$LOG" == *"FIXED 2/3"* ]] && assert "keep-partial-fix" true || assert "keep-partial-fix" false

# ───────────────────────────────────────────────────────────────────────────
# Test 20: Backup is cleaned up after success
# ───────────────────────────────────────────────────────────────────────────
echo "Test 20: backup cleanup"
SCRATCH=$(make_scratch)
setup_stub_resist_lint
TARGET="$SCRATCH/test20.ts"
ORIGINAL=$'export const x = 1;\nconst y = x!\n'
FIXED=$'export const x = 1;\nconst y = x;\n'
printf '%s' "$ORIGINAL" >"$TARGET"
set_lint_for_content "$ORIGINAL" '[{"file":"'$TARGET'","line":2,"column":15,"ruleId":"foo","message":"X"}]'
set_lint_for_content "$FIXED" '[]'
FIX_FILE="$SCRATCH/fix20.txt"
printf '%s' "$FIXED" >"$FIX_FILE"
run_worker "$TARGET" "$(mtime_of "$TARGET")" success "$FIX_FILE" >/dev/null
BAK_COUNT=$(find "$SCRATCH" -name '*.haiku-bak-*' 2>/dev/null | wc -l | tr -d ' ')
[[ "$BAK_COUNT" -eq 0 ]] && assert "backup-cleaned-up-on-success" true || assert "backup-cleaned-up-on-success" false

# ───────────────────────────────────────────────────────────────────────────
# Cleanup + summary
# ───────────────────────────────────────────────────────────────────────────
rm -rf "$FAKE_DIR"
echo ""
echo "=== Results: $PASS passed, $FAIL failed, $SKIP skipped ==="
[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
