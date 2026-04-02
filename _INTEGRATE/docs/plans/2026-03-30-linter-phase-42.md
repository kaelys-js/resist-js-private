# @/lint Phase 42 — Per-Rule JSON Schema Properties

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: Schema generator bundles all rule descriptions into one giant `description` string on the `rules` property
**Goal**: Fix `generateJsonSchema()` so each rule gets its own named property under `rules.properties` with individual `description`, `enum`, and `type`. Same for `overrides[].rules`. Keep `additionalProperties` as fallback for unknown rules.
**Architecture**: Build a `properties` map from `ruleIds` + `ruleDescriptions`, add to both `rules` and `overrides[].rules` objects.

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
| Tests | 4728 pass / 0 fail |
| Type-check | Passes |
| Schema rules property | All descriptions bundled in one string |
| Per-rule properties | None |

---

## TASK 0 — Modify `generateJsonSchema()` to emit per-rule properties

**Status**: [x]

**What**: Add a `properties` map to the `rules` object where each rule ID has its own `description`, `enum: ['error', 'warn', 'off']`, and `type: 'string'`. Do the same for `overrides[].rules`. Keep `additionalProperties` as fallback.

**Plan**:
- Build `ruleProperties: Record<string, JsonSchemaProperty>` from `ruleIds` + `ruleDescriptions`
- Each entry: `{ description: ruleDescriptions.get(id), enum: ['error', 'warn', 'off'], type: 'string' }`
- Add `properties: ruleProperties` to the `rules` object
- Add same `properties: ruleProperties` to `overrides[].rules` object
- Remove the bundled `ruleList` from the `rules.description` string (keep the base description)

**Files**:
- Modify: `src/config/schema.ts`

**Verification**: Type-check passes

---

## TASK 1 — Verify `JsonSchemaProperty` type supports this

**Status**: [x]

**What**: Confirm `JsonSchemaProperty` already has `properties?: Record<string, JsonSchemaProperty>` — no changes needed if it does.

**Files**:
- Read: `src/config/schema.ts` (type definition)

**Verification**: Type already supports nested properties

---

## TASK 2 — Register Rules + Config

**Status**: [x]

**What**: Regenerate `.resist-lint.schema.json` with per-rule properties. Verify the generated schema file has individual rule entries under `rules.properties` and `overrides[].rules.properties`.

**Plan**:
- Run the schema generator to produce the updated schema file
- Verify the output has individual rule properties under `rules.properties`
- Verify `overrides[].rules` also has per-rule properties
- Verify `additionalProperties` still present as fallback

**Files**:
- Modified: `.resist-lint.schema.json`

**Verification**: Schema file has per-rule entries with individual descriptions

---

## TASK 3 — Update tests in `schema.test.ts`

**Status**: [x]

**What**: Update existing tests and add new ones for per-rule properties.

**Plan** — test cases:
1. `rules` has `properties` with individual rule entries
2. Each rule property has `enum: ['error', 'warn', 'off']`
3. Each rule property has `type: 'string'`
4. Each rule property has its own `description` from `ruleDescriptions`
5. `additionalProperties` still present as fallback
6. `overrides[].rules` also has per-rule `properties`
7. Empty rule list produces empty `properties` object
8. Rule with no description entry gets empty string description
9. Existing tests still pass (regression)

**Files**:
- Modify: `src/config/schema.test.ts`

**Verification**: All tests pass

---

## TASK 4 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count >= baseline (4728)

**Verification**: All commands exit 0

---

## TASK 5 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify per-rule properties in generated schema
- Verify overrides also have per-rule properties
- Verify additionalProperties still present as fallback
- Verify all tests pass
- Verify test count >= baseline (4728)
- Commit with descriptive message

**Verification**:
- All tests pass
- Test count >= baseline

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 0 | Modify generateJsonSchema() | — |
| 1 | Verify JsonSchemaProperty type | — |
| 2 | Register Rules + Config (regenerate schema) | 0 |
| 3 | Update tests | 0 |
| 4 | Full QA + Coverage | 0-3 |
| 5 | Final verification + commit | 4 |
