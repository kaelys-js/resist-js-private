#!/bin/bash
# Pre-tool hook: validates plan file quality before allowing Write/Bash to create plan files.
# Triggers on Write tool calls targeting docs/plans/*.md files.
# Also triggers on Bash calls that write to docs/plans/*.md (cat > heredoc pattern).
#
# Checks:
#   1. Must have "Register Rules + Config" tail task
#   2. Must have "Full QA + Coverage" tail task with pnpm commands
#   3. Must have "Final Verification + Commit" tail task with >=3 verify bullets
#   4. Must have "Integration Verification" tail task checking wiring completeness
#   5. Must have Status Legend + Baseline sections
#   6. Must have Execution Order table
#   7. Every TASK block must have a **Verification** line
#   8. Every non-tail TASK block must have a **Files** section

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

# =============================================================================
# Structural checks — required sections
# =============================================================================

# Check 1: Must have Status Legend section
if ! echo "$CONTENT" | grep -q "Status Legend"; then
    ERRORS="${ERRORS}\n- Missing 'Status Legend' section"
fi

# Check 2: Must have Baseline section
if ! echo "$CONTENT" | grep -q "Baseline"; then
    ERRORS="${ERRORS}\n- Missing 'Baseline' section with metrics table"
fi

# Check 3: Must have Execution Order table
if ! echo "$CONTENT" | grep -q "Execution Order"; then
    ERRORS="${ERRORS}\n- Missing 'Execution Order' table (required to make task dependencies explicit)"
fi

# =============================================================================
# Required tail tasks
# =============================================================================

# Check 4: Must have a "Register Rules + Config" task
if ! echo "$CONTENT" | grep -qi "Register.*Rules.*Config\|Register.*Config"; then
    ERRORS="${ERRORS}\n- Missing 'Register Rules + Config' task"
fi

# Check 5: Must have a "Full QA + Coverage" task with pnpm commands
if ! echo "$CONTENT" | grep -qi "Full QA.*Coverage\|QA.*Coverage"; then
    ERRORS="${ERRORS}\n- Missing 'Full QA + Coverage' task"
fi

# Check 6: QA task must list pnpm commands
if echo "$CONTENT" | grep -qi "Full QA"; then
    QA_SECTION=$(echo "$CONTENT" | python3 -c "
import sys
content = sys.stdin.read()
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
        ERRORS="${ERRORS}\n- QA task must list specific pnpm commands (qa:lint, qa:test, qa:format:check)"
    fi
fi

# Check 7: Must have "Integration Verification" task
if ! echo "$CONTENT" | grep -qi "Integration Verification"; then
    ERRORS="${ERRORS}\n- Missing 'Integration Verification' task (must verify all commands registered, all settings read, all classes instantiated)"
fi

# Check 8: Integration Verification task must check wiring completeness
if echo "$CONTENT" | grep -qi "Integration Verification"; then
    INTEGRATION_RESULT=$(echo "$CONTENT" | python3 -c "
import sys, re
content = sys.stdin.read()
m = re.search(r'##\s+TASK\s+\d+\s*—\s*Integration Verification.*?(?=##\s+TASK|\Z)', content, re.DOTALL | re.IGNORECASE)
if not m:
    print('missing_section')
    sys.exit(0)
section = m.group(0)
missing = []
# Must check command registration
if not re.search(r'command.*register|registerCommand|registered', section, re.IGNORECASE):
    missing.append('command registration check')
# Must check config/settings are read
if not re.search(r'config.*read|setting.*read|config\.get', section, re.IGNORECASE):
    missing.append('config settings read check')
# Must check class instantiation
if not re.search(r'class.*instantiat|feature.*wired|instantiated', section, re.IGNORECASE):
    missing.append('class instantiation check')
# Must check exports are used
if not re.search(r'export.*import|unused.*export|dead.*code|orphan', section, re.IGNORECASE):
    missing.append('unused exports / dead code check')
if missing:
    print('missing:' + ', '.join(missing))
else:
    print('ok')
" 2>/dev/null)
    if [[ "$INTEGRATION_RESULT" == missing_section ]]; then
        ERRORS="${ERRORS}\n- Integration Verification task section not found"
    elif [[ "$INTEGRATION_RESULT" == missing:* ]]; then
        MISSING_CHECKS="${INTEGRATION_RESULT#missing:}"
        ERRORS="${ERRORS}\n- Integration Verification task is incomplete — missing: ${MISSING_CHECKS}"
    fi
fi

# Check 9: Must have a "Final Verification + Commit" task
if ! echo "$CONTENT" | grep -qi "Final Verification.*Commit"; then
    ERRORS="${ERRORS}\n- Missing 'Final Verification + Commit' task"
fi

# Check 10: Final Verification task must have >=3 verification bullets
if echo "$CONTENT" | grep -qi "Final Verification"; then
    VERIFY_SECTION=$(echo "$CONTENT" | python3 -c "
import sys
content = sys.stdin.read()
import re
m = re.search(r'##\s+TASK\s+\d+\s*—\s*Final Verification.*?(?=##\s+TASK|\Z)', content, re.DOTALL | re.IGNORECASE)
if m:
    section = m.group(0)
    verify_count = len(re.findall(r'[Vv]erify', section))
    if verify_count == 0:
        print('missing_verify_bullets')
    elif verify_count < 3:
        print('insufficient_verify_bullets')
    else:
        print('ok')
else:
    print('missing_section')
" 2>/dev/null)
    if [[ "$VERIFY_SECTION" == "missing_verify_bullets" ]]; then
        ERRORS="${ERRORS}\n- Final Verification task must have specific verify bullets"
    elif [[ "$VERIFY_SECTION" == "insufficient_verify_bullets" ]]; then
        ERRORS="${ERRORS}\n- Final Verification task needs at least 3 verify bullets"
    fi
fi

# =============================================================================
# Per-task checks
# =============================================================================

# Check 11: Every TASK block must have a **Verification** line
TASK_VERIFICATION_RESULT=$(echo "$CONTENT" | python3 -c "
import sys, re
content = sys.stdin.read()
# Find all TASK blocks
tasks = re.findall(r'##\s+TASK\s+(\d+)\s*—\s*(.+?)(?=\n)', content)
# Find all TASK sections and check for Verification
missing = []
for num, name in tasks:
    # Extract the task section
    pattern = r'##\s+TASK\s+' + num + r'\s*—.*?(?=##\s+TASK|\Z)'
    m = re.search(pattern, content, re.DOTALL)
    if m:
        section = m.group(0)
        if '**Verification**' not in section and 'Verification' not in section.split('\n')[0]:
            # Check if Verification appears anywhere in the section
            if not re.search(r'\*\*Verification\*\*', section):
                missing.append(f'TASK {num} ({name.strip()})')
if missing:
    print('missing:' + '; '.join(missing[:3]))
else:
    print('ok')
" 2>/dev/null)
if [[ "$TASK_VERIFICATION_RESULT" == missing:* ]]; then
    MISSING_TASKS="${TASK_VERIFICATION_RESULT#missing:}"
    ERRORS="${ERRORS}\n- Missing **Verification** in: ${MISSING_TASKS} (every TASK must have a Verification line)"
fi

# Check 12: Every non-tail TASK block must have a **Files** section
TASK_FILES_RESULT=$(echo "$CONTENT" | python3 -c "
import sys, re
content = sys.stdin.read()
# Tail task names that don't need Files sections
tail_names = [
    'register', 'full qa', 'qa + coverage', 'final verification',
    'integration verification', 'commit',
]
# Find all TASK blocks
tasks = re.findall(r'##\s+TASK\s+(\d+)\s*—\s*(.+?)(?=\n)', content)
missing = []
for num, name in tasks:
    name_lower = name.strip().lower()
    # Skip tail tasks
    is_tail = any(t in name_lower for t in tail_names)
    if is_tail:
        continue
    # Extract the task section
    pattern = r'##\s+TASK\s+' + num + r'\s*—.*?(?=##\s+TASK|\Z)'
    m = re.search(pattern, content, re.DOTALL)
    if m:
        section = m.group(0)
        if '**Files**' not in section and '**File' not in section:
            missing.append(f'TASK {num} ({name.strip()})')
if missing:
    print('missing:' + '; '.join(missing[:3]))
else:
    print('ok')
" 2>/dev/null)
if [[ "$TASK_FILES_RESULT" == missing:* ]]; then
    MISSING_FILES="${TASK_FILES_RESULT#missing:}"
    ERRORS="${ERRORS}\n- Missing **Files** section in: ${MISSING_FILES} (every implementation TASK must list files to create/modify)"
fi

# =============================================================================
# Result
# =============================================================================

if [[ -n "$ERRORS" ]]; then
    echo "{\"decision\": \"block\", \"reason\": \"Plan file quality check FAILED:${ERRORS}\nFix: See docs/plans/TEMPLATE.md for the required plan structure.\"}"
else
    echo '{"decision": "allow"}'
fi
