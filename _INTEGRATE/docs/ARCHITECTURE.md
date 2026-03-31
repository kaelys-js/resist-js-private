# WebForge Architecture

## Overview

WebForge RPG is a web-based RPG creation suite built on Babylon.js. The project uses a pnpm monorepo managed by Turborepo, with shared packages providing foundational utilities and product packages delivering the editor, runtime engine, and plugin API.

The runtime engine renders HD-2D tile-based worlds with a full visual pipeline: GPU data texture tilemap rendering (1 draw call per layer, unlimited map size via streaming), thin-instance object renderer, 16 camera presets, day/night cycle, 3-tier fog, post-processing (12 effects), screen transitions (53 types), screen shake (18 presets), sky/parallax backgrounds, and a complete lighting system with shadows, god rays, lens flares, and glow.

## Workspace Structure

```
webforge/
├── packages/
│   ├── shared/                           Foundational libraries
│   │   ├── schemas/common/               Valibot primitive types: Str, Num, Bool, Path
│   │   ├── schemas/result/               Result<T>, AppError, ERRORS registry
│   │   ├── schemas/function/             Function schema validation
│   │   ├── schemas/generic/              Generic schema factories
│   │   ├── utils/result/                 safeParse, combinators, format, breadcrumbs
│   │   ├── utils/core/                   Logger, signal, object, environment
│   │   ├── locale/                       i18n: template, format, registry, detect
│   │   └── config/test/                  Vitest presets + test harness
│   └── products/
│       └── storylyne/
│           ├── editor/                   SvelteKit + shadcn-svelte editor UI
│           ├── runtime/                  Babylon.js HD-2D game engine
│           │   ├── src/
│           │   │   ├── schemas/          Valibot config schemas (11 files)
│           │   │   ├── core/             Engine, camera, shake, Perlin, perf monitor
│           │   │   └── rendering/        All visual systems (tilemap, lighting, fog, etc.)
│           │   └── dev/                  Dev harness (visual testing UI)
├── docs/                                 Unified documentation
│   ├── ARCHITECTURE.md                   This file
│   ├── runtime/                          Runtime engine docs
│   ├── dev-harness/                      Dev harness usage
│   └── shared/                           Shared packages docs
└── CLAUDE.md                             AI assistant instructions
```

## Module Dependency Graph

```
                            ┌─────────────┐
                            │   runtime    │
                            │  (runtime.ts)│
                            └──────┬───────┘
                                   │ orchestrates
                    ┌──────────────┼──────────────────┐
                    │              │                   │
              ┌─────▼─────┐ ┌─────▼──────┐  ┌────────▼────────┐
              │   engine   │ │   camera   │  │  scene-setup     │
              │ (core/)    │ │ controller │  │ (rendering/)     │
              └─────┬──────┘ └─────┬──────┘  └────────┬────────┘
                    │              │                   │
                    │              │         ┌─────────┼─────────┐
                    │              │         │         │         │
              ┌─────▼──────┐      │   ┌─────▼───┐ ┌───▼────┐ ┌─▼──────────┐
              │ performance│      │   │ tilemap  │ │lighting│ │post-process│
              │  monitor   │      │   │ renderer │ │manager │ │  pipeline  │
              └────────────┘      │   └─────┬────┘ └───┬────┘ └─────┬──────┘
                                  │         │          │            │
                    ┌─────────────┘    ┌────┴────┐  ┌──┴──────┐    │
                    │                  │  chunk  │  │day/night│    │
              ┌─────▼──────┐           │ builder │  │  cycle  │    │
              │  screen    │           └────┬────┘  └─────────┘    │
              │   shake    │                │                      │
              └────────────┘           ┌────┴──────────────────────┘
                                       │
                              ┌────────┼────────────────┐
                              │        │                │
                        ┌─────▼──┐ ┌───▼─────┐  ┌──────▼──────┐
                        │  fog   │ │  sky &   │  │ transitions │
                        │manager │ │parallax  │  │   manager   │
                        └────────┘ └─────────┘  └─────────────┘
```

## Core Patterns

### Result Pattern

Every function returns `Result<T>` — the codebase never throws exceptions in normal control flow. Errors propagate via `if (!result.ok) return result;`.

```typescript
import { safeParse } from '@/utils/result/safe';
import { ERRORS, err, ok, type Result } from '@/schemas/result/result';

const result = safeParse(EngineConfigSchema, input);
if (!result.ok) return result;
const config = result.data;
```

### Schema-Driven Configuration

All runtime systems are configured via Valibot schemas with sensible defaults. An empty `{}` input produces a fully working configuration. Per-system overrides merge on top of preset bases.

The 11 schema files define 300+ configurable fields across engine, camera, scene setup, fog (77+ options), quality, lighting, post-processing (12 effects), screen shake, transitions (53 types), sky/parallax, and map data.

### Chunk-Based Rendering

The tilemap uses a chunk-based merged geometry approach: the map is divided into 16x16 tile chunks, each becoming a single merged Babylon.js Mesh per layer. This yields one draw call per chunk per layer, with natural frustum culling and fast partial rebuilds.

## Runtime Systems

| System | Schema | Implementation | Docs |
|--------|--------|----------------|------|
| Engine | `engine-config.ts` | `core/engine.ts` | [engine.md](runtime/engine.md) |
| Camera | `camera-config.ts` | `core/camera-controller.ts` | [camera.md](runtime/camera.md) |
| Screen Shake | `screen-shake-config.ts` | `core/screen-shake.ts` | [screen-shake.md](runtime/screen-shake.md) |
| Tilemap | `map-data.ts` | `rendering/tilemap-renderer.ts` | [tilemap.md](runtime/tilemap.md) |
| Lighting | `lighting-config.ts` | `rendering/light-manager.ts` | [lighting.md](runtime/lighting.md) |
| Day/Night Cycle | `lighting-config.ts` | `rendering/day-night-cycle.ts` | [day-night-cycle.md](runtime/day-night-cycle.md) |
| Glow Layer | `lighting-config.ts` | `rendering/glow-manager.ts` | [glow-layer.md](runtime/glow-layer.md) |
| Fog | `fog-config.ts` | `rendering/fog-manager.ts` | [fog.md](runtime/fog.md) |
| Sky & Parallax | `sky-config.ts` | `rendering/sky-system.ts` | [sky-and-parallax.md](runtime/sky-and-parallax.md) |
| Post-Processing | `post-processing-config.ts` | `rendering/post-processing.ts` | [post-processing.md](runtime/post-processing.md) |
| Transitions | `transition-config.ts` | `rendering/transition-manager.ts` | [transitions.md](runtime/transitions.md) |
| Screen Effects | `scene-setup-config.ts` | `rendering/scene-setup.ts` | [screen-effects.md](runtime/screen-effects.md) |

## Shared Packages

| Package | Alias | Purpose |
|---------|-------|---------|
| `schemas/common` | `@/schemas/common` | Valibot primitive types (Str, Num, Bool, Path) |
| `schemas/result` | `@/schemas/result` | Result pattern, AppError, ERRORS registry |
| `schemas/function` | `@/schemas/function` | Function schema validation |
| `schemas/generic` | `@/schemas/generic` | Generic schema factories |
| `utils/result` | `@/utils/result` | safeParse, combinators, formatting |
| `utils/core` | `@/utils/core` | Logger, signal, object, environment |
| `locale` | `@/locale` | i18n template, format, registry, detect |
| `config/test` | `@/test-presets` | Vitest presets + test harness |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict) |
| Schema Validation | Valibot |
| 3D Engine | Babylon.js (WebGPU / WebGL2) |
| Editor UI | SvelteKit + Svelte 5 + shadcn-svelte |
| Testing | Vitest |
| Linting | oxlint + Biome |
| Formatting | Biome (tabs, single quotes, semicolons) |
| Monorepo | pnpm workspaces + Turborepo |
| Node | >= 25 |

## Autotile System

The runtime supports RPG Maker A2-format autotiles for automatic terrain edge/corner transitions:

### Pipeline

1. **Source format:** 2×3 tile blocks (64×96px at 32px) — RPG Maker A2 terrain format
2. **Sub-tile grid:** Each source is a 4×6 grid of quarter-tiles (16×16px at 32px) containing center, edge, and corner sub-tile variants
3. **Expansion:** `FLOOR_AUTOTILE_TABLE` (48 entries) maps each shape to 4 sub-tile coordinates; `expandAutotileSource()` composes 48 full tiles from the sub-tile grid → outputs 8×6 grid (256×192px at 32px)
4. **Build-time CLI:** `expand-autotiles.ts` pre-expands all 2×3 source PNGs to 8×6 expanded PNGs; `split-a2-atlas.ts` splits RPG Maker A2 atlases into individual 2×3 sources
5. **Runtime detection:** `tileset-loader.ts` detects `autotileType: 'terrain_48'` with `columns: 2, rows: 3` and overrides UV computation to 8×6 grid
6. **Tile resolution:** `autotile-resolver.ts` converts 8-bit neighbor bitmasks → shape frame indices via `BITMASK_TO_FRAME`

### Key Modules

| Module | Purpose |
|--------|---------|
| `autotile-expander.ts` | Sub-tile composition: 2×3 source → 8×6 expanded grid |
| `autotile-resolver.ts` | Bitmask → frame index mapping (256 → 48 entries) |
| `tileset-loader.ts` | UV computation + compact autotile detection |
| `expand-autotiles.ts` | Build-time CLI for batch PNG expansion |
| `split-a2-atlas.ts` | Build-time CLI for splitting A2 atlases |

### Adding New Terrain Types

1. Place the 2×3 source PNG in `assets/tilesets/lpc-terrain/autotile/`
2. Run `expand-autotiles.ts` to generate the 8×6 expanded version
3. Add a tileset config with `autotileType: 'terrain_48'`, `columns: 2`, `rows: 3`
4. The tileset loader auto-adjusts UV grid to 8×6 at runtime

## Dev Harness Test Map

The dev harness (`dev/test-map.ts` + `dev/dev.ts`) includes a hand-crafted 32×32 RPG village test map with:

- **7 terrain zones:** Forest (NW), Village (CW), River (center column), Lake/Shore (SW), Cliff Plateau (NE), Ruins (on cliff), Meadow/Farm (SE)
- **14 tilesets:** 6 autotile terrain (grass, dark grass, dirt, cobble, water, sand — 48 tiles each via A2 expansion) + 8 decoration (plants, trees, cliffs, flowers, mushrooms, wildflowers, rocks, cliff rocks, tilled soil)
- **Multi-level height map:** Level 0 (water), Level 1 (ground), Level 2 (hillside), Level 3 (cliff top)
- **Procedural 3D props:** Babylon.js meshes (cottages, well, torch posts, bridge, boulders, barrels, crates, fences) placed at height-aware positions
- **Season switching:** Summer, Spring, Autumn, Winter — swaps autotile and decoration tileset image paths, disposes and re-renders tilemap
- **6 atmosphere presets:** Sunny Village, Dusk, Night Market, Foggy Forest, Cliff Panorama, Stormy — each adjusts time, fog, torches, and post-FX
- **Dev harness controls:** Test Map sidebar section with 3D Props toggle, Prop Shadows toggle, Torch Lights toggle, Torch Glow toggle, Prop Opacity slider, Season dropdown, Atmosphere dropdown

The test map showcases every rendering feature: fog, shadows, glow, height map, day/night cycle, point lights, volumetric lighting, and post-processing effects.

## Browser Configuration & App Metadata

All browser configuration (manifest, robots.txt, security.txt, meta tags) is generated from a single source of truth: `editor/src/lib/config/app-meta.ts`.

| File | Type | Description |
|------|------|-------------|
| `app-meta.ts` | Config module | App identity (name, description), theme colors (12 themes × light/dark hex), icon definitions, security contact info |
| `manifest.webmanifest/+server.ts` | Prerendered route | PWA manifest with all required fields (name, id, scope, categories, icons) |
| `robots.txt/+server.ts` | Prerendered route | Blocks AI training crawlers (GPTBot, CCBot, etc.), allows AI search (ChatGPT-User, Claude-Web) |
| `.well-known/security.txt/+server.ts` | Prerendered route | RFC 9116 security contact (Expires auto-set to build date + 1 year) |
| `+layout.svelte` | Dynamic meta | `theme-color` meta tags react to `store.app.theme` via THEME_COLORS map |
| `app.html` | Static template | Apple PWA meta tags (capable, status-bar-style, title) |

**Theme colors:** Light mode is always `#ffffff` for all themes. Dark mode background varies per theme (oklch values in `app.css` → pre-computed hex in `app-meta.ts`). The `THEME_COLORS` map covers all 12 themes in `SUPPORTED_THEMES`.

All `+server.ts` routes use `export const prerender = true` — adapter-static generates static files at build time.

## Editor Debug / Developer Mode

The editor includes a full debug system activated via URL params (`?wf.debug=true`) or programmatically. When enabled, it provides:

| Feature | Description |
|---------|-------------|
| **Devtools API** | `window.__EDITOR_DEVTOOLS__` — state inspection, generic `set(path, value)`, convenience setters, extension registry |
| **State Logger** | Console logging of all store mutations with styled badges, old/new diffs, timestamps (requires logLevel `debug` or `trace`) |
| **URL Overrides** | `wf.*`-prefixed query params: `?wf.debug=true&wf.theme=midnight&wf.logLevel=trace&wf.ff.settings=false` |
| **Extension Registry** | `register(namespace, api)` / `unregister(namespace)` for custom devtools namespaces |
| **Welcome Banner** | Rich console output on activation: current state, feature flags, URL overrides, API reference |

### Key Modules

| Module | Path | Purpose |
|--------|------|---------|
| `debug-state.ts` | `schemas/` | Valibot schemas for debug config (LogLevel, DebugState, UrlOverrides) |
| `url-params.ts` | `utils/` | Parse `wf.*` URL params, apply overrides to stores |
| `console-styles.ts` | `debug/` | CSS badge styles, timestamp formatting, snapshot diffing |
| `debug-state.svelte.ts` | `stores/` | Reactive debug store with localStorage persistence |
| `state-logger.svelte.ts` | `debug/` | `$effect`-based state change watcher with log level filtering |
| `devtools-api.svelte.ts` | `debug/` | Window global API factory with auto-discovered setters |
| `init.svelte.ts` | `debug/` | Orchestrator: activate/sync lifecycle for all debug services |

### Auto-Discovery

The debug system uses Valibot schema introspection (`Schema.entries`) to auto-discover state fields and feature flags. Adding new fields to `AppPreferencesSchema` or `FeatureFlagsSchema` requires **zero changes** to the debug system — URL overrides, devtools API, state logging, and the Dev Toolbar pick them up automatically.

### Dev Toolbar

A floating Astro-style developer toolbar rendered at the bottom center of the viewport when debug mode is active. The toolbar provides in-browser control of all editor state without opening devtools.

| Module | Path | Purpose |
|--------|------|---------|
| `dev-toolbar-registry.ts` | `debug/` | Schema introspection: discovers feature flags, app preferences, and debug fields from Valibot schemas at runtime |
| `DevToolbar.svelte` | `components/` | Root toolbar: trigger pill, expandable icon bar, panel management, keyboard shortcuts |
| `DevToolbarFeatureFlags.svelte` | `components/` | Feature flags panel: Switch per flag, search filter, Enable/Disable All, badge count |
| `DevToolbarAppState.svelte` | `components/` | App preferences panel: auto-mapped Select/Switch/Input controls per field type |
| `DevToolbarDebug.svelte` | `components/` | Debug panel: log level, quick actions, URL overrides, build info section with Copy Build Info |

**Keyboard shortcuts:**
- `Ctrl+Shift+D` — toggle toolbar visibility (also enables debug mode if inactive)
- `Escape` — close the active panel

**Architecture:** The toolbar uses the same Valibot schema introspection as the devtools API. The `dev-toolbar-registry.ts` module walks `FeatureFlagsSchema.entries`, `AppPreferencesSchema.entries`, and `DebugStateSchema.entries` to determine field types (boolean → Switch, picklist → Select, string → Input), extract option lists, and read defaults. Adding a new field to any schema automatically creates a corresponding UI control in the toolbar — zero manual wiring required.

**Styling:** The toolbar uses a fixed dark theme (zinc/slate colors) independent of the app's current theme, ensuring consistent readability regardless of light/dark mode.

**Accessibility:** The toolbar follows the WAI-ARIA Toolbar pattern with roving tabindex (`ArrowLeft`/`ArrowRight`/`Home`/`End` navigation), `Escape` to close, and automatic focus management into panel content.

## Header User Dropdown

A user avatar dropdown in the SiteHeader, providing account-related navigation items.

### Component

`HeaderUser.svelte` (`$lib/components/`) — renders a ghost-styled trigger button with an avatar (image or monogram fallback), opening a `DropdownMenu` with 3 groups: Account (Account, Subscription, Notifications), Tools (Keyboard Shortcuts, Settings, What's New), and Log Out (`variant="destructive"`).

Integrated into `SiteHeader.svelte` before the ModeToggle, gated by `headerUserDropdown` feature flag.

### Feature Flags (9)

`headerUserDropdown`, `headerUserAvatar`, `headerUserAccount`, `headerUserSubscription`, `headerUserNotifications`, `headerUserShortcuts`, `headerUserSettings`, `headerUserWhatsNew`, `headerUserLogout`

### State Fields

| Field | Schema | Default | Description |
|-------|--------|---------|-------------|
| `userName` | `v.pipe(v.string(), v.minLength(1))` | `'User'` | Display name, drives monogram |
| `userEmail` | `v.string()` | `''` | Shown below name in dropdown label |
| `userAvatar` | `v.string()` | `''` | Avatar image URL; empty = monogram fallback |
| `subscriptionPlan` | `v.picklist(SUPPORTED_PLANS)` | `'pro'` | Plan tier; controls feature flag presets |

### Locale Namespace

`user` — 9 keys: `user`, `account`, `subscription`, `notifications`, `keyboardShortcuts`, `settings`, `whatsNew`, `logout`, `userMenu`. All 7 locale files (en, ja, zh, ko, fr, de, es) include translations.

### Tests

- **Unit:** `header-user.test.ts` — trigger rendering, aria-label, monogram fallback
- **Integration:** `feature-flags.integration.test.ts` — HeaderUser feature flag toggling
- **E2E:** `e2e/header-user.test.ts` — trigger visibility, dropdown interaction, menu items, Escape close, destructive styling, URL override

## Subscription Plans

Subscription plan tiers that control feature flag presets. Changing the plan bulk-applies a set of feature flag overrides while keeping individual flags overridable in the dev toolbar.

### Plan Tiers

| Plan | Flags Disabled | Description |
|------|---------------|-------------|
| `free` | 10 | No settings, themes, languages, resizable sidebar, project dropdown, shortcuts |
| `starter` | 3 | No project dropdown settings, shortcuts, or settings in user menu |
| `pro` | 0 | All features enabled (default) |
| `enterprise` | 0 | All features enabled |

### Module

`subscription-plans.ts` (`$lib/config/`) — defines `PLAN_PRESETS` mapping each tier to its disabled flags, `getPresetForPlan(plan)` for partial overrides, and `applyPlanPreset(plan)` for complete flag sets. The `ALL_ENABLED` baseline is derived from `FeatureFlagsSchema` introspection.

### Store Integration

`EditorStore.setSubscriptionPlan(plan)` validates the plan, updates `app.subscriptionPlan`, calls `applyPlanPreset()` to bulk-reset all flags, and persists to localStorage. Individual `setFeature()` calls still work after a plan change for dev testing.

### Dev Toolbar

The `subscriptionPlan` picklist is auto-discovered from `AppPreferencesSchema` and rendered in the User section of the App Preferences panel. Selecting a plan immediately updates the Feature Flags panel reactively.

### Locale Keys

`devToolbar` namespace — `planFree`, `planStarter`, `planPro`, `planEnterprise` (tier display names), `subscriptionPlan` (control label). All 7 locale files include translations.

## Destructive Menu Item Pattern

Destructive actions (Delete Scene, Log Out) use `variant="destructive"` on `DropdownMenu.Item`, which sets `data-variant="destructive"` in the DOM. The component's CSS conditionally applies `text-destructive`, `bg-destructive/10` highlight, and `!text-destructive` on child SVG icons via Tailwind data-attribute selectors. This replaces manual `text-destructive` class application.

### Usage

- `NavScenes.svelte` — Delete Scene item
- `HeaderUser.svelte` — Log Out item

## Project & User Data

Server-side data loading system that provides user, project, and scene data to all editor routes. Uses a DataService abstraction for mock data in development, designed to swap to Cloudflare D1 in production.

### Data Flow

```
hooks.server.ts         → resolveAuth(url)        → event.locals.user
                        → createDataService()      → event.locals.db
+layout.server.ts       → locals.db.projects/scenes → { user, project, scenes }
+layout.svelte          → data.user/project/scenes  → AppSidebar, SiteHeader props
AppSidebar              → NavUser(project)          → Project name/subtitle
                        → NavScenes(scenes)         → Scene list or EmptyScenes
SiteHeader              → HeaderUser (if user)      → User avatar dropdown
```

### DataService Abstraction

`DataService` interface (`$lib/server/data/types.ts`) with two method groups:

| Method | Returns | Description |
|--------|---------|-------------|
| `projects.getByOwner(ownerId)` | `Result<ServerProject \| null>` | Find project by owner ID |
| `scenes.getByProject(projectId)` | `Result<ServerScene[]>` | List scenes for a project |

Factory function `createDataService(platform?)` returns `MockDataService` in dev. When Cloudflare D1 is available via `platform.env.DB`, it will return a D1-backed implementation.

### Auth Gating

Components use the pattern `(!store.features.authGatedUi || user)` to conditionally hide when no user is authenticated:

- **SiteHeader:** HeaderUser dropdown hidden when logged out
- **AppSidebar:** Scene list, project dropdown, and Settings hidden when logged out
- **Always visible:** Help link, breadcrumb, sidebar branding

### URL Override

`?wf.auth=false` — server-side parameter in `hooks.server.ts` that simulates a logged-out state. Sets `locals.user` to `null`, causing `+layout.server.ts` to return no user/project/scene data.

### Mock Data

Constants in `$lib/server/mock/data.ts`:

| Constant | Value |
|----------|-------|
| `MOCK_USER` | Coleb (coleb@example.com) |
| `MOCK_PROJECT` | "My First RPG" / "An HD-2D Adventure" |
| `MOCK_SCENES` | Overworld, Town Interior, Dungeon B1 |

### Feature Flags (3)

| Flag | Default | Controls |
|------|---------|----------|
| `authGatedUi` | `true` | Auth-gating of scene list, project dropdown, Settings, HeaderUser |
| `emptyScenePlaceholder` | `true` | Empty state component when project has no scenes |
| `skeletonLoading` | `true` | Skeleton loading components (prepared for D1 streaming) |

### Locale Namespace

`data` — 6 keys: `loading`, `noScenes`, `noScenesDescription`, `newScene`, `signInPrompt`, `signIn`. All 7 locale files include translations.

### Skeleton Components

`NavScenesSkeleton.svelte` and `NavUserSkeleton.svelte` — shadcn Skeleton-based loading placeholders. Not wired to streaming in the mock data phase; ready for `{#await}` integration when D1 is connected.

### Tests

- **Unit:** `types.test.ts` (schema validation), `service.test.ts` (mock service), `empty-scenes.test.ts` (empty state component)
- **Integration:** `feature-flags.integration.test.ts` — auth-gating and empty scene placeholder flag tests
- **E2E:** `e2e/project-user-data.test.ts` — default state, `?wf.auth=false` override

## Accessibility (WCAG 2.2 AA)

The editor targets WCAG 2.2 Level AA conformance across all custom components (shadcn-svelte primitives provide their own ARIA).

### Skip Navigation & Landmarks

`+layout.svelte` provides a skip link (`<a href="#main-content">`) as the first focusable element, a `<main id="main-content" tabindex={-1}>` landmark, and an `aria-live="polite"` region for screen reader announcements.

### Screen Reader Announcements

The `announce.svelte.ts` utility (`@/ui/announce/`) provides a reactive announcement pattern:

```typescript
import { announce } from '@/ui/announce/announce.svelte';
announce('3 results found');  // Spoken by screen readers via aria-live region
```

Uses Svelte 5 `$state()` with a `requestAnimationFrame` gap to ensure DOM mutation is detected by assistive technology.

### ARIA Patterns

| Pattern | Where | Implementation |
|---------|-------|----------------|
| `aria-hidden="true"` | Decorative Lucide icons | Prevents icon names from cluttering screen reader output |
| `aria-current="page"` | Active scene in NavScenes | Identifies the currently selected scene |
| `aria-current="true"` | Active theme/language in dropdowns | Identifies the selected item |
| `aria-label` | Sidebar, ModeToggle, copy buttons | Localized via `t(localeStore.t.*.key, 'fallback')` |
| `role="separator"` | SiteHeader divider | Overrides Bits UI default to provide correct semantics |
| `textValue` | DropdownMenu items | Provides accessible name for items with complex content |
| Roving tabindex | DevToolbar | Arrow key navigation with `tabindex={0 | -1}` |

### Motion Safety

`app.css` includes a `prefers-reduced-motion: reduce` media query that disables all CSS animations and transitions. `AppLogo.svelte` has a component-level override for its keyframe animations.

### Contrast & Target Size

- Focus ring (`--ring`) uses `oklch(0.556 0 0)` for 3:1+ contrast against both light and dark backgrounds (SC 1.4.11)
- All interactive elements meet the 24x24px minimum target size (SC 2.5.8) — `scale-75` removed from Switch components
- `<kbd>` elements in DevToolbar use `bg-secondary` for sufficient contrast

### Locale Keys

Accessibility strings are in the `common` namespace: `skipToContent`, `toggleMode`, `sidebarLabel`, `more`. All 7 locale files (en, ja, zh, ko, fr, de, es) include translations.

### E2E Coverage

`e2e/accessibility.test.ts` covers skip link visibility, main landmark, aria-live region, sidebar label, SiteHeader separator, ModeToggle label, active scene state, and DevToolbar keyboard navigation.

## Security Headers & Response Hardening

The editor applies security headers through two complementary mechanisms:

| Mechanism | When | Where |
|-----------|------|-------|
| `hooks.server.ts` | Dev (`vite dev`) and preview (`pnpm preview`) | Response headers set in `handle` hook |
| `static/_headers` | Production static hosting (Cloudflare Pages, Netlify) | Platform reads this file and applies headers to all responses |

### Headers Applied

| Header | Value | Notes |
|--------|-------|-------|
| X-Frame-Options | DENY | Prevents clickjacking |
| X-Content-Type-Options | nosniff | Prevents MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Safe default for navigation |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), interest-cohort=() | Blocks device APIs and FLoC |
| Cross-Origin-Opener-Policy | same-origin-allow-popups | Allows OAuth popups |
| Cross-Origin-Resource-Policy | same-origin | Prevents cross-origin reads |
| Cross-Origin-Embedder-Policy | unsafe-none | Safe default; upgrade to credentialless for SharedArrayBuffer |
| X-DNS-Prefetch-Control | off | OWASP recommended |
| X-Permitted-Cross-Domain-Policies | none | Blocks Flash/Acrobat cross-domain |
| X-XSS-Protection | 0 | Explicitly disabled (CSP replaces it) |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | **Prod-only** — breaks localhost |
| Cache-Control | private, no-cache | HTML responses only (skips `/_app/immutable/` paths) |

### CSP (Content Security Policy)

Configured via `kit.csp` in `svelte.config.js` with `mode: 'hash'`. Disabled in dev to avoid Vite HMR script conflicts. In production, SvelteKit embeds CSP as `<meta>` tags with hashes for prerendered pages. The `static/_headers` file provides CSP for the SPA fallback page.

Key directives for Babylon.js compatibility: `wasm-unsafe-eval` (WebAssembly), `blob:` in worker-src/child-src (web workers), `data:` + `blob:` in img-src (generated textures).

### Dev Guard

`hooks.server.ts` imports `dev` from `$app/environment` and splits headers into `BASE_HEADERS` (always applied) and `PROD_HEADERS` (production only). HSTS is the only prod-only header since it breaks localhost.

## Build Info & Error Handling

### Build-Time Metadata

Vite `define` constants inject git and version info at compile time. The `BuildInfoSchema` (Valibot) validates these constants, and `getBuildInfo()` returns `Result<BuildInfo>`.

| Constant | Source | Example |
|----------|--------|---------|
| `__APP_VERSION__` | `package.json` version | `0.1.0` |
| `__GIT_COMMIT__` | `git rev-parse --short HEAD` | `abc1234` |
| `__GIT_COMMIT_FULL__` | `git rev-parse HEAD` | `abc1234...` (40 chars) |
| `__GIT_BRANCH__` | `git rev-parse --abbrev-ref HEAD` | `main` |
| `__GIT_DIRTY__` | `git diff --quiet` exit code | `true` / `false` |
| `__BUILD_TIMESTAMP__` | `new Date().toISOString()` | `2026-03-04T...` |

**Window global:** `window.__STORYLYNE_BUILD__` is set in `+layout.svelte` on client init, exposing validated `BuildInfo` to browser devtools.

**Response headers:** `handle` hook adds `X-App-Version` and `X-Git-Commit` to every response for debugging deployed instances.

**SvelteKit version:** `kit.version.name` in `svelte.config.js` is set to the git commit hash for client-side cache invalidation.

### Enhanced Error Logging

Both `hooks.server.ts` and `hooks.client.ts` call `setupGlobalErrorHandling()` with ambient context (release, tags, serverName) so every `CapturedError` automatically carries build and environment metadata.

**Server (`hooks.server.ts`):** Structured JSON logging via `logCapturedError` includes AppError fields (help, source, related), CapturedError fields (contexts, release, serverName), and request metadata (locale, userAgent, referer, searchParams, isDataRequest).

**Client (`hooks.client.ts`):** Console group logging via `logErrorToConsole` renders Release/Server entries, Tags, User context, Contexts, Help suggestions, Source pointers, and Related errors in styled console output.

## Client Observability

Real-time Web Vitals collection, beacon reporting, and connection quality awareness powered by Perfume.js.

### Architecture

```
Browser (Perfume.js)
  → analyticsTracker callback
    → logVital()          — colorized %c console output (dev only)
    → reportVitalToPanel() — pushes to DevToolbarPerf reactive store
    → queueVital()        — adds to beacon queue
    → updateFromNavigatorInfo() — updates connection quality state
      ↓
Beacon queue (max 10 metrics)
  → flushVitals() on visibilitychange / queue full
    → navigator.sendBeacon('/api/vitals', payload)
      ↓
/api/vitals POST endpoint
  → validates VitalsBeaconPayloadSchema (strict, PII-stripped)
  → log.info() structured output → Workers Logs → Logpush
```

### Key Modules

| Module | Path | Purpose |
|--------|------|---------|
| `perfume.svelte.ts` | `src/lib/perf/` | Perfume.js initialization, binds analyticsTracker |
| `vitals-logger.ts` | `src/lib/perf/` | Colorized `%c` console output for metric ratings |
| `vitals-beacon.ts` | `src/lib/perf/` | Queue + flush via `sendBeacon` / `fetch` fallback |
| `vitals-payload.ts` | `src/lib/perf/` | `VitalsBeaconPayloadSchema` — strict wire format |
| `vitals-panel-store.svelte.ts` | `src/lib/perf/` | Reactive store for DevToolbarPerf panel display |
| `connection.svelte.ts` | `src/lib/perf/` | Connection quality, effective type, device capabilities |
| `+server.ts` | `src/routes/api/vitals/` | POST receiver — validates, logs, returns 204 |

### Connection Quality

Derived from `navigator.connection` API (where available):

- **Quality tier:** `fast` / `medium` / `slow` / `unknown` — based on effectiveType + saveData + RTT
- **Device capability:** `isLowEndDevice` (memory ≤ 2GB or cores ≤ 2), `isLowEndExperience` (low-end device + slow connection)
- **Reactive:** Module-level `$state` runes update on `change` events

### Dev Toolbar Performance Panel

Fourth panel in the dev toolbar (Ctrl+4). Three sections:

1. **Web Vitals** — Real-time metric values with color-coded rating badges (green/yellow/red)
2. **Device & Connection** — Connection quality with colored dot indicator, friendly network type labels, memory, cores, data saver, low-end detection
3. **Beacon** — Queue count (N/max) with tooltip explaining flush behavior, queued items detail view, session ID (truncated + full in tooltip), last sent time with explanatory tooltip

### Beacon Behavior

- Queue accumulates metrics until `visibilitychange` (tab hide) or queue reaches 10 items
- Payload is PII-stripped: URL has query params removed, no user identifiers
- Content-Type: `text/plain` (avoids CORS preflight with sendBeacon)
- Falls back to `fetch({ keepalive: true })` if `sendBeacon` unavailable
- Skipped entirely in dev mode (`import.meta.env.DEV`)

## Hydration Flash Prevention

Prevents layout shift and theme flash during Svelte hydration by injecting client preferences into SSR HTML.

### Cookie Pattern

Client-side JavaScript writes preference cookies via `setPreferenceCookie()` in `preference-cookie.ts`:

| Cookie | Value | Example |
|--------|-------|---------|
| `app:sidebar-px` | Sidebar width in pixels | `350` |
| `app:theme` | Theme identifier | `midnight` |

Cookies use `max-age=1y`, `path=/`, `SameSite=Lax` to ensure they're sent with every SSR request.

### SSR Injection (`hooks.server.ts`)

1. `handle` hook reads `app:sidebar-px` and `app:theme` cookies
2. Values are sanitized via `sanitizeSidebarWidth()` and `sanitizeTheme()` to prevent XSS via HTML attribute interpolation
3. `transformPageChunk` replaces placeholder attributes in `app.html`:
   - `data-sidebar-width=""` → `data-sidebar-width="350"`
   - `data-theme=""` → `data-theme="midnight"`
4. Client-side inline script reads these attributes on first paint to set CSS variables before Svelte hydrates

### Security

- `sanitizeSidebarWidth()` validates numeric range [100, 1000], rejects NaN/Infinity/non-numeric
- `sanitizeTheme()` validates against `SUPPORTED_THEMES` picklist, rejects unknown values
- Both sanitizers return safe defaults (empty string / null) for any invalid input

## Testing

All modules have colocated `.test.ts` files (2753+ tests total). Pure math modules use logic tests; modules touching Babylon.js use NullEngine integration tests. Test harness from `@/test-presets/harness` provides temp dirs, console capture, async helpers, and fake clock.

```bash
pnpm qa:test              # Run all unit tests (Vitest)
pnpm qa:test:e2e          # Run E2E tests (Playwright)
pnpm -w run qa:lint --tools  # TypeScript type checking (via lint)
pnpm -w run qa:lint       # oxlint + Biome linting
pnpm -w run qa:format:check  # Biome format check
```

### Vitest Configuration

A single root `vitest.config.ts` defines all test projects via the `projects` array (Vitest 4.x pattern — replaces deprecated `vitest.workspace.ts`):

| Project | Root | Environment | Notes |
|---------|------|-------------|-------|
| schemas-common | `packages/shared/schemas/common` | node | |
| schemas-result | `packages/shared/schemas/result` | node | |
| schemas-function | `packages/shared/schemas/function` | node | |
| schemas-generic | `packages/shared/schemas/generic` | node | |
| utils-result | `packages/shared/utils/result` | node | |
| utils-core | `packages/shared/utils/core` | node | |
| locale | `packages/shared/locale` | node | |
| runtime | `packages/products/storylyne/runtime` | node | Babylon.js deps inlined |
| editor | `packages/products/storylyne/editor` | jsdom | Svelte + shadcn-svelte |

Root config uses `pool: 'forks'` (Vitest 4.x default, better SvelteKit/Babylon.js compatibility). Each project inherits root settings via `extends: true`.

### Editor Test Setup

The editor project uses `jsdom` environment with a shared setup file (`test-setup-component.ts`) that provides:

- `@testing-library/jest-dom` matchers
- `window.matchMedia` mock (required by shadcn-svelte Sidebar)
- `ResizeObserver` polyfill (required by ScrollArea/Tooltip)
- `Element.prototype.animate` polyfill (required by Svelte transitions)

SvelteKit virtual module mocks live in `editor/src/test-mocks/`:

- `app-environment.ts` — mocks `$app/environment` (`dev`, `browser`, `building`, `version`)
- `app-state.ts` — mocks `$app/state` (`page`, `navigating`, `updated`)

These are wired via `resolve.alias` in the root Vitest config's editor project.

### Playwright Configuration

E2E tests use Playwright (`editor/playwright.config.ts`) with a build+preview web server:

- **Local**: 0 retries (don't mask flaky tests), list reporter
- **CI**: 2 retries, html + github reporters
- **Timeouts**: test 30s, expect 5s, action 10s, navigation 15s, web server 120s
- **Failure artifacts**: screenshots on failure, video retained on failure
- **Web server**: `pnpm build && pnpm preview --port 4173`, URL-based readiness check

## Platform Compatibility

The runtime targets **WebGPU primary + WebGL2 fallback**. WebGPU covers ~70% of browsers globally (2026); WebGL2 covers ~92%. Together they reach every modern platform.

### Tier 1: Full Support (Desktop Browsers)

| Browser | WebGPU | WebGL2 | Min Version (WebGPU) | Min Version (WebGL2) |
|---------|--------|--------|----------------------|----------------------|
| Chrome | Full (D3D12 Win, Metal macOS) | Full | 113+ | 56+ |
| Edge | Full (Chromium engine) | Full | 113+ | 79+ |
| Firefox | Windows only (macOS Apple Silicon in 145+) | Full | 141+ | 51+ |
| Safari | Full (Metal backend) | Full | 26.0+ (macOS Tahoe 26) | 15.1+ |
| Opera | Full (Chromium engine) | Full | 100+ | 43+ |
| Brave | Full (Chromium engine) | Full | 2024+ | Chromium-inherited |
| Samsung Internet | Full | Full | 25+ | 7.2+ |

**Firefox gaps:** WebGPU not available on Linux stable or Intel Macs. WebGL2 fallback activates on these.

**Safari gap:** WebGPU requires macOS Tahoe 26 — older macOS falls back to WebGL2.

### Tier 2: Full Support (Mobile)

| Platform | WebGPU | WebGL2 | Notes |
|----------|--------|--------|-------|
| iOS (all browsers) | Full (iOS 26+) | Full (iOS 15.6+) | All iOS browsers use WebKit — WebGPU depends on iOS version, not browser brand. A14+ chips recommended. Thermal throttling on sustained GPU loads |
| Android (Chrome) | Partial (Chrome 121+, Android 12+) | Full | Limited to Qualcomm/ARM GPUs. MediaTek not yet supported. Huge device fragmentation — budget devices will struggle |
| Android (Firefox) | Behind flag (targeting 2026) | Full | WebGL2 fallback for now |
| Android (Samsung Internet) | Full (v25+) | Full | Good on flagship Samsung devices |

### Tier 3: Desktop Distribution (Packaged Apps)

| Method | Platforms | WebGPU | Bundle Size | Notes |
|--------|-----------|--------|-------------|-------|
| **Electron** | Windows, macOS, Linux | Yes (flags required) | ~100+ MB | Controlled Chromium environment. Requires `--enable-unsafe-webgpu`, `--enable-webgl`, `--ignore-gpu-blacklist`. Performance measurably slower than direct Chrome |
| **Tauri** | Windows, macOS, Linux | Inconsistent | ~10 MB | **Avoid** — uses system webview, so WebGPU support varies by OS/version. Windows (WebView2) likely works; macOS needs Tahoe 26; Linux varies wildly |
| **Babylon Native** | Windows, macOS, iOS, Android, Linux | N/A (native D3D12/Metal/Vulkan) | Native | **Public preview only** — API unstable. Bypasses web APIs entirely. Touch input only on mobile. Single view only. No Expo support |
| **Babylon React Native** | iOS, Android, Windows | N/A (via Babylon Native) | Native | Same limitations as Babylon Native plus React Native overhead |

**Recommendation:** Electron for Steam/itch.io distribution. Avoid Tauri for WebGPU-first projects.

### Tier 4: PWA (Progressive Web App) Installability

| Platform | PWA Install | Notes |
|----------|-------------|-------|
| Android (Chrome/Edge/Samsung) | Full | Add to Home Screen, standalone window, offline, push notifications |
| iOS (Safari) | Yes (iOS 16.4+) | Share > Add to Home Screen. Chrome/Edge can install since iOS 17. Push since 16.4 |
| Windows (Chrome/Edge) | Full | Installs to Start Menu. Firefox 143+ added PWA support |
| macOS (Chrome/Edge/Brave) | Full | Installs to Dock/Applications |
| Linux (Chrome/Edge) | Full | Desktop integration via .desktop files |
| ChromeOS | Full | First-class PWA support |
| Xbox (Edge) | Partial | PWAs available via Microsoft Store |
| Smart TVs | No | webOS, Tizen, Fire TV lack PWA support |

### Tier 5: Handheld Gaming

| Device | Can Run | WebGPU | WebGL2 | Notes |
|--------|---------|--------|--------|-------|
| **Steam Deck** | Yes (WebGL2) | Experimental (flags) | Full | SteamOS = Linux. Install Chrome via Flatpak in Desktop Mode. AMD RDNA 2 hardware is capable; browser WebGPU support is the bottleneck. Stock Firefox install is often outdated |
| **Nintendo Switch** | No | None | None | Browser is captive-portal only (hotel WiFi). WebGL disabled. 20-min timeout. No address bar. Nintendo disables WebGL to prevent homebrew exploits |
| **Nintendo Switch 2** | No (likely) | Unknown | Unknown | Same captive-portal browser (WebKit 613.0). Hardware is absolutely capable (NVIDIA Ampere, 12GB LPDDR5X, 1536 CUDA cores) but Nintendo locks it out |

### Tier 6: Home Consoles

| Console | Can Run | Best API | Notes |
|---------|---------|----------|-------|
| **Xbox Series X/S** | Partial | WebGL1 confirmed, WebGL2 has issues | Only console with a real browser (Edge/Chromium). No WebGPU. Resource-limited alongside games. Controller works via Gamepad API. WebGL2 context creation has reported issues |
| **Xbox One** | No | WebGL1 only | Edge/Chromium but D3D11 FL 10_0 — WebGL2 requires FL 10_1. Babylon.js 6+ dropped WebGL1 |
| **Xbox 360** | No | None | IE-based browser, no WebGL. 512MB shared RAM |
| **Xbox (Original)** | No | None | No browser. 64MB RAM |
| **PS5** | No | None | Hidden browser (no address bar, no tabs). No WebGL — Sony builds their UI on WebGL internally but blocks it in the user-facing browser |
| **PS4** | No | None | WebKit browser, same WebGL block as PS5 |
| **PS3** | No | None | Ancient browser, Cell processor has no WebGL drivers |
| **PS2** | No | None | No browser exists. 32MB RAM. Released 2000, predates WebGL by 11 years |
| **Wii** | No | None | Opera circa 2007. 88MB RAM. GPU predates OpenGL ES 2.0 |
| **Wii U** | No | Canvas 2D only | WebKit browser, no WebGL. Audio API broken |

**Console path forward:** Babylon Native (public preview) bypasses web APIs and uses native D3D12/Metal/Vulkan. Would require separate engineering effort and is not yet production-ready.

### Tier 7: Portable Consoles (Legacy)

| Device | Can Run | Why |
|--------|---------|-----|
| **DS** | No | 4MB RAM, 67MHz ARM, Opera cartridge for basic HTML only |
| **DSi** | No | 16MB RAM, 133MHz ARM, Opera 9.5 browser |
| **3DS** | No | HTML5test 80/555 (original) / 311/555 (New). GPU supports OpenGL ES 1.1 not 2.0 (WebGL minimum) |

### Tier 8: VR/AR Headsets

| Device | Can Run | WebGPU | WebGL2 | WebXR | Notes |
|--------|---------|--------|--------|-------|-------|
| **Meta Quest 2/3/Pro** | Yes | None (native browser) | Full | Full (immersive-ar, hand tracking, hit testing) | De facto WebXR platform. No native WebGPU (Meta decision, not hardware). Falls back to WebGL2. Babylon.js has first-class WebXR support |
| **Apple Vision Pro** | Yes | Full (Safari 26.0, visionOS 26) | Full | immersive-vr only (no passthrough AR) | Safari 26.2 added WebXR + WebGPU integration. Gaze-and-pinch input via W3C transient-pointer mode |

### Tier 9: Other Platforms

| Platform | Can Run | Notes |
|----------|---------|-------|
| **ChromeOS** | Yes | Full WebGPU + WebGL2 via Chrome. Performance depends on hardware tier (ARM Chromebooks struggle, Intel i5+ are fine) |
| **Smart TVs** | No (practical) | No WebGPU. Unreliable WebGL2. GPUs designed for video decode not 3D. No PWA support. Remote control input only |

### Compatibility Summary

```
FULL SUPPORT          Windows · macOS · iOS · Android · ChromeOS
                      Chrome · Edge · Safari 26+ · Firefox 141+ · Opera · Brave

WEBGL2 FALLBACK       Linux (WebGPU behind flags) · Steam Deck · older iOS/macOS
                      Firefox on macOS/Linux · Android (non-Qualcomm GPUs)

PARTIAL               Xbox Series X/S (Edge browser, WebGL2 issues)

CANNOT RUN            All PlayStation · All Nintendo · Xbox One/360/Original
                      DS/DSi/3DS · Smart TVs · Legacy handhelds

VR/AR                 Meta Quest 2/3 (WebGL2 + WebXR) · Vision Pro (WebGPU + WebXR)

DISTRIBUTION          Browser (primary) · PWA · Electron · Capacitor
                      Babylon Native (future — public preview only)
```

### Key Decisions for Future Work

1. **WebGPU + WebGL2 fallback is correct** — covers every modern platform today
2. **Electron for desktop distribution** — controlled Chromium, supports Steam/itch.io
3. **Capacitor for mobile app stores** — system webview, near-native performance
4. **Console distribution requires Babylon Native** — no browser-based path exists for PlayStation or Nintendo. Babylon Native is public preview only (API unstable, touch-only input, single view). Monitor for production readiness
5. **Switch 2 is the most painful miss** — NVIDIA Ampere with 1536 CUDA cores could easily run WebForge, but Nintendo blocks WebGL entirely
6. **VR/AR is a strong opportunity** — Quest for mass market (WebXR), Vision Pro for premium (WebGPU + WebXR). Babylon.js has first-class WebXR support
7. **Linux/Steam Deck WebGPU gap** — last major holdout. WebGL2 fallback handles it cleanly. Monitor Chrome/Firefox Linux WebGPU rollout
