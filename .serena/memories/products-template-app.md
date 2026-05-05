# `packages/products-template/` — Template scaffolding (NOT a shipped product)

> Captured 2026-05-05. Branch: `main`. Path: `packages/products-template/`.

**Critical distinction**: `packages/products-template/` is **template scaffolding for new products**, not a deployed app. It exists to give a starting point when a new product is bootstrapped (likely via the `@/cli` `sync` or `product-create` tool — see `cli-framework` memory). Currently nothing in here is shipped. Compare to `@storylyne/editor` (the only actual shipped product, captured separately in `storylyne-overview`).

## Layout

```
packages/products-template/
├── app/                      → @{product}/app — SvelteKit + Capacitor mobile starter (workspace package)
└── config/                   → product config scaffold (NOT a workspace package — no package.json)
    └── src/index.ts          → defineProductConfig({ id: 'my-product', ... })
```

The placeholder `{product}` (literal text in the package name and other identifiers) is intended to be replaced by tooling when scaffolding a new product. The config dir does NOT have its own `package.json` — meaning it's not in the workspace listing — its `src/index.ts` is meant to be copied or referenced when a real product config is created.

## `packages/products-template/app/` — `@{product}/app`

A SvelteKit static-output app pre-wired for Capacitor mobile builds (iOS + Android). The intent: scaffold a new product, run `cap:sync`, build native shells.

### `package.json`
- Name: `@{product}/app` (placeholder).
- `"private": true`, `"version": "0.0.0"`.
- Scripts:
  - `prepare` / `svelte-kit:sync` → `svelte-kit sync`
  - `dev` → `vite dev`
  - `build` → `vite build`
  - `preview` → `vite preview`
  - `clean` → `rm -rf .svelte-kit dist`
  - `cap:sync` → `cap sync`
  - `cap:ios` → `cap open ios`
  - `cap:android` → `cap open android`
  - `qa:checks` → `pnpm --filter @/cli tool checks --cwd .`
- Dependencies: `@capacitor/core ^6.0.0`.
- Dev deps: `@capacitor/{cli,ios,android} ^6.0.0`, `@sveltejs/adapter-static ^3.0.0`, `@sveltejs/kit ^2.0.0`, `@sveltejs/vite-plugin-svelte ^4.0.0`, `svelte ^5.0.0`, `svelte-check ^4.0.0`.

### `capacitor.config.ts`
```ts
const config: CapacitorConfig = {
  appId: 'app.{product}',     // placeholder
  appName: '{product}',       // placeholder
  webDir: 'build',
  server: { androidScheme: 'https' },
};
```

### `svelte.config.ts`
Uses the shared `createSvelteConfig` factory from `@/config/tooling/svelte` (auto-syncs aliases from root tsconfig, adds CSP, git versioning, vitePreprocess). Static output:
```ts
adapter: adapter({
  pages: 'build',
  assets: 'build',
  fallback: 'index.html',
  precompress: false,
  strict: true,
})
```

### `vite.config.ts`
Trivial — uses `createViteConfig({ plugins: [sveltekit()] })` from `@/config/tooling/vite`.

### `tsconfig.json`
Extends `./.svelte-kit/tsconfig.json`. `allowJs`, `checkJs`, `esModuleInterop`, `forceConsistentCasingInFileNames`, `resolveJsonModule`, `skipLibCheck`, `sourceMap`, `strict`, `moduleResolution: "bundler"`.

### `src/routes/+page.svelte` (the only source file)
Stub home page demonstrating the `@/ui/button` import path:
```svelte
<script lang="ts">
  import { Button } from '@/ui/button';
  let count = $state(0);
</script>

<main>
  <h1>{'{product}'} App</h1>
  <p>Authenticated product experience.</p>
  <Button onclick={() => count++}>Count: {count}</Button>
</main>
```

### `fastlane/Fastfile`
Stub fastlane config for both iOS (`fastlane ios beta` → TestFlight) and Android (`fastlane android beta` → Play Store internal testing). Both lanes have only TODO comments — no real build_app/upload_to_testflight or gradle assembleRelease commands wired up yet.

### What it doesn't have

- No `src/app.html` — SvelteKit auto-generates one when missing.
- No `src/app.css` — minimal scaffold; new products would add their own.
- No `src/lib/` — no editor-style components, stores, schemas, locales, or server data.
- No `src/hooks.{client,server}.ts` — no error/security/logging boundary set up yet.
- No `src/routes/api/` — no error/vitals beacons.
- No `e2e/` — no Playwright suites.
- No `playwright.config.ts`, `wrangler.jsonc`, `components.json`, `branding/`, `static/`, `tests/`.

## `packages/products-template/config/`

**Not a workspace package** — has no `package.json`. Just `src/index.ts`:

```ts
import { defineProductConfig } from '@/config/loader';
import type { Description } from '@/schemas/common';

export default defineProductConfig({
  id: 'my-product',
  name: 'My Product',
  description: '' as Description, // cast safe: empty string for template placeholder
  layers: {
    api: true,
    app: true,
    marketing: true,
    status: true,
    assets: true,
  },
});
```

`defineProductConfig` comes from `@/config` (loader package — see `config-core-overview` memory). The `layers` object enables/disables product layers (api/app/marketing/status/assets). All layers default to `true`. The `'' as Description` cast is the convention for empty placeholder strings against the `Description` template-literal Valibot type.

## Comparison with `@storylyne/editor`

| Feature                             | `products-template/app`        | `@storylyne/editor`                |
|-------------------------------------|--------------------------------|------------------------------------|
| SvelteKit adapter                   | `adapter-static`               | `adapter-cloudflare`               |
| Capacitor                           | iOS + Android pre-wired         | None                               |
| Pages                               | 1 (stub home)                   | ~30 + Lens documentation system    |
| Components (`src/lib/components/`)  | 0                               | 16 production + 18 test wrappers   |
| Stores                              | 0                               | 5 (editor-state, debug, i18n, kbd, lens-notifications) |
| Locales                             | 0                               | 7 (de/en/es/fr/ja/ko/zh) + schema  |
| API endpoints                       | 0                               | 2 prod + 14 dev-only (Lens)        |
| E2E tests                           | 0                               | 25 Playwright suites               |
| Hooks (client/server)               | None                            | Full telemetry + security stack    |
| `qa:checks`                         | Yes (via `@/cli tool checks`)   | Yes                                |
| Vitest project in root              | No                              | Yes (`storylyne-editor` + server)  |

## Why this exists

The intent (per `monorepo-architecture` memory) is that new products would be created by copying `products-template/app/` to `packages/products/<new-product>/app/` (substituting `{product}` placeholders) and copying `products-template/config/src/index.ts` to that product's config layer. The `@/cli` `product-create` and `sync` tools are the likely automation path (their `template/` subdirs contain template scaffolding — see `cli-framework` memory).

Currently no such tooling has been observed wiring this up automatically. The template is dormant; it exists as a structural intent.

## Files captured

- `packages/products-template/app/package.json`
- `packages/products-template/app/capacitor.config.ts`
- `packages/products-template/app/svelte.config.ts`
- `packages/products-template/app/vite.config.ts`
- `packages/products-template/app/tsconfig.json`
- `packages/products-template/app/src/routes/+page.svelte`
- `packages/products-template/app/fastlane/Fastfile`
- `packages/products-template/config/src/index.ts`

Existing but not opened: `app/.svelte-kit/` (build artifact), `app/.turbo/` (build cache), `app/node_modules/` (deps).
