# `@/config/tooling/node` — packages/shared/config/tooling/node

Node import-time alias resolution shims (provides `--import` loader).

## Package
- **Name**: `@/config/tooling/node` (private)
- **Vitest project**: NONE (`qa:test` echoes "no tests")
- **No tests, no exports field** — internal-use loader files

## File structure (`src/`)
```
index.ts                    ← exports REGISTER_ALIASES_PATH, RESOLVE_ALIASES_PATH
register-aliases.mjs        ← used as `node --import register-aliases.mjs`
resolve-aliases.mjs         ← module-resolve hook implementation
```

## Public API (`index.ts`)
```ts
export const REGISTER_ALIASES_PATH: string  // absolute path to register-aliases.mjs
export const RESOLVE_ALIASES_PATH: string   // absolute path to resolve-aliases.mjs
```

These are path constants — consumers (e.g. lint runner, CLI) use them with `node --import` to bootstrap workspace path-alias resolution before any TS/JS module loads.

## Pattern
- Pure path-export module, no runtime logic in `index.ts`
- The `.mjs` files are the actual loader hooks (consumed by Node, not by other TS code)
- Bridges Node's import resolution to the same path aliases declared in `tsconfig.json`

## Used by
- `pnpm qa:lint` — runs `@/lint` CLI under `node --import register-aliases.mjs`
- Anywhere TS files must resolve `@/...` aliases at runtime in Node
