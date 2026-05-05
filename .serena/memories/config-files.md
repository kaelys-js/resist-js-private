# Configuration Files — webforge / resist-js-private

> Captured 2026-05-05 from direct file reads. Branch: `main`.
> Companion to `monorepo-architecture` and `monorepo-architecture-uncovered`.
> 
> **Companion memory: `config-core-overview`** — the `@/config` package itself (loader, defaults, `defineConfig`/`defineProductConfig`/`getConfig`/`setConfig`/`loadConfig` API). This memory (`config-files`) describes the *config files on disk* (`tsconfig.json`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.jsonc`, `vitest.config.ts`, `.resist-lint.jsonc`, `.npmrc`, etc.) and per-package `svelte.config.ts`/`vite.config.ts`/`wrangler.jsonc`. No overlap — `config-core-overview` is the package API; `config-files` is the file inventory. The `@/config` loader (covered by `config-core-overview`) is what reads `resist.config.ts` (a file covered by `config-files`).

This memory documents every config file that shapes the build/test/lint pipeline. Source-of-truth references include line numbers where helpful.

## Root configs

### `tsconfig.json` (the canonical source of every package alias)

- **Strictness**: `strict: true`, `noUncheckedIndexedAccess: true`, `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`, `noPropertyAccessFromIndexSignature: false`, `forceConsistentCasingInFileNames: true`.
- **Target**: `ES2024`, `module: ESNext`, `moduleResolution: "bundler"` — required by SvelteKit/Vite/Tailwind v4.
- **Critical TS flags**:
  - `allowImportingTsExtensions: true` — but most aliases drop `.ts` (the SvelteKit factory strips it for `kit.alias`, see `buildAliasesFromTsconfig` in `packages/shared/config/tooling/svelte/src/index.ts:247`).
  - `verbatimModuleSyntax: true` — forces `import type` / `export type` everywhere.
  - `isolatedModules: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`, `noEmit: true` (turbo handles emit).
- **Path aliases** (`compilerOptions.paths`): authoritative source for every `@/...` import. Three patterns:
  1. Bare entry: `"@/utils/core": ["./packages/shared/utils/core/src/index.ts"]`
  2. Wildcard: `"@/utils/core/*": ["./packages/shared/utils/core/src/*.ts"]`
  3. Special-case files: `"@/locale/svelte"` → `svelte.svelte.ts`, `"@/config/tooling/vite/lazy-plugin"`, `"@/config/tooling/vite/template-html"`.
- **Excludes**: `["node_modules", "dist", ".svelte-kit", "_INTEGRATE"]`. `_INTEGRATE/` is the scratch dir for external code being adapted; never explore it for the workspace.
- **No `include` field** at root — TS picks up files via project references / per-package tsconfigs that extend it transitively.

### `package.json` (root)

- `webforge`, `private: true`, `type: "module"`, `packageManager: pnpm@10.30.2`, `engines.node: ">=25"`.
- `pnpm.onlyBuiltDependencies`: `["@biomejs/biome", "esbuild", "workerd"]` — only these allowed to run install scripts.
- **Scripts** (key ones):
  - `dev` / `build` / `clean` — turbo passthrough.
  - `qa:test` — `turbo qa:test --filter='!./packages/shared/utils/cli'` (CLI runs its own vitest).
  - `qa:test:unit` — direct `vitest run` (no turbo).
  - `qa:test:coverage` — `vitest run --coverage` (90/78/91/90 thresholds).
  - `qa:format` — biome (everything except `*.svelte`) + prettier (only `*.svelte`).
  - `qa:lint` — runs `@/lint` CLI under `node --import register-aliases.mjs`, then `qa:hooks:cached`. Per-shell wrapper: invokes lint with stdin args, captures exit code, then runs hooks if no args.
  - `qa:hooks` — runs `bash .claude/hooks/hooks.test.sh` and stamps `node_modules/.cache/.resist-hooks-stamp`.
  - `qa:hooks:cached` — only re-runs `qa:hooks` if hooks files have changed since stamp.
- **Volta pin**: `node: "24.14.0"` (Volta uses this; mise/pnpm use the engines field).
- Has `@/lint: "workspace:*"` as devDep so the root can invoke the linter via tsx.

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/**'
```

That's it. Every workspace package lives under `packages/**`.

### `turbo.json`

- `globalDependencies: ["tsconfig.json"]` — every task is invalidated when root tsconfig changes.
- `globalPassThroughEnv: ["NODE_ENV", "CI", "VITE_*", "PUBLIC_*", "PLAYWRIGHT_*"]` — only these env-vars cross the cache boundary (any other env var changes don't invalidate cache).
- `ui: "tui"` (interactive terminal output during multi-task runs).
- **Task graph**:
  - `build`: depends on `^build` (upstream packages first), inputs strip `*.test.*`/`*.spec.*`/`*.bench.*`, outputs `dist/**`/`build/**`/`.svelte-kit/**`.
  - `dev`: depends on `^build`, `cache: false`, `persistent: true`, `interruptible: true`.
  - `preview`: same pattern as dev but builds first.
  - `qa:test`: depends on `^build` AND `svelte-kit:sync` — the implicit svelte-kit type generation.
  - `qa:test:e2e`: depends on `build`, `cache: false`.
  - `qa:test:coverage`: depends on `^build`, outputs `coverage/**`.
  - `svelte-kit:sync`: own task, runs `svelte-kit sync`, outputs `.svelte-kit/**`.
  - `//#qa:hooks` / `//#qa:format` / `//#qa:format:check` — root-only tasks (`//#` prefix means run only at workspace root, never per-package).

### `biome.jsonc`

- **Linter is DISABLED** (`linter.enabled: false`). All TS/JS linting is done by `@/lint` (oxlint + custom rules).
- **Formatter ONLY for non-Svelte files** (Svelte uses Prettier — see `qa:format` script).
- `vcs.enabled: false` (we don't drive Biome from git).
- `files.includes`: massive exclude list (`!**/_INTEGRATE/**`, `!**/.agents/**`, `!**/.claude/**`, `!**/app.css`, `!**/*.svelte`, `!**/svelte.d.ts`, etc.). `app.css` is excluded because it's a Tailwind v4 file with custom property syntax Biome can't format.
- `assist.actions.source.organizeImports: "on"` + `useSortedKeys: "on"` + `useSortedAttributes: "on"` — auto-sorts on save.
- Format: 100-col line, 2-space indent, single quotes, trailing commas all, semicolons always.
- Per-file overrides:
  - `*.jsonc`/`tsconfig.json`/`biome.json[c]`: allow comments + trailing commas in JSON parser.
  - `package.json`: lineWidth 1 (one-key-per-line — keeps diffs minimal).

### `vitest.config.ts` (CRITICAL — single root config with 24 projects)

- **Top-level test config**: `environment: 'node'`, `globals: false`, `restoreMocks: true`, `isolate: true`, `pool: 'forks'`, `passWithNoTests: true`, `testTimeout: 10_000`, `hookTimeout: 10_000`.
- **Coverage**: v8, `include: ['src/**/*.ts']`, excludes test/spec/bench/d.ts, thresholds `statements: 90, branches: 78, functions: 91, lines: 90`. Reports to `coverage/`. JSON output to `coverage/test-results.json`.
- **Plugins**: `tsconfigPaths({ skip: dir => TSCONFIG_SKIP_DIRS.has(dir) })` (skips `_INTEGRATE`, `node_modules`, `.git`, `dist`, `.svelte-kit`).
- **`sharedPathAliases`** (vitest.config.ts:17): explicit `@/*` → real path mappings for Svelte test compile output. **Why**: `vite-tsconfig-paths` doesn't resolve `@/` value-imports from compiled Svelte output; these aliases mirror the tsconfig paths so Vite's resolver can handle extension mapping after prefix substitution. Used by `ui-svelte`, `storylyne-editor`, `storylyne-editor-server` projects.
- **Source-injected globals** via `define` (mirrors what Vite injects in production):
  - `__APP_VERSION__`: `"0.0.0-test"`
  - `__GIT_COMMIT__`: `"abc1234"`
  - `__GIT_COMMIT_FULL__`: `"abc1234def5678901234567890abcdef12345678"`
  - `__GIT_BRANCH__`: `"test-branch"`
  - `__GIT_DIRTY__`: `false` (raw boolean, not stringified)
  - `__BUILD_TIMESTAMP__`: `"2026-01-01T00:00:00.000Z"`
  - Set on these projects: `utils-core`, `utils-devtools`, `storylyne-editor`, `storylyne-editor-server`.
- **24 vitest projects**:
  - `schemas-common`, `schemas-result`, `schemas-function`, `schemas-generic`, `schemas-template-literal`
  - `utils-result`, `utils-core`, `utils-beacon`, `utils-web-vitals` (jsdom + svelte), `utils-devtools` (jsdom + svelte)
  - `locale` (node), `locale-svelte` (jsdom + svelte, runs `*.svelte.test.ts`)
  - `ui` (node), `ui-svelte` (jsdom + svelte + svelteTesting, runs `*.svelte.test.ts`, server.deps.inline = `['svelte']`, uses `sharedPathAliases`)
  - `config-core`, `schemas-core-config`, `test-presets`, `config-tooling-vite`, `config-tooling-svelte`
  - `secrets-infisical`
  - `lint` (`pool: 'threads'` — overrides default `forks` for performance with worker pool)
  - `config-tooling-vscode` (`globals: true`, includes `scripts/**/*.test.ts`, aliases `vscode` → `src/__mocks__/vscode.ts`)
  - `storylyne-editor` (jsdom + svelte + svelteTesting, `globals: true`, setupFile `./src/test-setup-component.ts`, aliases `$lib` + `$app/*` to test-mocks + `sharedPathAliases`, server.deps.inline = `['@lucide/svelte', 'bits-ui', 'mode-watcher', 'runed', 'svelte-toolbelt']`, excludes `e2e/**` and `*.server.test.ts`)
  - `storylyne-editor-server` (node, includes only `**/server.test.ts` / `*.server.test.ts`, same aliases as `storylyne-editor` but no svelte plugin)
- `@/cli` is **NOT** a vitest project — it has its own `vitest.config.ts` and is excluded from root `qa:test` via `--filter='!./packages/shared/utils/cli'`.

### `.resist-lint.jsonc` (the linter config, schema at `.resist-lint.schema.json`)

- `include: ["packages"]` — lint only the packages tree.
- `exclude`: `node_modules`, `.git`, `.svelte-kit`, `.svelte-check`, `dist`, `build`, `coverage`, `.turbo`, `_INTEGRATE`, `__mocks__`, `packages/shared/utils/cli` (CLI lints itself).
- `extensions: [".ts", ".svelte.ts", ".svelte", ".astro", ".html", ".vue", ".md", ".mdx", ".mjs"]`.
- **Rules** (~200+ entries, mostly `"error"` with selective `"off"`):
  - All 18 categories from `monorepo-architecture` are present.
  - Notable categories that are mostly off: `complexity/*` (most rules off, only `array-size-warning` + `no-array-method-in-loop` on), `imports/*` (all off — handled by Biome organize-imports), `naming/*` (all off — Biome handles), `hygiene/*` (most off), `primitives/*` (most off).
  - Rules that ARE on: most of `comments/*`, `directives/*` (no-eslint-disable, no-biome-ignore, no-prettier-ignore, etc.), `jsdoc/*` (require-jsdoc, require-module, require-param, require-returns), `package/*` (entire category — names-valid, no-git-deps, no-peer-deps, etc.), `plans/*` (entire category — files-exist, no-incomplete-tasks, status-dependency-order).
- Full JSON schema at `.resist-lint.schema.json` (393K, generated from `LintConfigSchema`).
- Cache file: `.resist-lint-cache.json` — git-ignored.

### `.npmrc`

- `auto-install-peers=true`, `strict-peer-dependencies=false`.
- `public-hoist-pattern[]=valibot` — Valibot must be hoisted to root `node_modules` for type augmentation to work across packages.
- `node-options="--import data:..."` — inline data: URL that imports `register-aliases.mjs` from the workspace root. This wires up the `@/...` aliases for any `node` invocation that respects `.npmrc` (CI, scripts, etc.). The wrapper walks up from `process.cwd()` looking for `pnpm-workspace.yaml`.

### `.editorconfig`

Tab indent for non-YAML/MD; LF; UTF-8; final newline. (Note: project actually uses 2-space indent in TS via Biome, despite this saying `indent_style = tab` — Biome's `indentStyle: "space"` wins for files Biome formats.)

### `.prettierrc.json` + `.prettierignore`

- Prettier ONLY runs against `*.svelte` (see `qa:format` script). Config: 100-col, 2-space, single quotes, trailing commas all, plugin `prettier-plugin-svelte`.
- Ignore: `node_modules`, `dist`, `.svelte-kit`, `_INTEGRATE`.

### `.eslintignore`

Stale file — ESLint isn't actually configured anywhere. Contains only `packages/products/storylyne/runtime/dev/` (which doesn't exist in the current tree).

### `.gitignore`

Standard list plus:
- `.env`, `.env.*` ignored EXCEPT `.env.example`.
- `.claude/*` blanket-ignored EXCEPT `.claude/settings.json`, `.claude/hooks/`, `.claude/scripts/`, `.claude/lint-baseline.json`, `.claude/skills/{fix-bug,code-rules,qa-commands,visual-verification,build-editor,expand-feature}/`.
- `.worktrees/`, `.playwright-mcp`, `test-results/`, `branding-git-exclude`.
- `.cocoindex_code/` (cocoindex search index).

### `webforge.code-workspace`

VSCode multi-root workspace file. Tiny (~100 bytes); just lists the root path. Open via `code webforge.code-workspace`.

### `.mcp.json`

MCP server registry for the project (Serena, cocoindex, playwright, context7). Untracked → personal config.

## Per-package config patterns

### Per-package `tsconfig.json` (SvelteKit apps only)

Both SvelteKit apps (`@storylyne/editor`, `@{product}/app`) extend `./.svelte-kit/tsconfig.json` (auto-generated by `svelte-kit sync`):

```jsonc
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true, "checkJs": true,
    "esModuleInterop": true, "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true, "skipLibCheck": true, "sourceMap": true,
    "strict": true, "moduleResolution": "bundler",
    "allowImportingTsExtensions": true, "noEmit": true
    // Storylyne also has:  "types": ["@cloudflare/workers-types"]
  }
}
```

The `@cloudflare/workers-types` is what gives `App.Platform.env: ProductSecrets` typing inside Storylyne route handlers.

**Other shared packages don't have their own tsconfig** — they inherit from root via the alias system + per-vitest-project `root` setting.

Notable exceptions (have own `tsconfig.json` for build):
- `packages/shared/config/tooling/vscode/tsconfig.json` — needed for `tsgo -p ./` build to `dist/`.
- `packages/shared/utils/cli/tsconfig.json` — needed because cli is published.

### `packages/products/storylyne/editor/svelte.config.ts`

```ts
import adapter from '@sveltejs/adapter-cloudflare';
import { createSvelteConfig } from '@/config/tooling/svelte';
const config: Config = createSvelteConfig({
  adapter: adapter({ platformProxy: { persist: true } }),
});
```
Whole file is 24 lines. Everything else (alias sync, CSP, git versioning, vitePreprocess, template paths) comes from `createSvelteConfig`.

### `packages/products/storylyne/editor/vite.config.ts`

```ts
export default createViteConfig({
  plugins: [
    templateAppHtml({ appName: APP_NAME, templatePath: TEMPLATE_PATHS.appHtml, storagePrefix: STORAGE_PREFIX }),
    templateErrorHtml({ appName: APP_NAME, fontFamilies: FONT_FAMILIES, fontFaces: [...FONT_FACES], locale: en.errors, templatePath: TEMPLATE_PATHS.errorHtml }),
    tailwindcss(),
    createLazyPlugin({ name: 'lens-preview-ws', modulePath: './src/lib/server/preview/vite-plugin-preview-ws.ts', setupFn: 'setupPreviewWs' }),
    sveltekit(),
    devtoolsJson(),
  ],
});
```
Notes:
- `templateAppHtml` and `templateErrorHtml` resolve `{{APP_NAME}}`, `{{STORAGE_PREFIX}}`, `{{FONT_FAMILIES}}`, `{{FONT_FACE_CSS}}`, and locale strings (e.g., `{{errors.serverError}}`) at build time inside the shared HTML templates at `packages/shared/config/tooling/svelte/src/templates/{app.html,error.html}`.
- `createLazyPlugin` defers loading the preview WS plugin (which requires Node-only modules) until needed.
- `devtoolsJson()` adds the Vite devtools workspace integration.
- `src/app.html` is a **0-byte file** in storylyne — content comes entirely from the shared template, which is what `createSvelteConfig` points `kit.files.appTemplate` at.

### `packages/products/storylyne/editor/wrangler.jsonc` (Cloudflare adapter config — NOT TOML, JSONC)

```jsonc
{
  "name": "storylyne-editor",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "compatibility_date": "2026-03-01",
  "compatibility_flags": ["nodejs_compat_v2"],
  "assets": { "binding": "ASSETS", "directory": ".svelte-kit/cloudflare" },
  "observability": { "enabled": true, "head_sampling_rate": 1.0 }
}
```

- **`nodejs_compat_v2`**: required by SvelteKit's adapter for Node API polyfills.
- **`assets` binding**: serves the static SvelteKit output as Worker assets (image/font/CSS/JS).
- **`observability.enabled: true`** + `head_sampling_rate: 1.0`: every console.log/error becomes a structured event in Workers Logs. Forward externally via Logpush in the Cloudflare dashboard (Workers & Pages → worker → Logs → Add Logpush destination).
- **NO bindings declared yet**: no D1, KV, R2, Durable Objects, AI, Queues, Vectorize, mTLS, or service bindings. The `App.Platform.env` shape is currently empty — `createDataService(event.platform)` returns the mock service unconditionally because there's nothing to discriminate on.
- **NO env hierarchy** declared (`env.production`, `env.preview`). The `workspace/validate-wrangler-environments` lint rule allows ONLY `production` and `preview` — `staging` and other names are rejected.
- **Security headers** are not in wrangler — they're applied in `src/hooks.server.ts` (`BASE_HEADERS` + `PROD_HEADERS` array). CSP only in production via `createSvelteConfig`.

### `packages/products/storylyne/editor/playwright.config.ts`

3 lines: `import { createPlaywrightConfig } from '@/test-presets/playwright'; export default createPlaywrightConfig({} as ...);`. The preset (in `@/test-presets`) handles everything.

### `packages/products/storylyne/editor/components.json` (shadcn-svelte)

```json
{
  "tailwind": { "css": "src/app.css", "baseColor": "neutral" },
  "aliases": {
    "components": "$lib/components",
    "utils": "$lib/utils",
    "ui": "$lib/../../../../../shared/ui/src",
    "hooks": "$lib/hooks",
    "lib": "$lib"
  },
  "typescript": true,
  "registry": "https://shadcn-svelte.com/registry"
}
```
Note the relative-path `ui` alias — shadcn CLI uses this when adding new components. Real imports use the `@/ui/*` tsconfig path, not this relative one.

### `packages/products-template/app/svelte.config.ts`

Static adapter, otherwise identical pattern:
```ts
adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html', precompress: false, strict: true })
```

### `packages/products-template/app/vite.config.ts`

Trivial: `createViteConfig({ plugins: [sveltekit()] })`. No tailwind, no template-html, no preview WS.

### `packages/products-template/app/capacitor.config.ts`

```ts
{ appId: 'app.{product}', appName: '{product}', webDir: 'build', server: { androidScheme: 'https' } }
```
The `{product}` literal is a placeholder for the scaffolding tool to substitute when bootstrapping a new product.

### `packages/products-template/app/fastlane/Fastfile`

Stub fastlane lanes for iOS (TestFlight) and Android (Play Store internal testing). All lanes contain only TODO comments — no `build_app`/`upload_to_testflight` or gradle `assembleRelease` wired up.

### `packages/shared/config/tooling/vscode/package.json`

Extension manifest (publisher: `resist`, name: `@resist/vscode`, displayName: `Resist Tooling`). 25+ commands (all under `resist.lint.*` and `resist.panel.*`). 22 configuration properties under `resist.lint.*` (enable, onSave, onType, onOpen, debounceMs, maxProblems, stage, categories, args, cache, quiet, debug, severityOverride, rule, ignorePatterns, jobs, tools, locale, bail, fixOnSave, codeLens, formatOnSave, staleDiagnosticTimeoutMs). Build: `tsx scripts/generate-manifest.ts --fix && tsgo -p ./`. Package: `vsce package --no-dependencies` → `.vsix`. Publishing: `vscode:prepublish` runs `pnpm build`. Local install: `dev:local` builds + packages + `code --install-extension *.vsix`.

## Source-injected build globals

Declared in `packages/shared/utils/core/src/build-globals.d.ts` (type-only). At runtime, set by:
- **Vite/SvelteKit production**: `createViteConfig` (in `packages/shared/config/tooling/vite/src/index.ts:147-154`) reads git via `getGitInfo()` + package version via `getPackageVersion('./package.json')` + `new Date().toISOString()`, and sets all 6 globals via `define`.
- **Vitest test**: hardcoded values in `vitest.config.ts:193-200` etc.
- **Per-product custom defines**: `extraDefines` parameter on `createViteConfig`, e.g., `{ __CUSTOM_FLAG__: '"true"' }` (no products use this currently).

The 6 globals: `__APP_VERSION__`, `__GIT_COMMIT__`, `__GIT_COMMIT_FULL__`, `__GIT_BRANCH__`, `__GIT_DIRTY__`, `__BUILD_TIMESTAMP__`. Used in `src/hooks.{client,server}.ts`'s `setupGlobalErrorHandling({ release: __APP_VERSION__, serverName: __GIT_COMMIT__, tags: { branch: __GIT_BRANCH__, side: 'client'|'server' } })` and `response.headers.set('X-App-Version'/'X-Git-Commit', ...)`.

## Templates (build-time placeholder resolution)

Lives at `packages/shared/config/tooling/svelte/src/templates/`:
- `app.html` (41 lines) — placeholders: `%lang%` (set by hooks.server transformPageChunk), `%dir%`, `data-theme=""`, `data-sidebar-width=""` (cookie-resolved), `{{APP_NAME}}` (build-time), `{{STORAGE_PREFIX}}` (build-time). Inline script reads `localStorage[{{STORAGE_PREFIX}}:mode/theme/sidebar-px]` to prevent FOUC.
- `error.html` (450 lines) — fully self-contained static fallback when the SvelteKit rendering pipeline itself fails. Placeholders: `{{FONT_FACE_CSS}}`, `{{FONT_FAMILIES}}`, `{{APP_NAME}}`, `{{errors.serverError}}`, `{{errors.serverErrorDescription}}`, `{{errors.goHome}}`, `{{errors.copyErrorId}}`, `{{errors.errorIdPrefix}}`, `{{errors.copied}}`, `{{errors.copyFailed}}` (resolved at build time from `en.ts`). Includes inline SVG icons (lucide), accessibility (sr-only, ARIA), reduced-motion + forced-colors media queries, clipboard error-ID copy with legacy fallback. Cannot be localized at runtime — the localized error UI lives in `+error.svelte` / `ErrorPage.svelte`.

## What's NOT a config (don't look here)

- `_INTEGRATE/` — explicitly excluded from tsconfig. External code being adapted; not part of the workspace.
- `coverage/` — vitest output.
- `.turbo/` — turbo cache.
- `.svelte-kit/` — generated by `svelte-kit sync`.
- `.svelte-check/` — generated by `svelte-check`.
- `webforge.code-workspace` — VS Code multi-root file (just paths, no settings).
- `.cocoindex_code/` — local search index.

## Critical relationships

1. **Adding a new package**: requires (a) entry in root `tsconfig.json` `paths`, (b) optionally entry in `vitest.config.ts` `projects` if it has tests, (c) optionally entry in `vitest.config.ts` `sharedPathAliases` if it's imported by a Svelte-test project.
2. **Adding a vite define**: must be added in BOTH `packages/shared/config/tooling/vite/src/index.ts` (for production) AND `vitest.config.ts` `define` (for tests, on each project that uses it). Type declaration in `packages/shared/utils/core/src/build-globals.d.ts`.
3. **Linting a new file extension**: add to `.resist-lint.jsonc` `extensions`. Per-rule scope (file pattern) is set in the rule definition itself, not in the config.
4. **Adding a new turbo task**: define in `turbo.json` AND ensure each consuming package has a script with that name in their `package.json`. Use `//#task-name` for root-only tasks.
5. **Cloudflare Worker bindings**: would go in `wrangler.jsonc` AND need typing in `src/app.d.ts` (`App.Platform.env`) AND need to be added to a secret schema in `@/schemas/core-config/secret-schemas.ts`.
