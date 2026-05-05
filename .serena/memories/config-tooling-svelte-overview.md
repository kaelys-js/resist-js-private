# `@/config/tooling/svelte` — packages/shared/config/tooling/svelte

SvelteKit config factory + alias-from-tsconfig builder + HTML templates.

## Package
- **Name**: `@/config/tooling/svelte` (private)
- **Vitest project**: `config-tooling-svelte`
- **DevDeps**: `@sveltejs/kit ^2.53.2`
- **No exports field** — consumed via direct file path or alias

## File structure (`src/`)
```
index.ts                           ← public API surface
index.test.ts                      ← main test file
index-csp.test.ts                  ← CSP-config-specific tests
index-init.test.ts                 ← module-init test
templates/
  app.html                         ← SvelteKit app shell template
  app-html.test.ts                 ← validates app.html structure
  error.html                       ← SvelteKit error template
  error-html.test.ts
```

## Public API (`index.ts`)
- `createSvelteConfig(opts: CreateSvelteConfigOptions)` — factory returning SvelteKit config
- `buildAliasesFromTsconfig(tsconfigJson)` — converts tsconfig `paths` → SvelteKit alias map
- `resolveTemplatePath(name)` / `resolveTemplatePaths()` — locate bundled HTML templates
- **Types**: `CreateSvelteConfigOptions`, `CspConfig`, `CspSource`, `TemplatePaths`, `TsconfigJson`
- **Constants**: `IS_PRODUCTION`, `PRODUCTION_CSP`, `TEMPLATE_PATHS`
- **Schemas**: tsconfig + template Valibot schemas

## Patterns
- Single big `index.ts` (no per-file modules)
- HTML templates live alongside code in `templates/` and are loaded by `resolveTemplatePath`
- CSP rules are baked-in constants (`PRODUCTION_CSP`)
- Init-time validation (`index-init.test.ts`) asserts template files exist on disk

## Used by
- `@storylyne/editor` — its `svelte.config.ts` calls `createSvelteConfig(...)`
- `@{product}/app` template — same pattern
