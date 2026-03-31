# Rename WebForge → Storyline — Implementation Plan

**Date:** 2026-03-03
**Design:** `docs/plans/2026-03-03-rename-storyline-design.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

All paths relative to `packages/products/webforge/editor/`.

## Task 1: Update app-meta.ts

**File:** `src/lib/config/app-meta.ts`

- `APP_NAME` → `'Storyline'`
- `APP_SHORT_NAME` → `'Storyline'`
- `APP_DESCRIPTION` → `'Your Story, Rendered'`
- `APP_TAGLINE` → `'Your Story, Rendered'` (new constant for brand tagline)

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 2: Wire APP_NAME into editor state schema + store

**Files:**
- `src/lib/schemas/editor-state.ts` — import `APP_NAME` from `$lib/config/app-meta`, use as default for `appName`
- `src/lib/stores/editor-state.svelte.ts` — import `APP_NAME`, use in `APP_DEFAULTS.appName`, change `STORAGE_KEY` to `'app:editor-state'`, update JSDoc

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 3: Update debug state schema + store

**Files:**
- `src/lib/schemas/debug-state.ts` — update JSDoc `'webforge:debug-state'` → `'app:debug-state'`
- `src/lib/stores/debug-state.svelte.ts` — change `STORAGE_KEY` to `'app:debug-state'`, update JSDoc

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 4: Update locale schema + all 7 locale files

**Files:**
- `src/lib/locales/schema.ts`:
  - Remove `applicationName` from `meta`
  - Change `description` to `messageTemplate({ appName: v.string() })`
  - Rename `webforgeProject` → `project` in `project` namespace
- All locale files (`en.ts`, `ja.ts`, `zh.ts`, `ko.ts`, `fr.ts`, `de.ts`, `es.ts`):
  - Remove `applicationName`
  - Change `description` to parameterized template: `'{appName} — <localized description>'`
  - Rename `webforgeProject` → `project`

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 5: Update +layout.svelte

**File:** `src/routes/+layout.svelte`

- `SIDEBAR_PX_KEY` → `'app:sidebar-px'`
- `localStorage.removeItem(...)` stale key cleanup → `'paneforge:app:sidebar-width'`
- `autoSaveId` → `"app:sidebar-width"`
- Remove `metaAppName` derived — use `store.app.appName` directly for `application-name` meta
- Update `metaDescription` to call parameterized locale template with `{ appName: store.app.appName }`
- Update fallback string to remove "WebForge"

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 6: Update DevToolbar.svelte

**File:** `src/lib/components/DevToolbar.svelte`

- `localStorage.removeItem('webforge:sidebar-px')` → `'app:sidebar-px'`

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 7: Rename WebForgeLogo → AppLogo

**Actions:**
- Rename `src/lib/components/WebForgeLogo.svelte` → `src/lib/components/AppLogo.svelte`
- Rename `src/lib/components/web-forge-logo.test.ts` → `src/lib/components/app-logo.test.ts`
- Update test file: import `AppLogo` instead of `WebForgeLogo`, update describe block name
- Update `src/lib/components/AppSidebar.svelte`: import from `./AppLogo.svelte`

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 8: Update app.html + SVG

**Files:**
- `src/app.html` — remove `<meta name="apple-mobile-web-app-title" content="WebForge">` (now set dynamically in `<svelte:head>`)
- `static/favicon.svg` — change comment `WebForge Master Logo` → `App Logo`

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`

## Task 9: Update all unit tests

**Files:**
- `src/lib/stores/editor-state.test.ts` — import `APP_NAME` from app-meta, import `STORAGE_KEY` from store; replace all `'WebForge'` → `APP_NAME`, all `'webforge:editor-state'` → `STORAGE_KEY`
- `src/lib/schemas/editor-state.test.ts` — import `APP_NAME`; replace `'WebForge'` → `APP_NAME`
- `src/lib/stores/debug-state.svelte.test.ts` — import `STORAGE_KEY`; replace `'webforge:debug-state'` → `STORAGE_KEY`
- `src/lib/components/app-sidebar.test.ts` — import `APP_NAME`; replace `'WebForge'` → `APP_NAME`
- `src/lib/components/app-logo.test.ts` — already renamed in task 7; update component name references
- `src/lib/components/dev-toolbar-app-state.test.ts` — import `APP_NAME`; replace `'WebForge'` → `APP_NAME`
- `src/lib/components/feature-flags.integration.test.ts` — import `APP_NAME`; replace `'WebForge'` → `APP_NAME`

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format && pnpm qa:test`

## Task 10: Update all E2E tests

**Files (all import `APP_NAME` from `../../src/lib/config/app-meta`):**
- `e2e/sidebar.test.ts` — replace `'WebForge'` with `APP_NAME`
- `e2e/head-meta.test.ts` — replace all `'WebForge'` with `APP_NAME`
- `e2e/error-pages.test.ts` — replace all `'WebForge'` with `APP_NAME`
- `e2e/feature-flags.test.ts` — update `STORAGE_KEY` to `'app:editor-state'`, replace `'WebForge'` with `APP_NAME`
- `e2e/layout.test.ts` — replace `'WebForge'` with `APP_NAME`
- `e2e/sidebar-mobile.test.ts` — replace `'WebForge'` with `APP_NAME`
- `e2e/manifest.test.ts` — replace `'WebForge'` with `APP_NAME`

**Note:** For regex assertions like `/page not found.*WebForge/i`, use `new RegExp(`page not found.*${APP_NAME}`, 'i')`.

**QA:** `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format && pnpm qa:test:e2e`

## Task 11: Run full QA

```bash
pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format
pnpm qa:test
pnpm qa:test:e2e
```

All must pass with zero failures.
