# Project & User Data System — Implementation Plan

**Date:** 2026-03-05
**Design:** `docs/plans/2026-03-05-project-user-data-design.md`
**Scope:** Editor-only (`@webforge/editor`)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Task 1: Server-side schemas + data service + mock data

**Files:**
- Create `src/lib/server/data/types.ts`
- Create `src/lib/server/data/index.ts`
- Create `src/lib/server/mock/data.ts`
- Create `src/lib/server/mock/service.ts`
- Create `src/lib/server/data/types.test.ts`
- Create `src/lib/server/mock/service.test.ts`

**Changes:**

### `types.ts`

Define Valibot schemas + TypeScript types:

```typescript
import * as v from 'valibot';

export const ServerUserSchema = v.strictObject({
    id: v.pipe(v.string(), v.minLength(1)),
    displayName: v.pipe(v.string(), v.minLength(1)),
    email: v.pipe(v.string(), v.email()),
    avatarUrl: v.optional(v.string(), ''),
});
export type ServerUser = v.InferOutput<typeof ServerUserSchema>;

export const ServerProjectSchema = v.strictObject({
    id: v.pipe(v.string(), v.minLength(1)),
    name: v.pipe(v.string(), v.minLength(1)),
    subtitle: v.optional(v.string(), ''),
    ownerId: v.pipe(v.string(), v.minLength(1)),
});
export type ServerProject = v.InferOutput<typeof ServerProjectSchema>;

export const ServerSceneSchema = v.strictObject({
    id: v.pipe(v.string(), v.minLength(1)),
    title: v.string(),
    url: v.string(),
    isActive: v.optional(v.boolean(), false),
    order: v.optional(v.number(), 0),
});
export type ServerScene = v.InferOutput<typeof ServerSceneSchema>;
```

Define `DataService` interface:

```typescript
import type { Result } from '@/schemas/result/result';
import type { Str } from '@/schemas/common';

export type DataService = {
    projects: {
        getByOwner: (ownerId: Str) => Promise<Result<ServerProject | null>>;
    };
    scenes: {
        getByProject: (projectId: Str) => Promise<Result<ServerScene[]>>;
    };
};
```

### `index.ts`

Factory function:

```typescript
export function createDataService(platform?: App.Platform): DataService {
    // Future: if (platform?.env?.DB) return createD1Service(platform.env.DB);
    return createMockService();
}
```

### `mock/data.ts`

Export constants: `MOCK_USER`, `MOCK_PROJECT`, `MOCK_SCENES` per design doc.

### `mock/service.ts`

`createMockService(): DataService` — returns mock data from `data.ts`. `getByOwner` returns `MOCK_PROJECT` if ownerId matches, else `null`. `getByProject` returns `MOCK_SCENES` if projectId matches, else `[]`.

### Tests (TDD — write first)

`types.test.ts`:
1. ServerUserSchema parses valid user
2. ServerUserSchema rejects missing displayName
3. ServerUserSchema rejects invalid email
4. ServerProjectSchema parses valid project
5. ServerProjectSchema rejects missing name
6. ServerSceneSchema parses valid scene with all fields
7. ServerSceneSchema parses scene with only required fields (defaults applied)

`service.test.ts`:
1. createMockService returns DataService shape
2. projects.getByOwner with matching ownerId returns MOCK_PROJECT
3. projects.getByOwner with non-matching ownerId returns null
4. scenes.getByProject with matching projectId returns MOCK_SCENES
5. scenes.getByProject with non-matching projectId returns empty array

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test`

---

## Task 2: Feature flags + locale schema + all 7 locale files

**Files:**
- Modify `src/lib/schemas/editor-state.ts`
- Modify `src/lib/stores/editor-state.svelte.ts`
- Modify `src/lib/locales/schema.ts`
- Modify all 7 locale files (en, ja, zh, ko, fr, de, es)

**Changes:**

### `editor-state.ts`

Add 3 flags to `FeatureFlagsSchema`:

```typescript
authGatedUi: v.optional(v.boolean(), true),
emptyScenePlaceholder: v.optional(v.boolean(), true),
skeletonLoading: v.optional(v.boolean(), true),
```

### `editor-state.svelte.ts`

Add to `FEATURE_DEFAULTS`:

```typescript
authGatedUi: true,
emptyScenePlaceholder: true,
skeletonLoading: true,
```

### `locales/schema.ts`

Add `data` namespace with 6 keys:

```typescript
data: v.strictObject({
    loading: messageTemplate(),
    noScenes: messageTemplate(),
    noScenesDescription: messageTemplate(),
    newScene: messageTemplate(),
    signInPrompt: messageTemplate(),
    signIn: messageTemplate(),
}),
```

Add 3 flag labels to `devToolbar.labels`:

```typescript
authGatedUi: messageTemplate(),
emptyScenePlaceholder: messageTemplate(),
skeletonLoading: messageTemplate(),
```

### All 7 locale files

Add `data` namespace translations per design doc table. Add devToolbar labels:

```typescript
// EN example:
authGatedUi: 'Auth-Gated UI',
emptyScenePlaceholder: 'Empty Scene Placeholder',
skeletonLoading: 'Skeleton Loading',
```

### Update existing tests

- `editor-state.test.ts`: flag count 24 → 27
- `locales.test.ts`: add 'data' to EXPECTED_NAMESPACES, add `data: 6` to NAMESPACE_KEY_COUNTS
- `dev-toolbar-feature-flags.test.ts`: flag count 24 → 27
- Update mock stores in: `devtools-api.svelte.test.ts`, `integration.test.ts`, `init.svelte.test.ts`, `url-params.test.ts` — add 3 new feature flags to mock feature objects

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test`

---

## Task 3: hooks.server.ts + app.d.ts + layout.server.ts

**Files:**
- Modify `src/app.d.ts`
- Modify `src/hooks.server.ts`
- Modify `src/routes/+layout.server.ts`

**Changes:**

### `app.d.ts`

Extend `App.Locals`:

```typescript
import type { ServerUser } from '$lib/server/data/types';
import type { DataService } from '$lib/server/data/types';

interface Locals {
    locale: string;
    user: ServerUser | null;
    db: DataService;
}
```

### `hooks.server.ts`

Add imports:

```typescript
import type { ServerUser } from '$lib/server/data/types';
import { MOCK_USER } from '$lib/server/mock/data';
import { createDataService } from '$lib/server/data/index';
```

Add `resolveAuth` function before the `handle` export:

```typescript
function resolveAuth(url: URL): ServerUser | null {
    const authParam = url.searchParams.get('wf.auth');
    if (authParam === 'false') return null;
    return MOCK_USER;
}
```

In the existing `handle` function, after `resolveLocale`, add:

```typescript
event.locals.user = resolveAuth(event.url);
event.locals.db = createDataService(event.platform);
```

### `+layout.server.ts`

Replace the load function body:

```typescript
export const load: LayoutServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user) {
        return { locale: locals.locale, user: null, project: null, scenes: [] };
    }

    const projectResult = await locals.db.projects.getByOwner(user.id);
    const project = projectResult.ok ? projectResult.data : null;

    if (!project) {
        return { locale: locals.locale, user, project: null, scenes: [] };
    }

    const scenesResult = await locals.db.scenes.getByProject(project.id);
    const scenes = scenesResult.ok ? scenesResult.data : [];

    return { locale: locals.locale, user, project, scenes };
};
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 4: +layout.svelte + AppSidebar — pass data down

**Files:**
- Modify `src/routes/+layout.svelte`
- Modify `src/lib/components/AppSidebar.svelte`

**Changes:**

### `+layout.svelte`

After the existing `const { children, data } = $props();`, the server data is available as `data.user`, `data.project`, `data.scenes`.

Sync user data into editor store (so HeaderUser reads from store):

```typescript
if (data.user) {
    store.setUserName(data.user.displayName);
    store.setUserEmail(data.user.email);
    if (data.user.avatarUrl) store.setUserAvatar(data.user.avatarUrl);
}
```

Pass props to AppSidebar:

```svelte
<AppSidebar
    user={data.user}
    project={data.project}
    scenes={data.scenes ?? []}
    {...sidebarProps}
/>
```

Pass user to SiteHeader:

```svelte
<SiteHeader isError={Boolean(page.error)} user={data.user} />
```

### `AppSidebar.svelte`

1. Add imports for types:

```typescript
import type { ServerUser, ServerProject, ServerScene } from '$lib/server/data/types';
```

2. Replace hardcoded `scenes` and `user` with props:

```typescript
let {
    user = null,
    project = null,
    scenes = [],
    ...restProps
}: Props & {
    user?: ServerUser | null;
    project?: ServerProject | null;
    scenes?: ServerScene[];
} = $props();
```

3. Remove the hardcoded `const scenes = [...]` and `const user = {...}` blocks.

4. Auth-gate scene list:

```svelte
{#if store.features.sceneList && (!store.features.authGatedUi || user)}
    <NavScenes {scenes} />
{/if}
```

5. Auth-gate Settings in `navSecondary`:

```svelte
const navSecondary = $derived([
    ...(store.features.settings && (!store.features.authGatedUi || user)
        ? [{ title: t(localeStore.t.common.settings, 'Settings'), url: '#settings', icon: Settings }]
        : []),
    ...(store.features.sidebarHelp
        ? [{ title: t(localeStore.t.common.help, 'Help'), url: '#help', icon: CircleHelp }]
        : []),
]);
```

6. Auth-gate project dropdown and pass project:

```svelte
{#if store.features.projectDropdown && (!store.features.authGatedUi || user)}
    <NavUser project={project} />
{/if}
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 5: NavUser + NavScenes + EmptyScenes — dynamic data

**Files:**
- Modify `src/lib/components/NavUser.svelte`
- Modify `src/lib/components/NavScenes.svelte`
- Create `src/lib/components/EmptyScenes.svelte`

**Changes:**

### `NavUser.svelte`

1. Change prop type:

```typescript
import type { ServerProject } from '$lib/server/data/types';
let { project }: { project: ServerProject | null } = $props();
```

2. Monogram derived from project name:

```typescript
const monogram: string = $derived(
    (project?.name ?? 'P')
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join(''),
);
```

3. Replace `user.name` with `project?.name ?? 'Project'` in all display locations.

4. Replace `user.avatar` with `''` (projects don't have avatars — just monogram).

5. Replace "—" subtitle with `project?.subtitle || '—'`.

### `NavScenes.svelte`

1. Change prop type:

```typescript
import type { ServerScene } from '$lib/server/data/types';
let { scenes }: { scenes: ServerScene[] } = $props();
```

2. Use `scene.id` as key in `{#each}`:

```svelte
{#each scenes as scene (scene.id)}
```

3. Add empty state in `sceneList` snippet:

```svelte
{#snippet sceneList()}
    {#if scenes.length === 0}
        <EmptyScenes />
    {:else}
        {#each scenes as scene (scene.id)}
            <!-- existing scene rendering -->
        {/each}
        <!-- existing New Scene button -->
    {/if}
{/snippet}
```

4. Import `EmptyScenes`:

```typescript
import EmptyScenes from './EmptyScenes.svelte';
```

### `EmptyScenes.svelte`

```svelte
<script lang="ts">
import Map from '@lucide/svelte/icons/map';
import Plus from '@lucide/svelte/icons/plus';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { localeStore, t } from '$lib/i18n.svelte';
import { useEditorStore } from '$lib/stores/editor-state.svelte';

const store = useEditorStore();
</script>

{#if store.features.emptyScenePlaceholder}
    <Sidebar.MenuItem>
        <div class="flex flex-col items-center gap-2 px-4 py-6 text-center" data-testid="empty-scenes">
            <Map aria-hidden="true" class="size-8 text-muted-foreground/50" />
            <div class="space-y-1">
                <p class="text-xs font-medium text-muted-foreground">
                    {t(localeStore.t.data.noScenes, 'No scenes yet')}
                </p>
                <p class="text-xs text-muted-foreground/70">
                    {t(localeStore.t.data.noScenesDescription, 'Create your first scene to start building.')}
                </p>
            </div>
        </div>
    </Sidebar.MenuItem>
    <Sidebar.MenuItem>
        <Sidebar.MenuButton class="text-sidebar-foreground/70">
            <Plus />
            <span>{t(localeStore.t.data.newScene, 'New Scene')}</span>
        </Sidebar.MenuButton>
    </Sidebar.MenuItem>
{/if}
```

### `SiteHeader.svelte`

1. Change prop to include user:

```typescript
import type { ServerUser } from '$lib/server/data/types';
let { isError = false, user = null }: { isError?: boolean; user?: ServerUser | null } = $props();
```

2. Auth-gate HeaderUser:

```svelte
{#if store.features.headerUserDropdown && (!store.features.authGatedUi || user)}
    <HeaderUser />
{/if}
```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 6: Skeleton components

**Files:**
- Create `src/lib/components/NavScenesSkeleton.svelte`
- Create `src/lib/components/NavUserSkeleton.svelte`

**Changes:**

### `NavScenesSkeleton.svelte`

3 skeleton rows mimicking scene items, wrapped in Sidebar components. Uses `Skeleton` from shadcn-svelte.

```svelte
<script lang="ts">
import { Skeleton } from '$lib/components/ui/skeleton/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
</script>

<Sidebar.Group>
    <Sidebar.GroupLabel>
        <Skeleton class="h-4 w-16" />
    </Sidebar.GroupLabel>
    <Sidebar.Menu>
        {#each Array(3) as _}
            <Sidebar.MenuItem>
                <div class="flex items-center gap-2 px-2 py-1.5">
                    <Skeleton class="size-4 rounded" />
                    <Skeleton class="h-4 w-24" />
                </div>
            </Sidebar.MenuItem>
        {/each}
    </Sidebar.Menu>
</Sidebar.Group>
```

### `NavUserSkeleton.svelte`

Avatar circle + text lines skeleton.

```svelte
<script lang="ts">
import { Skeleton } from '$lib/components/ui/skeleton/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
</script>

<Sidebar.Menu>
    <Sidebar.MenuItem>
        <div class="flex items-center gap-2 p-2">
            <Skeleton class="size-8 rounded-lg" />
            <div class="grid flex-1 gap-1">
                <Skeleton class="h-4 w-24" />
                <Skeleton class="h-3 w-32" />
            </div>
        </div>
    </Sidebar.MenuItem>
</Sidebar.Menu>
```

**Note:** Skeleton loading is prepared but NOT wired to streaming in this plan. Streaming wiring requires more complex `{#await}` patterns in `+layout.svelte` that depend on actual async data sources. For mock data, all data is synchronous so skeletons never show. The components exist and are ready for when D1 is connected.

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

## Task 7: Unit + Integration tests

**Files:**
- Create `src/lib/components/empty-scenes.test.ts` + `EmptyScenesTest.svelte`
- Modify `src/lib/components/feature-flags.integration.test.ts`
- Update existing test mock stores

**Changes:**

### Unit Tests

`empty-scenes.test.ts` (via `EmptyScenesTest.svelte` wrapper):
1. Renders empty state container with data-testid
2. Shows "No scenes yet" text
3. Shows description text
4. Shows "New Scene" button

### Integration Tests

Add to `feature-flags.integration.test.ts`:

1. `authGatedUi` enabled + no user → HeaderUser hidden (tested via SiteHeader wrapper)
2. `authGatedUi` disabled → HeaderUser visible regardless of user state
3. `emptyScenePlaceholder` enabled + empty scenes → empty state visible
4. `emptyScenePlaceholder` disabled + empty scenes → empty state hidden

### Mock Store Updates

All test files with mock EditorStore objects must add the 3 new feature flags:
- `devtools-api.svelte.test.ts`
- `integration.test.ts`
- `init.svelte.test.ts`
- `url-params.test.ts`

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
**Test:** `pnpm qa:test`

---

## Task 8: E2E tests + Documentation

**Files:**
- Create `e2e/project-user-data.test.ts`
- Modify `e2e/feature-flags.test.ts`
- Modify `docs/ARCHITECTURE.md`

**Changes:**

### `e2e/project-user-data.test.ts`

Tests (all running against dev server with mock data):

1. Default state — project name "My First RPG" visible in sidebar footer
2. Default state — project subtitle visible in sidebar footer
3. Default state — 3 scenes visible (Overworld, Town Interior, Dungeon B1)
4. Default state — HeaderUser trigger visible
5. `?wf.auth=false` — HeaderUser trigger hidden
6. `?wf.auth=false` — project dropdown hidden
7. `?wf.auth=false` — scene list hidden
8. `?wf.auth=false` — Settings hidden in sidebar
9. `?wf.auth=false` — Help still visible
10. `?wf.auth=false` — breadcrumb still visible

### `e2e/feature-flags.test.ts`

Update default state test:
- Replace `await expect(page.getByText('Project')).toBeVisible()` with `await expect(page.getByText('My First RPG')).toBeVisible()`
- Scene name "Overworld" visible in sidebar

### `docs/ARCHITECTURE.md`

Add "Project & User Data" section documenting:
- Data service abstraction (mock ↔ D1)
- Server-side data flow (hooks → layout.server → components)
- Auth gating pattern
- Mock data for development
- URL override `?wf.auth=false`
- Feature flags (3 new)
- Locale namespace (`data`)

**QA:** `pnpm qa:test:e2e`

---

## Summary

| Task | Files | Tests |
|------|-------|-------|
| 1. Server schemas + data service | 6 created | `types.test.ts`, `service.test.ts` |
| 2. Feature flags + locales | 10 modified | Existing test count updates |
| 3. hooks + app.d.ts + layout.server | 3 modified | — |
| 4. layout.svelte + AppSidebar | 2 modified | — |
| 5. NavUser + NavScenes + EmptyScenes | 3 modified, 1 created | — |
| 6. Skeleton components | 2 created | — |
| 7. Unit + Integration tests | 3 created, 5 modified | `pnpm qa:test` |
| 8. E2E tests + Documentation | 2 created, 2 modified | `pnpm qa:test:e2e` |
