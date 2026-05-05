# Data Layer — webforge / resist-js-private

> Captured 2026-05-05. Branch: `main`. Companion to `storylyne-overview` and `deployment`.
> 
> **Scope note**: This memory describes data layer architecture — but the data layer is currently *storylyne-specific*. The interface (`DataService`), schemas (`ServerUserSchema`/`ServerProjectSchema`/`ServerSceneSchema`), factory (`createDataService`), mock service, and Cloudflare bindings status all live inside `packages/products/storylyne/editor/src/lib/server/`. There is NO workspace-level data abstraction. Other products would each implement their own `DataService` interface OR the storylyne pattern would be lifted to a shared package when a second product needs it. **Companion memory `storylyne-api`** covers the API endpoints (`/api/errors`, `/api/vitals`, `/api/lens/**`); **companion `storylyne-overview`** describes the DataService factory at high level. No content overlap with those — this memory is the data architecture deep-dive (entities, persistence, future bindings).

## TL;DR

The data layer is **mock-only** today. There is no real database, no migrations, and no production data backend. The architecture is set up to swap in a Cloudflare D1 / KV / R2 backend later, but nothing is wired.

## DataService — the single abstraction

### Interface (`packages/products/storylyne/editor/src/lib/server/data/types.ts`)

```ts
export type DataService = {
  projects: {
    getByOwner: (ownerId: Str) => Promise<Result<ServerProject | null>>;
  };
  scenes: {
    getByProject: (projectId: Str) => Promise<Result<ServerScene[]>>;
  };
};
```

That's the **entire surface** of the data layer right now. No create/update/delete, no listing other than these two by-ID lookups, no search, no pagination. Everything happens server-side; the client never sees a `DataService`.

### Schemas (`src/lib/server/data/types.ts`)

All Valibot strict objects. Validated in mock service before returning.

**`ServerUserSchema`**:
```ts
{
  id: pipe(string(), minLength(1)),
  displayName: pipe(string(), minLength(1)),
  email: pipe(string(), email()),
  avatarUrl: optional(string(), ''),
}
```

**`ServerProjectSchema`**:
```ts
{
  id: pipe(string(), minLength(1)),
  name: pipe(string(), minLength(1)),
  subtitle: optional(string(), ''),
  ownerId: pipe(string(), minLength(1)),
}
```

**`ServerSceneSchema`**:
```ts
{
  id: pipe(string(), minLength(1)),
  title: string(),
  url: string(),
  isActive: optional(boolean(), false),
  order: optional(number(), 0),
}
```

These are the **only** persistent entities currently modeled. No notes, comments, tags, layers, assets, characters, dialogue, encounters, items, locations, or any RPG-domain entity beyond "scene" (which is essentially a sidebar entry today).

### Factory (`src/lib/server/data/index.ts`)

```ts
export function createDataService(_platform?: App.Platform, delayMs: Num = 0): DataService {
  return createMockService(delayMs);
}
```

That's the entire factory. `_platform` is **declared but ignored** (note the underscore prefix — unused-parameter convention). The intent (per JSDoc) is that the factory will eventually inspect `_platform.env.DB` (Cloudflare D1 binding) and choose between mock and D1 services. Currently it always returns mock.

### Mock service (`src/lib/server/mock/service.ts`)

```ts
export function createMockService(delayMs: Num = 0): DataService {
  return {
    projects: {
      async getByOwner(ownerId) {
        await sleep(delayMs);
        return ownerId === MOCK_PROJECT.ownerId ? okUnchecked(MOCK_PROJECT) : okUnchecked(null);
      },
    },
    scenes: {
      async getByProject(projectId) {
        await sleep(delayMs);
        return projectId === MOCK_PROJECT.id ? okUnchecked([...MOCK_SCENES]) : okUnchecked([]);
      },
    },
  };
}
```

The `delayMs` parameter exists to let developers visually verify skeleton loading states (default 0, cap 10s in `hooks.server.ts`). It's read from cookie `${STORAGE_PREFIX}:mockDataDelay` or URL param `${URL_PARAM_PREFIX}mockDelay`.

`okUnchecked` is used (not `ok(Schema, value)`) because the data is already known-typed at construction; skipping schema validation is a deliberate optimization.

### Mock data (`src/lib/server/mock/data.ts`)

Three constants total:

- `MOCK_USER`: `{ id: 'user-mock-001', displayName: 'Test User', email: 'test-user@example.com', avatarUrl: '' }`
- `MOCK_PROJECT`: `{ id: 'proj-mock-001', name: 'Sample Project', subtitle: 'Sample Project Description', ownerId: 'user-mock-001' }`
- `MOCK_SCENES`: 3 scenes — "Overworld" (`#overworld`, order 0, isActive=true), "Town Interior" (`#town-interior`, order 1), "Dungeon B1" (`#dungeon-b1`, order 2). Note: `url` is a hash fragment — these scenes are presentational stubs, not real routes.

## Server-side flow

### 1. Per-request setup in `hooks.server.ts`

```ts
event.locals.user = building ? MOCK_USER : resolveAuth(event.url);
event.locals.db = createDataService(event.platform, mockDelayMs);
```

- `event.locals.user`: typed `ServerUser | null`. `resolveAuth(url)` returns `MOCK_USER` unconditionally except when `?${URL_PARAM_PREFIX}auth=false` (e.g., `?sto.auth=false`) is in the URL — that simulates a logged-out state for testing auth-gated UI.
- `event.locals.db`: typed `DataService`.
- `event.locals.locale`: resolved cookie → Accept-Language → 'en'.
- `event.locals.sidebarPx`, `sidebarOpen`: resolved from cookies (sanitized via `@/utils/core/preference-cookie`).
- `event.locals.saveData`: from `Save-Data: on` header.

### 2. Layout server load (`src/routes/(app)/+layout.server.ts`)

```ts
export const load: LayoutServerLoad = ({ locals, url }) => {
  const { user } = locals;
  if (!user) {
    return { locale: locals.locale, sidebarPx: locals.sidebarPx, sidebarOpen: locals.sidebarOpen,
             user: null, project: null, scenes: [] };
  }
  // ... Streams project + scenes via SvelteKit promise-based data
};
```

Returns **streamed promises** for project and scenes (SvelteKit awaits and unwraps them in the component). This enables skeleton states with the `+layout.svelte` `await` blocks.

### 3. `+layout.svelte` consumes via `data.project` / `data.scenes` promises

(See `storylyne-overview` for the layout details — out of scope for this memory.)

## Cloudflare bindings (NONE today)

`packages/products/storylyne/editor/wrangler.jsonc`:
```jsonc
{
  // ...
  "assets": { "binding": "ASSETS", "directory": ".svelte-kit/cloudflare" }
  // No d1_databases, kv_namespaces, r2_buckets, durable_objects, queues, etc.
}
```

The only binding declared is `ASSETS` (static file serving for SvelteKit assets). No data infrastructure.

When data bindings are added, they would need:
1. `wrangler.jsonc` entry (e.g., `d1_databases: [{ binding: "DB", database_name: "...", database_id: "..." }]`).
2. Type augmentation in `src/app.d.ts` (`App.Platform.env.DB: D1Database`).
3. Branch in `createDataService(platform)` → `if (platform?.env?.DB) return createD1Service(platform.env.DB)`.
4. New `src/lib/server/d1/` (or similar) module implementing `DataService` against D1's prepared statements.
5. Migrations infrastructure (none exists — D1 supports `wrangler d1 migrations apply` but no `migrations/` directory exists).

## Migrations (NONE)

- No `migrations/` directory anywhere.
- No `schema.sql`, `schema.prisma`, `drizzle.config.ts`, or any ORM config.
- No `kysely`, `drizzle-orm`, `prisma`, `postgres`, `mysql`, or DB driver in any `package.json`.
- The `DatabaseUrlSchema` in `@/schemas/core-config/secret-schemas.ts` (matches `postgres://` URLs) suggests Postgres was anticipated, but no consuming code exists.

## API endpoints that touch data

Storylyne API routes (from `monorepo-architecture` + cross-checked):

**Production endpoints** (run in production, beacon receivers):
- `POST /api/errors` (`src/routes/api/errors/+server.ts`) — validates against `BeaconPayloadSchema`, logs via `log.error()` to Workers Logs, returns 204. **Stateless** — no DB write. Workers Logs IS the storage.
- `POST /api/vitals` (`src/routes/api/vitals/+server.ts`) — validates against `VitalsBeaconPayloadSchema`, logs via `log.info()`, returns 204. **Stateless**.

Both reject payloads > 64KB, return 400 on invalid JSON, 405 on non-POST.

**Dev-only endpoints** (Lens documentation system; gated on `dev` from `$app/environment`, return 404 in production):
- `GET /api/lens/bundle-sizes` — per-component bundle size analysis. Reads from build artifacts.
- `GET /api/lens/changelog/[name]` — git-history-derived changelog. Subprocess `git log` calls.
- `POST /api/lens/compile-standalone` — Svelte compiler + esbuild + Tailwind in-process compile of an isolated component → standalone HTML download.
- `GET /api/lens/screenshot/*` — Playwright + xcrun + adb screenshot pipeline (see `integrations` memory).

None of the Lens endpoints write to a database; they all read filesystem + exec subprocesses + return computed results.

## Persistence on the client side

Even though there's no server DB, several client-side stores persist to `localStorage`:
- `editor-state` — `localStorage[storylyne:editor-state]`. App preferences (theme, mode, locale, sidebar) + ~30 feature flags.
- `debug-state` — `localStorage[storylyne:debug-state]`. Dev-toolbar overrides.
- `keyboard-shortcuts` — `localStorage[storylyne:keyboard-shortcuts]`. Per-shortcut overrides.
- `lens-notifications` — `localStorage[storylyne:notifications]`, `[storylyne:notification-preferences]`.

Plus cookies (sanitized, set by client, read by `hooks.server.ts` for SSR hydration):
- `storylyne:locale`
- `storylyne:theme`
- `storylyne:sidebar-px`
- `storylyne:sidebar-open`
- `storylyne:mockDataDelay`

Storage keys are generated via `storageKey(suffix)` from `$lib/config/app-meta` — `${STORAGE_PREFIX}:${suffix}` where `STORAGE_PREFIX = 'storylyne'`.

## What downstream consumers should know

1. **Don't add direct DB calls in route handlers.** Always go through `event.locals.db`.
2. **Don't add new data entities to mock-data.ts as if they're real.** Anything you add there will be flagged as a stub, and adding entities without a real schema/persistence path is a design smell.
3. **The data layer is intentionally narrow.** Two reads only. Adding `create`/`update`/`delete` requires both an interface change in `types.ts` AND an implementation in `mock/service.ts` AND eventual D1 backing. Don't extend the interface speculatively.
4. **Mock service uses `okUnchecked`** to skip schema validation on the way out — saves a parse round-trip on every request. If you add new mock data, also use `okUnchecked` only when the value is hand-written and known-valid.
5. **The 10-second mock delay cap** (in `hooks.server.ts`) prevents accidental denial-of-service from cookie/URL manipulation. Don't remove it.

## Future work signposts

- `wrangler.jsonc` would need D1/KV/R2 bindings.
- A new `src/lib/server/d1/service.ts` (or `src/lib/server/durable-objects/service.ts`) implementing `DataService`.
- `createDataService` to branch on `_platform.env.DB`.
- Migration infrastructure: either `wrangler d1 migrations` workflow or a separate tool.
- The interface itself (`DataService`) needs to grow to support real CRUD before it's worth building any of the above.
