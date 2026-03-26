# Rename WebForge → Storyline — Design Document

**Date:** 2026-03-03
**Scope:** Editor package only (`packages/products/webforge/editor/`)
**New name:** Storyline

## Architecture

### Single Source of Truth

```
app-meta.ts (APP_NAME = 'Storyline')
    ↓
editor-state.ts (schema default imports APP_NAME)
    ↓
editor-state.svelte.ts (store loads from schema defaults)
    ↓
+layout.svelte reads store.app.appName
    ↓
All UI: <title>, meta tags, sidebar branding, error pages
```

No fallbacks. No hardcoded brand strings. If `APP_NAME` isn't defined, it's a build failure.

### localStorage Key Convention

Old: `webforge:*` → New: `app:*`

| Old Key | New Key |
|---------|---------|
| `webforge:editor-state` | `app:editor-state` |
| `webforge:debug-state` | `app:debug-state` |
| `webforge:sidebar-px` | `app:sidebar-px` |
| `paneforge:webforge:sidebar-width` | `paneforge:app:sidebar-width` |
| `webforge:sidebar-width` (autoSaveId) | `app:sidebar-width` |

### Locale Changes

**Remove** `meta.applicationName` — redundant with `APP_NAME` in state.

**Parameterize** `meta.description`:
```typescript
// Schema
description: messageTemplate({ appName: v.string() }),

// Usage (en.ts)
description: '{appName} — Your Story, Rendered',

// Rendered
t(localeStore.t.meta.description, '{appName} — Your Story, Rendered', { appName: store.app.appName })
```

**Rename** `project.webforgeProject` → `project.project` (key only, translations unchanged).

### File Renames

| Old | New |
|-----|-----|
| `WebForgeLogo.svelte` | `AppLogo.svelte` |
| `web-forge-logo.test.ts` | `app-logo.test.ts` |

### Test Strategy

All E2E and unit tests that assert brand strings import `APP_NAME` from `app-meta.ts` and `STORAGE_KEY` from the respective store module. Zero hardcoded brand strings in tests.

### Not Changed

- Package names (`@webforge/editor`, `@webforge/runtime`, `@webforge/plugin-api`)
- Directory structure (`packages/products/webforge/`)
- Config files (`tsconfig.json`, `svelte.config.js`, `vite.config.ts`, `playwright.config.ts`)
- URL param prefix (`wf.`)
- Security URLs in `app-meta.ts` (GitHub repo URLs — separate concern)
- Stack trace fixtures in `hooks.client.test.ts` (filesystem paths)
