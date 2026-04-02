# @/lint Phase 43 — Svelte 5 Configuration Lint Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/svelte5-config.md` — 15 Svelte 5 / SvelteKit configuration rules
**Goal**: Implement 15 TypeScript AST rules analyzing `svelte.config.*` and `vite.config.*` files for SvelteKit best practices, deprecated options, adapter validation, and security configuration.
**Architecture**: All rules are `TypeScriptRule` with `ExportDefaultDeclaration` visitor. Shared config AST helpers in `_config-ast.ts` provide property navigation. Cross-file rules (3, 4, 5) use `node:fs`/`node:path` for companion file checks.

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
| Tests | 4730 pass / 0 fail |
| Type-check | Passes |
| Svelte5-config rules | 0 |

---

## TASK 0 — Shared config AST helpers

**Status**: [ ]

**What**: Create helper module for navigating config file ASTs.

**Plan**:
- `getDefaultExportObject(ast)` — find the ObjectExpression from `export default { ... }`
- `findProperty(obj, name)` — find a property by key name in ObjectExpression
- `getPropertyValue(obj, path)` — navigate nested properties like `kit.adapter`
- `hasProperty(obj, name)` — check if property exists
- `getPropertyName(prop)` — get key name (Identifier or StringLiteral)
- `isUndefinedValue(node)` — check if value is `undefined`
- `isCallExpressionOf(node, name)` — check if `node` is `name(...)`
- `getAdapterImport(imports)` — get adapter package name from imports

**Files**:
- Create: `src/rules/svelte5-config/_config-ast.ts`

**Verification**: Type-check passes

---

## TASK 1 — svelte5-config/require-adapter

**Status**: [ ]

**What**: Error when `svelte.config` missing `kit.adapter` or setting it to `undefined`.

**Files**:
- Create: `src/rules/svelte5-config/require-adapter.ts`

**Verification**: Type-check passes

---

## TASK 2 — svelte5-config/cloudflare-adapter-settings

**Status**: [ ]

**What**: Warn when importing `@sveltejs/adapter-cloudflare` but adapter called without `routes` config.

**Files**:
- Create: `src/rules/svelte5-config/cloudflare-adapter-settings.ts`

**Verification**: Type-check passes

---

## TASK 3 — svelte5-config/static-adapter-for-capacitor

**Status**: [ ]

**What**: Error when `capacitor.config.ts/json` exists but not using `@sveltejs/adapter-static`.

**Files**:
- Create: `src/rules/svelte5-config/static-adapter-for-capacitor.ts`

**Verification**: Type-check passes

---

## TASK 4 — svelte5-config/no-node-adapter-cloudflare

**Status**: [ ]

**What**: Error when `wrangler.toml/json` exists but using `@sveltejs/adapter-node`.

**Files**:
- Create: `src/rules/svelte5-config/no-node-adapter-cloudflare.ts`

**Verification**: Type-check passes

---

## TASK 5 — svelte5-config/kit-alias-consistency

**Status**: [ ]

**What**: Warn when `kit.alias` entries don't match `tsconfig.json` paths.

**Files**:
- Create: `src/rules/svelte5-config/kit-alias-consistency.ts`

**Verification**: Type-check passes

---

## TASK 6 — svelte5-config/require-runes-mode

**Status**: [ ]

**What**: Warn when `compilerOptions.runes` is not `true`.

**Files**:
- Create: `src/rules/svelte5-config/require-runes-mode.ts`

**Verification**: Type-check passes

---

## TASK 7 — svelte5-config/no-deprecated-options

**Status**: [ ]

**What**: Error on deprecated Svelte 4 config options with migration guidance.

**Files**:
- Create: `src/rules/svelte5-config/no-deprecated-options.ts`

**Verification**: Type-check passes

---

## TASK 8 — svelte5-config/prerender-config

**Status**: [ ]

**What**: Warn when using static adapter without `prerender` config.

**Files**:
- Create: `src/rules/svelte5-config/prerender-config.ts`

**Verification**: Type-check passes

---

## TASK 9 — svelte5-config/csp-headers

**Status**: [ ]

**What**: Warn when `kit.csp` is missing.

**Files**:
- Create: `src/rules/svelte5-config/csp-headers.ts`

**Verification**: Type-check passes

---

## TASK 10 — svelte5-config/env-prefix-consistency

**Status**: [ ]

**What**: Error on empty `publicPrefix`, matching public/private prefix, or non-standard prefixes.

**Files**:
- Create: `src/rules/svelte5-config/env-prefix-consistency.ts`

**Verification**: Type-check passes

---

## TASK 11 — svelte5-config/output-directory

**Status**: [ ]

**What**: Error when output directories point to source directories.

**Files**:
- Create: `src/rules/svelte5-config/output-directory.ts`

**Verification**: Type-check passes

---

## TASK 12 — svelte5-config/version-skew-handling

**Status**: [ ]

**What**: Warn when `kit.version` is missing or has no `pollInterval`.

**Files**:
- Create: `src/rules/svelte5-config/version-skew-handling.ts`

**Verification**: Type-check passes

---

## TASK 13 — svelte5-config/trailing-slash-consistency

**Status**: [ ]

**What**: Warn when `kit.trailingSlash` is not explicitly set.

**Files**:
- Create: `src/rules/svelte5-config/trailing-slash-consistency.ts`

**Verification**: Type-check passes

---

## TASK 14 — svelte5-config/no-inline-preprocess

**Status**: [ ]

**What**: Warn when `preprocess` array has inline object literals with function properties.

**Files**:
- Create: `src/rules/svelte5-config/no-inline-preprocess.ts`

**Verification**: Type-check passes

---

## TASK 15 — svelte5-config/vite-optimizeDeps

**Status**: [ ]

**What**: Warn when `vite.config` excludes Svelte packages from `optimizeDeps`.

**Files**:
- Create: `src/rules/svelte5-config/vite-optimizeDeps.ts`

**Verification**: Type-check passes

---

## TASK 16 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Add all 15 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 1, 3, 4, 7, 10, 11: `"error"`
- Rules 2, 5, 6, 8, 9, 12, 13, 14, 15: `"warn"`

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All rules appear in config

---

## TASK 17 — Tests: all 15 rules + helpers

**Status**: [ ]

**What**: Full branch-coverage tests for every rule.

**Files**:
- Create: `src/rules/svelte5-config/svelte5-config-rules.test.ts`

**Verification**: All tests pass

---

## TASK 18 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline (4730)

**Verification**: All commands exit 0

---

## TASK 19 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify all 15 rule files exist
- Verify all 15 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline (4730)
- Commit with descriptive message

**Verification**:
- All tests pass
- Test count >= baseline + new tests

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 0 | Shared config AST helpers | — |
| 1-15 | Individual rules | 0 |
| 16 | Register Rules + Config | 1-15 |
| 17 | Tests | 0-15 |
| 18 | Full QA + Coverage | 0-17 |
| 19 | Final verification + commit | 18 |
