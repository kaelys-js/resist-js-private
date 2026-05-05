---
name: dependency-bump
description: Bump one or more npm dependencies, run all qa: targets, and fix any breakage. Trigger when an issue mentions package versions, "bump deps", "update dependencies", "upgrade X to vY", security advisories, or includes a Dependabot/Renovate-style payload.
---

# Dependency Bump

Update one or more npm dependencies in the resist-js monorepo with full QA validation and breakage triage.

## When to apply

- Issue title includes "bump", "upgrade", "update deps", or names a package + version
- Issue is a security advisory follow-up
- Issue body lists dependencies with old → new versions

## Steps

### 1. Confirm scope

Read the issue. Identify:
- Which dependency or dependencies (exact package names)
- Target version (specific version, or "latest", or "latest minor", or "latest patch")
- Which workspace package(s) hold the dependency

If unclear, comment on the issue asking before doing anything.

### 2. Single-dep workflow (one package)

```bash
pnpm -r --filter <workspace-package> add <dep>@<version>
```

For dev deps: append `-D`.

### 3. Multi-dep workflow

For multiple deps, do them ONE AT A TIME — each in its own commit on the same branch. This makes failure-revert surgical.

### 4. Validation cascade

Run in order. Stop at first failure:

```bash
pnpm -r --filter <workspace-package> run qa:typecheck
pnpm -r --filter <workspace-package> run qa:lint
pnpm -r --filter <workspace-package> run qa:test
```

Then full-workspace:

```bash
pnpm -w run qa:typecheck
pnpm -w run qa:test
```

### 5. Breakage triage

If the bump breaks anything:

- **Type errors** — read the dep's CHANGELOG / migration guide, apply the smallest fix to your code
- **Test failures** — same; fix tests if API genuinely changed
- **Lint diagnostics** — fix only those caused by the bump, not pre-existing
- **Runtime issues** — if you can't reproduce locally, post detailed analysis to the Multica issue and stop; don't ship breakage

If breakage is large (>5 files affected), file a separate refactor issue and pin the dep at the old version with a comment in package.json explaining why.

### 6. Lockfile review

`pnpm install` regenerates the lockfile. Review the lockfile diff:
- Only the bumped dep + transitive deps should change
- If unrelated changes appear, investigate (peer dep upgrade?)

### 7. Handoff

Use the `multica-handoff` skill to commit + push. Commit message format:

```
chore(deps): bump <package> from <old> to <new>

<one-line reason — e.g., "security advisory CVE-...", "minor feature backports", "team-wide minor refresh">
```

## Failure modes

- **Lockfile conflicts on push** — `git pull --rebase`, regenerate via `pnpm install`, retry push
- **Major version bump with breaking changes** — STOP. Don't power through. File a separate refactor issue with the migration plan; pin the dep at the previous major.
- **Pnpm patch / overrides needed** — document in the commit message; add a comment in package.json near the override

## What NOT to do

- Do not bump multiple unrelated deps in one commit
- Do not ignore "warning" lint or peer-dep messages from pnpm — read them
- Do not bump dev-only deps that aren't actually used (`pnpm -r outdated` may show false positives)
- Do not skip qa:test because "the bump shouldn't affect tests" — runtime behavior changes are common in minor bumps
