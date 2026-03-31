---
name: qa-commands
description: "Use BEFORE running any QA command (tests, linting, formatting, type-checking). Provides the exact pnpm commands for this monorepo. NEVER run vitest, oxlint, biome, or tsc directly."
---

# QA Commands

## The Rule

This is a pnpm + Turborepo monorepo. **ALWAYS use these exact commands. NEVER run tools directly.**

## Commands

| Task | Command | Run From |
|------|---------|----------|
| **All tests** | `pnpm qa:test` | workspace root |
| **Lint + type-check** | `pnpm -w run qa:lint --tools` | anywhere (`-w` = workspace root) |
| **Lint (no type-check)** | `pnpm -w run qa:lint` | anywhere (`-w` = workspace root) |
| **Format check** | `pnpm -w run qa:format:check` | anywhere |
| **Format fix** | `pnpm qa:format` | workspace root |
| **Full QA** | `pnpm -w run qa:lint --tools && pnpm -w run qa:format:check && pnpm qa:test` | workspace root |

## NEVER Do This

- `npx vitest run` — WRONG
- `npx vitest run --project runtime` — WRONG
- `vitest run` — WRONG
- `oxlint .` — WRONG
- `biome check` — WRONG
- `tsc --noEmit` — WRONG

These bypass Turborepo's caching and project configuration. Always use the `pnpm qa:*` scripts.

## Reading Test Output

`pnpm qa:test` output is large. To get the summary:

```bash
pnpm qa:test 2>&1 | grep -E "(Test Files|Tests )"
```

Or capture to file and grep:

```bash
pnpm qa:test 2>&1 | tee /tmp/qa-test.txt
grep -E "(Test Files|Tests )" /tmp/qa-test.txt
```
