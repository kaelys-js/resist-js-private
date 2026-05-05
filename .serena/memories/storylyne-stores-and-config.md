# `@storylyne/editor` — Stores + Config + Schemas + Locales (per-file detail)

> Captured 2026-05-05. Path: `packages/products/storylyne/editor/src/lib/`. Per-file detail for files covered only at summary level in `storylyne-overview`. Do NOT duplicate the high-level architecture content from there.

## Stores (`src/lib/stores/`) — Svelte 5 runes singletons

### `debug-state.svelte.ts`
- **Module-scope singleton**: `_singleton: DebugStore | null`.
- **Functions**: `createDebugStore(initial?)` (factory), `initDebugStore(url)` (creates + applies URL overrides; safe to call multiple times — idempotent), `useDebugStore()` (retrieves the singleton).
- **Constant**: `STORAGE_KEY = storageKey('debug-state')` = `'storylyne:debug-state'`.
- **Internal pattern**: wraps `@/utils/devtools/debug-state-store` with editor-specific `URL_PARAM_PREFIX = 'sto.'`. State: `{ enabled, logLevel, logState, logEvents, logErrors }` plus `urlOverrides` Map.
- **Lifecycle**: `initDebugStore(page.url)` is called from `(app)/+layout.svelte` `$effect` (browser-only), reads URL params via `parseDebugParams` from `lib/utils/url-params`, applies via `applyUrlOverrides(store, debugStore, debugStore.urlOverrides)`.

### `keyboard-shortcuts-store.svelte.ts`
- **Module-scope state**:
  - `_registry: ShortcutRegistry | null` — the loaded registry (lazy-initialized on first access).
  - `shortcutStore: KeyboardShortcutsStore` — exported singleton (a `KeyboardShortcutsStore` class instance).
- **Class**: `KeyboardShortcutsStore` — methods `matches(e, id)`, `format(id)`, `update(id, shortcut)`, `reset(id)`, `resetAll()`, `getAll()`.
- **Helpers**: `load()` (reads localStorage + parses against `ShortcutRegistrySchema`), `save(registry)` (writes back), `stripStateProxies(value)` (strips Svelte 5 reactive `$state` proxies before JSON.stringify — `JSON.stringify` would otherwise include reactive metadata and break round-trip).
- **Constant**: `SHORTCUTS_STORAGE_KEY = storageKey('keyboard-shortcuts')` = `'storylyne:keyboard-shortcuts'`.

### `lens-notifications.svelte.ts`
- **Notification center for the Lens documentation system** (testing routes).
- **Functions**: `pushNotification(input)` (id auto-generated), `pushNotificationBatch(items)`, `markRead(id)`, `markAllRead()`, `removeNotification(id)`, `removeByCategory(category)`, `clearAllNotifications()`, `getNotifications(opts?)`, `getGroupedNotifications()`, `getUnreadCount()`, `isTypeEnabled(type)`, `getPreferences()`, `updatePreferences(patch)`, `resetPreferences()`, `loadNotifications()`, `persistNotifications()`, `persistPreferences()`, `generateId()`.
- **Module-scope state**: `notifications: LensNotification[]` (`$state` ring/array), `preferences: NotificationPreferences` (`$state`), `idCounter: number`.
- **Constants**:
  - `NOTIFICATIONS_KEY = storageKey('notifications')`.
  - `PREFERENCES_KEY = storageKey('notification-preferences')`.
  - `DEFAULT_PREFERENCES`.
- **Schemas/types**:
  - `NotificationTypeSchema` — `'info' | 'success' | 'warning' | 'error'`.
  - `LensNotificationSchema` — strict object with id, type, title, message, category, timestamp, read flag, etc.
  - `NotificationPreferencesSchema` — per-type enable/disable + show-toasts flag.

## Config (`src/lib/config/`)

### `app-meta.ts` — single source of truth for app identity

**App constants**:
- `APP_NAME = 'Storylyne'`, `APP_SHORT_NAME = 'Storylyne'`, `APP_DESCRIPTION`, `APP_TAGLINE = 'Your Story, Rendered'`.
- `APP_ID = '/'`, `APP_SCOPE = '/'`, `APP_START_URL` (PWA manifest fields).
- `APP_DISPLAY = 'standalone'`, `DISPLAY_OVERRIDE` (PWA display modes).
- `APP_CATEGORIES = ['games', 'developer tools', 'design']`.

**Storage prefix**:
- `STORAGE_PREFIX = APP_NAME.toLowerCase()` = `'storylyne'`.
- `URL_PARAM_PREFIX = '${APP_NAME.slice(0,3).toLowerCase()}.'` = `'sto.'`.
- `storageKey(suffix)` returns `'${STORAGE_PREFIX}:${suffix}'`.

**Theme**:
- `THEME_COLORS` — per-theme record `{ light: hex, dark: hex }`. Keyed by theme name (`''` = default, then `midnight`, `warm`, `forest`, `ocean`, `rose`, `lavender`, `sunset`, `slate`, `copper`, `aurora`, `amethyst`).

**PWA**:
- `ICONS: IconEntry[]` — sizes/paths/purposes for the `manifest.webmanifest` icons array.
- `SCREENSHOTS: ScreenshotEntry[]` — PWA screenshot entries.

**Fonts**:
- `FONT_FAMILIES` — primary font stack.
- `FONT_DISPLAY_FAMILIES` — display/headings stack.
- `FONT_FACES: FontFaceEntry[]` — array used to render `@font-face` rules in `app.html` template.

**Security URLs** (used by `.well-known/security.txt`):
- `SECURITY_CONTACT_URL`, `SECURITY_POLICY_URL`, `SECURITY_CANONICAL_URL`, `SECURITY_PREFERRED_LANGUAGES`.

**Schemas** (Valibot strict objects validating each constant at module load):
- `AppDisplaySchema`, `AppCategoriesSchema`, `ThemeColorEntrySchema`, `DisplayOverrideSchema`, `IconEntrySchema`, `ScreenshotEntrySchema`, `FontFaceEntrySchema`.

### `devtools-config.ts`
- **Function**: `getDevtoolsConfig()` returns `DevtoolsConfig` object for `@/utils/devtools` (URL_PARAM_PREFIX, storage prefix, app keys, feature flag keys).
- **Constants**:
  - `APP_KEYS: readonly string[]` — every key from `AppPreferencesSchema` for URL-override targeting.
  - `FEATURE_FLAG_KEYS: readonly string[]` — every key from `FeatureFlagsSchema`.
- These two arrays are the targets the URL override system enumerates when applying `?sto.<key>=<value>` overrides.

### `keyboard-shortcuts.ts` — cross-platform shortcut registry
- **Platform constants**:
  - `IS_MAC: Bool` — feature-detected (or built-time hardcoded for SSR).
  - `MODIFIER_ORDER: ['cmd', 'ctrl', 'alt', 'shift']` — canonical sort order for display.
  - `MAC_SYMBOLS: { cmd: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' }`.
  - `PC_LABELS: { cmd: 'Win', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' }`.
- **Schemas**: `ModifierKeySchema`, `ShortcutContextSchema`, `ShortcutIdSchema`, `KeyboardShortcutSchema`, `ShortcutRegistrySchema`, `ShortcutConflictSchema`.
- **Factory**: `def(id, key, modifiers?)` builds a `KeyboardShortcut` entry.
- **Constants**:
  - `DEFAULT_SHORTCUTS: ShortcutRegistry` — the seed registry.
  - `SHORTCUT_IDS: { TOGGLE_SIDEBAR, TOGGLE_DEV_TOOLBAR, CLOSE_PANEL, DEV_FLAGS_PANEL, ... }` — the canonical id list (used as constants throughout the codebase).
- **Helpers**:
  - `formatShortcut(shortcut, locale?)` — renders to display string (`⌘+\` on Mac, `Ctrl+\` on PC).
  - `matchesShortcut(event, shortcut)` — KeyboardEvent matching.
  - `detectConflicts(registry)` — identifies same-binding-different-id conflicts.
  - `isEditableTarget(event)` — checks if event target is `<input>`/`<textarea>`/`contenteditable` (ignores shortcuts in those).
  - `getAllShortcuts(registry)`, `updateShortcut(registry, id, shortcut)`, `resetShortcut(registry, id)`, `resetAllShortcuts()`.

### `lens-categories.ts`
- **Constants**:
  - `CATEGORY_ORDER: readonly string[]` — display order (`display`, `actions`, `forms`, `feedback`, `navigation`, `overlay`, `data`, `layout`, `media`, `experimental`, `marketing`, `dashboard`, ...).
  - `CATEGORY_COLORS: Record<string, string>` — Tailwind text classes per category.
  - `CATEGORY_BG: Record<string, string>` — Tailwind background classes.
  - `CATEGORY_BG_HOVER: Record<string, string>` — hover variant.
  - `CATEGORY_DESCRIPTIONS: Record<string, string>` — human-readable description per category.
  - `LENS_RULE_NAMES: readonly string[]` — ~16 compatibility rule names for the Lens validator.
- **Function**: `categoryLabel(category) → Str` — returns localized name (falls back to category id).

### `lens-category-icons.ts` + `lens-category-icons-domain.ts`
Icon mappings (Lucide imports) per Lens category. Two files split: the first maps generic categories, the second maps domain-specific subcategories. Used by Lens UI for sidebar icons.

### `subscription-plans.ts`
- **Type**: `Plan = 'free' | 'starter' | 'pro' | 'enterprise'`.
- **Constants**:
  - `ALL_ENABLED: FeatureFlags` — every feature flag set to true (`pro`/`enterprise` baseline).
  - `PLAN_PRESETS: Record<Plan, FeatureFlags>` — each plan disables specific premium features.
- **Functions**:
  - `getPresetForPlan(plan): FeatureFlags`.
  - `applyPlanPreset(store, plan)` — mutates the editor store to match the selected plan.
- Used by `HeaderUser.svelte` to gate features by plan.

## Schemas (`src/lib/schemas/`)

### `editor-state.ts`
- **Schemas**:
  - `AppPreferencesSchema` — strictObject with `appName`, `theme`, `mode`, `locale`, `sidebarOpen`, `userName`, `userEmail`, `userAvatar`, `subscriptionPlan`, `mockDataDelay`. All optional with defaults via `v.optional(field, default)`.
  - `FeatureFlagsSchema` — strictObject with ~30 boolean flags (settings, themeSelection, languageSelection, modeToggle, sidebar, sidebarHome, sceneList, resizableSidebar, breadcrumb, sidebarToggle, sidebarHelp, headerUserDropdown, headerUserAvatar, headerUserAccount, headerUserSubscription, headerUserNotifications, headerUserShortcuts, headerUserSettings, headerUserWhatsNew, headerUserLogout, projectDropdown, projectDropdownIcon, projectDropdownSettings, appIconInSidebar, appNameInSidebar, emptyScenePlaceholder, authGatedUi, etc.).
  - `EditorStateSchema` — composition `{ app: AppPreferencesSchema, features: FeatureFlagsSchema }`.
- **Constants**:
  - `SUPPORTED_LOCALES = ['en','ja','zh','ko','fr','de','es']`.
  - `SUPPORTED_THEMES = ['', 'midnight', 'warm', 'forest', 'ocean', 'rose', 'lavender', 'sunset', 'slate', 'copper', 'aurora', 'amethyst']`.
  - `SUPPORTED_MODES = ['light', 'dark', 'system']`.
  - `SUPPORTED_PLANS = ['free', 'starter', 'pro', 'enterprise']`.

### `debug-state.ts`
- Re-exports from `@/utils/devtools/debug-state-schema`: `LOG_LEVELS`, `LogLevelSchema`, `DebugStateSchema`, `UrlOverridesSchema`, plus types `DebugState`, `LogLevel`, `UrlOverrides`.
- Re-exports `URL_PARAM_PREFIX` from `$lib/config/app-meta` (mostly as a convenience — same constant from a different module).

## Locales (`src/lib/locales/`)

### `schema.ts`
- **`EditorLocaleSchema`** — Valibot strictObject with namespace sub-schemas:
  - `meta` — `tagline`, `description({ appName })`.
  - `common` — `settings`, `help`, `rename`, `duplicate`, `delete`, `cancel`, `save`, `close`, `loading`, `skipToContent`, `toggleMode`, `sidebarLabel`, `more`.
  - `sidebar` — `home`, `scenes`, `newScene`.
  - `header` — `account`, `notifications`, `subscription`, `whatsNew`, etc.
  - `settings` — `appearance`, `theme`, `language`, `toggleTheme`, `light`, `dark`, plus 12 themes (`midnight`, `warm`, `forest`, `ocean`, `rose`, `lavender`, `sunset`, `slate`, `copper`, `aurora`, `amethyst`), `languageSearch`.
  - `project` — `selectProject`, `projectSettings`, etc.
  - `scenes` — `untitled`, `addScene`, etc.
  - `debug` — debug toolbar strings.
  - `devToolbar` — dev toolbar strings.
  - `home` — `welcome({ appName })`, `selectScene`, `orCreateNew`.
  - `errors` — `genericTitle`, `genericDescription`, `errorId({ id })`, `badRequestTitle`, `forbiddenTitle`, `notFoundTitle`, `serverErrorTitle`, plus descriptions per status.
  - `data` — data layer strings.
  - `user` — user account strings.

### Per-locale files (`en.ts`, `ja.ts`, `zh.ts`, `ko.ts`, `fr.ts`, `de.ts`, `es.ts`)

Each file exports a single named const (matching the locale code) — a `MyRawStrings` object validated against `EditorLocaleSchema` at registry load via `safeParse`.

The `i18n.svelte.ts` store discovers them via `import.meta.glob('../locales/!(*schema|*.test).ts', { eager: true })` (excludes `schema.ts` and `*.test.ts`), then takes the first named export of each module.

### `locales.test.ts`
Validates that every locale file passes `safeParse(EditorLocaleSchema, locale)`. Catches missing keys, extra keys, and placeholder mismatches at CI time.

## Lib utils (`src/lib/utils/`)

### `url-params.ts`
- **Type**: `DebugStoreLike` — minimal interface for a debug store (just the methods this util needs).
- **Constants**:
  - `APP_ENTRIES: readonly { key: string; type: 'string' | 'boolean' | 'number' }[]` — derived from `APP_KEYS` with type info.
  - `FLAG_ENTRIES: readonly { key: string; type: 'boolean' }[]` — derived from `FEATURE_FLAG_KEYS`.
- **Functions**:
  - `parseDebugParams(searchParams) → UrlOverrides` — parses `?sto.<key>=<value>` query params into a typed override map.
  - `applyUrlOverrides(editorStore, debugStore, overrides)` — applies parsed overrides to both stores.
  - `isValidAppKey(key): Bool` — type guard for `APP_KEYS`.
  - `isValidFeatureFlag(key): Bool` — type guard for `FEATURE_FLAG_KEYS`.

These utils are called from `(app)/+layout.svelte` during `initDebugStore` to bootstrap reactive overrides from URL state.

## Cross-references

- `storylyne-overview` — high-level architecture, file inventory, package dependencies.
- `storylyne-routes` — routes that consume these stores.
- `storylyne-hooks` — `hooks.client.ts` / `hooks.server.ts` integration (sets initial server-supplied state).
- `i18n-system` — cross-cutting locale infrastructure (`@/locale` package).
