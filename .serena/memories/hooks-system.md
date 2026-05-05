# `.claude/hooks/` — Mechanical enforcement layer

> Captured 2026-05-05. Branch: `main`. Path: `.claude/hooks/`. Companion to CLAUDE.md "Active-Plan Binding Contract" + "Code navigation — READ THIS FIRST".

The hooks layer is the project's behavioral guardrail — bash + node scripts wired into `.claude/settings.json` via `PreToolUse` / `PostToolUse` / `SessionStart` / `Stop` matchers. Each hook receives the tool input as JSON on stdin and answers via exit code (0=allow silently, 2=deny with stderr message) or a JSON `{decision: allow|ask|block}` envelope.

## Wiring map (`.claude/settings.json`)

### `PreToolUse`

- **`Bash`** (10 hooks, in order):
  1. `pre-destructive-git.sh` — denies stash/reset/checkout-of-paths/clean/restore/revert/branch-D/push--force/rebase/cherry-pick/abort/tag-d/gc-prune/filter-branch/update-ref-d/worktree-remove/submodule-deinit/rm-rf/kill/chmod-777/dd/mkfs/sudo/curl-pipe-sh/eval/truncate/docker-prune/npm-publish. Emits a `permissionDecision: deny` JSON with `systemMessage`.
  2. `pre-commit-verify.sh` — non-blocking reminder when `git commit` is about to run (echoes verification checklist).
  3. `pre-qa-commands.sh` — blocks `npx vitest`, `cd subdir && pnpm qa:*`, piped `qa:lint | grep|head|tail|awk|sed|wc`, AND repeats of `qa:lint` within 120s (tracked via `.claude/.last-lint-run`). Override: `touch .claude/approved-relint` (consumed; also wipes `.resist-lint-cache.json`).
  4. `pre-git-add-all.sh` — `decision: ask` on `git add -A` / `git add .` (warns about sensitive files, doesn't block).
  5. `pre-plan-file-validate.sh` — when `Bash` writes a heredoc into `docs/plans/*.md`, validates structure (Status Legend, Baseline, Execution Order, Register Rules+Config, Integration Verification with command/config/class/dead-code checks, Full QA+Coverage with pnpm cmds, Final Verification+Commit with ≥3 verify bullets, every TASK has **Verification**, every non-tail TASK has **Files**).
  6. `pre-bash-no-file-writes.sh` — denies `> file`, `>> file`, `tee`, `sed -i`, `awk -i inplace`, `cat <<EOF > file`, `dd of=`, `install -m`. **Absolute block** on creating/modifying `.claude/approved-*` or `.claude/user-pause` markers (these are USER-ONLY tokens). Allows `git`/`pnpm`/`npm`/`node`/`turbo`/`vitest`/`biome`/`prettier`/`svelte-kit`/`tsgo` and stdout-only `source`/`echo`/`ls`/`grep`/`find`.
  7. `pre-bash-block-bulk-script.sh` — denies `python3 -c` with `glob.|pathlib|Path(.walk|os.walk`, `python3 script.py` whose script uses `glob.glob`/`pathlib.Path`/`os.walk` and lists ≥4 packages or globs, `sed -i`/`awk -i inplace` with `*.ext` or `find -exec sed`. Override: `touch .claude/approved-bulk-script` (consumed).
  8. `pre-bash-block-multi-file-shell.sh` — denies `find -exec (sed -i|awk -i inplace|perl -i|mv|cp|sh -c|tee)`, `for f in *glob*; do (sed -i|mv|cp|>$f|tee); done`, `xargs (sed -i|mv|cp|tee|sh -c)`, `grep -rl … | (sed -i|mv|cp|perl -i|awk -i inplace)`. Skips git commands. Same approval marker as `pre-bash-block-bulk-script.sh`.
  9. `pre-bash-block-claude-abandon-attempt.sh` — denies `bash .claude/hooks/abandon-plan.sh` and variants. abandon-plan is USER-ONLY.
  10. `redirect-bash-search.sh` — denies `grep|rg|ag|ack` + `find -exec grep` + `xargs grep` (unless target is `*.md|json|jsonc|yml|yaml|log|txt|sh|css` or `grep -c`); also denies `cat|head|tail|sed|awk` on `*.ts|tsx|js|jsx|svelte` files (heredocs allowed). Redirects to `mcp__serena__find_symbol` / `mcp__cocoindex_code__search`.

- **`Grep`** — `redirect-grep.sh`. Considers a target "code" when `path` ends in `.ts|tsx|js|jsx|svelte`, points into `src/|lib/|routes/|packages/`, `include` matches code extensions, OR `pattern` contains `function|class|export|import|interface|type |const |let |var |async `. Allows `include: *.md|json|jsonc|yml|yaml|log|txt|sh|css`. Otherwise emits message redirecting to Serena tools.

- **`Read`** — `redirect-read.sh`. **Once per session**, if file is `.ts|tsx|js|jsx|svelte` AND a memory `.serena/memories/${group}-${pkg}-overview.md` exists for the file's package, the FIRST read is denied with redirect message to `mcp__serena__read_memory`. Subsequent reads of the same file are allowed (tracked in `/tmp/claude-serena-reads`, cleared on session start).

- **`Glob`** — `redirect-glob.sh`. Denies `*.{ts,tsx,js,jsx,svelte}` patterns (allows `*.test.ts` / `*.spec.ts`). Redirects to Serena symbol tools or CocoIndex search.

- **`Write`** (5 hooks):
  1. `pre-plan-file-validate.sh` — same plan-file structural validator as Bash matcher.
  2. `pre-edit-lint-config-deny.sh` — denies new `"<rule>": "off"`, new `"files": [...]` override blocks, regex-based diagnostic suppression (`PARSE_SUPPRESSION|continue;.*svelte\.d\.ts|skipFile|suppressDiagnostic`), new `"packages/…"` exclude entries on `.oxlintrc(.json)|biome(.base)?.json|.resist-lint.jsonc|.resist-lint.json|lint/src/tools/{oxlint,svelte-check,tsgo}.ts|lint/src/framework/oxc-runner.ts`. Override: `touch .claude/approved-lint-disable` (consumed).
  3. `pre-edit-revert-detector.sh` — hashes `(old_string, new_string)` to first-32-chars-of-sha256, appends to `.claude/edit-history.jsonl` (`{ts, file, old_hash, new_hash}`), and BLOCKS the 2nd time (within last 50 entries) the same file gets either `new_hash` matching a previous `old_hash` (undo) OR `new_hash` matching a previous `new_hash` (re-write). Override: `touch .claude/approved-revert` (consumed).
  4. `check-memory.sh` — non-blocking reminder when an Edit/Write targets a `packages/{group}/{pkg}/...` file with a `.serena/memories/${group}-${pkg}-overview.md`. Echoes a `[Memory available]` notice.
  5. **Inline prompt hook** (Haiku 4.5, 15s timeout) — process gate that reads `$ARGUMENTS` (file path being created) and answers `allow` / `block: <reason>`. Rule 1 ABSOLUTE: any of `docs/plans/*.md`, `.claude/**/*`, `*.test.ts`, `*.spec.ts`, `*.md`, `*.json`, `*.jsonc`, `package.json` → allow immediately. Rule 2: new `.ts|.js|.svelte` → require explicit changelog approval or matching plan file. Rule 3: unclear → allow.

- **`Agent`** (2 hooks):
  1. `pre-agent-approval.sh` — emits `decision: ask` with the agent description so the user must approve.
  2. **Inline prompt hook** (Haiku 4.5) — Rule 1 ABSOLUTE: ALWAYS `allow`. Rationale: agents are guarded by per-file Write/Edit hooks, not by the agent dispatch itself.

- **`Edit`** (4 hooks):
  1. `pre-lint-rule-edit.sh` — emits `decision: ask` if file matches `config/tooling/lint/src/rules/`. User must approve every custom rule edit.
  2. `pre-edit-lint-config-deny.sh` (same as Write).
  3. `pre-edit-revert-detector.sh` (same as Write).
  4. `check-memory.sh` (same as Write).

### `PostToolUse`

- **`Edit|Write`** (3 hooks):
  1. `post-edit-format-lint.sh` — runs (in order, all best-effort): `prettier --write` (Svelte) OR `biome format --write` (TS/JS/JSON/CSS/HTML/MD); `resist-lint --fix <file>` (TS/JS/Svelte); `resist-lint --tools --json <file>` then compares against `.claude/lint-baseline.json` via `.claude/hooks/lib/baseline-compare.mjs` (count-map keyed by `file|ruleId|message`). On NEW findings (current count > baseline count for the edited file): emits `{decision: block, reason: "New lint in <file>: <BLOCK_MSG>"}`. Otherwise auto-shrinks baseline downward (`baseline[k] = min(baseline[k], current_count)`). Bypass: `CLAUDE_HOOK_BYPASS=1`. Plan-file branch ALSO re-validates `docs/plans/*.md` for required sections.
  2. `post-edit-test-regression-block.sh` — only fires if `.claude/active-plan.json` exists. Walks up to nearest `package.json`, reads `name` + `scripts['qa:test']`, debounces 30s per package via `.claude/.test-debounce-<pkg>`, runs `timeout 60 pnpm --filter <pkg> run qa:test`, parses `Tests N passed`. Updates `.claude/last-test-baseline.json` upward; emits stderr `⚠ TEST REGRESSION` and exits 2 (PostToolUse blocks emit a system-reminder back to Claude — they DO NOT roll back the edit) when current < baseline.
  3. `post-edit-update-memory.sh` — non-blocking reminder. For code-file edits inside `packages/{group}/{pkg}/`: if a memory exists, echoes `[Memory may need update]`; otherwise echoes `[No memory exists] — write '${pkg_key}-overview.md'`. Skips test files, `.claude/`, `docs/`, `.serena/`.

- **`ExitPlanMode`** — `post-exit-plan-mode-record.sh`. After plan approval: finds the most recent `.md` in `~/.claude/plans/`, extracts H1 title as `label`, greps EVERY `pnpm -w run qa:[a-z:]+` reference (deduped/sorted), chains them into `( cmd1 && cmd2 && ... ) >/dev/null 2>&1; echo $?` as `success_check`. **Plan-time guard**: if plan body mentions `qa:test:coverage` but the extractor didn't capture it, refuses to write the marker (closes the loophole where a coverage-goal plan was lint-only-guarded). Resolves a real `docs/plans/*.md` path by matching first H1. Writes `{plan_path, approved_at, success_check, expected: "0", label, commands}` to `.claude/active-plan.json`.

### `Stop`

- **`""` (empty matcher)** — `stop-preview-override.sh`. Emits `{decision: allow}`. Rationale: silences the disabled built-in Preview plugin's stop callback. **NOTE: CLAUDE.md describes a `stop-active-plan-block.sh` hook that BLOCKS turn-end until `active-plan.json::success_check` matches `expected`. That hook is NOT on disk in this snapshot — only `stop-preview-override.sh` exists for the Stop matcher. The active-plan binding contract documented in CLAUDE.md is partially aspirational vs. partially implemented.**

### `SessionStart`

- Matchers `startup` / `resume` / `compact` / `clear` all run `session-start-orientation.sh`:
  - Wipes `.claude/.last-lint-run` and `/tmp/claude-serena-reads` (fresh tracking each session).
  - Reads `.claude/active-plan.json` for label echo if present.
  - Lists every `.serena/memories/*.md` and prints "Available Serena memories: …".
  - **Stale memory detection**: for each `*-overview.md`, splits filename on first dash to derive `group/pkg`, then compares `mtime` of memory file against `git log -1 --format=%ct -- "packages/$group/$pkg/"`. If commit > memory mtime, lists the memory in `[Stale memories detected]`.
  - **Coverage gap detection**: for each `packages/*/*/` with source files, if no matching `${group}-${pkg}-overview.md` exists, lists in `[Missing memory coverage]`.
  - Counts `docs/decisions/*.md` and prints `Available ADRs: N decisions logged.`

## User-only hooks (NOT in settings)

- `abandon-plan.sh` — removes `.claude/active-plan.json`, appends to `.claude/abandoned-plans.log` as `${ts}\tABANDONED\t${label}\t${plan_path}\t${reason}`. Claude is blocked from invoking this via `pre-bash-block-claude-abandon-attempt.sh`.
- `pause-plan.sh` — creates `.claude/user-pause` marker (freezes plan enforcement without abandoning). Claude is blocked from creating this marker via `pre-bash-no-file-writes.sh`'s absolute-block layer.

## Approval markers (USER-ONLY tokens)

Each marker is consumed (deleted) by the hook on first match:

| Marker | Unblocks | Consuming hook |
|--------|----------|----------------|
| `.claude/approved-lint-disable` | One Edit/Write to `.oxlintrc.json` / `biome.json` / lint runner with disable patterns | `pre-edit-lint-config-deny.sh` |
| `.claude/approved-bulk-script` | One python3/sed/awk multi-file invocation OR find/for/xargs/grep-rl write loop | `pre-bash-block-bulk-script.sh` AND `pre-bash-block-multi-file-shell.sh` |
| `.claude/approved-revert` | One Edit/Write that hashes back to a previous old/new state on the same file | `pre-edit-revert-detector.sh` |
| `.claude/approved-relint` | One `pnpm -w run qa:lint` re-run (also wipes `.resist-lint-cache.json`) | `pre-qa-commands.sh` |
| `.claude/user-pause` | Persistent — freezes the (aspirational) Stop-hook plan-enforcement | (referenced by docs only; no hook reads it currently) |

`pre-bash-no-file-writes.sh`'s absolute block prevents Claude from creating any of these markers via `touch|install|dd|mv|cp|ln|chmod|chown|tee|cat|printf|echo` against `.claude/approved-*` or `.claude/user-pause` paths.

## Telemetry stores

- `.claude/edit-history.jsonl` — append-only JSONL `{ts, file, old_hash, new_hash}` from `pre-edit-revert-detector.sh`. Tail-50 scan per edit. ~84KB at this snapshot — would need rotation if it grows unbounded.
- `.claude/lint-baseline.json` — count-map `{ "file|ruleId|message": count }` consumed by `post-edit-format-lint.sh` via `lib/baseline-compare.mjs`. Auto-shrinks downward when fixes are applied.
- `.claude/last-test-baseline.json` — `{ packageName: lastKnownPassCount }` per package, updated upward by `post-edit-test-regression-block.sh`.
- `.claude/.last-lint-run` — Unix timestamp of last `qa:lint` invocation. Cooldown enforcement.
- `.claude/.test-debounce-<pkg>` — per-package 30s debounce timestamp.
- `.claude/abandoned-plans.log` — TSV `${ts}\tABANDONED\t${label}\t${plan_path}\t${reason}`.
- `node_modules/.cache/.resist-hooks-stamp` — touched by `qa:hooks` after passing; `qa:hooks:cached` skips re-run if no `.claude/hooks/*` file is newer than the stamp.

## Tests

- `qa:hooks` (root) → `bash .claude/hooks/hooks.test.sh` then `touch node_modules/.cache/.resist-hooks-stamp`.
- `qa:hooks:cached` (root) → no-op if stamp newer than every `.claude/hooks/*`; otherwise runs `qa:hooks`.
- `pnpm qa:lint` (root) chains `qa:hooks:cached` after the linter run when no path argument is passed.
- `hooks.test.sh` — settings.json validation (every referenced hook exists; no empty matchers except Stop; PostToolUse matchers are `Edit|Write` or `ExitPlanMode`); orphan check (every disk hook is either in settings, neutralized to `exit 0`, or a known user-invoked hook like `abandon-plan.sh`/`pause-plan.sh`); per-hook behavioral assertions.
- `enforcement-hooks.test.sh` — direct invocation of each enforcement hook with synthetic JSON tool inputs; asserts exit codes 0/2 + message content. Wipes `.claude/active-plan.json` and approval markers + `edit-history.jsonl` at start.

## Library helpers

- `.claude/hooks/lib/baseline-compare.mjs` — node script invoked by `post-edit-format-lint.sh`. Reads `BASELINE_PATH` + `EDITED_FILE` env vars + lint JSON on argv; emits `BLOCK\n<msg>` on new findings or auto-shrinks baseline.
- `.claude/scripts/lint-baseline.sh` — bootstrap helper for regenerating `.claude/lint-baseline.json` from a fresh full-workspace lint run.

## Philosophy

The hooks layer encodes "what the model fails at" as mechanical guards rather than admonitions. The pattern is: detect a failure mode (laziness, thrashing, unauthorized scope-broadening, search escape hatches) → write a hook that DENIES the action with a structured stderr message → expose a USER-ONLY override marker for legitimate exceptions. Once the marker is consumed, the override is spent — no global toggles, no persistent disables. This is what the CLAUDE.md "Active-Plan Binding Contract" section codifies as `.claude/active-plan.json` + the success-check chain.
