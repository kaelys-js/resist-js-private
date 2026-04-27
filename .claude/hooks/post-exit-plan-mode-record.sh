#!/usr/bin/env bash
# PostToolUse hook for ExitPlanMode: extracts the success criteria from the
# approved plan and writes .claude/active-plan.json so stop-active-plan-block.sh
# can enforce completion.
#
# Extracts EVERY `pnpm -w run qa:*` command mentioned in the plan body
# (e.g. qa:lint, qa:test:coverage, qa:format:check, qa:test) and builds a
# chained `set -e` success_check that requires ALL of them to exit 0.
#
# Plan-time guard: if the plan body mentions `qa:test:coverage` but the
# extractor cannot find it (e.g. backtick parsing failure), the hook prints
# an error and refuses to write the marker — closing the loophole where a
# coverage-goal plan was guarded only by lint.
#
# If parseable: writes the marker.
# If unparseable: prints a warning to stderr but does NOT block (allow:
# the user can still proceed, but no Stop-hook enforcement).

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MARKER="$REPO_ROOT/.claude/active-plan.json"
PLANS_STAGING="$HOME/.claude/plans"

# Find the most recently-modified plan file in the staging dir
PLAN_FILE=""
if [[ -d "$PLANS_STAGING" ]]; then
  PLAN_FILE=$(find "$PLANS_STAGING" -maxdepth 1 -name '*.md' -type f -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
fi

# Allow override via env var (used by tests)
if [[ -n "${PLAN_FILE_OVERRIDE:-}" ]]; then
  PLAN_FILE="$PLAN_FILE_OVERRIDE"
fi

if [[ -z "$PLAN_FILE" ]] || [[ ! -f "$PLAN_FILE" ]]; then
  echo "post-exit-plan-mode-record.sh: no staging plan file found, skipping marker" >&2
  exit 0
fi

# Extract the title from the first H1 line
LABEL=$(grep -m1 '^# ' "$PLAN_FILE" | sed 's/^# //')

# Extract ALL `pnpm -w run qa:<subcommand>` references from the plan body.
# Strip trailing flags / pipes / quotes / backticks. Dedupe. Sort.
# We collect just the bare `pnpm -w run qa:<name>` form so that runtime
# behavior (exit code) is the contract, not noisy stdout.
SUCCESS_CMDS=()
while IFS= read -r _line; do
  [[ -z "$_line" ]] && continue
  SUCCESS_CMDS+=("$_line")
done < <(grep -oE 'pnpm -w run qa:[a-z:]+' "$PLAN_FILE" 2>/dev/null | sort -u)

if [[ ${#SUCCESS_CMDS[@]:-0} -eq 0 ]]; then
  echo "post-exit-plan-mode-record.sh: no \`pnpm -w run qa:* ...\` commands found in $PLAN_FILE — no marker written" >&2
  exit 0
fi

# Plan-time guard — if the plan body MENTIONS qa:test:coverage anywhere
# but the extracted set does not contain it, refuse to write the marker.
# This is the loophole closer: a coverage-goal plan must guard coverage.
if grep -qE 'qa:test:coverage' "$PLAN_FILE"; then
  found_coverage=0
  for c in "${SUCCESS_CMDS[@]}"; do
    if [[ "$c" == "pnpm -w run qa:test:coverage" ]]; then
      found_coverage=1
      break
    fi
  done
  if [[ $found_coverage -eq 0 ]]; then
    cat <<EOF >&2
⛔ post-exit-plan-mode-record.sh: plan mentions qa:test:coverage but
   the extractor did not capture it. Refusing to write a misleading
   lint-only marker. Fix the plan body so qa:test:coverage appears
   verbatim (no backticks splitting it across lines), then re-approve.
EOF
    exit 1
  fi
fi

# Build a chained `set -e` command — every qa:* must exit 0.
# Echo "$?" at the end so stop-active-plan-block.sh can compare to "0".
# Use `&&` so the first failure short-circuits.
JOIN=""
for c in "${SUCCESS_CMDS[@]}"; do
  if [[ -z "$JOIN" ]]; then
    JOIN="$c"
  else
    JOIN="$JOIN && $c"
  fi
done
SUCCESS_CHECK="( $JOIN ) >/dev/null 2>&1; echo \$?"

# Try to find a real .md filepath in docs/plans/ that matches the staging plan's title
PLAN_PATH=""
DOCS_PLANS_DIR="$REPO_ROOT/docs/plans"
if [[ -d "$DOCS_PLANS_DIR" ]] && [[ -n "$LABEL" ]]; then
  for f in "$DOCS_PLANS_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    if [[ "$(head -1 "$f")" == "# $LABEL" ]]; then
      PLAN_PATH="${f#$REPO_ROOT/}"
      break
    fi
  done
fi

# Build the JSON marker (also include the array of commands for transparency)
APPROVED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Build a JSON array of commands
CMDS_JSON=$(printf '%s\n' "${SUCCESS_CMDS[@]}" | jq -R . | jq -s .)

jq -n \
  --arg plan_path "${PLAN_PATH:-$PLAN_FILE}" \
  --arg approved_at "$APPROVED_AT" \
  --arg success_check "$SUCCESS_CHECK" \
  --arg expected "0" \
  --arg label "${LABEL:-unknown}" \
  --argjson commands "$CMDS_JSON" \
  '{plan_path: $plan_path, approved_at: $approved_at, success_check: $success_check, expected: $expected, label: $label, commands: $commands}' \
  > "$MARKER"

echo "post-exit-plan-mode-record.sh: marker written to .claude/active-plan.json (commands: ${SUCCESS_CMDS[*]})" >&2
exit 0
