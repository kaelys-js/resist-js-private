# `@/locale` — packages/shared/locale

i18n primitives: locale registry, ICU template engine, Intl wrappers, browser/Node detection, Svelte runes store.

> **Companion memory: `i18n-system`** — cross-cutting conventions for using `@/locale` across packages (CLI/lint/vscode/storylyne integration, SSR locale flow, the `t()` UI boundary, multi-namespace registry usage). Read `i18n-system` for the *user guide*; this memory is the per-file *API reference*. No content overlap.

## Package
- **Name**: `@/locale` (private)
- **Vitest projects**: `locale` (Node) + `locale-svelte` (jsdom + svelte plugin)
- **No exports field declared**, BUT subpath `@/locale/svelte` is mapped via tsconfig path aliases
- **No internal deps declared in package.json** (uses workspace path aliases for `@/utils/core`, `@/schemas/common`)

## File structure (`src/`)
```
t.ts                       ← `t(...)` template function + `LocaleFn` type
t.test.ts
template.ts                ← ICU MessageFormat-style engine
template.test.ts
registry.ts                ← createLocaleRegistry, namespaced registry
registry.test.ts
svelte.svelte.ts           ← Svelte 5 runes store (subpath @/locale/svelte)
svelte.svelte.test.ts
format.ts                  ← Intl wrappers (currency, date, number, etc.)
format.test.ts
detect.ts                  ← detectLocale + per-source detectors
detect.test.ts
direction.ts               ← getTextDirection (RTL data)
direction.test.ts
display.ts                 ← getLanguageDisplayName(s)
display.test.ts
og.ts                      ← Open Graph locale conversion
og.test.ts
```

Also has root-level `packages/` subdir (likely build artifact; not git-tracked source).

## Public API per file

### `t.ts`
- `t(...)` — main template function
- `LocaleFn` type

### `template.ts` — ICU MessageFormat engine
- `messageTemplate`, `renderMessage`, `buildLocale`, `buildLocaleEntries`, `extractPlaceholders`
- Plural, range, select resolvers; escape handling
- `TEMPLATE_PARAMS`, `MAX_ICU_DEPTH`, `EscapeResult`, `BuiltLocale`, `FormatterMap`

### `registry.ts`
- `createLocaleRegistry(opts)`, `createNamespacedRegistry(...)`, `mergeLocaleKeys(...)`
- Types: `LocaleRegistry`, `LocaleRegistryOptions`, `NamespaceDefinition`, `NamespacedRegistry`/`Options`

### `svelte.svelte.ts` (subpath `@/locale/svelte`)
- `createLocaleStore()` — Svelte 5 runes-based reactive locale store
- `LocaleStore` type

### `format.ts` — Intl wrappers (each takes a locale + options)
- `formatCurrency`, `formatDate`, `formatDateRange`, `formatDisplayName`, `formatDuration`
- `formatList`, `formatNumber`, `formatPercent`, `formatRelativeTime`, `formatTime`, `formatUnit`
- `parseDateTimeSkeleton`, `parseNumberSkeleton`, `styleToOptions`, `toDate`
- Many `*Style`/`*Type`/`*Options` Valibot schemas

### `detect.ts` — locale detection from various sources
- `detectLocale(opts)` — composite
- `detectFromAcceptLanguage`, `detectFromCookie`, `detectFromNavigator`, `detectFromUrlPath`, `detectFromUrlQuery`
- `matchLocale(...)` — quality-weighted matching
- Types: `DetectLocaleOptions`, `QualityEntry` + Valibot schemas per source

### `direction.ts`
- `getTextDirection(locale)` → `'ltr' | 'rtl'`
- `RTL_LANGUAGES`, `RTL_SCRIPTS`, `TextInfoSchema`

### `display.ts`
- `getLanguageDisplayName(locale)`, `getLanguageDisplayNames(...)` 
- `LanguageDisplayInfo` type

### `og.ts`
- `toOgLocale(locale)` — converts BCP47 → OpenGraph locale code
- `OgLocaleSchema`, `MaximizedLocaleData`

## Patterns
- Two vitest projects so Svelte runes file (`svelte.svelte.ts`) runs in jsdom
- All schemas defined inline alongside the functions that use them
- ICU template engine (`template.ts`) is hand-rolled — does NOT use a third-party MessageFormat lib
- Locale detection is multi-source with quality-weight resolution (Accept-Language style)
- Direction inference uses static lookup tables (`RTL_LANGUAGES`, `RTL_SCRIPTS`)

## Test infrastructure
- `qa:test:coverage` runs BOTH projects: `--project locale --project locale-svelte`
- `qa:test` runs only the Node project
