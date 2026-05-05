---
name: add-test-coverage
description: Increase test coverage for a specified file or package by writing new unit tests targeting uncovered branches. Trigger when an issue mentions "coverage", "untested", "missing tests", "add tests for", or includes a coverage report showing gaps.
---

# Add Test Coverage

Targeted backfill of unit tests for under-covered code in the resist-js monorepo.

## When to apply

- Issue title or body includes "coverage", "untested", "add tests"
- Issue references a specific package or file with coverage gaps
- Issue includes a coverage report (output of `pnpm -w run qa:test:coverage`)

## Steps

### 1. Identify the target

If the issue specifies a file or package, use it. Otherwise:
- Run `pnpm -w run qa:test:coverage`
- Pick the file or package with the largest gap (lines uncovered × file importance)

### 2. Read the code

Use `mcp__serena__find_symbol` to load the symbols that need coverage. Identify:
- Public exports (highest priority — these are the contract)
- Branch conditions (each branch needs at least one test)
- Error paths (Result.err returns, throw sites)
- Edge cases the existing tests miss

### 3. Read existing tests

Look at the existing test file (or sibling package's tests) to learn:
- Test framework (Vitest)
- Test patterns used (describe/it nesting, arrange-act-assert style)
- Fixtures and helpers
- Naming conventions

Match the existing style. Do NOT introduce a new style.

### 4. Write tests

For each uncovered branch:
- One test per branch with a descriptive name
- Use the smallest viable input that triggers the branch
- Assert on the observable behavior (return value, side effect), not implementation details

For Result-returning functions, test both the ok and err paths.

### 5. Validate

- `pnpm -r --filter <package> run qa:test` — all tests pass
- Re-run `pnpm -w run qa:test:coverage` for the package — coverage delta should be positive
- `pnpm -r --filter <package> run qa:lint` — no new diagnostics
- `pnpm -r --filter <package> run qa:typecheck` — no new errors

### 6. Handoff

Use the `multica-handoff` skill to commit + push.

## Failure modes

- **Code is genuinely untestable as written** — file a sibling issue suggesting a refactor; cover what you can; do not silently mark complete
- **Coverage tool reports gaps in unreachable code** — annotate with `/* c8 ignore */` (or framework equivalent) and explain WHY in a brief comment
- **Existing tests are flaky** — do not "fix" them as part of this task; file separate issue

## What NOT to do

- Do not lower coverage thresholds to pass
- Do not test private/internal helpers in isolation — test through the public API
- Do not add tests that just call the function and assert it returns truthy ("smoke tests" without value)
- Do not add tests that depend on test execution order
