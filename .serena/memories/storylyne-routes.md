# `@storylyne/editor` — SvelteKit route tree (non-API)

> Captured 2026-05-05. Branch: `main`. Path: `packages/products/storylyne/editor/src/routes/`. API endpoints captured separately in `storylyne-api`.

The editor uses SvelteKit's route grouping aggressively — there are three groups (`(app)`, `(testing)`, plus uncategorized top-level), four layouts, and a deep `isolate/[name]` route used by Lens for pixel-perfect component rendering.

## Top-level (route group root)

### `+layout.svelte` (15 lines)
Minimal — imports `../app.css` and renders `{@render children()}`. The real app shell (sidebar, header, resizable panes) lives in `(app)/+layout.svelte`. Keeps `(testing)/` routes free of editor chrome.

### `+error.svelte` (19 lines)
Derives `status: Num` and `message: Str` from `$app/state.page` and forwards them along with `page.error?.errorId` to the shared `$lib/components/ErrorPage.svelte` component.

## `(app)` route group — the actual editor

### `+layout.svelte` (~600 lines, the centerpiece)
Wires the entire editor app shell. Imports & top-level setup:
- `ModeWatcher`, `setMode`, `setTheme` from `mode-watcher`.
- `Resizable` (PaneForge wrapper) — for the draggable sidebar.
- `AppSidebar`, `SiteHeader`, `DevToolbar` (lib components).
- `Sidebar`, `IsMobile` (UI lib).
- `localeStore`, `t` from `$lib/stores/i18n.svelte`.
- `initEditorStore`, `initDebugStore`, `applyUrlOverrides`, `syncDebugServices`.
- `getDevtoolsConfig`, `getBuildKey`, `getBuildInfo`, `getAnnouncement`.
- `setPreferenceCookie` from `@/utils/core/preference-cookie`.
- `shortcutStore` from keyboard-shortcuts-store.

Behavior:
- `afterNavigate(({ from, to }) => addNavigationBreadcrumb(...))` — feeds the error breadcrumb trail.
- `initEditorStore()` then immediately syncs server-supplied `data.user` (setUserName/Email/Avatar), `serverLocale` (`store.setLocale` + `localeStore.setLocale`), `data.sidebarOpen` cookie. **All three are set synchronously** to prevent SSR hydration flash.
- `initDebugStore(page.url)` (browser only) — applies URL overrides via `applyUrlOverrides(store, debugStore, debugStore.urlOverrides)`.
- Logs the build banner: `console.log('%c{appName}%c v{version} ({branch}@{commit}{dirty?, dirty:''}) — built {timestamp}', ...)` and assigns `window[getBuildKey(appName)] = buildInfo` for devtools introspection.
- `$effect`-driven `debugHandle = syncDebugServices(store, debugStore, getDevtoolsConfig(), debugHandle)` — reactive lifecycle for log/perf services.
- **Streaming data resolution**: server load returns `project: Promise | ServerProject | null` and `scenes: Promise | ServerScene[]`. The layout resolves them into reactive state with `projectLoading` / `scenesLoading` flags driving `NavProjectSkeleton` / `NavScenesSkeleton`. Cancellation via a closure-scoped `cancelled` flag.
- Resizable sidebar (`SIDEBAR_DEFAULT_PX = 288`):
  - `getInitialSidebarPercent()` reads `localStorage[storageKey('sidebar-px')]`, divides by `window.innerWidth`. Cleans `paneforge:${STORAGE_PREFIX}:sidebar-width` (PaneForge's internal key) to prevent stale data bypassing the custom adapter.
  - Custom `paneStorage: PaneGroupStorage` — converts pixel widths ↔ percentages on every read/write so the sidebar maintains a consistent pixel width across viewport sizes.
  - `handleSidebarResize(size)` — direct `--sidebar-width` style mutation + localStorage + cookie.
  - `handleDoubleClickResize()` — resets to `SIDEBAR_DEFAULT_PX`.
  - `ResizeObserver` on `[data-pane-group]` (RAF-throttled) maintains the saved pixel width when viewport resizes (PaneForge stores percentages).
- Mode/theme/locale → `$effect` syncs to `mode-watcher` via `untrack(() => { setMode; setTheme; if (locale !== localeStore.locale) localeStore.setLocale(locale); })`. The `untrack` is critical — `setMode`/`setTheme` read mode-watcher's `$state` which would re-trigger the effect.
- `mockDataDelay` and `sidebarOpen` cookies persisted via `setPreferenceCookie(STORAGE_PREFIX, ..., String(...))` in `$effect`.
- `themeColorLight`/`themeColorDark` from `THEME_COLORS[store.app.theme]`.
- Page title: `{appName} - {breadcrumbSegment} - {tagline}`. `breadcrumbSegment` = error title (from `errorTitleMap[page.status]`) > active scene title > "Home". `errorTitleMap` lives in this layout (not in `+error.svelte`) so the title reactively clears when navigating away from an error.
- `displayScenes` = clear `isActive` on `'/'` route to prevent stale highlighting.
- Skip-to-content link rendered before `<Sidebar.Provider>` — focusable to `#main-content`.
- Wraps content in `<PageFadeIn>` keyed on `page.url.pathname` so navigation triggers a fade.
- `<DevToolbar />` mounts only `if (browser && debugStore)`.
- Live-region `<div aria-live="polite" aria-atomic="true" class="sr-only">{getAnnouncement()}</div>` at the bottom for screen-reader announcements.

`<svelte:head>`: title, description, application-name, theme-color (light + dark prefers-color-scheme), og:title/description/type/locale.

### `+layout.server.ts`
- `load: LayoutServerLoad = ({ locals, url })`:
  - If no `user`: returns `{ locale, sidebarPx, sidebarOpen, user: null, project: null, scenes: [] }` synchronously.
  - Otherwise: captures `emptyScenes = url.searchParams.get('${URL_PARAM_PREFIX}scenes') === 'empty'` synchronously **before** entering async (SvelteKit warns on URL access in promise handlers).
  - Returns `project` and `scenes` as **streamed promises**: `project` = `locals.db.projects.getByOwner(user.id)`, `scenes` = chained from project (skips fetch when empty or project null). Streams via Cloudflare adapter; awaits during prerender; works in dev.

### `+page.svelte` (home)
Renders `AppLogo`, localized welcome text (`localeStore.t.home.welcome({ appName })`), tagline, and "Select a scene from the sidebar" + "Or create a new one" hints. All locale calls go through `t(fn, fallback)` with `log.warn` on failure (UI-boundary pattern).

### `+error.svelte`
Identical to top-level `+error.svelte` — both use `ErrorPage` component.

### `(app)/(testing)/test-error/` — error-pipeline test routes (nested in app group)

All under `src/routes/(app)/(testing)/test-error/`:
- `400/+page.server.ts` — `error(400, { message: 'Bad Request' })`.
- `403/+page.server.ts` — `error(403, { message: 'Forbidden' })`.
- `404/+page.server.ts` — `error(404, { message: 'Not found' })`.
- `500/+page.server.ts` — `error(500, { message: 'Internal server error' })`.
- `unexpected/+page.server.ts` — `throw new Error('Unexpected test error — this simulates a server crash')` (raw throw, not SvelteKit `error()`).
- `validation/+page.server.ts` — runs `safeParse` against deliberately-invalid data and `throw result.error` (the AppError directly, **not wrapped**) — exercises `handleError`'s preserve-AppError path.
- `validation-client/+page.svelte` — client-side equivalent: `if (browser) { ... throw result.error }`.
- `beacon/+page.svelte` — `if (browser) { throw err(ERRORS.HTTP.SERVER_ERROR, ...) }` to exercise the full beacon pipeline (window.onerror → setupGlobalErrorHandling → onError → beaconError → POST /api/errors).
- (Plus `/test-error/catastrophic` handled directly in `hooks.server.ts` via `if (event.url.pathname === '/test-error/catastrophic') throw ...` — exercises the SvelteKit `error.html` fallback when `handle` itself crashes.)

## `(testing)` route group — Lens documentation system

A self-contained sibling app inside the editor: ~3,585-line `+layout.svelte` is the Lens documentation shell. Lives under `src/routes/(testing)/` — completely free of editor chrome.

### `+layout.server.ts`
Counts available Lucide icons by reading `node_modules/@lucide/svelte/dist/icons` (filters `.svelte` files, dedupes via Set, returns `iconCount`).

### `+layout.svelte` (~3,585 lines)
The Lens documentation system. Top-of-file behaviors:
- `import.meta.glob('@/ui/*/*.svelte')` — discovers ~867 component directories.
- `import.meta.glob('@/ui/*/lens.ts', { import: '*', eager: true })` — eagerly loads metadata (parsed via `parseLensMeta` against `LensMetaSchema`).
- `import.meta.glob('@/ui/*/*.svelte', { query: '?raw', eager: true })` — raw sources for prop/variant extraction.
- `import.meta.glob('@/ui/*/*.ts', { query: '?raw', eager: true })` — raw TS for cross-file type resolution.
- `import.meta.glob('@/ui/*/docs.md', { query: '?raw', eager: true })` — markdown docs.
- `import.meta.glob('/src/app.css', { query: '?raw', eager: true })` — for design token extraction.
- `import.meta.glob('@/ui/*/examples/*.svelte')` — for compatibility checking (rule 16: declared example names must match files).
- Builds `metaByName: Map<Str, LensMeta>`, `metaErrors: Map<Str, Str>`, `examplesByName: Map<Str, LensExample[]>`.
- `groupedComponents` from `CATEGORY_ORDER.map(...)` (filtered for non-empty groups).
- Builds `globalSearchItems: SearchItem[]` with hierarchical groups: `Component`, `Component › Props`, `Component › Variants`, `Component › Examples`, `Component › Dependencies › UI Components / Workspace / External`. Used by `<CommandSearch>` (cmdk auto-hides empty groups).
- `compatByName: Map<Str, LensCompatibility>` — per-component compat results from `computeLensCompatibility(...)`.
- Notification center with `loadNotifications`, `getUnreadCount`, `markAllRead`, `removeNotification`, `clearAllNotifications`, severity filter dropdown, "show toasts" preference, two-step "Confirm Clear All" gate.

Markup structure (skim):
- `<Sidebar.Provider>` with category-grouped component list, Lens rule indicators, search trigger.
- `<Sidebar.Inset>` containing a `<header>` with breadcrumb + notifications popover + ModeToggle, then `<main>{@render children()}</main>`.
- `<CommandSearch>` rendered alongside.
- `<Toaster>` from `svelte-sonner` (custom rich color + close button styling matching glassmorphism theme).

### `(testing)` pages

Each page is its own self-contained UI for documentation/inspection:
- `about/+page.svelte` (~1,079 lines) — searchable/filterable about-page sections (`Project`/`Technical`/`Community` categories) with three view modes (sections/cards/compact), sort, search, two-step reset, and Markdown/JSON export.
- `accessibility/+page.svelte` — accessibility checklist/audit doc.
- `browser-support/+page.svelte` + `+page.ts` (`ssr = false` — runtime feature detection requires `window`/`navigator`).
- `changelog/+page.{svelte,server.ts}` — git log scrape over `packages/shared/ui/src/`. The server load runs `git log --pretty=format:"---COMMIT---%h|||%s|||%an|||%aI" --name-only -200 -- "${uiSrcDir}"` plus a second pass for `%b` bodies, parses `packages/shared/ui/src/<dir>/` to extract component names, classifies `isNew` from message words ("add"/"create"/"new"/"initial"), groups by date. Includes `detectRepoUrl()` (parses SSH or HTTPS git remote → browseable URL, cached). `resolveUiSrcDir()` walks up looking for `pnpm-workspace.yaml`.
- `components/+page.{svelte,ts}` — Lens overview dashboard (`ssr = false`).
- `components/[name]/+page.{svelte,ts}` — per-component Lens detail page (`ssr = false`).
- `components/all/+page.svelte` — flat all-components list.
- `components/category/+page.svelte` and `components/category/[category]/+page.{svelte,ts}` (`ssr = false`).
- `components/tags/+page.svelte` — tag index.
- `getting-started/+page.svelte`.
- `icons/+page.{svelte,server.ts}` — Lucide icon gallery. Server load uses `readdirSync('node_modules/@lucide/svelte/dist/icons')`, filters `.svelte` (excluding `.d.ts`), dedupes via `Set`, returns sorted names.
- `styling/+page.svelte`.
- `support/+page.svelte` — devices/configs support matrix.
- `tokens/+page.{svelte,ts}` — design token viewer (`ssr = false`, reads runtime CSS custom props via `getComputedStyle`).

## `isolate/[name]/+page.{svelte,ts}` — pixel-perfect component renderer

`+page.ts`: `export const ssr = false` (dynamic import.meta.glob).

`+page.svelte` (~580 lines):
- Resolves component by name from `import.meta.glob('@/ui/*/*.svelte', { query: '?raw', eager: true })` (raw sources) and `import.meta.glob('@/ui/*/*.svelte')` (live modules).
- `extractProps`, `extractDescription`, `buildBaseProps`, `findPrimaryKey` from `@/ui/lens/lens-utils`.
- `screenshotMode = page.url.searchParams.has('screenshot')` — strips chrome (no centering, padding, title) for pixel-perfect capture.
- `cardStyles` — decoded from `?s=base64JSON` param. Carries `mode` (light/dark), `bg`, `colorScheme`, `zoom`, `orient`, `outlineColor`, `simMatrix` (color-vision SVG matrix), `simCss` (CSS filter), `fontSize`, `dir` (ltr/rtl/auto), `vp` (e.g. `'1280x720'`), `mp` (media-pref CSS classes), `debugOutline`, `theme`, `tunnel`, `grid`, `net`.
- Renders inside `<svelte:boundary>` with a snippet that catches render errors.
- Sets `data-lens-ready` attribute when component mounts — used by Playwright/iOS/Android screenshot routes to detect render-complete (better than `'visible'` since dialogs/sheets render zero-size until triggered).
- CSS treatment classes for `lens-outline`, `lens-reduced-motion`, `lens-contrast-{more,less}`, `lens-reduced-transparency`, `lens-forced-colors`, `lens-debug-outline` (color-coded by element type: blue for `<article>/<nav>/<aside>`, indigo for headings, etc.), `lens-force-light` (forces light-mode CSS custom properties even in dark).

## Static endpoints (under `src/routes/`)

- `manifest.webmanifest/+server.ts` — `prerender = true`. Builds the PWA manifest JSON from `$lib/config/app-meta` constants. `WebManifestSchema` is a strict Valibot schema. Uses `THEME_COLORS[''].dark` for `background_color`/`theme_color`. Returns with `Cache-Control: public, max-age=86400`.
- `robots.txt/+server.ts` — `prerender = true`. Hardcoded policy: standard crawlers allowed (block `/api/`), AI search assistants (`ChatGPT-User`, `Claude-Web`) allowed, AI training crawlers (`GPTBot`, `anthropic-ai`, `CCBot`, `Google-Extended`, `Bytespider`, `cohere-ai`) fully blocked.
- `.well-known/security.txt/+server.ts` — `prerender = true`. RFC 9116 fields: `Contact: SECURITY_CONTACT_URL`, `Expires: now + 1 year`, `Preferred-Languages: SUPPORTED_LOCALES.join(', ')`, `Canonical: SECURITY_CANONICAL_URL`, `Policy: SECURITY_POLICY_URL`. `getExpiresDate()` builds the expiration date dynamically.

## E2E tests

`packages/products/storylyne/editor/e2e/` contains 25 Playwright suites. Listed but not opened — the suites cover every UI surface enumerated above plus security headers, security.txt, robots.txt, manifest, hydration flash, vitals, head meta, sidebar variants, locale, etc.
