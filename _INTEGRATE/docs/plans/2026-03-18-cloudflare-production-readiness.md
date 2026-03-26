# Lens System — Cloudflare Production Readiness

> **Goal:** Make the entire Lens documentation system deployable to Cloudflare Pages with zero Node.js runtime dependencies, while preserving full live-analysis capabilities in dev mode.

**Principle:** Dev mode runs analysis live (instant feedback on code changes). Production uses pre-computed static data (fast, no Node.js).

**Switch mechanism:** `import { dev } from '$app/environment'` — Vite tree-shakes the unused branch from each build.

**Tech Stack:** SvelteKit, Vite, tsx (build scripts), `@sveltejs/compiler-wasm`, `esbuild-wasm`, `@tailwindcss/browser`

---

### Task 1: Build-time precompute script + dual-mode layout loading

**Files:**
- Create: `packages/products/storylyne/editor/scripts/lens-precompute.ts`
- Modify: `packages/products/storylyne/editor/src/routes/(testing)/+layout.svelte`
- Modify: `packages/products/storylyne/editor/package.json`
- Create: `packages/products/storylyne/editor/src/lib/generated/.gitkeep`
- Modify: `.gitignore`

**Step 1:** Create `scripts/lens-precompute.ts`:
- Read all `.svelte`, `.ts`, `.css`, `docs.md` files via `node:fs` + `glob`
- Run all extraction functions: `extractProps`, `extractVariants`, `extractDeps`, `extractComponentDescription`, `extractTokens`, `auditAccessibility`, `detectBrowserSupport`, `computeLensCompatibility`
- Output: `src/lib/generated/lens-precomputed.json` containing:
  ```typescript
  {
    propsByComponent: Record<string, PropMeta[]>,
    variantsByComponent: Record<string, VariantKeyMeta[]>,
    depsByComponent: Record<string, DepTree>,
    componentDescriptions: Record<string, string>,
    globalBrowserSupport: BrowserSupportResult,
    globalA11y: A11yAuditResult,
    tokens: TokenGroup[],
    lensCompat: Record<string, LensCompatibility>,
  }
  ```
- Estimated output size: ~2-3 MB JSON (~500 KB gzipped)

**Step 2:** Modify `+layout.svelte` for dual-mode loading:
- Import `{ dev } from '$app/environment'`
- Dev mode: keep all 9 existing `import.meta.glob` calls + live extraction (no changes)
- Prod mode: `import precomputed from '$lib/generated/lens-precomputed.json'`
- Vite tree-shakes the unused branch — dev build keeps globs, prod build drops them
- All downstream code reads from the same reactive variables regardless of mode

**Step 3:** Add build scripts to `package.json`:
```json
{
  "lens:precompute": "tsx scripts/lens-precompute.ts",
  "prebuild": "pnpm lens:precompute"
}
```

**Step 4:** Add `src/lib/generated/` to `.gitignore` (build artifacts, not source).

**Step 5:** Run QA + Commit: `feat(lens): build-time precompute for production deployment`

---

### Task 2: Bundle sizes — static JSON + dev live route

**Files:**
- Create: `packages/products/storylyne/editor/scripts/lens-bundle-sizes.ts`
- Modify: `packages/products/storylyne/editor/src/routes/api/lens/bundle-sizes/+server.ts` (add dev guard if missing)
- Modify: client code that fetches bundle sizes (switch to static import in prod)
- Modify: `packages/products/storylyne/editor/package.json`

**Step 1:** Create `scripts/lens-bundle-sizes.ts`:
- Glob all `.svelte` component files
- For each: compile with `svelte/compiler`, minify with `esbuild`, gzip with `node:zlib`
- Output: `src/lib/generated/bundle-sizes.json`
  ```typescript
  Record<string, { compiled: number; gzip: number }>
  ```
- Estimated output size: ~50 KB

**Step 2:** Add dev guard to `+server.ts`:
- `if (!dev) return new Response('Bundle sizes API is dev-only', { status: 404 });`

**Step 3:** Update client code:
- Dev: `fetch('/api/lens/bundle-sizes')` (live compilation)
- Prod: `import bundleSizes from '$lib/generated/bundle-sizes.json'`

**Step 4:** Add to prebuild pipeline:
```json
{
  "lens:bundle-sizes": "tsx scripts/lens-bundle-sizes.ts",
  "prebuild": "pnpm lens:precompute && pnpm lens:bundle-sizes"
}
```

**Step 5:** Run QA + Commit: `feat(lens): build-time bundle size analysis`

---

### Task 3: Changelog — static JSON + dev live route

**Files:**
- Create: `packages/products/storylyne/editor/scripts/lens-changelog.ts`
- Modify: `packages/products/storylyne/editor/src/routes/api/lens/changelog/[name]/+server.ts` (verify dev guard)
- Modify: client code that fetches changelog (switch to static import in prod)
- Modify: `packages/products/storylyne/editor/package.json`

**Step 1:** Create `scripts/lens-changelog.ts`:
- Run `git log --follow` for every component directory in `packages/shared/ui/src/`
- Detect repo URL from `git remote get-url origin`
- Compute SHA256 diff anchors for each component's primary `.svelte` file
- Output: `src/lib/generated/changelog.json`
  ```typescript
  {
    byComponent: Record<string, { entries: ChangelogEntry[]; total: number }>,
    repo: { url: string; componentPath: string },
    diffAnchors: Record<string, string>,
  }
  ```
- Estimated output size: ~200-500 KB

**Step 2:** Verify dev guard on existing `+server.ts`:
- `if (!dev) return new Response('Changelog API is dev-only', { status: 404 });`

**Step 3:** Update client code:
- Dev: `fetch(`/api/lens/changelog/${name}`)` (live git log)
- Prod: `import changelog from '$lib/generated/changelog.json'` (static snapshot)

**Step 4:** Add to prebuild pipeline:
```json
{
  "lens:changelog": "tsx scripts/lens-changelog.ts",
  "prebuild": "pnpm lens:precompute && pnpm lens:bundle-sizes && pnpm lens:changelog"
}
```

**Step 5:** Run QA + Commit: `feat(lens): build-time changelog generation`

---

### Task 4: Standalone compilation — WASM client-side + dev live route

**Files:**
- Create: `packages/products/storylyne/editor/src/lib/lens/compile-client.ts`
- Modify: `packages/products/storylyne/editor/src/routes/api/lens/compile-standalone/+server.ts` (add dev guard)
- Modify: client code that calls the compilation API (switch to client-side in prod)
- Modify: `packages/products/storylyne/editor/package.json` (new dependencies)

**Step 1:** Add WASM dependencies:
```bash
pnpm add @sveltejs/compiler-wasm esbuild-wasm @tailwindcss/browser
```

**Step 2:** Create `src/lib/lens/compile-client.ts`:
- Initialize WASM modules lazily (only when first compilation requested)
- Implement the same compilation pipeline as `+server.ts` but using WASM equivalents:
  - `@sveltejs/compiler-wasm` instead of `svelte/compiler`
  - `esbuild-wasm` instead of `esbuild`
  - `@tailwindcss/browser` instead of `@tailwindcss/node`
- Same input/output contract as the server route
- Client-side only — no server round-trip

**Step 3:** Add dev guard to `+server.ts`:
- `if (!dev) return new Response('Compile API is dev-only', { status: 404 });`

**Step 4:** Update client code:
- Dev: `POST /api/lens/compile-standalone` (fast Node.js server-side compilation)
- Prod: `import { compileStandalone } from '$lib/lens/compile-client'` (WASM client-side)

**Step 5:** Optional: pre-compile common component x theme x dark/light variants at build time:
- Add to `scripts/lens-precompute.ts`: for each component, generate HTML for light + dark x each theme
- Store in `src/lib/generated/standalones/` as static HTML files
- Client loads pre-compiled HTML instantly, falls back to WASM for custom prop combinations

**Step 6:** Run QA + Commit: `feat(lens): client-side WASM compilation for production`

---

### Task 5: Screenshot/simulator API cleanup

**Files:**
- Modify: `packages/products/storylyne/editor/package.json` (move Playwright to devDependencies)
- Verify: all screenshot/simulator routes have `if (!dev)` guards

**Step 1:** Verify dev guards exist on all screenshot routes:
- `/api/lens/screenshot/+server.ts`
- `/api/lens/screenshot/ios/+server.ts`
- `/api/lens/screenshot/android/+server.ts`
- `/api/lens/screenshot/frames/+server.ts`

**Step 2:** Move `playwright` from `dependencies` to `devDependencies` in editor's `package.json`. This prevents it from being bundled in the production build.

**Step 3:** Verify that dynamic `import('playwright')` is used (not top-level import) so the module isn't resolved at build time when it doesn't exist.

**Step 4:** Run QA + Commit: `chore(lens): move playwright to devDependencies`

---

### Task 6: CI/CD pipeline integration

**Files:**
- Modify: CI config (GitHub Actions or equivalent)
- Modify: `packages/products/storylyne/editor/package.json`

**Step 1:** Final prebuild script:
```json
{
  "lens:precompute": "tsx scripts/lens-precompute.ts",
  "lens:bundle-sizes": "tsx scripts/lens-bundle-sizes.ts",
  "lens:changelog": "tsx scripts/lens-changelog.ts",
  "lens:prebuild": "pnpm lens:precompute && pnpm lens:bundle-sizes && pnpm lens:changelog",
  "prebuild": "pnpm lens:prebuild"
}
```

**Step 2:** CI requirements:
- Node.js available (for tsx + build scripts) — standard in all CI
- Git available (for changelog script) — standard in all CI
- `pnpm install` runs before `pnpm build` — standard
- `prebuild` hook runs automatically before `build` — SvelteKit/npm standard

**Step 3:** Cloudflare Pages build settings:
- Build command: `pnpm build` (prebuild runs automatically)
- Output directory: `.svelte-kit/cloudflare` (or adapter output)
- No special environment variables needed

**Step 4:** Run QA + Commit: `chore(lens): CI pipeline for Cloudflare Pages deployment`

---

### Task 7: Verification + final QA

**Step 1:** Run full QA: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

**Step 2:** Run full test suite: `pnpm qa:test`

**Step 3:** Test dev mode: `pnpm dev` — verify all live analysis works (globs, APIs, git log)

**Step 4:** Test production build: `pnpm build` — verify:
- Prebuild scripts run and generate all JSON files
- Production bundle size is <5 MB (down from 23+ MB)
- No Node.js imports in production bundle
- All pages render correctly from pre-computed data

**Step 5:** Test Cloudflare deployment (if possible):
- Deploy to Cloudflare Pages preview
- Verify all pages load and function
- Verify standalone compilation works via WASM
- Verify changelog/bundle-sizes load from static JSON

**Step 6:** Commit: `feat(lens): Cloudflare production readiness — complete`

---

## Reference: Dev vs Production Behavior

| Feature | Dev Mode | Production (Cloudflare) |
|---------|----------|------------------------|
| Source analysis | Live `import.meta.glob` + runtime extraction | `lens-precomputed.json` |
| Bundle sizes | Live `/api/lens/bundle-sizes` (Node.js) | `bundle-sizes.json` |
| Changelog | Live `/api/lens/changelog/[name]` (git log) | `changelog.json` |
| Standalone compilation | Live `/api/lens/compile-standalone` (Node.js) | Client-side WASM |
| Screenshots | Live Playwright/Simulators | 404 (dev-only) |
| Switch mechanism | `import { dev } from '$app/environment'` | Vite tree-shakes dev code |
