---
name: build-editor
description: Build Svelte 5 + shadcn-svelte editor UI components for the WebForge RPG editor. Use when user says "Build Editor UI", "Build [panel/component]", asks to create or add Svelte components/panels/controls for the editor, or asks to rebuild dev harness functionality in Svelte. Also use when adding new UI controls, panels, or layouts to the editor at packages/products/webforge/editor/. This replaces the vanilla DOM dev harness (dev/dev.ts) with proper Svelte components.
---

# Build Editor UI

Rigid workflow for building Svelte 5 + shadcn-svelte editor components. NEVER touch code before completing research and getting user approval.

No worktrees. No plan mode. No ceremony.

**REQUIRED SUB-SKILLS:** Before writing ANY Svelte code, invoke `svelte-code-writer` and `svelte5-best-practices` skills. These provide Svelte 5 runes patterns, component authoring conventions, and SvelteKit best practices that MUST be followed.

## Architecture Reference

Read `references/editor-architecture.md` for: workspace location, tech stack, runtime integration (`__WEBFORGE__` global), existing dev harness panels inventory, and component organization pattern.

## Steps — FOLLOW EXACTLY

### 1. Research Online

Research best practices for the specific UI component/panel being built:
- Editor/IDE UX patterns (VS Code, Godot, Unity, Unreal editor panels)
- shadcn/ui and shadcn-svelte component patterns
- Svelte 5 runes patterns for reactive state management
- Accessibility best practices for the control type (sliders, color pickers, tree views, etc.)

List EVERY control, interaction pattern, and UX consideration found.

### 2. Present Changelog

Comprehensive feature/component list organized by section. Include:
- Components to create (with file paths)
- shadcn-svelte primitives to install
- Controls and interactions each component provides
- How it connects to the runtime API

Ask user for approval before proceeding. If user says "more" or seems unsatisfied, research deeper and expand.

### 3. Write Design Document

Commit to `docs/plans/YYYY-MM-DD-<component>-design.md`. Contains:
- Component tree and props/state
- Data flow (Svelte runes → runtime API calls)
- Layout wireframe (ASCII or description)
- shadcn-svelte primitives used
- Accessibility considerations

See prior examples in `docs/plans/` for format.

### 4. Write Implementation Plan

Commit to `docs/plans/YYYY-MM-DD-<component>.md`. Contains:
- Bite-sized TDD tasks with exact file paths
- Test code, implementation code, QA commands
- shadcn-svelte components to install (exact CLI commands)

Header must include:
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

### 5. Implement Following the Plan

TDD: write tests first, watch them fail, implement, watch them pass.

**QA after EVERY file edit:**
```bash
pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check
```

**shadcn-svelte component installation:**
```bash
cd packages/products/webforge/editor && npx shadcn-svelte@latest add <component>
```

**Svelte 5 rules (invoke `svelte-code-writer` + `svelte5-best-practices` for full details):**
- Use `$state()`, `$derived()`, `$effect()` runes — not stores
- Use `{#snippet}` blocks — not slots
- Use `$props()` — not `export let`
- PascalCase for `.svelte` files, kebab-case for `.ts` files
- Generated `ui/` components are exempt from PascalCase and lint rules (oxlint config handles this)

### 5b. Verify Implementation Against Design Doc & Plan (MANDATORY)

**⚠️ THIS STEP IS NON-NEGOTIABLE. YOU MUST DO THIS BEFORE PROCEEDING. ⚠️**

After ALL implementation is complete, STOP and verify your work matches what was specified.

**HOW TO VERIFY — USE THE EXPLORE AGENT (MANDATORY):**

You MUST use the `Task` tool with `subagent_type=Explore` (set to "very thorough") to run a systematic audit. DO NOT do this manually — you WILL miss things. The agent must:

1. **Read the implementation plan** top to bottom
2. **For EVERY task**, grep each file for EVERY component name, export name, locale key, CSS selector, and prop name listed in that task
3. **Report EXISTS or MISSING** for each item in a table
4. **Check integration points** — verify components are imported and rendered in parent files, locale keys exist in all locale files, CSS selectors exist in app.css
5. **Check file existence** — every file listed in the plan must exist

**WHAT TO CHECK (agent must verify ALL of these):**

- Every component file from the plan exists at its specified file path
- Every component has the props, state, and behavior documented in the design doc
- Every locale key in the schema exists in ALL locale files (en, ja, zh, ko, fr, de, es)
- Every locale key referenced in components exists in the schema
- Every CSS theme selector in app.css matches the design doc
- Every integration point (e.g., "add ThemeSwitcher to NavUser") is actually wired
- Component tree matches the design doc hierarchy

**AFTER THE AGENT REPORTS:**

6. **Fix every MISSING item** — if the plan says it should exist, BUILD IT. No exceptions. No "documented deviations". No "I'll note this as intentionally omitted". BUILD IT.
7. **Re-run the agent** after fixing — loop until ZERO missing items. Do NOT proceed with any missing items.
8. **Run full QA** after all fixes: `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

**⚠️ "DOCUMENTED DEVIATION" IS NOT ALLOWED ⚠️**

If the plan says to implement component X and you didn't implement it, that's a BUG — not a "deviation". The ONLY acceptable outcome is:
- Every component in the plan EXISTS in the codebase
- Every locale key in the plan EXISTS in ALL locale files
- Every integration point in the plan IS WIRED
- Every file in the plan EXISTS on disk

"Documenting a deviation" is code for "I was too lazy to implement it." If you genuinely cannot implement something (e.g., type system limitation), you MUST ask the user before proceeding — do NOT unilaterally decide to skip it and call it a "deviation."

**VERIFICATION LOOP (MANDATORY):**

You must loop through verification until there are ZERO gaps:
1. Run Explore agent → get report
2. Fix ALL missing items
3. Run Explore agent AGAIN → verify fixes
4. If still gaps → go to step 2
5. Only when report shows ZERO missing items → proceed

**Red flags that mean you're skipping this step:**
- "The plan is just a guide" — NO. The plan is the spec. Follow it.
- "I already implemented this correctly" — PROVE IT. Run the agent and check.
- "This is close enough" — NO. If the plan says X and you built Y, fix it.
- "Remaining acceptable deviations" — BANNED PHRASE. Fix the deviation or prove it's impossible.
- "I'll verify during visual testing" — NO. Visual testing checks rendering. This checks correctness against spec.
- "This deviation is minor" — NO. All deviations are spec violations. Fix them.
- "I did a quick check and it looks fine" — NO. Use the Explore agent for a SYSTEMATIC audit. Quick checks miss things.
- "The Explore agent is overkill" — NO. It catches things you miss. You ALREADY missed things doing it manually. Use the agent.
- "I'll note this as a deviation" — NO. Deviations are BUGS. Implement the missing item or ask the user.
- "This was intentionally omitted" — DID YOU ASK THE USER? If not, it wasn't intentional. Build it.

### 6. Update Documentation

- Update `docs/ARCHITECTURE.md` if adding new systems
- Update `docs/runtime/README.md` if the component exposes new runtime controls
- Create or update feature-specific docs under `docs/`

### 7. Implementation Completeness Audit (MANDATORY before visual testing)

**⚠️ STOP. Before moving to visual testing, verify ALL implementation is complete. ⚠️**

Walk through every task in the implementation plan and confirm:
1. **Every component** from the plan exists at its specified file path
2. **Every component** has the props, state, and behavior documented in the design doc
3. **Every runtime binding** connects to `__WEBFORGE__` correctly
4. **Every control** (slider, toggle, dropdown, etc.) is wired up and functional
5. **All QA passes**: `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

If ANY task is incomplete, go back and finish it NOW. Do NOT proceed to visual testing with partial implementation.

### 8. Visual Verify via Playwright MCP

**⚠️ THIS STEP IS MANDATORY. YOU MUST USE PLAYWRIGHT MCP. NO AD-HOC TESTING. ⚠️**

Use `mcp__plugin_playwright_playwright__*` tools ONLY. Follow this EXACT sequence:

**8a — Navigate & Screenshot:**
1. Navigate to the editor dev server (check port — likely `http://localhost:5173`)
2. Take initial screenshot to see current state

**8b — Test EVERY Control Systematically:**
3. Use `browser_snapshot` to get accessibility tree — find all interactive elements
4. For each component/panel:
   - Take screenshot showing the component rendered
   - Test each toggle ON and OFF with screenshots
   - Test each slider at min and max with screenshots
   - Test each dropdown — cycle ALL options with screenshots
   - Test keyboard navigation if applicable
   - Verify the Babylon.js scene responds to control changes via `browser_evaluate` on `__WEBFORGE__`
5. Document ✅ or ❌ for each control

**8c — Test Responsive Layout:**
6. Test at different viewport sizes if layout is involved
7. Take screenshots at each breakpoint

**Key patterns for Svelte + shadcn-svelte testing:**
- shadcn-svelte uses `data-*` attributes and Radix-style selectors
- Use `browser_snapshot` (accessibility tree) for finding interactive elements
- Use `browser_evaluate` to check `__WEBFORGE__` runtime state after control changes

**Global Runtime Object:**
- `__WEBFORGE__` — contains: `scene`, `runtime`, `BABYLON`, `tilemap`, `setTime(hour24)`, `getTime()`, `switchPreset(name)`, `status()`
- Scene: `__WEBFORGE__.scene` directly (NOT `.instance.scene`)

**Thoroughness Requirements:**
- EVERY toggle: test ON and OFF with screenshots
- EVERY slider: test at min and max values with screenshots
- EVERY dropdown: test ALL options with screenshots (no skipping)
- EVERY visual feature: verify VISIBLE OUTPUT exists, not just that "values are accepted"
- If a feature produces no visible change: investigate via `browser_evaluate`, check runtime state, diagnose root cause, fix the bug

**⚠️ NEVER DISMISS BROKEN FEATURES AS "EXPECTED BEHAVIOR" ⚠️**

If a feature does NOT produce visible output when it should, it is a BUG — not "expected behavior". Investigate via `browser_evaluate`, diagnose, and fix. NEVER write "this is expected behavior" or "this cannot be verified" as an excuse to skip fixing broken output.

### 9. Commit

## ⛔ Test & Lint Rules — ZERO EXCEPTIONS

| Rule | Why |
|------|-----|
| NEVER dismiss failing tests as "pre-existing" or "unrelated" | PROVE it with git blame or running on base branch. If you can't prove it, fix it. |
| NEVER skip a failing test | Every failure must be investigated. Re-run in isolation for flakes. Fix consistently failing tests. Fix flaky tests too. |
| NEVER mark a task complete while tests fail | Tests passing is a REQUIREMENT, not a nice-to-have. |
| NEVER use lint disable comments | Fix the code to satisfy the linter. Add missing globals to `.oxlintrc.json`. Only `max-lines` and `max-lines-per-function` are OK to disable. ASK user before any other disable. |
| NEVER use `/* global */` comments | Add globals to `.oxlintrc.json` instead. |
| NEVER run `git stash` without permission | `git stash` can lose work. NEVER stash without explicit user permission. NEVER run any destructive git command without asking first. |

## Session Resume Protocol

If continuing from a previous session or after compaction:

1. **Read session-state.md** from memory directory — recovers last known position
2. Re-read this skill
3. State which step you are on explicitly
4. Read the design doc and implementation plan
5. Check codebase state — not stale todo lists
6. State your plan before proceeding

**After completing each major task**, update `session-state.md` with: current step, what was done, what remains, key files modified. This is your compaction safety net.

**NEVER** just pick up from a todo list and start coding. The todo list from a prior session may be wrong, stale, or misleading. Always re-orient from the skill steps and the plan documents.

## Red Flags — STOP Immediately

| Thought | Reality |
|---------|---------|
| "Let me just continue where I left off" | NO. Re-read this skill, identify step, re-orient. |
| "The todo list says I should do X" | MAYBE WRONG. Skill steps are authoritative. |
| "Let me skip the design doc" | NO. Design doc comes before implementation. |
| "Let me jump straight to coding" | NO. Changelog → design doc → plan → code. |
| "I'll just test a few controls" | NO. Test EVERY control with screenshots. |
| "I can skip visual verification" | NO. Step 8 is mandatory. |
| "I can skip the completeness audit" | NO. Step 7 is mandatory before visual testing. |
| "I can skip verifying against the plan" | NO. Step 5b is mandatory after implementation. |
| "This is expected behavior" | NO. If a control has no effect, it's a bug. |
| "Let me use preview_* tools" | NO. Playwright MCP only. |
| "Let me use vanilla DOM instead of Svelte" | NO. Build proper Svelte components. |
| "I'll add shadcn components without the CLI" | NO. Use `npx shadcn-svelte@latest add`. |
| "Values are accepted so it works" | NOT ENOUGH. Visual features must produce VISIBLE output. |
| "I'll verify during visual testing" | NO. Step 5b checks correctness against spec. Step 8 checks rendering. Both required. |
