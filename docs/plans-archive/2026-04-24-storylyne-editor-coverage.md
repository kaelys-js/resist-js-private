# @storylyne/editor — Get qa:test:coverage Passing Thresholds

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-24
**Package**: `@storylyne/editor` (`packages/products/storylyne/editor/src/`)
**Goal**: Drive `qa:test:coverage` above all four thresholds (S:80% B:75% F:80% L:80%) via test-only additions that fully exercise every branch in the ten highest-gap files. Zero assertion weakening, zero skipped errors, zero dismissed diagnostics.
**Architecture**: SvelteKit server routes + client hooks + server-only simulator modules. Tests use vitest + v8 coverage, with vi.mock for `playwright` (dynamic import), `node:child_process` (execFile/execSync), `node:fs`, `ws` (WebSocket), `svelte/compiler`, `esbuild`, `@tailwindcss/node`, and `$app/environment`. Existing global setup in `src/test-setup-component.ts` supplies jsdom polyfills (matchMedia, ResizeObserver, Element.animate).

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 1105 total (1105 pass, 75 test files) |
| Type-check | Passes |
| Statements | 47.92% (1538/3209) — **FAIL** (need 80%) |
| Branches | 40.24% (619/1538) — **FAIL** (need 75%) |
| Functions | 52.49% (263/501) — **FAIL** (need 80%) |
| Lines | 47.94% (1525/3181) — **FAIL** (need 80%) |

### Top-gap source files (sorted by total uncovered items)

| File | Uncov | Current | Notes |
|------|-------|---------|-------|
| `src/routes/api/lens/compile-standalone/+server.ts` | 344 | ~0% | Svelte/esbuild/tailwind pipeline, alias resolution, wrapper fallback |
| `src/routes/api/lens/screenshot/+server.ts` | 260 | 0% | Playwright GET handler, device/media/viewport branches |
| `src/hooks.client.ts` | 224 | 53% | VLQ decode, sourcemap lookup, perf metrics, error reporter |
| `src/routes/api/lens/changelog/[name]/+server.ts` | 127 | partial | Git log parse, cache hit/miss, component resolve |
| `src/lib/server/simulator/android-devices.ts` | 118 | 53% | AVD listing, config.ini parse, avdmanager XML |
| `src/routes/(testing)/changelog/+page.server.ts` | 116 | 0% | Component discovery, skip filters |
| `src/routes/api/lens/screenshot/ios/+server.ts` | 102 | 0% | xcrun gate, accessibility settings, pool acquire/release |
| `src/routes/api/lens/screenshot/android/+server.ts` | 90 | 0% | Android SDK gate, AVD default, CDP forward |
| `src/routes/api/lens/screenshot/devices/+server.ts` | 72 | partial | Playwright devices registry, OS regex, default browser |
| `src/lib/server/simulator/android-cdp.ts` | 67 | 19.6% | adb forward args, CDP message routing, console capture |

Total top-10 uncovered: **~1520 items**. Closing these plus incidental transitive coverage from shared mocks is sufficient to clear all four thresholds.

---

## TASK 1 — `compile-standalone/+server.ts` tests (~35 new tests)

**Status**: [x]

**Gap**: 344 uncovered items. Existing `server.test.ts` only covers 3 happy cases. Untested: input validation errors, 404 missing componentDir, kebab→Pascal primary file discovery across multiple candidates, EXACT vs WILDCARD alias resolution, tailwind catch→`:root`/`.dark` fallback extraction, wrapper-present vs wrapper-absent branches, esbuild compilation errors.

**Plan**:
- Mock `svelte/compiler` (compile returning stub JS), `esbuild` (build returning stub bundle), `@tailwindcss/node` (compile returning css or throwing), `node:fs` (readFileSync/readdirSync/statSync/existsSync), `node:path`, `node:url`.
- Dispatch POST with `RequestEvent`-shaped fixtures. Assert Response status + body for every branch.
- Validation: missing componentDir → 400 with exact error code; malformed JSON → 400.
- Missing directory: statSync throws ENOENT → 404 with exact message.
- Primary `.svelte` discovery: directory with `my-button.svelte` + `MyButton.svelte` → prefers Pascal; single-file only → uses it; no `.svelte` → 404.
- Alias resolution: import `@/foo` via EXACT_ALIASES → resolves; `$lib/x` via WILDCARD_ALIASES → resolves; unknown alias → falls through to error.
- Wrapper fallback: wrapper present → compiled; wrapper throw → component-only compile path executes.
- Tailwind catch branch: `@tailwindcss/node.compile` throws → extracts `:root{…}` and `.dark{…}` blocks via regex from source; no blocks present → empty css.
- esbuild error: build throws → 500 with sanitized message (exact code `lens/compile-failed`).
- All assertions use exact error codes/strings — no `toContain('failed')` stubs.

**Files**:
- Edit: `src/routes/api/lens/compile-standalone/server.test.ts`

**Verification**: `pnpm --filter @storylyne/editor exec vitest run src/routes/api/lens/compile-standalone` exits 0; coverage for this file ≥ 90% statements/branches.

---

## TASK 2 — `screenshot/+server.ts` tests (~25 new tests)

**Status**: [x]

**Gap**: 260 uncovered. Dev-only gate, engine validation, device preset, custom viewport, media emulation, throttling, `[data-lens-ready]` wait, performance timing collection, slot release in finally.

**Plan**:
- Mock `playwright` via `vi.doMock('playwright', …)` with chromium/firefox/webkit exposing `launch({…}) → browser → newContext → newPage`. Page stub supports `goto`, `setViewportSize`, `emulateMedia`, `waitForSelector`, `evaluate`, `screenshot`, `route`.
- Mock `$app/environment` with `dev: true`/`false`.
- Tests: production (dev=false) → 404. Missing `component` param → 400. Invalid `engine=ie11` → 400 (not in VALID_ENGINES). Valid `engine=chromium|firefox|webkit` → launch correct browser. Known device preset → viewport+scale from registry. Custom viewport `w=320&h=568&scale=2` → override applied. Media `colorScheme=dark` → emulateMedia called. `reducedMotion=reduce` + `forcedColors=active` → all three flags applied. Throttling flag → page.route handler attached. `waitForSelector('[data-lens-ready]')` resolves → screenshot taken; rejects with timeout → 504 exact code. Performance evaluate returns metrics → included in response JSON. Finally block releases slot even when screenshot throws.

**Files**:
- Create: `src/routes/api/lens/screenshot/server.test.ts`

**Verification**: `pnpm --filter @storylyne/editor exec vitest run src/routes/api/lens/screenshot/server.test.ts` exits 0; `pnpm --filter @storylyne/editor run qa:test:coverage` shows `src/routes/api/lens/screenshot/+server.ts` ≥ 85% branches.

---

## TASK 3 — `hooks.client.ts` tests (~25 new tests)

**Status**: [x]

**Gap**: 224 uncovered (53% current). VLQ decode, source-map URL regex (data-URL vs external), sourcemap position lookup, stack-frame URL parsing (Vite `@fs/` prefix), device-info once-flag, web-vitals beacon flush, cause-chain traversal, Valibot issue formatter.

**Plan**:
- Mock `@/utils/core/*`, `@/utils/beacon/*`, `@/utils/web-vitals/*`, `valibot` (only where behaviour branches — prefer real valibot for schema ok/err). Stub `fetch` via `vi.stubGlobal` for external sourcemap retrieval.
- Export all non-handler helpers for testability OR exercise via `handleError` entry-point using crafted Error objects.
- Tests: VLQ decode round-trip for single-segment, multi-segment, negative deltas, boundary (`1<<30`). Sourcemap URL regex: inline `//# sourceMappingURL=data:application/json;base64,…` → decoded; external `.map` → fetched; absent → null. Stack frame URL parse: `http://host/@fs/abs/path.js:10:5` → extracts abs path; bare `/src/a.ts:1:1`; missing line/col. Position resolution: VLQ mappings produce expected (file, line, col). Device-info flag: first call populates, second call skipped. Web-vitals queue: enqueue when offline, flush on `visibilitychange`. Cause chain: `new Error('a', { cause: new Error('b', { cause: 'c' }) })` → all three surfaces logged. Valibot issue formatter: schema failure produces the exact `[field] message` lines.

**Files**:
- Create: `src/hooks.client.test.ts`

**Verification**: `pnpm --filter @storylyne/editor exec vitest run src/hooks.client.test.ts` exits 0; `pnpm --filter @storylyne/editor run qa:test:coverage` shows `src/hooks.client.ts` ≥ 85% branches.

---

## TASK 4 — `changelog/[name]/+server.ts` tests (~15 new tests)

**Status**: [x]

**Gap**: 127 uncovered. Cache map, git remote parsing (SSH `git@github.com:org/repo.git` vs HTTPS `https://github.com/org/repo`), component dir resolution walking up to `pnpm-workspace.yaml`, git log field/record separator parsing, `MAX_ENTRIES=100` cap, exec timeout.

**Plan**:
- Mock `node:child_process.execSync` returning crafted git log output with sentinel separators. Mock `node:fs` (readdirSync, statSync, existsSync) for walk-up. Reset module-level cache between tests via `vi.resetModules()` per test.
- Tests: missing `name` param → 400 exact code. Cache miss → execSync called; cache hit → not called. SSH remote parse → host/owner/repo extracted. HTTPS remote parse → same fields. Invalid remote → null commit URLs. Commit parser extracts hash/message/body/date/author; empty body handled. More than 100 commits → truncated to MAX_ENTRIES. execSync throws (timeout) → 500 exact code `changelog/git-failed`. Component dir resolution: walks up until `pnpm-workspace.yaml` found → success; absent → error.

**Files**:
- Edit: `src/routes/api/lens/changelog/[name]/server.test.ts`

**Verification**: `pnpm --filter @storylyne/editor exec vitest run 'src/routes/api/lens/changelog/**'` exits 0; `pnpm --filter @storylyne/editor run qa:test:coverage` shows `src/routes/api/lens/changelog/[name]/+server.ts` ≥ 85% branches.

---

## TASK 5 — `android-devices.ts` tests (~15 new tests)

**Status**: [x]

**Gap**: 118 uncovered (53%). `listAvds`, config.ini parse, dimension fallback table, API level extraction, `listHardwareDevices` XML parse.

**Plan**:
- Mock `node:child_process.execFile` (promisified) returning crafted `emulator -list-avds` and `avdmanager list device` outputs. Mock `node:fs/promises.readFile`.
- Tests: `listAvds` parses line-per-AVD stdout; empty → []; exec reject → Result.err with exact code. `getAndroidDevice`: config.ini with `hw.lcd.width=1080 / hw.lcd.height=2400 / image.sysdir.1=system-images/android-35/...` → returns device w/ API 35; missing config → fallback dimensions from lookup table; partial keys → defaults filled. `listHardwareDevices` XML parse: OEM filter retains google devices, drops others; malformed XML → Result.err.

**Files**:
- Edit: `src/lib/server/simulator/android-devices.test.ts` (create if absent)

**Verification**: `pnpm --filter @storylyne/editor exec vitest run src/lib/server/simulator/android-devices.test.ts` exits 0; `pnpm --filter @storylyne/editor run qa:test:coverage` shows `src/lib/server/simulator/android-devices.ts` ≥ 85% branches.

---

## TASK 6 — `android-cdp.ts` tests (~12 new tests)

**Status**: [x]

**Gap**: 67 uncovered (19.6%). adb forward args, CDP message id tracking, Log.entryAdded listener, console verbose filter, timeout reconnect.

**Plan**:
- Mock `ws` with an EventEmitter stub supporting `send`, `on('message')`, `close`. Mock `node:child_process.execFile`.
- Tests: `buildAdbForwardArgs` with/without serial, varied ports, abstract socket path format. `setupCdpForward` calls adb with expected args; exec reject → Result.err. `sendCdpCommand` resolves on matching `id` in response; mismatched id → ignores; malformed JSON → schema err. `captureConsoleLogs` registers Log.enable + listener; verbose level filtered out; info/warn/error passed through with exact level mapping. Timeout: send resolves after timeout window → rejects with exact code `cdp/timeout`.

**Files**:
- Create: `src/lib/server/simulator/android-cdp.test.ts`

**Verification**: `pnpm --filter @storylyne/editor exec vitest run src/lib/server/simulator/android-cdp.test.ts` exits 0; `pnpm --filter @storylyne/editor run qa:test:coverage` shows `src/lib/server/simulator/android-cdp.ts` ≥ 85% branches.

---

## TASK 7 — iOS/Android/devices screenshot route tests (~25 new tests)

**Status**: [x]

**Gap**: 264 uncovered across three files (102 + 90 + 72). Dev-only gates, xcrun/Android-SDK availability gates, accessibility settings parsing, pool acquire/release, CDP setup, device-frame masking, devices registry OS regex + default browser.

**Plan**:
- Mock every `$lib/server/simulator/ios-*` and `$lib/server/simulator/android-*` module: simctl, pool, accessibility, page-load, screenshot, safe-area, device-frames, console-capture, debug-proxy, sdk, navigate, cdp.
- Mock `playwright` for devices registry (reuse TASK 2 stub factory).
- iOS: dev=false → 404; xcrun missing → exact error code + install instruction; valid accessibility params (appearance=dark, contentSize=XXXL, reduceMotion/increaseContrast/reduceTransparency) each applied individually; pool acquire throws → released path still runs; safe-area insets returned in response.
- Android: dev=false → 404; SDK missing → exact error; default AVD `Medium_Phone_API_35` when absent; nightMode accessibility; CDP forward failure → 500; pool release in finally.
- Devices: dev=false → 404; Playwright registry cached (second call does not re-import); OS regex extracts iOS/Android/Windows/Mac; default browser chromium for non-iOS, webkit for iOS; returned profile shape exact.

**Files**:
- Create: `src/routes/api/lens/screenshot/ios/server.test.ts`
- Create: `src/routes/api/lens/screenshot/android/server.test.ts`
- Edit: `src/routes/api/lens/screenshot/devices/server.test.ts`

**Verification**: `pnpm --filter @storylyne/editor exec vitest run 'src/routes/api/lens/screenshot/ios/**' 'src/routes/api/lens/screenshot/android/**' 'src/routes/api/lens/screenshot/devices/**'` exits 0; `pnpm --filter @storylyne/editor run qa:test:coverage` shows all three `+server.ts` files ≥ 85% branches.

---

## TASK 8 — `changelog/+page.server.ts` tests (~10 new tests)

**Status**: [x]

**Gap**: 116 uncovered. Component list discovery, skip filters (`node_modules`, `examples`, `.*`), endpoint URL construction.

**Plan**:
- Mock `node:fs` readdir/stat; craft directory fixtures that include a mix of components, `node_modules`, `.git`, `examples`, regular dirs.
- Tests: returns only non-skipped directories; empty UI dir → `{ components: [] }`; readdir throws → exact err code; endpoint URLs built with kebab-case name; component names sorted.

**Files**:
- Edit: `src/routes/(testing)/changelog/+page.server.test.ts`

**Verification**: `pnpm --filter @storylyne/editor exec vitest run 'src/routes/(testing)/changelog/+page.server.test.ts'` exits 0; `pnpm --filter @storylyne/editor run qa:test:coverage` shows `src/routes/(testing)/changelog/+page.server.ts` ≥ 85% branches.

---

## TASK 9 — Register Rules + Config

**Status**: [ ]

**Plan**:
- Confirm all new `*.test.ts` files are discovered by the `storylyne-editor` vitest project (glob `src/**/*.test.ts` — already matches).
- Verify no production source files were modified — test-only changes.
- Verify no new exports introduced (tests import existing surface only).
- No new rules/commands/config keys added — nothing to register.

**Files**:
- Read-only verify: `vitest.config.ts` root + any editor-specific override

**Verification**: `git diff --name-only HEAD` returns only `.test.ts` files + `docs/plans/*.md`; vitest discovery lists every new file.

---

## TASK 10 — Integration Verification

**Status**: [ ]

**Plan**:
- Command registration check: N/A — no new commands registered (`grep -c registerCommand` unchanged from baseline).
- Config settings read check: N/A — no new `config.get`/settings added; grep confirms no new setting keys.
- Class instantiation check: N/A — no new classes; existing feature wiring untouched (grep for class instantiation unchanged).
- Dead code / unused export check: confirm zero new exports introduced (`git diff -U0 -- 'src/**/*.ts' ':!src/**/*.test.ts'` is empty) — no orphaned exports possible because no production edits exist.
- Grep audit: baseline test count (1105) vs post-plan (≥1105 + ~160 new) — every declared new test resolves.

**Verification**:
- `git diff --name-only HEAD -- 'packages/products/storylyne/editor/src/**/*.ts' ':!**/*.test.ts'` prints nothing (zero production edits).
- `grep -rE 'registerCommand|config\.get\(' packages/products/storylyne/editor/src` count equals baseline.
- No unused export, no dead code: because the plan is test-only, this is structurally guaranteed — still spot-checked by the diff above.
- All 1105 baseline tests still pass (no regressions).

---

## TASK 11 — Full QA + Coverage

**Status**: [ ]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @storylyne/editor run qa:test`
- Run: `pnpm --filter @storylyne/editor run qa:test:coverage`
- Verify all four thresholds pass: S≥80% B≥75% F≥80% L≥80%.
- Verify test count increased from baseline 1105.
- Target: S≥85%, B≥80%, F≥90%, L≥85%.

**Verification**: Every pnpm command exits 0; coverage report shows all four metrics green.

---

## TASK 12 — Final Verification + Commit

**Status**: [ ]

**Plan**:
- Verify every new `*.test.ts` file exists and is picked up by the `storylyne-editor` vitest project.
- Verify coverage now passes all four thresholds (previously failed all four).
- Verify only test files + plan doc changed (`git diff --name-only HEAD`).
- Verify existing 1105 tests still pass (no regressions).
- Commit with message citing baseline → final coverage deltas.

**Verification**:
- Verify test count ≥ 1260 (1105 + ~160 new).
- Verify all four coverage metrics pass thresholds.
- Verify `pnpm --filter @storylyne/editor run qa:test:coverage` exits 0.
- Verify no regressions in existing tests.
- Verify `git diff --name-only HEAD` shows only `*.test.ts` + `docs/plans/*.md`.

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | `compile-standalone/+server.ts` tests | -- |
| 2 | `screenshot/+server.ts` tests | -- |
| 3 | `hooks.client.ts` tests | -- |
| 4 | `changelog/[name]/+server.ts` tests | -- |
| 5 | `android-devices.ts` tests | -- |
| 6 | `android-cdp.ts` tests | -- |
| 7 | iOS/Android/devices screenshot route tests | 6 |
| 8 | `(testing)/changelog/+page.server.ts` tests | -- |
| 9 | Register Rules + Config | 1-8 |
| 10 | Integration Verification | 9 |
| 11 | Full QA + Coverage | 10 |
| 12 | Final Verification + Commit | 11 |
