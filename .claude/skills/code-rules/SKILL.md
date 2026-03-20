---
name: code-rules
description: Use when writing or editing ANY code in this codebase — enforces Result pattern, Valibot types, DeepReadonly, import conventions, type annotations, error handling, and all CLAUDE.md code rules
---

# Code Rules

## Result Pattern

Every function returns `Result<T>` — never throws.

```typescript
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, okUnchecked, type DeepReadonly, type Result } from '@/schemas/result/result';

const result: Result<SceneConfig> = safeParse(SceneConfigSchema, input);
if (!result.ok) return result;
const config: DeepReadonly<SceneConfig> = result.data;
```

**Rules:**
- NEVER `v.parse()` — throws
- NEVER `v.safeParse()` — wrong format
- ALWAYS `safeParse` from `@/utils/result/safe`
- ALWAYS check `.ok` before `.data`
- NEVER ternary fallbacks — silently swallows errors
- NEVER `throw` — return `err()`
- `okUnchecked<T>(data)` for already-validated data
- `okShallow()` for data containing TypedArrays (Float32Array/Uint32Array)

## DeepReadonly After Parse

`Result<T>.data` is `DeepReadonly<T>`. Always annotate parsed data accordingly:

```typescript
// CORRECT — matches what Result actually returns
const parsed: Result<MyConfig> = safeParse(MyConfigSchema, input);
if (!parsed.ok) return parsed;
const cfg: DeepReadonly<MyConfig> = parsed.data;

// WRONG — DeepReadonly<T> is NOT assignable to T when arrays exist
const cfg: MyConfig = parsed.data; // TYPE ERROR if MyConfig has arrays
```

Functions consuming parsed config must accept `DeepReadonly<T>`:

```typescript
function applyFog(scene: Scene, fog: DeepReadonly<FogConfig>): void { ... }
```

## Valibot Types

Use Valibot types everywhere. Never TypeScript builtins for data.

```typescript
import type { Str, Bool, Num, Path } from '@/schemas/common';
function loadScene(path: Path, debug: Bool): Result<SceneData> { ... }
```

**Rules:**
- NEVER `string`, `number`, `boolean`, `void` for data
- NEVER `type` or `interface` for data — use `v.strictObject()` + `v.InferOutput`
- ALWAYS `v.strictObject()` (never `v.object()`)
- ALWAYS type annotations on every declaration
- NEVER `as` casts
- Import Valibot as namespace: `import * as v from 'valibot'`
- For TypedArrays: `v.custom<Float32Array<ArrayBufferLike>>(...)`
- Wrap with `v.pipe(..., v.readonly())` for readonly properties

## Imports

```typescript
// 1. External packages
import * as v from 'valibot';
import * as BABYLON from '@babylonjs/core';
// 2. Workspace packages — subpath imports, no barrels
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';
import type { Str, Bool, Num } from '@/schemas/common';
// 3. Product packages
import { SceneManager } from '@webforge/runtime';
// 4. Relative imports
import { validateAsset } from '../utils';
```

**Rules:**
- NEVER re-export — always import from canonical source
- Use `type` imports where appropriate
- Color/vector schemas: import from `color-schema.ts` (canonical source)

## QA After Every Edit

Run after EVERY file edit. No exceptions:
- `pnpm qa:type-check`
- `pnpm -w run qa:lint`
- `pnpm -w run qa:format:check`
- Fix issues, don't disable rules (only `max-lines`/`max-lines-per-function` OK to disable)

## Error Domains

17 domains: `VALIDATION`, `CONFIG`, `AUTH`, `DB`, `IO`, `HTTP`, `RUNTIME`, `RESOURCE`, `ENCODING`, `FUNCTION`, `LOCALE`, `TEMPLATE`, `SCENE`, `PLUGIN`, `PROJECT`, `ASSET`, `INTERNAL`

Format: `ERRORS.DOMAIN.CODE` (e.g., `ERRORS.SCENE.LOAD_FAILED`)

## JSDoc

Required for all exports. Include `@example` with TypeScript. Update when modifying code.

## File Naming

- kebab-case for `.ts`: `scene-loader.ts`
- PascalCase for `.svelte`: `SceneEditor.svelte`
- PascalCase for types from schemas
- camelCase for variables/functions
- SCREAMING_SNAKE_CASE for constants

## Testing

- Vitest, colocated: `foo.ts` -> `foo.test.ts`
- TDD: write test FIRST, watch fail, implement, watch pass
- Run: `pnpm qa:test`

## Formatting

- Biome: tabs, single quotes, semicolons, 100 char width
- Run: `pnpm qa:format` to fix, `pnpm qa:lint` to lint
