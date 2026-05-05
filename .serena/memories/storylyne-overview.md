# `@storylyne/editor` — package overview

> Captured 2026-05-05. Branch: `main`. Path: `packages/products/storylyne/editor`. The **only shipped product** in `packages/products/`. Everything else under `packages/products-template/` is template scaffolding for new products.

## Position in monorepo

`packages/products/` contains exactly two things:
1. **`packages/products/storylyne/editor/`** — `@storylyne/editor` — the actual Storylyne RPG/scene editor SvelteKit app.
2. **`packages/products/package.json`** — `@/products` — a path-mapping shim with `"exports": { "./*": "./*.ts", "./*.svelte": "./*.svelte" }` and **no source code**. Its sole purpose is to expose `@/products/<path>` namespacing via tsconfig. Not a shipped artifact.

The sibling tree `packages/products-template/{app,config}` is **template scaffolding** for *future* products — not part of the editor. See companion memory `products-template-app`.

## What the editor is

A SvelteKit 2.53 + Svelte 5 (runes) + Cloudflare Workers application. The shipping app is a Storylyne scene editor (RPG game-editor-like UI), but **most of the code today is the Lens documentation system** — a sister UI under the `(testing)` route group that documents and inspects the 867+ shadcn-svelte components in `@/ui`. Lens has its own:
- 3,585-line `(testing)/+layout.svelte` (sidebar, search, notifications, breadcrumb).
- Per-component detail pages (`(testing)/components/[name]/`).
- Live-rendered isolation route (`isolate/[name]/`).
- Real-browser & real-device screenshot capture pipeline (`/api/lens/screenshot/{playwright,ios,android}`).
- Standalone HTML compile endpoint (`/api/lens/compile-standalone`).
- Per-component bundle-size analysis (`/api/lens/bundle-sizes`).
- Per-component changelog from git history (`/api/lens/changelog/[name]`).

## Stack

- **Framework**: SvelteKit ^2.53 + Svelte ^5 (runes) + `@sveltejs/adapter-cloudflare`.
- **UI**: `@/ui` (shadcn-svelte fork), `bits-ui` ^2.16, `tailwind-variants`, `paneforge` (resizable), `vaul-svelte`, `lucide-svelte`, `mode-watcher`, `embla-carousel`, `formsnap`, `sveltekit-superforms`, `layerchart`, `svelte-sonner` (toasts).
- **Validation**: Valibot (everywhere — see `@/schemas/*`).
- **Logging**: structured `@/utils/core/logger` with `service: 'editor-{client,server}'`.
- **Vitals**: `perfume.js` via `@/utils/web-vitals/perfume`.
- **Errors**: `@/utils/result/safe`, `@/utils/core/signal`, `@/utils/beacon/beacon`.
- **i18n**: `@/locale` + 7 locales (de/en/es/fr/ja/ko/zh) + `EditorLocaleSchema` ICU MessageFormat.
- **Build**: `vite.config.ts` uses `@/config/tooling/vite` factory; `svelte.config.ts` uses `@/config/tooling/svelte`. Wrangler config at `wrangler.jsonc`.
- **Lens screenshot**: `playwright` (3 engines), `xcrun simctl` (iOS), `adb`+`emulator`+`avdmanager` (Android). All dev-only.
- **Compile-standalone**: `svelte/compiler`, `esbuild` (bundle), `@tailwindcss/node`, `node:zlib`.
- **Tests**: 25 Playwright E2E suites (`e2e/`), Vitest projects `storylyne-editor` (jsdom + svelte) and `storylyne-editor-server` (node).

## Directory layout

```
src/
├── app.css                  Global Tailwind + theme custom properties + @custom-variant
├── app.d.ts                 SvelteKit App.Locals/PageData/Platform types
├── app.html                 Document template (with %lang%, %dir%, data-sidebar-width="", data-theme="" placeholders + {{APP_NAME}}, {{STORAGE_PREFIX}})
├── hooks.client.ts          Client-side handler — see storylyne-hooks
├── hooks.server.ts          Server-side handler — see storylyne-hooks
├── sveltekit-types.d.ts     Aug. SvelteKit types
├── routes/                  See storylyne-routes + storylyne-api
├── lib/
│   ├── components/          16 production + 18 test wrappers — see storylyne-components
│   ├── stores/              Svelte 5 runes singletons (5 stores)
│   ├── schemas/             editor-state + debug-state Valibot schemas
│   ├── config/              Static config (5 modules)
│   ├── locales/             7 locale files + schema (8 files)
│   ├── server/
│   │   ├── data/            DataService interface + factory
│   │   ├── mock/            Mock user/project/scene + service impl
│   │   ├── preview/         Live View subsystem — see storylyne-preview-simulator
│   │   └── simulator/       iOS/Android toolchain wrappers — see storylyne-preview-simulator
│   └── utils/url-params.ts  parseDebugParams, applyUrlOverrides, isValidAppKey, isValidFeatureFlag
├── test-mocks/              app-environment, app-navigation, app-state mocks
└── test-setup-component.ts  Vitest setup file for component tests
e2e/                         25 Playwright suites
branding/                    Static logo/brand assets (skip)
static/                      PWA icons, screenshots, fonts (skip)
```

## Stores (`src/lib/stores/`)

All use Svelte 5 runes (`$state`, `$derived`) and have an `init`+`use` pattern (init in layout via `setContext`, then components call `useEditorStore()` etc.).

- **`editor-state.svelte.ts`** (`createEditorStore`, `initEditorStore`, `useEditorStore`):
  - `EditorStore.app`: `{ appName, theme, mode, locale, sidebarOpen, userName, userEmail, userAvatar, subscriptionPlan, mockDataDelay }` (see `AppPreferencesSchema`).
  - `EditorStore.features`: ~30 boolean feature flags (`FeatureFlagsSchema`) — `settings`, `themeSelection`, `languageSelection`, `modeToggle`, `sidebar`, `sidebarHome`, `sceneList`, `resizableSidebar`, `breadcrumb`, `sidebarToggle`, `sidebarHelp`, `headerUserDropdown`, `headerUserAvatar`, `headerUserAccount`, `headerUserSubscription`, `headerUserNotifications`, `headerUserShortcuts`, `headerUserSettings`, `headerUserWhatsNew`, `headerUserLogout`, `projectDropdown`, `projectDropdownIcon`, `projectDropdownSettings`, `appIconInSidebar`, `appNameInSidebar`, `emptyScenePlaceholder`, `authGatedUi`, etc.
  - Setters: `setAppName/Theme/Mode/Locale/SidebarOpen/UserName/UserEmail/UserAvatar/SubscriptionPlan/MockDataDelay`, `setFeature(key, value)`.
  - Persists to `localStorage[STORAGE_KEY]` with `STORAGE_KEY = storageKey('editor-state')` = `'storylyne:editor-state'`.
  - `APP_DEFAULTS`, `FEATURE_DEFAULTS`, `FEATURE_KEYS` constants.
- **`debug-state.svelte.ts`** (`createDebugStore`, `initDebugStore`, `useDebugStore`): wraps `@/utils/devtools/debug-state-store` with editor-specific `URL_PARAM_PREFIX`. State: `{ enabled, logLevel, logState, logEvents, logErrors }` plus `urlOverrides` Map. Singleton scope via module-level `_singleton`. `STORAGE_KEY = storageKey('debug-state')`.
- **`i18n.svelte.ts`** — discovers locale files via `import.meta.glob('../locales/!(*schema|*.test).ts', { eager: true })`, builds a `Record<code, RawLocaleStrings>` from the first named export of each module, then `createLocaleRegistry({ schema: EditorLocaleSchema, defaultLocale: 'en', locales, strict: false, fallbackLocales: ['en'] })` and `createLocaleStore(registry)`. Throws if either step fails. Exports `localeStore` + re-exports `t` from `@/locale/t`.
- **`keyboard-shortcuts-store.svelte.ts`** — `KeyboardShortcutsStore` class. Module-scope singleton `shortcutStore`. Methods: `matches(e, id)`, `format(id)`, `update(id, shortcut)`, `reset(id)`, `resetAll()`, `getAll()`. `SHORTCUTS_STORAGE_KEY` persists to localStorage. Uses `stripStateProxies` to serialize Svelte 5 reactive proxies. Default shortcuts and IDs from `$lib/config/keyboard-shortcuts`.
- **`lens-notifications.svelte.ts`** — Lens documentation system notification center. `pushNotification`, `pushNotificationBatch`, `markRead`, `markAllRead`, `removeNotification`, `removeByCategory`, `clearAllNotifications`, `getNotifications`, `getGroupedNotifications`, `getUnreadCount`, `isTypeEnabled`, `getPreferences`, `updatePreferences`. Persists to `NOTIFICATIONS_KEY` and `PREFERENCES_KEY`. Schemas: `LensNotificationSchema`, `NotificationPreferencesSchema`, `NotificationTypeSchema` (`info|success|warning|error`).

## Config (`src/lib/config/`)

- **`app-meta.ts`** — Single source of truth for app identity. `APP_NAME='Storylyne'`, `APP_SHORT_NAME='Storylyne'`, `APP_TAGLINE='Your Story, Rendered'`, `APP_ID='/'`, `APP_SCOPE='/'`, `APP_DISPLAY='standalone'`, `APP_CATEGORIES=['games','developer tools','design']`. `STORAGE_PREFIX = APP_NAME.toLowerCase()` = `'storylyne'`. `URL_PARAM_PREFIX = '${APP_NAME.slice(0,3).toLowerCase()}.'` = `'sto.'`. Helpers: `storageKey(suffix)` returns `'${STORAGE_PREFIX}:${suffix}'`. Constants `THEME_COLORS` (per-theme light/dark hex pair), `DISPLAY_OVERRIDE`, `ICONS`, `SCREENSHOTS`, `FONT_FAMILIES`, `FONT_DISPLAY_FAMILIES`, `FONT_FACES`. Security: `SECURITY_CONTACT_URL`, `SECURITY_POLICY_URL`, `SECURITY_CANONICAL_URL`, `SECURITY_PREFERRED_LANGUAGES`. Schemas: `AppDisplaySchema`, `AppCategoriesSchema`, `ThemeColorEntrySchema`, `DisplayOverrideSchema`, `IconEntrySchema`, `ScreenshotEntrySchema`, `FontFaceEntrySchema`.
- **`devtools-config.ts`** — `getDevtoolsConfig()` returns `DevtoolsConfig` for `@/utils/devtools`. Exports `APP_KEYS` and `FEATURE_FLAG_KEYS` constants (used by URL override system).
- **`keyboard-shortcuts.ts`** — Cross-platform keyboard shortcut registry. `IS_MAC`, `MODIFIER_ORDER`, `MAC_SYMBOLS`, `PC_LABELS`. Schemas: `ModifierKeySchema`, `ShortcutContextSchema`, `ShortcutIdSchema`, `KeyboardShortcutSchema`, `ShortcutRegistrySchema`, `ShortcutConflictSchema`. `def(...)` factory builds entries. `DEFAULT_SHORTCUTS`, `SHORTCUT_IDS` (`TOGGLE_SIDEBAR`, `TOGGLE_DEV_TOOLBAR`, `CLOSE_PANEL`, `DEV_FLAGS_PANEL`, ...). Helpers: `formatShortcut`, `matchesShortcut`, `detectConflicts`, `getAllShortcuts`, `updateShortcut`, `resetShortcut`, `resetAllShortcuts`, `isEditableTarget`.
- **`lens-categories.ts`** — Lens UI taxonomy. `CATEGORY_ORDER` (display order: `display`, `actions`, `forms`, `feedback`, `navigation`, `overlay`, `data`, `layout`, `media`, `experimental`, `marketing`, `dashboard`, ...). `CATEGORY_COLORS` (Tailwind text classes), `CATEGORY_BG`, `CATEGORY_BG_HOVER`, `CATEGORY_DESCRIPTIONS`, `LENS_RULE_NAMES` (~16 compatibility rules). `categoryLabel(category)` returns localized name.
- **`lens-category-icons.ts` + `lens-category-icons-domain.ts`** — Icon mappings per category.
- **`subscription-plans.ts`** — `Plan = 'free'|'starter'|'pro'|'enterprise'`. `ALL_ENABLED` = full feature flag map. `PLAN_PRESETS: Record<Plan, FeatureFlags>` with each plan disabling specific premium features. `applyPlanPreset(store, plan)`, `getPresetForPlan(plan)`. Used by HeaderUser to gate features by plan.

## Schemas (`src/lib/schemas/`)

- **`editor-state.ts`** — Valibot `AppPreferencesSchema`, `FeatureFlagsSchema`, `EditorStateSchema` (composition). Constants `SUPPORTED_LOCALES = ['en','ja','zh','ko','fr','de','es']`, `SUPPORTED_THEMES = ['','midnight','warm','forest','ocean','rose','lavender','sunset','slate','copper','aurora','amethyst']`, `SUPPORTED_MODES = ['light','dark','system']`, `SUPPORTED_PLANS = ['free','starter','pro','enterprise']`. Both schemas use `v.optional(field, default)` so partial state validates.
- **`debug-state.ts`** — Re-exports from `@/utils/devtools/debug-state-schema` (`LOG_LEVELS`, `LogLevelSchema`, `DebugStateSchema`, `UrlOverridesSchema`, types) plus `URL_PARAM_PREFIX` from app-meta.

## Locales (`src/lib/locales/`)

- **`schema.ts`** — `EditorLocaleSchema` (Valibot strict object). Namespaces: `meta` (tagline, description), `common` (settings/help/rename/etc.), `sidebar`, `header`, `settings` (theme + 12 themes + language search), `project`, `scenes`, `debug`, `devToolbar`, `home`, `errors`, `data`, `user`. Uses `messageTemplate()` (no params) and `messageTemplate({ param: Schema })` (parametric).
- **`en.ts`/`ja.ts`/`zh.ts`/`ko.ts`/`fr.ts`/`de.ts`/`es.ts`** — Each exports a single named const matching the locale code. All validated against `EditorLocaleSchema` at registry load.
- **`locales.test.ts`** — One test verifies all 7 locale files validate.

## Server data (`src/lib/server/`)

- **`data/types.ts`** — `ServerUserSchema`, `ServerProjectSchema`, `ServerSceneSchema` (all strictObject with id, displayName/name/title, etc.). `DataService` interface: `{ projects: { getByOwner(ownerId): Promise<Result<ServerProject|null>> }, scenes: { getByProject(projectId): Promise<Result<ServerScene[]>> } }`.
- **`data/index.ts`** — `createDataService(_platform?, delayMs = 0): DataService`. Currently always returns `createMockService(delayMs)` regardless of platform — production D1 binding hookup is deferred.
- **`mock/data.ts`** — `MOCK_USER`, `MOCK_PROJECT`, `MOCK_SCENES` (Overworld / Town Interior / Dungeon B1).
- **`mock/service.ts`** — `createMockService(delayMs)` returns a `DataService` with `sleep(delayMs)` calls before returning ok-results. Exports `sleep` helper.

## Test-time mocks (`src/test-mocks/`)

`app-environment.ts`, `app-navigation.ts`, `app-state.ts` — vitest mocks for `$app/environment`, `$app/navigation`, `$app/state`. `test-setup-component.ts` is the global setup that loads them.

## Critical file references

- `src/routes/+layout.svelte` — root layout (CSS only, 15 lines).
- `src/routes/(app)/+layout.svelte` — main editor shell (~600 lines, the centerpiece). Resizable sidebar, mode-watcher sync, streaming data resolution, dev toolbar mount, head/title/breadcrumb derivation.
- `src/routes/(app)/+layout.server.ts` — streams project/scenes via SvelteKit promise data.
- `src/routes/(testing)/+layout.svelte` — Lens documentation shell (~3,585 lines).
- `src/routes/isolate/[name]/+page.svelte` — pixel-perfect component renderer (`screenshot=1` mode strips chrome; `?s=base64JSON` carries cardStyles state).
- `src/lib/server/preview/preview-session.ts` — Live View session manager.
- `src/lib/server/preview/vite-plugin-preview-ws.ts` — WebSocket plugin attached to dev server's HTTP upgrade.
- `src/lib/server/simulator/{ios,android}-pool.ts` — boot-and-reuse simulator/emulator pools.

## Companion memories

- **`storylyne-hooks`** — `hooks.client.ts` + `hooks.server.ts` (telemetry, security headers, locale, error pipeline).
- **`storylyne-routes`** — Full route tree (non-API).
- **`storylyne-api`** — All API endpoints including the dev-only Lens tree.
- **`storylyne-components`** — All `src/lib/components/*.svelte` files.
- **`storylyne-preview-simulator`** — Preview + Simulator subsystems (Live View, scrcpy, simctl, adb).
- **`products-template-app`** — Sibling template scaffolding for new products (NOT a shipped product).

## Notes

- This is the **only** product currently in `packages/products/`. Everything in `packages/products-template/` is scaffolding for new products that don't exist yet.
- The Lens documentation system is intentionally bundled with the editor app rather than as a separate product. The reasoning: Lens needs to render real components in the editor's CSS context (theme custom properties, font faces, layout primitives) to accurately preview them.
- Production beacons (`/api/errors`, `/api/vitals`) and the dev-only Lens API tree share the same route tree — `dev` check inside each handler gates the Lens endpoints.
