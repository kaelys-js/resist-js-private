# Editor Coding Standards Audit — Second Pass Implementation Plan

## Overview

~213 remaining violations across ~30 files. Split into 4 parts (max 10 tasks each).
QA after every file edit: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

All paths relative to `packages/products/webforge/editor/src/`.

## Part 1 — Production TS Builtins (largest files first)

### Task 1.1: `hooks.server.ts` (21 builtins + 1 ternary + 1 uncommented cast)
- Add `import type { Str, Num, Bool, Void } from '@/schemas/common'`
- Lines 65-78: extractSource — all `string` → `Str`, `number` → `Num`
- Lines 91-92: collectCauseChain — `Array<{ code: string; message: string }>` → `Str`
- Line 109: logCapturedError `): void` → `Void`
- Lines 111-114: `string` → `Str`, `boolean` → `Bool`
- Lines 157-180: handle hook locals — all `string` → `Str`, `number` → `Num`
- Line 186: TERNARY `dirResult.ok ? dirResult.data : 'ltr'` → `if (!dirResult.ok)` early-return pattern
- Lines 201-203: response checks — `string` → `Str`, `boolean` → `Bool`
- Line 270: add comment to `false as Bool` cast

### Task 1.2: `lib/debug/init.svelte.ts` (11 builtins)
- Add `import type { Str, Bool, Void } from '@/schemas/common'`
- Line 32: type `destroy(): void` → `Void`
- Line 64: impl `destroy(): void` → `Void`
- Line 88: `(key: string): boolean` → `(key: Str): Bool`
- Lines 123-124: `string[]` → `Str[]`
- Line 132: `): void` → `Void`
- Lines 137, 173-174: `string[]` → `Str[]`

### Task 1.3: `lib/server/locale-detection.ts` (6 builtins)
- Add `import type { Str } from '@/schemas/common'`
- Line 17: `ReadonlySet<string>` → `ReadonlySet<Str>`
- Line 32: function sig `(acceptLanguage: string | null): string` → `Str`
- Line 34: `readonly string[]` → `readonly Str[]`
- Line 38: `const code: string` → `Str`
- Line 61: function sig → all `Str`
- Line 63: `const fromHeader: string` → `Str`

### Task 1.4: `lib/stores/debug-state.svelte.ts` (6 builtins + 1 uncommented cast)
- Line 30: `STORAGE_KEY: string` → `Str`
- Line 64: type `setEnabled(enabled: boolean)` → `Bool`
- Line 66: type `setLogLevel(level: string)` → `Str`
- Line 101: `const raw: string | null` → `Str | null`
- Line 128: impl `setEnabled(enabled: boolean)` → `Bool`
- Line 142: impl `setLogLevel(level: string)` → `Str`
- Line 199: add comment to `as Result<DebugStore>` (copy pattern from editor-state.svelte.ts:379)

### Task 1.5: `lib/i18n.svelte.ts` (2 builtins + 1 uncommented cast)
- Line 47: `fallback: string` → `Str`
- Line 48: `): string` → `Str`
- Line 49: add comment to `fn as () => Result<Str>` — "DeepReadonly mangles locale function signatures"
- Line 50: add comment to ternary — "UI boundary — t() is the designated fallback point for locale errors"

### Task 1.6: Remaining small production files (5 files, 6 builtins)
- `lib/utils/url-params.ts` lines 86, 149: `string` → `Str`
- `lib/utils/announce.svelte.ts` line 26: `): void` → `Void`
- `lib/hooks/is-mobile.svelte.ts` line 41: `number` → `Num`
- `lib/stores/editor-state.svelte.ts` line 160: `string | null` → `Str | null`
- `lib/components/DevToolbarFeatureFlags.svelte` line 19: `() => void` → `() => Void`
- `lib/components/SiteHeader.svelte` line 19: `boolean` → `Bool`, `string` → `Str`

### Task 1.7: `hooks.client.ts` (1 uncommented cast)
- Line 611: add comment to `false as Bool` — "literal false narrowed to Bool alias for reportError"

---

## Part 2 — Ternary Fallbacks + Catch Blocks + Schema Comments

### Task 2.1: Ternary fallbacks in Svelte components (6 files)
- `+layout.svelte:252`: add `log.warn` import + log before fallback + comment
- `+page.svelte:16`: add `log.warn` import + log before fallback + comment
- `ErrorPage.svelte:108`: add log.warn + comment
- `LanguageSwitcher.svelte:47`: add log.warn + comment
- `DevToolbarDebug.svelte:137`: add log.warn + comment
- `DevToolbar.svelte:148`: add log.warn + comment

### Task 2.2: Silent catch blocks in DevToolbar.svelte (3 blocks)
- Line 49: expand `/* noop */` → `/* localStorage unavailable (SSR/incognito) — position is non-critical */`
- Line 69: same
- Line 205: same

### Task 2.3: Schema field comments — `manifest.webmanifest/+server.ts` (11 fields)
- Add JSDoc to every field: name, short_name, description, start_url, id, scope, display,
  background_color, theme_color, categories, icons

### Task 2.4: Schema field comments — `security.txt/+server.ts` (5 fields)
- Add JSDoc to every field: contact, expires, preferredLanguages, canonical, policy

### Task 2.5: Tighten WebManifestSchema
- `display` → `v.picklist(['standalone', 'fullscreen', 'minimal-ui', 'browser'])`
- `background_color` / `theme_color` → `v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/))`

### Task 2.6: Tighten SecurityTxtFieldsSchema
- `contact`, `canonical`, `policy` → `v.pipe(v.string(), v.url())`
- `expires` → `v.pipe(v.string(), v.isoTimestamp())`

### Task 2.7: Tighten app-meta.ts schemas
- `ThemeColorEntrySchema` light/dark → hex regex
- `IconEntrySchema` type → `v.picklist(['image/png', 'image/svg+xml'])`
- `IconEntrySchema` sizes → `v.pipe(v.string(), v.regex(/^\d+x\d+$/))`
- `FontFaceEntrySchema` style → `v.picklist(['normal', 'italic'])`

---

## Part 3 — Test Components + Test Files

### Task 3.1: Test component $props (10 files)
- `SiteHeaderTest.svelte:5` — `boolean` → `Bool`, `string` → `Str`
- `ErrorPageTest.svelte:5` — `number` → `Num`, `string` → `Str` ×2
- `NavScenesTest.svelte:5` — `boolean` → `Bool`
- `DevToolbarTest.svelte:6` — `boolean` → `Bool`
- `TestProviders.svelte:6` — `boolean` → `Bool`
- `FeatureFlagsTestProviders.svelte:6` — `string[]` → `Str[]`
- `NavUserFlagsTest.svelte:5` — `string[]` → `Str[]`
- `SiteHeaderFlagsTest.svelte:16` — `string[]` → `Str[]`
- `EmptyScenesFlagsTest.svelte:9` — `string[]` → `Str[]`
- `AppSidebarFlagsTest.svelte:32` — `string[]` → `Str[]`

### Task 3.2: Test files — hooks + error tests (4 files, ~40 violations)
- `hooks.server.test.ts` — all `string`, `boolean`, `number` → Valibot types
- `hooks.client.test.ts` — `string` → `Str`
- `error-html.test.ts` — `string`, `number` → `Str`, `Num`
- `error-page.test.ts` — `string` → `Str`

### Task 3.3: Test files — store + debug tests (5 files, ~20 violations)
- `debug-state.svelte.test.ts` — `string`, `number` → Valibot types
- `editor-state.test.ts` — `string`, `void` → Valibot types
- `init.svelte.test.ts` — `boolean`, `void` → Valibot types
- `integration.test.ts` — `boolean` → `Bool`
- `console-styles.test.ts` — `string` → `Str`

### Task 3.4: Test files — i18n + locale + keyboard + misc (6 files, ~30 violations)
- `i18n.test.ts` — `string` throughout → `Str`
- `locales.test.ts` — `string`, `number` → Valibot types
- `keyboard-shortcuts.test.ts` — `string`, `boolean` → Valibot types
- `app-html.test.ts` — `string` → `Str`
- `utils.test.ts` — `string` → `Str`
- `nav-secondary.test.ts` — `string[]` → `Str[]`

### Task 3.5: `test-setup-component.ts` (6 violations)
- Line 19: `(): void` → `Void`
- Line 23: `(query: string)` → `Str`
- Lines 39, 41, 43: `(): void` → `Void`
- Line 56: `(): void` → `Void`

---

## Part 4 — CLAUDE.md Rule Strengthening

### Task 4.1: Add 5 new rules to CLAUDE.md
1. **UI Boundary Exception**: $derived/$effect can use ternary fallback IF error is logged
2. **`as` cast comments**: every production `as` cast needs inline comment
3. **$props() Valibot types**: component props use Str/Bool/Num/Void
4. **Test file standards**: same rules as production code
5. **`catch` block comments**: explain WHY swallowing is safe

---

## Verification Checklist

After all parts complete:
- [ ] `pnpm qa:type-check` — zero errors
- [ ] `pnpm qa:lint` — zero new errors
- [ ] `pnpm qa:format` — clean
- [ ] `pnpm qa:test` — all unit tests pass
- [ ] `pnpm qa:test:e2e` — all E2E tests pass
- [ ] Re-grep for `: string\b`, `: number\b`, `: boolean\b`, `: void\b` (excluding ui/) — zero hits
- [ ] Re-grep for uncommented `as` casts — zero hits
- [ ] Re-grep for `\.ok \? .*\.data :` without preceding log.warn — zero hits (except t())
- [ ] Every schema field has JSDoc comment
- [ ] CLAUDE.md has 5 new rules
