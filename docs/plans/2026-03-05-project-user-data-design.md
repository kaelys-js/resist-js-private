# Project & User Data System — Design Document

**Date:** 2026-03-05
**Scope:** Editor-only (`@webforge/editor`)
**Skill:** build-editor

---

## Goals

1. **Server-side data loading** — Project and user data loaded in `+layout.server.ts`, cascading to all components via `$props()`. No client-side API calls needed (SSR delivers full HTML).
2. **Data service abstraction** — Swappable mock ↔ D1 implementations. Mock activates automatically when `platform.env.DB` is absent. Zero code changes to load functions when deploying to Cloudflare.
3. **Auth-gated UI** — HeaderUser, NavUser (project dropdown), Settings, and scene list are hidden when not logged in. Mode toggle, breadcrumb, and help remain visible.
4. **Dynamic scene list** — Scenes come from project data (not hardcoded). NavScenes accepts scenes as a prop.
5. **Dynamic project name/subtitle** — NavUser shows project name and subtitle from server data (replacing hardcoded "Project" and "—").
6. **Empty scene placeholder** — When a project has 0 scenes, show an empty state with icon, heading, and "New Scene" CTA.
7. **Skeleton loading** — Skeleton placeholders for scene list and project dropdown during client-side navigation (SSR always delivers full HTML).
8. **Feature flags** — 3 new flags: `authGatedUi`, `emptyScenePlaceholder`, `skeletonLoading`
9. **Mock-first development** — Default mock data simulates logged-in state with a sample project and 3 scenes, matching current hardcoded data for visual continuity. URL override `?wf.auth=false` switches to logged-out state.

---

## Architecture

### Data Flow

```
hooks.server.ts
  ├── resolveLocale() → event.locals.locale        (existing)
  ├── resolveAuth()   → event.locals.user           (NEW — mock user or null)
  └── createDataService(platform) → event.locals.db (NEW — mock or D1)

+layout.server.ts
  ├── locals.locale → { locale }                    (existing)
  ├── locals.user   → { user }                      (NEW)
  └── locals.db.projects.getByOwner(user.id)
      └── → { project, scenes }                     (NEW)

+layout.svelte
  ├── const { children, data } = $props()
  ├── data.locale → localeStore                     (existing)
  ├── data.user   → AppSidebar, SiteHeader          (NEW)
  ├── data.project → AppSidebar (NavUser)            (NEW)
  └── data.scenes → AppSidebar (NavScenes)           (NEW)

AppSidebar.svelte
  ├── {scenes}  → NavScenes (replaces hardcoded array)
  ├── {project} → NavUser   (replaces hardcoded user object)
  └── {user}    → auth-gated visibility

NavUser.svelte
  ├── {project.name}     → project name display
  └── {project.subtitle} → replaces "—" placeholder

NavScenes.svelte
  ├── {scenes}  → scene list items
  └── {#if scenes.length === 0} → EmptyScenes.svelte

SiteHeader.svelte / HeaderUser.svelte
  └── {user}    → hide when user is null
```

### Component Prop Changes

```
+layout.svelte
  └── passes data.user, data.project, data.scenes down

AppSidebar.svelte (NEW props)
  ├── user: ServerUser | null
  ├── project: ServerProject | null
  ├── scenes: ServerScene[]
  └── loading: boolean

NavScenes.svelte (CHANGED props)
  ├── scenes: ServerScene[]  (was: { title, url, isActive? }[])
  └── (empty state shown inline when scenes.length === 0)

NavUser.svelte (CHANGED props)
  ├── project: ServerProject | null  (was: { name, avatar })
  └── (hidden when project is null)

SiteHeader.svelte (NEW props)
  └── user: ServerUser | null

HeaderUser.svelte (NEW props)
  └── user: ServerUser | null
```

### File Structure

```
$lib/server/
  ├── data/
  │   ├── types.ts            — Valibot schemas + DataService interface
  │   └── index.ts            — createDataService factory
  └── mock/
      ├── data.ts             — MOCK_USER, MOCK_PROJECT, MOCK_SCENES
      └── service.ts          — MockDataService implementation
```

---

## Server-Side Schemas (`$lib/server/data/types.ts`)

These schemas are server-only (not part of the editor client store). They model data from the database.

### ServerUserSchema

```typescript
const ServerUserSchema = v.strictObject({
    id: v.pipe(v.string(), v.minLength(1)),
    displayName: v.pipe(v.string(), v.minLength(1)),
    email: v.pipe(v.string(), v.email()),
    avatarUrl: v.optional(v.pipe(v.string(), v.url()), ''),
});

type ServerUser = v.InferOutput<typeof ServerUserSchema>;
```

### ServerProjectSchema

```typescript
const ServerProjectSchema = v.strictObject({
    id: v.pipe(v.string(), v.minLength(1)),
    name: v.pipe(v.string(), v.minLength(1)),
    subtitle: v.optional(v.string(), ''),
    ownerId: v.pipe(v.string(), v.minLength(1)),
});

type ServerProject = v.InferOutput<typeof ServerProjectSchema>;
```

### ServerSceneSchema

```typescript
const ServerSceneSchema = v.strictObject({
    id: v.pipe(v.string(), v.minLength(1)),
    title: v.string(),
    url: v.string(),
    isActive: v.optional(v.boolean(), false),
    order: v.optional(v.number(), 0),
});

type ServerScene = v.InferOutput<typeof ServerSceneSchema>;
```

### DataService Interface

```typescript
type DataService = {
    projects: {
        getByOwner: (ownerId: Str) => Promise<Result<ServerProject | null>>;
    };
    scenes: {
        getByProject: (projectId: Str) => Promise<Result<ServerScene[]>>;
    };
};
```

---

## Mock Data (`$lib/server/mock/data.ts`)

```typescript
const MOCK_USER: ServerUser = {
    id: 'user-mock-001',
    displayName: 'Coleb',
    email: 'coleb@example.com',
    avatarUrl: '',
};

const MOCK_PROJECT: ServerProject = {
    id: 'proj-mock-001',
    name: 'My First RPG',
    subtitle: 'An HD-2D Adventure',
    ownerId: 'user-mock-001',
};

const MOCK_SCENES: ServerScene[] = [
    { id: 'scene-001', title: 'Overworld', url: '#overworld', isActive: true, order: 0 },
    { id: 'scene-002', title: 'Town Interior', url: '#town-interior', isActive: false, order: 1 },
    { id: 'scene-003', title: 'Dungeon B1', url: '#dungeon-b1', isActive: false, order: 2 },
];
```

---

## Auth Resolution

### `hooks.server.ts` — New `resolveAuth` handler

Added to the `handle` sequence. For now, always returns mock user (simulating logged-in). A URL override `?wf.auth=false` returns `null` (logged-out) when debug mode is active.

```typescript
function resolveAuth(event: RequestEvent): ServerUser | null {
    // In development: check URL override for testing logged-out state
    const authParam = event.url.searchParams.get('wf.auth');
    if (authParam === 'false') return null;

    // Default: return mock user (simulating logged-in)
    return MOCK_USER;
}
```

**Future:** Replace with real session validation (cookie → D1 lookup).

### `app.d.ts` — Extended Locals

```typescript
interface Locals {
    locale: string;
    user: ServerUser | null;
    db: DataService;
}
```

---

## Layout Server Load

### `+layout.server.ts`

```typescript
export const load: LayoutServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user) {
        return { locale: locals.locale, user: null, project: null, scenes: [] };
    }

    const projectResult = await locals.db.projects.getByOwner(user.id);
    if (!projectResult.ok) {
        return { locale: locals.locale, user, project: null, scenes: [] };
    }

    const project = projectResult.data;
    if (!project) {
        return { locale: locals.locale, user, project: null, scenes: [] };
    }

    const scenesResult = await locals.db.scenes.getByProject(project.id);
    const scenes = scenesResult.ok ? scenesResult.data : [];

    return { locale: locals.locale, user, project, scenes };
};
```

---

## Component Changes

### `+layout.svelte`

Pass server data to `AppSidebar` and `SiteHeader`:

```svelte
<AppSidebar
    user={data.user}
    project={data.project}
    scenes={data.scenes ?? []}
    {...sidebarProps}
/>

<SiteHeader isError={Boolean(page.error)} user={data.user} />
```

Also sync `data.user` into the editor store for HeaderUser (so userName, userEmail, userAvatar reflect server data):

```typescript
if (data.user) {
    store.setUserName(data.user.displayName);
    store.setUserEmail(data.user.email);
    if (data.user.avatarUrl) store.setUserAvatar(data.user.avatarUrl);
}
```

### `AppSidebar.svelte`

**New props:**

```typescript
let {
    user = null,
    project = null,
    scenes = [],
    ...restProps
}: Props & {
    user: ServerUser | null;
    project: ServerProject | null;
    scenes: ServerScene[];
} = $props();
```

**Auth-gated sections:**

```svelte
<!-- Scene list: hidden when not logged in (if authGatedUi enabled) -->
{#if store.features.sceneList && (!store.features.authGatedUi || user)}
    <NavScenes {scenes} />
{/if}

<!-- Settings: hidden when not logged in -->
<!-- navSecondary computed to exclude Settings when !user && authGatedUi -->

<!-- Project dropdown: hidden when not logged in -->
{#if store.features.projectDropdown && (!store.features.authGatedUi || user)}
    <NavUser {project} />
{/if}
```

### `NavScenes.svelte`

**Changed scene type to use `ServerScene`:**

```typescript
type Scene = ServerScene;  // { id, title, url, isActive?, order? }

let { scenes }: { scenes: Scene[] } = $props();
```

**Empty state when no scenes:**

```svelte
{#if scenes.length === 0}
    <!-- Empty state -->
    <div class="flex flex-col items-center gap-2 px-4 py-6 text-center">
        <Map aria-hidden="true" class="size-8 text-muted-foreground/50" />
        <p class="text-xs font-medium text-muted-foreground">
            {t(localeStore.t.data.noScenes, 'No scenes yet')}
        </p>
        <button class="text-sidebar-foreground/70 ...">
            <Plus /> {t(localeStore.t.data.newScene, 'New Scene')}
        </button>
    </div>
{:else}
    {#each scenes as scene (scene.id)}
        <!-- existing scene items -->
    {/each}
    <!-- New Scene button -->
{/if}
```

### `NavUser.svelte`

**Changed prop to accept `ServerProject | null`:**

```typescript
let { project }: { project: ServerProject | null } = $props();
```

**Show project name and subtitle:**

```svelte
<span class="truncate font-medium">{project?.name ?? 'Project'}</span>
<span class="truncate text-xs text-muted-foreground">
    {project?.subtitle || '—'}
</span>
```

**Monogram from project name (not user name):**

```typescript
const monogram: string = $derived(
    (project?.name ?? 'P')
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join(''),
);
```

### `SiteHeader.svelte`

**New prop:**

```typescript
let { isError = false, user = null }: { isError?: boolean; user?: ServerUser | null } = $props();
```

**Auth-gated HeaderUser:**

```svelte
{#if store.features.headerUserDropdown && (!store.features.authGatedUi || user)}
    <HeaderUser />
{/if}
```

### `HeaderUser.svelte`

No prop changes needed — it reads from the editor store, which gets synced from server data in `+layout.svelte`. The existing feature flag `headerUserDropdown` + the new `authGatedUi` flag in SiteHeader handle visibility.

---

## Skeleton Loading

### `NavScenesSkeleton.svelte`

Shown during client-side navigation via `{#await}` in `+layout.svelte`:

```svelte
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

```svelte
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

### Integration via streaming

`+layout.server.ts` uses SvelteKit's conditional streaming pattern. During SSR, data is awaited (full HTML). During client-side navigation, data is streamed so skeletons show via `{#await}`:

```typescript
export const load: LayoutServerLoad = async ({ locals, isDataRequest }) => {
    const user = locals.user;
    if (!user) {
        return { locale: locals.locale, user: null, project: null, scenes: [] };
    }

    const projectPromise = loadProjectAndScenes(locals.db, user.id);

    // SSR: await immediately (full HTML, no skeleton)
    // Client nav: stream (skeleton while loading)
    if (!isDataRequest) {
        const result = await projectPromise;
        return { locale: locals.locale, user, ...result };
    }

    return { locale: locals.locale, user, streamed: projectPromise };
};
```

In `+layout.svelte`:

```svelte
{#if data.streamed}
    {#await data.streamed}
        <!-- Skeleton state -->
        <NavScenesSkeleton />
        <NavUserSkeleton />
    {:then resolved}
        <NavScenes scenes={resolved.scenes} />
        <NavUser project={resolved.project} />
    {/await}
{:else}
    <NavScenes scenes={data.scenes ?? []} />
    <NavUser project={data.project} />
{/if}
```

---

## Feature Flags (3 new)

| Flag | Default | Purpose |
|------|---------|---------|
| `authGatedUi` | `true` | Hide auth-requiring elements when not logged in |
| `emptyScenePlaceholder` | `true` | Show empty state component vs blank when no scenes |
| `skeletonLoading` | `true` | Show skeleton placeholders during streaming |

### URL Override for Auth Testing

`?wf.auth=false` — server-side override in `hooks.server.ts` that returns `null` user, simulating logged-out state. Works independently of feature flags.

---

## Locale Changes

### New `data` namespace in schema

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

### English strings

```typescript
data: {
    loading: 'Loading…',
    noScenes: 'No scenes yet',
    noScenesDescription: 'Create your first scene to start building.',
    newScene: 'New Scene',
    signInPrompt: 'Sign in to access your projects',
    signIn: 'Sign In',
},
```

### DevToolbar labels (3 new flags + no new prefs)

```typescript
authGatedUi: messageTemplate(),
emptyScenePlaceholder: messageTemplate(),
skeletonLoading: messageTemplate(),
```

### All 7 Locale Files

| Key | EN | JA | ZH | KO | FR | DE | ES |
|-----|----|----|----|----|----|----|-----|
| data.loading | Loading… | 読み込み中… | 加载中… | 로딩 중… | Chargement… | Laden… | Cargando… |
| data.noScenes | No scenes yet | シーンがありません | 暂无场景 | 아직 장면이 없습니다 | Aucune scène | Keine Szenen | Sin escenas |
| data.noScenesDescription | Create your first scene to start building. | 最初のシーンを作成して構築を始めましょう。 | 创建您的第一个场景开始构建。 | 첫 번째 장면을 만들어 시작하세요. | Créez votre première scène. | Erstellen Sie Ihre erste Szene. | Crea tu primera escena. |
| data.newScene | New Scene | 新しいシーン | 新场景 | 새 장면 | Nouvelle scène | Neue Szene | Nueva escena |
| data.signInPrompt | Sign in to access your projects | ログインしてプロジェクトにアクセス | 登录以访问您的项目 | 로그인하여 프로젝트에 접근 | Connectez-vous pour accéder | Melden Sie sich an | Inicie sesión para acceder |
| data.signIn | Sign In | ログイン | 登录 | 로그인 | Se connecter | Anmelden | Iniciar sesión |

---

## Accessibility

| Concern | Implementation |
|---------|---------------|
| Empty state | Descriptive text + actionable CTA (not just blank space) |
| Skeleton | `aria-busy="true"` on container during loading, `aria-hidden="true"` on skeleton elements |
| Auth transition | No layout shift — hidden elements have `display: none` (via Svelte `{#if}`) |
| Screen reader | Empty scene state announces "No scenes yet" with context |

---

## Test Strategy

### Unit Tests

1. `types.test.ts` — Valibot schema validation for ServerUser, ServerProject, ServerScene
2. `service.test.ts` — MockDataService returns correct data, handles missing user
3. `empty-scenes.test.ts` — EmptyScenes renders heading, description, CTA button
4. `nav-scenes-skeleton.test.ts` — Skeleton renders 3 placeholder items
5. `nav-user-skeleton.test.ts` — Skeleton renders avatar + text placeholders

### Integration Tests

1. NavScenes with empty array → empty state visible
2. NavScenes with scenes array → scene items rendered
3. NavUser with null project → component hidden
4. NavUser with project → shows name and subtitle
5. Auth-gated visibility: user=null hides HeaderUser, NavUser, Settings, SceneList
6. Auth-gated visibility: user present shows all elements

### E2E Tests

1. Default state (mock logged in) — project name "My First RPG" visible in sidebar
2. Default state — 3 scenes visible (Overworld, Town Interior, Dungeon B1)
3. Default state — HeaderUser trigger visible
4. `?wf.auth=false` — HeaderUser trigger hidden
5. `?wf.auth=false` — project dropdown hidden
6. `?wf.auth=false` — scene list hidden
7. `?wf.auth=false` — Settings hidden
8. `?wf.auth=false` — Help still visible
9. `?wf.auth=false` — breadcrumb still visible
10. Feature flag `authGatedUi=false` disables auth gating

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/server/data/types.ts` | Valibot schemas + DataService interface |
| Create | `src/lib/server/data/index.ts` | createDataService factory |
| Create | `src/lib/server/mock/data.ts` | Mock user, project, scenes |
| Create | `src/lib/server/mock/service.ts` | MockDataService implementation |
| Create | `src/lib/components/EmptyScenes.svelte` | Empty scene list placeholder |
| Create | `src/lib/components/NavScenesSkeleton.svelte` | Scene list skeleton |
| Create | `src/lib/components/NavUserSkeleton.svelte` | Project dropdown skeleton |
| Modify | `src/app.d.ts` | Add user, db to Locals |
| Modify | `src/hooks.server.ts` | Add resolveAuth + data service init |
| Modify | `src/routes/+layout.server.ts` | Load user, project, scenes |
| Modify | `src/routes/+layout.svelte` | Pass data to AppSidebar/SiteHeader, sync user to store |
| Modify | `src/lib/components/AppSidebar.svelte` | Accept props, auth-gated sections |
| Modify | `src/lib/components/NavScenes.svelte` | Accept ServerScene[], empty state |
| Modify | `src/lib/components/NavUser.svelte` | Accept ServerProject, show subtitle |
| Modify | `src/lib/components/SiteHeader.svelte` | Accept user prop, auth-gate HeaderUser |
| Modify | `src/lib/schemas/editor-state.ts` | Add 3 feature flags |
| Modify | `src/lib/stores/editor-state.svelte.ts` | Add 3 flag defaults |
| Modify | `src/lib/locales/schema.ts` | Add `data` namespace + 3 flag labels |
| Modify | All 7 locale files | Add `data` translations + flag labels |
| Modify | `docs/ARCHITECTURE.md` | Document data loading system |

All paths relative to `packages/products/webforge/editor/`.
