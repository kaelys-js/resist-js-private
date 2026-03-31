---
name: expand-feature
description: Use when user says "Expand Feature" or asks to expand, enhance, or add options to an existing runtime feature (fog, glow, shake, transitions, lighting, etc.)
---

# Expand Feature Workflow

## Overview

Established workflow for expanding existing runtime features. Follow these steps IN ORDER. No deviations. No skills. No worktrees. No plan mode. No ceremony.

## Steps — FOLLOW EXACTLY

### 1. Research Online
Thorough research across game engines (Unreal, Unity, Godot, CryEngine), frameworks (Babylon.js, Three.js), and RPG tools (RPG Maker MZ plugins). List EVERY configurable property found.

### 2. Present Changelog
Comprehensive feature/option list organized by group. Ask user for approval before proceeding. If user says "more" or seems unsatisfied, research deeper and expand.

### 3. Write Design Document
Commit to `docs/plans/YYYY-MM-DD-<feature>-design.md`. Contains: architecture, API surface, Babylon.js integration details, shader design if applicable. See prior examples in `docs/plans/` for format. The design doc covers the ENTIRE feature as one unified document.

### 4. Write Implementation Plan(s)

**⚠️ PLAN SIZE LIMIT — MANDATORY CHUNKING ⚠️**

Large features MUST be split into multiple implementation plans. A single plan should have **at most 8-10 tasks**. If the feature requires more tasks, split into separate plans:

- `docs/plans/YYYY-MM-DD-<feature>-part1.md` (e.g., "Data Texture Core" — tasks 1-8)
- `docs/plans/YYYY-MM-DD-<feature>-part2.md` (e.g., "Streaming & Virtualization" — tasks 9-14)
- `docs/plans/YYYY-MM-DD-<feature>-part3.md` (e.g., "Object Renderer & Integration" — tasks 15-20)

**Each part gets its own implement → verify → commit cycle** (Steps 5-9) before starting the next part. This prevents context overflow, reduces gap accumulation, and makes verification manageable.

**Why:** A 23-task, 1000-line plan overflows context during implementation. By the time verification runs, early task details are compacted/lost, leading to missed exports and incomplete functions. Smaller chunks keep the full plan in context throughout.

Each plan file contains: bite-sized TDD tasks with exact file paths, test code, implementation code, QA commands. Header must include `> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.`

### 5. Implement Following the Plan
TDD: write tests first, watch them fail, implement, watch them pass. Run QA after EVERY file edit (`pnpm -w run qa:lint --tools`, `pnpm -w run qa:format:check`).

### 5b. Verify Implementation Against Design Doc & Plan (MANDATORY)

**⚠️ THIS STEP IS NON-NEGOTIABLE. YOU MUST DO THIS BEFORE PROCEEDING. ⚠️**

After ALL implementation is complete, STOP and verify your work matches what was specified.

**HOW TO VERIFY — USE THE EXPLORE AGENT (MANDATORY):**

You MUST use the `Task` tool with `subagent_type=Explore` (set to "very thorough") to run a systematic audit. DO NOT do this manually — you WILL miss things. The agent must:

1. **Read the implementation plan** top to bottom
2. **For EVERY task**, grep each file for EVERY export name, function name, schema name, and type name listed in that task
3. **Report EXISTS or MISSING** for each item in a table
4. **Check integration points** — verify fields added to parent schemas, imports wired, functions called from orchestrators
5. **Check file existence** — every file listed in the plan's "New Files" section must exist

**WHAT TO CHECK (agent must verify ALL of these):**

- Every exported function name from the plan exists in the actual file (grep for `export function <name>`)
- Every exported type/schema name from the plan exists (grep for `export type <name>` or `export const <name>Schema`)
- Every field added to parent schemas (e.g., RenderedTilemapSchema) actually exists
- Every integration point (e.g., "wire X into Y") is actually wired (grep the orchestrator file for imports/usage)
- Every new file listed in the plan exists on disk (glob for it)
- Every test file listed in the plan exists on disk

**AFTER THE AGENT REPORTS:**

6. **Fix every MISSING item** — if the plan says it should exist, BUILD IT. No exceptions. No "documented deviations". No "I'll note this as intentionally omitted". BUILD IT.
7. **Re-run the agent** after fixing — loop until ZERO missing items. Do NOT proceed with any missing items.
8. **Run full QA** after all fixes: `pnpm -w run qa:lint --tools && pnpm -w run qa:format:check && pnpm qa:test`

**⚠️ "DOCUMENTED DEVIATION" IS NOT ALLOWED ⚠️**

If the plan says to implement function X and you didn't implement it, that's a BUG — not a "deviation". The ONLY acceptable outcome is:
- Every function in the plan EXISTS in the codebase
- Every type in the plan EXISTS in the codebase
- Every integration point in the plan IS WIRED
- Every file in the plan EXISTS on disk

"Documenting a deviation" is code for "I was too lazy to implement it." If you genuinely cannot implement something (e.g., missing dependency, impossible constraint), you MUST ask the user before proceeding — do NOT unilaterally decide to skip it and call it a "deviation."

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
- "I'll verify during visual testing" — NO. Visual testing checks rendering. This checks correctness against spec.
- "I did a quick check and it looks fine" — NO. Use the Explore agent for a SYSTEMATIC per-export audit. Quick checks miss things.
- "The Explore agent is overkill" — NO. It catches things you miss. You ALREADY missed things doing it manually. Use the agent.
- "I'll note this as a deviation" — NO. Deviations are BUGS. Implement the missing item or ask the user.
- "This was intentionally omitted" — DID YOU ASK THE USER? If not, it wasn't intentional. Build it.
- "The plan was just an approximation" — NO. The plan is the SPEC. Every function, every type, every file. Build all of it.
- "This function isn't needed because X covers it" — WRONG. If the plan says to export function Y, export function Y. Even if it's a thin wrapper.

### 6. Update Documentation
Document the new feature in the unified `docs/` directory:
- Update `docs/ARCHITECTURE.md` system table if adding a new system
- Update `docs/runtime/README.md` systems overview table and API tables
- Create or update the feature-specific doc (e.g., `docs/runtime/fog.md`) with full configuration reference tables, presets, API, and files
- All runtime docs live under `docs/runtime/` — one file per system

### 7. Dev Harness Controls
100% coverage — every configurable schema field gets a UI control in `dev/dev.ts`.

### 7b. Implementation Completeness Audit (MANDATORY before visual testing)

**⚠️ STOP. Before moving to visual testing, verify ALL implementation is complete. ⚠️**

Walk through every task in the implementation plan and confirm:
1. **Every schema field** from the plan exists in the schema file (grep for each field name)
2. **Every schema field** has a corresponding rendering implementation (not just schema-only stubs)
3. **Every schema field** has a dev harness control wired up in `dev/dev.ts`
4. **Every new rendering feature** has tests that pass
5. **All QA passes**: `pnpm -w run qa:lint --tools && pnpm -w run qa:format:check && pnpm qa:test`

If ANY task is incomplete, go back and finish it NOW. Do NOT proceed to visual testing with partial implementation.

### 8. Visual Verify via Playwright MCP

**⚠️ THIS STEP IS MANDATORY. YOU MUST USE THE HELPER SCRIPTS BELOW. NO AD-HOC TESTING. ⚠️**

Use `mcp__plugin_playwright_playwright__*` tools ONLY. You MUST follow this EXACT sequence — no shortcuts, no skipping steps, no "I'll just click around manually":

**STEP 8a — Navigate & Screenshot:**
1. Navigate to `http://localhost:3100` (verify dev server port first)
2. Take initial screenshot to see current state

**STEP 8b — Register Discovery Helper (MANDATORY):**
3. Read `dev-harness-discovery.js` from THIS skill directory (`.claude/skills/expand-feature/dev-harness-discovery.js`)
4. Register it via `browser_evaluate` — this creates `window.__discover`
5. Run `__discover.panels()` — find all sidebar panels and body IDs
6. Run `__discover.fullInventory('<feature>-body')` — get COMPLETE control inventory with types, ranges, dropdown options
7. **USE THE INVENTORY AS YOUR TESTING CHECKLIST** — this ensures NOTHING is missed

**STEP 8c — Register Control Helper (MANDATORY):**
8. Read `dev-harness-helper.js` from THIS skill directory (`.claude/skills/expand-feature/dev-harness-helper.js`)
9. Register it via `browser_evaluate` — use `window.__helper = createHelper('<feature>-body')`

**STEP 8d — Test EVERY Control Systematically:**
10. For each section from the inventory:
    - `__helper.readAll('SectionName')` — read initial state
    - `__helper.setToggle('SectionName', 'Enabled', true)` — enable
    - Take screenshot — verify visual change from OFF state
    - Test each slider at extremes (min → screenshot → max → screenshot)
    - Test each dropdown — cycle through ALL options, screenshot each
    - `__helper.setToggle('SectionName', 'Enabled', false)` — disable, verify effect disappears
    - Document ✅ or ❌ for each control

**IF YOU SKIPPED 8b OR 8c, YOU ARE VIOLATING THIS SKILL. GO BACK AND DO IT.**

**Key Dev Harness DOM Patterns:**
- Panel body: `#<feature>-body` (e.g., `#fog-body`, `#glow-body`)
- Sub-sections: `.cg > .cg-header > span:first-child` (section name) + `.cg-body` (controls)
- Toggle switches: `.toggle-switch` div with class `on` when enabled (NOT `<input type="checkbox">`, NOT `.active`)
- Slider rows: `.control-row` with `.control-label` + `input[type="range"]`
- Select rows: `.control-row` with `.control-label` + `<select>`
- CSS `text-transform` makes headers appear UPPERCASE but actual text is mixed-case (e.g., "Inscattering" not "INSCATTERING")
- Sliders MUST use prototype setter + dispatch events: `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, val)` then dispatch `input` + `change` events. Direct `.value = x` does NOT trigger change handlers.

**Global Runtime Object:**
- `__WEBFORGE__` — contains: `scene`, `runtime`, `BABYLON`, `tilemap`, `setTime(hour24)`, `getTime()`, `switchPreset(name)`, `status()`
- Scene: `__WEBFORGE__.scene` directly (NOT `.instance.scene`)
- Time: `setTime(0)` = midnight, `setTime(12)` = noon
- Preset switching: `__WEBFORGE__.switchPreset('denseFog')` (morningFog, lightMist, dungeon, etc.)

**What CANNOT Be Verified in Static Screenshots:**
- Real-time animations (scroll, hue cycling, density oscillation) — verify control value acceptance instead
- GPU shader uniform changes — verify through control acceptance and visual state changes

**⚠️ NEVER DISMISS BROKEN FEATURES AS "EXPECTED BEHAVIOR" ⚠️**

If a feature does NOT produce visible output when it should, it is a BUG — not "expected behavior". You MUST:
1. **Investigate** — check the runtime state via `browser_evaluate` (is the object created? are properties correct? is it enabled?)
2. **Diagnose** — trace the actual cause (wrong position? invisible mesh? disabled flag? wrong camera? wrong render pass?)
3. **Fix** — implement a code fix and verify it visually
4. **NEVER** write "this is expected Babylon.js behavior" or "this cannot be verified" as an excuse to skip fixing broken output

Examples of things that were wrongly dismissed in the past:
- God ray mesh `isVisible=false` — the VLS mesh MUST be visible for scattering to work. A per-frame callback in the dev harness was overriding it.
- "Color changes are subtle due to texture absorption" — while physically correct, this should be VERIFIED by isolating the light (disabling others) and testing with extreme values, not hand-waved away.

If you catch yourself writing "expected behavior" or "cannot be verified" about a VISUAL feature that produces NO visual change, STOP. You are about to dismiss a bug. Investigate instead.

**Thoroughness Requirements:**
- EVERY toggle: test ON and OFF with screenshots
- EVERY slider: test at min and max values with screenshots
- EVERY dropdown: test ALL options with screenshots (no skipping)
- EVERY visual feature (god rays, lens flares, shadows, glow, etc.): verify VISIBLE OUTPUT exists, not just that "values are accepted"
- For features with multiple instances (e.g., Overlay 1-4): fully test instance 1, then verify enable/disable on instances 2-4
- If a feature produces no visible change: investigate via `browser_evaluate`, check runtime state, diagnose root cause, fix the bug

### 9. Commit

## Session Resume Protocol

**If you are continuing from a previous session or after compaction**, you MUST do this BEFORE any work:

1. **Read session-state.md** from memory directory — recovers last known task position
2. **Re-read this skill** — you are reading it now, good
3. **Identify which step you are on** — state it explicitly: "I am on step X of the expand-feature workflow"
4. **Read the design doc and implementation plan** — re-orient yourself on what was specified
5. **Check what has been done** — review the codebase state, not just a todo list from memory
6. **State your plan** — "I will now proceed with step X, which involves Y"

**After completing each major task**, update `session-state.md` with: current step, what was done, what remains, key files modified. This is your compaction safety net.

**NEVER** just pick up from a todo list and start coding. The todo list from a prior session may be wrong, stale, or misleading. Always re-orient from the skill steps and the plan documents.

## Red Flags — STOP Immediately

| Thought | Reality |
|---------|---------|
| "Let me just continue where I left off" | NO. Re-read this skill, identify your step, re-orient from the plan docs. |
| "The todo list says I should do X" | MAYBE WRONG. The skill steps are authoritative, not todo lists from prior sessions. |
| "Let me invoke a skill first" | NO. This IS the workflow. No other skills needed. |
| "Let me create a worktree" | NO. Work directly unless user explicitly asks. |
| "Let me enter plan mode" | NO. Write plan to docs/plans/ directly. |
| "Let me skip the design doc" | NO. Every prior expand feature had one. |
| "Let me skip the impl plan" | NO. Every prior expand feature had one. |
| "Let me jump straight to coding" | NO. Design doc and impl plan come first. |
| "The changelog was approved so I can start coding" | NO. Design doc and impl plan come AFTER approval, BEFORE coding. |
| "I'll just test a few controls" | NO. Test EVERY control, EVERY option, EVERY variation. |
| "Screenshots take too long" | NO. Visual verification is non-negotiable. Use the helpers. |
| "I can skip the discovery step" | NO. Discover first, then you know what to test. |
| "I'll just click around manually" | NO. Register the helper scripts FIRST. Always use `__discover` and `__helper`. |
| "I already took a screenshot" | NOT ENOUGH. You must register helpers, run discovery, and test EVERY control systematically. |
| "The helpers might not work for this panel" | TRY THEM FIRST. They handle flat controls and sub-sections. Adapt if needed but NEVER skip. |
| "I'll do visual testing later" | NO. Do it NOW, in sequence, as Step 8. |
| "I'm ready for visual testing" | NOT YET. Run Step 7b audit first. Verify EVERY plan task is complete, every schema field has a dev control, every feature has tests. |
| "Context is running low, I'll skip some controls" | NO. Test every single one. If context is tight, summarize results compactly. |
| "This is expected Babylon.js behavior" | NO. If a visual feature produces NO visible output, it's a BUG. Investigate and fix it. |
| "This cannot be visually verified" | WRONG. Use `browser_evaluate` to check runtime state, isolate the feature, test with extreme values. |
| "Values are accepted so it works" | NOT ENOUGH. Visual features must produce VISIBLE output. Values accepted ≠ feature working. |
| "The effect is too subtle to see" | TEST WITH EXTREME VALUES. Crank it to max. If still invisible, it's broken. |
| "I'll note this as a documented deviation" | NO. Deviations are BUGS. If the plan says build X, BUILD X. No exceptions. |
| "This was intentionally omitted" | Did you ASK THE USER? If not, it wasn't intentional. Build it. |
| "Function X covers this already" | The plan says to export function Y. Export function Y. Even if it wraps X. |
| "I'll document this as a known limitation" | NO. Implement it or ask the user for permission to skip. You don't get to unilaterally skip. |
| "The verification passed with some minor gaps" | ZERO gaps is the only passing grade. Fix ALL gaps. Re-verify. Loop until clean. |
