---
name: fix-bug
description: Systematic bug investigation and fixing with mandatory user approval gates. Use when encountering any bug, visual glitch, rendering issue, runtime error, or unexpected behavior that needs debugging. Also use when the user says "fix this bug", "debug this", "this is broken", or describes something not working correctly. This skill enforces investigate-first, fix-second discipline with hard approval checkpoints to prevent blind trial-and-error.
---

# Fix Bug

Rigid workflow for investigating and fixing bugs. NEVER touch code before completing investigation and getting user approval.

No skills. No worktrees. No plan mode. No ceremony.

## Steps — FOLLOW EXACTLY

### 1. Reproduce & Characterize (READ ONLY — no code changes)

Gather facts. Do NOT theorize yet. Do NOT touch any code.

- **What**: Describe the bug in one sentence from user's report
- **Where**: Identify the exact file(s) and line(s) involved
- **When**: What triggers it? (always, on specific input, after specific action)
- **Symptoms**: List every observable symptom (error messages, visual glitches, wrong values)
- **Working state**: What DOES work? What changed between working and broken?

Output: A bullet list of facts. No theories. No fixes. Just observations.

**Time limit: 5 minutes.** If you can't reproduce in 5 minutes, STOP and ask the user for more info.

### 2. Trace the Code Path (READ ONLY — no code changes)

Read the relevant source code and trace the execution path that produces the bug. This is the ONLY investigation step.

- Read the code that runs when the bug triggers
- Trace data flow: what values go in, what transforms happen, what comes out
- Identify the EXACT point where behavior diverges from expected
- If the bug involves a library/framework, read the library source to understand its conventions
- Compare: what does the working code path do differently from the broken one?

Output: A clear explanation of the root cause. Must include:
1. **Root cause**: One sentence explaining WHY the bug happens
2. **Evidence**: The specific code/values that prove it (file:line references)
3. **Confidence**: High / Medium / Low — be honest

**Time limit: 10 minutes.** If you can't identify root cause in 10 minutes, STOP and present what you know (see Step 3).

### 3. Present Findings — MANDATORY APPROVAL GATE

**STOP. Do NOT write any code. Present your findings to the user and WAIT for approval.**

Format your findings as:

```
## Bug Investigation

**Bug**: [one sentence description]

**Root cause**: [one sentence — or "Unknown, here's what I found:" if stuck]

**Evidence**:
- [file:line] — [what this code does wrong]
- [file:line] — [what it should do instead]

**Proposed fix**:
- [exact change 1: file:line, change X to Y]
- [exact change 2: file:line, change X to Y]

**Risk**: [what could break if this fix is wrong]

**Confidence**: High / Medium / Low
```

If confidence is Low or root cause is unknown:
- Say so explicitly: "I don't know the root cause yet."
- List what you've ruled out
- List what you haven't checked
- Ask the user what to try or whether they have more context

**NEVER proceed past this step without explicit user approval ("yes", "go ahead", "fix it", etc.)**

### 4. Implement the Fix

Only after user approval:

- Make the MINIMUM change to fix the bug
- Change ONLY what you said you would in Step 3
- If you discover the fix needs to be different, STOP and go back to Step 3
- Run QA after every file edit: `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`
- Run tests: `pnpm qa:test`

### 5. Verify & Report

- **BEFORE claiming the fix works**, trace the FULL code path one more time:
  - For CSS changes: check for conflicting rules (specificity, `!important`, `min-*`/`max-*` overrides, `display:none` blocking `:hover`/transitions, inline `style=` attributes overriding classes)
  - For JS changes: check that the function is actually called in the relevant code path, check that DOM elements exist and aren't hidden by other code, search for ALL callers of modified functions (grep), check if any are in per-frame render loops (`registerBeforeRender`, `onBeforeRenderObservable`, `requestAnimationFrame`)
  - For multi-property changes: verify EACH property individually — one working doesn't mean all work
- **NEVER say "this will work" or describe expected behavior unless you have traced the FULL interaction** between your change and ALL existing code that touches the same elements
- If you aren't 100% certain the fix works end-to-end, say "I believe this should fix it but I haven't verified in-browser — please check" instead of stating it as fact
- Report to user: "Fix applied. [summary]. Please verify visually."
- Do NOT do visual testing unless the user asks you to

**⚠️ NEVER DISMISS BROKEN FEATURES AS "EXPECTED BEHAVIOR" ⚠️**

If a feature does NOT produce visible output when it should, it is a BUG — not "expected behavior". Investigate via `browser_evaluate`, diagnose, and fix. NEVER write "this is expected Babylon.js behavior" or "this cannot be verified" as an excuse.

### 6. Commit (only if user asks)

## Hard Rules

| Rule | Why |
|------|-----|
| NEVER edit code before Step 4 | Prevents blind trial-and-error that makes things worse |
| NEVER skip the approval gate (Step 3) | User must approve before any code changes |
| NEVER try multiple fixes hoping one works | Each fix attempt requires going back through Steps 2-3 |
| NEVER spend >15 min total investigating | If stuck, present what you know and ask for help |
| NEVER ignore user messages during investigation | Check for messages after EVERY tool call |
| NEVER say "let me try X" without approval | ALL changes require approval, no exceptions |
| ALWAYS be honest about confidence level | "I don't know" is better than a wrong guess |
| ALWAYS present evidence, not theories | Show the code, show the values, show the proof |
| If a fix makes things WORSE, revert immediately | Then go back to Step 3 with updated findings |
| NEVER dismiss failing tests | Every test failure must be investigated and fixed — ZERO exceptions. Never say "pre-existing" or "unrelated" without PROVING it (git blame, run on base branch). |
| NEVER use lint disable comments | Fix the code to satisfy the linter. Add missing globals to `.oxlintrc.json` instead of `/* global */` comments. Only `max-lines` and `max-lines-per-function` are OK to disable. ASK the user before adding ANY other disable. |
| NEVER run `git stash` without permission | `git stash` can lose work. NEVER stash without explicit user permission. NEVER run any destructive git command (`stash`, `reset --hard`, `checkout .`, `clean -f`) without asking first. |

## Red Flags — STOP Immediately

| Thought | Reality |
|---------|---------|
| "Let me just try changing this..." | NO. Present findings first. Get approval. |
| "I think this might fix it..." | NO. Trace the code. Find the root cause. Present it. |
| "Let me investigate one more thing..." | CHECK THE CLOCK. Are you past 10 min? Present what you have. |
| "This is probably the issue..." | PROVE IT. Show the code. Show the evidence. |
| "Let me read a few more files..." | Are you going in circles? Present findings and ask for help. |
| "I'll fix this and then verify..." | NO. Present the fix plan first. Get approval. Then fix. |
| "The fix didn't work, let me try something else..." | NO. Revert. Go back to Step 3. Present updated findings. |
| "Let me just continue where I left off" | NO. Re-read this skill, identify your step, re-orient. |
| "The todo list says I should do X" | MAYBE WRONG. The skill steps are authoritative, not todo lists. |
| "This is expected Babylon.js behavior" | NO. If a visual feature produces NO visible output, it's a BUG. |
| "This cannot be visually verified" | WRONG. Use `browser_evaluate` to check runtime state. |
| "Values are accepted so it works" | NOT ENOUGH. Visual features must produce VISIBLE output. |
| "The effect is too subtle to see" | TEST WITH EXTREME VALUES. If still invisible, it's broken. |
| "I'll just click around manually" | NO. Register the helper scripts FIRST. Always use `__discover` and `__helper`. |
| "I can skip the discovery step" | NO. Discover first, then you know what to test. |
| "Fix applied, please verify" | DID YOU TRACE THE FULL CODE PATH? Check CSS specificity, inline styles, display:none, min/max overrides. If you didn't, you're guessing. |
| "This CSS change will make X happen" | DID YOU CHECK FOR CONFLICTING RULES? Search for EVERY rule targeting the same elements. Check specificity. Check inline styles. |
| "The behavior is now..." | HOW DO YOU KNOW? Unless you verified in-browser or traced every interaction, you're lying. Say "I believe" not "it is". |
| "That test failure is pre-existing" | PROVE IT. Check git blame or ask the user to verify on base branch. NEVER run `git stash` without permission. |
| "That test is flaky, I'll skip it" | NO. Investigate the flake. Re-run in isolation. If it fails consistently, fix it. If flaky, fix the flake. |
| "I'll just add a lint disable comment" | NO. Fix the code. Add globals to `.oxlintrc.json`. Never suppress lint errors. |

## Session Resume Protocol

**If you are continuing from a previous session**, you MUST do this BEFORE any work:

1. **Read session-state.md** — check `~/.claude/projects/-Users-coleb-Desktop-webforge/memory/session-state.md` for last known position
2. **Re-read this skill** — you are reading it now, good
3. **Identify which step you are on** — state it explicitly: "I am on step X of the fix-bug workflow"
4. **Check what has been done** — review the codebase state, not just a todo list from memory
5. **State your plan** — "I will now proceed with step X, which involves Y"
6. If a fix was attempted and failed: revert to last working state, go to Step 3 with updated findings
7. If investigation was in progress: go to Step 3 and present what's known so far

**After completing each major step**, update `session-state.md` with current position so the next session (or post-compaction recovery) can pick up correctly.

**NEVER** just pick up from a todo list and start coding. The todo list from a prior session may be wrong, stale, or misleading. Always re-orient from the skill steps.

**NEVER** continue a failed investigation without presenting findings first.
