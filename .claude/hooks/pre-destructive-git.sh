#!/bin/bash
# PreToolUse hook for Bash — blocks destructive commands.
#
# Git destructive commands → "ask" (user must approve)
# Non-git destructive commands → "ask" (user must approve)
# Everything else → allow (no output = allow)
#
# This is the ONLY safety gate for Bash commands. The user settings
# allow Bash(*) so this hook is the gatekeeper.

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# If jq fails or command is empty, allow
if [ -z "$COMMAND" ]; then
  exit 0
fi

REASON=""

# =============================================================================
# GIT DESTRUCTIVE COMMANDS — comprehensive list
# =============================================================================

# git stash (any variant — can lose uncommitted work)
if echo "$COMMAND" | grep -qE '\bgit\s+stash\b'; then
  REASON="git stash can lose uncommitted work"

# git reset --hard (discards all changes permanently)
elif echo "$COMMAND" | grep -qE '\bgit\s+reset\s+--hard\b'; then
  REASON="git reset --hard discards all changes permanently"

# git reset --mixed or bare git reset (discards staged changes)
elif echo "$COMMAND" | grep -qE '\bgit\s+reset\b' && ! echo "$COMMAND" | grep -qE '\bgit\s+reset\s+--soft\b'; then
  REASON="git reset can discard staged changes"

# git checkout . or git checkout -- . (discards all unstaged changes)
elif echo "$COMMAND" | grep -qE '\bgit\s+checkout\s+(--\s+)?\.'; then
  REASON="git checkout . discards all unstaged changes"

# git checkout <file> (discards changes to specific file — but allow git checkout -b)
elif echo "$COMMAND" | grep -qE '\bgit\s+checkout\s+[^-]' && ! echo "$COMMAND" | grep -qE '\bgit\s+checkout\s+-b\b'; then
  REASON="git checkout can discard uncommitted changes"

# git clean (deletes untracked files)
elif echo "$COMMAND" | grep -qE '\bgit\s+clean\b'; then
  REASON="git clean deletes untracked files permanently"

# git restore . or git restore --staged (discards changes)
elif echo "$COMMAND" | grep -qE '\bgit\s+restore\s+(\.|--)'; then
  REASON="git restore discards changes"

# git revert (creates undo commit)
elif echo "$COMMAND" | grep -qE '\bgit\s+revert\b'; then
  REASON="git revert creates a commit that undoes previous work"

# git branch -D or -d (deletes branches)
elif echo "$COMMAND" | grep -qE '\bgit\s+branch\s+-[dD]\b'; then
  REASON="git branch -D/-d deletes branches"

# git push --force or -f (overwrites remote history)
elif echo "$COMMAND" | grep -qE '\bgit\s+push\s+.*(-f\b|--force\b|--force-with-lease\b)'; then
  REASON="git push --force overwrites remote history"

# git push --delete (deletes remote branch)
elif echo "$COMMAND" | grep -qE '\bgit\s+push\s+.*--delete\b'; then
  REASON="git push --delete removes a remote branch"

# git rebase (rewrites commit history)
elif echo "$COMMAND" | grep -qE '\bgit\s+rebase\b'; then
  REASON="git rebase rewrites commit history"

# git cherry-pick (can create conflicts or duplicate commits)
elif echo "$COMMAND" | grep -qE '\bgit\s+cherry-pick\b'; then
  REASON="git cherry-pick can create conflicts or duplicate commits"

# git merge --abort or git rebase --abort (discards in-progress merge/rebase)
elif echo "$COMMAND" | grep -qE '\bgit\s+(merge|rebase)\s+--abort\b'; then
  REASON="git abort discards in-progress merge/rebase work"

# git am --abort (discards patch application)
elif echo "$COMMAND" | grep -qE '\bgit\s+am\s+--abort\b'; then
  REASON="git am --abort discards patch application"

# git tag -d (deletes tags)
elif echo "$COMMAND" | grep -qE '\bgit\s+tag\s+-d\b'; then
  REASON="git tag -d deletes tags"

# git reflog expire / git gc --prune (permanently removes history)
elif echo "$COMMAND" | grep -qE '\bgit\s+(reflog\s+expire|gc\s+--prune|prune)\b'; then
  REASON="git gc/prune/reflog expire permanently removes history"

# git filter-branch or git filter-repo (rewrites entire repo history)
elif echo "$COMMAND" | grep -qE '\bgit\s+filter-(branch|repo)\b'; then
  REASON="git filter-branch/filter-repo rewrites entire repository history"

# git update-ref -d (deletes refs directly)
elif echo "$COMMAND" | grep -qE '\bgit\s+update-ref\s+-d\b'; then
  REASON="git update-ref -d deletes refs directly"

# git worktree remove (removes worktree)
elif echo "$COMMAND" | grep -qE '\bgit\s+worktree\s+remove\b'; then
  REASON="git worktree remove deletes a worktree"

# git submodule deinit (removes submodule)
elif echo "$COMMAND" | grep -qE '\bgit\s+submodule\s+deinit\b'; then
  REASON="git submodule deinit removes a submodule"

# =============================================================================
# NON-GIT DESTRUCTIVE COMMANDS
# =============================================================================

# rm -rf (recursive force delete)
elif echo "$COMMAND" | grep -qE '\brm\s+.*-[a-zA-Z]*r[a-zA-Z]*f|rm\s+.*-[a-zA-Z]*f[a-zA-Z]*r|\brm\s+-rf\b|\brm\s+-fr\b'; then
  REASON="rm -rf recursively deletes files permanently"

# rm on directories or important paths (but allow rm on single temp/test files)
elif echo "$COMMAND" | grep -qE '\brm\s+.*(/|\.\.|\*)'; then
  REASON="rm with paths/wildcards can delete important files"

# kill / killall / pkill (terminates processes)
elif echo "$COMMAND" | grep -qE '\b(kill|killall|pkill)\s'; then
  REASON="kill/killall/pkill terminates processes"

# chmod 777 or overly permissive chmod
elif echo "$COMMAND" | grep -qE '\bchmod\s+777\b|\bchmod\s+.*a\+w'; then
  REASON="chmod 777 / a+w creates security-unsafe file permissions"

# dd (raw disk write — extremely dangerous)
elif echo "$COMMAND" | grep -qE '\bdd\s'; then
  REASON="dd writes raw data to disk — extremely dangerous if misused"

# mkfs / fdisk / parted (disk formatting)
elif echo "$COMMAND" | grep -qE '\b(mkfs|fdisk|parted)\b'; then
  REASON="disk formatting commands can destroy data"

# > /dev/sda or similar device writes (exclude >/dev/null and fd redirects like 2>/dev/null)
elif echo "$COMMAND" | sed -E 's/[0-9]*>[[:space:]]*\/dev\/null//g' | grep -qE '>[[:space:]]*/dev/'; then
  REASON="writing to /dev/ devices can destroy data"

# sudo (elevated privileges)
elif echo "$COMMAND" | grep -qE '\bsudo\s'; then
  REASON="sudo runs with elevated privileges"

# curl | sh / curl | bash (remote code execution)
elif echo "$COMMAND" | grep -qE 'curl\s.*\|\s*(sh|bash|zsh)'; then
  REASON="piping curl to shell executes remote code"

# wget | sh / wget | bash
elif echo "$COMMAND" | grep -qE 'wget\s.*\|\s*(sh|bash|zsh)'; then
  REASON="piping wget to shell executes remote code"

# eval (arbitrary code execution from string)
elif echo "$COMMAND" | grep -qE '\beval\s'; then
  REASON="eval executes arbitrary code from a string"

# truncate / shred (file destruction)
elif echo "$COMMAND" | grep -qE '\b(truncate|shred)\s'; then
  REASON="truncate/shred destroys file contents"

# docker system prune / docker volume rm (removes containers/volumes)
elif echo "$COMMAND" | grep -qE '\bdocker\s+(system\s+prune|volume\s+rm|container\s+rm|image\s+rm|rmi)\b'; then
  REASON="docker prune/rm removes containers, volumes, or images"

# npm publish / pnpm publish (publishes to registry — hard to undo)
elif echo "$COMMAND" | grep -qE '\b(npm|pnpm|yarn)\s+publish\b'; then
  REASON="publishing to a package registry is hard to undo"

fi

# =============================================================================
# DECISION
# =============================================================================

if [ -n "$REASON" ]; then
  # Escape quotes in reason for JSON
  ESCAPED_REASON=$(echo "$REASON" | sed 's/"/\\"/g')
  cat << EOF >&2
{"hookSpecificOutput": {"permissionDecision": "deny"}, "systemMessage": "⛔ BLOCKED: Destructive command detected. Reason: ${ESCAPED_REASON}. You MUST ask the user for explicit permission before running this command. NEVER run destructive commands without permission."}
EOF
  exit 2
fi

# No destructive command detected — allow silently
exit 0
