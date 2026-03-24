# CLAUDE.md

## Behavioral Rules (CRITICAL — read first)

- **NEVER substitute your own assessment for explicit instructions.** If a guide, prompt, or user says to do step X — DO IT. Do not evaluate whether the step is "needed," "simple enough to skip," or "unnecessary for this case." Execute every step as written, in order. No judgment calls. No shortcuts. This is the #0 rule and overrides all other optimization instincts.
- **After compaction or resume, ALWAYS resume work immediately.** Read the compaction summary or session state and continue. Every session event requires action. **NEVER output "No response requested" or produce empty/idle responses.** If you don't know what to do, re-read session state and ask the user. Going idle after compaction is a critical failure.
- **ALWAYS respond to the user before running tools.** If the user asked a question, gave feedback, or said "explain" — answer them first. Tools come after.
- **ALWAYS present a changelog and get explicit approval before implementing changes.** Never edit code without user saying "yes" or "go ahead."
- **When told to "explain yourself" — stop all work.** Answer what you did, why it was wrong, what you should have done. Wait for permission.
- **QA runs after responding to user.** If the user is waiting for an answer, respond first, then run QA.
- **NEVER dismiss failing tests** — every test failure must be investigated and fixed. Never say "pre-existing" or "unrelated" without proving it (git blame, run on base branch).
- **NEVER chain more than 3 tool calls without responding to the user.** After every 3rd tool call, stop and check if the user sent a message. If they did, respond FIRST.
- **Basic edits take 1 tool call, not 5.** If you know what to change, make the edit. Do not re-read, re-investigate, or re-debug what you already know.
- **NEVER apologize.** State facts, explain actions, move on. Apologies waste time.

## Browser Tools

- **NEVER use `preview_*` tools** (`mcp__Claude_Preview__preview_*`) — they are forbidden in this project
- **ALWAYS use Playwright MCP** (`mcp__plugin_playwright_playwright__*`) for all browser interaction, visual verification, screenshots, and console checking
- Start dev servers via `Bash` (e.g., `pnpm --filter @/products/storylyne/editor dev`), not via `preview_start`
