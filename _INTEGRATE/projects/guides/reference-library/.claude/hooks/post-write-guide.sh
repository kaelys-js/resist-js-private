#!/bin/bash
# PostToolUse hook for Write tool — validates guides written to guides/ directory
#
# This hook runs after any file is written. It checks if the file is in the
# guides/ directory and if so, validates it against the template structure.
#
# Exit codes:
#   0 = OK (not a guide file, or guide passes validation)
#   2 = Validation failed (guide doesn't meet standards)

# The file path is passed via the CLAUDE_FILE_PATH environment variable
# or can be extracted from the tool input
FILE_PATH="${CLAUDE_FILE_PATH:-$1}"

# Only validate files in the guides/ directory
if [[ ! "$FILE_PATH" == *"/guides/"* ]]; then
    exit 0
fi

# Skip index files and READMEs
BASENAME=$(basename "$FILE_PATH")
if [[ "$BASENAME" == "INDEX.md" || "$BASENAME" == "README.md" || "$BASENAME" == "SITUATIONS.md" || "$BASENAME" == "PROBLEMS.md" ]]; then
    exit 0
fi

# Only validate .md files
if [[ ! "$FILE_PATH" == *.md ]]; then
    exit 0
fi

# Check if file exists
if [[ ! -f "$FILE_PATH" ]]; then
    echo "HOOK ERROR: File not found: $FILE_PATH"
    exit 2
fi

ERRORS=""

# Check 1: Has a title
if ! grep -q "^# " "$FILE_PATH"; then
    ERRORS="${ERRORS}\n- Missing title heading (# Title)"
fi

# Check 2: Has "When to use this guide"
if ! grep -qi "when to use this guide" "$FILE_PATH"; then
    ERRORS="${ERRORS}\n- Missing 'When to use this guide' line"
fi

# Check 3: Has all required sections
for SECTION in "The Short Version" "The Full Guide" "Common Mistakes and Dangerous Misconceptions" "If You Remember Nothing Else" "Related Guides"; do
    if ! grep -qi "^## $SECTION" "$FILE_PATH"; then
        ERRORS="${ERRORS}\n- Missing required section: $SECTION"
    fi
done

# Check 4: Has metadata footer
if ! grep -qE "\*Confidence:.+\|.+Last generated:.+\|.+Tier:" "$FILE_PATH"; then
    ERRORS="${ERRORS}\n- Missing or malformed metadata footer"
fi

# Check 5: Full Guide section is not suspiciously short (< 200 words)
# Extract content between "## The Full Guide" and the next "## " or "---"
FULL_GUIDE_WORDS=$(sed -n '/^## The Full Guide/,/^## \|^---$/p' "$FILE_PATH" | grep -v "^## \|^---$" | wc -w | tr -d ' ')

if [[ "$FULL_GUIDE_WORDS" -lt 200 ]]; then
    ERRORS="${ERRORS}\n- Full Guide section is too short (${FULL_GUIDE_WORDS} words, minimum 200)"
fi

# Report results
if [[ -n "$ERRORS" ]]; then
    echo "GUIDE VALIDATION FAILED for: $FILE_PATH"
    echo -e "$ERRORS"
    echo ""
    echo "Fix these issues before the guide can be accepted."
    exit 2
fi

exit 0
