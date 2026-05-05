# `@/test-presets` — packages/shared/config/test

Vitest preset generators + reusable test harness shims.

## Package
- **Name**: `@/test-presets` (private)
- **Vitest project**: `test-presets`
- **Exports**: `./node`, `./base`, `./svelte`, `./playwright` (subpaths only — no root export)
- **Dependencies**: `vitest ^4.0.18`, `@playwright/test ^1.58.2` (devDep)

## File structure (`src/`)
```
presets/
  base.ts               ← `baseTestConfig` constant (shared baseline)
  base.test.ts
  node.ts               ← `createNodeTestConfig(NodeTestOptions)`
  node.test.ts
  svelte.ts             ← `createSvelteTestConfig(SvelteTestOptions)`
  svelte.test.ts
  playwright.ts         ← `createPlaywrightConfig(PlaywrightPresetOptions)`
  playwright.test.ts
harness/
  index.ts              ← barrel (likely empty or re-export)
  ansi.ts + .test.ts    ← ANSI escape capture/strip helpers for tests
  async.ts + .test.ts   ← async/promise test utilities
  clock.ts + .test.ts   ← fake-clock helpers (sinon-style)
  console.ts + .test.ts ← console capture/silence helpers
  http.ts + .test.ts    ← fetch/HTTP mock harness
  process.ts + .test.ts ← process.env/argv/exit shims
  temp-dir.ts + .test.ts ← tempdir lifecycle for file tests
bench/
  data.ts + .test.ts    ← benchmark data fixtures
```

## Public API
**Presets** (each preset returns a Vitest config object):
- `baseTestConfig` — shared defaults (timeouts, coverage thresholds, reporters)
- `createNodeTestConfig(opts)` — Node-only test environment
- `createSvelteTestConfig(opts)` — jsdom + svelte plugin + svelteTesting
- `createPlaywrightConfig(opts)` — Playwright project factory

**Harness shims** — imported per-test as needed; each `harness/*.ts` is an isolated utility file.

## Patterns
- All preset functions are pure: take options, return config object
- Harness shims are stateless utilities (e.g. `harness/clock.ts` exports fake-time helpers, no module state)
- Each shim has a paired `.test.ts` validating its own behavior
- Used by every other package's `vitest.config.ts` indirectly through root `vitest.config.ts` projects

## Test infrastructure note
This package supplies the building blocks; the actual root-level `vitest.config.ts` defines the 24 vitest projects.
