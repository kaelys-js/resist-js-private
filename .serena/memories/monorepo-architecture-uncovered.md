# Monorepo Phase-1 Onboarding — Uncovered Files

> Written 2026-05-05 alongside `monorepo-architecture.md`. Lists files and areas Phase-1 did NOT deeply traverse, so the next onboarding pass knows where to start. Phase-1 captured every package and its primary entry-points; depth was limited mostly by file count, not by parser limitations.

## Tool limitations encountered

- **Svelte components (`*.svelte`)** cannot be passed to `mcp__serena__get_symbols_overview` — serena's active languages are typescript/bash/python/swift, not svelte. The Svelte component bodies (`<script>` blocks) need a different strategy: `mcp__serena__find_symbol` against the package's `.svelte-check/svelte/src/**/*.ts` artifacts, or per-file `Read` of the `<script lang="ts">` portion.
- **Directory paths** also cannot be passed to `get_symbols_overview` — it errors with "Expected a file path, but got a directory path".

## Not covered by file/area

### `@storylyne/editor` (`packages/products/storylyne/editor`)

**Svelte components** (`src/lib/components/`): ~35 Svelte 5 components were listed but not symbol-overviewed. `<script lang="ts">` bodies still need capture:
- AppSidebar, AppSidebarFlagsTest, AppSidebarTest
- DevToolbar, DevToolbarAppState, DevToolbarAppStateTest, DevToolbarDebug, DevToolbarDebugOverridesTest, DevToolbarDebugTest, DevToolbarFeatureFlags, DevToolbarFeatureFlagsTest, DevToolbarPerf, DevToolbarTest
- EmptyScenes, EmptyScenesFlagsTest, EmptyScenesTest
- ErrorPage, ErrorPageTest
- FeatureFlagsTestProviders
- HeaderUser, HeaderUserTest
- LanguageSwitcher, LanguageSwitcherTest
- ModeToggle, ModeToggleTest
- NavProject, NavProjectFlagsTest, NavProjectTest
- NavScenes, NavScenesSkeleton, NavScenesTest, NavSecondaryTest
- SiteHeader, SiteHeaderFlagsTest, SiteHeaderTest
- TestProviders
- ThemeSwitcher, ThemeSwitcherTest

**Route handlers** (only structure listed, not symbol-overviewed):
- `src/routes/(app)/+page.svelte`, `+layout.svelte`, `+layout.server.ts`, `+error.svelte`
- `src/routes/(testing)/` pages: about, accessibility, browser-support, changelog, components (+ [name], +category/[category], +all, +tags), getting-started, icons, styling, support, tokens, isolate/[name]
- Test-error routes under `(app)/(testing)/test-error/{400,403,404,500,beacon,unexpected,validation,validation-client}`
- `src/routes/+error.svelte`, `src/routes/+layout.svelte`
- API endpoints (server.ts files structure listed, not overviewed):
  - `api/errors/+server.ts`
  - `api/vitals/+server.ts`
  - `api/lens/bundle-sizes/+server.ts`
  - `api/lens/changelog/[name]/+server.ts`
  - `api/lens/compile-standalone/+server.ts`
  - `api/lens/screenshot/+server.ts` and ALL nested screenshot endpoints (android/+server.ts, android/devices, android/devices/create, android/setup, android/stream, ios/+server.ts, ios/devices, ios/stream, devices/+server.ts, frames/+server.ts, status/+server.ts)
- Static endpoints: `manifest.webmanifest/+server.ts`, `robots.txt/+server.ts`, `.well-known/security.txt/+server.ts`

**Lib config files** (not overviewed individually):
- `src/lib/config/app-meta.ts`
- `src/lib/config/devtools-config.ts`
- `src/lib/config/keyboard-shortcuts.ts`
- `src/lib/config/lens-categories.ts` + `lens-category-icons.ts` + `lens-category-icons-domain.ts`
- `src/lib/config/subscription-plans.ts`

**Lib locales**: `src/lib/locales/{de,en,es,fr,ja,ko,zh}.ts` + `schema.ts` (8 files, structure-only).

**Lib schemas**: `src/lib/schemas/{debug-state.ts,editor-state.ts}` (overviewed via index, not individually).

**Lib server preview** — only 2 of ~14 overviewed (`preview-session.ts`, `cdp-screencast.ts`, `scrcpy-server.ts`). NOT yet overviewed:
- `cdp-input.ts`
- `dirty-detector.ts`
- `ios-input.ts`
- `ios-preview-pool.ts`
- `ios-window.ts`
- `preview-types.ts`
- `screenshot-input.ts`
- `screenshot-loop.ts`
- `vite-plugin-preview-ws.ts`
- `scrcpy-control.ts`, `scrcpy-transcode.ts`, `scrcpy-video.ts`
- `adaptive-quality.ts`

**Lib server simulator** — only `ios-pool.ts` and `android-pool.ts` overviewed. NOT yet overviewed:
- iOS: `ios-simctl.ts`, `ios-debug-proxy.ts`, `ios-console-capture.ts`, `ios-safe-area.ts`, `ios-screenshot.ts`, `ios-page-load.ts`, `ios-navigate.ts`, `ios-lifecycle.ts`, `ios-accessibility.ts` (+ `ios-lifecycle-mocked.test.ts`)
- Android: `android-sdk.ts`, `android-cdp.ts`, `android-devices.ts`, `android-screenshot.ts`, `android-navigate.ts`, `android-page-load.ts`, `android-lifecycle.ts`, `android-accessibility.ts`
- Shared: `device-frames.ts`, `viewport-units.ts`

**Lib stores** — overviewed `editor-state.svelte.ts` and `i18n.svelte.ts`. NOT individually overviewed: `debug-state.svelte.ts`, `keyboard-shortcuts-store.svelte.ts`, `lens-notifications.svelte.ts`.

**Lib server data/mock** — `data/index.ts` + `data/types.ts` overviewed. NOT overviewed: `mock/data.ts`, `mock/service.ts`.

**Lib utils**: `src/lib/utils/url-params.ts`.

**Test mocks**: `src/test-mocks/{app-environment,app-navigation,app-state}.ts`, `src/test-setup-component.ts`.

**E2E tests** (25 suites in `e2e/`) — listed but not opened. They exercise: accessibility, dev-toolbar, error-pages, feature-flags, head-meta, header-user, hydration-flash, icons, keyboard-navigation, language-switcher, layout, locale, manifest, nav-scenes, project-user-data, robots-txt, security-headers, security-txt, sidebar (+ collapsed/mobile variants), subscription-plan, theme-mode, theme-switcher, tooltips, vitals.

**Branding / static**: `branding/` and `static/` — assets, not source. Skip in code phase.

### `@/lint` (`packages/shared/config/tooling/lint`)

Coverage was strategic — entry points, framework, and registries. NOT overviewed individually:
- **All 632 rule files** under `src/rules/{comments,complexity,directives,hygiene,imports,jsdoc,naming,package,plans,primitives,result,svelte5,svelte5-config,testing,typescript,valibot,vscode,workspace}/`. Only directory listings captured (filename inventory).
- **All 115 tool wrappers** under `src/tools/` (every external linter integration). Only `registry.ts` overviewed.
- Locale files under `src/locale/locales/`.
- Framework helpers: `comment-helpers.ts`, `exec.ts`, `file-fingerprint.ts`, `missing-tool.ts`, `rule-context.ts`, `source-reader.ts`, `svelte-template.ts`, `worker-entry.ts`.

### `@/cli` (`packages/shared/utils/cli`)

Framework (`utils/`) covered. NOT covered:
- **All 15 tools** under `src/tools/{checks,config,dev-proxy,devenv,format,generate-icons,local-ci,onboard,product-create,product-logs,schema-updater,secrets,secrets-setup,sync,vscode-setup}` — only structure listed; their `index.ts`, `flags/`, `locales/`, `utils/`, `schemas/`, `formatters/`, `template/` not overviewed.
- `src/utils/flags/` — 30+ flag modules listed but not symbol-overviewed.
- `src/locale/{schema.ts,locales/}`.
- `src/schemas/index.ts`.

### `@/ui` (`packages/shared/ui`)

Only `src/index.ts` (slim barrel re-exporting `utils.ts`) was overviewed. **867 component subdirectories** under `src/` are uncovered — each is a folder containing one or more `*.svelte` files + `index.ts`. A bulk listing of folder names was captured but no per-component code traversal occurred. `RULES.md` content not read.

### `@resist/vscode` (`packages/shared/config/tooling/vscode`)

Covered: `extension.ts`, `shared/{lifecycle,state,runner,diagnostics}`, `panel/panel.ts`, `lint/index.ts` (empty barrel). NOT covered:
- All 15 `lint/*.ts` modules: `code-actions`, `code-lens`, `commands`, `diagnostic-filter`, `diff-preview`, `fix-on-save`, `formatting-provider`, `hover`, `import-sorting`, `per-folder`, `provider`, `rules-viewer`, `stage-indicator`, `stale-cleanup`, `watcher`.
- Most `shared/*.ts` modules: `brand`, `command-registration`, `config`, `debounce`, `document-filter`, `errors`, `events`, `file-watcher`, `notifications`, `output`, `progress`, `status-bar`, `types`, `workspace`.
- `panel/{tree-data-provider.ts, tree-items.ts, menu-sync.test.ts}`.
- `__mocks__/vscode.ts` (test mock; large stub).
- `locale/` (i18n).
- `scripts/generate-manifest.ts` (build script).
- `RULES.md` not read.

### `@/locale` (`packages/shared/locale`)

All 9 source modules overviewed individually. **Already 100% covered** at the symbol-overview level. The persisted `packages/` dir under `packages/shared/locale/packages/` was not investigated (likely build artifact — need to verify if it's a git-tracked dir or not).

### `@/test-presets` (`packages/shared/config/test`)

All 4 presets overviewed (base, node, svelte, playwright). `harness/index.ts` came back empty `{}` (likely barrel). NOT individually overviewed:
- `harness/{ansi,async,clock,console,http,process,temp-dir}.ts`.
- `bench/data.ts`.

### `@/utils/devtools`, `@/utils/web-vitals`, `@/schemas/core-config`, `@/schemas/function`, `@/schemas/generic`, `@/schemas/template-literal`, `@/utils/result`, `@/utils/beacon`, `@/utils/core`, `@/secrets/infisical`, `@/schemas/result`, `@/schemas/common`, `@/config`, `@/config/tooling/{node,svelte,vite}`

**Fully covered** (every primary `.ts` source module overviewed). The only items remaining are auxiliary `.test.ts` files, `.d.ts` ambient files, and any `*-init.ts` paired loaders (e.g., `defaults-init.ts`, `loader-init.ts`).

### Products template & root

- `packages/products-template/app/src/routes/+page.svelte` — Svelte parser unavailable. Only `+page.svelte` exists; it's a stub.
- `packages/products-template/config/src/index.ts` — overviewed (just a `default` export).
- Root config files NOT explored (likely just config — verify before opening): `coverage/`, `node_modules/`, `webforge.code-workspace` (workspace settings — out of scope for code traversal).

### Misc

- **`docs/decisions/`** — only `0001-template.md` exists (per directory listing). No actual decisions logged yet.
- **`docs/plans/`** — listed (LENS-COMPONENTS.md, LINT-RULES.md, PLAN.md, TODO-PROMPTS.md, TODO.md, plus `docs/`/`linter/`/`projects/`/`repository/` subdirs and `research.md`). Content not read.
- **`docs/plans-archive/`** — 14+ archived plans listed by filename; content not read.
- **`_INTEGRATE/`** — explicitly excluded from `tsconfig.json` (`"exclude": ["node_modules", "dist", ".svelte-kit", "_INTEGRATE"]`). Not part of the workspace; should remain unexplored unless directly asked.
- **`.claude/hooks/`** — referenced heavily in CLAUDE.md but not enumerated in this pass.
- **`coverage/`** — vitest output; build artifact.

## Recommended Phase-2 follow-ups (priority order)

**Phase-3 status (2026-05-05)**: items 1, 2, 3, 4, 5, 6, 7 are CLOSED. Item 8 partial.

1. ~~`@/ui` index pattern + a representative slice~~ — **CLOSED** by `ui-component-anatomy` memory (15 representative components covering primitives + overlays + forms + data + layout).
2. ~~`@/lint` rules — one rule per category~~ — **CLOSED** by `lint-rules-anatomy` memory (18 representative rules).
3. ~~`@/lint` tools — one tool per kind~~ — **CLOSED** by `lint-tools-anatomy` memory (knip + shellcheck + ruff + svelte-check/tsgo mocked).
4. ~~`@storylyne/editor` lib/server/preview + simulator~~ — **CLOSED** by `storylyne-preview-simulator` memory (covers all preview + simulator files: cdp-input, dirty-detector, ios-input, ios-preview-pool, ios-window, preview-types, screenshot-input, screenshot-loop, vite-plugin-preview-ws, scrcpy-control/transcode/video, adaptive-quality, ios-simctl, ios-debug-proxy, ios-console-capture, ios-safe-area, ios-screenshot, ios-page-load, ios-navigate, ios-lifecycle, ios-accessibility, android-sdk, android-cdp, android-devices, android-screenshot, android-navigate, android-page-load, android-lifecycle, android-accessibility, device-frames, viewport-units).
5. ~~`@storylyne/editor` API routes~~ — **CLOSED** by `storylyne-api` memory (per-file detail for every `/api/**` endpoint).
6. ~~`@/cli` tools — runner-tool pattern~~ — **CLOSED** by `cli-tools-anatomy` memory (checks + format + secrets + onboard + sync).
7. ~~`@resist/vscode` lint/* modules~~ — **CLOSED** by `vscode-lint-modules` memory (15 lint/* files + remaining shared/* + panel/* + scripts/ + locale/).
8. **Svelte components** — PARTIAL. The `<script module>` schema convention is documented in `ui-component-anatomy`. Per-file `<script lang="ts">` body capture for the ~35 storylyne editor components remains uncovered. The `storylyne-components` memory documents file inventory but not script-block contents.

## Newly written this phase (2026-05-05)

In addition to the 7 gap-closing memories above:
- `storylyne-stores-and-config` — per-file detail for `lib/stores/`, `lib/config/`, `lib/schemas/`, `lib/locales/`, `lib/utils/url-params.ts`.
- `storylyne-lens-shell` — the 3,585-line `(testing)/+layout.svelte`.
- `storylyne-e2e` — 26 Playwright suites with one-line descriptions.
- `test-presets-harness` — per-shim detail for `harness/{ansi,async,clock,console,http,process,temp-dir}.ts` + `bench/data.ts`.
- `misc-coverage` — small uncovered items (template stubs, locale build artifacts, baseline-compare.mjs).

Plus ADR-0003 (`docs/decisions/0003-stop-active-plan-block-discrepancy.md`) — Proposed status, documents the discrepancy where CLAUDE.md describes a `stop-active-plan-block.sh` Stop hook that does not exist on disk.

Plus 5 duplicate-pair audit reconciliations (companion-memory cross-references added to `error-handling`/`observability`, `i18n-system`/`locale-overview`, `config-files`/`config-core-overview`, `data-layer`, `integrations`).
