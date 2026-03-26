# Dynamic Browser Configuration — Implementation Plan

**Date:** 2026-03-03
**Design doc:** `docs/plans/2026-03-03-dynamic-browser-config-design.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

All paths relative to `packages/products/webforge/editor/`.

## Task 1: Central app metadata config

**Test:** `src/lib/config/app-meta.test.ts`
**Impl:** `src/lib/config/app-meta.ts`

1. Write `app-meta.test.ts`:
   - THEME_COLORS has entry for every value in SUPPORTED_THEMES (including `''`)
   - All hex values match `#[0-9a-f]{6}` pattern
   - Light color for all themes is `#ffffff`
   - Dark colors are non-empty and different from light (except default has its own dark)
   - APP_NAME, APP_SHORT_NAME, APP_DESCRIPTION are non-empty strings
   - ICONS array has 4 entries, each with src/sizes/type, two have purpose='maskable'
   - SECURITY_CONTACT, SECURITY_POLICY_URL are non-empty

2. Write `app-meta.ts`:
   - Import SUPPORTED_THEMES from editor-state schema
   - Export all constants from design doc
   - THEME_COLORS: `Record<string, { light: string; dark: string }>` mapping each theme to hex colors
   - ICONS array matching current static manifest
   - Security/contact constants

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test`

## Task 2: Dynamic manifest.webmanifest route

**Test:** `e2e/manifest.test.ts` (new file, replaces manifest tests from `e2e/icons.test.ts`)
**Impl:** `src/routes/manifest.webmanifest/+server.ts`
**Delete:** `static/manifest.webmanifest`
**Modify:** `src/app.html` (manifest link href)

1. Write `e2e/manifest.test.ts`:
   - Returns 200
   - Content-Type contains `application/manifest+json` or `application/json`
   - Valid JSON
   - Has all required fields: name, short_name, description, start_url, id, scope, display, background_color, theme_color, categories, icons
   - name = 'WebForge', short_name = 'WebForge'
   - display = 'standalone'
   - categories is array
   - icons has 4 entries (192, 512, maskable-192, maskable-512)
   - All icon src paths return 200

2. Write `src/routes/manifest.webmanifest/+server.ts`:
   - `export const prerender = true`
   - GET handler returns `Response` with JSON body and `application/manifest+json` content type
   - All values from app-meta.ts

3. Delete `static/manifest.webmanifest`

4. Update `src/app.html`:
   - Change `href="%sveltekit.assets%/manifest.webmanifest"` to `href="/manifest.webmanifest"`

5. Update `e2e/icons.test.ts`:
   - Remove the `manifest.webmanifest` describe block (moved to manifest.test.ts)
   - Keep icon asset HTTP tests and icon link resolution tests

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test && pnpm qa:test:e2e`

## Task 3: Dynamic robots.txt route

**Test:** `e2e/robots-txt.test.ts`
**Impl:** `src/routes/robots.txt/+server.ts`

1. Write `e2e/robots-txt.test.ts`:
   - Returns 200
   - Content-Type contains `text/plain`
   - Contains `User-agent: *`
   - Contains `Disallow: /api/`
   - Contains blocked crawlers: GPTBot, anthropic-ai, CCBot, Google-Extended, Bytespider, cohere-ai
   - Contains allowed crawlers: ChatGPT-User, Claude-Web
   - Does NOT contain `Sitemap:`

2. Write `src/routes/robots.txt/+server.ts`:
   - `export const prerender = true`
   - GET handler returns text/plain response with robots directives

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test:e2e`

## Task 4: security.txt route

**Test:** `e2e/security-txt.test.ts`
**Impl:** `src/routes/.well-known/security.txt/+server.ts`

1. Write `e2e/security-txt.test.ts`:
   - Returns 200 at `/.well-known/security.txt`
   - Content-Type contains `text/plain`
   - Contains `Contact:` field with URL
   - Contains `Expires:` field with ISO 8601 date in the future
   - Contains `Preferred-Languages:` field
   - Contains `Canonical:` field with URL
   - Contains `Policy:` field with URL

2. Write `src/routes/.well-known/security.txt/+server.ts`:
   - `export const prerender = true`
   - GET handler returns text/plain with RFC 9116 fields
   - Expires = 1 year from build date

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test:e2e`

## Task 5: Dynamic theme-color + Apple PWA meta tags

**Modify:** `src/routes/+layout.svelte`
**Modify:** `src/app.html`
**Modify:** `e2e/head-meta.test.ts`

1. Update `e2e/head-meta.test.ts`:
   - Update theme-color light test: expect `#ffffff` (unchanged)
   - Update theme-color dark test: expect `#242424` (was `#0a0a0a`)
   - Add tests for Apple PWA meta: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
   - Same tests for error page section

2. Update `src/routes/+layout.svelte`:
   - Import `THEME_COLORS` from `$lib/config/app-meta`
   - Add derived: `themeColorLight` and `themeColorDark` from `store.app.theme` + THEME_COLORS map
   - Replace hardcoded `#ffffff` / `#0a0a0a` with derived values

3. Update `src/app.html`:
   - Add `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title` meta tags

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test && pnpm qa:test:e2e`

## Task 6: Update ARCHITECTURE.md + final QA

1. Add section to `docs/ARCHITECTURE.md` documenting:
   - Central app metadata config pattern
   - Dynamic server routes (manifest, robots, security.txt)
   - Theme-color reactivity
2. Run full QA: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test && pnpm qa:test:e2e`
