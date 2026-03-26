# Build Info & Enhanced Error Details — Design Document

**Date:** 2026-03-04
**Scope:** Editor-only (`@webforge/editor`)
**Skill:** build-editor

---

## Goals

1. **Build-time metadata** — Inject git commit, branch, version, build timestamp, dirty flag at compile time via Vite `define`
2. **Build info in app state** — Add `build` section to `EditorState` so version/git info is accessible everywhere
3. **Build info in DevToolbar** — Display version, commit, branch, dirty, build timestamp in the Debug panel
4. **Enhanced server error logging** — Log all missing CapturedError/AppError fields (`contexts`, `help`, `source`, `related`) + SvelteKit-specific context (locale, userAgent, referer, searchParams, isDataRequest)
5. **Enhanced client error logging** — Log missing fields (`tags`, `user`, `release`, `serverName`, `contexts`, `help`, `source`, `related`) + build info
6. **Ambient error context** — Pass `release`, `serverName`, `tags` to `setupGlobalErrorHandling` so every CapturedError carries build/deployment info automatically
7. **Console-accessible build info** — Expose `window.__STORYLYNE_BUILD__` for support/debugging
8. **Response headers** — Add `X-App-Version` and `X-Git-Commit` to all server responses

---

## Architecture

### Build-Time Injection Flow

```
git CLI ──→ vite.config.ts define ──→ compile-time replacement ──→ both server + client
                                           │
                                     ┌─────┴──────┐
                                     ▼            ▼
                               hooks.server.ts  hooks.client.ts
                               (setupGlobal     (setupGlobal
                                ErrorHandling    ErrorHandling
                                release: ...)    release: ...)
                                     │            │
                                     ▼            ▼
                               Every CapturedError auto-carries
                               release + serverName + tags
```

### Data Flow

```
vite.config.ts (define constants)
  │
  ├─→ lib/config/build-info.ts        ← centralizes access, validates schema
  │     │
  │     ├─→ EditorState.build          ← populated on store init
  │     ├─→ DevToolbarDebug.svelte     ← displayed in debug panel
  │     └─→ window.__STORYLYNE_BUILD__ ← set on client init
  │
  ├─→ hooks.server.ts
  │     ├─ setupGlobalErrorHandling({ release, serverName, tags })
  │     ├─ logCapturedError() ← logs all missing fields
  │     ├─ handleError() ← adds locale, userAgent, referer, searchParams
  │     └─ handle() ← adds X-App-Version, X-Git-Commit headers
  │
  └─→ hooks.client.ts
        ├─ setupGlobalErrorHandling({ release, tags })
        └─ logErrorToConsole() ← logs all missing fields + build info
```

---

## Schemas

### `lib/schemas/build-info.ts` (NEW)

```typescript
import * as v from 'valibot';

export const BuildInfoSchema = v.strictObject({
  version: v.pipe(v.string(), v.minLength(1)),
  commit: v.pipe(v.string(), v.minLength(1)),
  commitFull: v.pipe(v.string(), v.minLength(1)),
  branch: v.pipe(v.string(), v.minLength(1)),
  dirty: v.boolean(),
  buildTimestamp: v.pipe(v.string(), v.isoTimestamp()),
});

export type BuildInfo = v.InferOutput<typeof BuildInfoSchema>;
```

### `EditorStateSchema` Change

Add `build` field to the top-level schema:

```typescript
import { BuildInfoSchema } from '$lib/schemas/build-info';

export const EditorStateSchema = v.strictObject({
  app: AppPreferencesSchema,
  features: FeatureFlagsSchema,
  build: BuildInfoSchema,
});
```

The `build` section is NOT persisted to localStorage — it's populated from build-time constants on every app init and is read-only.

---

## Build-Time Constants

### `vite.config.ts` Changes

```typescript
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function getGitInfo() {
  try {
    return {
      commit: execSync('git rev-parse --short HEAD').toString().trim(),
      commitFull: execSync('git rev-parse HEAD').toString().trim(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      dirty: execSync('git status --porcelain').toString().trim().length > 0,
    };
  } catch {
    return { commit: 'unknown', commitFull: 'unknown', branch: 'unknown', dirty: false };
  }
}

const git = getGitInfo();
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(git.commit),
    __GIT_COMMIT_FULL__: JSON.stringify(git.commitFull),
    __GIT_BRANCH__: JSON.stringify(git.branch),
    __GIT_DIRTY__: JSON.stringify(git.dirty),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
  // ... existing plugins, ssr config
});
```

### `svelte.config.js` Change

Set `kit.version.name` to the git commit hash for SvelteKit's built-in version detection:

```javascript
import { execSync } from 'node:child_process';

let gitHash = 'unknown';
try { gitHash = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}

export default {
  kit: {
    version: { name: gitHash },
    // ... existing alias config
  },
};
```

### Type Declarations (`app.d.ts` addition)

```typescript
declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __GIT_COMMIT_FULL__: string;
declare const __GIT_BRANCH__: string;
declare const __GIT_DIRTY__: boolean;
declare const __BUILD_TIMESTAMP__: string;
```

---

## `lib/config/build-info.ts` (NEW)

Centralizes access to build-time constants with schema validation:

```typescript
import { safeParse } from '@/utils/result/safe';
import { BuildInfoSchema, type BuildInfo } from '$lib/schemas/build-info';
import type { Result } from '@/schemas/result/result';

export function getBuildInfo(): Result<BuildInfo> {
  return safeParse(BuildInfoSchema, {
    version: __APP_VERSION__,
    commit: __GIT_COMMIT__,
    commitFull: __GIT_COMMIT_FULL__,
    branch: __GIT_BRANCH__,
    dirty: __GIT_DIRTY__,
    buildTimestamp: __BUILD_TIMESTAMP__,
  });
}
```

---

## EditorState Build Population

### `lib/stores/editor-state.svelte.ts` Changes

On init, populate the `build` field from `getBuildInfo()`:

```typescript
import { getBuildInfo } from '$lib/config/build-info';

// In initEditorStore():
const buildResult = getBuildInfo();
const build = buildResult.ok ? buildResult.data : {
  version: 'unknown', commit: 'unknown', commitFull: 'unknown',
  branch: 'unknown', dirty: false, buildTimestamp: new Date().toISOString(),
};
// Set editorState.build = build (non-persisted)
```

The `build` field is excluded from localStorage serialization — it's always derived from compile-time constants.

---

## Enhanced Server Error Logging

### `hooks.server.ts` — `setupGlobalErrorHandling` Changes

Pass ambient context so every CapturedError carries it:

```typescript
setupGlobalErrorHandling({
  release: __APP_VERSION__,
  serverName: __GIT_COMMIT__,
  tags: { branch: __GIT_BRANCH__ },
  onError: (captured) => logCapturedError(captured),
});
```

### `hooks.server.ts` — `logCapturedError` Changes

Add missing fields:

```typescript
function logCapturedError(captured: CapturedError): void {
  // ... existing fields ...
  // ADD:
  ...(appError.help && { help: appError.help }),
  ...(appError.source && { source: appError.source }),
  ...(appError.related && appError.related.length > 0 && {
    related: appError.related.map((e) => ({ code: e.code, message: e.message })),
  }),
  ...(captured.contexts && { contexts: captured.contexts }),
}
```

### `hooks.server.ts` — `handleError` Changes

Enrich the error meta with SvelteKit-specific context:

```typescript
meta: {
  status,
  message,
  url: event.url.pathname,
  method: event.request.method,
  route: event.route?.id ?? null,
  // ADD:
  locale: event.locals.locale,
  userAgent: event.request.headers.get('user-agent'),
  referer: event.request.headers.get('referer'),
  searchParams: Object.fromEntries(event.url.searchParams),
  isDataRequest: event.isDataRequest,
},
```

### `hooks.server.ts` — `handle` Changes

Add build info response headers:

```typescript
response.headers.set('X-App-Version', __APP_VERSION__);
response.headers.set('X-Git-Commit', __GIT_COMMIT__);
```

---

## Enhanced Client Error Logging

### `hooks.client.ts` — `setupGlobalErrorHandling` Changes

```typescript
setupGlobalErrorHandling({
  release: __APP_VERSION__,
  tags: { branch: __GIT_BRANCH__, side: 'client' },
  onError: (captured) => logErrorToConsole(captured),
});
```

### `hooks.client.ts` — `logErrorToConsole` Changes

Add missing fields to the main entries table:

```typescript
// ADD to entries array:
if (captured.release) entries.push(['Release', captured.release]);
if (captured.serverName) entries.push(['Server', captured.serverName]);

// ADD new sections after breadcrumbs:
if (captured.tags) { console.log('Tags:', captured.tags); }
if (captured.user) { console.log('User:', captured.user); }
if (captured.contexts) { console.log('Contexts:', captured.contexts); }
if (appError.help) { console.log('Help:', appError.help); }
if (appError.source) { console.log('Source pointer:', appError.source); }
if (appError.related?.length) {
  console.log('Related errors:', appError.related.map(e => `${e.code}: ${e.message}`));
}
```

---

## DevToolbar Build Info Section

### `DevToolbarDebug.svelte` Changes

Add a "Build Info" section at the bottom of the debug panel:

```
┌─ Build Info ────────────────────────┐
│  Version    0.0.0                   │
│  Commit     fe8bc0f                 │
│  Branch     main                    │
│  Dirty      No                      │
│  Built      2026-03-04T10:30:00Z    │
│  [Copy Build Info]                  │
└─────────────────────────────────────┘
```

- Read from `editorStore.build`
- "Copy Build Info" button copies a formatted text block to clipboard
- Dirty flag shows a warning badge if `true`

---

## Window Global

### `+layout.svelte` or client-side init

```typescript
if (browser) {
  const buildResult = getBuildInfo();
  if (buildResult.ok) {
    (window as any).__STORYLYNE_BUILD__ = buildResult.data;
  }
}
```

Declared in `app.d.ts`:
```typescript
interface Window {
  __EDITOR_DEVTOOLS__?: EditorDevtools;
  __STORYLYNE_BUILD__?: BuildInfo;
}
```

---

## Test Mock Updates

### `test-mocks/app-environment.ts`

Currently mocks `$app/environment` — must add `version` export:

```typescript
export const version = 'test-version';
```

### `vitest.config.ts`

Add `define` entries for test environment:

```typescript
// In the editor project config:
define: {
  __APP_VERSION__: JSON.stringify('0.0.0-test'),
  __GIT_COMMIT__: JSON.stringify('abc1234'),
  __GIT_COMMIT_FULL__: JSON.stringify('abc1234def5678901234567890abcdef12345678'),
  __GIT_BRANCH__: JSON.stringify('test-branch'),
  __GIT_DIRTY__: 'false',
  __BUILD_TIMESTAMP__: JSON.stringify('2026-01-01T00:00:00.000Z'),
},
```

---

## Locale Keys

New keys needed in all 7 locales:

| Key | English | Purpose |
|-----|---------|---------|
| `devToolbar.buildInfo` | `"Build Info"` | Section header |
| `devToolbar.labels.version` | `"Version"` | Build info label |
| `devToolbar.labels.commit` | `"Commit"` | Build info label |
| `devToolbar.labels.branch` | `"Branch"` | Build info label |
| `devToolbar.labels.dirty` | `"Dirty"` | Build info label |
| `devToolbar.labels.built` | `"Built"` | Build info label |
| `devToolbar.copyBuildInfo` | `"Copy Build Info"` | Button label |
| `devToolbar.labels.dirtyYes` | `"Yes"` | Dirty flag value |
| `devToolbar.labels.dirtyNo` | `"No"` | Dirty flag value |

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `lib/schemas/build-info.ts` | CREATE | BuildInfoSchema Valibot schema |
| `lib/config/build-info.ts` | CREATE | `getBuildInfo()` accessor |
| `lib/schemas/editor-state.ts` | MODIFY | Add `build` field to EditorStateSchema |
| `lib/stores/editor-state.svelte.ts` | MODIFY | Populate build on init, exclude from persistence |
| `vite.config.ts` | MODIFY | Add `define` block with git/build constants |
| `svelte.config.js` | MODIFY | Set `kit.version.name` to git hash |
| `src/app.d.ts` | MODIFY | Add build constant declarations + Window type |
| `src/hooks.server.ts` | MODIFY | Enhanced logging, ambient context, response headers |
| `src/hooks.client.ts` | MODIFY | Enhanced logging, ambient context, build info |
| `src/lib/components/DevToolbarDebug.svelte` | MODIFY | Add Build Info section |
| `+layout.svelte` | MODIFY | Set `window.__STORYLYNE_BUILD__` |
| `vitest.config.ts` (root) | MODIFY | Add `define` for test build constants |
| `test-mocks/app-environment.ts` | MODIFY | Add `version` export |
| All 7 locale files | MODIFY | Add new locale keys |
| Tests (colocated) | CREATE/MODIFY | Unit tests for all new code |
