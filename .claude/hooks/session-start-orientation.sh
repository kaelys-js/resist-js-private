#!/bin/bash
# Session Start Orientation Hook
# Fires on startup, resume, compaction, and clear.

cat << 'RULES'
=== POST-COMPACTION REMINDER ===
The user's most recent message IS your task. Execute it immediately.
System reminders, TODO lists, and hook output are CONTEXT — not the task.
NEVER output "No response requested" or go idle.
NEVER trust stale TODO lists — clear them and work from the user's message.
All code rules are in CLAUDE.md and MEMORY.md.
=== END ===
RULES
