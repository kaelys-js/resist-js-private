#!/usr/bin/env bash
# Session Start Orientation Hook
# Fires on startup, resume, compaction, and clear.
# Includes Serena memory bootstrap per persistent-knowledge-setup.

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ACTIVE_PLAN="$REPO_ROOT/.claude/active-plan.json"
MEMORIES_DIR="$REPO_ROOT/.serena/memories"
DECISIONS_DIR="$REPO_ROOT/docs/decisions"

echo "Resume: user's last message is the task. Stale TODOs are invalid."

# Clear qa:lint cooldown so new sessions can run their first lint
rm -f "$REPO_ROOT/.claude/.last-lint-run"

# Clear the redirect-read session tracking file (new session = fresh tracking)
rm -f /tmp/claude-serena-reads

if [[ -f "$ACTIVE_PLAN" ]]; then
  LABEL=$(jq -r '.label // "unknown"' "$ACTIVE_PLAN" 2>/dev/null)
  echo "Active plan: $LABEL. User's words override stop hook. Pause: touch .claude/user-pause"
fi

# === Serena memory bootstrap ===
if [[ -d "$MEMORIES_DIR" ]] && ls "$MEMORIES_DIR"/*.md >/dev/null 2>&1; then
  echo "[Session bootstrap]"
  echo "Available Serena memories: $(ls "$MEMORIES_DIR"/*.md 2>/dev/null | xargs -I{} basename {} | tr '\n' ', ')"
  echo "Use mcp__serena__read_memory before exploring known areas."

  # === Stale memory detection ===
  # Compare each memory's mtime against the most recent commit touching its package
  stale_memories=""
  for memory_path in "$MEMORIES_DIR"/*-overview.md; do
    [[ -f "$memory_path" ]] || continue
    memory_name=$(basename "$memory_path" .md)
    # Parse group-pkg from the filename (e.g. "shared-config-overview" -> group=shared, pkg=config)
    pkg_key="${memory_name%-overview}"
    # Split on first dash: group is first part, pkg is rest
    group="${pkg_key%%-*}"
    pkg="${pkg_key#*-}"

    pkg_dir="$REPO_ROOT/packages/$group/$pkg"
    [[ -d "$pkg_dir" ]] || continue

    # Get memory file mtime (macOS stat)
    memory_mtime=$(stat -f %m "$memory_path" 2>/dev/null || stat -c %Y "$memory_path" 2>/dev/null || echo 0)
    # Get most recent commit timestamp touching this package
    last_commit=$(git -C "$REPO_ROOT" log -1 --format=%ct -- "packages/$group/$pkg/" 2>/dev/null || echo 0)

    if [[ "$last_commit" -gt "$memory_mtime" ]]; then
      stale_memories="${stale_memories} ${pkg_key}"
    fi
  done

  if [[ -n "$stale_memories" ]]; then
    echo "[Stale memories detected]${stale_memories} — code changed since memory was last written. Refresh with mcp__serena__write_memory."
  fi

  # === Coverage gap detection ===
  # Find packages that have no corresponding memory
  missing_coverage=""
  for pkg_dir in "$REPO_ROOT"/packages/*/*/; do
    [[ -d "$pkg_dir" ]] || continue
    # Skip if it's not a real package (no source files)
    if ! ls "$pkg_dir"*.ts "$pkg_dir"src/ "$pkg_dir"lib/ >/dev/null 2>&1; then
      continue
    fi
    # Extract group/name from path
    rel_path="${pkg_dir#$REPO_ROOT/packages/}"
    rel_path="${rel_path%/}"
    group="${rel_path%%/*}"
    pkg="${rel_path#*/}"
    pkg="${pkg%%/*}"
    pkg_key="${group}-${pkg}"
    memory_file="$MEMORIES_DIR/${pkg_key}-overview.md"
    if [[ ! -f "$memory_file" ]]; then
      missing_coverage="${missing_coverage} ${pkg_key}"
    fi
  done

  if [[ -n "$missing_coverage" ]]; then
    echo "[Missing memory coverage]${missing_coverage} — write memories for these packages when you work in them."
  fi
else
  # No memories at all — flag it
  if [[ -d "$MEMORIES_DIR" ]]; then
    echo "[No Serena memories] .serena/memories/ is empty. Run the bootstrap onboarding sessions to populate it."
  fi
fi

# ADR count
if [[ -d "$DECISIONS_DIR" ]]; then
  ADR_COUNT=$(ls "$DECISIONS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$ADR_COUNT" -gt 0 ]]; then
    echo "Available ADRs: $ADR_COUNT decisions logged. Read relevant ADRs before changing architecture."
  fi
fi
