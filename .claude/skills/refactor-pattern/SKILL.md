---
name: refactor-pattern
description: Apply a code-pattern transformation across the repo with safety preview and per-file review. Trigger when an issue describes converting one pattern to another (e.g. "migrate X to Y", "replace all X with Y", "convert X-style to Y-style"), naming a deprecated API to remove, or codifying a new convention.
---

# Refactor Pattern

Mechanical or semi-mechanical pattern migration across many files in the resist-js monorepo.

## When to apply

- Issue describes a from-pattern and to-pattern transformation
- Issue title includes "migrate", "convert", "replace all", "remove deprecated", "codify"
- Affected scope is multiple files (single-file patterns belong in a regular feature/fix issue)

## Steps

### 1. Pin down the patterns precisely

Before any edits:
- Quote the from-pattern as a code snippet in your plan
- Quote the to-pattern as a code snippet in your plan
- List edge cases that look like the from-pattern but should NOT be transformed
- List the search query you'll use to find sites (`mcp__serena__find_symbol` for symbol-anchored, `mcp__cocoindex_code__search` for fuzzy)

Post these to the Multica issue as a comment before starting.

### 2. Discover all sites

Run the search. For each site:
- File path + line number
- Whether it matches the pattern exactly or has a wrinkle

Compile a checklist. If >50 sites, decompose into sub-issues per package via the `decompose-issue` skill.

### 3. Per-site edits (NOT bulk scripts)

The repo's `pre-bash-block-bulk-script.sh` and `pre-bash-block-multi-file-shell.sh` hooks block bulk shell-loop edits. Use the Edit tool per site.

For each site:
- Read the surrounding context (10 lines before/after)
- Apply the transformation
- Verify the new code is correct in context (not just textually replaced)

### 4. Per-package validation

After finishing all sites in a package:
- `pnpm -r --filter <package> run qa:typecheck`
- `pnpm -r --filter <package> run qa:lint`
- `pnpm -r --filter <package> run qa:test`

If any check fails, fix before moving to the next package. Do NOT defer.

### 5. Cross-package validation

After all packages:
- `pnpm -w run qa:typecheck`
- `pnpm -w run qa:test`

### 6. Update conventions

If the refactor codifies a new convention:
- Add the rule to CLAUDE.md or the relevant `.serena/memories/*.md` file
- Add a lint rule (if mechanically detectable) — open a separate issue, do not include in this one

### 7. Handoff

Use the `multica-handoff` skill to commit + push.

## Failure modes

- **A site has a wrinkle that breaks the transformation** — leave it untransformed, document in commit message: "Skipped X sites (path:line) — see issue body for follow-up"
- **Transformation breaks tests in unexpected ways** — stop, post analysis to the Multica issue, ask for direction
- **Affected files have unrelated lint diagnostics** — do NOT fix them; stay scoped

## What NOT to do

- Do not write Python or sed scripts to do the bulk transformation (hooks will block)
- Do not extend scope to "while I'm here" cleanups
- Do not collapse multi-step transformations into one commit — one commit per package keeps reverts surgical
