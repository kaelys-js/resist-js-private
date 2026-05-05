# `@/config/tooling/vite` — packages/shared/config/tooling/vite

Vite config factory + custom plugins (template-html, lazy).

## Package
- **Name**: `@/config/tooling/vite` (private)
- **Vitest project**: `config-tooling-vite`
- **Exports**:
  - `.` → `./src/index.ts`
  - `./template-html` → `./src/vite-plugin-template-html.ts`
  - `./lazy-plugin` → `./src/vite-plugin-lazy.ts`

## File structure (`src/`)
```
index.ts                                ← createViteConfig + jsonDefine
index.test.ts
vite-plugin-template-html.ts            ← HTML-injection plugin
vite-plugin-template-html.test.ts
vite-plugin-template-html-edge.test.ts  ← edge-case tests
vite-plugin-lazy.ts                     ← lazy-load helper plugin
vite-plugin-lazy.test.ts
```

## Public API
**Root (`./`)**:
- `createViteConfig(opts: CreateViteConfigOptions)` — main Vite config factory
- `jsonDefine(...)` — Vite `define` helper for injecting JSON globals at build time

**Subpath `./template-html`**: a Vite plugin that processes/injects HTML templates (used with `@/config/tooling/svelte` templates)

**Subpath `./lazy-plugin`**: a Vite plugin for lazy-loaded module patterns

## Patterns
- One file per plugin (each plugin is a discrete subpath export)
- `jsonDefine` is the canonical pattern for inject-time globals (e.g., `__APP_VERSION__`, `__GIT_COMMIT__`) — used by every consuming product's vite config
- Edge-case tests are split into a separate file (`*-edge.test.ts`) when the matrix gets large

## Used by
- `@storylyne/editor` `vite.config.ts`
- `@{product}/app` template `vite.config.ts`
- Any product Vite config in the monorepo
