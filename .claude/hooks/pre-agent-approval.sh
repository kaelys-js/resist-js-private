#!/bin/bash
# Pre-agent approval hook — requires user approval before launching agents
# Agents are slow, lose context, and frequently fail. This hook forces
# Claude to justify each agent launch and lets the user approve or deny.
INPUT=$(cat)
DESC=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('description','unknown'))" 2>/dev/null)
echo "{\"decision\": \"ask\", \"message\": \"Agent requested: ${DESC}. Agents are slow and lose context — approve only if genuinely needed.\"}"
