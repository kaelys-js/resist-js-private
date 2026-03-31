# Build Info & Enhanced Error Details — Implementation Plan

**Date:** 2026-03-04
**Design:** `docs/plans/2026-03-04-build-info-error-details-design.md`
**Scope:** Editor-only (`@webforge/editor`)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Task 1: Build Info Schema + Accessor

**Files:**
- CREATE `src/lib/schemas/build-info.ts`
- CREATE `src/lib/schemas/build-info.test.ts`
- CREATE `src/lib/config/build-info.ts`
- CREATE `src/lib/config/build-info.test.ts`

**Schema (`src/lib/schemas/build-info.ts`):**
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

**Tests for schema (`build-info.test.ts`):**
- Valid BuildInfo passes safeParse
- Missing fields fail
- Empty version fails (minLength)
- Invalid timestamp fails

**Accessor (`src/lib/config/build-info.ts`):**
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

**Tests for accessor (`build-info.test.ts`):**
- `getBuildInfo()` returns `ok: true` with valid build info (relies on vitest `define`)
- All fields present and correct types

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format`

---

## Task 2: Vite Define + Svelte Config + Type Declarations + Test Config

**Files:**
- MODIFY `vite.config.ts` (editor) — add `define` block
- MODIFY `svelte.config.js` — set `kit.version.name` to git hash
- MODIFY `src/app.d.ts` — add build constant declarations + Window.__STORYLYNE_BUILD__
- MODIFY root `vitest.config.ts` — add `define` for test build constants in editor project

**`vite.config.ts` changes:**
Add at top:
```typescript
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
```

Add `getGitInfo()` helper function + `define` block in config:
```typescript
define: {
  __APP_VERSION__: JSON.stringify(pkg.version),
  __GIT_COMMIT__: JSON.stringify(git.commit),
  __GIT_COMMIT_FULL__: JSON.stringify(git.commitFull),
  __GIT_BRANCH__: JSON.stringify(git.branch),
  __GIT_DIRTY__: JSON.stringify(git.dirty),
  __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
},
```

**`svelte.config.js` changes:**
Add git hash computation and set `kit.version.name`:
```javascript
let gitHash = 'unknown';
try { gitHash = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}
// In kit config:
version: { name: gitHash },
```

**`src/app.d.ts` additions:**
```typescript
declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __GIT_COMMIT_FULL__: string;
declare const __GIT_BRANCH__: string;
declare const __GIT_DIRTY__: boolean;
declare const __BUILD_TIMESTAMP__: string;

interface Window {
  __EDITOR_DEVTOOLS__?: EditorDevtools;
  __STORYLYNE_BUILD__?: import('$lib/schemas/build-info').BuildInfo;
}
```

**Root `vitest.config.ts` changes:**
In the editor project config, add `define`:
```typescript
define: {
  __APP_VERSION__: JSON.stringify('0.0.0-test'),
  __GIT_COMMIT__: JSON.stringify('abc1234'),
  __GIT_COMMIT_FULL__: JSON.stringify('abc1234def5678901234567890abcdef12345678'),
  __GIT_BRANCH__: JSON.stringify('test-branch'),
  __GIT_DIRTY__: 'false',
  __BUILD_TIMESTAMP__: JSON.stringify('2026-01-01T00:00:00.000Z'),
},
```

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format`

---

## Task 3: Enhanced Server Error Logging

**Files:**
- MODIFY `src/hooks.server.ts`
- MODIFY `src/hooks.server.test.ts`

**Changes to `setupGlobalErrorHandling` call:**
```typescript
setupGlobalErrorHandling({
  release: __APP_VERSION__,
  serverName: __GIT_COMMIT__,
  tags: { branch: __GIT_BRANCH__, side: 'server' },
  onError: (captured) => logCapturedError(captured),
});
```

**Changes to `logCapturedError`:**
Add missing fields after existing conditional spreads:
```typescript
...(appError.help && { help: appError.help }),
...(appError.source && { source: appError.source }),
...(appError.related && appError.related.length > 0 && {
  related: appError.related.map((e) => ({ code: e.code, message: e.message })),
}),
...(captured.contexts && { contexts: captured.contexts }),
```

**Changes to `handleError` meta:**
Add to the existing meta object in the INTERNAL.UNEXPECTED branch:
```typescript
locale: event.locals.locale,
userAgent: event.request.headers.get('user-agent'),
referer: event.request.headers.get('referer'),
searchParams: Object.fromEntries(event.url.searchParams),
isDataRequest: event.isDataRequest,
```

**Changes to `handle` function:**
After existing security headers, add build info headers:
```typescript
response.headers.set('X-App-Version', __APP_VERSION__);
response.headers.set('X-Git-Commit', __GIT_COMMIT__);
```

**Tests:**
- Verify `logCapturedError` logs `help` when present on AppError
- Verify `logCapturedError` logs `source` when present on AppError
- Verify `logCapturedError` logs `related` when present on AppError
- Verify `logCapturedError` logs `contexts` when present on CapturedError
- Verify `handleError` meta includes `locale`, `userAgent`, `referer`, `searchParams`, `isDataRequest`
- Verify `handle` adds `X-App-Version` and `X-Git-Commit` response headers
- Verify signal-type errors still log at info level (existing test still passes)

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format`

---

## Task 4: Enhanced Client Error Logging

**Files:**
- MODIFY `src/hooks.client.ts`
- MODIFY `src/hooks.client.test.ts`

**Changes to `setupGlobalErrorHandling` call:**
```typescript
setupGlobalErrorHandling({
  release: __APP_VERSION__,
  tags: { branch: __GIT_BRANCH__, side: 'client' },
  onError: (captured) => logErrorToConsole(captured),
});
```

**Changes to `logErrorToConsole` entries array:**
Add after existing conditional entries:
```typescript
if (captured.release) entries.push(['Release', captured.release]);
if (captured.serverName) entries.push(['Server', captured.serverName]);
```

**Add new sections after breadcrumbs, before `console.groupEnd()`:**
```typescript
// Tags
if (captured.tags && Object.keys(captured.tags).length > 0) {
  console.log('%cTags:', 'color: #666; font-style: italic');
  console.log(captured.tags);
}

// User context
if (captured.user) {
  console.log('%cUser:', 'color: #666; font-style: italic');
  console.log(captured.user);
}

// Structured contexts
if (captured.contexts && Object.keys(captured.contexts).length > 0) {
  console.log('%cContexts:', 'color: #666; font-style: italic');
  console.log(captured.contexts);
}

// Help suggestion
if (appError.help) {
  console.log('%cHelp: %c%s', 'color: #666; font-style: italic', 'color: #6c6', appError.help);
}

// Error source pointer
if (appError.source) {
  console.log('%cSource pointer:', 'color: #666; font-style: italic');
  console.log(appError.source);
}

// Related errors
if (appError.related && appError.related.length > 0) {
  console.log('%cRelated errors:', 'color: #666; font-style: italic');
  for (const rel of appError.related) {
    console.log(`  [${rel.code}] ${rel.message}`);
  }
}
```

**Tests:**
- Verify `logErrorToConsole` logs `Release` entry when `captured.release` is present
- Verify `logErrorToConsole` logs `Server` entry when `captured.serverName` is present
- Verify `logErrorToConsole` logs `Tags` section when `captured.tags` has entries
- Verify `logErrorToConsole` logs `User` section when `captured.user` is present
- Verify `logErrorToConsole` logs `Contexts` section when `captured.contexts` has entries
- Verify `logErrorToConsole` logs `Help` when `appError.help` is present
- Verify `logErrorToConsole` logs `Source pointer` when `appError.source` is present
- Verify `logErrorToConsole` logs `Related errors` when `appError.related` has entries

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format`

---

## Task 5: Locale Keys

**Files:**
- MODIFY `src/lib/locales/schema.ts` — add new keys to devToolbar section
- MODIFY `src/lib/locales/en.ts` — add English translations
- MODIFY `src/lib/locales/ja.ts` — add Japanese translations
- MODIFY `src/lib/locales/zh.ts` — add Chinese translations
- MODIFY `src/lib/locales/ko.ts` — add Korean translations
- MODIFY `src/lib/locales/fr.ts` — add French translations
- MODIFY `src/lib/locales/de.ts` — add German translations
- MODIFY `src/lib/locales/es.ts` — add Spanish translations

**New keys in schema:**
```typescript
// In devToolbar section:
buildInfo: messageTemplate(),
copyBuildInfo: messageTemplate(),

// In devToolbar.labels section:
version: messageTemplate(),
commit: messageTemplate(),
branch: messageTemplate(),
dirty: messageTemplate(),
built: messageTemplate(),
dirtyYes: messageTemplate(),
dirtyNo: messageTemplate(),
```

**English values:**
```typescript
buildInfo: 'Build Info',
copyBuildInfo: 'Copy Build Info',
// labels:
version: 'Version',
commit: 'Commit',
branch: 'Branch',
dirty: 'Dirty',
built: 'Built',
dirtyYes: 'Yes',
dirtyNo: 'No',
```

**Note:** Locale test at `src/lib/locales/locales.test.ts` auto-validates all locales against the schema — adding keys to schema + all locale files is enough.

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format && pnpm qa:test`

---

## Task 6: DevToolbar Build Info Section

**Files:**
- MODIFY `src/lib/components/DevToolbarDebug.svelte` — add Build Info section
- MODIFY `src/lib/components/dev-toolbar-debug.test.ts` — add tests

**Component changes:**
Import `getBuildInfo` from `$lib/config/build-info`. Add a "Build Info" section at the bottom with a bordered separator:

```
┌─ Build Info ─────────────────────────┐
│  Version    0.0.0                    │
│  Commit     abc1234                  │
│  Branch     main                     │
│  Dirty      No                       │
│  Built      2026-03-04T10:30:00Z     │
│  [Copy Build Info]                   │
└──────────────────────────────────────┘
```

- Use locale keys for all labels
- "Dirty" shows `dirtyYes`/`dirtyNo` locale values
- If dirty is true, show a yellow warning indicator
- "Copy Build Info" copies formatted multiline text to clipboard
- `data-testid="build-info"` on the section container

**Tests:**
- Renders "Build Info" section header
- Renders version value
- Renders commit value
- Renders branch value
- Renders dirty value ("No" by default since test define sets false)
- Renders built timestamp
- Renders "Copy Build Info" button

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format`

---

## Task 7: Window Global + Layout Integration

**Files:**
- MODIFY `src/routes/+layout.svelte` — set `window.__STORYLYNE_BUILD__` on client init

**Changes:**
In the existing `onMount` or client-side init block in `+layout.svelte`, after debug init:
```typescript
import { getBuildInfo } from '$lib/config/build-info';
import { browser } from '$app/environment';

// In client-side init:
if (browser) {
  const buildResult = getBuildInfo();
  if (buildResult.ok) {
    window.__STORYLYNE_BUILD__ = buildResult.data;
  }
}
```

No separate test needed — this is a console convenience feature. The E2E tests can verify it if needed later.

**QA:** `pnpm -w run qa:lint --tools && pnpm -w run qa:lint && pnpm -w run qa:format`

---

## Task 8: Full QA Pass

**Commands:**
```bash
pnpm -w run qa:lint --tools
pnpm -w run qa:lint
pnpm -w run qa:format
pnpm qa:test
```

All 2784+ tests must pass. 0 type errors. 0 lint errors (excluding pre-existing TODO comments).
