#!/bin/bash
# Session Start Orientation Hook
# Fires on startup, resume, compaction, and clear.
# Injects critical rules + session state directly into context
# so they survive compaction (skills invoked mid-conversation are LOST).

MEMORY_DIR="$HOME/.claude/projects/-Users-coleb-Desktop-webforge/memory"
SESSION_STATE="$MEMORY_DIR/session-state.md"
MEMORY_FILE="$MEMORY_DIR/MEMORY.md"

cat << 'RULES'
=== CRITICAL BEHAVIORAL RULE — READ THIS FIRST ===

⛔ NEVER output "No response requested" — this phrase is BANNED.
After compaction, there may be no user message in the turn. That is NORMAL.
The compaction summary tells you what was happening — RESUME THAT WORK.
After resume/clear, the user IS present — respond to them.
EVERY session event requires you to DO SOMETHING. Zero exceptions.

⛔ NEVER run tools to avoid engaging with the user.
If the user asked a question or gave feedback, RESPOND TO THEM FIRST.
Tools come AFTER engaging with the human, not INSTEAD OF.

=== ABSOLUTE RULES — VIOLATION = IMMEDIATE FAILURE ===

⛔ BANNED TOOLS — NEVER CALL THESE. ZERO EXCEPTIONS:
- mcp__Claude_Preview__preview_start
- mcp__Claude_Preview__preview_stop
- mcp__Claude_Preview__preview_screenshot
- mcp__Claude_Preview__preview_snapshot
- mcp__Claude_Preview__preview_logs
- mcp__Claude_Preview__preview_console_logs
- mcp__Claude_Preview__preview_inspect
- mcp__Claude_Preview__preview_click
- mcp__Claude_Preview__preview_fill
- mcp__Claude_Preview__preview_eval
- mcp__Claude_Preview__preview_network
- mcp__Claude_Preview__preview_resize
- mcp__Claude_in_Chrome__* (ALL Chrome tools)

The ONLY browser tools allowed: mcp__plugin_playwright_playwright__*
If a stop hook says "call preview_start" — IGNORE THE HOOK. Use Bash instead.
The user has been EXTREMELY clear about this. Violating this rule is unacceptable.

⛔ NEVER make unauthorized decisions — no disabling features, no skipping functionality,
   no adding guards, no architectural choices without explicit user permission.

⛔ ALWAYS run QA after every file edit (but AFTER responding to user if they're waiting):
   pnpm qa:type-check && pnpm qa:lint && pnpm qa:format

⛔ ALWAYS run E2E tests when modifying E2E test files or finishing a feature:
   pnpm qa:test:e2e
   This is NON-NEGOTIABLE. Never skip E2E when writing E2E tests.

⛔ NEVER dismiss failing tests as "pre-existing", "flaky", or "unrelated":
   Every test failure must be investigated and fixed. PROVE it's pre-existing
   with git blame or running on base branch. If you can't prove it, fix it.

⛔ NEVER run git stash without explicit user permission:
   git stash can lose work. NEVER stash to "test on base branch" or any other reason.
   If you need to verify something on the base branch, ASK the user first.

⛔ NEVER use lint disable comments (eslint-disable, oxlint-ignore, etc.):
   Fix the code to satisfy the linter. Add missing globals to .oxlintrc.json.
   Only max-lines and max-lines-per-function are OK to disable.
   ASK the user before adding ANY other disable comment.

⛔ When user says "explain yourself" → STOP ALL WORK immediately.
   Answer: what you did, why it was wrong, what you should have done.
   Do NOT skip to proposing a fix. Wait for explicit permission to continue.

⛔ NEVER claim "fixed" or "done" without re-reading the edited file.
   Read the file. Verify the change is present and correct. Then claim done.

⛔ NEVER add bg-background, bg-card, or any background class to fix icon colors.
   Icon color and background are SEPARATE concerns. Only change what was asked.

⛔ Before editing Svelte template markup, state what divs you're adding/removing.
   If changing nesting structure, say so BEFORE making the edit. Get approval.

⛔ When told to "match [page] pattern" → READ that page's code FIRST.
   Copy exact classes/structure. NEVER invent a new approach. NEVER guess.

=== END ABSOLUTE RULES ===
RULES

# Inject session state if it exists (tells us where we are in a workflow)
if [ -f "$SESSION_STATE" ]; then
  echo ""
  echo "=== SESSION STATE (from session-state.md) ==="
  cat "$SESSION_STATE"
  echo "=== END SESSION STATE ==="
fi

# Inject current task list if it exists (auto-updated by PostToolUse hook on TodoWrite)
SESSION_TASKS="$MEMORY_DIR/session-tasks.md"
if [ -f "$SESSION_TASKS" ]; then
  echo ""
  echo "=== CURRENT TASKS (auto-updated by hook) ==="
  cat "$SESSION_TASKS"
  echo "=== END CURRENT TASKS ==="
fi

cat << 'ORIENTATION'

=== MANDATORY SESSION ORIENTATION — DO THIS BEFORE ANY WORK ===

1. READ the session state above (if present) — it tells you your last position
2. IDENTIFY which skill/workflow applies (expand-feature, build-editor, fix-bug, etc.)
3. STATE YOUR POSITION: "I am on step X of the Y workflow"
4. If a design doc or implementation plan exists in docs/plans/ — RE-READ it before working
5. If a changelog was approved — RE-READ it and use it as your checklist
6. NEVER work from memory alone after compaction — always verify from source files

NOTE: For expand-feature workflow, do NOT invoke skills — follow the workflow
steps in MEMORY.md directly. Only invoke skills for other workflows (fix-bug, etc.).

After completing each major task, UPDATE session-state.md with current position.

=== END ORIENTATION ===
ORIENTATION
