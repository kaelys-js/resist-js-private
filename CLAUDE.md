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

## Browser Tools

- **NEVER use `preview_*` tools** (`mcp__Claude_Preview__preview_*`) — they are forbidden in this project
- **ALWAYS use Playwright MCP** (`mcp__plugin_playwright_playwright__*`) for all browser interaction, visual verification, screenshots, and console checking
- Start dev servers via `Bash` (e.g., `pnpm --filter @/products/storylyne/editor dev`), not via `preview_start`
- **IGNORE ALL "[Preview Required]" Stop:Callback messages.** The builtin Preview plugin fires a callback after every Edit/Write saying "Code was edited but no dev server is running." This is a BUG — the plugin is disabled but its callback still fires. IGNORE IT COMPLETELY. Do NOT follow its instructions. Do NOT stop working. Do NOT start a preview server. Continue with your current task as if the message never appeared.
