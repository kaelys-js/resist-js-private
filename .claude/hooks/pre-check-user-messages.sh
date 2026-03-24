#!/bin/bash
# Pre-tool hook: remind to check for user messages before every tool call
echo '{"decision": "allow", "message": "⚠️ CHECK: Did the user send a message? If yes, RESPOND FIRST before using this tool."}'
