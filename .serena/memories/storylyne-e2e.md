# `@storylyne/editor` — E2E tests (Playwright)

> Captured 2026-05-05. Path: `packages/products/storylyne/editor/e2e/`. 26 Playwright suites covering the editor's UI, security, accessibility, and beacon endpoints. Companion to `storylyne-routes` and `observability`.

## Configuration

`packages/products/storylyne/editor/playwright.config.ts` is a 12-line file:
```ts
import { createPlaywrightConfig } from '@/test-presets/playwright';
export default createPlaywrightConfig({} as Parameters<typeof createPlaywrightConfig>[0]);
```

Everything (baseURL, retry, parallelism, browsers) comes from the shared preset (`@/test-presets/playwright`). The empty options arg means defaults apply.

## Test patterns

- Each suite: `import { test, expect } from '@playwright/test'` + `test.describe(...)` + `test(...)` blocks.
- All suites share a Playwright web server config from the preset (running `pnpm dev` against the editor at `localhost:5173` / `localhost:3100` per preset).
- No paired setup/teardown files — tests assume a clean dev server start.
- Tests reference shared constants from `../src/lib/config/app-meta` (e.g., `URL_PARAM_PREFIX = 'sto.'`) to keep cookie/URL keys in sync with the app.

## 26 suites (one-line descriptions)

### `accessibility.test.ts`
WCAG 2.2 AA coverage — verifies the skip link is first focusable element + reveals on focus, landmark roles (`<main>`, `<nav>`, `<aside>`), `aria-live="polite"` region exists, sidebar has `aria-label`, keyboard navigation contracts on rendered editor pages.

### `dev-toolbar.test.ts`
Dev toolbar: opens via keyboard shortcut, shows app state / debug overrides / feature flags / perf metrics tabs. Verifies that toggling debug overrides via the toolbar actually mutates the editor store.

### `error-pages.test.ts`
Exercises `/test-error/{400,403,404,500,unexpected,validation,validation-client,beacon,catastrophic}` routes. Verifies status codes, error IDs in headers (`x-error-id`), localized error titles/descriptions, "copy error ID" button, the static `error.html` fallback for catastrophic errors.

### `feature-flags.test.ts`
Feature flag URL overrides: `?sto.<flag>=true|false` toggles individual feature flags; verifies the corresponding UI elements appear/disappear (e.g., `?sto.headerUserDropdown=false` hides the user dropdown).

### `head-meta.test.ts`
`<head>` content: title format (`{appName} - {breadcrumb} - {tagline}`), description, application-name, theme-color (light + dark prefers-color-scheme), og:title/description/type/locale, canonical URL.

### `header-user.test.ts`
Header user dropdown: avatar fallback with initials, account/notifications/subscription/whatsNew/shortcuts/settings/logout menu items present per `headerUser*` feature flags + per `subscriptionPlan` (free hides paid features).

### `hydration-flash.test.ts`
Verifies no FOUC during SSR→hydration: theme/mode/sidebar-px applied synchronously from cookies + inline script in `app.html` reads `localStorage[storylyne:mode/theme/sidebar-px]` before hydration. Asserts no visible class swap.

### `icons.test.ts`
PWA icon paths: every URL in `manifest.webmanifest`'s `icons` array returns 200 with correct content-type. Verifies the icons in `static/icons/`.

### `keyboard-navigation.test.ts`
Tab traversal contract: skip link → sidebar → header → main → dropdowns/popovers focus order. Verifies focus trap in dialogs, `Esc` closes overlays, focus returns to trigger.

### `language-switcher.test.ts`
Language switching: opens the language switcher dropdown, selects a non-default locale (ja/zh/ko/fr/de/es), verifies UI strings update without a full reload + cookie `storylyne:locale` is set + URL not changed.

### `layout.test.ts`
Layout integrity: resizable sidebar drag persists to `localStorage[storylyne:sidebar-px]` + cookie. Double-click resets to default 288px. ResizeObserver maintains pixel width across viewport changes.

### `locale.test.ts`
Server-side locale detection: cookie `storylyne:locale` takes priority over `Accept-Language` header. Falls back to `'en'` on no match. `<html lang>` and `<html dir>` (LTR/RTL) attributes match resolved locale.

### `manifest.test.ts`
`/manifest.webmanifest` endpoint: returns valid JSON matching `WebManifestSchema`. All required PWA fields (`name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color`, `icons`). Cache-Control: `public, max-age=86400`.

### `nav-scenes.test.ts`
Scenes navigation: sidebar `NavScenes` renders 3 mock scenes (Overworld, Town Interior, Dungeon B1). Active state on hash-fragment match. Empty state when `?sto.scenes=empty`.

### `project-user-data.test.ts`
SvelteKit streamed promises: `+layout.server.ts` streams `data.project` and `data.scenes`. Verifies skeleton loading states render (NavProjectSkeleton, NavScenesSkeleton) before data resolves, then real names appear.

### `robots-txt.test.ts`
`/robots.txt` endpoint: hardcoded policy serves correct directives. Standard crawlers `Disallow: /api/`. AI search assistants (`ChatGPT-User`, `Claude-Web`) allowed. AI training crawlers (`GPTBot`, `anthropic-ai`, `CCBot`, `Google-Extended`, `Bytespider`, `cohere-ai`) fully blocked.

### `security-headers.test.ts`
HTTP security headers on every response: `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `cross-origin-opener-policy: same-origin-allow-popups`, `cross-origin-resource-policy: same-origin`, `cross-origin-embedder-policy: unsafe-none`, `x-dns-prefetch-control: off`, `x-permitted-cross-domain-policies: none`, `x-xss-protection: 0`. HSTS excluded (dev). CSP set via `<meta>` tag by SvelteKit `kit.csp` in dev.

### `security-txt.test.ts`
`/.well-known/security.txt` endpoint: RFC 9116 fields present. `Contact:`, `Expires:` (now+1y), `Preferred-Languages:` (the 7 supported locales), `Canonical:`, `Policy:`. Returns text/plain.

### `sidebar.test.ts` + `sidebar-collapsed.test.ts` + `sidebar-mobile.test.ts`
Three sidebar variants:
- **`sidebar.test.ts`** — desktop default: open/close via toggle, persists state.
- **`sidebar-collapsed.test.ts`** — narrow collapsed mode: shows icon-only rail, expands on hover/click.
- **`sidebar-mobile.test.ts`** — viewport `< sm`: opens as a sheet overlay instead of inline.

### `subscription-plan.test.ts`
Subscription plan presets (`PLAN_PRESETS` from `$lib/config/subscription-plans`): selecting `free`/`starter`/`pro`/`enterprise` from the dev toolbar applies the matching `FeatureFlags` map. Free tier hides paid features (`headerUserSubscription`, etc.).

### `theme-mode.test.ts`
Light/dark/system mode toggling: sets `<html class="dark">`, persists to `localStorage[storylyne:mode]` + cookie. System mode follows `prefers-color-scheme` media query.

### `theme-switcher.test.ts`
12-theme palette switcher: `midnight`, `warm`, `forest`, `ocean`, `rose`, `lavender`, `sunset`, `slate`, `copper`, `aurora`, `amethyst`, default. Sets `<html data-theme="...">`. Updates `<meta name="theme-color">` per `THEME_COLORS[theme]`.

### `tooltips.test.ts`
Tooltip behavior: hover triggers tooltip after delay, keyboard-focus also triggers, `Esc` dismisses, mouse-leave dismisses. Tooltip provider context properly wraps Lens isolate routes (verified via `/isolate/<component>`).

### `vitals.test.ts`
`/api/vitals` beacon endpoint: posts well-formed `VitalsBeaconPayloadSchema` payloads, expects `204`. Posts malformed JSON, expects `400`. Posts oversize payloads (>64KB), expects `413`. Verifies unknown metric names are validated.

## Suite count: 26 (originally listed as 25 in monorepo-architecture-uncovered)

The uncovered list said 25; actual count is 26 (sidebar appears as 3 separate files: base, collapsed, mobile).

## Patterns

- **No global `beforeAll`** — each suite is independent.
- **Reuse of `URL_PARAM_PREFIX`** from app source — keeps tests in sync with cookie/URL key changes.
- **Direct fetch tests** for static endpoints (manifest, robots.txt, security.txt, /api/errors, /api/vitals) — Playwright's `page.request.get(...)` / `page.request.post(...)`.
- **Browser-driven tests** for UI behavior — full hydration + interaction.
- **Cookie + localStorage assertions** — verify state persistence across reloads.
- **Multi-viewport** in `sidebar-*.test.ts` — `test.use({ viewport: { width: 375, height: 800 } })` for mobile.

## How E2E runs

- Root `pnpm qa:test:e2e` invokes Turbo task `qa:test:e2e` in dependency order; depends on `build`.
- Per-package: `pnpm --filter @storylyne/editor qa:test:e2e`.
- Local development: `pnpm --filter @storylyne/editor exec playwright test e2e/<suite>` for a specific suite.

## Cross-references

- `storylyne-routes` — the routes these tests exercise.
- `observability` — `/api/errors` and `/api/vitals` beacon endpoints.
- `error-handling` — error pipeline that `error-pages.test.ts` exercises.
- `i18n-system` — locale detection + RTL handling that `locale.test.ts` exercises.
- `test-presets-overview` — `createPlaywrightConfig` factory the config uses.
