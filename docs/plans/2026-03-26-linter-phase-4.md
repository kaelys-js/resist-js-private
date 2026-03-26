# resist-lint Phase 4 — Rule Expansion & Unification

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port all reference linter rules (checks + valibot), integrate oxlint into resist-lint, ensure config files are linted, and verify tool test coverage.

**Architecture:** New rules follow existing TypeScriptRule/WorkspaceRule patterns. Oxlint becomes an ExternalTool. Config files added to .resist-lint.jsonc include paths.

**Tech Stack:** TypeScript, Valibot, OXC AST, Vitest

**Baseline:** 1478 tests pass, 77 custom rules, 111 external tools, type-check clean, format clean, lint clean.

---

## Task E: Verify Tool Test Coverage

- [ ] E.1: Cross-reference every tool in `registry.ts` against `tools.test.ts`
- [ ] E.2: Confirm each tool has good-output test (clean → empty results)
- [ ] E.3: Confirm each tool has bad-output test (errors → non-empty results)
- [ ] E.4: Fill any gaps found
- [ ] E.5: QA pass (type-check, test, lint, format)

## Task A: Port Reference Checks Rules (2 new rules)

- [ ] A.1: Create `rules/package/names-valid.ts` — validate package.json name fields
- [ ] A.2: Add tests for names-valid to `package-rules.test.ts`
- [ ] A.3: Create `rules/workspace/workspace-valid.ts` — validate pnpm-workspace.yaml
- [ ] A.4: Add tests for workspace-valid
- [ ] A.5: Register both rules in `rules/registry.ts`
- [ ] A.6: Add both rules to `.resist-lint.jsonc`
- [ ] A.7: QA pass (type-check, test, lint, format)
- [ ] A.8: Commit

## Task B: Port Reference Valibot Rules (56 new rules)

### B1: Schema Structure & Naming (8 rules)
- [ ] B1.1: Create colocate-schema-type, export-schema-and-type, no-orphan-schemas, no-orphan-types
- [ ] B1.2: Create one-schema-per-file, schema-file-location, schema-type-pair, type-alias-from-schema
- [ ] B1.3: Add tests for all 8 rules
- [ ] B1.4: QA pass + commit

### B2: Import & Export Hygiene (6 rules)
- [ ] B2.1: Create consistent-infer, import-type-only, no-inline-infer
- [ ] B2.2: Create no-omit-pick-infer, no-partial-infer, no-reexport-infer
- [ ] B2.3: Add tests for all 6 rules
- [ ] B2.4: QA pass + commit

### B3: Ban Competing Libraries (5 rules)
- [ ] B3.1: Create no-class-validator, no-io-ts, no-joi, no-yup, no-zod
- [ ] B3.2: Add tests for all 5 rules
- [ ] B3.3: QA pass + commit

### B4: Schema Definition Anti-Patterns (12 rules)
- [ ] B4.1: Create no-any-schema, no-duplicate-keys, no-empty-object, no-loose-tuples
- [ ] B4.2: Create no-manual-types, no-nested-optional, no-passthrough, no-recursive-without-lazy
- [ ] B4.3: Create consistent-nullability, explicit-undefined, no-optional-heavy-object, no-schema-in-component
- [ ] B4.4: Add tests for all 12 rules
- [ ] B4.5: QA pass + commit

### B5: Validation & Parse Safety (11 rules)
- [ ] B5.1: Create await-async-parse, no-fallback-required, no-ignore-issues, no-type-cast-after-parse
- [ ] B5.2: Create no-unsafe-coerce, readonly-parse-result, no-mutate-after-parse
- [ ] B5.3: Create revalidate-on-change, no-schema-in-loop, no-inline-error-message, validate-function-output
- [ ] B5.4: Add tests for all 11 rules
- [ ] B5.5: QA pass + commit

### B6: Performance (3 rules)
- [ ] B6.1: Create discriminated-unions, limit-union-size, no-expensive-regex
- [ ] B6.2: Add tests for all 3 rules
- [ ] B6.3: QA pass + commit

### B7: Prefer Idiomatic Valibot (4 rules)
- [ ] B7.1: Create prefer-branded-types, prefer-methods, prefer-picklist, prefer-pipe
- [ ] B7.2: Add tests for all 4 rules
- [ ] B7.3: QA pass + commit

### B8: Error Handling & i18n (3 rules)
- [ ] B8.1: Create error-map-all-locales, error-map-complete, require-error-map
- [ ] B8.2: Add tests for all 3 rules
- [ ] B8.3: QA pass + commit

### B9: Documentation & Quality (4 rules)
- [ ] B9.1: Create require-description, require-error-mapping, no-transform-side-effects, validate-boundaries
- [ ] B9.2: Add tests for all 4 rules
- [ ] B9.3: QA pass + commit

### B-Final: Register & Configure
- [ ] B.F1: Register all 56 rules in `rules/registry.ts`
- [ ] B.F2: Add all 56 rules to `.resist-lint.jsonc`
- [ ] B.F3: Add locale strings to `en.ts` and `schema.ts`
- [ ] B.F4: Full QA pass + commit

## Task C: Integrate Oxlint as ExternalTool

- [ ] C.1: Create `tools/oxlint.ts` — ExternalTool wrapping oxlint with JSON output
- [ ] C.2: Add oxlint tool tests to `tools.test.ts`
- [ ] C.3: Register in `tools/registry.ts`
- [ ] C.4: Update root `package.json` — unify `qa:lint` to run only resist-lint with `--tools`
- [ ] C.5: Remove `qa:lint:custom` script
- [ ] C.6: QA pass + commit

## Task D: Config File Linting

- [ ] D.1: Verify editorconfig, ignore-files, npmrc, nvmrc tools cover config files
- [ ] D.2: Verify jsonlint covers .oxlintrc.json and biome.jsonc
- [ ] D.3: Update `.resist-lint.jsonc` include/extensions if needed
- [ ] D.4: Document config file → tool mapping
- [ ] D.5: QA pass + commit

## Final Verification

- [ ] V.1: Cross-reference every changelog item against implementation
- [ ] V.2: Run full test suite — all tests must pass
- [ ] V.3: Run full QA — type-check, lint, format all clean
- [ ] V.4: Final commit
