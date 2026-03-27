# @/lint Phase 8 — Port Dirty-Repo Rules from Shell Script

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 3 "dirty repo" checks from `_INTEGRATE/linter/_linter-test-to-convert/check.dirty.sh` to TypeScript workspace rules: untracked artifacts, broken symlinks, leftover SQLite files.
**Architecture**: All 3 are WorkspaceRules with `scope: 'workspace'`. Rules 1 and 3 use `ctx.allFiles()` for file scanning. Rule 2 uses direct `node:fs` APIs since `allFiles()` skips `node_modules`.

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
| Tests | 2494 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 4 (no-crlf, no-empty-files, no-merge-conflicts, workspace-valid) |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — New Rule: `workspace/no-untracked-artifacts`

### Task 1.1: Write failing tests

**Status**: [x] — Combined with 1.2. 5 tests added to workspace-rules.test.ts.

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:

```typescript
describe('workspace/no-untracked-artifacts', () => {
  it('flags .DS_Store files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/.DS_Store', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('workspace/no-untracked-artifacts');
    expect(results[0]!.severity).toBe('warning');
  });

  it('flags *.tmp files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/data.tmp', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('flags *.bak files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/config.bak', '']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('ignores normal source files', async () => {
    const ctx = mockContext({
      files: new Map([['/workspace/src/index.ts', 'export const x = 1;']]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('flags multiple artifacts in one scan', async () => {
    const ctx = mockContext({
      files: new Map([
        ['/workspace/.DS_Store', ''],
        ['/workspace/src/.DS_Store', ''],
        ['/workspace/old.bak', ''],
      ]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(3);
  });
});
```

- Run tests, verify they fail (rule doesn't exist yet)

**Files**: `rules/workspace/workspace-rules.test.ts`

---

### Task 1.2: Implement rule

**Status**: [x] — Verified: Rule at `rules/workspace/no-untracked-artifacts.ts`. `fixable: false` at line 25, severity `warning` at line 59. 5 tests pass. Also fixed `NO_OP_FIX` export in `types.ts`. 2499 tests pass.

**Plan**:
- Create `rules/workspace/no-untracked-artifacts.ts`:

```typescript
/**
 * Rule: workspace/no-untracked-artifacts
 *
 * Detects leftover temp, backup, or OS-specific files that should not be
 * committed: .DS_Store, *.tmp, *.bak.
 *
 * @module
 */

import { basename } from 'node:path';
import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Patterns matching artifact filenames. */
const ARTIFACT_PATTERNS: readonly RegExp[] = [
  /^\.DS_Store$/,
  /\.tmp$/,
  /\.bak$/,
];

/** The no-untracked-artifacts workspace rule. */
const rule: WorkspaceRule = {
  id: 'workspace/no-untracked-artifacts',
  description: 'Detect leftover temp, backup, or OS files (.DS_Store, *.tmp, *.bak)',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  async check(context: unknown): Promise<...> {
    const ctx = context as WorkspaceContext;
    const results = [];

    for await (const filePath of ctx.allFiles()) {
      const name = basename(filePath);
      const isArtifact = ARTIFACT_PATTERNS.some((p) => p.test(name));

      if (isArtifact) {
        results.push(
          createResult(
            'workspace/no-untracked-artifacts', filePath, 1, 1, 'warning',
            `Untracked local artifact: ${name}`,
            { tip: 'Add this file to .gitignore or remove it from the working tree' },
          ),
        );
      }
    }

    return results;
  },
};

export default rule;
```

- Run tests, verify they pass
- Run QA: `pnpm --filter @/lint qa:type-check && pnpm -w run qa:test`
- Commit

**Files**:
- Create: `rules/workspace/no-untracked-artifacts.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: All new tests pass, no regressions

---

## TASK 2 — New Rule: `workspace/no-broken-symlinks`

### Task 2.1: Write failing tests

**Status**: [x] — Combined with 2.2. 2 tests added (metadata + guard path).

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:

```typescript
describe('workspace/no-broken-symlinks', () => {
  it('has correct rule metadata', () => {
    expect(rule.id).toBe('workspace/no-broken-symlinks');
    expect(rule.scope).toBe('workspace');
    expect(rule.fixable).toBe(false);
  });

  it('returns empty when node_modules does not exist', async () => {
    const ctx = mockContext({
      rootDir: '/workspace',
    });
    // Override dirExists to return false for node_modules
    ctx.dirExists = (path) => Promise.resolve(!path.includes('node_modules'));
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });
});
```

Note: Full integration test with real broken symlinks is hard to mock. We test the skip-if-no-node_modules path and metadata. The rule uses direct `node:fs` for real scanning, which the mock context can't simulate. We test the guard path.

- Run tests, verify they fail

**Files**: `rules/workspace/workspace-rules.test.ts`

---

### Task 2.2: Implement rule

**Status**: [x] — Verified: Rule at `rules/workspace/no-broken-symlinks.ts`. `fixable: false` at line 55, `scope: 'workspace'` at line 52, severity `error` at line 92. Uses direct `node:fs` APIs. 2 tests pass. 2501 total tests pass.

**Plan**:
- Create `rules/workspace/no-broken-symlinks.ts`:

```typescript
/**
 * Rule: workspace/no-broken-symlinks
 *
 * Detects broken symlinks in node_modules. These indicate a corrupted
 * pnpm install and can cause runtime failures.
 *
 * @module
 */

import { lstat, readdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Recursively find broken symlinks in a directory. */
async function findBrokenSymlinks(dir: string, results: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      try {
        await realpath(fullPath);
      } catch {
        results.push(fullPath);
      }
    } else if (entry.isDirectory()) {
      await findBrokenSymlinks(fullPath, results);
    }
  }
}

/** The no-broken-symlinks workspace rule. */
const rule: WorkspaceRule = {
  id: 'workspace/no-broken-symlinks',
  description: 'Detect broken symlinks in node_modules (corrupted install)',
  scope: 'workspace',
  categories: ['workspace', 'safety'],
  stages: ['lint', 'ci'],
  fixable: false,

  async check(context: unknown): Promise<...> {
    const ctx = context as WorkspaceContext;
    const nodeModulesDir = join(ctx.rootDir, 'node_modules');

    const exists = await ctx.dirExists(nodeModulesDir);
    if (!exists) {
      return [];
    }

    const brokenLinks: string[] = [];
    await findBrokenSymlinks(nodeModulesDir, brokenLinks);

    return brokenLinks.map((link) =>
      createResult(
        'workspace/no-broken-symlinks', link, 1, 1, 'error',
        `Broken symlink detected in node_modules: ${link}`,
        { tip: 'Try reinstalling modules: pnpm install --force' },
      ),
    );
  },
};

export default rule;
```

- Run tests, verify they pass
- Run QA
- Commit

**Files**:
- Create: `rules/workspace/no-broken-symlinks.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: All new tests pass, no regressions

---

## TASK 3 — New Rule: `workspace/no-leftover-sqlite`

### Task 3.1: Write failing tests

**Status**: [ ]

**Plan**:
- Add tests to `rules/workspace/workspace-rules.test.ts`:

```typescript
describe('workspace/no-leftover-sqlite', () => {
  it('flags .sqlite file in .wrangler/state/', async () => {
    const ctx = mockContext({
      files: new Map([
        ['/workspace/packages/products/app/.wrangler/state/d1.sqlite', ''],
      ]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('workspace/no-leftover-sqlite');
    expect(results[0]!.severity).toBe('warning');
  });

  it('flags .sqlite-wal file in .wrangler/state/', async () => {
    const ctx = mockContext({
      files: new Map([
        ['/workspace/packages/products/app/.wrangler/state/d1.sqlite-wal', ''],
      ]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('flags .sqlite-shm file in .wrangler/state/', async () => {
    const ctx = mockContext({
      files: new Map([
        ['/workspace/packages/products/app/.wrangler/state/d1.sqlite-shm', ''],
      ]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(1);
  });

  it('ignores sqlite files outside .wrangler/state/', async () => {
    const ctx = mockContext({
      files: new Map([
        ['/workspace/data/local.sqlite', ''],
      ]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('ignores non-sqlite files in .wrangler/state/', async () => {
    const ctx = mockContext({
      files: new Map([
        ['/workspace/packages/products/app/.wrangler/state/config.json', ''],
      ]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('flags multiple sqlite artifacts', async () => {
    const ctx = mockContext({
      files: new Map([
        ['/workspace/packages/products/app/.wrangler/state/d1.sqlite', ''],
        ['/workspace/packages/products/app/.wrangler/state/d1.sqlite-wal', ''],
        ['/workspace/packages/products/api/.wrangler/state/db.sqlite', ''],
      ]),
    });
    const results = await rule.check(ctx);
    expect(results).toHaveLength(3);
  });
});
```

- Run tests, verify they fail

**Files**: `rules/workspace/workspace-rules.test.ts`

---

### Task 3.2: Implement rule

**Status**: [ ]

**Plan**:
- Create `rules/workspace/no-leftover-sqlite.ts`:

```typescript
/**
 * Rule: workspace/no-leftover-sqlite
 *
 * Detects leftover Wrangler D1 SQLite files (.wrangler/state/*.sqlite*).
 * These are transient local dev artifacts that should never be committed.
 *
 * @module
 */

import { basename } from 'node:path';
import { createResult, type WorkspaceRule } from '@/lint/framework/types.ts';
import type { WorkspaceContext } from '@/lint/framework/rule-context.ts';

/** Pattern matching .wrangler/state/ path segment. */
const WRANGLER_STATE_PATTERN = /[/\\]\.wrangler[/\\]state[/\\]/;

/** Pattern matching sqlite file extensions. */
const SQLITE_PATTERN = /\.sqlite/;

/** The no-leftover-sqlite workspace rule. */
const rule: WorkspaceRule = {
  id: 'workspace/no-leftover-sqlite',
  description: 'Detect leftover Wrangler D1 SQLite artifacts (.wrangler/state/*.sqlite*)',
  scope: 'workspace',
  categories: ['workspace', 'cloudflare'],
  stages: ['lint', 'ci'],
  fixable: false,

  async check(context: unknown): Promise<...> {
    const ctx = context as WorkspaceContext;
    const results = [];

    for await (const filePath of ctx.allFiles()) {
      if (WRANGLER_STATE_PATTERN.test(filePath) && SQLITE_PATTERN.test(basename(filePath))) {
        results.push(
          createResult(
            'workspace/no-leftover-sqlite', filePath, 1, 1, 'warning',
            `Leftover Wrangler SQLite artifact: ${basename(filePath)}`,
            { tip: 'Remove .wrangler/state/ artifacts before commit or CI' },
          ),
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
- Create: `rules/workspace/no-leftover-sqlite.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: All new tests pass, no regressions

---

## TASK 4 — Register New Rules in Config

### Task 4.1: Add rules to .resist-lint.jsonc

**Status**: [ ]

**Plan**:
- Add to `.resist-lint.jsonc` under `"rules"`:
  ```jsonc
  "workspace/no-untracked-artifacts": "warn",
  "workspace/no-broken-symlinks": "error",
  "workspace/no-leftover-sqlite": "warn",
  ```
- Run QA to verify no regressions

**Files**: `.resist-lint.jsonc`

**Verification**: `pnpm --filter @/lint qa:type-check && pnpm -w run qa:test`

---

## TASK 5 — Full QA Pass

### Task 5.1: Run complete QA suite

**Status**: [ ]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm -w run qa:lint` (check @/lint src specifically)
- Run: `pnpm -w run qa:format` (auto-fix, per user preference)
- Run: `pnpm -w run qa:test`
- Fix any failures

**Verification**: All QA commands exit 0 for @/lint scope

### Task 5.2: Verify test coverage thresholds

**Status**: [ ]

**Plan**:
- Run: `pnpm --filter @/lint qa:test:coverage`
- Check thresholds: statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%
- Check test count is at or above baseline (2494)

**Verification**: Coverage command exits 0, all thresholds met

---

## TASK 6 — Final Verification

### Task 6.1: Verify all changes against approved changelog

**Status**: [ ]

**Plan**:
- Verify each new rule exists, has `fixable: false`, correct severity
- Verify each new rule has tests
- Verify each new rule is registered in `.resist-lint.jsonc`
- Run final QA
- Fix any issues found during verification

**Verification**: All tests pass, all changelog items verified

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1.1 | Write no-untracked-artifacts tests | — |
| 1.2 | Implement no-untracked-artifacts | 1.1 |
| 2.1 | Write no-broken-symlinks tests | — |
| 2.2 | Implement no-broken-symlinks | 2.1 |
| 3.1 | Write no-leftover-sqlite tests | — |
| 3.2 | Implement no-leftover-sqlite | 3.1 |
| 4.1 | Register rules in config | 1.2, 2.2, 3.2 |
| 5.1 | Full QA pass | All above |
| 5.2 | Coverage verification | 5.1 |
| 6.1 | Final verification | 5.2 |
