# Build / test / lint / format pipeline

> Captured 2026-05-05. Branch: `main`. Companions: `monorepo-architecture` (24 vitest projects, dependency graph), `lint-system` (custom linter internals), `hooks-system` (post-edit format+lint).

## Root pnpm scripts (`package.json`)

- **`dev`** → `turbo dev` (persistent, interruptible, depends on `^build`).
- **`build`** → `turbo build` (depends on `^build`; outputs `dist/**`, `build/**`, `.svelte-kit/**`; inputs strip `*.test.*`/`*.spec.*`/`*.bench.*` for cache hits).
- **`clean`** → `turbo clean` (cache: false, no outputs).
- **`qa:test`** → `turbo qa:test --filter='!./packages/shared/utils/cli'` — `@/cli` runs its OWN vitest config (excluded from root projects).
- **`qa:test:unit`** → `vitest run` (root config, all 24 projects).
- **`qa:test:e2e`** → `turbo qa:test:e2e` (cache: false; only `@storylyne/editor` defines a Playwright suite).
- **`qa:test:coverage`** → `vitest run --coverage` (root config, all 24 projects). Coverage thresholds: statements 90%, branches 78%, functions 91%, lines 90% (defined in root `vitest.config.ts`).
- **`qa:benchmark`** → `vitest bench` (root config).
- **`qa:format`** → `biome format --write .` AND `prettier --write --cache --cache-strategy content '**/*.svelte'`. Biome handles TS/JS/JSON/CSS/HTML/MD/MDX/GraphQL; Prettier handles ONLY Svelte (because Biome can't parse Svelte).
- **`qa:format:check`** → same split, read-only.
- **`qa:hooks`** → `bash .claude/hooks/hooks.test.sh && mkdir -p node_modules/.cache && touch node_modules/.cache/.resist-hooks-stamp` — runs `hooks-system` integration tests, stamps cache.
- **`qa:hooks:cached`** → bash one-liner: skip if stamp exists AND no `.claude/hooks/*` file is newer than the stamp; otherwise re-run `qa:hooks`.
- **`qa:lint`** → `node --import packages/shared/config/tooling/node/src/register-aliases.mjs packages/shared/config/tooling/lint/src/cli.ts --tools "$@"; L=$?; if [ $# -eq 0 ]; then pnpm run qa:hooks:cached; H=$?; else H=0; fi; exit $((L || H))`. Reads from stdin via `register-aliases.mjs` (Node `--import` registers `@/` path aliases for the linter's own runtime). When invoked with NO args runs hooks-cached; when scoped (`pnpm -w run qa:lint <path>`), skips hooks. Exit code is `lint || hooks`.

## Per-package pnpm scripts (representative)

Pattern: every package's `qa:test` is `pnpm -w exec vitest run --project <name>` (or multiple `--project` flags). Coverage variant adds `--coverage`.

- **`@storylyne/editor`**:
  - `prepare` / `svelte-kit:sync` → `svelte-kit sync`.
  - `dev` → `NODE_OPTIONS='--enable-source-maps' vite dev`.
  - `prebuild` → runs `generate-icons.sh` from `@/cli/tools/generate-icons` (composed in CLI but invoked here as a shell script).
  - `build` / `preview` → `vite build` / `vite preview`.
  - `clean` → `rm -rf .svelte-kit dist`.
  - `qa:test` → `pnpm -w exec vitest run --project storylyne-editor --project storylyne-editor-server` (jsdom + node split).
  - `qa:test:e2e` → `playwright test`.
  - `qa:benchmark` → `pnpm -w exec vitest bench --project storylyne-editor`.
- **`@/utils/core`**: `qa:test` → `pnpm -w exec vitest run --project utils-core`.
- **`@/ui`**: `qa:test` → `pnpm -w exec vitest run --project ui --project ui-svelte` (node + jsdom split).
- **`@/lint`**: `qa:test` → `pnpm -w exec vitest run --project lint`.

## Turbo task graph (`turbo.json`)

```
build:              dependsOn: [^build]
                    inputs:    [$TURBO_DEFAULT$, !src/**/*.test.*, !src/**/*.spec.*, !src/**/*.bench.*]
                    outputs:   [dist/**, build/**, .svelte-kit/**]
clean:              cache: false
dev:                dependsOn: [^build], persistent: true, interruptible: true, cache: false
preview:            dependsOn: [build], persistent: true, interruptible: true, cache: false
qa:benchmark:       dependsOn: [^build], cache: false
qa:checks:          inputs: [$TURBO_DEFAULT$], outputs: []
//#qa:hooks:        inputs: [.claude/hooks/**, .claude/settings.json, CLAUDE.md], cache: false
//#qa:format:       inputs: [$TURBO_DEFAULT$], cache: false
//#qa:format:check: inputs: [$TURBO_DEFAULT$]
svelte-kit:sync:    inputs: [svelte.config.*, src/**/*.svelte]
                    outputs: [.svelte-kit/**]
qa:test:            dependsOn: [^build, svelte-kit:sync]
                    inputs:    [$TURBO_DEFAULT$]
qa:test:e2e:        dependsOn: [build], cache: false
qa:test:coverage:   dependsOn: [^build], outputs: [coverage/**]
qa:test:unit:       dependsOn: [^build]

globalDependencies:    [tsconfig.json]
globalPassThroughEnv:  [NODE_ENV, CI, VITE_*, PUBLIC_*, PLAYWRIGHT_*]
ui: tui
```

`//#` prefix marks "root-only" turbo tasks (no per-package variants). `qa:test^build+svelte-kit:sync` is the critical chain — Svelte components compile to TypeScript artifacts via `svelte-kit sync` before vitest projects can run their type-aware tests.

## Vitest configuration (`vitest.config.ts`)

Single root config defines **24 projects** (`extends: true` inherits root settings):

| Project | Root | Environment | Notes |
|---------|------|-------------|-------|
| `schemas-common` | `packages/shared/schemas/common` | node | |
| `schemas-result` | `packages/shared/schemas/result` | node | |
| `schemas-function` | `packages/shared/schemas/function` | node | |
| `schemas-generic` | `packages/shared/schemas/generic` | node | |
| `schemas-template-literal` | `packages/shared/schemas/template-literal` | node | |
| `utils-result` | `packages/shared/utils/result` | node | |
| `utils-core` | `packages/shared/utils/core` | node | + define `__APP_VERSION__`, `__GIT_*`, `__BUILD_TIMESTAMP__` |
| `utils-beacon` | `packages/shared/utils/beacon` | node | |
| `utils-web-vitals` | `packages/shared/utils/web-vitals` | jsdom | + svelte plugin |
| `utils-devtools` | `packages/shared/utils/devtools` | jsdom | + svelte plugin + define globals |
| `locale` | `packages/shared/locale` | node | excludes `*.svelte.test.ts` |
| `locale-svelte` | `packages/shared/locale` | jsdom | + svelte plugin; only `*.svelte.test.ts` |
| `ui` | `packages/shared/ui` | node | excludes `*.svelte.test.ts` |
| `ui-svelte` | `packages/shared/ui` | jsdom | + svelte plugin + svelteTesting; deps inlined for `@lucide/svelte`, `bits-ui`, `mode-watcher`, `runed`, `svelte-toolbelt`; uses `sharedPathAliases` (explicit `@/` mappings since vite-tsconfig-paths can't resolve `@/` from Svelte-compiled JS) |
| `config-core` | `packages/shared/config/core` | node | |
| `schemas-core-config` | `packages/shared/schemas/core-config` | node | |
| `test-presets` | `packages/shared/config/test` | node | |
| `config-tooling-vite` | `packages/shared/config/tooling/vite` | node | |
| `config-tooling-svelte` | `packages/shared/config/tooling/svelte` | node | |
| `secrets-infisical` | `packages/shared/secrets/infisical` | node | |
| `lint` | `packages/shared/config/tooling/lint` | node | `pool: 'threads'` (rest use `forks`) |
| `config-tooling-vscode` | `packages/shared/config/tooling/vscode` | node | `globals: true`; alias `vscode` → `__mocks__/vscode.ts` |
| `storylyne-editor` | `packages/products/storylyne/editor` | jsdom | `globals: true`; setupFiles `test-setup-component.ts`; aliases `$lib`, `$app/{environment,navigation,state}` to `test-mocks/`; deps inlined for `@lucide/svelte`/`bits-ui`/`mode-watcher`/`runed`/`svelte-toolbelt`; + svelte+svelteTesting plugins; + define globals |
| `storylyne-editor-server` | `packages/products/storylyne/editor` | node | only `src/routes/**/server.test.ts` and `*.server.test.ts`; same aliases as storylyne-editor; no svelte plugin |

Root settings:
- `pool: 'forks'` (lint overrides to `threads`).
- `restoreMocks: true`, `isolate: true`, `passWithNoTests: true`.
- `bail: 0`, `retry: 0`, `testTimeout: 10_000`, `hookTimeout: 10_000`.
- `include: ['src/**/*.test.ts']`.
- Coverage: `provider: 'v8'`, `reporter: ['text-summary', 'json', 'html']`, thresholds 90/78/91/90, `skipFull: true`, `reportOnFailure: true`.
- Reporters: `['default', 'json']`; `outputFile.json: 'coverage/test-results.json'`.
- `define` injects `__APP_VERSION__`, `__GIT_COMMIT__`, `__GIT_COMMIT_FULL__`, `__GIT_BRANCH__`, `__GIT_DIRTY__`, `__BUILD_TIMESTAMP__` (mirrored by Vite at build time).

`tsconfigPaths` plugin skips dirs `_INTEGRATE`, `node_modules`, `.git`, `dist`, `.svelte-kit`.

`sharedPathAliases` (explicit array used by Svelte-test projects): order is specific exact paths → slash-suffixed prefixes → bare entrypoints. Mirrors root tsconfig but compensates for vite-tsconfig-paths not resolving `@/` value imports from Svelte-compiled output.

## E2E (`@storylyne/editor`)

`playwright.config.ts` is consumed by `pnpm --filter @storylyne/editor run qa:test:e2e` (which is `playwright test`). Routed through turbo via `qa:test:e2e` task (`dependsOn: [build]`, `cache: false`).

25 suites in `e2e/` exercising: accessibility, dev-toolbar, error-pages, feature-flags, head-meta, header-user, hydration-flash, icons, keyboard-navigation, language-switcher, layout, locale, manifest, nav-scenes, project-user-data, robots-txt, security-headers, security-txt, sidebar (+ collapsed/mobile variants), subscription-plan, theme-mode, theme-switcher, tooltips, vitals.

## Lint pipeline

```
pnpm -w run qa:lint [path]
  └─ node --import register-aliases.mjs lint/src/cli.ts --tools <args>
       └─ src/cli.ts (bin: resist-lint)
            └─ src/cli-helpers.ts
                 ├─ collectFiles / collectPackageJsonFiles / getPackageMap
                 ├─ runPkgRules (PackageJsonRule)
                 ├─ runLinter ─→ framework/tool-orchestrator.ts (ToolRegistry)
                 │     ├─ ExternalTool wrappers (115 in src/tools/) — ruff, shellcheck, knip, oxlint, tsgo, svelte-check, …
                 │     └─ TypeScriptRule visitors (632 in src/rules/) via framework/oxc-runner.ts walkNode
                 ├─ framework/worker-pool.ts (parallelism)
                 ├─ framework/cache.ts (LintCache, .resist-lint-cache.json, fingerprint = path|mtime|size)
                 └─ framework/formatters.ts (text/json/compact/sarif/github/junit)
       └─ exit code = (lint || hooks-cached)
```

Path aliases for the linter's own runtime: `packages/shared/config/tooling/node/src/register-aliases.mjs` is loaded via Node's `--import` flag. Without it, the linter can't resolve its own internal `@/` imports.

Cache: `.resist-lint-cache.json` at repo root. Per-edit lint reuses cached entries when `(path, mtime, size)` fingerprint matches. `pre-qa-commands.sh` enforces a 120s cooldown between full `qa:lint` runs (override: `touch .claude/approved-relint`, which also wipes the cache so stale data can't leak).

## Format pipeline (split rationale)

Two formatters because Biome can't parse Svelte:
- **Biome** (`biome.jsonc` at repo root): TS, JS, JSX, TSX, JSON, JSONC, CSS, HTML, GraphQL, MD, MDX. Modern, fast, native-Rust binary.
- **Prettier** (with `prettier-plugin-svelte`): ONLY Svelte files (`'**/*.svelte'`). Has `--cache --cache-strategy content` for incremental runs; `--log-level warn` to keep output quiet.

`oxlint` (`@/lint`'s `oxlintTool` wrapper) runs separately via the linter pipeline; it consumes `.oxlintrc.json` at repo root.

The `post-edit-format-lint.sh` PostToolUse hook calls these binaries DIRECTLY (`./node_modules/.bin/biome` and `./node_modules/.bin/prettier`), not via pnpm exec — saves ~500ms per Edit/Write call.

## CI

**No `.github/workflows/` directory exists at this snapshot.** This repo is private and has no GitHub Actions configured. CI gating happens locally via `pnpm qa:test`, `pnpm qa:test:e2e`, `pnpm qa:lint`, `pnpm qa:format:check`, `pnpm qa:hooks`. The `globalPassThroughEnv: [..., CI, ...]` in `turbo.json` is forward-looking — turbo will tag cache entries as CI-aware once a workflow exists. The `pre-destructive-git.sh` hook also blocks `git push --force` to remote — there's no separate CI-side guard.

## Summary tree

```
qa:hooks            ←  qa:hooks:cached  ←  qa:lint
                                              └─ register-aliases.mjs → cli.ts → orchestrator → 632 rules + 115 tools

qa:format           ←  biome (TS/JS/JSON/CSS/MD) + prettier (Svelte only)
qa:format:check     ←  biome --check + prettier --check

qa:test             ←  turbo qa:test (filter !@/cli)
                         └─ depends ^build + svelte-kit:sync
                         └─ vitest projects per package (24 total in root config)
qa:test:unit        ←  root vitest run (all projects)
qa:test:coverage    ←  root vitest --coverage (90/78/91/90 thresholds)
qa:test:e2e         ←  turbo qa:test:e2e
                         └─ playwright test (storylyne only)
qa:benchmark        ←  vitest bench
```
