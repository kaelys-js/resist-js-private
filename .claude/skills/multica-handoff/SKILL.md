---
name: multica-handoff
description: At Multica task end, commit + push the workspace branch so the user can fetch it in their main checkout
---

# Multica Handoff

When you're spawned by Multica (env `MULTICA_AUTONOMOUS=1`) inside a workspace under `~/multica_workspaces/<task-id>/` and have finished implementing the task, ship the work back via a named branch.

## When to apply

- The active plan's `success_check` has passed (Stop hook released).
- All edits are in a state you'd want the user to review.
- You are about to issue your final task message.

## Steps

1. Stage all changes:

   ```bash
   git add -A
   ```

2. Commit with the issue title and Multica issue ID:

   ```bash
   git commit -m "$(cat <<'EOF'
   <issue title>

   Multica issue: <issue id>

   Co-Authored-By: Multica <noreply@multica.ai>
   EOF
   )"
   ```

3. Push to a branch named `multica/<issue-id>`:

   ```bash
   git push -u origin HEAD:multica/<issue-id>
   ```

4. Report the branch name in your final task message so the issue thread shows where the work landed:

   ```
   Branch: multica/<issue-id>
   Pull locally: git fetch && git checkout multica/<issue-id>
   ```

## Failure modes

- **Auth error (no credentials, expired token)** — report and stop. Do not reconfigure git credentials.
- **Non-fast-forward** — `git pull --rebase origin multica/<issue-id> 2>/dev/null || true`, then retry the push once. If still failing, report and stop.
- **Branch already exists with conflicting history** — append `-retry-N` (start at `-retry-1`) to the branch name and push that. Report the new branch name.
- **No remote configured** — report and stop. The workspace was cloned without a remote and handoff requires one.

## What NOT to do

- Do not create a pull request automatically. The user reviews and opens the PR from their main checkout.
- Do not force-push (`--force`, `--force-with-lease`).
- Do not reset, rebase onto main, or alter shared branches.
- Do not run `git push --all` or `git push <remote> :branch` (delete remote branches).
