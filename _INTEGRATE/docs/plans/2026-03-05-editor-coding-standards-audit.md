# Editor Coding Standards Audit — Implementation Plan

## Overview

Comprehensive audit of all ~50 editor source files for CLAUDE.md violations.
~500+ violations found across 7 categories. Fixes are mechanical — no architectural changes.

**Note:** If oxlint raises new linting errors from the changes, STOP and ask user how to handle.

All paths relative to `packages/products/webforge/editor/`.

## Violation Categories

| # | Category | Count | Fix |
|---|----------|-------|-----|
| 1 | TS builtins → Valibot types | ~300 | `string`→`Str`, `number`→`Num`, `boolean`→`Bool`, `void`→`Void` |
| 2 | Missing type annotations | ~80 | Add explicit types to `const`/`let`/`$state()`/`$derived()` |
| 3 | Forbidden `as` casts | ~40 | Replace with `safeParse`, type narrowing, or `instanceof` |
| 4 | Missing JSDoc | ~60 | Add `@module`, `@param`, `@returns`, `@example` |
| 5 | Missing schema field comments | ~50 | Add JSDoc to every Valibot schema field |
| 6 | Bare TS `type`/`interface` for data | ~15 | Convert to `v.strictObject()` + `v.InferOutput` |
| 7 | Stricter schemas + Result violations | ~25 | `v.pipe()` constraints, remove ternary fallbacks |

## Exceptions (NOT violations)

- Svelte component `Props` interfaces — required by Svelte 5 for interop
- DOM types (`HTMLElement`, `Element`, `Event`, `Response`) — not data types
- SvelteKit hook signatures (`handle`, `handleError`) — framework-mandated return types
- `v.string()` etc inside Valibot schema definitions — schema DSL
- Purely structural/generic utility types (function types, mapped types) — OK as bare `type`
- Framework interface implementations (PaneGroupStorage) — must match external contract
- `humanizeKey()`/`humanizeOption()` runtime-derived labels — not localizable
- Keyboard shortcut notation (`⌃`, `Esc`) — standard symbols
- `as const` assertions — not data casts
- Locale DeepReadonly workaround `as` casts — documented pattern in i18n.svelte.ts

## Progress Tracker

- [x] Part 1.1: `hooks.client.ts` — DONE
- [ ] Part 1.2: `DevToolbar.svelte`
- [ ] Part 1.3: `+layout.svelte`
- [ ] Part 1.4: `app-meta.ts`
- [ ] Part 2 (8 files)
- [ ] Part 3 (12 files)
- [ ] Part 4 (~15 Svelte components)
- [ ] Part 5 (~15 non-Svelte files)

---

## Part 1 — HIGHEST Severity

### 1.1 `src/hooks.client.ts` — ✅ DONE

Changes made:
- Added `@module` JSDoc
- Added `import * as v from 'valibot'`, `Str`, `Num`, `Bool`, `Void`, `safeParse`
- Converted 3 bare `type` defs → Valibot schemas (`SourceLocationSchema`, `SourceMapV3Schema`, `ResolvedPositionSchema`)
- Replaced `JSON.parse(...) as SourceMapV3` with `safeParse(SourceMapV3Schema, ...)`
- Changed all `string` → `Str`, `number` → `Num`, `boolean` → `Bool`, `void` → `Void`
- Added type annotations to all untyped declarations

### 1.2 `src/lib/components/DevToolbar.svelte`

**Imports to add:** `import * as v from 'valibot'`, `import type { Num, Bool, Void } from '@/schemas/common'` (Str already imported)

**$state bindings — add type annotations:**
- `let toolbarOpen = $state(false)` → `let toolbarOpen: Bool = $state(false)`
- `let activePanel: string | null` → `Str | null`
- `let copySuccess = $state(false)` → `Bool`
- `let resetSuccess = $state(false)` → `Bool`
- `let posX: number` → `Num`
- `let posBottom: number` → `Num`
- `let dragging = $state(false)` → `Bool`
- `let focusedIndex: number` → `Num`

**Plain variables — add annotations:**
- `let dragStartClientX = 0` → `Num`
- `let dragStartClientY = 0` → `Num`
- `let dragOriginX = 0` → `Num`
- `let dragOriginBottom = 0` → `Num`
- `let didDrag = false` → `Bool`
- `const editorStore = useEditorStore()` → add return type
- `const debugStore = useDebugStore()` → add return type
- `const initPos = loadPos()` → `{ x: Num; b: Num }`
- `const flags = discoverFeatureFlags()` → add return type

**Function signatures — TS builtins → Valibot:**
- `loadPos(): { x: number; b: number }` → `{ x: Num; b: Num }`
- All `: void` returns → `: Void`
- `togglePanel(panel: string)` → `(panel: Str)`
- Inner `const raw: string | null` → `Str | null`

**$derived bindings — fix types:**
- `modeDisplayName: string` → `Str`
- `cycleThemeLabel: string` → `Str`
- `flagsOpen: boolean` → `Bool`
- `appOpen: boolean` → `Bool`
- `debugOpen: boolean` → `Bool`
- `MODE_FALLBACKS: Record<string, string>` → `Record<Str, Str>`

**`as` casts (7):**
1. `(e.currentTarget as HTMLElement).setPointerCapture(...)` → `instanceof` check
2-4. `localeStore.t.settings.light as LocaleFn` (×3) → keep with `// Locale DeepReadonly workaround` comment (these are the documented pattern)
5. `localeStore.t.devToolbar.cycleTheme as (p: { mode: string })` → keep with comment, change `string` → `Str`
6. `editorStore.app.mode as (typeof MODES)[number]` → keep with comment (type narrowing)
7. `editorStore as unknown as Record<string, ...>` → keep with comment (dynamic setter access)

**Bare type:**
- `type LocaleFn = ...` → This is a function type (not data shape). Keep as-is — it's a structural utility type.

### 1.3 `src/routes/+layout.svelte`

**Imports to add:** `import type { Str, Num, Bool, Void } from '@/schemas/common'`

**TS builtins → Valibot (every occurrence):**
- `const serverLocale: string` → `Str`
- `const SIDEBAR_PX_KEY: string` → `Str`
- `getInitialSidebarPercent(): number` → `Num`
- `const saved: string | null` → `Str | null`
- `const px: number` → `Num`
- `const initialSidebarPercent: number` → `Num`
- `const useResizable: boolean` → `Bool`
- `let currentSidebarPx: number` → `Num`
- `const savedPx: string | null` → `Str | null`
- `const sidebarPx: number` → `Num`
- `const viewportWidth: number` → `Num` (×3)
- `const sidebarPercent: number` → `Num`
- `const layout: number[]` → `Num[]`
- `handleSidebarResize(size: number): void` → `(size: Num): Void`
- `const widthPx: number` → `Num`
- All `: void` returns → `: Void`
- `handleSidebarOpenChange(open: boolean)` → `(open: Bool)`
- `const insetClass: string` → `Str`
- `const defaultPercent: number` → `Num`
- `let resizeRafId = 0` → `Num`
- `const groupWidth: number` → `Num`
- `const targetPercent: number` → `Num`
- `const currentSize: number | undefined` → `Num | undefined`
- `const delay: number` → `Num`
- `const wantOpen: boolean` → `Bool`
- `const themeColorLight: string` → `Str`
- `const themeColorDark: string` → `Str`
- `const metaDescription: string` → `Str`
- `const activeSceneName: string` → `Str`
- `const breadcrumbSegment: string` → `Str`
- `const tagline: string` → `Str`
- `const pageTitle: string` → `Str`

**Missing type annotations:**
- `const store = initEditorStore()` → add type
- `const debugStore = browser ? initDebugStore(page.url) : undefined` → add type
- `const displayScenes = $derived(...)` → add type
- `const ogLocale = $derived(...)` → add type `Str`
- `const errorTitleMap: Record<number, () => string>` → `Record<Num, () => Str>`

**`as` casts (2):**
1. `localeStore.t.meta.description as (p: { appName: string }) => ...` → keep with `// Locale DeepReadonly workaround` comment, fix `string` → `Str`
2. `(groupEl as HTMLElement).clientWidth` → `instanceof` check

**Framework interface params:**
- `_name: string` in paneStorage methods — must match `PaneGroupStorage` interface, add comment

### 1.4 `src/lib/config/app-meta.ts`

**Type annotations on ALL exported constants:**
- `APP_NAME` → `: Str`
- `APP_SHORT_NAME` → `: Str`
- `APP_TAGLINE` → `: Str`
- `APP_DESCRIPTION` → `: Str`
- `APP_ID` → `: Str`
- `APP_SCOPE` → `: Str`
- `APP_START_URL` → `: Str`
- `APP_DISPLAY` → `: Str`
- `STORAGE_PREFIX` → `: Str`
- `FONT_FAMILIES` → `: Str`
- `FONT_DISPLAY_FAMILIES` → `: Str`
- `SECURITY_CONTACT_URL` → `: Str`
- `SECURITY_POLICY_URL` → `: Str`
- `SECURITY_CANONICAL_URL` → `: Str`
- `SECURITY_PREFERRED_LANGUAGES` → `: Str`

**JSDoc on exported constants (add):**
- `APP_NAME` — `/** Application display name. */`
- `APP_SHORT_NAME` — `/** Short name for PWA manifest and home screen. */`
- `APP_TAGLINE` — `/** Marketing tagline shown in meta tags. */`
- `APP_DESCRIPTION` — `/** App description for PWA manifest and meta tags. */`
- `APP_ID` — `/** PWA manifest application ID. */`
- `APP_SCOPE` — `/** PWA manifest scope. */`
- `APP_START_URL` — `/** PWA manifest start URL. */`
- `APP_DISPLAY` — `/** PWA manifest display mode. */`
- `FONT_FAMILIES` — already has JSDoc ✓
- `FONT_DISPLAY_FAMILIES` — already has JSDoc ✓
- `SECURITY_CONTACT_URL` — `/** Security vulnerability contact URL for security.txt. */`
- `SECURITY_POLICY_URL` — `/** Security policy URL for security.txt. */`
- `SECURITY_CANONICAL_URL` — `/** Canonical URL for security.txt. */`

**Schema field comments (add to each field):**
- `ThemeColorEntrySchema.light` — `/** Light mode hex background color. */`
- `ThemeColorEntrySchema.dark` — `/** Dark mode hex background color. */`
- `IconEntrySchema.src` — `/** Path to icon file (relative to static/). */`
- `IconEntrySchema.sizes` — `/** Icon dimensions (e.g. '192x192'). */`
- `IconEntrySchema.type` — `/** MIME type of the icon (e.g. 'image/png'). */`
- `IconEntrySchema.purpose` — `/** Icon purpose (e.g. 'maskable'). */`
- `FontFaceEntrySchema.family` — `/** CSS font-family name. */`
- `FontFaceEntrySchema.style` — `/** Font style (e.g. 'normal', 'italic'). */`
- `FontFaceEntrySchema.weight` — `/** Font weight or weight range (e.g. '600', '100 900'). */`
- `FontFaceEntrySchema.src` — `/** Path to font file (relative to static/). */`

---

## Part 2 — HIGH Severity (8 files)

### 2.1 `src/lib/debug/devtools-api.svelte.ts`

**Imports:** Add `Str`, `Num`, `Bool`, `Void`
**TS builtins:** ~15 method params/returns using `string`/`number`/`boolean`/`void` → Valibot types
**`as` casts (8+):** Locale store casts → keep with comment; store access casts → keep with comment
**Missing annotations:** Add to all untyped declarations

### 2.2 `src/lib/components/DevToolbarAppState.svelte`

**Imports:** Add `Str`, `Num`, `Bool`, `Void`
**TS builtins:** All `string`/`number`/`boolean`/`void` in script block → Valibot
**`as` casts (6):** Locale store workarounds, store access → keep with comments
**Missing annotations:** `$state()`/`$derived()` bindings

### 2.3 `src/lib/components/DevToolbarDebug.svelte`

**Imports:** Add `Str`, `Num`, `Bool`, `Void`, `import * as v from 'valibot'`
**Bare type:** `type FeedbackState` → `v.strictObject()` + `v.InferOutput`
**TS builtins:** All → Valibot
**`as` casts (5):** Locale, store → keep with comments
**Missing annotations:** All `$state()`/`$derived()` bindings

### 2.4 `src/lib/debug/dev-toolbar-registry.ts`

**Imports:** Add `import * as v from 'valibot'`, `Str`, `Num`, `Bool`
**Bare types (2):** `FlagDescriptor`, `FieldDescriptor` → Valibot schemas
**`as` casts (6):** Schema introspection casts → keep with comments (necessary for Valibot schema walking)
**TS builtins:** All → Valibot
**JSDoc:** Add `@module`, function JSDoc

### 2.5 `src/lib/stores/editor-state.svelte.ts`

**TS builtins:** 10 setter params (`string`, `number`, `boolean`) → `Str`, `Num`, `Bool`
**`as` cast (1):** `as Result<EditorStore>` → use type narrowing
**Missing imports:** `Str`, `Num`, `Bool`

### 2.6 `src/lib/components/ErrorPage.svelte`

**Imports:** Add `Str`, `Num`, `Bool`
**TS builtins (15):** All `string`/`number` in script → Valibot
**`as` cast (1):** DOM or locale → fix per pattern
**Missing annotations:** `$state()`/`$derived()` bindings

### 2.7 `src/lib/server/data/types.ts`

**Schema field comments (13):** Add JSDoc to every field in all schemas
**Bare type (1):** `type DataService` → This is an interface contract. If it defines data methods, keep but consider converting.
**Stricter schemas (2):** `v.string()` → `v.pipe(v.string(), v.minLength(1))` where appropriate

### 2.8 `src/test-mocks/app-navigation.ts`

**JSDoc gaps (8):** Add `@returns`, `@example` to all exported functions
**TS builtins (7):** All → Valibot types
**`@module`:** Add

---

## Part 3 — MEDIUM Severity (12 files)

### 3.1 `src/lib/config/keyboard-shortcuts.ts`
- 1 `as` cast (line 552) → fix
- `ShortcutRegistry` uses bare `Record` → fix
- `number` builtin (line 447) → `Num`
- 5 missing schema field comments
- 6 stricter schema opportunities

### 3.2 `src/lib/components/ui/sidebar/context.svelte.ts`
- Bare `type SidebarStateProps` → consider Valibot schema
- `boolean`/`void` builtins → `Bool`/`Void`
- Missing type annotations on `$derived`/`$state`
- Missing class/method JSDoc

### 3.3 `src/lib/schemas/editor-state.ts`
- Missing `@module`
- 6 missing `@example` blocks on exported schemas
- ~35 undocumented feature flag fields → add JSDoc to each

### 3.4 `src/lib/components/DevToolbarFeatureFlags.svelte`
- 2 `as` casts
- TS builtins → Valibot
- Missing `$state`/`$derived` annotations

### 3.5 `src/lib/debug/state-logger.svelte.ts`
- TS builtins in params/returns → Valibot
- Missing `Str`/`Bool`/`Void` imports

### 3.6 `src/test-mocks/app-environment.ts`
- 4 missing JSDoc
- 4 missing type annotations
- Missing `@module`

### 3.7 `src/test-mocks/app-state.ts`
- Missing type annotations
- TS builtins → Valibot
- Missing `@module`

### 3.8 `src/lib/components/ui/sidebar/constants.ts`
- 6 missing JSDoc
- 6 missing type annotations
- Missing `@module`

### 3.9 `src/lib/stores/keyboard-shortcuts-store.svelte.ts`
- 4 `as` casts → fix where possible
- Manual JSON parsing without `safeParse` → fix
- TS builtins → Valibot

### 3.10 `src/lib/components/LanguageSwitcher.svelte`
- 1 `as` cast
- TS builtins → Valibot
- Missing annotations

### 3.11 `src/routes/+page.svelte`
- 1 `as` cast
- 5 TS builtins → Valibot
- Missing annotations

### 3.12 `src/lib/utils.ts`
- Missing `@module`
- Missing `@example`
- Missing JSDoc on 4 exported types
- `cn()` return type `string` → `Str`

---

## Part 4 — LOW Severity Svelte Components (~15 files)

Each needs: type annotations on `$state`/`$derived`, `Str`/`Bool` imports, minor JSDoc.

| File | Violations | Specific |
|------|-----------|----------|
| `NavScenes.svelte` | 5 | builtins, annotations |
| `SiteHeader.svelte` | 5 | builtins, annotations |
| `NavSecondary.svelte` | 4 | builtins |
| `NavUser.svelte` | 7 | builtins, annotations |
| `ThemeSwitcher.svelte` | 7 | builtins, `as` cast |
| `HeaderUser.svelte` | 6 | builtins, annotations |
| `ModeToggle.svelte` | 3 | builtins |
| `AppSidebar.svelte` | 3 | builtins |
| `EmptyScenes.svelte` | 2 | annotation |
| `AppLogo.svelte` | 2 | annotation |
| `NavScenesSkeleton.svelte` | 1 | annotation |
| `NavUserSkeleton.svelte` | 1 | annotation |
| `+error.svelte` | 2 | builtins |

---

## Part 5 — LOW Severity Non-Svelte (~15 files)

| File | Violations | Specific |
|------|-----------|----------|
| `schemas/debug-state.ts` | 4 | `@module`, schema field comments, `@example` |
| `utils/locale-display.ts` | 4 | schema field comments, `string \| undefined` |
| `server/mock/service.ts` | 4 | TS builtins, missing Result return |
| `routes/+layout.server.ts` | 4 | `@module`, 2 ternary Result fallbacks |
| `locales/schema.ts` | 3 | `@module`, `@example`, JSDoc on export |
| `server/data/index.ts` | 3 | TS builtins, missing Result return |
| `server/mock/data.ts` | 3 | `@example` on 3 exports |
| `schemas/build-info.ts` | 2 | `@module`, schema field comments |
| `locales/en.ts` | 2 | `@module`, JSDoc on export |
| `locales/ja.ts` | 2 | `@module`, JSDoc on export |
| `locales/zh.ts` | 2 | `@module`, JSDoc on export |
| `locales/ko.ts` | 2 | `@module`, JSDoc on export |
| `locales/fr.ts` | 2 | `@module`, JSDoc on export |
| `locales/de.ts` | 2 | `@module`, JSDoc on export |
| `locales/es.ts` | 2 | `@module`, JSDoc on export |
| 5 test-error routes | 2 each | `@module`, JSDoc on load |

---

## QA After Each Part

```bash
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
pnpm qa:test
pnpm qa:test:e2e  # after final part
```

If oxlint complains about new linting errors → STOP and ask user how to handle.
