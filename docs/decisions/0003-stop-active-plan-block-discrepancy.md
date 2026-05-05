# ADR-0003: Resolve `stop-active-plan-block.sh` discrepancy in CLAUDE.md

## Status

Proposed

## Context

The `CLAUDE.md` "Active-Plan Binding Contract" section describes a Stop hook named `stop-active-plan-block.sh` that BLOCKS every turn-end until the active plan's `success_check` (extracted from the first `pnpm -w run qa:lint ...` line in the plan, or the chain of `pnpm -w run qa:*` commands) matches `expected` (typically `"0"`). The contract reads:

> **You CANNOT stop mid-plan UNLESS the user tells you to.** The Stop hook blocks until the success_check matches expected.

This is presented as a mechanically enforced behavior — Claude cannot end a turn while an active plan exists with an unmet success criterion.

**The hook does not exist on disk.** Audit findings on `main` at 2026-05-05:

1. `.claude/hooks/` listing — present hooks include `post-exit-plan-mode-record.sh`, `post-edit-test-regression-block.sh`, `stop-preview-override.sh`, and ~30 others — but **no `stop-active-plan-block.sh`**.
2. `.claude/settings.json` Stop matcher (lines 221–230) registers ONLY `bash .claude/hooks/stop-preview-override.sh`, which unconditionally allows:
   ```sh
   #!/usr/bin/env bash
   echo '{"decision": "allow"}'
   ```
3. The marker-writer (`post-exit-plan-mode-record.sh`) DOES correctly write `.claude/active-plan.json` with `success_check`, `expected`, `commands`, `label`, `plan_path`, `approved_at` fields when an `ExitPlanMode` is approved. The marker file is consumed by `post-edit-test-regression-block.sh` (PostToolUse on Edit/Write), which reads `success_check` to identify the active plan but uses it for a different purpose: detecting per-package test regressions during the plan, not enforcing turn-end completion.
4. No file in `.claude/` or `.claude/hooks/lib/` references "stop-active-plan-block" — including grep of comments and shell scripts.

So: the marker writer works, the post-edit consumer works, but **no Stop-time enforcement exists**. The behavior described in CLAUDE.md is aspirational documentation, not a real mechanical contract.

The discrepancy was discovered during Serena Phase-3 onboarding (cataloging `.claude/hooks/` for `monorepo-architecture-uncovered.md` follow-ups). It needs resolution because:

- **Documentation-vs-reality drift is dangerous.** Future contributors (humans and AI sessions) reading CLAUDE.md will assume the contract is enforced. They may design plans assuming Stop-time blocking exists, or assume that being "unable to stop" means the contract is robust to model drift.
- **The contract's value depends on its mechanical nature.** A "soft" contract that lives only in documentation is exactly the kind of behavior CLAUDE.md's preamble warns against ("The harness executes these, not Claude, so memory/preferences cannot fulfill them").

## Decision

Three options. The user must choose.

### Option (a) — Implement `stop-active-plan-block.sh` per CLAUDE.md spec

Write the hook so the documented contract becomes real:

1. Create `.claude/hooks/stop-active-plan-block.sh` with the following responsibilities:
   - Read `.claude/active-plan.json`. If missing or unparseable → `echo '{"decision": "allow"}'` and exit 0.
   - Check for `.claude/user-pause` marker → if present, allow (user explicitly froze the plan).
   - Read `success_check` and `expected` from the marker.
   - Execute `success_check` in the workspace shell. Capture exit code.
   - If exit code matches `expected` → allow.
   - Otherwise → emit `{"decision": "block", "reason": "active plan has unmet success_check: ${label} — run ${commands[*]} or ask the user to pause/abandon"}`.
2. Register the hook in `.claude/settings.json` Stop matcher BEFORE `stop-preview-override.sh` (which currently always allows; would need to be reordered or kept after, depending on desired precedence).

**Trade-offs**: success_check chains a list of `pnpm -w run qa:*` commands joined by `&&`. For a multi-command plan (e.g., `qa:lint && qa:test:coverage && qa:format:check`), executing the chain at every Stop costs minutes. Caching the result (e.g., short TTL) helps but introduces staleness. Network/build flakiness can falsely block the user.

### Option (b) — Remove the aspirational language from CLAUDE.md

Edit `CLAUDE.md` "Active-Plan Binding Contract" to match reality:

1. Replace **"You CANNOT stop mid-plan UNLESS the user tells you to. The Stop hook blocks until the success_check matches expected."** with: "When the user approves a plan via `ExitPlanMode`, `.claude/active-plan.json` is written. This marker is consulted by `post-edit-test-regression-block.sh` for per-package test regression detection during the plan. Turn-end completion is NOT mechanically enforced; you are expected to honor the plan's scope by self-discipline."
2. Keep the lint-rule-disable, bulk-edit, revert-thrashing, and post-edit test regression contracts as-is — those ARE backed by real hooks.

**Trade-offs**: Reverts the contract to a soft expectation. Loses the "willpower-replacement" benefit for the specific case of stopping mid-plan. Acceptable if the test-regression-block hook + the marker's downstream consumers provide enough coverage in practice.

### Option (c) — Keep marker as informational; add session-start orientation echo

A middle ground:

1. Keep the marker writer + the post-edit consumer (no change).
2. Update `CLAUDE.md` per Option (b)'s wording.
3. Modify `session-start-orientation.sh` to echo `[Active plan: ${label} — success_check unmet]` whenever `.claude/active-plan.json` exists AND the success_check is currently failing. This makes the active plan visible to every new session without blocking turn-end.

**Trade-offs**: Cheap to implement. Surfaces the active-plan status without enforcement cost. Doesn't satisfy the "willpower-replacement" goal — Claude can still stop mid-plan, just gets reminded next session.

## Consequences

### Option (a) — Implement the hook

**Positive**:
- Mechanical contract becomes real. The CLAUDE.md description matches behavior.
- Closes the documentation-vs-reality drift.
- Eliminates the failure mode where Claude stops mid-plan and the user has to re-prompt to resume.

**Negative**:
- Adds turn-end latency (potentially seconds to minutes for plans with `qa:test:coverage`).
- Must handle edge cases: marker absence, success_check command missing, network/build flakiness, slow tests.
- Runs the success_check on every Stop, even when nothing has changed since last success.
- May need a result cache with explicit invalidation (e.g., invalidated on file edits).

### Option (b) — Remove aspirational language

**Positive**:
- Documentation matches reality.
- No latency cost.
- Simpler mental model — only the contracts backed by hooks are described.

**Negative**:
- Loses the "willpower replacement" framing for the stop-mid-plan case.
- Future drift between Claude's behavior and the user's intent goes uncaught at turn-end.
- Existing CLAUDE.md text would need other adjustments (the references to `.claude/user-pause`, abandon-plan.sh, and "the Stop hook blocks until the success_check matches expected" all rely on the aspirational hook existing).

### Option (c) — Marker stays informational + session-start echo

**Positive**:
- Cheap. No latency.
- Surfaces the active-plan label + status to every session without re-prompting.
- Complements existing post-edit test regression detection.
- Lowest implementation risk.

**Negative**:
- Doesn't enforce stopping mid-plan.
- Adds a new failure mode: session-start echo can drift if `success_check` references commands that no longer exist (e.g., a renamed `qa:*` script).

## Recommendation (advisory only — user decides)

**Option (c)** is the most surgical fix: it closes the documentation-vs-reality gap with minimal risk and no latency cost, while keeping the marker pipeline (writer + post-edit consumer) intact. If the user later wants stronger enforcement, Option (a) can be layered on top of (c).

**Option (a)** is the right answer if the user values the "willpower replacement" mechanism enough to accept turn-end latency. Implementation should include result caching + cache invalidation on Edit/Write to keep the cost amortized.

**Option (b)** is right if the user concludes the aspirational language was misleading and the post-edit test regression hook is sufficient coverage in practice.

## References

- `CLAUDE.md` — "Active-Plan Binding Contract" section.
- `.claude/hooks/post-exit-plan-mode-record.sh` — marker writer.
- `.claude/hooks/post-edit-test-regression-block.sh` — marker reader (uses `success_check` for plan identification, not Stop-time enforcement).
- `.claude/hooks/stop-preview-override.sh` — currently the ONLY Stop hook; unconditionally allows.
- `.claude/settings.json` lines 221–230 — Stop matcher registration.
- `.claude/active-plan.json` schema: `{plan_path, approved_at, success_check, expected, label, commands}`.
- `docs/decisions/0001-template.md` — ADR template followed.
- `docs/decisions/0002-persistent-knowledge-stack.md` — companion decision establishing the Serena memory + hook layer this ADR audits.
