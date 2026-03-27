# @/lint Phase 7 — Rule Hardening + New Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Add real autofixes to 9 rules, mark ~53 non-fixable rules `fixable: false`, add 4 new rules (test suffix, e2e location, integration location, svelte-ts extension)
**Architecture**: Workspace rules for filesystem-level checks (test naming, file location), TypeScript AST rules for code-level checks (svelte runes). All autofixes use byte-range replacement via `LintFix`.

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
| Tests | 2443 pass / 0 fail |
| Type-check | Passes |
| Rules with real fixes | ~65 |
| Rules with no-op fixes | ~68 |
| Rules with `fixable: false` | ~3 (barrel, lint-disable, section-order) |
| Testing rules | 1 (require-colocated-tests) |

---

## TASK 1 — Fix Broken Autofixes (2 rules)

### Task 1.1: Fix `imports/require-import-groups` broken blank-line fix

**Status**: [x] — Verified: `text: '\n'` at line 116, `fixable: true` at line 60. 2 new tests added. 2447 tests pass.

**Gap**: Fix text is `''` (empty string) at line 115 — should insert `'\n'` to add blank line between import groups. The fix range is correct (`next.start` to `next.start`) but the replacement text is empty, so nothing happens.

**Plan**:
- Write failing test: lint code with missing import group blank line, assert fix text is `'\n'`
- Run test, verify it fails (fix text is currently `''`)
- Edit `require-import-groups.ts` line 115: change `text: ''` to `text: '\n'`
- Add `fixable: true` to rule definition
- Run test, verify it passes
- Run QA: `pnpm qa:type-check && pnpm -w run qa:test`
- Commit

**Files**:
- Modify: `rules/imports/require-import-groups.ts:115` — fix text `''` → `'\n'`
- Modify: `rules/imports/require-import-groups.ts` — add `fixable: true` to rule object
- Test: `rules/imports/imports-rules.test.ts`

**Verification**: Test asserts `result[0].fix.text === '\n'` and `fixable === true`

---

### Task 1.2: Fix `comments/require-blank-line-groups` broken blank-line fix

**Status**: [x] — Verified: `text: '\n'` at lines 149 and 207, `fixable: true` at line 102. 2 new tests added. 2447 tests pass.

**Gap**: Same broken pattern — fix text is `''` at lines 148 and 206, should be `'\n'`.

**Plan**:
- Write failing test: lint code with missing blank line between declaration and control flow, assert fix text is `'\n'`
- Run test, verify it fails
- Edit `require-blank-line-groups.ts` lines 148 and 206: change `text: ''` to `text: '\n'`
- Add `fixable: true` to rule definition
- Run test, verify it passes
- Run QA
- Commit

**Files**:
- Modify: `rules/comments/require-blank-line-groups.ts:148,206` — fix text `''` → `'\n'`
- Modify: `rules/comments/require-blank-line-groups.ts` — add `fixable: true` to rule object
- Test: `rules/comments/comments-rules.test.ts` (or appropriate test file)

**Verification**: Test asserts fix text is `'\n'` for both BlockStatement and Program visitors

---

## TASK 2 — Add Real Autofixes to Bucket A Rules (7 rules)

### Task 2.1: `valibot/prefer-pipe` — restructure deprecated method calls

**Status**: [x] — Verified: Real fix at line 98 using `node.start`/`node.end` range with `v.pipe()` restructuring. `fixable: true` at line 45. 3 new tests added. 2450 tests pass.

**Gap**: No-op fix `{ range: { start: 0, end: 0 }, text: '' }`. Rule detects `v.minLength(v.string(), 3)` but provides no autofix.

**Plan**:
- Write failing test: lint deprecated pattern, assert fix replaces `v.minLength(v.string(), 3)` with `v.pipe(v.string(), v.minLength(3))`
- Run test, verify it fails
- Implement fix in `prefer-pipe.ts`:
  - Extract schema arg (first arg to the outer call) via `context.getNodeText()`
  - Extract remaining args
  - Build replacement: `v.pipe(${schemaText}, v.${method}(${remainingArgs}))`
  - Set fix range to cover the entire `CallExpression` node (`node.start` to `node.end`)
- Add `fixable: true` to rule definition
- Run test, verify it passes
- Run QA
- Commit

**Files**:
- Modify: `rules/valibot/prefer-pipe.ts` — add fix logic using AST node ranges
- Test: `rules/valibot/valibot-rules.test.ts`

**Verification**: Test asserts fix text transforms `v.minLength(v.string(), 3)` → `v.pipe(v.string(), v.minLength(3))` with correct byte range

---

### Task 2.2: `valibot/schema-type-pair` — generate missing type alias

**Status**: [x] — Verified: `fixable: true` at line 73. Missing type fix inserts `v.InferOutput<typeof ...>` at line 186. Wrong type fix replaces at line 170. 3 new tests. 2453 tests pass.

**Gap**: No-op fix for "missing type" case. Rule detects schema without type but can't fix it.

**Plan**:
- Write failing test: lint a schema without type alias, assert fix inserts `\nexport type FooBar = v.InferOutput<typeof FooBarSchema>;\n` after the schema declaration
- Run test, verify it fails
- Implement fix in `schema-type-pair.ts`:
  - For "missing type": compute insertion point after the schema's `VariableDeclaration` end (find the closing `;`). Build type name by stripping `Schema` suffix. Insert `\nexport type ${typeName} = v.InferOutput<typeof ${schemaName}>;\n`
  - For "wrong type": replace the type's `typeAnnotation` node text with `v.InferOutput<typeof ${schemaName}>`
- Add `fixable: true` to rule definition
- Run test, verify it passes
- Run QA
- Commit

**Files**:
- Modify: `rules/valibot/schema-type-pair.ts` — add fix logic for both "missing" and "wrong" variants
- Test: `rules/valibot/valibot-rules.test.ts`

**Verification**: Tests for both missing type (insertion) and wrong type (replacement)

---

### Task 2.3: `valibot/prefer-methods` — replace transform with built-in methods

**Status**: [x] — Verified: `fixable: true` at line 22. Fix replaces with `v.trim()`/`v.toLowerCase()`/`v.toUpperCase()` at lines 55/59/63. 4 new tests. 2457 tests pass.

**Gap**: No-op fix. Rule detects `v.transform(x => x.trim())` but provides no fix.

**Plan**:
- Write failing test: lint transform-trim pattern, assert fix replaces with `v.trim()`
- Run test, verify it fails
- Implement fix in `prefer-methods.ts`:
  - Map detected method to Valibot built-in: `.trim()` → `v.trim()`, `.toLowerCase()` → `v.toLowerCase()`, `.toUpperCase()` → `v.toUpperCase()`
  - Set fix range to cover the `v.transform(...)` call expression
  - Set fix text to the built-in method call
- Add `fixable: true` to rule definition
- Run test, verify it passes
- Run QA
- Commit

**Files**:
- Modify: `rules/valibot/prefer-methods.ts` — add fix logic
- Test: `rules/valibot/valibot-rules.test.ts`

**Verification**: Tests for trim, toLowerCase, toUpperCase replacements

---

### Task 2.4: `valibot/no-orphan-schemas` — generate type alias or add export

**Status**: [x] — Verified: `fixable: true` at line 72. Missing type inserts `v.InferOutput<typeof ...>` at line 207. Unexported type prepends `export ` at line 223. 3 new tests. 2460 tests pass.

**Gap**: No-op fix for both "missing type" and "not exported" cases.

**Plan**:
- Write failing tests:
  1. Schema without type alias → fix inserts `export type X = v.InferOutput<typeof XSchema>;`
  2. Type exists but not exported → fix prepends `export ` to the type declaration
- Run tests, verify they fail
- Implement fix in `no-orphan-schemas.ts`:
  - "Missing type": Same pattern as schema-type-pair (insert after schema declaration)
  - "Not exported": Find the type alias node, prepend `export ` at its start offset
- Add `fixable: true` to rule definition
- Run tests, verify they pass
- Run QA
- Commit

**Files**:
- Modify: `rules/valibot/no-orphan-schemas.ts` — add fix logic for both cases
- Test: `rules/valibot/valibot-rules.test.ts`

**Verification**: Tests for both missing-type insertion and export-keyword prepend

---

### Task 2.5: `jsdoc/param-type-match` — replace mismatched JSDoc type

**Status**: [x] — Verified: `fixable: true` at line 214. Fix computes absolute byte offset of `{WrongType}` in JSDoc and replaces with `{ActualType}`. 2 new tests. 2468 tests pass.

**Gap**: No-op fix at line 191: `{ range: { start: exportNode.start, end: exportNode.start }, text: '' }`. Rule knows both the wrong type and the correct type but doesn't fix.

**Plan**:
- Write failing test: lint function with `@param {string}` where actual type is `number`, assert fix replaces `{string}` with `{number}` in the JSDoc comment
- Run test, verify it fails
- Implement fix in `param-type-match.ts`:
  - Find the JSDoc comment byte range (already computed by `getJsDoc`)
  - Find the `{WrongType}` substring offset within the JSDoc
  - Set fix range to cover `{WrongType}` (including braces)
  - Set fix text to `{ActualType}`
- Add `fixable: true` to rule definition
- Run test, verify it passes
- Run QA
- Commit

**Files**:
- Modify: `rules/jsdoc/param-type-match.ts:182-193` — add real fix with computed byte range
- Test: `rules/jsdoc/jsdoc-rules.test.ts` (or appropriate test file)

**Verification**: Test asserts fix replaces `{string}` with `{number}` at correct byte offset

---

### Task 2.6: `jsdoc/require-schema-link` — insert {@link} reference

**Status**: [x] — Verified: `fixable: true` at line 48. Fix inserts `See {@link SchemaName}.` before `*/` (or full JSDoc block if none exists). 3 new tests. 2468 tests pass.

**Gap**: No-op fix at line 82: `{ range: { start: node.start, end: node.start }, text: '' }`. Rule knows the schema name but doesn't insert the link.

**Plan**:
- Write failing test: lint type derived from schema without `{@link}` in JSDoc, assert fix inserts ` See {@link SchemaName}.` before the closing `*/`
- Run test, verify it fails
- Implement fix in `require-schema-link.ts`:
  - Find JSDoc closing `*/` byte offset (similar to `getJsDocEndOffset` in require-returns)
  - Insert ` See {@link ${schemaName}}.` before `*/`
  - If no JSDoc exists, insert full JSDoc block: `/** See {@link ${schemaName}}. */\n` before the export
- Add `fixable: true` to rule definition
- Run test, verify it passes
- Run QA
- Commit

**Files**:
- Modify: `rules/jsdoc/require-schema-link.ts:71-83` — add real fix
- Test: `rules/jsdoc/jsdoc-rules.test.ts`

**Verification**: Test asserts fix inserts `{@link SchemaName}` at correct position

---

### Task 2.7: `jsdoc/require-returns` — fix broken type/mismatch variants

**Status**: [x] — Verified: `fixable: true` at line 231. Missing-type fix inserts `{ReturnType}` after `@returns`. Mismatch fix replaces `{WrongType}` with `{ActualType}`. 3 new tests. 2468 tests pass.

**Gap**: Missing `@returns` fix works (line 160-163). But "missing type" (line 179) and "type mismatch" (line 196) variants are no-op: `{ range: { start: exportNode.start, end: exportNode.start }, text: '' }`.

**Plan**:
- Write failing tests:
  1. `@returns` without `{Type}` → fix inserts `{ReturnType} ` after `@returns`
  2. `@returns {WrongType}` → fix replaces `{WrongType}` with `{ActualType}`
- Run tests, verify they fail
- Implement fixes in `require-returns.ts`:
  - "Missing type" (line 179): Find `@returns` offset in JSDoc, insert `{${returnType}} ` after `@returns `
  - "Type mismatch" (line 196): Find `{WrongType}` offset in JSDoc, replace with `{${returnType}}`
- Set `fixable: true` on rule definition (covers all three variants)
- Run tests, verify they pass
- Run QA
- Commit

**Files**:
- Modify: `rules/jsdoc/require-returns.ts:179,196` — add real fixes for both variants
- Test: `rules/jsdoc/jsdoc-rules.test.ts`

**Verification**: Tests for all three @returns fix variants: missing tag, missing type, type mismatch

---

## TASK 3 — Mark Non-Fixable Rules `fixable: false` (~53 rules)

### Task 3.1: Audit and mark all non-fixable rules

**Status**: [x] — Verified: 31 rule files marked `fixable: false` (1 already had it). Total: 53 rules with `fixable: false`, 13 rules with `fixable: true`. 2468 tests pass.

**Gap**: ~53 rules have no-op fixes but don't declare `fixable: false`. The CLI/formatter can't distinguish between rules that support `--fix` and rules that don't.

**Plan**:
- For each rule file listed below, add `fixable: false` to the rule definition object
- Rules already marked `fixable: false` (no-barrel-files, no-lint-disable, require-section-order, require-colocated-tests): skip
- Rules getting real fixes in Tasks 1-2: skip (they get `fixable: true`)

**Rules to mark `fixable: false`**:

**imports/**:
- `no-raw-node-imports.ts`
- `no-raw-json.ts`
- `no-reexport.ts`

**typescript/**:
- `no-empty-catch.ts`
- `no-generic-function-type.ts`
- `no-default-params.ts`
- `no-union-null.ts`
- `no-union-params.ts`
- `no-module-side-effects.ts`
- `no-throw.ts`
- `require-function-schema.ts`

**valibot/**:
- `error-map-all-locales.ts`
- `error-map-complete.ts`
- `export-schema-and-type.ts`
- `limit-union-size.ts`
- `no-duplicate-schema.ts`
- `no-expensive-regex.ts`
- `no-ignore-issues.ts`
- `no-mutate-after-parse.ts`
- `no-schema-in-component.ts`
- `no-schema-in-loop.ts`
- `no-transform-side-effects.ts`
- `one-schema-per-file.ts`
- `prefer-branded-types.ts`
- `require-description.ts`
- `require-error-map.ts`
- `require-error-mapping.ts`
- `revalidate-on-change.ts`
- `schema-file-location.ts`
- `validate-boundaries.ts`
- `validate-function-output.ts`

**jsdoc/**:
- `validate-example.ts`

**Change per rule**: Add `fixable: false,` to the rule definition object, after `stages` or `categories`.

**Files**: All files listed above
**Verification**: `pnpm qa:type-check && pnpm -w run qa:test` — all pass, no regressions

---

## TASK 4 — New Rule: `testing/require-test-suffix`

### Task 4.1: Write failing tests

**Status**: [x] — Combined with 4.2. 6 tests for require-test-suffix added to testing-rules.test.ts.

**Plan**:
- Add tests to `rules/testing/testing-rules.test.ts`:

```typescript
describe('testing/require-test-suffix', () => {
  it('flags *.spec.ts files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/foo.spec.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('testing/require-test-suffix');
    expect(results[0]!.message).toContain('.test.ts');
  });

  it('flags *-test.ts files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/foo-test.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('flags *_test.ts files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/foo_test.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('allows *.test.ts files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/foo.test.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('ignores non-test files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/foo.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('flags *.spec.tsx files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/foo.spec.tsx', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
  });
});
```

- Run tests, verify they fail (rule doesn't exist yet)

**Files**: `rules/testing/testing-rules.test.ts`

---

### Task 4.2: Implement rule

**Status**: [x] — Verified: Rule created at `rules/testing/require-test-suffix.ts`. WorkspaceRule with `scope: 'workspace'`, `fixable: false`. Flags `.spec.`, `-test.`, `_test.` variants. 2486 tests pass.

**Plan**:
- Create `rules/testing/require-test-suffix.ts`:

```typescript
/**
 * Rule: testing/require-test-suffix
 *
 * Test files must use the *.test.ts naming convention.
 * Flags *.spec.ts, *-test.ts, *_test.ts, and their .js/.tsx/.jsx variants.
 *
 * @module
 */

import { basename } from 'node:path';
import { createResult } from '@/lint/framework/types.ts';
import type { WorkspaceRule, LintResult } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns that indicate a test file with wrong suffix. */
const BAD_SUFFIX_PATTERNS: readonly RegExp[] = [
  /\.spec\.(ts|tsx|js|jsx|mjs)$/,
  /-test\.(ts|tsx|js|jsx|mjs)$/,
  /_test\.(ts|tsx|js|jsx|mjs)$/,
];

/** The require-test-suffix workspace rule. */
const rule: WorkspaceRule = {
  id: 'testing/require-test-suffix',
  description: 'Test files must use *.test.ts naming (not *.spec.ts, *-test.ts, *_test.ts)',
  scope: 'workspace',
  categories: ['testing'],
  stages: ['lint', 'ci'],
  fixable: false,

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as WorkspaceContext;
    const results: LintResult[] = [];

    for await (const file of ctx.allFiles()) {
      const name: string = basename(file);
      const isBadSuffix: boolean = BAD_SUFFIX_PATTERNS.some(
        (pattern: RegExp): boolean => pattern.test(name),
      );

      if (isBadSuffix) {
        results.push(
          createResult('testing/require-test-suffix', file, 1, 1, 'error',
            `Test file '${name}' must use *.test.ts naming convention`, {
              tip: `Rename to ${name.replace(/\.(spec|-test|_test)\./, '.test.')}`,
            }),
        );
      }
    }

    return results;
  },
};

export default rule;
```

- Run tests, verify they pass
- Run QA
- Commit

**Files**:
- Create: `rules/testing/require-test-suffix.ts`
- Test: `rules/testing/testing-rules.test.ts`

**Verification**: All new tests pass, no regressions

---

## TASK 5 — New Rule: `testing/require-e2e-location`

### Task 5.1: Write failing tests

**Status**: [x] — Combined with 5.2. 5 tests for require-e2e-location added.

**Plan**:
- Add tests to `rules/testing/testing-rules.test.ts`:

```typescript
describe('testing/require-e2e-location', () => {
  it('flags *.e2e.ts outside e2e/ directory', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/login.e2e.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('testing/require-e2e-location');
  });

  it('allows *.e2e.ts in e2e/ directory', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/e2e/login.e2e.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('allows *.e2e.ts in tests/e2e/ directory', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/tests/e2e/login.e2e.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('allows *.e2e.ts in nested e2e/ directory', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/packages/app/e2e/login.e2e.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('ignores non-e2e files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/login.test.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });
});
```

- Run tests, verify they fail

**Files**: `rules/testing/testing-rules.test.ts`

---

### Task 5.2: Implement rule

**Status**: [x] — Verified: Rule created at `rules/testing/require-e2e-location.ts`. WorkspaceRule, checks path segments for `e2e/`. `fixable: false`. 2486 tests pass.

**Plan**:
- Create `rules/testing/require-e2e-location.ts`:

```typescript
/**
 * Rule: testing/require-e2e-location
 *
 * E2E test files (*.e2e.ts) must live under an e2e/ or tests/e2e/ directory.
 *
 * @module
 */

import { basename } from 'node:path';
import { createResult } from '@/lint/framework/types.ts';
import type { WorkspaceRule, LintResult } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern for e2e test files. */
const E2E_PATTERN: RegExp = /\.e2e\.(ts|tsx|js|jsx|mjs)$/;

/** Check if a file path has an e2e/ ancestor directory. */
function isInE2eDir(filePath: string): boolean {
  const parts: string[] = filePath.split('/');
  return parts.some((part: string): boolean => part === 'e2e');
}

/** Check if a file path is under tests/e2e/. */
function isInTestsE2eDir(filePath: string): boolean {
  return filePath.includes('/tests/e2e/');
}

/** The require-e2e-location workspace rule. */
const rule: WorkspaceRule = {
  id: 'testing/require-e2e-location',
  description: 'E2E test files (*.e2e.ts) must live under e2e/ or tests/e2e/',
  scope: 'workspace',
  categories: ['testing'],
  stages: ['lint', 'ci'],
  fixable: false,

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as WorkspaceContext;
    const results: LintResult[] = [];

    for await (const file of ctx.allFiles()) {
      const name: string = basename(file);
      if (!E2E_PATTERN.test(name)) {
        continue;
      }

      if (!isInE2eDir(file) && !isInTestsE2eDir(file)) {
        results.push(
          createResult('testing/require-e2e-location', file, 1, 1, 'error',
            `E2E test '${name}' must be in an e2e/ or tests/e2e/ directory`, {
              tip: 'Move this file to an e2e/ or tests/e2e/ directory',
            }),
        );
      }
    }

    return results;
  },
};

export default rule;
```

- Run tests, verify they pass
- Run QA
- Commit

**Files**:
- Create: `rules/testing/require-e2e-location.ts`
- Test: `rules/testing/testing-rules.test.ts`

**Verification**: All new tests pass, no regressions

---

## TASK 6 — New Rule: `testing/require-integration-location`

### Task 6.1: Write failing tests

**Status**: [x] — Combined with 6.2. 4 tests for require-integration-location added.

**Plan**:
- Add tests to `rules/testing/testing-rules.test.ts`:

```typescript
describe('testing/require-integration-location', () => {
  it('flags *.integration.ts in random directory', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/scripts/db.integration.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('testing/require-integration-location');
  });

  it('allows *.integration.ts in tests/integration/', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/tests/integration/db.integration.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('allows colocated *.integration.ts (source file in same dir)', async () => {
    const ctx = mockContext({
      files: new Map([
        ['/workspace/src/db.ts', ''],
        ['/workspace/src/db.integration.ts', ''],
      ]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('ignores non-integration files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/db.test.ts', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });
});
```

- Run tests, verify they fail

**Files**: `rules/testing/testing-rules.test.ts`

---

### Task 6.2: Implement rule

**Status**: [x] — Verified: Rule created at `rules/testing/require-integration-location.ts`. WorkspaceRule, checks `tests/integration/` path and colocated source. Severity: `warning`. `fixable: false`. 2486 tests pass.

**Plan**:
- Create `rules/testing/require-integration-location.ts`:

```typescript
/**
 * Rule: testing/require-integration-location
 *
 * Integration test files (*.integration.ts) must be either:
 * - Under tests/integration/
 * - Colocated with source (same directory has non-test .ts files)
 *
 * @module
 */

import { basename, dirname } from 'node:path';
import { createResult } from '@/lint/framework/types.ts';
import type { WorkspaceRule, LintResult } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern for integration test files. */
const INTEGRATION_PATTERN: RegExp = /\.integration\.(ts|tsx|js|jsx|mjs)$/;

/** Pattern for any test file. */
const TEST_FILE_PATTERN: RegExp = /\.(test|spec|e2e|integration)\./;

/** The require-integration-location workspace rule. */
const rule: WorkspaceRule = {
  id: 'testing/require-integration-location',
  description: 'Integration test files must be in tests/integration/ or colocated with source',
  scope: 'workspace',
  categories: ['testing'],
  stages: ['lint', 'ci'],
  fixable: false,

  async check(context: unknown): Promise<LintResult[]> {
    const ctx = context as WorkspaceContext;
    const results: LintResult[] = [];

    // Collect all files and group by directory
    const allFiles: string[] = [];
    const dirFiles: Map<string, string[]> = new Map();
    for await (const file of ctx.allFiles()) {
      allFiles.push(file);
      const dir: string = dirname(file);
      const existing: string[] = dirFiles.get(dir) ?? [];
      existing.push(file);
      dirFiles.set(dir, existing);
    }

    for (const file of allFiles) {
      const name: string = basename(file);
      if (!INTEGRATION_PATTERN.test(name)) {
        continue;
      }

      // Check if in tests/integration/
      if (file.includes('/tests/integration/')) {
        continue;
      }

      // Check if colocated (same dir has non-test .ts files)
      const dir: string = dirname(file);
      const siblings: string[] = dirFiles.get(dir) ?? [];
      const hasSource: boolean = siblings.some((sibling: string): boolean => {
        const sibName: string = basename(sibling);
        return sibName.endsWith('.ts') && !TEST_FILE_PATTERN.test(sibName) && sibling !== file;
      });

      if (hasSource) {
        continue;
      }

      results.push(
        createResult('testing/require-integration-location', file, 1, 1, 'warning',
          `Integration test '${name}' should be in tests/integration/ or colocated with source`, {
            tip: 'Move to tests/integration/ or place next to the source file it tests',
          }),
      );
    }

    return results;
  },
};

export default rule;
```

- Run tests, verify they pass
- Run QA
- Commit

**Files**:
- Create: `rules/testing/require-integration-location.ts`
- Test: `rules/testing/testing-rules.test.ts`

**Verification**: All new tests pass, no regressions

---

## TASK 7 — New Rule: `typescript/require-svelte-ts-extension`

### Task 7.1: Write failing tests

**Status**: [x] — Combined with 7.2. 8 tests added to typescript-rules.test.ts.

**Plan**:
- Add tests to the TypeScript rules test file:

```typescript
describe('typescript/require-svelte-ts-extension', () => {
  it('flags $state() in plain .ts file', () => {
    const results = lint(rule, `const count = $state(0);`, '/src/state.ts');
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('typescript/require-svelte-ts-extension');
    expect(results[0]!.message).toContain('.svelte.ts');
  });

  it('flags $derived() in plain .ts file', () => {
    const results = lint(rule, `const double = $derived(count * 2);`, '/src/state.ts');
    expect(results).toHaveLength(1);
  });

  it('flags $effect() in plain .ts file', () => {
    const results = lint(rule, `$effect(() => { console.log(count); });`, '/src/state.ts');
    expect(results).toHaveLength(1);
  });

  it('flags $props() in plain .ts file', () => {
    const results = lint(rule, `const { name } = $props();`, '/src/state.ts');
    expect(results).toHaveLength(1);
  });

  it('flags $bindable() in plain .ts file', () => {
    const results = lint(rule, `const { value = $bindable() } = $props();`, '/src/state.ts');
    expect(results).toHaveLength(1);
  });

  it('allows $state() in .svelte.ts file', () => {
    const results = lint(rule, `const count = $state(0);`, '/src/state.svelte.ts');
    expect(results).toHaveLength(0);
  });

  it('ignores files without rune calls', () => {
    const results = lint(rule, `const x: number = 42;`, '/src/util.ts');
    expect(results).toHaveLength(0);
  });

  it('ignores $state in string literals', () => {
    const results = lint(rule, `const s = "$state(0)";`, '/src/util.ts');
    expect(results).toHaveLength(0);
  });

  it('ignores $state in comments', () => {
    const results = lint(rule, `// $state(0)\nconst x = 1;`, '/src/util.ts');
    expect(results).toHaveLength(0);
  });

  it('reports only once per file even with multiple runes', () => {
    const code = `const a = $state(0);\nconst b = $derived(a * 2);`;
    const results = lint(rule, code, '/src/state.ts');
    expect(results).toHaveLength(1);
  });
});
```

- Run tests, verify they fail

**Files**: `rules/typescript/typescript-rules.test.ts` (or appropriate test file)

---

### Task 7.2: Implement rule

**Status**: [x] — Verified: Rule at `rules/typescript/require-svelte-ts-extension.ts`. TypeScriptRule, `patterns: ['**/*.ts']`, `fixable: false`. Detects 7 Svelte runes via recursive AST walk. 8 tests. 2494 tests pass.

**Plan**:
- Create `rules/typescript/require-svelte-ts-extension.ts`:

```typescript
/**
 * Rule: typescript/require-svelte-ts-extension
 *
 * Files using Svelte runes ($state, $derived, $effect, $props, $bindable)
 * must use the .svelte.ts extension. Runes only work in .svelte.ts files.
 *
 * @module
 */

import type {
  TypeScriptRule,
  LintResult,
  AstNode,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Svelte rune function names. */
const SVELTE_RUNES: ReadonlySet<string> = new Set([
  '$state', '$derived', '$effect', '$props', '$bindable',
  '$inspect', '$host',
]);

/** The require-svelte-ts-extension rule. */
const rule: TypeScriptRule = {
  id: 'typescript/require-svelte-ts-extension',
  description: 'Files using Svelte runes must use .svelte.ts extension',
  patterns: ['**/*.ts'],
  categories: ['typescript', 'naming'],
  stages: ['lint', 'ci'],
  fixable: false,

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      // Skip if already .svelte.ts
      if (context.file.endsWith('.svelte.ts')) {
        return [];
      }

      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return [];
      }

      let calleeName: string | null = null;
      if (callee.type === 'Identifier') {
        calleeName = (callee.name as string) ?? null;
      }

      if (!calleeName || !SVELTE_RUNES.has(calleeName)) {
        return [];
      }

      return [{
        file: context.file,
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        severity: 'error',
        message: `Svelte rune '${calleeName}()' requires .svelte.ts extension`,
        ruleId: 'typescript/require-svelte-ts-extension',
        tip: 'Rename this file from .ts to .svelte.ts',
        fix: { range: { start: 0, end: 0 }, text: '' },
      }];
    },
  },
};

export default rule;
```

**Note**: The visitor returns after the FIRST rune hit (returns array with 1 result), so only one diagnostic per file. However, the visitor is called for each CallExpression. To deduplicate, we should track seen files — BUT the linter processes one file at a time and each visitor call is independent. Since the rule returns results per call, and the linter collects all results, we need dedup logic. Options:
- Use `finalize()` to deduplicate
- Use `Program` visitor instead and scan body for CallExpressions

Better approach: Use `Program` visitor, iterate through all call expressions in the AST, flag on first rune found, stop early.

Updated implementation in Task 7.2 should use `Program` visitor with early return.

- Run tests, verify they pass
- Run QA
- Commit

**Files**:
- Create: `rules/typescript/require-svelte-ts-extension.ts`
- Test: TypeScript rules test file

**Verification**: All new tests pass, no regressions

---

## TASK 8 — Register New Rules in Config

### Task 8.1: Add rules to .resist-lint.jsonc

**Status**: [x] — Verified: All 4 rules registered in `.resist-lint.jsonc`. `testing/require-test-suffix`: "error" (line 52), `testing/require-e2e-location`: "error" (line 53), `testing/require-integration-location`: "warn" (line 54), `typescript/require-svelte-ts-extension`: "error" (line 69). Note: plan said "warning" but schema only accepts "warn". 2494 tests pass.

**Plan**:
- Add to `.resist-lint.jsonc` under `"rules"`:
  ```jsonc
  "testing/require-test-suffix": "error",
  "testing/require-e2e-location": "error",
  "testing/require-integration-location": "warn",
  "typescript/require-svelte-ts-extension": "error",
  ```
- Run QA to verify no regressions

**Files**: `.resist-lint.jsonc`

**Verification**: `pnpm qa:type-check && pnpm -w run qa:test`

---

## TASK 9 — Full QA Pass

### Task 9.1: Run complete QA suite

**Status**: [x] — Verified: type-check passes (tsgo --noEmit), lint has 0 errors in @/lint src, format applied (10 files reformatted), tests 2494/2494 pass. Schema file auto-regenerated with new rules. No false positives from new rules in lint package.

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm -w run qa:lint` (check @/lint src specifically)
- Run: `pnpm -w run qa:format` (auto-fix, per user correction)
- Run: `pnpm -w run qa:test`
- Fix any failures
- Run resist-lint on the lint package itself to check for false positives from new rules

**Verification**: All QA commands exit 0 for @/lint scope

---

### Task 9.2: Verify test coverage is maintained

**Status**: [x] — Verified: `qa:test:coverage` passes all thresholds. Statements: 90.19% (≥80%), Branches: 76.12% (≥75%), Functions: 84.44% (≥80%), Lines: 90.17% (≥80%). 2494 tests pass (51 above 2443 baseline).

**Plan**:
- Run: `pnpm --filter @/lint qa:test:coverage` to verify coverage thresholds
- Check thresholds (configured in vitest.config.ts): statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%
- Check test count is at or above baseline (2443)

**Verification**: Coverage command exits 0, all thresholds met

---

## TASK 10 — Final Verification

### Task 10.1: Verify all changes against approved changelog

**Status**: [x] — Verified by spec reviewer subagent. All changelog items confirmed. 1 fix applied: `valibot/prefer-methods` had inline no-op fix `{ range: { end: 0, start: 0 }, text: '' }` — replaced with `NO_OP_FIX` constant. All 2494 tests pass.

**Verification results**:
- ✅ 2 broken autofixes fixed (require-import-groups, require-blank-line-groups)
- ✅ 7 new real autofixes with `fixable: true` (prefer-pipe, schema-type-pair, prefer-methods, no-orphan-schemas, param-type-match, require-schema-link, require-returns)
- ✅ 57 rule files with `fixable: false`
- ✅ 4 new rules exist, have tests, registered in config (require-test-suffix, require-e2e-location, require-integration-location, require-svelte-ts-extension)
- ✅ Coverage thresholds met: statements 90.19%, branches 76.12%, functions 84.44%, lines 90.17%
- ✅ 2494 tests pass (51 above 2443 baseline)

**Plan**:
- Verify each Bucket A rule has `fixable: true` and produces correct fix text/range
- Verify each non-fixable rule has `fixable: false`
- Verify each new rule exists, has tests, is registered in config
- Run final QA
- Fix any issues found during verification

**Verification**: All tests pass, all changelog items verified

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1.1 | Fix require-import-groups fix | — |
| 1.2 | Fix require-blank-line-groups fix | — |
| 2.1 | Add prefer-pipe autofix | — |
| 2.2 | Add schema-type-pair autofix | — |
| 2.3 | Add prefer-methods autofix | — |
| 2.4 | Add no-orphan-schemas autofix | — |
| 2.5 | Add param-type-match autofix | — |
| 2.6 | Add require-schema-link autofix | — |
| 2.7 | Fix require-returns autofix variants | — |
| 3.1 | Mark ~53 rules fixable: false | — |
| 4.1 | Write require-test-suffix tests | — |
| 4.2 | Implement require-test-suffix | 4.1 |
| 5.1 | Write require-e2e-location tests | — |
| 5.2 | Implement require-e2e-location | 5.1 |
| 6.1 | Write require-integration-location tests | — |
| 6.2 | Implement require-integration-location | 6.1 |
| 7.1 | Write require-svelte-ts-extension tests | — |
| 7.2 | Implement require-svelte-ts-extension | 7.1 |
| 8.1 | Register rules in config | 4.2, 5.2, 6.2, 7.2 |
| 9.1 | Full QA pass | All above |
| 10.1 | Final verification | 9.1 |
