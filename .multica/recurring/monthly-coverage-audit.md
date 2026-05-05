---
name: Monthly test coverage audit
cron: "0 6 1 * *"
tz: America/Vancouver
agent: Opus 4.7
priority: medium
labels: [autopilot, coverage]
---

# Monthly test coverage audit

Goal: identify packages where test coverage has degraded over the past month, and file targeted backfill sub-issues.

## Steps

1. Run `pnpm -w run qa:test:coverage`. Capture the per-package coverage summary.
2. Compare against the same metric from the previous month's audit issue (search Multica for the most recent issue with title starting "Monthly test coverage audit").
3. For any package where coverage **dropped by more than 5 percentage points** since last month:
   - File a sub-issue of this audit (use the `decompose-issue` skill if you have >3 packages to file for, otherwise file directly)
   - Sub-issue title: `Backfill coverage in @/<package> (<old>% → <new>%)`
   - Sub-issue body: list the specific files in the package whose coverage dropped, with line counts
   - Sub-issue assignee: Sonnet 4.6 (use the `add-test-coverage` skill)
4. Post a summary comment on this issue:
   - Which packages were audited
   - Which dropped >5pp (and got sub-issues)
   - Which improved
   - Total workspace coverage delta MoM
5. Close this issue once sub-issues are filed.

## Constraints

- This issue does NOT write any tests itself. It only audits and decomposes.
- Use Opus 4.7 because the audit requires comparing against historical data and judging which drops are meaningful (dependencies removed = coverage drops but isn't bad)
- If no historical comparison is available (first run), establish baseline: post the current coverage as a comment, close issue. Next month becomes the first real comparison.

## Skip conditions

- If overall workspace coverage is ≥ previous month's total, comment "No regressions" and close (skip per-package check).
- If coverage tooling fails / times out, comment the failure reason and close. Do NOT retry — the next month's autopilot will try again.
