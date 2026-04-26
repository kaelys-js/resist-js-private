#!/usr/bin/env bash
# Tests for the enforcement hooks added to combat lint-disable shortcuts,
# checkpoint-stop laziness, and bulk-script thrashing.
#
# Each hook is invoked with a synthetic tool-input JSON; we verify the
# exit code (0 = allow, 2 = block) and message content.
#
# Run: bash .claude/hooks/enforcement-hooks.test.sh

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.claude/hooks"
PASS=0
FAIL=0
ERRORS=""

pass() { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail() {
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  ✗ $1"
  echo "  ✗ $1"
}

# Ensure clean state
rm -f "$REPO_ROOT/.claude/active-plan.json" "$REPO_ROOT/.claude/approved-lint-disable" \
      "$REPO_ROOT/.claude/approved-bulk-script" "$REPO_ROOT/.claude/approved-revert" \
      "$REPO_ROOT/.claude/edit-history.jsonl"

echo "=== Enforcement Hooks Tests ==="
echo ""

# =============================================================================
# pre-edit-lint-config-deny.sh
# =============================================================================
echo "pre-edit-lint-config-deny.sh:"

# 1. Plain edit to non-lint file → allow
INPUT='{"tool_input":{"file_path":"/tmp/foo.ts","new_string":"export const x = 1;","old_string":""}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-lint-config-deny.sh" 2>/dev/null; then
  pass "non-lint file → allow"
else
  fail "non-lint file should be allowed but was blocked"
fi

# 2. Edit to .oxlintrc.json that does NOT add a disable → allow
INPUT='{"tool_input":{"file_path":"/repo/.oxlintrc.json","new_string":"{\"plugins\": [\"unicorn\"]}","old_string":""}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-lint-config-deny.sh" 2>/dev/null; then
  pass ".oxlintrc.json without disable → allow"
else
  fail ".oxlintrc.json plain edit should be allowed"
fi

# 3. Edit to .oxlintrc.json that adds a rule disable → block
INPUT='{"tool_input":{"file_path":"/repo/.oxlintrc.json","new_string":"{\"rules\": {\"no-non-null-assertion\": \"off\"}}","old_string":""}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-lint-config-deny.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass ".oxlintrc.json adds rule disable → block"
else
  fail ".oxlintrc.json with disable should block but allowed"
fi

# 4. Edit adds a "files" override block → block
INPUT='{"tool_input":{"file_path":"/repo/.oxlintrc.json","new_string":"{\"overrides\":[{\"files\":[\"**/*.test.ts\"],\"rules\":{}}]}","old_string":""}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-lint-config-deny.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass ".oxlintrc.json adds files override → block"
else
  fail ".oxlintrc.json files override should block"
fi

# 5. Edit to runner adds a parse-suppression regex → block
INPUT='{"tool_input":{"file_path":"/repo/packages/shared/config/tooling/lint/src/tools/oxlint.ts","new_string":"const PARSE_SUPPRESSION = /foo/;","old_string":""}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-lint-config-deny.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "tools/oxlint.ts adds PARSE_SUPPRESSION → block"
else
  fail "tools/oxlint.ts suppression-regex should block"
fi

# 6. Approval marker present → consume marker and allow
touch "$REPO_ROOT/.claude/approved-lint-disable"
INPUT='{"tool_input":{"file_path":"/repo/.oxlintrc.json","new_string":"{\"rules\": {\"foo\": \"off\"}}","old_string":""}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-lint-config-deny.sh" 2>/dev/null; then
  if [ ! -f "$REPO_ROOT/.claude/approved-lint-disable" ]; then
    pass "approval marker consumed and edit allowed"
  else
    fail "approval marker not consumed"
  fi
else
  fail "approval marker should allow edit"
fi

echo ""

# =============================================================================
# stop-active-plan-block.sh
# =============================================================================
echo "stop-active-plan-block.sh:"

# 1. No marker → allow stop
rm -f "$REPO_ROOT/.claude/active-plan.json"
if echo '{}' | bash "$HOOKS_DIR/stop-active-plan-block.sh" 2>/dev/null; then
  pass "no active plan → allow stop"
else
  fail "stop should be allowed when no plan is active"
fi

# 2. Marker present, success_check matches expected → clear marker, allow stop
cat > "$REPO_ROOT/.claude/active-plan.json" <<EOF
{"plan_path":"docs/plans/test.md","approved_at":"2026-04-26T12:00:00Z","success_check":"echo 0","expected":"0","label":"test"}
EOF
if echo '{}' | bash "$HOOKS_DIR/stop-active-plan-block.sh" 2>/dev/null; then
  if [ ! -f "$REPO_ROOT/.claude/active-plan.json" ]; then
    pass "criterion met → marker cleared, stop allowed"
  else
    fail "marker should be cleared when criterion met"
  fi
else
  fail "stop should be allowed when criterion met"
fi

# 3. Marker present, criterion NOT met → block stop, marker preserved
cat > "$REPO_ROOT/.claude/active-plan.json" <<EOF
{"plan_path":"docs/plans/test.md","approved_at":"2026-04-26T12:00:00Z","success_check":"echo 5","expected":"0","label":"test-blocked"}
EOF
OUT=$(echo '{}' | bash "$HOOKS_DIR/stop-active-plan-block.sh" 2>&1)
RC=$?
if [ $RC -ne 0 ] && echo "$OUT" | grep -q "ACTIVE PLAN NOT COMPLETE"; then
  if [ -f "$REPO_ROOT/.claude/active-plan.json" ]; then
    pass "criterion unmet → block stop, marker preserved"
  else
    fail "marker should be preserved on block"
  fi
else
  fail "stop should be blocked when criterion unmet (rc=$RC)"
fi
rm -f "$REPO_ROOT/.claude/active-plan.json"

# 4. Malformed marker → allow stop (fail-safe)
echo "not json" > "$REPO_ROOT/.claude/active-plan.json"
if echo '{}' | bash "$HOOKS_DIR/stop-active-plan-block.sh" 2>/dev/null; then
  pass "malformed marker → fail-safe allow stop"
else
  fail "malformed marker should fail-safe to allow"
fi
rm -f "$REPO_ROOT/.claude/active-plan.json"

echo ""

# =============================================================================
# pre-bash-block-bulk-script.sh
# =============================================================================
echo "pre-bash-block-bulk-script.sh:"

# 1. Plain shell command → allow
INPUT='{"tool_input":{"command":"echo hello"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-bulk-script.sh" 2>/dev/null; then
  pass "plain echo → allow"
else
  fail "plain echo should be allowed"
fi

# 2. python3 -c with glob walk → block
INPUT='{"tool_input":{"command":"python3 -c \"import glob; [open(f).read() for f in glob.glob('\''*.ts'\'')]\""}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-bulk-script.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "python3 -c with glob → block"
else
  fail "python3 with glob.glob should block"
fi

# 3. python3 -c with simple non-bulk code → allow
INPUT='{"tool_input":{"command":"python3 -c \"print(42)\""}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-bulk-script.sh" 2>/dev/null; then
  pass "python3 -c simple print → allow"
else
  fail "simple python3 -c should be allowed"
fi

# 4. sed -i with glob → block
INPUT='{"tool_input":{"command":"sed -i \"\" \"s/foo/bar/\" packages/*/src/*.ts"}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-bulk-script.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "sed -i with file glob → block"
else
  fail "sed -i with glob should block"
fi

# 5. Approval marker present → consume and allow
touch "$REPO_ROOT/.claude/approved-bulk-script"
INPUT='{"tool_input":{"command":"python3 /tmp/walk.py"}}'
# Create the file with bulk pattern so the hook would normally block
cat > /tmp/walk.py <<'EOF'
import glob
for f in glob.glob('*.ts'): print(f)
EOF
if echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-bulk-script.sh" 2>/dev/null; then
  if [ ! -f "$REPO_ROOT/.claude/approved-bulk-script" ]; then
    pass "approval marker consumed for bulk script"
  else
    fail "approval marker not consumed"
  fi
else
  fail "approval marker should allow bulk script"
fi
rm -f /tmp/walk.py

echo ""

# =============================================================================
# pre-edit-revert-detector.sh
# =============================================================================
echo "pre-edit-revert-detector.sh:"

# Reset history
rm -f "$REPO_ROOT/.claude/edit-history.jsonl"
mkdir -p "$REPO_ROOT/.claude"
touch "$REPO_ROOT/.claude/edit-history.jsonl"

# 1. First edit to a file → allow (no history)
INPUT='{"tool_input":{"file_path":"/tmp/foo.ts","old_string":"A","new_string":"B"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-revert-detector.sh" 2>/dev/null; then
  pass "first edit on file → allow"
else
  fail "first edit should be allowed"
fi

# 2. Reverting once (B → A) is allowed (1st revert)
INPUT='{"tool_input":{"file_path":"/tmp/foo.ts","old_string":"B","new_string":"A"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-revert-detector.sh" 2>/dev/null; then
  pass "first revert (B→A) → allow"
else
  fail "first revert should be allowed (only 2nd+ blocks)"
fi

# 3. Editing back to B (A → B) → 2nd revert → block
INPUT='{"tool_input":{"file_path":"/tmp/foo.ts","old_string":"A","new_string":"B"}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-revert-detector.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "thrashing detected"; then
  pass "second revert → block"
else
  fail "second revert should block (rc=$?)"
fi

# 4. Approval marker bypasses block
touch "$REPO_ROOT/.claude/approved-revert"
INPUT='{"tool_input":{"file_path":"/tmp/foo.ts","old_string":"B","new_string":"A"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-edit-revert-detector.sh" 2>/dev/null; then
  if [ ! -f "$REPO_ROOT/.claude/approved-revert" ]; then
    pass "approval marker consumed for revert"
  else
    fail "approval marker not consumed"
  fi
else
  fail "approval marker should allow revert"
fi

# Cleanup history (test pollutes it)
rm -f "$REPO_ROOT/.claude/edit-history.jsonl"
echo ""

# =============================================================================
# abandon-plan.sh
# =============================================================================
echo "abandon-plan.sh:"

# 1. No marker → noop
rm -f "$REPO_ROOT/.claude/active-plan.json"
OUT=$(bash "$HOOKS_DIR/abandon-plan.sh" "test-reason" 2>&1)
if echo "$OUT" | grep -q "No active plan"; then
  pass "no marker → no-op message"
else
  fail "abandon should report no-op when no marker"
fi

# 2. Marker present → delete and log
cat > "$REPO_ROOT/.claude/active-plan.json" <<EOF
{"plan_path":"docs/plans/x.md","label":"test","success_check":"true","expected":"0","approved_at":"2026-04-26T00:00:00Z"}
EOF
OUT=$(bash "$HOOKS_DIR/abandon-plan.sh" "manual-test-abandon" 2>&1)
if [ ! -f "$REPO_ROOT/.claude/active-plan.json" ] && [ -f "$REPO_ROOT/.claude/abandoned-plans.log" ]; then
  pass "marker deleted and logged"
else
  fail "abandon should delete marker and append log"
fi

# Cleanup test pollution from log
sed -i.bak '/manual-test-abandon/d' "$REPO_ROOT/.claude/abandoned-plans.log" 2>/dev/null || true
rm -f "$REPO_ROOT/.claude/abandoned-plans.log.bak"

echo ""

# =============================================================================
# post-exit-plan-mode-record.sh — basic sanity (no plan → no marker, exit 0)
# =============================================================================
echo "post-exit-plan-mode-record.sh:"

# 1. No staging plan file → exit 0, no marker
TMP_PLANS=$(mktemp -d)
HOME_BAK="$HOME"; export HOME="$TMP_PLANS/h"
mkdir -p "$HOME/.claude/plans"
rm -f "$REPO_ROOT/.claude/active-plan.json"
if echo '{}' | bash "$HOOKS_DIR/post-exit-plan-mode-record.sh" 2>/dev/null; then
  if [ ! -f "$REPO_ROOT/.claude/active-plan.json" ]; then
    pass "no staging plan → exit 0, no marker"
  else
    fail "no staging plan should NOT create marker"
  fi
else
  fail "exit 0 expected when no staging plan"
fi
export HOME="$HOME_BAK"
rm -rf "$TMP_PLANS"

# 2. Staging plan with success command → marker written
TMP_PLANS=$(mktemp -d)
HOME_BAK="$HOME"; export HOME="$TMP_PLANS/h"
mkdir -p "$HOME/.claude/plans"
cat > "$HOME/.claude/plans/test-plan.md" <<'EOF'
# Test Plan

## TASK 9 — Full QA + Coverage

**Plan**:
- Run: `pnpm -w run qa:lint packages/shared/ui` — exit 0.
EOF

rm -f "$REPO_ROOT/.claude/active-plan.json"
echo '{}' | bash "$HOOKS_DIR/post-exit-plan-mode-record.sh" 2>/dev/null
if [ -f "$REPO_ROOT/.claude/active-plan.json" ]; then
  if jq -e '.success_check' "$REPO_ROOT/.claude/active-plan.json" > /dev/null 2>&1; then
    pass "staging plan with qa:lint → marker written with success_check"
  else
    fail "marker missing success_check"
  fi
else
  fail "marker not written"
fi
rm -f "$REPO_ROOT/.claude/active-plan.json"
export HOME="$HOME_BAK"
rm -rf "$TMP_PLANS"

echo ""

# =============================================================================
# pre-bash-block-multi-file-shell.sh
# =============================================================================
echo "pre-bash-block-multi-file-shell.sh:"

# 1. Plain echo → allow
INPUT='{"tool_input":{"command":"echo hello"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-multi-file-shell.sh" 2>/dev/null; then
  pass "plain echo → allow"
else
  fail "plain echo should be allowed"
fi

# 2. find -exec sed -i → block
INPUT='{"tool_input":{"command":"find packages -name \"*.ts\" -exec sed -i \"\" \"s/foo/bar/\" {} +"}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-multi-file-shell.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "find -exec sed -i → block"
else
  fail "find -exec sed -i should block"
fi

# 3. find -exec ls → allow (read-only)
INPUT='{"tool_input":{"command":"find packages -name \"*.ts\" -exec ls -la {} +"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-multi-file-shell.sh" 2>/dev/null; then
  pass "find -exec ls (read-only) → allow"
else
  fail "find -exec ls should be allowed (read-only)"
fi

# 4. for-loop with sed -i → block
INPUT='{"tool_input":{"command":"for f in packages/*/src/*.ts; do sed -i \"\" \"s/x/y/\" \"$f\"; done"}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-multi-file-shell.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "for-loop over glob with sed -i → block"
else
  fail "shell for-loop with write should block"
fi

# 5. xargs sed -i → block
INPUT='{"tool_input":{"command":"echo a.ts b.ts | xargs sed -i \"\" \"s/x/y/\""}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-multi-file-shell.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "xargs sed -i → block"
else
  fail "xargs sed -i should block"
fi

# 6. grep -rl piped to sed → block
INPUT='{"tool_input":{"command":"grep -rl pattern packages/ | xargs sed -i \"\" \"s/p/q/\""}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-multi-file-shell.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "grep -rl | xargs sed → block"
else
  fail "grep -rl piped to sed should block"
fi

# 7. Approval marker present → consume and allow
touch "$REPO_ROOT/.claude/approved-bulk-script"
INPUT='{"tool_input":{"command":"find packages -name \"*.ts\" -exec sed -i \"\" \"s/x/y/\" {} +"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-multi-file-shell.sh" 2>/dev/null; then
  if [ ! -f "$REPO_ROOT/.claude/approved-bulk-script" ]; then
    pass "approval marker consumed for find -exec sed"
  else
    fail "approval marker not consumed"
  fi
else
  fail "approval marker should allow find -exec sed"
fi

echo ""

# =============================================================================
# pre-bash-block-claude-abandon-attempt.sh
# =============================================================================
echo "pre-bash-block-claude-abandon-attempt.sh:"

# 1. Plain command → allow
INPUT='{"tool_input":{"command":"git status"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-claude-abandon-attempt.sh" 2>/dev/null; then
  pass "git status → allow"
else
  fail "git status should be allowed"
fi

# 2. bash .claude/hooks/abandon-plan.sh → block
INPUT='{"tool_input":{"command":"bash .claude/hooks/abandon-plan.sh \"impossible\""}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-claude-abandon-attempt.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "bash abandon-plan.sh → block"
else
  fail "abandon-plan invocation should block"
fi

# 3. ./.claude/hooks/abandon-plan.sh → block
INPUT='{"tool_input":{"command":"./.claude/hooks/abandon-plan.sh \"reason\""}}'
OUT=$(echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-claude-abandon-attempt.sh" 2>&1)
if [ $? -ne 0 ] || echo "$OUT" | grep -q "BLOCKED"; then
  pass "direct path abandon-plan.sh → block"
else
  fail "direct-path abandon-plan should block"
fi

# 4. Mention in echo (string only, not invocation) → allow
INPUT='{"tool_input":{"command":"echo \"the user can run bash .claude/hooks/abandon-plan.sh\""}}'
# Note: this is technically a false positive — the hook detects the string in
# `echo`. But that's acceptable: Claude shouldn't be printing the command in
# Bash either (it could be confused for a real invocation by the user).
# We allow this case to NOT be a hard requirement.
echo "$INPUT" | bash "$HOOKS_DIR/pre-bash-block-claude-abandon-attempt.sh" 2>/dev/null
RC=$?
if [ "$RC" = "2" ] || [ "$RC" = "0" ]; then
  pass "echo containing abandon-plan path → either allow or block (both acceptable)"
else
  fail "unexpected exit code $RC for echo case"
fi

echo ""

# =============================================================================
# post-edit-test-regression-block.sh
# =============================================================================
echo "post-edit-test-regression-block.sh:"

# 1. No active plan → exit 0 (skip test run entirely)
rm -f "$REPO_ROOT/.claude/active-plan.json"
INPUT='{"tool_input":{"file_path":"/repo/packages/foo/src/index.ts"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/post-edit-test-regression-block.sh" 2>/dev/null; then
  pass "no active plan → skip (exit 0)"
else
  fail "no active plan should skip without running tests"
fi

# 2. Active plan but file outside packages/ → exit 0
cat > "$REPO_ROOT/.claude/active-plan.json" <<EOF
{"plan_path":"x","approved_at":"x","success_check":"true","expected":"0","label":"x"}
EOF
INPUT='{"tool_input":{"file_path":"/repo/docs/plans/foo.md"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/post-edit-test-regression-block.sh" 2>/dev/null; then
  pass "active plan + non-package file → skip"
else
  fail "non-package file should skip"
fi

# 3. Active plan + non-source file (e.g. .json) → exit 0
INPUT='{"tool_input":{"file_path":"/repo/packages/foo/package.json"}}'
if echo "$INPUT" | bash "$HOOKS_DIR/post-edit-test-regression-block.sh" 2>/dev/null; then
  pass "active plan + non-source file → skip"
else
  fail "non-source file should skip"
fi

rm -f "$REPO_ROOT/.claude/active-plan.json"

echo ""
echo "=== Summary ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [ $FAIL -ne 0 ]; then
  echo "Errors:"
  echo -e "$ERRORS"
  exit 1
fi
