# CLAUDE.md

## Behavioral Rules (CRITICAL — read first)

- **NEVER substitute your own assessment for explicit instructions.** If a guide, prompt, or user says to do step X — DO IT. Do not evaluate whether the step is "needed," "simple enough to skip," or "unnecessary for this case." Execute every step as written, in order. No judgment calls. No shortcuts. This is the #0 rule and overrides all other optimization instincts.
- **After compaction or resume, ALWAYS resume work immediately.** Read the compaction summary or session state and continue. Every session event requires action.
- **ALWAYS respond to the user before running tools.** If the user asked a question, gave feedback, or said "explain" — answer them first. Tools come after.
- **ALWAYS present a changelog and get explicit approval before implementing changes.** Never edit code without user saying "yes" or "go ahead."
- **When told to "explain yourself" — stop all work.** Answer what you did, why it was wrong, what you should have done. Wait for permission.
- **QA runs after responding to user.** If the user is waiting for an answer, respond first, then run QA.

## Overview

**WebForge RPG** — pnpm monorepo with Turborepo. A web-based RPG creation suite with HD-2D rendering powered by Babylon.js.

**Stack:** TypeScript · Valibot · Svelte 5 · SvelteKit · Babylon.js · shadcn-svelte · Vitest · pnpm · Turborepo

## Workspace Structure

```
packages/
├── shared/
│   ├── schemas/common/     (@/schemas/common)    — Valibot primitive schemas: Str, Num, Bool, Path, etc.
│   ├── schemas/result/     (@/schemas/result)    — Result<T>, AppError, ERRORS registry, CapturedError
│   ├── schemas/function/   (@/schemas/function)  — Function schema validation
│   ├── schemas/generic/    (@/schemas/generic)   — Generic schema factories
│   ├── utils/result/       (@/utils/result)      — safeParse, combinators, format, error-utils, breadcrumbs
│   ├── utils/core/         (@/utils/core)        — Logger, signal, object, environment, process, terminal
│   ├── locale/             (@/locale)            — i18n: template, format, registry, detect, direction, svelte
│   └── config/test/        (@/config/test)       — Vitest presets (base, node, svelte) + test harness
└── products/
    └── storylyne/
        ├── editor/         (@storylyne/editor)    — SvelteKit + shadcn-svelte editor UI
        ├── runtime/        (@storylyne/runtime)   — Babylon.js HD-2D game runtime
        └── plugin-api/     (@storylyne/plugin-api) — Plugin SDK for third-party extensions
```

**Import scopes:** `@/` for shared packages, `@storylyne/` for product packages.

## Code Rules

### Result Pattern (CRITICAL)

Every function returns `Result<T>` — never throws. No exceptions.

```typescript
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, okUnchecked, type Result } from '@/schemas/result/result';

// Validate input
const result: Result<SceneConfig> = safeParse(SceneConfigSchema, input);
if (!result.ok) return result;  // propagate error
const config: SceneConfig = result.data;

// Return success with re-validation
return ok(SceneConfigSchema, config);

// Return already-validated data (skip re-validation)
return okUnchecked(result.data);

// Return a domain error
return err(ERRORS.SCENE.LOAD_FAILED, 'Scene asset missing');
```

**Rules:**
- **NEVER** use `v.parse()` — it throws, bypassing Result
- **NEVER** use `v.safeParse()` directly — returns Valibot's format, not `Result<T>`
- **ALWAYS** use `safeParse` from `@/utils/result/safe` — returns `Result<T>`
- **ALWAYS** check `.ok` before using `.data` — `if (!result.ok) return result;`
- **NEVER** use ternary fallbacks — `result.ok ? result.data : fallback` silently swallows errors
- **NEVER** `throw` in normal control flow — return `err()`
- Use `okUnchecked<T>(data)` when returning already-validated `.data`
- Every function input must be validated with a Valibot schema
- Every function output must return `Result<T>` — ALL callers must check `.ok`

**UI Boundary Exception:** In Svelte `$derived`/`$effect` reactive contexts where you cannot propagate `Result` (must produce a value), the ternary fallback `result.ok ? result.data : fallback` is allowed **only if** the error is logged first with `log.warn()`. Always add an inline comment explaining why:

```typescript
// UI boundary — $derived must produce a value; error logged above
const label: Str = $derived.by(() => {
  const r: Result<Str> = localeStore.t.ns.key();
  if (!r.ok) log.warn(`locale key failed (${r.error.code})`);
  return r.ok ? r.data : 'Fallback';
});
```

**`catch` block comments:** Every `catch` block that intentionally swallows an error must have an inline comment explaining WHY the error is non-critical and safe to ignore. Empty `catch {}` blocks are never acceptable.

```typescript
// CORRECT
catch (_) {
  /* localStorage unavailable (SSR/incognito) — position is non-critical */
}

// WRONG — silent swallow with no explanation
catch (_) {}
```

### Valibot Types (CRITICAL)

Use Valibot types everywhere. Never use TypeScript builtins for data.

```typescript
// CORRECT
import type { Str, Bool, Num, Path } from '@/schemas/common';

function loadScene(path: Path, debug: Bool): Result<SceneData> { ... }

// WRONG — never do this
function loadScene(path: string, debug: boolean): Result<SceneData> { ... }
```

**Rules:**
- **NEVER** use TypeScript builtins (`string`, `number`, `boolean`, `void`) for data types — this applies to ALL files: production, test, and test component `$props()` types. The **only** exception is `Promise<void>` (TypeScript requires `void` in Promise generics)
- **NEVER** use TypeScript `type` or `interface` for data — use `v.strictObject()` + `v.InferOutput`
- **ALWAYS** use `v.strictObject()` (never `v.object()`)
- **ALWAYS** add type annotations to every declaration — no exceptions
- **NEVER** use `as` casts without an inline comment explaining WHY the cast is necessary. Every `as` cast must document what makes it safe (e.g., `// DeepReadonly mangles locale function signatures — cast to callable form`)
- Import Valibot as namespace: `import * as v from 'valibot'`
- **ALWAYS** add JSDoc comments to every field in `v.strictObject()` schemas — undocumented schema fields are violations
- **ALWAYS** use the most specific Valibot validator: prefer `v.picklist([...])` over `v.string()`, `v.pipe(v.string(), v.url())` over bare `v.string()`, `v.pipe(v.string(), v.regex(...))` for constrained formats

### Imports

```typescript
// 1. External packages
import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';

// 2. Workspace packages — use subpath imports, no barrel files
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import type { Str, Bool, Num, Path } from '@/schemas/common';
import { log } from '@/utils/core/logger';

// 3. Product packages
import { SceneManager } from '@storylyne/runtime';

// 4. Relative imports
import { validateAsset } from '../utils';
```

**Rules:**
- Use subpath imports for non-barrel packages (e.g., `@/utils/result/safe`, `@/locale/template`)
- **NEVER** re-export — always import from canonical source
- Use `type` imports where appropriate: `import type { ... }`

### Error Domains

17 domains in the `ERRORS` registry:

`VALIDATION`, `CONFIG`, `AUTH`, `DB`, `IO`, `HTTP`, `RUNTIME`, `RESOURCE`, `ENCODING`, `FUNCTION`, `LOCALE`, `TEMPLATE`, `SCENE`, `PLUGIN`, `PROJECT`, `ASSET`, `INTERNAL`

Error code format: `ERRORS.DOMAIN.SPECIFIC_CODE` (e.g., `ERRORS.SCENE.LOAD_FAILED`, `ERRORS.ASSET.NOT_FOUND`).

### Logging

```typescript
import { setupLogging, log } from '@/utils/core/logger';

setupLogging({ level: 'info' });

log.info('Scene loaded', { sceneId });
log.warn('Asset cache miss', { assetPath });
log.error('Runtime crash', { error });
log.debug('Mesh vertices', { count });
log.trace('Tick', { frame });
log.json('Plugin manifest', manifest);
```

### Locale / i18n

```typescript
import { messageTemplate, buildLocale } from '@/locale/template';
import { detectLocale } from '@/locale/detect';
import { createLocaleRegistry } from '@/locale/registry';

// Locale strings return Result<Str> — always check .ok
const msg: Result<Str> = strings.sceneLabel({ name: sceneName });
if (!msg.ok) return msg;
```

### JSDoc

Required for all exported functions and types. Use `@example` blocks with TypeScript examples. When modifying code, update every JSDoc block to match reality.

```typescript
/**
 * Loads a scene from a project file path.
 *
 * @param path - Absolute path to the scene file
 * @param options - Scene load options
 * @returns Result containing the loaded SceneData
 *
 * @example
 * const result = loadScene('/projects/my-rpg/scenes/town.json', { debug: false });
 * if (!result.ok) return result;
 * console.log(result.data.name);
 */
export function loadScene(path: Path, options: SceneLoadOptions): Result<SceneData> { ... }
```

### File Naming

- **kebab-case** for files: `scene-loader.ts`, `asset-cache.ts`
- **PascalCase** for Svelte components: `SceneEditor.svelte`, `TileMap.svelte`
- **PascalCase** for types derived from Valibot schemas
- **camelCase** for variables and functions
- **SCREAMING_SNAKE_CASE** for constants

## Testing

- **Vitest** for unit/integration — colocated tests: `foo.ts` → `foo.test.ts`
- Presets from `@/config/test` (base, node, svelte)
- Test harness from `@/config/test/harness` — temp dirs, console capture, async helpers, fake clock
- Run tests: `pnpm qa:test`
- **Test files follow the SAME coding standards as production code** — Valibot types (`Str`, `Bool`, `Num`, `Void`), type annotations on every declaration, no bare `as` casts. The only exception is `Promise<void>`.

```typescript
import { createTestHarness } from '@/config/test/harness';

const harness = createTestHarness();
```

## Formatting & Linting

- **Biome** — spaces (2-wide), single quotes, semicolons always, 100 char width
- **oxlint** — full ruleset, config at `.oxlintrc.json` in workspace root
- Run `pnpm qa:format` to format, `pnpm qa:lint` to lint
- **NEVER use lint disable comments** (`eslint-disable`, `oxlint-ignore`, `/* global */`, etc.) — fix the code instead. Add missing browser globals to `.oxlintrc.json` globals section. Only `max-lines` and `max-lines-per-function` are OK to disable.
- **NEVER dismiss failing tests** — every test failure must be investigated and fixed. Never say "pre-existing" or "unrelated" without proving it (git blame, run on base branch).

## Browser Tools

- **NEVER use `preview_*` tools** (`mcp__Claude_Preview__preview_*`) — they are forbidden in this project
- **ALWAYS use Playwright MCP** (`mcp__plugin_playwright_playwright__*`) for all browser interaction, visual verification, screenshots, and console checking
- Start dev servers via `Bash` (e.g., `pnpm --filter @storylyne/editor dev`), not via `preview_start`

## Gotchas

- **Result short-circuit** — `if (!result.ok) return result;` is the only way to propagate errors; never swallow them with fallbacks.
- **`v.strictObject()` only** — `v.object()` silently ignores unknown keys, defeating schema safety.
- **Locale files load at module scope** — can't return Result directly; use fallback pattern for Result-returning calls.
- **Babylon.js is async** — scene/asset loading is inherently async; always wrap in `Result`-returning async functions.
- **Plugin API is a public surface** — `@storylyne/plugin-api` exports must be stable and fully documented; treat changes as breaking.
- **No barrel files** — import from subpath entrypoints; re-exporting through an index creates circular dependency risk.
