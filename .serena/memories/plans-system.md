# `docs/plans/` — Plan lifecycle and active-plan binding

> Captured 2026-05-05. Branch: `main`. Companions: `hooks-system` (mechanical enforcement), CLAUDE.md "Active-Plan Binding Contract".

## Directory layout

```
docs/
├── decisions/                       Architecture Decision Records (ADRs)
│   ├── 0001-template.md             Template (currently the only file)
│   └── 0002-…                       Future ADRs
├── plans/                           Active + drafted plans (date-prefixed YYYY-MM-DD)
│   ├── TEMPLATE.md                  Required-section template — pre-plan-file-validate.sh enforces this
│   ├── 2026-04-02-vscode-phase-75.md
│   ├── 2026-04-02-vscode-phase-89.md
│   ├── 2026-04-07-common-schemas-coverage.md
│   ├── 2026-04-07-core-config-coverage.md
│   ├── 2026-04-07-result-coverage.md
│   ├── 2026-04-07-template-literal-coverage.md
│   ├── 2026-04-07-web-vitals-coverage.md
│   ├── 2026-04-24-lint-scope-and-grep-block.md
│   ├── 2026-04-24-locale-lint-fix.md
│   ├── 2026-04-24-test-presets-coverage.md
│   ├── 2026-04-24-workspace-coverage-thresholds.md
│   ├── 2026-04-25-vite-qa-lint-cleanup.md
│   ├── 2026-04-26-lint-package-final.md
│   ├── 2026-04-26-workspace-coverage-functions-91pct.md
│   ├── 2026-04-26-workspace-non-lint-non-cli-cleanup.md
│   ├── 2026-04-26-workspace-qa-lint-entire.md
│   ├── 2026-04-26-workspace-qa-lint.md
│   ├── 2026-04-27-workspace-jsdoc-clean.md
│   ├── 2026-04-30-workspace-jsdoc-types.md
│   └── 2026-05-04-workspace-no-array-method-in-loop.md
└── plans-archive/                   Completed plans, same naming
    └── (33 files, 2026-04-02 through 2026-04-27)
```

Plans are flat — no subdirs in `docs/plans/` at this snapshot. The earlier "subdirs (`docs/`, `linter/`, `projects/`, `repository/`)" referenced by `monorepo-architecture-uncovered.md` no longer exist; everything migrated to flat date-prefixed `.md` files.

## Plan template (`TEMPLATE.md`)

Strict structure — `pre-plan-file-validate.sh` and `post-edit-format-lint.sh` will BLOCK Write/Edit operations on `docs/plans/*.md` files that omit any of these. Required sections:

1. **`## Status Legend`** — `[ ]` not started, `[x]` done, `[~]` in progress.
2. **`## Baseline (before any changes)`** — metrics table.
3. **`## TASK N — <name>`** blocks. Every task MUST contain a `**Verification**:` line. Every non-tail task MUST contain a `**Files**:` block.
4. **`## TASK — Register Rules + Config`** — tail task; must register all new rules/exports.
5. **`## TASK — Integration Verification`** — must include checks for: command registration (`registerCommand|command.*register|registered`), config settings reads (`config.*read|setting.*read|config\.get`), class instantiation (`class.*instantiat|feature.*wired|instantiated`), unused exports / dead code (`export.*import|unused.*export|dead.*code|orphan`).
6. **`## TASK — Full QA + Coverage`** — must list `pnpm` commands.
7. **`## TASK — Final Verification + Commit`** — must contain ≥3 occurrences of "Verify" / "verify".
8. **`## Execution Order`** — task-dependency table.

The Integration Verification task is the key load-bearing piece — designed to prevent Phase-66-style failures where features were created but never wired into the application.

## Active-plan binding contract

Lifecycle:

1. **Approval** — user invokes `ExitPlanMode` on a plan draft. SvelteKit/Claude harness writes the staged plan body to `~/.claude/plans/<random-slug>.md`.
2. **Marker write** — `post-exit-plan-mode-record.sh` (PostToolUse on `ExitPlanMode`) finds the most recent staging file, extracts:
   - `label` — first H1.
   - `plan_path` — match against `docs/plans/*.md` first lines.
   - `commands` — every `pnpm -w run qa:[a-z:]+` token (deduped, sorted).
   - `success_check` — `( cmd1 && cmd2 && ... ) >/dev/null 2>&1; echo $?`.
   - `expected` — `"0"`.
   - `approved_at` — UTC ISO timestamp.
   
   Writes JSON to `.claude/active-plan.json`. **Plan-time guard**: if the plan body literally mentions `qa:test:coverage` but the extractor didn't capture it (e.g. backtick splitting across lines), refuses to write the marker — preventing a coverage-goal plan from being lint-only-guarded.
3. **Enforcement** — CLAUDE.md describes a `stop-active-plan-block.sh` Stop hook that should evaluate `success_check` and block turn-end until output equals `expected`. **At this snapshot, only `stop-preview-override.sh` is registered for the Stop matcher; the active-plan-blocking Stop hook is documented but not on disk.** The marker is therefore mostly informational right now.
4. **Observation during execution**:
   - `post-edit-test-regression-block.sh` runs only when `.claude/active-plan.json` exists. Per code-file edit, runs the touched package's `qa:test` (60s budget, 30s per-package debounce), tracks `last-test-baseline.json` per package, emits a system-reminder via stderr-block when test counts drop.
5. **Pause** — user runs `bash .claude/hooks/pause-plan.sh` → creates `.claude/user-pause` (marker only; the marker file is referenced by docs but not currently consumed by any registered hook). To resume: `rm .claude/user-pause`.
6. **Abandon** — user runs `bash .claude/hooks/abandon-plan.sh "<reason>"`:
   - Reads `label` and `plan_path` from `.claude/active-plan.json`.
   - Appends `${ts}\tABANDONED\t${label}\t${plan_path}\t${reason}` to `.claude/abandoned-plans.log`.
   - Removes `.claude/active-plan.json`.
   
   Claude is BLOCKED from invoking this via `pre-bash-block-claude-abandon-attempt.sh` (which denies any `bash .claude/hooks/abandon-plan.sh` Bash command). This is a USER-ONLY mechanism. The same applies to `.claude/user-pause`: `pre-bash-no-file-writes.sh` has an absolute block layer that denies any `touch|install|dd|mv|cp|ln|chmod|chown|tee|cat|printf|echo` invocation that targets `.claude/approved-*` or `.claude/user-pause`.

## Plan validation hooks (recap from hooks-system)

- **`pre-plan-file-validate.sh`** runs on `Write` (and `Bash` heredoc-to-plan-file) PreToolUse. Validates every required section + per-task structure. Returns `{decision: "block", reason: ...}` JSON on failure.
- **`post-edit-format-lint.sh`** runs on PostToolUse `Edit|Write`. For `*/docs/plans/*.md` files: re-validates Status Legend / Baseline / Register/Integration/QA/Final Verification / Execution Order. Emits `{decision: "block", reason: ...}` if any are missing.

## Archive workflow (informal)

After a plan is fully completed and committed, the user moves the file from `docs/plans/<file>.md` to `docs/plans-archive/<file>.md`. There's no automation — date prefix in the filename remains the same. Archived plans accumulated 33 entries between 2026-04-02 and 2026-04-27 in this snapshot.

## Abandoned-plans log

`.claude/abandoned-plans.log` — TSV `${ts}\tABANDONED\t${label}\t${plan_path}\t${reason}`. Single entry at this snapshot:

```
2026-04-30T19:40:09Z	ABANDONED	Workspace QA — Eliminate 1,008 jsdoc/require-param + jsdoc/require-returns Errors via Built-in Autofix	/Users/home/.claude/plans/atomic-growing-tarjan.md	done
```

## Why this exists

Quoting CLAUDE.md "Active-Plan Binding Contract": the goal is to make three behaviors that previously required willpower MECHANICAL —

1. Cannot stop mid-plan (success_check enforcement).
2. Cannot add lint-rule disables (`pre-edit-lint-config-deny.sh`).
3. Cannot run multi-file Python/sed bulk-edit scripts (`pre-bash-block-bulk-script.sh` + `pre-bash-block-multi-file-shell.sh`).

Plans encode the *contract*; hooks enforce it. The plan template's Integration Verification task forces the "did you actually wire this in?" question; `post-edit-test-regression-block.sh` catches silent regressions; `stop-active-plan-block.sh` (when implemented) would gate turn-end on the chained `qa:*` commands listed in the plan.

## Companion documents

- **Template**: [`docs/plans/TEMPLATE.md`](docs/plans/TEMPLATE.md).
- **ADR template**: [`docs/decisions/0001-template.md`](docs/decisions/0001-template.md).
- **Active-plan binding philosophy**: CLAUDE.md "Active-Plan Binding Contract" section.
- **Hook details**: `hooks-system` memory.
