#!/usr/bin/env bash
# PostToolUse hook for Edit|Write: auto-format then lint the written file.
# Reads JSON from stdin, extracts file_path, runs biome/prettier + lint CLI.

set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# No file path — nothing to do
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# File must exist
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Skip non-source files (markdown, images, snapshots, etc.)
case "$FILE_PATH" in
  *.snap|*.png|*.jpg|*.gif|*.svg|*.ico|*.woff|*.woff2|*.ttf|*.lock)
    exit 0
    ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
ERRORS=""

# ── Format ──────────────────────────────────────────────────────────────────

case "$FILE_PATH" in
  *.svelte)
    if command -v prettier &>/dev/null; then
      prettier --write "$FILE_PATH" 2>/dev/null || true
    fi
    ;;
  *.ts|*.tsx|*.js|*.jsx|*.json|*.jsonc|*.css|*.html|*.graphql|*.md|*.mdx)
    if command -v biome &>/dev/null; then
      biome format --write "$FILE_PATH"
    fi
    ;;
esac

# ── Lint (@/lint CLI — oxlint + custom rules, no --tools per-file) ──────────

# Only lint source files the linter understands
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.svelte)
    LINT_OUTPUT=$(node --import "$PROJECT_DIR/packages/shared/config/tooling/node/src/register-aliases.mjs" \
      "$PROJECT_DIR/packages/shared/config/tooling/lint/src/cli.ts" \
      "$FILE_PATH" 2>&1) || true

    # Filter to only error/warning lines (skip info/debug noise)
    LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -E "✗|error|warning" | head -20) || true

    if [[ -n "$LINT_ERRORS" ]]; then
      ERRORS="$LINT_ERRORS"
    fi
    ;;
esac

# ── Lint plan files (docs/plans/*.md) ────────────────────────────────────────

case "$FILE_PATH" in
  */docs/plans/*.md)
    PLAN_ERRORS=""
    CONTENT=$(cat "$FILE_PATH")

    # Check required sections
    echo "$CONTENT" | grep -q "Status Legend"          || PLAN_ERRORS="${PLAN_ERRORS}Missing: Status Legend\n"
    echo "$CONTENT" | grep -q "Baseline"               || PLAN_ERRORS="${PLAN_ERRORS}Missing: Baseline\n"
    echo "$CONTENT" | grep -qi "Register.*Config"      || PLAN_ERRORS="${PLAN_ERRORS}Missing: Register Rules + Config task\n"
    echo "$CONTENT" | grep -q "Integration Verification" || PLAN_ERRORS="${PLAN_ERRORS}Missing: Integration Verification task\n"
    echo "$CONTENT" | grep -qE "Full QA|QA.*Coverage"  || PLAN_ERRORS="${PLAN_ERRORS}Missing: Full QA + Coverage task\n"
    echo "$CONTENT" | grep -qE "Final Verification.*Commit" || PLAN_ERRORS="${PLAN_ERRORS}Missing: Final Verification + Commit task\n"
    echo "$CONTENT" | grep -q "Execution Order"        || PLAN_ERRORS="${PLAN_ERRORS}Missing: Execution Order\n"

    if [[ -n "$PLAN_ERRORS" ]]; then
      ERRORS="${ERRORS}Plan lint errors:\n${PLAN_ERRORS}"
    fi
    ;;
esac

# ── Report ──────────────────────────────────────────────────────────────────

if [[ -n "$ERRORS" ]]; then
  echo "=== Post-write lint errors in $FILE_PATH ==="
  echo "$ERRORS"
  echo "=== Fix these before continuing ==="
fi

exit 0
