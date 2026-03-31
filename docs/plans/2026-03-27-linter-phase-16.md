# @/lint Phase 16 — Port common.checks.sh Batch 4 (Security, Hygiene & Advanced File Checks)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-27
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 rules from `common.checks.sh` to TypeScript workspace rules: `no-sensitive-cert-files`, `no-env-file-clones`, `no-git-submodules`, `no-nested-git-folders`, `no-nonroot-ignore-files`, `no-sudo-in-scripts`, `no-scss-sass`, `no-cypress-config`, `no-puppeteer-config`, `no-pnpmfile`, `no-browserslist`, `no-swcrc`, `no-parcel-config`, `no-postinstall-scripts`, `no-tool-overrides-in-package-json`.
**Architecture**: All 15 are `WorkspaceRule`s with `scope: 'workspace'`. Tasks 1–13 use `ctx.allFiles()` + basename/extension checks against a `ReadonlySet<string>` or regex. Tasks 6, 14, 15 also read file content via `ctx.readFile()`. All `fixable: false`.

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
| Tests | 2825 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 75 |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — `workspace/no-sensitive-cert-files`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, extract file extension via `extname(filePath).toLowerCase()`
- Check if extension is in `SENSITIVE_EXTENSIONS` `ReadonlySet<string>`: `'.pem'`, `'.key'`, `'.crt'`, `'.p12'`, `'.cer'`, `'.der'`
- For each match: call `createResult('workspace/no-sensitive-cert-files', filePath, 1, 1, 'error', ...)` with message ``Sensitive credential file found: ${relativePath}``
- `tip`: `'Store certs outside version control or use a secrets manager.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'safety']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/certs/server.pem`, flags `/workspace/tls/key.p12`, passes `/workspace/src/index.ts`, metadata check

**Files**:
- Create: `rules/workspace/no-sensitive-cert-files.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 2 — `workspace/no-env-file-clones`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check `basename(filePath)` against regex `/^\.env(\.(copy|bak|old|save|tmp)|[0-9]+)$/`
- This catches `.env.copy`, `.env.bak`, `.env.old`, `.env.save`, `.env.tmp`, `.env2`, `.env3`, etc.
- Does NOT flag `.env`, `.env.local`, `.env.example` — those are handled by `no-env-files` rule
- For each match: call `createResult('workspace/no-env-file-clones', filePath, 1, 1, 'error', ...)` with message ``Suspicious .env clone found: ${relativePath}``
- `tip`: `'Remove duplicate or backup .env files to prevent accidental usage.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'safety']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/.env.bak`, flags `/workspace/.env2`, passes `/workspace/.env.local`, passes `/workspace/.env.example`, metadata check

**Files**:
- Create: `rules/workspace/no-env-file-clones.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 3 — `workspace/no-git-submodules`

**Status**: [x]

**Plan**:
- Use `ctx.fileExists(join(ctx.rootDir, '.gitmodules'))` to check for submodule config
- If file exists: call `createResult('workspace/no-git-submodules', join(ctx.rootDir, '.gitmodules'), 1, 1, 'error', '.gitmodules file found — submodules are not allowed in this monorepo')`
- `tip`: `'Use workspace packages or vendored modules instead of submodules.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'safety']`, `stages: ['lint', 'check']`, `fixable: false`
- Import `join` from `'node:path'`
- Tests: flags when `.gitmodules` exists in files map at `/workspace/.gitmodules`, passes when file does not exist, metadata check

**Files**:
- Create: `rules/workspace/no-git-submodules.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 4 — `workspace/no-nested-git-folders`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, for each `filePath` check if the path contains `/.git/` segment after `ctx.rootDir`
- Specifically: `const rel = relative(ctx.rootDir, filePath); if (rel.includes('.git/') || rel.split('/').includes('.git'))` — this catches files inside nested `.git` directories
- Note: `allFiles()` skips the root `.git` already, so any `.git` segment found is a nested one
- For each match: call `createResult('workspace/no-nested-git-folders', filePath, 1, 1, 'error', ...)` with message ``Nested .git folder detected: ${relativePath}``
- `tip`: `'Remove nested .git directories — only one should exist at root.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'safety']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/packages/foo/.git/config`, passes `/workspace/src/index.ts`, metadata check

**Files**:
- Create: `rules/workspace/no-nested-git-folders.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 5 — `workspace/no-nonroot-ignore-files`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `IGNORE_BASENAMES` `ReadonlySet<string>`: `'.gitignore'`, `'.dockerignore'`
- Only flag if the file is NOT at `ctx.rootDir` directly: `dirname(filePath) !== ctx.rootDir`
- For each match: call `createResult('workspace/no-nonroot-ignore-files', filePath, 1, 1, 'error', ...)` with message ``Non-root ignore file found: ${relativePath}``
- `tip`: `'Centralize all ignore rules to the project root.'`
- Import `dirname` from `'node:path'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'safety']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/packages/foo/.gitignore`, passes `/workspace/.gitignore` (root), passes `/workspace/src/index.ts`, metadata check

**Files**:
- Create: `rules/workspace/no-nonroot-ignore-files.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 6 — `workspace/no-sudo-in-scripts`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, filter to files with `.sh` extension via `extname(filePath) === '.sh'`
- Read content via `ctx.readFile(filePath)`, scan each line with regex `/^\s*[^#]*\bsudo\b/` (non-comment lines containing `sudo`)
- For each matching line: call `createResult('workspace/no-sudo-in-scripts', filePath, lineNumber, 1, 'error', ...)` with message ``'sudo' usage found in shell script``
- `tip`: `'Remove sudo — assume scripts run in a permissioned container or CI environment.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'safety']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags script with `sudo apt install`, passes script with `# sudo commented out`, passes non-sh file, metadata check

**Files**:
- Create: `rules/workspace/no-sudo-in-scripts.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 7 — `workspace/no-scss-sass`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `extname(filePath)` is `'.scss'` or `'.sass'`
- Store in `SCSS_EXTENSIONS` `ReadonlySet<string>`: `'.scss'`, `'.sass'`
- For each match: call `createResult('workspace/no-scss-sass', filePath, 1, 1, 'error', ...)` with message ``SCSS/SASS file found: ${relativePath}``
- `tip`: `'Use CSS modules, PostCSS, or utility-first frameworks like Tailwind instead.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'tooling']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/styles/main.scss`, flags `/workspace/components/app.sass`, passes `/workspace/styles/main.css`, metadata check

**Files**:
- Create: `rules/workspace/no-scss-sass.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 8 — `workspace/no-cypress-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check `basename(filePath)` against `CYPRESS_CONFIG_NAMES` `ReadonlySet<string>`: `'cypress.config.js'`, `'cypress.config.ts'`, `'cypress.json'`
- For each match: call `createResult('workspace/no-cypress-config', filePath, 1, 1, 'error', ...)` with message ``Cypress config file found: ${relativePath}``
- `tip`: `'Use approved test tooling like Playwright instead of Cypress.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'tooling']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/cypress.config.ts`, flags `/workspace/cypress.json`, passes `/workspace/playwright.config.ts`, metadata check

**Files**:
- Create: `rules/workspace/no-cypress-config.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 9 — `workspace/no-puppeteer-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check `basename(filePath)` against `PUPPETEER_CONFIG_NAMES` `ReadonlySet<string>`: `'puppeteer.config.js'`, `'puppeteer.config.ts'`, `'.puppeteerrc'`, `'.puppeteerrc.cjs'`
- For each match: call `createResult('workspace/no-puppeteer-config', filePath, 1, 1, 'error', ...)` with message ``Puppeteer config file found: ${relativePath}``
- `tip`: `'Use Playwright instead of Puppeteer for browser automation.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'tooling']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/puppeteer.config.js`, passes `/workspace/playwright.config.ts`, metadata check

**Files**:
- Create: `rules/workspace/no-puppeteer-config.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 10 — `workspace/no-pnpmfile`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is `'pnpmfile.js'`
- For each match: call `createResult('workspace/no-pnpmfile', filePath, 1, 1, 'error', ...)` with message ``pnpmfile.js found: ${relativePath}``
- `tip`: `'Use overrides or patch-package instead with clear traceability.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'safety']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/pnpmfile.js`, passes `/workspace/pnpm-workspace.yaml`, metadata check

**Files**:
- Create: `rules/workspace/no-pnpmfile.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 11 — `workspace/no-browserslist`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is `'.browserslistrc'`
- For each match: call `createResult('workspace/no-browserslist', filePath, 1, 1, 'error', ...)` with message ``Browserslist config file found: ${relativePath}``
- `tip`: `'Use unified toolchains with default targets (e.g., Biome).'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'tooling']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/.browserslistrc`, passes `/workspace/biome.json`, metadata check

**Files**:
- Create: `rules/workspace/no-browserslist.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 12 — `workspace/no-swcrc`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is `'.swcrc'`
- For each match: call `createResult('workspace/no-swcrc', filePath, 1, 1, 'error', ...)` with message ``SWC config file found: ${relativePath}``
- `tip`: `'Remove .swcrc and use project-approved compiler only.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'tooling']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/.swcrc`, passes `/workspace/tsconfig.json`, metadata check

**Files**:
- Create: `rules/workspace/no-swcrc.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 13 — `workspace/no-parcel-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check `basename(filePath)` against `PARCEL_CONFIG_NAMES` `ReadonlySet<string>`: `'.parcelrc'`
- Also check with regex `/^parcel\.config\..+$/` to match `parcel.config.js`, `parcel.config.mjs`, etc.
- For each match: call `createResult('workspace/no-parcel-config', filePath, 1, 1, 'error', ...)` with message ``Parcel config file found: ${relativePath}``
- `tip`: `'Use the approved bundler (e.g., Vite, esbuild) instead of Parcel.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'tooling']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `/workspace/.parcelrc`, flags `/workspace/parcel.config.js`, passes `/workspace/vite.config.ts`, metadata check

**Files**:
- Create: `rules/workspace/no-parcel-config.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 14 — `workspace/no-postinstall-scripts`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, filter to files where `basename(filePath) === 'package.json'`
- Read content via `ctx.readFile(filePath)`, parse with `JSON.parse()`
- Check if `parsed.scripts?.postinstall` exists (is truthy string)
- For each match: call `createResult('workspace/no-postinstall-scripts', filePath, 1, 1, 'error', ...)` with message ``postinstall script found in: ${relativePath}``
- `tip`: `'Move postinstall logic to a build or prepare script if needed.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'safety']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `package.json` with `{"scripts":{"postinstall":"node setup.js"}}`, passes `package.json` with `{"scripts":{"build":"tsc"}}`, passes `package.json` with no scripts, metadata check

**Files**:
- Create: `rules/workspace/no-postinstall-scripts.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 15 — `workspace/no-tool-overrides-in-package-json`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, filter to files where `basename(filePath) === 'package.json'`
- Read content via `ctx.readFile(filePath)`, parse with `JSON.parse()`
- Check if any key in `DISALLOWED_KEYS` array (`'biome'`, `'oxlint'`, `'eslintConfig'`, `'prettier'`) exists as a top-level key in the parsed object
- For each found key: call `createResult('workspace/no-tool-overrides-in-package-json', filePath, 1, 1, 'error', ...)` with message ``Disallowed config key "${key}" found in: ${relativePath}``
- `tip`: `'Move tool configuration to a standalone config file.'`
- Rule metadata: `scope: 'workspace'`, `categories: ['workspace', 'tooling']`, `stages: ['lint', 'check']`, `fixable: false`
- Tests: flags `package.json` with `{"eslintConfig":{}}`, flags `package.json` with `{"prettier":{}}`, passes clean `package.json`, metadata check

**Files**:
- Create: `rules/workspace/no-tool-overrides-in-package-json.ts`
- Edit: `rules/workspace/workspace-rules.test.ts`

**Verification**: `pnpm -w run qa:lint --tools && pnpm --filter @/lint qa:test`

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**: Register all 15 rules in `.resist-lint.jsonc` with severity `"error"`:
- `workspace/no-sensitive-cert-files`: `"error"`
- `workspace/no-env-file-clones`: `"error"`
- `workspace/no-git-submodules`: `"error"`
- `workspace/no-nested-git-folders`: `"error"`
- `workspace/no-nonroot-ignore-files`: `"error"`
- `workspace/no-sudo-in-scripts`: `"error"`
- `workspace/no-scss-sass`: `"error"`
- `workspace/no-cypress-config`: `"error"`
- `workspace/no-puppeteer-config`: `"error"`
- `workspace/no-pnpmfile`: `"error"`
- `workspace/no-browserslist`: `"error"`
- `workspace/no-swcrc`: `"error"`
- `workspace/no-parcel-config`: `"error"`
- `workspace/no-postinstall-scripts`: `"error"`
- `workspace/no-tool-overrides-in-package-json`: `"error"`

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Config valid, all rules load

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm -w run qa:lint --tools`
- Run `pnpm -w run qa:test`
- Run `pnpm -w run qa:format:check`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify all coverage thresholds pass (statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%)

**Verification**: All QA green, coverage above thresholds

---

## TASK 18 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 15 rules implemented against approved changelog
- Verify each rule file exists at `rules/workspace/<rule-name>.ts` and matches its plan
- Verify each rule has tests in `rules/workspace/workspace-rules.test.ts`
- Verify all 15 rules registered in `.resist-lint.jsonc` at `"error"`
- Commit all changes

**Verification**: All tasks `[x]`, commit clean
