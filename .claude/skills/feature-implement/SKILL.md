---
name: feature-implement
description: Implement a new feature end-to-end with design check, code, tests, and docs. Trigger when an issue title or body contains "feat:", "feature:", "add:", "implement:", "introduce:", or otherwise clearly describes new functionality being added (vs. fixed or refactored).
---

# Feature Implementation

End-to-end implementation of a new feature in the resist-js monorepo. Covers design alignment, code, tests, and documentation as one atomic unit of work.

## When to apply

- Issue title starts with `feat:`, `feature:`, `add:`, `implement:`, or `introduce:`
- Issue body describes capability that doesn't exist yet
- Issue is NOT a bug fix (use `fix-bug` skill instead) or refactor (use `refactor-pattern`)

## Steps

### 1. Design check (5 min)

Before writing code:
- Read CLAUDE.md and any package-specific README in the affected area
- Use `mcp__serena__list_memories` and read any memory files matching the affected area (e.g. `storylyne-overview` for storylyne work)
- Check `docs/decisions/` for relevant ADRs
- Identify the smallest viable scope that delivers user value

If the issue is ambiguous (multiple valid implementations, unclear acceptance criteria), post a comment on the Multica issue asking for clarification rather than guessing.

### 2. Plan announcement (1 min)

Post a comment on the Multica issue with:
- Files you'll touch (paths)
- Public API surface (new exports, components, types)
- Test strategy

This is a courtesy + audit trail, not a gate. Do not wait for approval.

### 3. Implementation

- Follow CLAUDE.md code rules (Result pattern, Valibot types, DeepReadonly, no comments unless WHY is non-obvious)
- Edit existing files in preference to creating new ones
- Use `mcp__serena__find_symbol` and `mcp__cocoindex_code__search` for code navigation, not grep
- Reuse existing utilities — search before creating

### 4. Tests

Add tests at the appropriate level:
- Unit tests in the same package (`*.test.ts` next to source)
- Integration tests if the feature crosses package boundaries
- E2E tests if the feature has UI surface

Test the golden path AND realistic edge cases. Use the qa-commands skill for the right test invocation.

### 5. Validation

Run the package-scoped QA targets:
- `pnpm -r --filter <package> run qa:lint`
- `pnpm -r --filter <package> run qa:test`
- `pnpm -r --filter <package> run qa:typecheck` (if exists)

Fix every diagnostic. Do NOT mark the task complete with failing checks.

### 6. Documentation

If the feature has user-visible API:
- Update the package's README if one exists
- Add a one-line note to CHANGELOG.md if the package has one
- Update any affected examples

Skip docs for purely internal features.

### 7. Handoff

Use the `multica-handoff` skill to commit + push.

## Failure modes

- **Lint diagnostics in pre-existing code that block your edits** — do NOT fix them as part of this feature unless they're directly in your touched files. File a separate issue if substantial.
- **Tests time out / flake** — investigate root cause; do not retry-loop. If genuinely flaky, mark with `.skip` and file an issue noting it.
- **Public API change ripples beyond your scope** — stop, post a comment with the ripple analysis, ask for direction.

## What NOT to do

- Do not introduce new abstractions for hypothetical future features
- Do not refactor unrelated code "while you're in there"
- Do not add error handling for impossible cases (trust internal invariants per CLAUDE.md)
- Do not add comments explaining WHAT the code does — only WHY when non-obvious
