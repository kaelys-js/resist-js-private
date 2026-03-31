# @/lint Phase 40 — Svelte Script Block Linting Support

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: Investigation — linter silently skips `.svelte` files because oxc-parser can't parse HTML
**Goal**: Add Svelte script block extraction so ALL TypeScript AST rules automatically lint `<script lang="ts">` blocks inside `.svelte` files. Add `.svelte` to default extensions. Extensive tests covering extraction, integration, edge cases, and line number mapping.
**Architecture**: Extract `<script>` content from `.svelte` files before parsing with oxc-parser. Replace non-script lines with empty strings to preserve line number mapping. In pattern matching, treat `.svelte` files as matching `**/*.ts` patterns so all TS rules automatically apply. Pass extracted content to oxc-parser with `.ts` filename override.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 4647 pass / 0 fail |
| Type-check | Passes |
| Svelte script extraction | None — .svelte files silently skipped |
| Default extensions | ['.ts', '.svelte.ts', '.mjs'] |

---

## TASK 0 — Add `extractSvelteScript()` to oxc-runner.ts

**Status**: [x]

**What**: Create a function that extracts TypeScript content from `<script>` blocks in `.svelte` files, preserving line numbers by replacing non-script lines with empty strings.

**Plan**:
- Add `extractSvelteScript(content: string): string` to `oxc-runner.ts`
- Export it for testing
- Handle: `<script>`, `<script lang="ts">`, `<script lang="js">`, `<script module>`, `<script context="module">`
- Split content into lines, identify script block start/end, keep script lines, blank out template/style lines
- Support multiple script blocks (module + instance)
- If no script block found, return empty string

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Type-check passes

---

## TASK 1 — Integrate extraction into `runTypeScriptRules()`

**Status**: [x]

**What**: Modify `runTypeScriptRules()` to detect `.svelte` files, extract script content, and parse it as TypeScript.

**Plan**:
- If `filePath.endsWith('.svelte')`:
  1. Call `extractSvelteScript(content)` to get script-only content
  2. If empty (no script block), return `[]`
  3. Pass extracted content to `parseSync()` with filename override (append `.ts` so oxc-parser treats it as TypeScript)
  4. Build line map from the ORIGINAL content (not extracted) so `patchLoc` produces correct line numbers
  5. Use extracted content for `context.content` so text-based rules (Program visitor scanning lines) only see script content
- For non-svelte files, no change to behavior

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Type-check passes

---

## TASK 2 — Make `.svelte` files match `**/*.ts` rule patterns

**Status**: [x]

**What**: In `cli-helpers.ts` pattern matching, treat `.svelte` files as also matching `**/*.ts` patterns so ALL TypeScript rules automatically lint Svelte script blocks.

**Plan**:
- In the pattern matching logic (line ~1073), when a file ends with `.svelte` and a rule pattern is `**/*.ts`, treat it as a match
- This ensures all existing TS rules (valibot, jsdoc, imports, naming, etc.) automatically lint `.svelte` files without needing pattern changes
- Rules can still use `**/*.svelte` explicitly for Svelte-specific rules

**Files**:
- Modify: `src/cli-helpers.ts`

**Verification**: Type-check passes

---

## TASK 3 — Register Rules + Config

**Status**: [x]

**What**: Add `.svelte` to the default extensions array so the CLI discovers `.svelte` files for linting. Update config schema and JSON schema generation.

**Plan**:
- Modify `LintConfigSchema` in `config/schema.ts`: add `.svelte` to defaults array → `['.ts', '.svelte.ts', '.svelte', '.mjs']`
- Update JSON schema generation default in `schema.ts` to match
- Update `config/schema.test.ts` to expect `.svelte` in defaults

**Files**:
- Modify: `src/config/schema.ts`
- Modify: `src/config/schema.test.ts`

**Verification**: Type-check passes, existing config tests pass

---

## TASK 4 — Tests: `extractSvelteScript()` unit tests

**Status**: [x]

**What**: Extensive unit tests for the extraction function.

**Plan** — test cases:
1. Single `<script lang="ts">` block — extracts TS content, preserves line numbers
2. Single `<script>` block (no lang attr) — still extracts
3. `<script lang="js">` block — extracts
4. `<script module>` (Svelte 5 module context) — extracts
5. `<script context="module">` (Svelte 4 module context) — extracts
6. Multiple script blocks (module + instance) — extracts both, preserves line positions
7. No script block (template-only) — returns empty string
8. Empty file — returns empty string
9. Script block with imports and complex TypeScript — full content preserved
10. Closing `</script>` on same line as last code — handled correctly
11. Script tag attributes in various orders — `<script lang="ts" module>`
12. Whitespace variations in script tags — `<script  lang = "ts" >`

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`

**Verification**: All tests pass

---

## TASK 5 — Tests: Integration — AST rules on `.svelte` files

**Status**: [x]

**What**: Integration tests verifying full end-to-end linting of `.svelte` files.

**Plan** — test cases:
1. Run an AST rule (e.g., a simple TypeScriptRule with `Program` visitor) on a `.svelte` file with `<script lang="ts">` — verify it detects issues in script block
2. Verify line numbers in results match the original `.svelte` file lines (not extracted offset)
3. Verify `context.content` contains only the script block content
4. Verify `context.file` is the original `.svelte` filename
5. Verify imports are extracted correctly from `.svelte` script blocks
6. Verify a `.svelte` file with no script block produces zero results
7. Verify non-svelte `.ts` files are unaffected (regression check)
8. Verify `.svelte.ts` files still work correctly (regression check)

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`

**Verification**: All tests pass

---

## TASK 6 — Tests: Edge cases

**Status**: [x]

**What**: Edge case tests for malformed/unusual `.svelte` files.

**Plan** — test cases:
1. Malformed script tag (unclosed `<script>`) — graceful handling, no crash
2. Text containing `</script>` inside a string literal in the script block — correct extraction
3. Script tag in HTML comment `<!-- <script> -->` — should not extract
4. Style block between two script blocks — only script content extracted
5. Svelte template with `{@html '<script>alert(1)</script>'}` — not confused by template expressions
6. File with only `<style>` block — returns empty, no crash
7. Script block with TypeScript generics using `<T>` — not confused with HTML tags

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`

**Verification**: All tests pass

---

## TASK 7 — Tests: Pattern matching for `.svelte` → `**/*.ts`

**Status**: [x]

**What**: Tests verifying that `.svelte` files match `**/*.ts` rule patterns.

**Plan** — test cases:
1. Rule with pattern `**/*.ts` matches `Component.svelte`
2. Rule with pattern `**/*.svelte` matches `Component.svelte`
3. Rule with pattern `**/*.tsx` does NOT match `Component.svelte`
4. Rule with pattern `**/*.svelte.ts` matches `Component.svelte.ts` but NOT `Component.svelte`
5. Non-svelte file `module.ts` still matches `**/*.ts` (regression)

**Files**:
- Modify: `src/framework/oxc-runner.test.ts` or `src/cli-helpers.test.ts` as appropriate

**Verification**: All tests pass

---

## TASK 8 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 9 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify `extractSvelteScript` is exported and tested
- Verify `.svelte` is in default extensions
- Verify `.svelte` files match `**/*.ts` patterns
- Verify test count increased from baseline (4647)
- Commit with descriptive message

**Verification**:
- All tests pass
- Test count ≥ baseline + new tests

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 0 | extractSvelteScript function | — |
| 1 | Integration into runTypeScriptRules | 0 |
| 2 | Pattern matching for .svelte → **.ts | — |
| 3 | Register Rules + Config (extensions) | — |
| 4 | Unit tests for extraction | 0 |
| 5 | Integration tests | 0, 1 |
| 6 | Edge case tests | 0, 1 |
| 7 | Pattern matching tests | 2 |
| 8 | Full QA + Coverage | 0-7 |
| 9 | Final verification + commit | 8 |
