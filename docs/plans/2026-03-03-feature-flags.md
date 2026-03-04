# Feature Flags Implementation Plan

**Date:** 2026-03-03
**Design:** `docs/plans/2026-03-03-feature-flags-design.md`
**Scope:** 8 new flags + wire all 13 user-requested flags + full test coverage

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Implementation Order

### Task 1: Schema + Store Defaults

**Files:**
- `packages/products/webforge/editor/src/lib/schemas/editor-state.ts`
- `packages/products/webforge/editor/src/lib/stores/editor-state.svelte.ts`

**Changes:**

1. In `FeatureFlagsSchema`, add 8 new fields after `resizableSidebar`:
   ```typescript
   breadcrumb: v.optional(v.boolean(), true),
   sidebarToggle: v.optional(v.boolean(), true),
   sidebarHelp: v.optional(v.boolean(), true),
   projectDropdown: v.optional(v.boolean(), true),
   projectDropdownSettings: v.optional(v.boolean(), true),
   projectDropdownIcon: v.optional(v.boolean(), true),
   appIconInSidebar: v.optional(v.boolean(), true),
   appNameInSidebar: v.optional(v.boolean(), true),
   ```

2. In `FEATURE_DEFAULTS` in `editor-state.svelte.ts`, add matching defaults:
   ```typescript
   breadcrumb: true,
   sidebarToggle: true,
   sidebarHelp: true,
   projectDropdown: true,
   projectDropdownSettings: true,
   projectDropdownIcon: true,
   appIconInSidebar: true,
   appNameInSidebar: true,
   ```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

### Task 2: Schema + Store Unit Tests

**Files:**
- `packages/products/webforge/editor/src/lib/schemas/editor-state.test.ts`

**Tests to add:**

1. Schema validates all 16 flags with defaults (extend existing test)
2. Schema accepts partial objects with only new flags
3. All new flag keys are present in `FeatureFlagsSchema.entries`
4. Each new flag defaults to `true`

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test`

---

### Task 3: Wire SiteHeader (`breadcrumb` + `sidebarToggle`)

**File:** `packages/products/webforge/editor/src/lib/components/SiteHeader.svelte`

**Changes:**

1. Wrap the `<Tooltip.Root>` (sidebar trigger) + `<Separator>` in:
   ```svelte
   {#if store.features.sidebarToggle}
     <Tooltip.Root ...> ... </Tooltip.Root>
     <Separator ... />
   {/if}
   ```

2. Wrap `<Breadcrumb.Root>` in:
   ```svelte
   {#if store.features.breadcrumb}
     <Breadcrumb.Root> ... </Breadcrumb.Root>
   {/if}
   ```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

### Task 4: Wire AppSidebar (`sidebarHelp` + `appIconInSidebar` + `appNameInSidebar` + `projectDropdown`)

**File:** `packages/products/webforge/editor/src/lib/components/AppSidebar.svelte`

**Changes:**

1. In `navSecondary` derived array, make Help conditional on `sidebarHelp`:
   ```typescript
   const navSecondary = $derived([
     ...(store.features.settings
       ? [{ title: t(localeStore.t.common.settings, 'Settings'), url: '#settings', icon: Settings }]
       : []),
     ...(store.features.sidebarHelp
       ? [{ title: t(localeStore.t.common.help, 'Help'), url: '#help', icon: CircleHelp }]
       : []),
   ]);
   ```

2. In `Sidebar.Header`, wrap logo div with `{#if store.features.appIconInSidebar}`:
   ```svelte
   {#if store.features.appIconInSidebar}
     <div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
       <WebForgeLogo size={20} />
     </div>
   {/if}
   ```

3. Wrap name div with `{#if store.features.appNameInSidebar}`:
   ```svelte
   {#if store.features.appNameInSidebar}
     <div class="grid flex-1 text-left text-sm leading-tight">
       <span class="truncate font-medium">{store.app.appName}</span>
       <span class="truncate text-xs text-muted-foreground">{t(localeStore.t.meta.tagline, APP_TAGLINE)}</span>
     </div>
   {/if}
   ```

4. In `Sidebar.Footer`, wrap `<NavUser>` with `{#if store.features.projectDropdown}`:
   ```svelte
   <Sidebar.Footer>
     {#if store.features.projectDropdown}
       <NavUser {user} />
     {/if}
   </Sidebar.Footer>
   ```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

### Task 5: Wire NavUser (`projectDropdownSettings` + `projectDropdownIcon`)

**File:** `packages/products/webforge/editor/src/lib/components/NavUser.svelte`

**Changes:**

1. Wrap the trigger's `<Avatar.Root>` in `{#if store.features.projectDropdownIcon}`:
   ```svelte
   {#if store.features.projectDropdownIcon}
     <Avatar.Root class="h-8 w-8 rounded-lg">
       <Avatar.Image src={user.avatar} alt={user.name} />
       <Avatar.Fallback class="rounded-lg">
         <WebForgeLogo size={16} />
       </Avatar.Fallback>
     </Avatar.Root>
   {/if}
   ```

2. Wrap the Settings dropdown item in `{#if store.features.projectDropdownSettings}`:
   ```svelte
   {#if store.features.projectDropdownSettings}
     <DropdownMenu.Item>
       <SettingsIcon class="mr-2 size-4" />
       {t(localeStore.t.common.settings, 'Settings')}
     </DropdownMenu.Item>
   {/if}
   ```

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`

---

### Task 6: Integration Tests — All 13 Feature Flags

**File:** `packages/products/webforge/editor/src/lib/components/__tests__/feature-flags.integration.test.ts`

**NEW FILE.** Tests that verify each of the 13 user-requested flags controls the correct DOM element.

Test structure:
- Create mock store with all flags `true` → render component → assert element present
- Set specific flag `false` → render component → assert element absent
- Group by component (SiteHeader, AppSidebar, NavUser)

Flags to test (13):
1. `modeToggle` → ModeToggle component in SiteHeader
2. `breadcrumb` → Breadcrumb.Root in SiteHeader
3. `sidebarToggle` → Sidebar.Trigger in SiteHeader
4. `resizableSidebar` → (tested in layout, skip component test — already covered)
5. `settings` → Settings in AppSidebar navSecondary
6. `sidebarHelp` → Help in AppSidebar navSecondary
7. `themeSelection` → ThemeSwitcher in NavUser
8. `languageSelection` → LanguageSwitcher in NavUser
9. `projectDropdownSettings` → Settings item in NavUser
10. `projectDropdown` → NavUser in AppSidebar footer
11. `appIconInSidebar` → Logo in AppSidebar header
12. `appNameInSidebar` → Name text in AppSidebar header
13. `projectDropdownIcon` → Avatar in NavUser trigger

**Note:** Svelte component tests require mocking the store singleton. Use `vi.mock()` on `editor-state.svelte` to return a mock store with configurable flags.

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test`

---

### Task 7: E2E Tests — Flag Persistence + DOM Effects

**File:** `packages/products/webforge/editor/e2e/feature-flags.test.ts`

**NEW FILE.** Playwright-based E2E tests.

Test scenarios:
1. Default state: all flags enabled, all UI elements visible
2. Toggle flag via devtools API → verify DOM element hidden
3. Reload page → verify flag persisted (element still hidden)
4. URL override `?wf.ff.breadcrumb=false` → element hidden on load
5. Multiple flags disabled → layout remains functional (no crashes)

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test:e2e`

---

### Task 8: Update Existing Test Mocks

**Files:**
- `packages/products/webforge/editor/src/lib/debug/integration.test.ts` (mock store)
- `packages/products/webforge/editor/src/lib/debug/devtools-api.svelte.test.ts` (mock store)

**Changes:**
- Add all 8 new flags to `createMockEditorStore().features` in both test files
- Ensures existing tests don't break with new schema fields

**QA:** `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format && pnpm qa:test`

---

## Verification Checklist

After all tasks complete:
- [ ] All 16 flags present in `FeatureFlagsSchema`
- [ ] All 16 flags present in `FEATURE_DEFAULTS`
- [ ] `SiteHeader`: `breadcrumb` + `sidebarToggle` + `modeToggle` wired
- [ ] `AppSidebar`: `sidebarHelp` + `appIconInSidebar` + `appNameInSidebar` + `projectDropdown` + `settings` + `sceneList` + `assetBrowser` wired
- [ ] `NavUser`: `projectDropdownSettings` + `projectDropdownIcon` + `themeSelection` + `languageSelection` wired
- [ ] Schema tests pass for all 16 flags
- [ ] Integration tests pass for all 13 user-requested flags
- [ ] E2E tests pass
- [ ] All existing tests still pass (2621+)
- [ ] QA clean: `pnpm qa:type-check && pnpm qa:lint && pnpm qa:format`
