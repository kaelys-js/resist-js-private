#!/bin/bash
# Debug: log stop hook input to understand format, then allow
INPUT=$(cat)
echo "$INPUT" >> /tmp/stop-hook-debug.log
echo '{"decision": "allow"}'
