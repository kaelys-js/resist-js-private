#!/bin/bash
# Session Start Orientation Hook
# Fires on startup, resume, compaction, and clear.
# Injects session state + short orientation.
# All rules are in CLAUDE.md and MEMORY.md — this hook does NOT duplicate them.

MEMORY_DIR="$HOME/.claude/projects/-Users-coleb-Desktop-webforge/memory"
SESSION_STATE="$MEMORY_DIR/session-state.md"

cat << 'RULES'
=== POST-COMPACTION REMINDER ===
Resume work immediately. Read the session state below and continue.
If the user is present, respond to them before running any tools.
All behavioral and code rules are in CLAUDE.md and MEMORY.md — re-read them.
=== END ===
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

=== SESSION ORIENTATION ===
1. READ the session state above (if present)
2. IDENTIFY which workflow applies (expand-feature, build-editor, fix-bug, etc.)
3. If a design doc or implementation plan exists in docs/plans/ — RE-READ it before working
4. If a changelog was approved — RE-READ it and use it as your checklist
5. NEVER work from memory alone after compaction — verify from source files
=== END ORIENTATION ===
ORIENTATION
