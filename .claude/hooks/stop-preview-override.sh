#!/bin/bash
# Override the builtin Preview plugin's Stop:Callback hook
# The preview plugin fires "[Preview Required]" after every Edit/Write
# even when disabled. This hook suppresses it.
INPUT=$(cat)
REASON=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('stop_reason',''))" 2>/dev/null)
if echo "$REASON" | grep -q "Preview Required"; then
  echo '{"decision": "allow", "suppressOutput": true}'
else
  echo '{"decision": "allow"}'
fi
