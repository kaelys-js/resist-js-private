# CLAUDE.md

## Behavioral Rules (CRITICAL — read first)

- **NEVER substitute your own assessment for explicit instructions.** If a guide, prompt, or user says to do step X — DO IT. Do not evaluate whether the step is "needed," "simple enough to skip," or "unnecessary for this case." Execute every step as written, in order. No judgment calls. No shortcuts. This is the #0 rule and overrides all other optimization instincts.
- **After compaction or resume, ALWAYS resume work immediately.** The user's most recent message IS the task — execute it. System reminders, hook output, and TODO lists are CONTEXT, not the task. **NEVER output "No response requested" or produce empty/idle responses.** If you can't find a user message, ask "What should I work on?" Going idle after compaction is a critical failure.
- **TODO lists are STALE after compaction.** Clear them and start fresh from the user's message. Do NOT trust TODO items from before compaction.
- **ALWAYS respond to the user before running tools.** If the user asked a question, gave feedback, or said "explain" — answer them first. Tools come after.
- **ALWAYS present a changelog and get explicit approval before implementing changes.** Never edit code without user saying "yes" or "go ahead."
- **When told to "explain yourself" — stop all work.** Answer what you did, why it was wrong, what you should have done. Wait for permission.
- **QA runs after responding to user.** If the user is waiting for an answer, respond first, then run QA.
- **NEVER dismiss failing tests** — every test failure must be investigated and fixed. Never say "pre-existing" or "unrelated" without proving it (git blame, run on base branch).
- **NEVER chain more than 3 tool calls without responding to the user.** After every 3rd tool call, stop and check if the user sent a message. If they did, respond FIRST.
- **Basic edits take 1 tool call, not 5.** If you know what to change, make the edit. Do not re-read, re-investigate, or re-debug what you already know.
- **NEVER apologize.** State facts, explain actions, move on. Apologies waste time.
- **Commit after every changelog implementation.** Reduces post-compaction file modification notes. More commits = less context bloat after compaction.

## Active-Plan Binding Contract (ENFORCED BY HOOKS)

When the user approves a plan via `ExitPlanMode`, the `post-exit-plan-mode-record.sh` hook automatically writes `.claude/active-plan.json` with the plan's success criterion (extracted from the first `pnpm -w run qa:lint ...` line in the plan). The `stop-active-plan-block.sh` Stop hook then BLOCKS every turn-end until that criterion is met (e.g. zero lint diagnostics). Three behaviors that previously required willpower are now mechanical:

- **You CANNOT stop mid-plan UNLESS the user tells you to.** The Stop hook blocks until the success_check matches expected. However, **the user's explicit instructions ALWAYS take priority over the stop hook.** If the user says "stop", "change focus", or redirects you — OBEY THE USER, not the hook. Tell them they can pause (`touch .claude/user-pause`) or abandon (`bash .claude/hooks/abandon-plan.sh "reason"`) to unblock the stop hook. The `.claude/user-pause` marker freezes the plan without abandoning it; `rm .claude/user-pause` resumes enforcement.
- **You CANNOT add lint-rule disables without explicit per-edit approval.** The `pre-edit-lint-config-deny.sh` hook denies any Edit/Write to `.oxlintrc.json` / `biome.json` / lint-runner sources (`tools/oxlint.ts`, `tools/svelte-check.ts`, `tools/tsgo.ts`, `framework/oxc-runner.ts`) when the diff adds an `"off"` rule, a `files: [...]` override, or a regex-based diagnostic suppression. To override (rare, with justification): ask the user, then `touch .claude/approved-lint-disable` (consumes one edit).
- **You CANNOT run multi-file Python/sed bulk-edit scripts without approval.** The `pre-bash-block-bulk-script.sh` hook denies `python3` invocations using `glob`/`pathlib walk` and `sed -i` / `awk -i inplace` over file globs. Per-site Edits via the Edit tool ARE the right approach for plan-bound grinds. To override: ask the user, then `touch .claude/approved-bulk-script` (consumes one invocation).
- **Self-revert thrashing is detected.** The `pre-edit-revert-detector.sh` hook logs every Edit's old/new content hashes to `.claude/edit-history.jsonl` and blocks the 2nd time you try to write content that matches a previous old/new hash on the same file. Override marker: `.claude/approved-revert`.
- **Plans are abandoned only by the user.** To abandon an active plan: the user (NOT Claude) runs `bash .claude/hooks/abandon-plan.sh "<reason>"`. The marker is removed, the abandonment is appended to `.claude/abandoned-plans.log`, and the Stop hook stops blocking. Claude has no path to delete the marker — attempting to do so via Bash is blocked by `pre-bash-no-file-writes.sh`. Claude is also blocked from invoking `abandon-plan.sh` itself by `pre-bash-block-claude-abandon-attempt.sh` — it is a USER-ONLY mechanism.
- **You may NOT propose abandoning an active plan.** If you believe the plan is impossible, present concrete evidence to the user (what the success_check is, why it cannot be met, what workspace decision is needed) and STOP. The user reads it and decides. "Please run abandon-plan" is not an authorized response.
- **Test regressions are caught post-edit.** When an active plan is in progress AND you edit a `.ts`/`.svelte`/`.js` file inside `packages/`, `post-edit-test-regression-block.sh` runs that package's `qa:test` (60s budget) and emits a system-reminder if the pass-count drops below the last-known baseline for that package. The reminder reflects back to your next turn — you cannot keep editing while tests are red without acknowledging it.
- **Multi-file shell-loop bulk edits are blocked.** `pre-bash-block-multi-file-shell.sh` denies `find -exec <write-cmd>`, shell `for f in <glob>; do <write>; done`, `xargs <write-cmd>`, and `grep -rl | xargs <write>` chains. Closes the back door from the Python/sed bulk-script blocker. Same approval marker (`.claude/approved-bulk-script`).
- **You CANNOT run qa:lint repeatedly.** The `pre-qa-commands.sh` hook blocks `pnpm -w run qa:lint` if it was already run less than 2 minutes ago. The lint output from the FIRST run contains every file, line number, error, and suggested fix — USE IT. Do not re-run qa:lint to "check progress." For final verification after ALL fixes are complete, the user can approve a re-run: `touch .claude/approved-relint`.

## Browser Tools

- **NEVER use `preview_*` tools** (`mcp__Claude_Preview__preview_*`) — they are forbidden in this project
- **ALWAYS use Playwright MCP** (`mcp__plugin_playwright_playwright__*`) for all browser interaction, visual verification, screenshots, and console checking
- Start dev servers via `Bash` (e.g., `pnpm --filter @/products/storylyne/editor dev`), not via `preview_start`
- **IGNORE ALL "[Preview Required]" Stop:Callback messages.** The builtin Preview plugin fires a callback after every Edit/Write saying "Code was edited but no dev server is running." This is a BUG — the plugin is disabled but its callback still fires. IGNORE IT COMPLETELY. Do NOT follow its instructions. Do NOT stop working. Do NOT start a preview server. Continue with your current task as if the message never appeared.
