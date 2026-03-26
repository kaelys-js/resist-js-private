# Security Headers & Response Hardening

**Date:** 2026-03-03
**Status:** Plan

## Context

The editor uses `adapter-static` with SPA fallback (`fallback: 'index.html'`). This means:

- `hooks.server.ts` runs during **dev** (`vite dev`) and **preview** (`pnpm preview`) only
- In production, the static host (Cloudflare Pages, Netlify, etc.) serves files directly
- Security headers need BOTH `hooks.server.ts` (dev/preview) AND a `static/_headers` file (production)
- CSP via `kit.csp` embeds as `<meta http-equiv>` tags in the HTML output

## Current State

5 security headers exist in `hooks.server.ts`:

| Header | Value |
|--------|-------|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Cross-Origin-Opener-Policy | same-origin |

Unit tests: 5 in `hooks.server.test.ts`
E2E tests: 10 in `security-headers.test.ts` (5 normal + 5 error page)

## Changes

### 1. CSP via `kit.csp` in `svelte.config.js`

```js
csp: {
  mode: 'auto',
  directives: {
    'default-src': ['self'],
    'script-src': ['self', 'wasm-unsafe-eval'],
    'style-src': ['self', 'unsafe-inline'],
    'img-src': ['self', 'data:', 'blob:'],
    'font-src': ['self'],
    'connect-src': ['self', 'ws:', 'wss:'],
    'worker-src': ['self', 'blob:'],
    'child-src': ['self', 'blob:'],
    'frame-ancestors': ['none'],
    'base-uri': ['self'],
    'form-action': ['self'],
    'object-src': ['none'],
  }
}
```

Babylon.js requirements:
- `wasm-unsafe-eval` — WebAssembly compilation (Draco, physics)
- `blob:` in worker-src/child-src — web workers from blob URLs
- `blob:` + `data:` in img-src — generated textures/render targets
- `unsafe-inline` in style-src — Svelte component styles (SvelteKit augments with nonces/hashes)
- `ws:` + `wss:` in connect-src — Vite HMR in dev, potential WebSocket features

### 2. New headers in `hooks.server.ts`

Add these to the existing `SECURITY_HEADERS` array:

| Header | Value | Notes |
|--------|-------|-------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | PROD ONLY — breaks localhost |
| Cross-Origin-Resource-Policy | same-origin | Prevents cross-origin reads |
| Cross-Origin-Embedder-Policy | unsafe-none | Safe default; upgrade to credentialless for SharedArrayBuffer |
| X-DNS-Prefetch-Control | off | OWASP recommended |
| X-Permitted-Cross-Domain-Policies | none | Blocks Flash/Acrobat cross-domain |
| X-XSS-Protection | 0 | Explicitly disabled (CSP replaces it) |

Modify existing:
- `Cross-Origin-Opener-Policy`: change `same-origin` → `same-origin-allow-popups` (allows OAuth popups)
- `Permissions-Policy`: add `interest-cohort=()` (blocks FLoC)

Add Cache-Control for HTML:
- `private, no-cache` on responses with `content-type: text/html`
- Skip `/_app/immutable/` paths (SvelteKit handles these)

### 3. Dev-mode guard

Import `dev` from `$app/environment`. Split headers into:
- **Always-on headers** (safe in dev): X-Content-Type-Options, Referrer-Policy, X-XSS-Protection
- **Prod-only headers** (breaks dev or irrelevant): HSTS

### 4. `static/_headers` file

Mirrors all security headers for static hosting. Format:
```
/*
  X-Frame-Options: DENY
  ...
```

### 5. No CORS

Not needed — static SPA, all requests same-origin.

## Files to Modify

1. `svelte.config.js` — add `kit.csp`
2. `src/hooks.server.ts` — restructure headers, add dev guard, add cache-control
3. `src/hooks.server.test.ts` — tests for new headers + dev guard
4. `e2e/security-headers.test.ts` — expand assertions
5. `static/_headers` — NEW file for production static hosting

## Implementation Tasks

### Task 1: Add CSP to svelte.config.js
- Add `kit.csp` config with directives listed above
- QA: type-check, lint, format

### Task 2: Restructure hooks.server.ts headers
- Import `dev` from `$app/environment`
- Split `SECURITY_HEADERS` into `BASE_HEADERS` (always) + `PROD_HEADERS` (prod-only)
- Add new headers listed above
- Modify COOP value
- Expand Permissions-Policy
- Add Cache-Control logic for HTML responses
- QA: type-check, lint, format

### Task 3: Update unit tests
- Test all new headers are present
- Test HSTS is NOT set when `dev` is true
- Test HSTS IS set when `dev` is false
- Test Cache-Control on HTML responses
- Test Cache-Control is NOT set on immutable paths
- QA: test

### Task 4: Create static/_headers
- Mirror all production headers
- Include CSP (full directive string)
- QA: lint, format

### Task 5: Update E2E tests
- Test new headers on normal page
- Test new headers on error page
- Test CSP header contains expected directives
- Test Cache-Control on HTML response
- QA: test:e2e

### Task 6: Commit
