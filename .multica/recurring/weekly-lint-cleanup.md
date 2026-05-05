---
name: Weekly lint cleanup (most-affected package)
cron: "0 9 * * 1"
tz: America/Vancouver
agent: Sonnet 4.6
priority: medium
labels: [autopilot, lint]
---

# Weekly lint cleanup

Goal: drive lint diagnostics in the resist-js workspace toward zero, one package per week.

## Steps

1. Run `pnpm -w run qa:lint` to get the full set of current diagnostics.
2. Group diagnostics by package (path prefix `packages/<name>/...`).
3. Pick the package with the **largest count** of diagnostics. If multiple are tied, prefer the one with the most distinct rule violations.
4. Run `pnpm -w run qa:lint <package-path>` to scope to that package only.
5. Fix EVERY diagnostic in that package. Use the `code-rules` skill for any code-quality violations and the lint output's auto-fix suggestions where applicable.
6. Verify zero diagnostics in the target package: `pnpm -w run qa:lint <package-path>`.
7. Verify no regressions elsewhere: `pnpm -w run qa:lint` should show fewer total diagnostics than before.
8. Use the `multica-handoff` skill to commit + push.

## Constraints

- Touch ONLY files in the target package, except in two cases:
  - A diagnostic stems from a shared utility used by the target package: fix the utility too, but document in the commit message
  - A type error in the target package is caused by an upstream package's exported type: open a sub-issue for the upstream fix; skip that diagnostic in this run
- Do NOT add `// eslint-disable` or equivalent — fix the underlying code (the repo's hooks block lint config edits anyway)
- Do NOT touch `.oxlintrc.json`, `biome.json`, or any lint config file

## Skip if nothing to do

If `pnpm -w run qa:lint` exits 0 (no diagnostics anywhere), comment on the issue: "No lint diagnostics this week. Closing." Then close the issue. No commit needed.
