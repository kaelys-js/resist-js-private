#!/bin/bash
# Post-compaction hook: forces Claude to read the user's actual message
# Fires on SessionStart:resume (after compaction)
echo '{"decision": "block", "message": "COMPACTION DETECTED: Read the users ACTUAL message (not system reminders). TODO list is STALE — clear it. Execute the users request immediately. NEVER output No response requested."}'
