# @/lint Phase 41 — Generalize Script Block Extraction to All Embedded-Script Formats

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: Phase 40 added Svelte script block extraction — generalize to Astro, HTML, Vue, Markdown, MDX, and embedded strings
**Goal**: Rename `extractSvelteScript` → `extractScriptBlocks`, add `extractCodeFences` for MD/MDX, generalize `runTypeScriptRules()` to handle all embedded-script formats, add `lint-embedded-strings` rule for template literals containing `<script>` blocks, update pattern matching and config defaults. Extensive tests for every format.
**Architecture**: `extractScriptBlocks()` handles `<script>` tag formats (`.svelte`, `.astro`, `.html`, `.vue`). `extractCodeFences()` handles fenced code blocks (`.md`, `.mdx`). `runTypeScriptRules()` dispatches by extension. Pattern matching treats all embedded formats as matching `**/*.ts`. New `lint-embedded-strings` TypeScript rule detects embedded scripts in template/string literals.

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
| Tests | 4675 pass / 0 fail |
| Type-check | Passes |
| Supported embedded formats | `.svelte` only |
| Default extensions | ['.ts', '.svelte.ts', '.svelte', '.mjs'] |

---

## TASK 0 — Rename `extractSvelteScript` → `extractScriptBlocks`

**Status**: [x]

**What**: Rename the function to be format-agnostic. Update JSDoc, all call sites, test imports.

**Plan**:
- Rename `extractSvelteScript` → `extractScriptBlocks` in `oxc-runner.ts`
- Update JSDoc to describe it as format-agnostic (Svelte, Astro, HTML, Vue)
- Update import in `oxc-runner.test.ts`
- Update call site in `runTypeScriptRules()`
- No behavior change — pure rename

**Files**:
- Modify: `src/framework/oxc-runner.ts`
- Modify: `src/framework/oxc-runner.test.ts`

**Verification**: Type-check passes, all existing tests pass

---

## TASK 1 — Add `extractCodeFences()` for Markdown/MDX

**Status**: [x]

**What**: New function to extract TypeScript/JavaScript content from fenced code blocks in Markdown/MDX files.

**Plan**:
- Add `extractCodeFences(content: string): string` to `oxc-runner.ts`
- Export it for testing
- Recognize fences: ` ```ts `, ` ```typescript `, ` ```js `, ` ```javascript `
- Skip non-script fences: ` ```css `, ` ```bash `, ` ```html `, etc.
- Same line-preserving strategy as `extractScriptBlocks` — blank non-code lines
- Support multiple code blocks per file
- If no matching fences found, return empty string

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Type-check passes

---

## TASK 2 — Generalize `runTypeScriptRules()` for all embedded formats

**Status**: [x]

**What**: Replace `.svelte`-only check with unified dispatch for all embedded-script file types.

**Plan**:
- Define `SCRIPT_BLOCK_EXTENSIONS`: `['.svelte', '.astro', '.html', '.vue']`
- Define `CODE_FENCE_EXTENSIONS`: `['.md', '.mdx']`
- In `runTypeScriptRules()`:
  - If file extension in `SCRIPT_BLOCK_EXTENSIONS` → `extractScriptBlocks()`
  - If file extension in `CODE_FENCE_EXTENSIONS` → `extractCodeFences()`
  - Otherwise → existing behavior (parse directly)
- Remove the `.svelte`-specific `isSvelte` check
- All paths still append `.ts` to filename for oxc-parser
- Source backfill still uses original content

**Files**:
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Type-check passes, existing Svelte tests still pass

---

## TASK 3 — Update pattern matching in `cli-helpers.ts`

**Status**: [x]

**What**: All embedded-code extensions match `**/*.ts` patterns automatically.

**Plan**:
- Replace `.svelte`-only check with combined set from `SCRIPT_BLOCK_EXTENSIONS` + `CODE_FENCE_EXTENSIONS`
- Export the combined set as `EMBEDDED_CODE_EXTENSIONS` for testing
- `.astro`, `.html`, `.vue`, `.md`, `.mdx` files all match `**/*.ts` patterns

**Files**:
- Modify: `src/cli-helpers.ts`

**Verification**: Type-check passes

---

## TASK 4 — Register Rules + Config (extensions)

**Status**: [x]

**What**: Add all new extensions to defaults. Update schema and tests.

**Plan**:
- Modify `LintConfigSchema` in `config/schema.ts`: default extensions → `['.ts', '.svelte.ts', '.svelte', '.astro', '.html', '.vue', '.md', '.mdx', '.mjs']`
- Update JSON schema generation default to match
- Update `config/schema.test.ts` to expect new defaults

**Files**:
- Modify: `src/config/schema.ts`
- Modify: `src/config/schema.test.ts`

**Verification**: Type-check passes, config tests pass

---

## TASK 5 — Add `lint-embedded-strings` TypeScript rule

**Status**: [x]

**What**: New AST rule that detects `<script>` blocks inside template literals and string literals, extracts the embedded code, and reports lint violations.

**Plan**:
- Create `src/rules/typescript/lint-embedded-strings.ts`
- Visitor: `TemplateLiteral` and `StringLiteral`
- For each string value, check if it contains `<script` (case-insensitive)
- If yes, extract script content using `extractScriptBlocks()`
- Parse extracted content with oxc-parser
- If parse succeeds, walk AST looking for common issues (any `var` declarations, `eval()` calls)
- If parse fails, report a warning about unparseable embedded script
- Register rule in `.resist-lint.jsonc` with severity `"warn"`

**Files**:
- Create: `src/rules/typescript/lint-embedded-strings.ts`
- Modify: `.resist-lint.jsonc`

**Verification**: Type-check passes

---

## TASK 6 — Tests: `extractScriptBlocks` rename + Astro format

**Status**: [x]

**What**: Verify rename didn't break anything. Add Astro-specific extraction tests.

**Plan** — test cases:
1. All existing Svelte tests pass with renamed function (regression)
2. Astro with `---` frontmatter + `<script>` — frontmatter blanked, script preserved
3. Astro with `<script>` + `<style>` — only script extracted
4. Astro with no `<script>` — empty string
5. Astro with TypeScript generics in script block — not confused with HTML
6. Astro with multiple `<script>` blocks — all extracted

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`

**Verification**: All tests pass

---

## TASK 7 — Tests: `extractCodeFences` unit tests

**Status**: [x]

**What**: Extensive unit tests for the code fence extraction function.

**Plan** — test cases:
1. Single ` ```ts ` block — extracts content, preserves line numbers
2. Multiple code blocks — extracts all
3. ` ```typescript ` — recognized
4. ` ```js ` / ` ```javascript ` — recognized
5. Non-TS code blocks (` ```css `, ` ```bash `) — skipped
6. Mixed: TS + non-TS code blocks — only TS extracted
7. No code blocks — empty string
8. Empty file — empty string
9. Indented code fences — handled
10. Code fence with additional info string (` ```ts title="example" `) — recognized

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`

**Verification**: All tests pass

---

## TASK 8 — Tests: Integration — AST rules on `.astro`, `.html`, `.vue` files

**Status**: [x]

**What**: Integration tests verifying full end-to-end linting for all script-block formats.

**Plan** — test cases:
1. Rule detects violations in `.astro` script blocks
2. Line numbers correct in `.astro` results
3. `context.file` is original `.astro` filename
4. Imports extracted correctly from `.astro` script blocks
5. Rule detects violations in `.html` script blocks
6. Line numbers correct in `.html` results
7. `context.file` is original `.html` filename
8. Rule detects violations in `.vue` script blocks
9. Line numbers correct in `.vue` results
10. `context.file` is original `.vue` filename
11. `.astro` with no `<script>` — zero results
12. `.html` with no `<script>` — zero results
13. `.vue` with no `<script>` — zero results

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`

**Verification**: All tests pass

---

## TASK 9 — Tests: Integration — AST rules on `.md`, `.mdx` files

**Status**: [x]

**What**: Integration tests verifying linting of TypeScript code fences in Markdown/MDX.

**Plan** — test cases:
1. Rule detects violations in `.md` TypeScript code fences
2. Line numbers map to original `.md` file lines
3. `context.file` is original `.md` filename
4. Multiple TS code fences — all linted
5. Non-TS code fences skipped (no false positives)
6. Rule detects violations in `.mdx` code fences
7. `.md` with no code fences — zero results
8. `.mdx` with no code fences — zero results

**Files**:
- Modify: `src/framework/oxc-runner.test.ts`

**Verification**: All tests pass

---

## TASK 10 — Tests: `lint-embedded-strings` rule

**Status**: [x]

**What**: Tests for the embedded strings lint rule.

**Plan** — test cases:
1. Template literal with `<script>` block containing `var` — reports warning
2. String literal with `<script>` block — reports warning
3. Template literal without `<script>` content — no results
4. Template literal with `<script>` but valid code — no results (parse succeeds, no issues)
5. Empty template literal — no results
6. Template literal with broken script code — reports parse warning
7. Non-TS file — rule not triggered (pattern check)

**Files**:
- Modify or create: `src/rules/typescript/lint-embedded-strings.test.ts` or add to existing

**Verification**: All tests pass

---

## TASK 11 — Tests: Pattern matching for all embedded types

**Status**: [x]

**What**: Tests verifying pattern matching for all embedded extensions.

**Plan** — test cases:
1. `.astro` matches `**/*.ts` patterns
2. `.html` matches `**/*.ts` patterns
3. `.vue` matches `**/*.ts` patterns
4. `.md` matches `**/*.ts` patterns
5. `.mdx` matches `**/*.ts` patterns
6. `.svelte` still matches `**/*.ts` (regression)
7. `.ts` still matches `**/*.ts` (regression)
8. `.svelte.ts` still matches `**/*.svelte.ts` (regression)
9. `.astro` matches `**/*.astro` explicitly
10. `.tsx` does NOT match `.astro` (negative case)

**Files**:
- Modify: `src/framework/oxc-runner.test.ts` or `src/cli-helpers.test.ts`

**Verification**: All tests pass

---

## TASK 12 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline (4675)

**Verification**: All commands exit 0

---

## TASK 13 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify `extractScriptBlocks` is exported and tested
- Verify `extractCodeFences` is exported and tested
- Verify `lint-embedded-strings` rule exists and is registered
- Verify all new extensions in defaults: `.astro`, `.html`, `.vue`, `.md`, `.mdx`
- Verify all embedded extensions match `**/*.ts` patterns
- Verify test count increased from baseline (4675)
- Commit with descriptive message

**Verification**:
- All tests pass
- Test count >= baseline + new tests

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 0 | Rename extractSvelteScript → extractScriptBlocks | — |
| 1 | Add extractCodeFences() | — |
| 2 | Generalize runTypeScriptRules() | 0, 1 |
| 3 | Update pattern matching in cli-helpers.ts | — |
| 4 | Register Rules + Config (extensions) | — |
| 5 | Add lint-embedded-strings rule | 0 |
| 6 | Tests: extractScriptBlocks rename + Astro | 0 |
| 7 | Tests: extractCodeFences unit tests | 1 |
| 8 | Tests: Integration .astro, .html, .vue | 2 |
| 9 | Tests: Integration .md, .mdx | 2 |
| 10 | Tests: lint-embedded-strings | 5 |
| 11 | Tests: Pattern matching all types | 3 |
| 12 | Full QA + Coverage | 0-11 |
| 13 | Final verification + commit | 12 |
