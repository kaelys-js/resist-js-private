#!/bin/bash
# Pre-tool hook: validates plan file quality before allowing Write/Bash to create plan files.
# Triggers on Write tool calls targeting docs/plans/*.md files.
# Also triggers on Bash calls that write to docs/plans/*.md (cat > heredoc pattern).
#
# Checks:
#   1. Plan must have a "Register Rules + Config" task (TASK N+1)
#   2. Plan must have a "Full QA + Coverage" task (TASK N+2)
#   3. Plan must have a "Final Verification + Commit" task (TASK N+3)
#   4. Each of these tasks must have **Status**, **Plan**, **Verification** sections
#   5. The QA task must list specific pnpm commands
#   6. The verification task must list specific verification bullets

INPUT=$(cat)

# Extract tool input — check if this targets a plan file
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    inp = d.get('tool_input', {})
    # For Write tool: check file_path
    fp = inp.get('file_path', '')
    if fp:
        print(fp)
        sys.exit(0)
    # For Bash tool: check if command writes to a plan file
    cmd = inp.get('command', '')
    if 'docs/plans/' in cmd and ('.md' in cmd) and ('>' in cmd or 'cat' in cmd or 'EOF' in cmd):
        # Extract target file from command
        import re
        # Match patterns like: cat > path/file.md << 'EOF'  or  > path/file.md
        m = re.search(r'>\s*(\S*docs/plans/\S+\.md)', cmd)
        if m:
            print(m.group(1))
            sys.exit(0)
    print('')
except Exception:
    print('')
" 2>/dev/null)

# Only validate plan files
if [[ -z "$FILE_PATH" ]] || [[ "$FILE_PATH" != *"docs/plans/"* ]] || [[ "$FILE_PATH" != *".md" ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

# Extract the content being written
CONTENT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    inp = d.get('tool_input', {})
    # For Write tool
    c = inp.get('content', '')
    if c:
        print(c)
        sys.exit(0)
    # For Bash tool — the content is in the heredoc
    cmd = inp.get('command', '')
    print(cmd)
except Exception:
    print('')
" 2>/dev/null)

# If no content available (e.g., editing existing file), allow
if [[ -z "$CONTENT" ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

ERRORS=""

# Check 1: Must have a "Register Rules + Config" task
if ! echo "$CONTENT" | grep -qi "Register.*Rules.*Config\|Register.*Config"; then
    ERRORS="${ERRORS}\n- Missing 'Register Rules + Config' task (required as TASK N+1)"
fi

# Check 2: Must have a "Full QA + Coverage" task
if ! echo "$CONTENT" | grep -qi "Full QA.*Coverage\|QA.*Coverage"; then
    ERRORS="${ERRORS}\n- Missing 'Full QA + Coverage' task (required as TASK N+2)"
fi

# Check 3: Must have a "Final Verification + Commit" task
if ! echo "$CONTENT" | grep -qi "Final Verification.*Commit"; then
    ERRORS="${ERRORS}\n- Missing 'Final Verification + Commit' task (required as TASK N+3)"
fi

# Check 4: QA task must list pnpm commands
if echo "$CONTENT" | grep -qi "Full QA"; then
    QA_SECTION=$(echo "$CONTENT" | python3 -c "
import sys
content = sys.stdin.read()
# Find the QA section
import re
m = re.search(r'##\s+TASK\s+\d+\s*—\s*Full QA.*?(?=##\s+TASK|\Z)', content, re.DOTALL | re.IGNORECASE)
if m:
    section = m.group(0)
    if 'pnpm' not in section:
        print('missing_pnpm')
    else:
        print('ok')
else:
    print('missing_section')
" 2>/dev/null)
    if [[ "$QA_SECTION" == "missing_pnpm" ]]; then
        ERRORS="${ERRORS}\n- QA task must list specific pnpm commands (qa:lint, qa:test, qa:format:check, qa:test:coverage)"
    fi
fi

# Check 5: Final Verification task must have verification bullets
if echo "$CONTENT" | grep -qi "Final Verification"; then
    VERIFY_SECTION=$(echo "$CONTENT" | python3 -c "
import sys
content = sys.stdin.read()
import re
m = re.search(r'##\s+TASK\s+\d+\s*—\s*Final Verification.*?(?=##\s+TASK|\Z)', content, re.DOTALL | re.IGNORECASE)
if m:
    section = m.group(0)
    if 'Verify' not in section and 'verify' not in section:
        print('missing_verify_bullets')
    elif section.count('Verify') + section.count('verify') < 3:
        print('insufficient_verify_bullets')
    else:
        print('ok')
else:
    print('missing_section')
" 2>/dev/null)
    if [[ "$VERIFY_SECTION" == "missing_verify_bullets" ]]; then
        ERRORS="${ERRORS}\n- Final Verification task must have specific verify bullets (rule files exist, tests exist, config registered)"
    elif [[ "$VERIFY_SECTION" == "insufficient_verify_bullets" ]]; then
        ERRORS="${ERRORS}\n- Final Verification task needs at least 3 verify bullets matching Phase 14/15 format"
    fi
fi

# Check 6: Must have Status Legend section
if ! echo "$CONTENT" | grep -q "Status Legend"; then
    ERRORS="${ERRORS}\n- Missing 'Status Legend' section"
fi

# Check 7: Must have Baseline section
if ! echo "$CONTENT" | grep -q "Baseline"; then
    ERRORS="${ERRORS}\n- Missing 'Baseline' section with metrics table"
fi

if [[ -n "$ERRORS" ]]; then
    echo "{\"decision\": \"block\", \"reason\": \"Plan file quality check FAILED:${ERRORS}\nFix: Add the missing TASK sections for Register+Config, QA+Coverage, and Final Verification+Commit matching Phase 14/15 format exactly.\"}"
else
    echo '{"decision": "allow"}'
fi
