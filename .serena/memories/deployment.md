# Deployment — webforge / resist-js-private

> Captured 2026-05-05. Branch: `main`. Companion to `config-files`.

The monorepo ships several deliverables, each with its own deployment target. This memory documents how each gets from source to production (or as far as the current code goes).

## Storylyne editor — Cloudflare Workers

**Package**: `@storylyne/editor` (`packages/products/storylyne/editor/`)

### Build pipeline

1. `pnpm build` → `turbo build` → walks the package graph (depends on `^build`).
2. Per-package `build` script in `package.json`:
   - `prebuild`: runs `bash ../../../../packages/shared/utils/cli/src/tools/generate-icons/generate-icons.sh .` — generates the icons sprite/manifest from `branding/`.
   - `build`: `vite build` (which runs `sveltekit()` → `@sveltejs/adapter-cloudflare`).
3. Output: `.svelte-kit/cloudflare/_worker.js` + `.svelte-kit/cloudflare/` static assets.

### Cloudflare adapter setup

`packages/products/storylyne/editor/svelte.config.ts`:
```ts
adapter: adapter({
  platformProxy: { persist: true }
})
```
- `platformProxy.persist: true` — `wrangler dev` persists local D1/KV/etc. state between restarts (under `.wrangler/`).
- The shared `createSvelteConfig` factory (`packages/shared/config/tooling/svelte/src/index.ts`) handles aliases, CSP (production only), git versioning (`kit.version.name = gitCommit`), and vitePreprocess.

### Wrangler config — `wrangler.jsonc`

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

**What's configured:**
- Worker name: `storylyne-editor` (the eventual subdomain on `*.workers.dev`, or the route on a custom domain).
- `nodejs_compat_v2` flag — required for SvelteKit's adapter to use Node API polyfills (Buffer, Streams, etc.).
- `assets.binding: "ASSETS"` — exposes static SvelteKit output as a Worker asset binding.
- Observability: 100% sampling (every console.log → structured Workers Logs event).

**What's NOT configured (intentionally — these would unblock production data layer):**
- **No D1 database** binding — schemas exist (`ServerProject`, `ServerScene`, `ServerUser`) but no migrations or production DB.
- **No KV namespace** binding.
- **No R2 bucket** binding (no media/assets storage).
- **No Durable Objects**.
- **No Queues, Vectorize, AI, mTLS, or service bindings**.
- **No env hierarchy** (`env.production`, `env.preview`). The lint rule `workspace/validate-wrangler-environments` allows ONLY `production` and `preview` env names — `staging` is rejected (use top-level config instead). The current config has no env blocks at all → single deployment target.
- **No custom domain / route** declared in JSONC. Would be `routes` array or `*.workers.dev` default.
- **No Logpush destinations** — observability is local to Workers Logs only. To forward externally: Cloudflare dashboard → Workers & Pages → storylyne-editor → Logs → Add Logpush destination (R2/Datadog/Splunk/etc.).

### Runtime architecture

- **App.Platform** (typed in `src/app.d.ts`): provides `event.platform.env` (Worker env binding object — currently empty since no bindings) and `event.platform.ctx.waitUntil` (captured per-request in `hooks.server.ts:_waitUntil`).
- **Logging**: `setupLogging({ service: 'editor-server', initFromEnv: true, format: 'json' })` (hooks.server.ts:77). All `log.*` calls become structured JSON; Workers Logs captures stdout automatically.
- **Error pipeline**: `setupGlobalErrorHandling({ release: __APP_VERSION__, serverName: __GIT_COMMIT__, tags: { branch: __GIT_BRANCH__, side: 'server' } })` (hooks.server.ts:78-85). Routes server errors through `reportError()` → `logCapturedError()` → `log.error()` → Workers Logs.
- **Security headers** applied per-request in hooks.server.ts:47-58 + 60-63 (`BASE_HEADERS` + `PROD_HEADERS`). `dev` check excludes HSTS in dev. Build info headers `X-App-Version` + `X-Git-Commit` on every response.
- **CSP**: production-only via SvelteKit's CSP (configured in `createSvelteConfig` `PRODUCTION_CSP`). Hooks.server.ts:329-332 explicitly strips CSP headers in dev mode as a safety net (in case the dev server picks up a generated `internal.js` with CSP from a concurrent build).

### Local dev

- `pnpm --filter @/products/storylyne/editor dev` → `vite dev` (SvelteKit dev server via Vite, with Cloudflare's platformProxy emulating `event.platform`).
- Lens preview WebSocket plugin (`createLazyPlugin`) attaches to dev server's HTTP upgrade for live preview streaming.

### Deploy command (NOT in package.json yet)

There is no `deploy` script in `package.json`. The expected manual flow is:
1. `pnpm --filter @/products/storylyne/editor build`
2. `cd packages/products/storylyne/editor && wrangler deploy`

Wrangler is in `devDependencies` (`wrangler ^4.71.0`).

### Secrets to Workers

`packages/shared/utils/cli/src/tools/secrets/utils/sync.ts` defines `syncToWorkers(options)`:
- Checks `wrangler` is installed (`commandExists('wrangler')`).
- Fetches secrets from Infisical for the given environment.
- Pushes each via `wrangler secret put` (presumably via stdin to avoid shell-escaping).
- Supports `--dry-run`.
- Multi-environment sync.

This is invoked through the `@/cli` `secrets` tool (e.g., `pnpm tool secrets sync --env=production`). See `secrets-infisical-overview` memory for the broader Infisical model.

## products-template/app — Capacitor (iOS + Android)

**Package**: `@{product}/app` (`packages/products-template/app/`) — **template scaffolding, not a deployed product** (see `products-template-app` memory).

### Build pipeline

1. `pnpm build` → `vite build` → SvelteKit `adapter-static`.
2. Output: `build/` (static HTML/CSS/JS, fallback `index.html` for SPA mode).
3. `pnpm cap:sync` → `cap sync` — copies `build/` into native iOS/Android shells.

### Adapter

`packages/products-template/app/svelte.config.ts`:
```ts
adapter: adapter({
  pages: 'build', assets: 'build',
  fallback: 'index.html',
  precompress: false, strict: true,
})
```
Static SPA mode (every route falls back to `index.html` and renders client-side).

### Capacitor — `capacitor.config.ts`

```ts
{ appId: 'app.{product}', appName: '{product}', webDir: 'build', server: { androidScheme: 'https' } }
```
- `appId` and `appName` use `{product}` literal placeholder for tooling substitution.
- `webDir: 'build'` matches the SvelteKit static output directory.
- `androidScheme: 'https'` — Android WebView serves under `https://` (rather than `http://`) to enable secure-context APIs.

### Native shells

- **iOS**: `pnpm cap:ios` → `cap open ios` → opens `ios/` Xcode project (auto-created on first `cap sync`).
- **Android**: `pnpm cap:android` → `cap open android` → opens `android/` Android Studio project (auto-created on first `cap sync`).

Capacitor deps: `@capacitor/core ^6.0.0`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`.

### Fastlane — `fastlane/Fastfile` (stubs only)

Two lanes defined, both with TODO bodies:
- `fastlane ios beta` — intended to build via `build_app(scheme:)` and upload to TestFlight via `upload_to_testflight`.
- `fastlane android beta` — intended to run `gradle('assembleRelease')` and upload to Play Store internal testing.

**Status**: No production wiring. No `appStoreConnectKey`, `match`, signing config, or store credentials. The Fastfile is a placeholder for future product builds.

### Deploy command

There is no automated CI deploy. The expected manual flow:
1. `pnpm --filter @{product}/app build` (with `{product}` replaced)
2. `pnpm --filter @{product}/app cap:sync`
3. Open Xcode / Android Studio → archive / generate signed bundle → upload to App Store Connect / Play Console.
4. Eventually: `cd packages/products/<new-product>/app && fastlane ios beta` (after Fastfile is filled in).

## VSCode extension — `@resist/vscode`

**Package**: `packages/shared/config/tooling/vscode/`. Display name: "Resist Tooling". Publisher: `resist`. Currently `version: 0.0.1`, `preview: true`.

### Build pipeline

1. `pnpm --filter @resist/vscode build`:
   - `npx tsx scripts/generate-manifest.ts --fix` — regenerates `package.json` `contributes` (commands, menus, configuration) from source code.
   - `tsgo -p ./` — compiles TS to `dist/extension.js` using `@typescript/native-preview` (replaces stock `tsc`).
2. `pnpm --filter @resist/vscode build:package` → `vsce package --no-dependencies` → produces `.vsix` (e.g., `resist-vscode-0.0.1.vsix`).
3. Local install: `pnpm --filter @resist/vscode dev:local` → `pnpm build && pnpm build:package && code --install-extension $(ls -t *.vsix | head -1)`.

### Manifest generation

`scripts/generate-manifest.ts` is the source of truth — `package.json` `contributes` is generated, NOT hand-edited. It introspects:
- All `resist.*` commands from `src/lint/commands.ts` and `src/panel/`.
- All `resist.lint.*` configuration properties from the config schema.
- All view/menu contributions from the panel registration in `src/panel/menu-sync.ts`.
- Updates `package.json` `contributes` block.

The `--fix` flag writes changes; without it, the script exits with a diff.

### Marketplace deploy

- `vscode:prepublish` runs `pnpm build` (vsce contract).
- `vsce publish` would push to the VS Code Marketplace under the `resist` publisher (NOT currently automated).
- Repository URL: `https://github.com/kaelys-js/resist-js-private` (note: private repo, would need to be made public for marketplace listing, OR use OpenVSX private namespace).

### Activation

- `activationEvents: ["onStartupFinished"]` — extension loads after VS Code finishes startup (no specific trigger).
- Capabilities: `untrustedWorkspaces.supported: false` — extension requires trusted workspace because it spawns CLI processes.

## @/cli — npm package (the only public-facing one)

**Package**: `packages/shared/utils/cli/`. Name: `@/cli`. Version: `0.0.1`. **No `private` field** in package.json — defaults to publishable.

Currently has no build step (`type: "module"`, no `main`/`exports` in package.json — would need a build setup before `npm publish` could work meaningfully). Scripts only include `clean`, `qa:test*`, `qa:benchmark`, `tool` (dev runner), `qa:checks`. No `build`, no `prepublishOnly`.

The `tool` script: `node --import tsx src/utils/tool.ts` — invoked via `pnpm tool <subcommand>` from any package. The CLI runs against TS source directly via tsx.

### What it ships (when published)

- 15 tools: `checks`, `config`, `dev-proxy`, `devenv`, `format`, `generate-icons`, `local-ci`, `onboard`, `product-create`, `product-logs`, `schema-updater`, `secrets`, `secrets-setup`, `sync`, `vscode-setup`.
- Framework runtime (`src/utils/`).
- Locale strings (en + others under `src/locale/locales/`).
- Tool template scaffolding (under `src/tools/sync/template/`).

## Build pipeline (turbo)

From `turbo.json`:
- `build` depends on `^build` (upstream first).
- `qa:test` depends on `^build` AND `svelte-kit:sync` (per-app type generation).
- `qa:test:e2e` depends on `build` (full production build).
- `dev` and `preview` depend on `^build`, `cache: false`, `persistent: true`, `interruptible: true`.

Inputs strip test/spec/bench files from build invalidation. Outputs are `dist/**`, `build/**`, `.svelte-kit/**` for build; `coverage/**` for `qa:test:coverage`.

`globalPassThroughEnv` (turbo.json:4): `["NODE_ENV", "CI", "VITE_*", "PUBLIC_*", "PLAYWRIGHT_*"]`. Only these env vars cross the cache boundary — any other env var change does NOT invalidate the cache (intentional; secrets shouldn't bust caches).

## Summary table

| Deliverable                  | Adapter / target           | Build cmd                                | Deploy cmd                            | CI? |
|------------------------------|----------------------------|------------------------------------------|---------------------------------------|------|
| `@storylyne/editor`          | `adapter-cloudflare`       | `pnpm --filter ... build`                | `wrangler deploy` (manual)            | No   |
| `@{product}/app`             | `adapter-static` + Capacitor | `pnpm --filter ... build && cap sync`    | Fastlane lanes are stubs              | No   |
| `@resist/vscode`             | `tsgo` → `dist/extension.js` → `vsce package` | `pnpm --filter ... build:package`        | `vsce publish` (manual, not wired)    | No   |
| `@/cli`                      | TS source via tsx          | None (runs source directly)              | `npm publish` (not wired)             | No   |

No CI/CD pipeline is currently configured (no `.github/workflows/`, no `.gitlab-ci.yml`). Everything is manual.
