#!/bin/bash
# Hook integration tests — verify all hooks work correctly and no paralysis patterns exist.
# Run: bash .claude/hooks/hooks.test.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.claude/hooks"
SETTINGS="$REPO_ROOT/.claude/settings.json"
PASS=0
FAIL=0
ERRORS=""

pass() { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); ERRORS="$ERRORS\n  ✗ $1"; echo "  ✗ $1"; }

echo "=== Hook Integration Tests ==="
echo ""

# =============================================================================
# 1. Settings.json validation
# =============================================================================
echo "Settings.json validation:"

# Every hook file referenced in settings must exist
REFERENCED_HOOKS=$(grep -oE '\.claude/hooks/[a-z-]+\.sh' "$SETTINGS" | sort -u | sed "s|^|$REPO_ROOT/|")
ALL_EXIST=true
for hook in $REFERENCED_HOOKS; do
  if [ ! -f "$hook" ]; then
    fail "Referenced hook missing: $(basename $hook)"
    ALL_EXIST=false
  fi
done
if $ALL_EXIST; then
  pass "All referenced hooks exist on disk"
fi

# No empty matchers in settings (cause all-tool firing)
EMPTY_MATCHERS=$(python3 -c "
import json
with open('$SETTINGS') as f:
    s = json.load(f)
for event_type, entries in s.get('hooks', {}).items():
    for entry in entries:
        if entry.get('matcher', '') == '':
            print(f'{event_type}: empty matcher')
" 2>/dev/null)
if [ -z "$EMPTY_MATCHERS" ]; then
  pass "No empty matchers in settings"
else
  fail "Empty matchers found: $EMPTY_MATCHERS"
fi

# No PostToolUse hooks (they caused paralysis)
POST_HOOKS=$(python3 -c "
import json
with open('$SETTINGS') as f:
    s = json.load(f)
entries = s.get('hooks', {}).get('PostToolUse', [])
for e in entries:
    if e.get('hooks'):
        print(e.get('matcher', 'unknown'))
" 2>/dev/null)
if [ -z "$POST_HOOKS" ]; then
  pass "No active PostToolUse hooks"
else
  fail "Active PostToolUse hooks found: $POST_HOOKS"
fi

echo ""

# =============================================================================
# 2. Orphaned hook files (exist on disk but not in settings)
# =============================================================================
echo "Orphaned hook file check:"

DISK_HOOKS=$(ls "$HOOKS_DIR"/*.sh 2>/dev/null | grep -v hooks.test.sh | sort)
for hook_file in $DISK_HOOKS; do
  BASENAME=$(basename "$hook_file")
  if ! grep -q "$BASENAME" "$SETTINGS"; then
    # Check if it's a neutralized hook (exit 0 only)
    LINES=$(grep -v '^#' "$hook_file" | grep -v '^$' | grep -v 'exit 0' | wc -l | tr -d ' ')
    if [ "$LINES" = "0" ]; then
      pass "Neutralized hook OK: $BASENAME (exit 0 only)"
    else
      fail "Orphaned active hook: $BASENAME (not in settings but has code)"
    fi
  else
    pass "Hook registered: $BASENAME"
  fi
done

echo ""

# =============================================================================
# 3. No paralysis patterns in hook output
# =============================================================================
echo "Paralysis pattern checks:"

# Test: pre-check-user-messages.sh should NOT exist
if [ ! -f "$HOOKS_DIR/pre-check-user-messages.sh" ]; then
  pass "pre-check-user-messages.sh deleted (caused paralysis)"
else
  fail "pre-check-user-messages.sh still exists!"
fi

# Test: post-edit-verify.sh should be neutralized (exit 0 only)
if [ -f "$HOOKS_DIR/post-edit-verify.sh" ]; then
  ACTIVE_LINES=$(grep -v '^#' "$HOOKS_DIR/post-edit-verify.sh" | grep -v '^$' | grep -v 'exit 0' | wc -l | tr -d ' ')
  if [ "$ACTIVE_LINES" = "0" ]; then
    pass "post-edit-verify.sh neutralized"
  else
    fail "post-edit-verify.sh still has active code ($ACTIVE_LINES lines)"
  fi
else
  pass "post-edit-verify.sh removed"
fi

# Test: No hook outputs "RESPOND TO THEM FIRST" or "CHECK: Did the user send"
PARALYSIS_PATTERNS="RESPOND TO THEM FIRST|CHECK.*Did the user send|MANDATORY VERIFICATION"
for hook_file in $DISK_HOOKS; do
  BASENAME=$(basename "$hook_file")
  if grep -qE "$PARALYSIS_PATTERNS" "$hook_file"; then
    fail "$BASENAME contains paralysis pattern"
  fi
done
pass "No paralysis patterns in any hook file"

# Test: session-state-reminder.sh deleted
if [ ! -f "$HOOKS_DIR/session-state-reminder.sh" ]; then
  pass "session-state-reminder.sh deleted (referenced deleted file)"
else
  fail "session-state-reminder.sh still exists"
fi

# Test: update-session-tasks.sh deleted
if [ ! -f "$HOOKS_DIR/update-session-tasks.sh" ]; then
  pass "update-session-tasks.sh deleted (referenced deleted file)"
else
  fail "update-session-tasks.sh still exists"
fi

# Test: post-compaction-force-action.sh deleted
if [ ! -f "$HOOKS_DIR/post-compaction-force-action.sh" ]; then
  pass "post-compaction-force-action.sh deleted (invalid decision type)"
else
  fail "post-compaction-force-action.sh still exists"
fi

echo ""

# =============================================================================
# 4. Active hook behavior tests
# =============================================================================
echo "Active hook behavior tests:"

# pre-destructive-git.sh: should block git stash
RESULT=$(echo '{"tool_input":{"command":"git stash"}}' | bash "$HOOKS_DIR/pre-destructive-git.sh")
if echo "$RESULT" | grep -q '"ask"'; then
  pass "pre-destructive-git.sh blocks git stash"
else
  fail "pre-destructive-git.sh does NOT block git stash"
fi

# pre-destructive-git.sh: should allow normal git commands
RESULT=$(echo '{"tool_input":{"command":"git status"}}' | bash "$HOOKS_DIR/pre-destructive-git.sh")
if [ -z "$RESULT" ]; then
  pass "pre-destructive-git.sh allows git status"
else
  fail "pre-destructive-git.sh incorrectly blocks git status"
fi

# pre-destructive-git.sh: should block git revert
RESULT=$(echo '{"tool_input":{"command":"git revert HEAD"}}' | bash "$HOOKS_DIR/pre-destructive-git.sh")
if echo "$RESULT" | grep -q '"ask"'; then
  pass "pre-destructive-git.sh blocks git revert"
else
  fail "pre-destructive-git.sh does NOT block git revert"
fi

# pre-destructive-git.sh: should block git reset
RESULT=$(echo '{"tool_input":{"command":"git reset HEAD~1"}}' | bash "$HOOKS_DIR/pre-destructive-git.sh")
if echo "$RESULT" | grep -q '"ask"'; then
  pass "pre-destructive-git.sh blocks git reset"
else
  fail "pre-destructive-git.sh does NOT block git reset"
fi

# pre-destructive-git.sh: should allow git reset --soft
RESULT=$(echo '{"tool_input":{"command":"git reset --soft HEAD~1"}}' | bash "$HOOKS_DIR/pre-destructive-git.sh")
if [ -z "$RESULT" ]; then
  pass "pre-destructive-git.sh allows git reset --soft"
else
  fail "pre-destructive-git.sh incorrectly blocks git reset --soft"
fi

# pre-qa-commands.sh: should block npx vitest
RESULT=$(echo '{"tool_input":{"command":"npx vitest run"}}' | bash "$HOOKS_DIR/pre-qa-commands.sh")
if echo "$RESULT" | grep -q '"deny"'; then
  pass "pre-qa-commands.sh blocks npx vitest"
else
  fail "pre-qa-commands.sh does NOT block npx vitest"
fi

# pre-qa-commands.sh: should block cd + qa:test
RESULT=$(echo '{"tool_input":{"command":"cd packages/shared/locale && pnpm qa:test"}}' | bash "$HOOKS_DIR/pre-qa-commands.sh")
if echo "$RESULT" | grep -q '"deny"'; then
  pass "pre-qa-commands.sh blocks cd + qa command"
else
  fail "pre-qa-commands.sh does NOT block cd + qa command"
fi

# pre-qa-commands.sh: should allow pnpm -r --filter
RESULT=$(echo '{"tool_input":{"command":"pnpm -r --filter @/locale run qa:test"}}' | bash "$HOOKS_DIR/pre-qa-commands.sh")
if [ -z "$RESULT" ]; then
  pass "pre-qa-commands.sh allows pnpm -r --filter"
else
  fail "pre-qa-commands.sh incorrectly blocks pnpm -r --filter"
fi

# pre-lint-rule-edit.sh: should ask for lint rule files
RESULT=$(echo "{\"tool_input\":{\"file_path\":\"$REPO_ROOT/packages/shared/config/tooling/lint/src/rules/typescript/no-throw.ts\"}}" | bash "$HOOKS_DIR/pre-lint-rule-edit.sh")
if echo "$RESULT" | grep -q '"ask"'; then
  pass "pre-lint-rule-edit.sh asks for lint rule files"
else
  fail "pre-lint-rule-edit.sh does NOT ask for lint rule files"
fi

# pre-lint-rule-edit.sh: should allow non-rule files
RESULT=$(echo "{\"tool_input\":{\"file_path\":\"$REPO_ROOT/packages/shared/locale/src/detect.ts\"}}" | bash "$HOOKS_DIR/pre-lint-rule-edit.sh")
if echo "$RESULT" | grep -q '"allow"'; then
  pass "pre-lint-rule-edit.sh allows non-rule files"
else
  fail "pre-lint-rule-edit.sh does NOT allow non-rule files"
fi

# pre-agent-approval.sh: should always ask
RESULT=$(echo '{"tool_input":{"description":"Fix something"}}' | bash "$HOOKS_DIR/pre-agent-approval.sh")
if echo "$RESULT" | grep -q '"ask"'; then
  pass "pre-agent-approval.sh asks for approval"
else
  fail "pre-agent-approval.sh does NOT ask for approval"
fi

# pre-git-add-all.sh: should ask for git add -A
RESULT=$(echo '{"tool_input":{"command":"git add -A"}}' | bash "$HOOKS_DIR/pre-git-add-all.sh")
if echo "$RESULT" | grep -q '"ask"'; then
  pass "pre-git-add-all.sh asks for git add -A"
else
  fail "pre-git-add-all.sh does NOT ask for git add -A"
fi

# session-start-orientation.sh: should output reminder
RESULT=$(bash "$HOOKS_DIR/session-start-orientation.sh")
if echo "$RESULT" | grep -q "user.*most recent message"; then
  pass "session-start-orientation.sh outputs reminder"
else
  fail "session-start-orientation.sh missing reminder"
fi

# session-start-orientation.sh: should NOT reference session-state.md
if grep -q "session-state" "$HOOKS_DIR/session-start-orientation.sh"; then
  fail "session-start-orientation.sh still references session-state.md"
else
  pass "session-start-orientation.sh no session-state.md reference"
fi

echo ""

# =============================================================================
# 5. CLAUDE.md behavioral rules check
# =============================================================================
echo "CLAUDE.md rules check:"

CLAUDE_MD="$REPO_ROOT/CLAUDE.md"

if grep -q "No response requested" "$CLAUDE_MD"; then
  pass "CLAUDE.md forbids 'No response requested'"
else
  fail "CLAUDE.md missing 'No response requested' prohibition"
fi

if grep -q "TODO lists are STALE after compaction" "$CLAUDE_MD"; then
  pass "CLAUDE.md has stale TODO warning"
else
  fail "CLAUDE.md missing stale TODO warning"
fi

if grep -q "NEVER apologize" "$CLAUDE_MD"; then
  pass "CLAUDE.md has no-apologize rule"
else
  fail "CLAUDE.md missing no-apologize rule"
fi

if grep -q "Basic edits take 1 tool call" "$CLAUDE_MD"; then
  pass "CLAUDE.md has efficiency rule"
else
  fail "CLAUDE.md missing efficiency rule"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi

echo ""
echo "All tests passed."
exit 0
