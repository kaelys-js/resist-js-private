# Finances Dashboard — Implementation Plan

**Date:** 2026-03-06
**Design:** `docs/plans/2026-03-06-finances-dashboard-design.md`
**Scope:** New product (`@finances/editor`)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

---

## Task 1: Scaffold project (copy + adapt webforge editor)

**Files:**
- Copy `packages/products/webforge/editor/` → `packages/products/finances/editor/`
- Modify `packages/products/finances/editor/package.json`
- Modify root `vitest.config.ts`

**Changes:**

### `package.json`
- name: `@finances/editor`
- Remove `@webforge/runtime`, `@webforge/plugin-api` deps (if present)
- Add: `layerchart`, `d3-scale`, `d3-shape`, `d3-array`
- Update test script project names to `finances-editor`

### Root `vitest.config.ts`
Add project entry:
```typescript
{
  extends: true,
  plugins: [svelte({ hot: false }), svelteTesting()],
  define: { /* same build-time defines */ },
  test: {
    name: 'finances-editor',
    root: 'packages/products/finances/editor',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.svelte-kit/**'],
    setupFiles: ['./src/test-setup-component.ts'],
    alias: {
      $lib: financesEditorSrc + '/lib',
      '$app/environment': financesEditorSrc + '/test-mocks/app-environment.ts',
      '$app/navigation': financesEditorSrc + '/test-mocks/app-navigation.ts',
      '$app/state': financesEditorSrc + '/test-mocks/app-state.ts',
    },
  },
}
```

**QA:** `pnpm install && pnpm qa:type-check`

---

## Task 2: Update app-meta + branding

**Files:**
- Modify `src/lib/config/app-meta.ts`
- Create `static/branding/logo.svg` (new finance icon)

**Changes:**

### `app-meta.ts`
- APP_NAME → 'Finances'
- APP_SHORT_NAME → 'Finances'
- APP_TAGLINE → 'Personal Finance Dashboard'
- APP_DESCRIPTION → 'Track expenses, income, debt, and lifetime costs'
- APP_CATEGORIES → ['finance', 'productivity']

### `logo.svg`
Simple finance-themed SVG: chart bars with upward trend line, monochrome, scalable.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 3: Adapt store + feature flags

**Files:**
- Rename `src/lib/stores/editor-state.svelte.ts` → `src/lib/stores/finances-state.svelte.ts`
- Update all imports referencing the old name

**Changes:**

### `finances-state.svelte.ts`
Replace game feature flags with finance flags:

```typescript
const FinanceFeaturesSchema = v.strictObject({
  /** Show layerchart visualizations on dashboard pages. */
  showCharts: v.optional(v.boolean(), true),
  /** Apply inflation adjustments to cost projections. */
  showInflation: v.optional(v.boolean(), true),
  /** Show year-by-year expense projections. */
  showProjections: v.optional(v.boolean(), true),
  /** Show income vs expenses net position analysis. */
  showNetPosition: v.optional(v.boolean(), true),
  /** Show developer toolbar. */
  showDevToolbar: v.optional(v.boolean(), false),
  /** Sidebar open/closed state. */
  sidebarOpen: v.optional(v.boolean(), true),
  /** Show logo in sidebar header. */
  sidebarLogo: v.optional(v.boolean(), true),
  /** Show app name in sidebar header. */
  sidebarAppName: v.optional(v.boolean(), true),
});
```

Remove subscription plan logic. Keep: theme, mode, locale, sidebar width, user info, save/load.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 4: Adapt sidebar navigation

**Files:**
- Modify `src/lib/components/AppSidebar.svelte`
- Create `src/lib/components/NavFinance.svelte`
- Remove `src/lib/components/NavScenes.svelte` and `NavScenesSkeleton.svelte`

**Changes:**

### `NavFinance.svelte`
Finance navigation items with Lucide icons:
- LayoutDashboard → / (Overview)
- TrendingUp → /income
- CreditCard → /debt
- Calendar → /monthly
- ShoppingBag → /purchases
- Plane → /travel
- Clock → /lifetime

### `AppSidebar.svelte`
- Replace NavScenes section with NavFinance
- Remove scene-related props (scenes, loading)
- Keep: NavSecondary, NavUser, SidebarHeader

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 5: Adapt layout (remove game data loading)

**Files:**
- Modify `src/routes/+layout.svelte`
- Modify `src/routes/+layout.server.ts`

**Changes:**

### `+layout.server.ts`
- Remove project/scene streaming
- Return: locale, sidebarPx, sidebarOpen (existing cookie-based prefs)
- Finance data loaded per-page in individual `+page.server.ts` files

### `+layout.svelte`
- Remove scene/project streaming and skeleton handling
- Remove project/scene props passed to AppSidebar
- Keep: sidebar resize, mode-watcher, locale sync, user sync, dev toolbar

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm dev` (verify shell renders)

---

## Task 6: Define Valibot schemas

**Files:**
- Create `src/lib/schemas/finances.ts`
- Create `src/lib/schemas/finances.test.ts`

**Changes:**
All schemas as defined in design doc section 2. Each uses `v.strictObject()`, JSDoc on every field. Export types via `v.InferOutput`.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 7: Create data service + seed data

**Files:**
- Create `src/lib/server/data/service.ts`
- Create `src/lib/server/data/service.test.ts`
- Remove old mock data files (scenes, projects)
- Create JSON seed files:
  - `src/lib/server/data/settings.json`
  - `src/lib/server/data/debts.json`
  - `src/lib/server/data/income.json`
  - `src/lib/server/data/purchases.json`
  - `src/lib/server/data/lifetime-expenses.json`
  - `src/lib/server/data/lifetime-replacements.json`
  - `src/lib/server/data/monthly-expenses.json`
  - `src/lib/server/data/travel.json`
  - `src/lib/server/data/inflation.json`

**Changes:**
Data service with read/write operations returning Result<T>. All seed data pre-populated from user input.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 8: Create CRUD API routes

**Files:**
- `src/routes/api/debts/+server.ts` (GET, POST)
- `src/routes/api/debts/[id]/+server.ts` (PUT, DELETE)
- Same pattern for: income, purchases, lifetime-expenses, lifetime-replacements, monthly-expenses, travel
- `src/routes/api/settings/+server.ts` (GET, PUT)
- `src/routes/api/inflation/+server.ts` (GET, PUT)

**Changes:**
Each endpoint validates with Valibot schemas, calls data service, returns `{ ok, data }` or `{ ok, error }`.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 9: Build calculation engine

**Files:**
- Create `src/lib/engine/projections.ts`
- Create `src/lib/engine/projections.test.ts`
- Create `src/lib/engine/income.ts`
- Create `src/lib/engine/income.test.ts`

**Changes:**
Projection + income engines as defined in design doc section 3. All functions return Result<T>.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 10: Build shared components

**Files:**
- Create `src/lib/components/StatCard.svelte`
- Create `src/lib/components/DataTable.svelte`
- Create `src/lib/components/ItemDialog.svelte`
- Create `src/lib/components/ConfirmDialog.svelte`

**Changes:**
Components as defined in design doc section 4 (Shared Components). Use shadcn-svelte primitives. Svelte 5 runes ($props, $state).

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 11: Build Overview page (/)

**Files:**
- Modify `src/routes/+page.svelte`
- Create `src/routes/+page.server.ts`

**Changes:**
Server load: read all collections + run projections. Render: stat cards, layerchart stacked bar, line chart, debt progress bars, net position summary.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm dev`

---

## Task 12: Build Debt page (/debt)

**Files:**
- Create `src/routes/debt/+page.svelte`
- Create `src/routes/debt/+page.server.ts`

**Changes:**
DataTable with debts, total header, CRUD via ItemDialog.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 13: Build Income page (/income)

**Files:**
- Create `src/routes/income/+page.svelte`
- Create `src/routes/income/+page.server.ts`

**Changes:**
DataTable with income sources, projection chart, EI schedule, CRUD.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 14: Build Monthly expenses page (/monthly)

**Files:**
- Create `src/routes/monthly/+page.svelte`
- Create `src/routes/monthly/+page.server.ts`

**Changes:**
Grouped DataTable (fixed/estimated), pie chart, total headers, CRUD.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 15: Build Purchases page (/purchases)

**Files:**
- Create `src/routes/purchases/+page.svelte`
- Create `src/routes/purchases/+page.server.ts`

**Changes:**
Two sections: upcoming purchases + lifetime replacements with cycle/annual/lifetime cost columns. CRUD for both.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 16: Build Travel page (/travel)

**Files:**
- Create `src/routes/travel/+page.svelte`
- Create `src/routes/travel/+page.server.ts`

**Changes:**
DataTable with trips, total budget header, CRUD.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 17: Build Lifetime costs page (/lifetime)

**Files:**
- Create `src/routes/lifetime/+page.svelte`
- Create `src/routes/lifetime/+page.server.ts`

**Changes:**
Year-by-year table, inflation toggle, per-category inflation config, cumulative cost chart, grand total, per-item breakdown.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 18: Build Settings page (/settings)

**Files:**
- Create `src/routes/settings/+page.svelte`
- Create `src/routes/settings/+page.server.ts`

**Changes:**
Birth date, retirement age, inflation rates, theme selection.

**QA:** `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check`

---

## Task 19: Verification loop

1. Run Explore agent — audit every component/schema/route against this plan
2. Fix all gaps
3. Re-audit until zero gaps
4. Full QA: `pnpm qa:type-check && pnpm -w run qa:lint && pnpm -w run qa:format:check && pnpm qa:test`

---

## Task 20: Visual verification (Playwright MCP)

1. Navigate to each page, screenshot
2. Test CRUD on each page
3. Test dark/light mode
4. Test sidebar collapse/expand
5. Test charts render
6. Test inflation rate changes
7. Test responsive layout
