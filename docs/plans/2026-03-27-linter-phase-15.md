# @/lint Phase 15 — Port common.checks.sh Batch 3 (Disallowed Tooling & Legacy Config Files)

**Date**: 2026-03-27
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Goal**: Port 15 rules from `common.checks.sh` to TypeScript workspace rules: `no-yarn-files`, `no-npm-files`, `no-stylelint-config`, `no-commitlint-config`, `no-babel-config`, `no-tslint-config`, `no-huskyrc-config`, `no-tsconfig-overrides`, `no-bower-json`, `no-webpack-config`, `no-rollup-config`, `no-gulp-config`, `no-grunt-config`, `no-jsconfig`, `no-nodemon-config`.
**Architecture**: All 15 are WorkspaceRules with `scope: 'workspace'`. All use `ctx.allFiles()` + basename checks against a `ReadonlySet<string>` (except `no-tsconfig-overrides` which uses regex). All `fixable: false`.

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
| Tests | 2759 pass / 0 fail |
| Type-check | Passes |
| Workspace rules | 58 |
| Package rules | 21 |
| Total rules | 79 |
| Coverage thresholds | statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80% |

---

## TASK 1 — `workspace/no-yarn-files`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `YARN_FILE_NAMES` `ReadonlySet<string>` (9 entries):
  - `yarn.lock`, `.yarnrc`, `.yarnrc.yml`, `.yarnrc.yaml`, `.yarnrc.json`, `.yarnignore`, `yarn-error.log`, `yarn-debug.log`, `install-state.gz`
- For each match: `createResult('workspace/no-yarn-files', filePath, 1, 1, 'error', ...)` with message `Yarn artifact found: ${relativePath}`
- Tip: `'Remove Yarn files — this project uses pnpm exclusively.'`
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags `yarn.lock`, flags `.yarnrc.yml`, flags `install-state.gz`, passes normal `.ts` file, metadata check (`id`, `scope`, `categories`, `fixable`)

**Files**:
- Create: `rules/workspace/no-yarn-files.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 2 — `workspace/no-npm-files`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `NPM_FILE_NAMES` `ReadonlySet<string>` (4 entries):
  - `.npmrc`, `.npmignore`, `.npm-package.json`, `npm-debug.log`
- Note: `package-lock.json` already covered by existing `no-package-lock` rule — excluded to avoid duplication
- For each match: `createResult('workspace/no-npm-files', filePath, 1, 1, 'error', ...)` with message `npm artifact found: ${relativePath}`
- Tip: `'Remove npm files — this project uses pnpm exclusively.'`
- Severity: `error`, Categories: `['workspace', 'safety']`, Stages: `['lint', 'check']`
- Tests: flags `.npmrc`, flags `.npmignore`, flags `npm-debug.log`, passes `package-lock.json` (not this rule's responsibility), passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-npm-files.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 3 — `workspace/no-stylelint-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `STYLELINT_CONFIG_NAMES` `ReadonlySet<string>` (7 entries):
  - `.stylelintrc`, `.stylelintrc.json`, `.stylelintrc.yaml`, `.stylelintrc.yml`, `.stylelintrc.js`, `stylelint.config.js`, `stylelint.config.cjs`
- For each match: `createResult('workspace/no-stylelint-config', filePath, 1, 1, 'error', ...)` with message `Stylelint config file found: ${relativePath}`
- Tip: `'Remove Stylelint config — this project uses Biome for formatting.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `.stylelintrc`, flags `stylelint.config.js`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-stylelint-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 4 — `workspace/no-commitlint-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `COMMITLINT_CONFIG_NAMES` `ReadonlySet<string>` (6 entries):
  - `.commitlintrc`, `.commitlintrc.json`, `.commitlintrc.js`, `.commitlintrc.cjs`, `commitlint.config.js`, `commitlint.config.cjs`
- For each match: `createResult('workspace/no-commitlint-config', filePath, 1, 1, 'error', ...)` with message `Commitlint config file found: ${relativePath}`
- Tip: `'Remove Commitlint config — use the project approved commit strategy.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `.commitlintrc`, flags `commitlint.config.js`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-commitlint-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 5 — `workspace/no-babel-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `BABEL_CONFIG_NAMES` `ReadonlySet<string>` (5 entries):
  - `.babelrc`, `.babelrc.json`, `.babelrc.js`, `babel.config.js`, `babel.config.cjs`
- For each match: `createResult('workspace/no-babel-config', filePath, 1, 1, 'error', ...)` with message `Babel config file found: ${relativePath}`
- Tip: `'Remove Babel config — this project uses native ESM and Biome.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `.babelrc`, flags `babel.config.js`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-babel-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 6 — `workspace/no-tslint-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath) === 'tslint.json'`
- If match: `createResult('workspace/no-tslint-config', filePath, 1, 1, 'error', ...)` with message `Deprecated tslint.json found: ${relativePath}`
- Tip: `'Remove tslint.json — TSLint is deprecated. Use the custom linter instead.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `tslint.json`, passes `tsconfig.json` (not flagged), passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-tslint-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 7 — `workspace/no-huskyrc-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `HUSKYRC_CONFIG_NAMES` `ReadonlySet<string>` (3 entries):
  - `.huskyrc`, `.huskyrc.js`, `.huskyrc.json`
- For each match: `createResult('workspace/no-huskyrc-config', filePath, 1, 1, 'error', ...)` with message `Inline Husky config file found: ${relativePath}`
- Tip: `'Remove inline Husky config — use .husky/ folder with shell script hooks instead.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `.huskyrc`, flags `.huskyrc.json`, passes `.husky/pre-commit` (script-based hook is OK), passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-huskyrc-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 8 — `workspace/no-tsconfig-overrides`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check `basename(filePath)` with regex: `/^tsconfig\..+\.json$/`
- Allow: `tsconfig.json` (no middle segment — won't match regex) and `tsconfig.base.json` (shared base — explicitly excluded)
- Flag: `tsconfig.test.json`, `tsconfig.eslint.json`, `tsconfig.build.json`, etc.
- Implementation: `const name = basename(filePath); if (/^tsconfig\..+\.json$/.test(name) && name !== 'tsconfig.base.json')`
- For each match: `createResult('workspace/no-tsconfig-overrides', filePath, 1, 1, 'error', ...)` with message `Override-style tsconfig file found: ${relativePath}`
- Tip: `'Remove override tsconfig — extend from the shared tsconfig.base.json instead.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `tsconfig.test.json`, flags `tsconfig.eslint.json`, flags `tsconfig.build.json`, passes `tsconfig.json`, passes `tsconfig.base.json`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-tsconfig-overrides.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 9 — `workspace/no-bower-json`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath) === 'bower.json'`
- If match: `createResult('workspace/no-bower-json', filePath, 1, 1, 'error', ...)` with message `Deprecated bower.json found: ${relativePath}`
- Tip: `'Remove bower.json — Bower is unmaintained. Use pnpm instead.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `bower.json`, passes `package.json` (not flagged), passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-bower-json.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 10 — `workspace/no-webpack-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `WEBPACK_CONFIG_NAMES` `ReadonlySet<string>` (4 entries):
  - `webpack.config.js`, `webpack.config.ts`, `webpack.config.mjs`, `webpack.config.cjs`
- For each match: `createResult('workspace/no-webpack-config', filePath, 1, 1, 'error', ...)` with message `Webpack config file found: ${relativePath}`
- Tip: `'Remove Webpack config — this project uses Vite.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `webpack.config.js`, flags `webpack.config.ts`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-webpack-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 11 — `workspace/no-rollup-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `ROLLUP_CONFIG_NAMES` `ReadonlySet<string>` (4 entries):
  - `rollup.config.js`, `rollup.config.ts`, `rollup.config.mjs`, `rollup.config.cjs`
- For each match: `createResult('workspace/no-rollup-config', filePath, 1, 1, 'error', ...)` with message `Rollup config file found: ${relativePath}`
- Tip: `'Remove Rollup config — this project uses Vite.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `rollup.config.js`, flags `rollup.config.ts`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-rollup-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 12 — `workspace/no-gulp-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `GULP_CONFIG_NAMES` `ReadonlySet<string>` (3 entries):
  - `gulpfile.js`, `gulpfile.ts`, `gulpfile.babel.js`
- For each match: `createResult('workspace/no-gulp-config', filePath, 1, 1, 'error', ...)` with message `Gulp config file found: ${relativePath}`
- Tip: `'Remove Gulp config — use modern build tools like Biome or Vite.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `gulpfile.js`, flags `gulpfile.ts`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-gulp-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 13 — `workspace/no-grunt-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `GRUNT_CONFIG_NAMES` `ReadonlySet<string>` (3 entries):
  - `Gruntfile.js`, `Gruntfile.ts`, `Gruntfile.coffee`
- For each match: `createResult('workspace/no-grunt-config', filePath, 1, 1, 'error', ...)` with message `Grunt config file found: ${relativePath}`
- Tip: `'Remove Grunt config — use modern build tools like Biome or Vite.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `Gruntfile.js`, flags `Gruntfile.ts`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-grunt-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 14 — `workspace/no-jsconfig`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath) === 'jsconfig.json'`
- If match: `createResult('workspace/no-jsconfig', filePath, 1, 1, 'error', ...)` with message `jsconfig.json found: ${relativePath}`
- Tip: `'Remove jsconfig.json — use tsconfig.json in this TypeScript monorepo.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `jsconfig.json`, passes `tsconfig.json` (not flagged), passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-jsconfig.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 15 — `workspace/no-nodemon-config`

**Status**: [x]

**Plan**:
- Iterate `ctx.allFiles()`, check if `basename(filePath)` is in `NODEMON_CONFIG_NAMES` `ReadonlySet<string>` (2 entries):
  - `nodemon.json`, `.nodemon.json`
- For each match: `createResult('workspace/no-nodemon-config', filePath, 1, 1, 'error', ...)` with message `nodemon config file found: ${relativePath}`
- Tip: `'Remove nodemon config — use modern runtime watchers like tsx --watch or Bun.'`
- Severity: `error`, Categories: `['workspace', 'tooling']`, Stages: `['lint', 'check']`
- Tests: flags `nodemon.json`, flags `.nodemon.json`, passes normal file, metadata check

**Files**:
- Create: `rules/workspace/no-nodemon-config.ts`
- Test: `rules/workspace/workspace-rules.test.ts`

**Verification**: Tests pass, type-check passes

---

## TASK 16 — Register Rules + Config

**Status**: [x]

**Plan**: Register all 15 rules in `.resist-lint.jsonc` with severity `"error"`:
- `workspace/no-yarn-files`: `"error"`
- `workspace/no-npm-files`: `"error"`
- `workspace/no-stylelint-config`: `"error"`
- `workspace/no-commitlint-config`: `"error"`
- `workspace/no-babel-config`: `"error"`
- `workspace/no-tslint-config`: `"error"`
- `workspace/no-huskyrc-config`: `"error"`
- `workspace/no-tsconfig-overrides`: `"error"`
- `workspace/no-bower-json`: `"error"`
- `workspace/no-webpack-config`: `"error"`
- `workspace/no-rollup-config`: `"error"`
- `workspace/no-gulp-config`: `"error"`
- `workspace/no-grunt-config`: `"error"`
- `workspace/no-jsconfig`: `"error"`
- `workspace/no-nodemon-config`: `"error"`

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Config valid, all rules load

---

## TASK 17 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm --filter @/lint qa:type-check`
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
