# `@/config` — packages/shared/config/core

Runtime product/workspace config loader (NOT tooling config — consumes `@/schemas/core-config`).

> **Companion memory: `config-files`** — describes the *config files on disk* (root `tsconfig.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.jsonc`, etc.) and per-package `svelte.config.ts`/`vite.config.ts`/`wrangler.jsonc`. No overlap — this memory is the package API (`defineConfig`, `loadConfig`, `getConfig`); `config-files` is the file inventory.

## Package
- **Name**: `@/config` (private workspace pkg, no exports field — internal use only)
- **Vitest project**: `config-core`
- **Test commands**: `pnpm -w exec vitest run --project config-core`
- **Dependencies**: `@/schemas/core-config`, `@/utils/core` (transitive via schemas)

## File structure (`src/`)
```
loader.ts              ← public API surface
loader.test.ts
loader-init.test.ts    ← module-init side-effects test
defaults.ts            ← built-in default config
defaults.test.ts
defaults-init.test.ts
```
No `index.ts` barrel. Consumers import paths directly (e.g. `import { defineConfig } from '@/config/loader'`).

## Public API (`loader.ts`)
- `defineConfig(...)` — workspace-level config helper (validates + freezes)
- `defineProductConfig(...)` — product-level config helper
- `loadConfig(filename?, opts?)` — discovers and loads config from disk
- `getConfig()` / `setConfig()` / `resetConfig()` — process-singleton config accessors
- `configExists(...)` — disk probe
- `DEFAULT_CONFIG_FILENAME` constant

## Patterns
- Module-singleton state for the loaded config (set/get/reset trio)
- `*-init.test.ts` files validate side-effects at module load time (separate from regular `.test.ts`)
- All public API returns/consumes `Result<...>` from `@/utils/result`
- Consumes Valibot schemas from `@/schemas/core-config` for shape validation

## Has `qa:checks` script
Yes — runs `pnpm --filter @/cli tool checks --cwd .` (workspace-validation pass).
