# Visual Verification Skill

## CRITICAL RULE

**ALWAYS use Playwright MCP tools for visual verification. NEVER use preview_* tools.**

This is non-negotiable. The user watches verification live in their browser. Preview tools run in a headless context the user cannot see.

## Which Tools to Use

**CORRECT — Playwright MCP tools:**
- `mcp__plugin_playwright_playwright__browser_navigate` — navigate to URL
- `mcp__plugin_playwright_playwright__browser_snapshot` — accessibility tree (preferred for structure)
- `mcp__plugin_playwright_playwright__browser_take_screenshot` — visual screenshot
- `mcp__plugin_playwright_playwright__browser_click` — click elements
- `mcp__plugin_playwright_playwright__browser_type` — type text
- `mcp__plugin_playwright_playwright__browser_select_option` — select dropdown options
- `mcp__plugin_playwright_playwright__browser_evaluate` — run JS in page
- `mcp__plugin_playwright_playwright__browser_run_code` — run Playwright code snippets
- `mcp__plugin_playwright_playwright__browser_console_messages` — check console errors
- `mcp__plugin_playwright_playwright__browser_wait_for` — wait for elements/text

**WRONG — NEVER use these for visual verification:**
- `mcp__Claude_Preview__preview_screenshot` — NO
- `mcp__Claude_Preview__preview_click` — NO
- `mcp__Claude_Preview__preview_eval` — NO
- `mcp__Claude_Preview__preview_snapshot` — NO
- `mcp__Claude_Preview__preview_inspect` — NO
- Any tool starting with `mcp__Claude_Preview__` — NO

## Workflow

1. Navigate to the dev server URL (usually `http://localhost:3100`)
2. Take a screenshot to confirm the page loaded
3. Interact with UI elements (click, type, select)
4. Take screenshots mid-interaction to show the user what's happening
5. Check console for errors after interactions
6. Report findings with screenshots

## When to Use

- After implementing any rendering feature
- After building dev harness UI controls
- When the plan says "visual verification"
- When the user asks to "visually verify" or "test in browser"
- Any time you need to confirm something works in the actual browser

## Dev Server

The runtime dev harness runs at `http://localhost:3100` via `pnpm dev` in the runtime package. Start it with `mcp__Claude_Preview__preview_start` if needed (that's the ONLY preview tool you may use — to start the server), then do ALL verification through Playwright MCP.
