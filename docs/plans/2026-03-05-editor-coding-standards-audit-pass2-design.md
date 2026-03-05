# Editor Coding Standards Audit — Second Pass Design Document

## Problem

After the first-pass audit (`4c2999e`, 57 files, ~500 violations), a systematic re-scan
reveals **~213 remaining violations** across ~30 files. The first pass missed entire files
(`hooks.server.ts`, `init.svelte.ts`, `locale-detection.ts`, `i18n.svelte.ts`) and
incompletely fixed others. Test files were not systematically scanned for TS builtins.

Additionally, CLAUDE.md lacks explicit rules for several recurring patterns, allowing
re-introduction of violations.

## Scope

All files under `packages/products/webforge/editor/src/` **except** `components/ui/`
(shadcn-generated, exempt).

## Violation Categories

### 1. TS Builtins in Production Code (54 violations, 11 files)

Mechanical replacement: `string` → `Str`, `number` → `Num`, `boolean` → `Bool`, `void` → `Void`.

Each file needs `import type { Str, Bool, Num, Void } from '@/schemas/common'` (or extend
existing import). Some files already have partial imports from the first pass.

### 2. TS Builtins in Test Components + Test Files (~108 violations, 26 files)

Same mechanical replacement but in `.test.ts` files and `*Test.svelte` / `*TestProviders.svelte`
wrapper components. Test files follow the same type rules as production code per CLAUDE.md.

### 3. Ternary Result Fallbacks (8 production, 3 test)

Pattern: `result.ok ? result.data : fallback`

CLAUDE.md says "NEVER use ternary fallbacks". However, 7 of 8 production occurrences are in
Svelte `$derived` / `$effect` reactive contexts where you **cannot** propagate a `Result` —
you must produce a display value. The 8th is in `hooks.server.ts` which CAN use `if (!ok) return`.

**Design decision**: Introduce a "UI Boundary Exception" pattern:
- The ternary stays (can't propagate Result from `$derived`)
- Add `log.warn()` before the fallback so errors aren't silently swallowed
- Add inline comment: `// UI boundary — locale error logged, fallback used`
- The ONE exception is `i18n.svelte.ts:t()` which IS the designated UI boundary helper —
  logging every locale miss there would be extremely noisy. Add comment only.
- `hooks.server.ts:186` converts to proper `if (!dirResult.ok)` early return.

### 4. Silent Catch Blocks (3 violations)

`DevToolbar.svelte` has 3 `catch (_) { /* noop */ }` blocks for localStorage operations.
These need comments explaining WHY it's safe to swallow (localStorage unavailable in
SSR/incognito mode, non-critical position persistence).

### 5. Uncommented `as` Casts (4 production)

Every `as` cast in production code must have an inline comment. Four lack comments:
- `debug-state.svelte.ts:199` — `as Result<DebugStore>`
- `hooks.client.ts:611` — `false as Bool`
- `hooks.server.ts:270` — `false as Bool`
- `i18n.svelte.ts:49` — `fn as () => Result<Str>`

### 6. Missing Schema Field Comments (16 fields, 2 files)

Every Valibot schema field needs a JSDoc comment. Two internal schemas are missing all comments:
- `WebManifestSchema` in `manifest.webmanifest/+server.ts` (11 fields)
- `SecurityTxtFieldsSchema` in `security.txt/+server.ts` (5 fields)

### 7. Overly Permissive Schemas (~15 fields, 3 files)

Schemas using bare `v.string()` where domain-specific validation exists:
- Display mode → `v.picklist()`
- URLs → `v.pipe(v.string(), v.url())`
- Hex colors → `v.pipe(v.string(), v.regex(...))`
- ISO timestamps → `v.pipe(v.string(), v.isoTimestamp())`
- Icon sizes → regex pattern
- Font style → `v.picklist(['normal', 'italic'])`

### 8. CLAUDE.md Rule Strengthening (5 additions)

New explicit rules to prevent re-introduction:
1. "UI Boundary Exception" — document $derived/$effect ternary pattern with log.warn
2. "Every `as` cast MUST have inline comment" — no exceptions in production
3. "$props() types use Valibot aliases" — Str, Bool, Num, Void in component props
4. "Test files follow same rules as production" — explicit statement
5. "Every `catch` block MUST have a comment" — explain WHY swallowing is safe

## Documented Exceptions (NOT violations)

| Pattern | Reason |
|---------|--------|
| `+layout.svelte:111,120` PaneGroupStorage | Framework interface contract |
| `components/ui/*` | shadcn-generated, exempt |
| `as const` | Type narrowing, not data cast |
| `import * as v` | Namespace import, not cast |
| SvelteKit hook return types | Framework-mandated |
| DOM types | Not data types |
| `humanizeKey()`/`humanizeOption()` | Runtime-derived labels |

## Risk Assessment

**Risk**: Low — all changes are mechanical (type annotations, comments, schema constraints).
No architectural changes, no behavioral changes, no new dependencies.

**Testing**: Existing 2967 unit + 362 E2E tests will catch regressions. Schema tightening
in manifest/security routes is validated at build-time by prerender.
